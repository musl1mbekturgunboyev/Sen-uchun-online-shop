async function telegramCall(env,method,body){
 const response=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/'+method,{method:'POST',headers:body instanceof FormData?undefined:{'Content-Type':'application/json'},body:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const data=await response.json();if(!response.ok||!data.ok){const e=new Error('Telegram '+(data.error_code||response.status));e.code=data.error_code||response.status;e.retry=data.parameters?.retry_after;throw e;}return data.result;
}
let sendingNotifications=false;
async function flushNotifications(env){
 if(!env.TELEGRAM_BOT_TOKEN||sendingNotifications)return;sendingNotifications=true;
 try{
  const now=Date.now();
  const rows=(await env.DB.prepare('SELECT * FROM notifications WHERE sent_at IS NULL AND attempts<10 AND next_attempt<=? AND lease_until<? ORDER BY rowid LIMIT 10').bind(now,now).all()).results;
  for(const job of rows){
   if(Date.now()-now>20000)break;
   const claimed=await env.DB.prepare('UPDATE notifications SET lease_until=?,attempts=attempts+1 WHERE id=? AND sent_at IS NULL AND lease_until<?').bind(Date.now()+120000,job.id,now).run();if(!claimed.meta.changes)continue;
   try{
    // Unsubscribed customers must not receive queued status updates.
    if(job.kind==='status'){
     const o=await env.DB.prepare('SELECT telegram_chat FROM orders WHERE id=?').bind(job.order_id).first();
     if(o?.telegram_chat!==job.chat_id){await env.DB.prepare('UPDATE notifications SET sent_at=?,last_error=? WHERE id=?').bind(Date.now(),'Obuna bekor qilingan',job.id).run();continue;}
    }
    if(job.kind==='new'){
     const o=await env.DB.prepare('SELECT object_key,filename FROM orders WHERE id=?').bind(job.order_id).first();
     const file=o?.object_key?await env.BUCKET.get(o.object_key):null;
     if(file){const form=new FormData();form.set('chat_id',job.chat_id);form.set('caption',job.text.slice(0,1024));form.set('document',await new Response(file.body).blob(),o.filename||'surat');await telegramCall(env,'sendDocument',form);}
     else await telegramCall(env,'sendMessage',{chat_id:job.chat_id,text:job.text});
    }else await telegramCall(env,'sendMessage',{chat_id:job.chat_id,text:job.text});
    await env.DB.prepare("UPDATE notifications SET sent_at=?,lease_until=0,last_error='' WHERE id=?").bind(Date.now(),job.id).run();
   }catch(e){
    const attempts=job.attempts+1,delay=Math.max(Number(e.retry)||0,Math.min(3600,30*2**attempts))*1000;
    await env.DB.prepare('UPDATE notifications SET lease_until=0,next_attempt=?,last_error=? WHERE id=?').bind(Date.now()+delay,'Telegram yuborilmadi ('+(e.code||'ulanish')+').',job.id).run();
   }
  }
  await env.DB.prepare('DELETE FROM telegram_links WHERE expires<?').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM recovery_codes WHERE expires<?').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM recovered_access WHERE expires<?').bind(Date.now()).run();
 }finally{sendingNotifications=false;}
}
async function notificationRoute(request,env,path){
 if(path==='/api/admin/telegram'&&request.method==='GET'){
  const bot=await env.DB.prepare('SELECT bot_username FROM integrations WHERE id=1').first();
  const stats=await env.DB.prepare('SELECT COUNT(*) AS pending,SUM(CASE WHEN attempts>=10 THEN 1 ELSE 0 END) AS failed FROM notifications WHERE sent_at IS NULL').first();
  return json({tokenConfigured:!!env.TELEGRAM_BOT_TOKEN,adminConfigured:!!env.TELEGRAM_ADMIN_CHAT_ID,webhookSecretConfigured:!!env.TELEGRAM_WEBHOOK_SECRET,bot:bot?.bot_username||'',...stats});
 }
 if(path==='/api/admin/telegram/setup'&&request.method==='POST'){
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_WEBHOOK_SECRET||!/^[A-Za-z0-9_-]{32,256}$/.test(env.TELEGRAM_WEBHOOK_SECRET))return json({error:'TELEGRAM_BOT_TOKEN va 32–256 belgili TELEGRAM_WEBHOOK_SECRET ni sozlang.'},400);
  try{
   const me=await telegramCall(env,'getMe',{});if(!/^[a-zA-Z0-9_]{5,32}$/.test(me.username))throw Error();
   await telegramCall(env,'setWebhook',{url:new URL('/api/telegram/webhook',request.url).href,secret_token:env.TELEGRAM_WEBHOOK_SECRET,allowed_updates:['message']});
   await env.DB.prepare('INSERT OR REPLACE INTO integrations VALUES(1,?)').bind(me.username).run();return json({saved:true,bot:me.username});
  }catch{return json({error:'Telegram ulanmadi. Bot tokenini va Worker HTTPS manzilini tekshiring.'},502);}
 }
 if(path==='/api/admin/telegram/retry'&&request.method==='POST'){
  await env.DB.prepare('UPDATE notifications SET attempts=0,next_attempt=0 WHERE sent_at IS NULL AND lease_until<?').bind(Date.now()).run();await flushNotifications(env);return json({saved:true});
 }
 if(path==='/api/telegram/payment'&&request.method==='POST'){
  if(!await allowRequest(request,env,'payment',20))return json({},429);
  const o=await trackedOrder(request,env);if(!o)return json({},404);
  const finance=await env.DB.prepare('SELECT agreed_total,received FROM order_finance WHERE order_id=?').bind(o.id).first();
  const gift=o.gift?JSON.parse(o.gift):null,total=finance?.agreed_total??gift?.total??null;
  const text='Assalomu alaykum! Buyurtma uchun to‘lov qilmoqchiman.\nBuyurtma № '+o.id.slice(0,8)+'\n'+o.product+' — '+o.qty+' dona\nJami: '+(total===null?'Kelishiladi':total+' so‘m')+'\nHolat: '+o.stage+'\n'+(o.note||'');
  const queued=!!(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_ADMIN_CHAT_ID);
  if(queued)await env.DB.prepare('INSERT OR IGNORE INTO notifications(id,order_id,kind,chat_id,text) VALUES(?,?,?,?,?)').bind('payment:'+o.id,o.id,'new',String(env.TELEGRAM_ADMIN_CHAT_ID),text+'\nMijoz aloqasi: '+(o.contact||'Ko‘rsatilmagan')+'\nBu to‘lov so‘rovi, to‘langanlik tasdig‘i emas.').run();
  return json({url:'https://t.me/Life_Uz1?text='+encodeURIComponent(text),queued});
 }
 if(path==='/api/telegram/link'&&request.method==='POST'){
  if(!await allowRequest(request,env,'telegram-link',20))return json({},429);
  const o=await trackedOrder(request,env);if(!o)return json({},404);
  const integration=await env.DB.prepare('SELECT bot_username FROM integrations WHERE id=1').first();
  if(!integration||!env.TELEGRAM_BOT_TOKEN)return json({error:'Telegram bildirishnomalari hali ulanmagan. Holatni shu sahifada ko‘rishingiz mumkin.'},503);
  const bytes=crypto.getRandomValues(new Uint8Array(24)),token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  await env.DB.batch([env.DB.prepare('DELETE FROM telegram_links WHERE order_id=?').bind(o.id),env.DB.prepare('INSERT INTO telegram_links VALUES(?,?,?)').bind(await digest(token),o.id,Date.now()+900000)]);
  return json({url:'https://t.me/'+integration.bot_username+'?start='+token});
 }
 if(path==='/api/telegram/unlink'&&request.method==='POST'){
  const o=await trackedOrder(request,env);if(!o)return json({},404);
  await env.DB.batch([env.DB.prepare('UPDATE orders SET telegram_chat=NULL WHERE id=?').bind(o.id),env.DB.prepare('DELETE FROM telegram_links WHERE order_id=?').bind(o.id)]);return json({saved:true});
 }
 return json({},405);
}
async function telegramWebhook(request,env){
 if(request.method!=='POST')return json({},405);
 const supplied=request.headers.get('X-Telegram-Bot-Api-Secret-Token');
 if(!env.TELEGRAM_WEBHOOK_SECRET||!supplied||await digest(supplied)!==await digest(env.TELEGRAM_WEBHOOK_SECRET))return json({},403);
 let data;try{data=await requestData(request,65536);}catch{return json({},400);}
 if(!Number.isSafeInteger(data?.update_id))return json({},400);
 if(await env.DB.prepare('SELECT id FROM notifications WHERE id=?').bind('update:'+data.update_id).first())return json({ok:true});
 const m=data?.message;if(!m||m.chat?.type!=='private'||m.from?.is_bot||m.chat.id!==m.from?.id||typeof m.text!=='string')return json({ok:true});
 const chat=String(m.chat.id),match=/^\/start(?:@[A-Za-z0-9_]+)?(?: ([a-f0-9]{48}))?$/.exec(m.text.trim());
 let answer='Buyurtma saytida «Telegramda xabar olish» tugmasini bosing. Buyurtmalarni boshqa telefonda tiklash: /orders. Sizning chat ID: '+chat;
 if(m.text.trim()==='/orders'){
  const code='SU-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  await env.DB.batch([env.DB.prepare('DELETE FROM recovery_codes WHERE chat_id=? OR expires<?').bind(chat,Date.now()),env.DB.prepare('INSERT INTO recovery_codes VALUES(?,?,?)').bind(await digest(code),chat,Date.now()+600000)]);
  answer='Sen uchun — buyurtmalarni tiklash\n'+code+'\nSaytda Buyurtmalarim → Boshqa telefonda tiklash bo‘limiga kiriting. Kod 10 daqiqa amal qiladi, bir marta ishlaydi. Uni boshqa odamga bermang. Faqat shu botga bog‘langan buyurtmalar ochiladi.';
 }else if(m.text.trim()==='/stop'){
  await env.DB.prepare('UPDATE orders SET telegram_chat=NULL WHERE telegram_chat=?').bind(chat).run();answer='Barcha buyurtma bildirishnomalari to‘xtatildi.';
 }else if(match?.[1]){
  // Atomic, single use capability. The tracking secret itself never enters Telegram.
  const link=await env.DB.prepare('DELETE FROM telegram_links WHERE token_hash=? AND expires>? RETURNING order_id').bind(await digest(match[1]),Date.now()).first();
  if(link){
   await env.DB.prepare('UPDATE orders SET telegram_chat=? WHERE id=? AND (telegram_chat IS NULL OR telegram_chat=?)').bind(chat,link.order_id,chat).run();
   const o=await env.DB.prepare('SELECT product,stage,telegram_chat FROM orders WHERE id=?').bind(link.order_id).first();
   answer=o?.telegram_chat===chat?'Sen uchun · № '+link.order_id.slice(0,8)+'\n'+o.product+'\nHozirgi holat: '+o.stage+'\nHolat o‘zgarsa xabar yuboramiz. To‘xtatish: /stop':'Obuna boshqa hisobga ulangan. Saytdagi kuzatuv sahifasidan bekor qilib qayta ulang.';
  }else answer='Havola ishlatilgan yoki muddati tugagan. Saytdan yangi havola oling.';
 }else if(!match)return json({ok:true});
 if(!Number.isSafeInteger(data.update_id))return json({},400);
 await env.DB.prepare('INSERT OR IGNORE INTO notifications(id,order_id,kind,chat_id,text) VALUES(?,?,?,?,?)').bind('update:'+data.update_id,'','reply',chat,answer).run();
 return json({ok:true});
}
