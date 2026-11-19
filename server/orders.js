const maxPhoto=10*1024*1024;
function photoType(bytes){
 const starts=(...signature)=>signature.every((v,i)=>v===bytes[i]);
 if(starts(255,216,255))return 'image/jpeg';
 if(starts(137,80,78,71,13,10,26,10))return 'image/png';
 if(starts(82,73,70,70)&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return '';
}
async function customerHash(request) {
 const key=request.headers.get('X-Order-Key');
 return key && /^[0-9a-f]{64}$/.test(key) ? digest(key) : null;
}
async function customerOrders(request, env) {
 const hash=await customerHash(request);
 if(!hash)return json({},401);
 const before=new URL(request.url).searchParams.get('before')||'9223372036854775807';
 if(!/^\d{1,19}$/.test(before))return json({},400);
 const stage=new URL(request.url).searchParams.get('stage')||'';
 if(stage&&!stages.includes(stage))return json({},400);
 const rows=await env.DB.prepare("SELECT rowid AS cursor,id,created,product,qty,stage,tracking FROM orders WHERE customer_hash=? AND rowid<CAST(? AS INTEGER) AND (?='' OR stage=?) ORDER BY rowid DESC LIMIT 41").bind(hash,before,stage,stage).all();
 return json({orders:rows.results.slice(0,40), more:rows.results.length>40});
}
async function acceptOrder(request,env){
 if(!request.headers.get('Content-Type')?.startsWith('multipart/form-data'))return json({},415);
 if(Number(request.headers.get('Content-Length'))>maxPhoto+65536)return json({error:'Surat 10 MB dan katta.'},413);
 if(!await allowRequest(request,env,'orders',20))return json({error:'Buyurtmalar ko‘p yuborildi. 10 daqiqadan keyin qayta urinib ko‘ring.'},429);
 let f;try{const body=await limitedBody(request,maxPhoto+65536);f=await new Response(body,{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData();}catch(e){return json({error:'Fayl hajmi yoki shakli noto‘g‘ri.'},e instanceof RangeError?413:400);}
 const id=f.get('id'),qty=Number(f.get('qty')),note=f.get('note'),contact=f.get('contact');
 if(typeof id!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id)||!Number.isInteger(qty)||qty<1||qty>999||typeof note!=='string'||note.length>700||typeof contact!=='string'||contact.length>100)return json({error:'Buyurtma ma’lumotlarini tekshiring.'},400);
 const hash=await customerHash(request);
 if(request.headers.has('X-Order-Key')&&!hash)return json({},400);
 const receipt=row=>row.customer_hash===hash?json({id,tracking:row.tracking}):json({error:'Buyurtma raqami band.'},409);
 const existing=()=>env.DB.prepare('SELECT customer_hash,tracking FROM orders WHERE id=?').bind(id).first();
 const prior=await existing();if(prior)return receipt(prior);
 const productId=f.get('product');
 if(typeof productId!=='string'||!/^\d+$/.test(productId))return json({},400);
 const product=await env.DB.prepare('SELECT name,visible,price FROM products WHERE id=?').bind(Number(productId)).first()??initial[Number(productId)];
 if(!product?.visible)return json({error:'Mahsulot katalogda mavjud emas.'},400);
 const file=f.get('photo');let bytes,mime='',filename='';
 if(file!==null){
  if(typeof file==='string'||!file.size||file.size>maxPhoto)return json({error:'Surat hajmi 1 baytdan 10 MB gacha bo‘lishi kerak.'},400);
  bytes=new Uint8Array(await file.arrayBuffer());mime=photoType(bytes);
  if(!mime)return json({error:'JPG, PNG yoki WebP rasm tanlang.'},415);
  filename=file.name.replace(/[\x00-\x1f/\\]/g,'_').slice(0,180)||'surat';
 }
 let gift=null;
 if(f.has('gift')){
  try{gift=await calculateGift(f.get('gift'),env,product,Number(productId),qty,!!bytes);}
  catch{return json({error:'Sozlamalar yoki narx yangilangan. Sahifani yangilang va tanlovlarni tekshiring.'},400);}
 }
 const tracking=crypto.randomUUID();
 const key=bytes?'orders/'+crypto.randomUUID():null;
 if(key)await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
 try{
  const insert=env.DB.prepare('INSERT INTO orders(id,created,product,qty,note,contact,filename,mime,size,object_key,customer_hash,tracking,stage,gift,product_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,Date.now(),product.name,qty,note,contact,filename,mime,bytes?.length||0,key,hash,tracking,stages[0],gift?JSON.stringify(gift):null,Number(productId));
  const jobs=[insert];
  if(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_ADMIN_CHAT_ID)jobs.push(env.DB.prepare('INSERT OR IGNORE INTO notifications(id,order_id,kind,chat_id,text) VALUES(?,?,?,?,?)').bind('new:'+id,id,'new',String(env.TELEGRAM_ADMIN_CHAT_ID),'Yangi buyurtma #'+id.slice(0,8)+'\n'+product.name+' — '+qty+' dona\n'+note+'\n'+contact+'\nJami: '+(gift?.total==null?'Kelishiladi':gift.total+' so‘m')));
  await env.DB.batch(jobs);
 }catch(e){
  const saved=await env.DB.prepare('SELECT object_key,customer_hash,tracking FROM orders WHERE id=?').bind(id).first();
  if(key&&saved?.object_key!==key)await env.BUCKET.delete(key);
  if(saved)return receipt(saved);throw e;
 }
 return json({id,tracking});
}
async function orderPhoto(env,id,download){
 const db=env.DB;
 const order=await db.prepare('SELECT filename,mime,size,object_key FROM orders WHERE id=?').bind(id).first();
 if(!order?.size)return new Response(null,{status:404,headers:noCache});
 let part=0,sent=0;
 const object=order.object_key?await env.BUCKET.get(order.object_key):null;
 if(order.object_key&&!object)return new Response(null,{status:503,headers:noCache});
 const stream=object?object.body:new ReadableStream({async pull(controller){
  const chunk=await db.prepare('SELECT bytes FROM order_files WHERE order_id=? AND part=?').bind(id,part++).first();
  if(!chunk)throw Error('Incomplete image');
  const data=new Uint8Array(chunk.bytes);sent+=data.length;controller.enqueue(data);if(sent>=order.size)controller.close();
 }});
 return new Response(stream,{headers:{...noCache,'Content-Type':order.mime,'Content-Length':String(order.size),'Content-Disposition':(download?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent(order.filename)}});
}
