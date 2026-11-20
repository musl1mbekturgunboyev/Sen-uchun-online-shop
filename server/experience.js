const seasonModes=['auto','spring','summer','autumn','winter','off'];
async function paymentSummary(env,o){
 const f=await env.DB.prepare('SELECT received,agreed_total,revision FROM order_finance WHERE order_id=?').bind(o.id).first();
 const total=f?.agreed_total??(o.gift?JSON.parse(o.gift).total:null),received=f?.received||0;
 const receipts=(await env.DB.prepare('SELECT id,amount,status,note,created FROM payment_receipts WHERE order_id=? ORDER BY created DESC LIMIT 20').bind(o.id).all()).results;
 const negotiated=(o.gift?JSON.parse(o.gift).total:null)==null;
 const accepted=await env.DB.prepare('SELECT amount FROM quote_acceptances WHERE order_id=?').bind(o.id).first();
 const needsAcceptance=negotiated&&(total==null||accepted?.amount!==total);
 return {negotiated,needsAcceptance,quoteRevision:f?.revision||0,total,received,balance:total==null?null:Math.max(0,total-received),status:total!=null&&received>=total?'To‘langan':received>0?'Qisman to‘langan':'To‘lov kutilmoqda',receipts};
}
async function experienceRoute(request,env,path){
 const method=request.method,url=new URL(request.url);
 if(path==='/api/storefront'&&method==='GET'){
  const row=await env.DB.prepare('SELECT season,revision FROM storefront_settings WHERE id=1').first();
  const bot=await env.DB.prepare('SELECT bot_username FROM integrations WHERE id=1').first();
  return json({...row,season:row?.season||'auto',revision:row?.revision||0,bot:env.TELEGRAM_BOT_TOKEN?bot?.bot_username||'':''});
 }
 if(path==='/api/admin/storefront'&&method==='POST'){
  let d;try{d=await requestData(request);}catch{return json({},400);}
  if(!d||!seasonModes.includes(d.season)||!integer(d.revision,0,1e9))return json({},400);
  const r=d.revision===0?await env.DB.prepare('INSERT OR IGNORE INTO storefront_settings(id,season) VALUES(1,?)').bind(d.season).run():await env.DB.prepare('UPDATE storefront_settings SET season=?,revision=revision+1 WHERE id=1 AND revision=?').bind(d.season,d.revision).run();return json({},r.meta.changes?200:409);
 }
 if(path==='/api/recovery'&&method==='POST'){
  if(!await allowRequest(request,env,'recovery',10))return json({},429);
  const hash=await customerHash(request);if(!hash)return json({},401);
  let d;try{d=await requestData(request);}catch{return json({},400);}
  if(!d||typeof d.code!=='string'||!/^SU-[a-f0-9]{32}$/.test(d.code))return json({error:'Bot bergan SU- bilan boshlanuvchi kodni kiriting.'},400);
  const row=await env.DB.prepare('DELETE FROM recovery_codes WHERE token_hash=? AND expires>? RETURNING chat_id').bind(await digest(d.code),Date.now()).first();
  if(!row)return json({error:'Kod xato, ishlatilgan yoki muddati tugagan. Botda /orders yozib yangi kod oling.'},400);
  await env.DB.prepare('INSERT INTO recovered_access VALUES(?,?,?) ON CONFLICT(customer_hash,chat_id) DO UPDATE SET expires=excluded.expires').bind(hash,row.chat_id,Date.now()+30*86400000).run();return json({saved:true});
 }
 if(path==='/api/recovery/logout'&&method==='POST'){
  const hash=await customerHash(request);if(!hash)return json({},401);await env.DB.prepare('DELETE FROM recovered_access WHERE customer_hash=?').bind(hash).run();return json({saved:true});
 }
 if(path==='/api/payment'&&method==='GET'){
  const o=await trackedOrder(request,env);return o?json(await paymentSummary(env,o)):json({},404);
 }
 if(path==='/api/payment/accept'&&method==='POST'){
  const o=await trackedOrder(request,env);if(!o)return json({},404);
  let d;try{d=await requestData(request);}catch{return json({},400);}
  if(!d||!integer(d.amount,0,1e12)||!integer(d.revision,1,1e9))return json({},400);
  const result=await env.DB.prepare('INSERT INTO quote_acceptances(order_id,amount,accepted_at) SELECT order_id,agreed_total,? FROM order_finance WHERE order_id=? AND agreed_total=? AND revision=? ON CONFLICT(order_id) DO UPDATE SET amount=excluded.amount,accepted_at=excluded.accepted_at').bind(Date.now(),o.id,d.amount,d.revision).run();
  return json({saved:!!result.meta.changes},result.meta.changes?200:409);
 }
 if(path==='/api/payment/receipt' &&method==='POST'){
  if(!await allowRequest(request,env,'receipt',12))return json({},429);
  const o=await trackedOrder(request,env);if(!o)return json({},404);
  const payment=await paymentSummary(env,o);if(payment.needsAcceptance)return json({error:'Avval sotuvchi taklif qilgan narxni tasdiqlang.'},409);
  if(!request.headers.get('Content-Type')?.startsWith('multipart/form-data'))return json({},415);
  let form;try{form=await new Response(await limitedBody(request,3*1024*1024+4096),{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData();}catch{return json({error:'Chek rasmi 3 MB dan oshmasin.'},413);}
  const file=form.get('photo'),amount=Number(form.get('amount'));
  if(!file||typeof file==='string'||!file.size||file.size>3*1024*1024||!integer(amount,1,1e12))return json({error:'Chek rasmi va o‘tkazilgan summani tekshiring.'},400);
  const bytes=new Uint8Array(await file.arrayBuffer()),mime=photoType(bytes);if(!mime)return json({error:'JPG, PNG yoki WebP chek rasmini tanlang.'},415);
  const id=crypto.randomUUID(),key='payment-receipts/'+id;
  await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
  try{await env.DB.prepare('INSERT INTO payment_receipts(id,order_id,object_key,mime,amount,created) VALUES(?,?,?,?,?,?)').bind(id,o.id,key,mime,amount,Date.now()).run();}
  catch(e){await env.BUCKET.delete(key);if(await env.DB.prepare("SELECT id FROM payment_receipts WHERE order_id=? AND status='pending'").bind(o.id).first())return json({error:'Oldingi chekingiz tekshirilmoqda. Natijani kuting.'},409);throw e;}
  return json({saved:true});
 }
 if(path==='/api/admin/receipts'&&method==='GET'){
  const status=url.searchParams.get('status')||'pending',before=url.searchParams.get('before')||'9223372036854775807';
  if(!['pending','approved','rejected'].includes(status)||!/^\d{1,19}$/.test(before))return json({},400);
  const rows=(await env.DB.prepare('SELECT r.rowid AS cursor,r.id,r.order_id,r.amount,r.status,r.note,r.created,o.product FROM payment_receipts r JOIN orders o ON o.id=r.order_id WHERE r.status=? AND r.rowid<CAST(? AS INTEGER) ORDER BY r.rowid DESC LIMIT 41').bind(status,before).all()).results;
  return json({receipts:rows.slice(0,40),more:rows.length>40});
 }
 if(path==='/api/admin/receipt'&&method==='GET'){
  const row=await env.DB.prepare('SELECT * FROM payment_receipts WHERE id=?').bind(url.searchParams.get('id')||'').first();if(!row)return json({},404);
  const file=await env.BUCKET.get(row.object_key);return file?new Response(file.body,{headers:{...noCache,'Content-Type':row.mime}}):json({},404);
 }
 if(path==='/api/admin/receipt'&&method==='POST'){
  let d;try{d=await requestData(request);}catch{return json({},400);}
  if(!d||typeof d.id!=='string'||!['approved','rejected'].includes(d.status)||!shortText(d.note,300))return json({},400);
  const row=await env.DB.prepare('SELECT * FROM payment_receipts WHERE id=?').bind(d.id).first();if(!row)return json({},404);
  if(d.status==='rejected'){
   const r=await env.DB.prepare("UPDATE payment_receipts SET status='rejected',note=? WHERE id=? AND status='pending'").bind(d.note,d.id).run();return json({},r.meta.changes?200:409);
  }
  if(!integer(d.revision,0,1e9))return json({},400);
  await env.DB.prepare('INSERT OR IGNORE INTO order_finance(order_id,revision) VALUES(?,0)').bind(row.order_id).run();
  const decision=crypto.randomUUID();
  const r=await env.DB.batch([
   env.DB.prepare("UPDATE payment_receipts SET status='approved',note=?,decision=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM order_finance WHERE order_id=? AND revision=? AND received+?<=1000000000000)").bind(d.note,decision,d.id,row.order_id,d.revision,row.amount),
   env.DB.prepare("UPDATE order_finance SET received=received+?,revision=revision+1 WHERE order_id=? AND EXISTS(SELECT 1 FROM payment_receipts WHERE id=? AND decision=?)").bind(row.amount,row.order_id,d.id,decision)
  ]);
  return json({},r[0].meta.changes?200:409);
 }
 return json({},405);
}
