const stages=['Qabul qilindi','Tayyorlanmoqda','Tayyor','Topshirildi'];
const giftDefaults={width:0,height:0,pickup:'',delivery:null,photo:null,card:null,bag:null};
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
async function giftSettings(env){
 const row=await env.DB.prepare('SELECT settings FROM gift_settings WHERE id=1').first();
 return row?JSON.parse(row.settings):giftDefaults;
}
async function giftRoute(request,env,path){
 if(path==='/api/gifts'&&request.method==='GET')return json(await giftSettings(env));
 if(path==='/api/track'&&request.method==='GET'){
  const token=request.headers.get('X-Tracking-Key')||'';
  if(!/^[a-f0-9-]{36}$/.test(token))return json({},404);
  const row=await env.DB.prepare('SELECT product,qty,stage FROM orders WHERE tracking=?').bind(token).first();
  return row?json(row):json({},404);
 }
 if(!['/api/admin/gifts','/api/admin/stage'].includes(path)||request.method!=='POST')return json({},405);
 let data;try{data=JSON.parse(await (await limitedBody(request,4096)).text());}catch{return json({},400);}
 if(!data||typeof data!=='object')return json({},400);
 if(path==='/api/admin/stage'){
  if(!stages.includes(data.stage)||typeof data.id!=='string')return json({},400);
  const r=await env.DB.prepare("UPDATE orders SET stage=? WHERE id=? AND COALESCE(stage,'')=?").bind(data.stage,data.id,data.previous||'').run();
  return r.meta.changes?json({saved:true}):json({},409);
 }
 if(typeof data.pickup!=='string'||data.pickup.length>200||!integer(data.width,0,190)||!integer(data.height,0,277)||
  (!!data.width!==!!data.height)||['photo','bag','card','delivery'].some(k=>data[k]!==null&&!integer(data[k],0,100000000)))return json({},400);
 const clean=Object.fromEntries(Object.keys(giftDefaults).map(k=>[k,data[k]]));
 await env.DB.prepare('INSERT OR REPLACE INTO gift_settings VALUES(1,?)').bind(JSON.stringify(clean)).run();
 return json({saved:true});
}
async function calculateGift(raw,env,product,id,qty,hasPhoto){
 const settings=await giftSettings(env);
 const g=JSON.parse(raw);
 if(!g||!Array.isArray(g.extras)||g.extras.length>3||new Set(g.extras).size!==g.extras.length)throw Error();
 let amount=0;
 const extras=g.extras.map(k=>{
  if(!['photo','card','bag'].includes(k)||settings[k]===null)throw Error();
  amount+=settings[k];return {key:k,price:settings[k]};
 });
 const methods=['agree',...(settings.pickup?['pickup']:[]),...(settings.delivery!==null?['delivery']:[])];
 if(!methods.includes(g.method)||methods.length>1&&g.method==='agree'||typeof g.address!=='string'||g.address.length>240||typeof g.time!=='string'||g.time.length>80||g.method==='delivery'&&!g.address.trim()||g.method==='pickup'&&!g.time.trim())throw Error();
 const fee=g.method==='delivery'?settings.delivery:0;
 const total=product.price==null?null:(product.price+amount)*qty+fee;
 if(total!==g.total||g.signature!==JSON.stringify(settings))throw Error();
 let design=null;
 if(g.design){
  const d=g.design;
  if(id!==0||!hasPhoto||!settings.width||!settings.height||typeof d.text!=='string'||d.text.length>80||!integer(d.x,0,100)||!integer(d.y,0,100)||!integer(d.zoom,100,300))throw Error();
  design={text:d.text,x:d.x,y:d.y,zoom:d.zoom,width:settings.width,height:settings.height};
 }
 if(id===0&&settings.width&&hasPhoto&&!design)throw Error();
 return {method:g.method,address:g.method==='pickup'?settings.pickup:g.address,time:g.time,extras,fee,total,unit:product.price,design};
}
