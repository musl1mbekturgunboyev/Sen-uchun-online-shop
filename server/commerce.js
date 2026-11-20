const occasionsList={'birthday':'Tug‘ilgan kun','mother':'Onajon uchun','love':'Sevgan insonimga','kids':'Bolajonlar uchun','holiday':'Bayram sovg‘alari'};
async function productDetails(env,id){
 const r=await env.DB.prepare('SELECT * FROM product_details WHERE product=?').bind(id).first();
 return r?{lead_time:r.lead_time,bundle:r.bundle,occasions:JSON.parse(r.occasions),revision:r.revision}:{lead_time:'',bundle:'',occasions:[],revision:0};
}
async function requestData(request,max=4096){return JSON.parse(await (await limitedBody(request,max)).text());}
const shortText=(v,max)=>typeof v==='string'&&v.length<=max;
async function trackedOrder(request,env){
 const key=request.headers.get('X-Tracking-Key')||'';
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(key))return null;
 return env.DB.prepare('SELECT * FROM orders WHERE tracking=?').bind(key).first();
}
async function commerceRoute(request,env,path){
 const method=request.method,url=new URL(request.url);
 if(path==='/api/admin/product-details'&&method==='POST'){
  let d;try{d=await requestData(request);}catch{return json({},400);}
  if(!d||!integer(d.product,0,1e9)||!integer(d.revision,0,1e9)||!shortText(d.lead_time,100)||!shortText(d.bundle,1000)||!Array.isArray(d.occasions)||d.occasions.length>5||d.occasions.some(k=>!Object.hasOwn(occasionsList,k))||new Set(d.occasions).size!==d.occasions.length)return json({},400);
  if(!(await catalog(env.DB,true)).some(p=>p.id===d.product))return json({},404);
  const args=[d.lead_time.trim(),d.bundle.trim(),JSON.stringify(d.occasions)];
  const result=d.revision===0?await env.DB.prepare('INSERT OR IGNORE INTO product_details(product,lead_time,bundle,occasions) VALUES(?,?,?,?)').bind(d.product,...args).run():await env.DB.prepare('UPDATE product_details SET lead_time=?,bundle=?,occasions=?,revision=revision+1 WHERE product=? AND revision=?').bind(...args,d.product,d.revision).run();
  if(result.meta.changes)cachedCatalog=undefined;
  return json({},result.meta.changes?200:409);
 }
 if(path==='/api/reviews'&&method==='GET'){
  const product=url.searchParams.get('product');if(product!==null&&!/^\d{1,9}$/.test(product))return json({},400);
  const where="status='published'"+(product===null?'':' AND product_id=?'),args=product===null?[]:[Number(product)];
  const rows=await env.DB.prepare('SELECT id,product,name,rating,text,created,CASE WHEN photo_key IS NULL THEN NULL ELSE \'/review-photo/\'||id END AS photo FROM reviews WHERE '+where+' ORDER BY created DESC LIMIT 12').bind(...args).all();
  const summary=await env.DB.prepare('SELECT COUNT(*) AS count,AVG(rating) AS average FROM reviews WHERE '+where).bind(...args).first();
  return json({reviews:rows.results,...summary});
 }
 if(/^\/review-photo\/[a-f0-9-]{36}$/.test(path)&&method==='GET'){
  const row=await env.DB.prepare("SELECT photo_key,mime FROM reviews WHERE id=? AND status='published'").bind(path.split('/').pop()).first();
  if(!row?.photo_key)return json({},404);const obj=await env.BUCKET.get(row.photo_key);if(!obj)return json({},404);
  return new Response(obj.body,{headers:{'Content-Type':row.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(path==='/api/reviews/submit'&&method==='POST'){
  if(!await allowRequest(request,env,'reviews',12))return json({},429);
  const order=await trackedOrder(request,env);if(!order||order.stage!=='Topshirildi')return json({error:'Sharh faqat topshirilgan buyurtma uchun yoziladi.'},403);
  let d;try{d=await requestData(request,550000);}catch{return json({},400);}
  if(!d||!shortText(d.name,60)||!d.name.trim()||!shortText(d.text,1000)||d.text.trim().length<3||!integer(d.rating,1,5)||d.consent!==true)return json({error:'Ism, baho, sharh va e’lon qilish roziligini tekshiring.'},400);
  if(await env.DB.prepare('SELECT id FROM reviews WHERE order_id=?').bind(order.id).first())return json({error:'Bu buyurtma uchun sharh yuborilgan.'},409);
  let key=null,mime=null;
  if(d.photo){
   if(typeof d.photo!=='string'||d.photo.length>500000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(d.photo))return json({},400);
   const bytes=Uint8Array.from(atob(d.photo.split(',')[1]),x=>x.charCodeAt(0));mime=photoType(bytes);if(!mime)return json({},400);
   key='reviews/'+crypto.randomUUID();await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
  }
  try{await env.DB.prepare('INSERT INTO reviews(id,order_id,product_id,product,name,rating,text,photo_key,mime,consent,created) VALUES(?,?,?,?,?,?,?,?,?,1,?)').bind(crypto.randomUUID(),order.id,order.product_id,order.product,d.name.trim(),d.rating,d.text.trim(),key,mime,Date.now()).run();}
  catch(e){if(key)await env.BUCKET.delete(key);if(await env.DB.prepare('SELECT id FROM reviews WHERE order_id=?').bind(order.id).first())return json({},409);throw e;}
  return json({saved:true});
 }
 if(path==='/api/admin/reviews'&&method==='GET'){
  const status=url.searchParams.get('status')||'pending',before=url.searchParams.get('before')||'9223372036854775807';
  if(!['pending','published','hidden'].includes(status)||!/^\d{1,19}$/.test(before))return json({},400);
  const rows=await env.DB.prepare('SELECT rowid AS cursor,id,product,name,rating,text,created,status,photo_key FROM reviews WHERE status=? AND rowid<CAST(? AS INTEGER) ORDER BY rowid DESC LIMIT 41').bind(status,before).all();
  return json({reviews:rows.results.slice(0,40),more:rows.results.length>40});
 }
 if(path==='/api/admin/review'&&method==='GET'){
  const id=url.searchParams.get('id');const row=await env.DB.prepare('SELECT photo_key,mime FROM reviews WHERE id=?').bind(id||'').first();if(!row?.photo_key)return json({},404);
  const obj=await env.BUCKET.get(row.photo_key);return obj?new Response(obj.body,{headers:{...noCache,'Content-Type':row.mime}}):json({},404);
 }
 if(path==='/api/admin/review'&&method==='POST'){
  let d;try{d=await requestData(request);}catch{return json({},400);}
  if(!d||typeof d.id!=='string'||!['published','hidden'].includes(d.status)||!['pending','published','hidden'].includes(d.previous))return json({},400);
  const r=await env.DB.prepare('UPDATE reviews SET status=? WHERE id=? AND status=? AND consent=1').bind(d.status,d.id,d.previous).run();return json({},r.meta.changes?200:409);
 }
 if(path==='/api/admin/finance'){
  const id=url.searchParams.get('id')||'';
  if(method==='GET')return json(await env.DB.prepare('SELECT * FROM order_finance WHERE order_id=?').bind(id).first()||{received:0,cost:0,agreed_total:null,note:'',revision:0});
  if(method==='POST'){
   let d;try{d=await requestData(request);}catch{return json({},400);}
   if(!d||typeof d.id!=='string'||!integer(d.received,0,1e12)||!integer(d.cost,0,1e12)||!(d.agreed_total===null||integer(d.agreed_total,0,1e12))||!shortText(d.note,300)||!integer(d.revision,0,1e9))return json({},400);
   if(!await env.DB.prepare('SELECT id FROM orders WHERE id=?').bind(d.id).first())return json({},404);
   const args=[d.received,d.cost,d.agreed_total,d.note];
   const r=d.revision===0?await env.DB.prepare('INSERT OR IGNORE INTO order_finance(order_id,received,cost,agreed_total,note) VALUES(?,?,?,?,?)').bind(d.id,...args).run():await env.DB.prepare('UPDATE order_finance SET received=?,cost=?,agreed_total=?,note=?,revision=revision+1 WHERE order_id=? AND revision=?').bind(...args,d.id,d.revision).run();return json({},r.meta.changes?200:409);
  }
 }
 if(path==='/api/admin/export'&&method==='GET'){
  const from=url.searchParams.get('from'),to=url.searchParams.get('to');
  const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
  if(!validDate(from)||!validDate(to)||from>to)return json({error:'Sana oralig‘ini tekshiring.'},400);
  // Shop accounting dates use Uzbekistan time (UTC+5).
  const start=Date.parse(from+'T00:00:00+05:00'),end=Date.parse(to+'T00:00:00+05:00')+86400000;
  const rows=(await env.DB.prepare('SELECT o.*,f.received,f.cost,f.agreed_total,f.note AS finance_note,f.revision AS finance_revision FROM orders o LEFT JOIN order_finance f ON f.order_id=o.id WHERE o.created>=? AND o.created<? ORDER BY o.created DESC LIMIT 5001').bind(start,end).all()).results;
  if(rows.length>5000)return json({error:'5000 tadan ko‘p buyurtma. Sana oralig‘ini qisqartiring.'},413);
  const data=[['Buyurtma','Sana (UTC+5)','Mahsulot','Soni','Holati','Kelishilgan jami','Olingan pul','Xarajat','Tushum − xarajat','To‘lanmagan qoldiq','Bog‘lanish','Izoh','Hisob izohi','Hisob kiritilganmi']];
  let received=0,cost=0,priced=0,unknown=0,unrecorded=0;
  for(const o of rows){const g=o.gift?JSON.parse(o.gift):null,total=o.agreed_total??g?.total??null,r=o.received??0,c=o.cost??0;received+=r;cost+=c;if(!o.finance_revision)unrecorded++;if(total===null)unknown++;else priced+=total;
   data.push([o.id,new Date(o.created+18000000).toISOString().replace('T',' ').slice(0,19),o.product,o.qty,o.stage,total??'Kelishilmagan',r,c,r-c,total===null?'':total-r,o.contact,o.note,o.finance_note||'',o.finance_revision?'Ha':'Yo‘q']);}
  const summary=[['Ko‘rsatkich','Qiymat'],['Buyurtmalar',rows.length],['Narxi belgilangan buyurtmalar jami',priced],['Narxi kelishilmagan buyurtmalar',unknown],['Hisob kiritilmagan buyurtmalar',unrecorded],['Olingan pul',received],['Kiritilgan xarajat',cost],['Tushum − xarajat',received-cost],['Izoh','Buyurtma yaratilgan sana bo‘yicha hisobot. Tushum va xarajat admin kiritgan qiymatlar; bu soliq yoki sof foyda hisoboti emas.']];
  return new Response(makeWorkbook([['Buyurtmalar',data],['Hisobot',summary]]),{headers:{...noCache,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="Sen-uchun-'+from+'_'+to+'.xlsx"'}});
 }
 return json({},405);
}
