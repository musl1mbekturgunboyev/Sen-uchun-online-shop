// Coordinates are percentages of the template, never browser pixels.
async function productTemplate(env,id){
 const row=await env.DB.prepare('SELECT revision,settings FROM product_templates WHERE product=?').bind(id).first();
 return row?{...JSON.parse(row.settings),revision:row.revision}:null;
}
function templateRegion(r){return r&&['x','y','w','h'].every(k=>Number.isFinite(r[k]))&&r.x>=0&&r.y>=0&&r.w>=1&&r.h>=1&&r.x+r.w<=100&&r.y+r.h<=100;}
async function templateRoute(request,env){
 if(request.method!=='POST')return json({},405);
 let v;try{v=JSON.parse(await (await limitedBody(request,850000)).text());}catch{return json({},400);}
 if(!v||!integer(v.product,0,1e9)||!integer(v.revision,0,1e9))return json({},400);
 const product=(await catalog(env.DB,true)).find(p=>p.id===v.product);
 if(!product)return json({},404);
 const t=v.template;
 if(!t||typeof t.enabled!=='boolean'||!integer(t.width,1,190)||!integer(t.height,1,277)||!templateRegion(t.photo)||!templateRegion(t.label)||!/^#[a-fA-F0-9]{6}$/.test(t.label.color)||!integer(t.label.size,1,30)||!validImage(t.background))return json({error:'Maket o‘lchamlari, surat va ism joylarini tekshiring.'},400);
 const old=await productTemplate(env,v.product);
 if((old?.revision||0)!==v.revision)return json({error:'Maket boshqa oynada o‘zgargan. Qayta oching.'},409);
 let background=t.background;
 if(background.startsWith('data:')){
  const bytes=Uint8Array.from(atob(background.split(',')[1]),c=>c.charCodeAt(0)),mime=photoType(bytes);
  if(!mime)return json({},400);
  const key='catalog-media/'+await digest(bytes);await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});background='/'+key;
 }
 // Copy built-in art too: an old order must survive future releases of /media files.
 if(background.startsWith('/media/')){
  const response=standalone?await env.ASSETS.fetch(new Request(new URL(background,request.url))):new Response(Uint8Array.from(atob(assets[background][1]),c=>c.charCodeAt(0)));
  if(!response.ok)return json({error:'Maket rasmi yuklanmadi.'},400);
  const bytes=new Uint8Array(await response.arrayBuffer()),mime=photoType(bytes);if(!mime)return json({},400);
  const key='catalog-media/'+await digest(bytes);await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});background='/'+key;
 }else if(!await env.BUCKET.get(background.slice(1)))return json({error:'Maket rasmi topilmadi.'},400);
 const region=r=>({x:r.x,y:r.y,w:r.w,h:r.h});
 const clean={enabled:t.enabled,width:t.width,height:t.height,background,photo:region(t.photo),label:{...region(t.label),color:t.label.color,size:t.label.size}};
 const result=old?await env.DB.prepare('UPDATE product_templates SET revision=revision+1,settings=? WHERE product=? AND revision=?').bind(JSON.stringify(clean),v.product,v.revision).run():await env.DB.prepare('INSERT OR IGNORE INTO product_templates VALUES(?,1,?)').bind(v.product,JSON.stringify(clean)).run();
 return result.meta.changes?json({saved:true}):json({},409);
}
