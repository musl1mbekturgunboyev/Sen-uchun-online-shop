function renderPrice(container,product){
 container.replaceChildren();container.classList.add('price-stack');
 if(product.original_price!=null){container.append(textNode('del',money(product.original_price)));}
 container.append(textNode('span',product.price===null?'Narx kelishiladi':money(product.price)));
}
async function shopJson(path,options){const r=await fetch(path,options||{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'So‘rov bajarilmadi. Qayta urinib ko‘ring.');return data;}
function paymentPanel(container,token){
 const panel=textNode('section','', 'payment-panel'),heading=textNode('h3','To‘lov'),summary=textNode('div','Yuklanmoqda…','payment-summary'),status=textNode('p',''),actions=textNode('div','', 'payment-actions');status.setAttribute('role','status');panel.append(heading,summary,actions,status);container.append(panel);
 const headers={'X-Tracking-Key':token};
 async function refresh(){
  summary.replaceChildren(textNode('p','Yuklanmoqda…'));actions.replaceChildren();
  try{const d=await shopJson('/api/payment',{headers,cache:'no-store'});if(!panel.isConnected)return;
   summary.replaceChildren(textNode('span',d.status,'payment-status'));
   const amounts=document.createElement('dl');for(const [label,value] of [['Jami',d.total],['To‘langan',d.received],['Qoldiq',d.balance]]){amounts.append(textNode('dt',label),textNode('dd',value===null?'Kelishiladi':money(value)));}summary.append(amounts);
   if(d.status!=='To‘langan'){
    const pay=textNode('button','To‘lov qilish → Sotuvchi','primary');pay.type='button';actions.append(pay);
    pay.onclick=async()=>{pay.disabled=true;try{const data=await shopJson('/api/telegram/payment',{method:'POST',headers});const a=textNode('a','Telegramda sotuvchiga yozish','primary');a.href=data.url;status.replaceChildren(textNode('p',data.queued?'Buyurtma adminga yuborish navbatiga qo‘yildi. Telegramda matnni yuboring.':'Admin chatida buyurtma matnini yuboring. Bot orqali yuborish hozir sozlanmagan.'),a);location.assign(data.url);}catch(e){status.textContent=e.message;}finally{pay.disabled=false;}};
   }
   const pending=d.receipts.some(r=>r.status==='pending');
   if(pending)actions.append(textNode('p','Chekingiz tekshirilmoqda. Tasdiqlangach summa yangilanadi.','receipt-pending'));
   else if(d.status!=='To‘langan'){
    const details=document.createElement('details');details.className='receipt-upload';details.append(textNode('summary','To‘ladim — chekni yuborish'));
    const form=document.createElement('form');form.innerHTML='<label>O‘tkazilgan summa (so‘m)<input name="amount" type="number" min="1" max="1000000000000" step="1" required></label><label>Chek rasmi<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></label><small>JPG, PNG yoki WebP, 3 MB gacha. Chekni faqat siz va admin ko‘radi.</small><button class="primary">Chekni yuborish</button>';
    form.elements.amount.value=d.balance>0?d.balance:'';details.append(form);actions.append(details);
    form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button'),file=form.elements.photo.files[0];if(!file||file.size>3*1024*1024){status.textContent='3 MB gacha chek rasmini tanlang.';return;}button.disabled=true;try{await shopJson('/api/payment/receipt',{method:'POST',headers,body:new FormData(form)});status.textContent='Chek yuborildi. Sotuvchi tekshirib tasdiqlaydi.';await refresh();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
   }
   if(d.receipts.length){const history=document.createElement('details');history.append(textNode('summary','Cheklar tarixi ('+d.receipts.length+')'));for(const r of d.receipts){history.append(textNode('p',money(r.amount)+' · '+({pending:'Tekshirilmoqda',approved:'Tasdiqlangan',rejected:'Rad etilgan'})[r.status]+(r.note?' — '+r.note:'')));}actions.append(history);}
   const reload=textNode('button','To‘lov holatini yangilash','quiet');reload.onclick=refresh;actions.append(reload);
  }catch(e){summary.textContent=e.message;const retry=textNode('button','Qayta urinish');retry.onclick=refresh;actions.append(retry);}
 }
 refresh();
}
function mountRecovery(){
 const panel=get('customerHistory'),details=document.createElement('details');details.className='recovery-box';details.append(textNode('summary','Boshqa telefonda buyurtmalarni tiklash'));
 const hint=textNode('p','Avval buyurtmada Telegram xabarlarini yoqqan bo‘lishingiz kerak. O‘sha botga /orders yuboring, kelgan bir martalik kodni kiriting. Kod 10 daqiqa amal qiladi.');const bot=textNode('a','Botni ochish','secondary');bot.hidden=true;
 const form=document.createElement('form');form.innerHTML='<label>Tiklash kodi<input name="code" required autocomplete="off" spellcheck="false" placeholder="SU-…" maxlength="35"></label><button class="primary">Buyurtmalarni tiklash</button>';
 const status=textNode('p','');status.setAttribute('role','status');const logout=textNode('button','Tiklangan hisobdan chiqish','quiet');logout.type='button';details.append(hint,bot,form,status,logout);panel.append(details);
 shopJson('/api/storefront').then(d=>{if(d.bot){bot.href='https://t.me/'+d.bot;bot.target='_blank';bot.rel='noopener noreferrer';bot.hidden=false;}}).catch(()=>{});
 form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await shopJson('/api/recovery',{method:'POST',headers:{'Content-Type':'application/json','X-Order-Key':await orderHistoryKey()},body:JSON.stringify({code:form.elements.code.value.trim()})});form.reset();status.textContent='Tiklandi. Kirish 30 kun amal qiladi.';document.dispatchEvent(new Event('history-refresh'));}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
 logout.onclick=async()=>{logout.disabled=true;try{await shopJson('/api/recovery/logout',{method:'POST',headers:{'X-Order-Key':await orderHistoryKey()}});status.textContent='Tiklangan hisobdan chiqildi. Shu brauzerda berilgan buyurtmalar saqlanadi.';document.dispatchEvent(new Event('history-refresh'));}catch(error){status.textContent=error.message;}finally{logout.disabled=false;}};
}
const seasonDesigns={spring:{title:'Bahor — mehr ulashing',text:'Gullardek nafis, sizga atalgan sovg‘alar',symbol:'✿',art:'🌸'},summer:{title:'Yoz — yorqin xotiralar',text:'Quvonchli kunlar uchun rangli sovg‘alar',symbol:'☀',art:'🍋'},autumn:{title:'Kuz — iliq tilaklar',text:'Yaqinlaringizga mehr va iliqlik',symbol:'❧',art:'🍂'},winter:{title:'Qish — sovg‘alar fasli',text:'Qorbobo kayfiyati, sizga atalgan mo‘jizalar',symbol:'❄',art:'🎅 🎁'}};
function applySeason(mode){
 const month=new Date().getMonth(),season=mode==='auto'?(month===11||month<2?'winter':month<5?'spring':month<8?'summer':'autumn'):mode;
 document.documentElement.dataset.season=season;
 let banner=get('seasonBanner');if(!banner){banner=document.createElement('section');banner.id='seasonBanner';banner.className='season-banner';get('filters').before(banner);}
 banner.replaceChildren();banner.hidden=false;if(season==='off'){const plain=textNode('div','');plain.append(textNode('strong','Siz uchun, mehr bilan'),textNode('p','Yaqinlaringizga atalgan shaxsiy sovg‘alar'));banner.append(plain);return;}
 const d=seasonDesigns[season]||seasonDesigns.winter,copy=textNode('div','');copy.append(textNode('strong',d.title),textNode('p',d.text));const art=textNode('span',d.art,'season-art');art.setAttribute('aria-hidden','true');banner.append(copy,art);
 const particles=document.createElement('div');particles.className='season-particles';particles.setAttribute('aria-hidden','true');for(let i=0;i<8;i++){const item=textNode('span',d.symbol);item.className='particle p'+i;particles.append(item);}banner.append(particles);
}
mountRecovery();shopJson('/api/storefront').then(d=>applySeason(d.season)).catch(()=>applySeason('off'));
