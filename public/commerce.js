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
 try{const r=await fetch('/api/gifts');if(r.ok)showDeliveryInfo(get('deliveryInfo'),await r.json());}catch{}
}
let productExtrasVersion=0;
async function loadProductExtras(product){
 const version=++productExtrasVersion,container=get('productExtras');container.replaceChildren();
 const terms=textNode('div','','terms');container.append(terms);
 fetch('/api/gifts?product='+product.id).then(r=>{if(!r.ok)throw Error();return r.json();}).then(settings=>{if(version===productExtrasVersion)showDeliveryInfo(terms,settings);}).catch(()=>{if(version===productExtrasVersion)terms.textContent='Yetkazish shartlari yuklanmadi.';});
 const section=textNode('section','','product-reviews'),heading=textNode('h3','Mijozlar fikrlari'),summary=textNode('p',''),list=textNode('div','','review-grid'),status=textNode('p','Yuklanmoqda…'),more=textNode('button','Yana fikrlarni ko‘rish','secondary');
 more.type='button';more.hidden=true;status.setAttribute('role','status');section.append(heading,summary,list,status,more);container.append(section);
 let cursor='',busy=false;
 async function loadReviews(){
  if(busy)return;busy=true;more.disabled=true;status.textContent='Yuklanmoqda…';
  try{const r=await fetch('/api/reviews?product='+product.id+(cursor?'&before='+cursor:''));if(!r.ok)throw Error();const data=await r.json();if(version!==productExtrasVersion)return;
   summary.textContent=data.count?Number(data.average).toFixed(1)+' / 5 · '+data.count+' ta fikr':'Bu mahsulotga hali fikr yozilmagan.';
   list.append(...data.reviews.map(reviewCard));cursor=data.reviews.at(-1)?.cursor||cursor;more.hidden=!data.more;more.textContent='Yana fikrlarni ko‘rish';status.textContent='';
  }catch{if(version!==productExtrasVersion)return;status.textContent='Fikrlar yuklanmadi. Qayta urinib ko‘ring.';more.hidden=false;more.textContent='Qayta urinish';}
  finally{busy=false;more.disabled=false;}
 }
 more.onclick=loadReviews;loadReviews();
}
function notificationButtons(container,token){
 paymentPanel(container,token);
 const more=document.createElement('details');more.className='receipt-more';more.append(textNode('summary','Telegram bildirishnomalari'));container.append(more);container=more;
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
