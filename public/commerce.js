const occasionNames={birthday:'Tug‘ilgan kun',mother:'Onajon uchun',love:'Sevgan insonimga',kids:'Bolajonlar uchun',holiday:'Bayram sovg‘alari'};
function textNode(tag,text,className){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function renderOccasions(){
 const nav=document.getElementById('occasions');nav.replaceChildren();
 const available=Object.keys(occasionNames).filter(k=>services.some(p=>p.occasions.includes(k)));nav.hidden=!available.length;
 for(const key of ['',...available]){const button=textNode('button',key?occasionNames[key]:'Barcha sovg‘alar');button.type='button';button.dataset.occasion=key;button.setAttribute('aria-pressed',String(occasion===key));button.onclick=()=>{closeCatalog();occasion=key;group='';mode='all';get('search').value='';render();get('listTitle').textContent=key?occasionNames[key]:'Sovg‘alar katalogi';};nav.append(button);}
}
function showDeliveryInfo(container,settings){
 container.replaceChildren();
 const entries=[['Tayyorlash muddati',settings.details?.lead_time],['To‘plam tarkibi',settings.details?.bundle],['Olib ketish',settings.pickup],['Yetkazish hududlari',settings.deliveryAreas],['Yetkazish muddati',settings.deliveryTime],['Yetkazish narxi',settings.delivery!==null?money(settings.delivery):''],['Shartlar',settings.deliveryTerms]];
 for(const [label,value] of entries)if(value){const row=textNode('p','');row.append(textNode('strong',label+': '),document.createTextNode(value));container.append(row);}
 container.hidden=!container.childElementCount;
}
function reviewCard(review){
 const card=textNode('article','', 'review-card');
 const rating=textNode('span','★'.repeat(review.rating)+'☆'.repeat(5-review.rating),'review-stars');rating.setAttribute('aria-label',review.rating+' / 5');
 card.append(rating,textNode('strong',review.name),textNode('p',review.text),textNode('small',review.product+' · Tasdiqlangan buyurtma'));
 if(review.photo){const img=new Image();img.src=review.photo;img.width=400;img.height=300;img.loading='lazy';img.alt='Mijoz e’lon qilishga ruxsat bergan sovg‘a rasmi';card.append(img);}
 return card;
}
async function loadStoreExtras(){
 const results=await Promise.allSettled([fetch('/api/gifts').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('/api/reviews').then(r=>{if(!r.ok)throw Error();return r.json();})]);
 if(results[0].status==='fulfilled')showDeliveryInfo(get('deliveryInfo'),results[0].value);
 if(results[1].status==='fulfilled'){const data=results[1].value;get('reviewCards').replaceChildren(...data.reviews.slice(0,6).map(reviewCard));get('storeReviews').hidden=!data.reviews.length;}
}
let productExtrasVersion=0;
async function loadProductExtras(product){
 const version=++productExtrasVersion,container=get('productExtras');container.replaceChildren(textNode('p','Shartlar yuklanmoqda…'));
 try{
  const [settings,reviews]=await Promise.all([fetch('/api/gifts?product='+product.id).then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('/api/reviews?product='+product.id).then(r=>{if(!r.ok)throw Error();return r.json();})]);
  if(version!==productExtrasVersion)return;container.replaceChildren();
  const terms=textNode('div','', 'terms');showDeliveryInfo(terms,settings);container.append(terms);
  if(reviews.count){const details=document.createElement('details');details.append(textNode('summary','Mijozlar fikrlari · '+Number(reviews.average).toFixed(1)+' / 5 ('+reviews.count+')'));const list=textNode('div','', 'review-grid');list.append(...reviews.reviews.map(reviewCard));details.append(list);container.append(details);}
 }catch{if(version===productExtrasVersion)container.replaceChildren(textNode('p','Shartlarni yuklab bo‘lmadi. Ulanishni tekshirib mahsulotni qayta oching.'));}
}
function notificationButtons(container,token){
 paymentPanel(container,token);
 const button=textNode('button','Telegramda holatni ko‘rish','telegram-action'),status=textNode('p','');button.type='button';status.setAttribute('role','status');container.append(button,status);
 button.onclick=async()=>{
  button.disabled=true;
  try{const r=await fetch('/api/telegram/link',{method:'POST',headers:{'X-Tracking-Key':token}}),data=await r.json();if(!r.ok)throw Error(data.error||'Ulanmadi. Qayta urinib ko‘ring.');
   status.replaceChildren();{const link=textNode('a','Telegramni ochish → Start','primary');link.href=data.url;link.target='_blank';link.rel='noopener noreferrer';status.append(link,textNode('small',' Holatni ko‘rish uchun botda Start bosing.'));location.assign(data.url);}
  }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
 };
 const stop=textNode('button','Telegram xabarlarini o‘chirish','quiet');stop.type='button';const settings=document.createElement('details');settings.className='notification-settings';settings.append(textNode('summary','Bildirishnoma sozlamalari'),stop);container.append(settings);
 stop.onclick=async()=>{stop.disabled=true;try{const r=await fetch('/api/telegram/unlink',{method:'POST',headers:{'X-Tracking-Key':token}});if(!r.ok)throw Error();status.textContent='Telegram bildirishnomalari o‘chirildi.';}catch{status.textContent='O‘chirilmadi. Qayta urinib ko‘ring.';}finally{stop.disabled=false;}};
}
function showReceiptActions(token){const box=get('receiptActions');box.replaceChildren();if(token){notificationButtons(box,token);const track=textNode('a','Buyurtma holatini ko‘rish','secondary');track.href=trackingLink(token);track.onclick=()=>get('order').close();box.prepend(track);}}
async function reviewPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760)throw Error('10 MB gacha JPG, PNG yoki WebP tanlang.');
 const bitmap=await createImageBitmap(file);try{for(const edge of [1200,900,600]){const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/webp',.8);if(data.length<500000)return data;}throw Error('Rasm hajmini kichraytiring.');}finally{bitmap.close();}
}
function showTrackingActions(token,order){
 const box=get('trackingActions');box.replaceChildren();notificationButtons(box,token);
 if(order.stage!=='Topshirildi')return;
 const details=document.createElement('details');details.append(textNode('summary','Sovg‘angiz haqida fikr qoldiring'));
 const form=document.createElement('form');form.className='review-form';
 form.innerHTML='<label>Ko‘rinadigan ismingiz<input name="name" maxlength="60" required placeholder="Sizning ismingiz"></label><label>Baho<select name="rating"><option value="5">5 — A’lo</option><option value="4">4 — Yaxshi</option><option value="3">3 — O‘rtacha</option><option value="2">2 — Qoniqarsiz</option><option value="1">1 — Yomon</option></select></label><label>Fikringiz<textarea name="text" minlength="3" maxlength="1000" required></textarea></label><label>Tayyor sovg‘a rasmi (ixtiyoriy)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><label class="consent"><input name="consent" type="checkbox" required> Ismim, sharhim va tanlagan rasmim saytda ochiq e’lon qilinishiga roziman. Rasmdagi odamlardan ham ruxsat olganman.</label><button class="primary">Sharhni yuborish</button><p role="status"></p>';
 form.onsubmit=async e=>{e.preventDefault();const f=form.elements,button=form.querySelector('button'),message=form.querySelector('[role=status]');button.disabled=true;message.textContent='Yuborilmoqda…';
  try{const photo=f.photo.files[0]?await reviewPhoto(f.photo.files[0]):null;
   const r=await fetch('/api/reviews/submit',{method:'POST',headers:{'Content-Type':'application/json','X-Tracking-Key':token},body:JSON.stringify({name:f.name.value.trim(),rating:Number(f.rating.value),text:f.text.value.trim(),photo,consent:f.consent.checked})});const data=await r.json();if(!r.ok)throw Error(data.error||'Sharh yuborilmadi.');
   form.replaceChildren(textNode('p','Rahmat! Sharhingiz tekshirilgandan keyin e’lon qilinadi.'));
  }catch(error){message.textContent=error.message;button.disabled=false;}
 };
 details.append(form);box.append(details);
}
