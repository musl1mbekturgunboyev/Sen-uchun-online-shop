const initial=[
 ['Suratli shokolad','Surat va ism tushirilgan o‘ram','Shokoladlar','/media/chocolate.webp'],
 ['Tabrik qutisi','Ism, sana va tilaklar bilan','Qutilar','/media/box.jpg'],
 ['Ismli kitobcha','Bolangiz suratlaridan kitobcha','Kitobchalar','/media/book.jpg'],
 ['Foto chop etish','Sevimli suratlaringiz qog‘ozda','Fotosuratlar','/media/photo.jpg']
].map(([name,description,category,image],id)=>({id,name,description,category,image,price:null,revision:0,visible:1}));
const noCache={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const json=(value,status=200)=>Response.json(value,{status,headers:noCache});
function isOwner(request){
 return Boolean(request.headers.get('oai-authenticated-user-id')) && request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase()==='muslimbekturgunboyev08@gmail.com';
}
const samples=new Map([[0,['/media/hero.webp']],[1,['/media/box-detail.jpg']],[2,['/media/book-inside.jpg']]]);
function decodeImages(value){return value.startsWith('[')?JSON.parse(value):[value];}
async function catalog(db,editing=false){
 const rows=(await db.prepare('SELECT id,name,description,category,price,visible,revision,image FROM products ORDER BY id').all()).results;
 const merged=new Map(initial.map(p=>[p.id,{...p,images:[p.image,...(samples.get(p.id)||[])]}]));
 for(const row of rows){
  const images=decodeImages(row.image).map((src,index)=>!editing&&src.startsWith('data:')?'/product-image/'+row.id+'?i='+index+'&v='+row.revision:src);
  merged.set(row.id,{...row,image:images[0],images});
 }
 return [...merged.values()];
}
function validImage(value){
 return typeof value==='string' && (((/^\/catalog-media\/[a-f0-9]{64}$/.test(value)) || (value.startsWith('/media/') && Object.hasOwn(assets,value) && assets[value][0].startsWith('image/'))) ||
 (value.length<=810000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)));
}
let cachedCatalog;
const metrics=['view','open','telegram'];
async function dispatch(request,env){
 const url=new URL(request.url),p=url.pathname,method=request.method,owner=await ownerAccess(request,env);
 if(standalone&&p==='/admin'&&!owner)return new Response('Admin kirishi',{status:401,headers:{...noCache,'WWW-Authenticate':'Basic realm="Sen uchun", charset="UTF-8"'}});
 if((p==='/admin'||p.startsWith('/api/admin'))&&!owner)return new Response('Topilmadi',{status:404,headers:noCache});
 const origin=request.headers.get('Origin');
 const trustedStorefront=standalone && !!env.STOREFRONT_ORIGIN && origin===env.STOREFRONT_ORIGIN;
 if(method==='POST' && origin!==url.origin && !trustedStorefront)return json({error:'Ruxsat yo‘q'},403);
 if(p==='/api/admin/template')return templateRoute(request,env);
 if(['/api/gifts','/api/track','/api/admin/gifts','/api/admin/stage'].includes(p))return giftRoute(request,env,p);
 if(p==='/api/my-orders'&&method==='GET')return customerOrders(request,env);
 if(p==='/api/orders'&&method==='POST')return acceptOrder(request,env);
 if(p==='/api/admin/orders'&&method==='GET'){
  const before=url.searchParams.get('before')||'9999999999999';
  const rows=await env.DB.prepare('SELECT rowid AS cursor,* FROM orders WHERE rowid<? ORDER BY rowid DESC LIMIT 40').bind(Number(before)).all();return json(rows.results);
 }
 if(/^\/api\/admin\/orders\/[a-f0-9-]{36}\/photo$/.test(p)&&method==='GET')return orderPhoto(env,p.split('/')[4],url.searchParams.has('download'));
 if(p==='/admin'&&method==='GET')return new Response(adminPage,{headers:{...noCache,'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'no-referrer'}});
 if(p==='/api/session'&&method==='GET')return json({owner});
 if(p==='/api/catalog'&&method==='GET'){
  if(!cachedCatalog||cachedCatalog.until<=Date.now()){
   const products=(await catalog(env.DB)).filter(product=>product.visible);
   cachedCatalog={until:Date.now()+15000,body:JSON.stringify({products})};
  }
  return new Response(cachedCatalog.body,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=0, s-maxage=15','X-Content-Type-Options':'nosniff'}});
 }
 if(/^\/product-image\/\d+$/.test(p)&&method==='GET'){
  const row=await env.DB.prepare('SELECT image,visible FROM products WHERE id=?').bind(Number(p.split('/').pop())).first();
  const index=Number(url.searchParams.get('i')||0);
  const image=row?.visible && Number.isInteger(index)&&index>=0&&index<10&&decodeImages(row.image)[index];
  if(!image||!image.startsWith('data:'))return new Response(null,{status:404});
  const [type,data]=image.split(',');return new Response(Uint8Array.from(atob(data),c=>c.charCodeAt(0)),{headers:{'Content-Type':type.slice(5,-7),'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
 }
 if(/^\/catalog-media\/[a-f0-9]{64}$/.test(p)&&method==='GET'){
  const obj=await env.BUCKET.get(p.slice(1));if(!obj)return new Response(null,{status:404});
  return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata.contentType,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
 }
 if(p==='/api/event'&&method==='POST'){
  if(!owner&&!await allowRequest(request,env,'events',240))return json({},429);
  let event;try{event=JSON.parse(await (await limitedBody(request,512)).text());}catch{return json({},400);}const {kind,id}=event||{};if(!metrics.includes(kind)||!Number.isSafeInteger(id)||id< -1)return json({},400);
  if(!owner)await env.DB.prepare("INSERT INTO events(day,kind,product,hits) VALUES(date('now','+5 hours'),?,?,1) ON CONFLICT(day,kind,product) DO UPDATE SET hits=hits+1").bind(kind,id).run();
  return json({});
 }
 if(p==='/api/admin'&&method==='GET'){
  const products=await catalog(env.DB,true);
  const stats=(await env.DB.prepare("SELECT day,kind,product,hits FROM events WHERE day>=date('now','+5 hours','-29 days') ORDER BY day DESC").all()).results;
  return json({products,stats});
 }
 if(p==='/api/admin/product'&&method==='POST'){
  let raw;try{raw=await (await limitedBody(request,1850000)).text();}catch{return json({},413);}if(raw.length>1850000)return json({error:'Rasm hajmi katta'},413);
  let v;try{v=JSON.parse(raw)}catch{return json({},400)}
  if(!v||![['name',100],['description',350],['category',60]].every(([key,max])=>typeof v[key]==='string'&&v[key].trim().length>0&&v[key].length<=max)||!(v.price===null||Number.isSafeInteger(v.price)&&v.price>=0&&v.price<=1e12)||![0,1].includes(v.visible))return json({error:'Maydonlarni tekshiring'},400);
  const images=v.images??[v.image];
  if(!Array.isArray(images)||images.length<1||images.length>10||!images.every(validImage))return json({error:'1–10 ta JPG, PNG yoki WebP rasm tanlang.'},400);
  const stored=[];
  for(const src of images){
   if(!src.startsWith('data:')){stored.push(src);continue;}
   const bytes=Uint8Array.from(atob(src.split(',')[1]),c=>c.charCodeAt(0));const mime=photoType(bytes);
   if(!mime)return json({error:'Rasm formati noto‘g‘ri.'},400);
   const key='catalog-media/'+await digest(bytes);await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
   stored.push('/'+key);
  }
  const args=[v.name.trim(),v.description.trim(),v.category.trim(),v.price,JSON.stringify(stored),v.visible];
  if(v.id===null){await env.DB.prepare('INSERT INTO products(id,name,description,category,price,image,visible) SELECT max(3,coalesce(max(id),3))+1,?,?,?,?,?,? FROM products').bind(...args).run();}
  else{
   if(!Number.isSafeInteger(v.id)||!Number.isSafeInteger(v.revision))return json({},400);
   const result=v.revision===0&&initial[v.id]?await env.DB.prepare('INSERT OR IGNORE INTO products(id,name,description,category,price,image,visible) VALUES(?,?,?,?,?,?,?)').bind(v.id,...args).run():
   await env.DB.prepare('UPDATE products SET name=?,description=?,category=?,price=?,image=?,visible=?,revision=revision+1 WHERE id=? AND revision=?').bind(...args,v.id,v.revision).run();
   if(!result.meta.changes)return json({error:'Mahsulot boshqa oynada yangilangan. Sahifani yangilang.'},409);
  }
  cachedCatalog=undefined;
  return json({saved:true});
 }
 if(standalone)return env.ASSETS.fetch(request);
 const asset=Object.hasOwn(assets,p==='/'?'/index.html':p)?assets[p==='/'?'/index.html':p]:null;
 if(!asset||!['GET','HEAD'].includes(method))return new Response(null,{status:404});
 const [type,data]=asset;let bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
 const headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':p.startsWith('/media/')?'public, max-age=86400':'no-cache','Accept-Ranges':'bytes'};
 const range=/^bytes=(\d+)-(\d*)$/.exec(request.headers.get('Range')||'');
 if(range){const start=+range[1],end=range[2]?Math.min(bytes.length-1,+range[2]):bytes.length-1;if(start>end)return new Response(null,{status:416});headers['Content-Range']='bytes '+start+'-'+end+'/'+bytes.length;bytes=bytes.subarray(start,end+1);}
 return new Response(method==='HEAD'?null:bytes,{status:range?206:200,headers});
}
export default {async fetch(request,env){try{return secure(await dispatch(request,env))}catch(error){console.error(error.message);return json({error:'Server so‘rovni bajara olmadi'},500)}}};
