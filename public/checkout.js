/* Checkout keeps the existing upload, template and server-side total validation. */
let checkoutStep=0;
const checkoutForm=get('form');checkoutForm.noValidate=true;
const checkoutSteps=['Sovg‘a','Yetkazish','Tasdiqlash'];
const checkoutProgress=document.createElement('ol');checkoutProgress.className='checkout-progress';checkoutProgress.setAttribute('aria-label','Buyurtma bosqichlari');
checkoutSteps.forEach(label=>checkoutProgress.append(textNode('li',label)));
get('title').after(checkoutProgress);
const checkoutPanels=checkoutSteps.map((label,i)=>{const section=document.createElement('section');section.className='checkout-step';section.dataset.step=i;section.setAttribute('aria-label',label);checkoutForm.insertBefore(section,get('orderError'));return section;});
const moveField=(id,to)=>to.append(get(id).closest('label')||get(id));
const setupPanel=checkoutPanels[0],deliveryPanel=checkoutPanels[1],reviewPanel=checkoutPanels[2];
for(const id of ['file','note','qty'])moveField(id,setupPanel);
setupPanel.append(get('preview'),get('giftOptions'));
const contactLabel=get('contact').closest('label');contactLabel.firstChild.textContent='Telefon raqamingiz';get('contact').type='tel';get('contact').required=true;get('contact').maxLength=24;get('contact').autocomplete='tel';get('contact').placeholder='+998 90 123 45 67';get('contact').pattern='[+0-9 ()-]{7,24}';
const nameLabel=document.createElement('label');nameLabel.textContent='Ismingiz';const nameInput=document.createElement('input');nameInput.id='customerName';nameInput.required=true;nameInput.maxLength=60;nameInput.autocomplete='name';nameInput.placeholder='Sizning ismingiz';nameLabel.append(nameInput);deliveryPanel.append(nameLabel,contactLabel);
for(const id of ['method','address','needed'])moveField(id,deliveryPanel);
get('needed').placeholder='Ixtiyoriy: qulay sana va vaqt';
const terms=document.createElement('details');terms.append(textNode('summary','Yetkazish shartlari'),get('checkoutTerms'));deliveryPanel.append(terms);
const adjust=document.createElement('details');adjust.className='crop-settings';adjust.append(textNode('summary','Rasmni moslash'));get('cropZoom').closest('label').before(adjust);for(const id of ['cropZoom','cropX','cropY'])moveField(id,adjust);
const extras=document.createElement('details');extras.append(textNode('summary','Qo‘shimcha sovg‘alar'),get('giftExtras'));get('giftOptions').append(extras);
reviewPanel.append(textNode('h3','Buyurtmangizni tekshiring'));const reviewContent=textNode('div','','checkout-review');reviewPanel.append(reviewContent);
const checkoutBar=document.createElement('div');checkoutBar.className='checkout-bar';const back=textNode('button','← Orqaga','secondary');back.type='button';back.onclick=()=>setCheckoutStep(Math.max(0,checkoutStep-1));checkoutBar.append(get('giftTotal'),back,get('submitOrder'));checkoutForm.append(checkoutBar);
// Keep only the step-specific instructions; the upload hint is next to its input.
for(const p of [...checkoutForm.children])if(p.tagName==='P'&&!p.id)p.remove();
const uploadHint=textNode('small','JPG, PNG yoki WebP, 10 MB gacha. Surat buyurtma bilan sotuvchiga yuboriladi.');get('file').closest('label').after(uploadHint);
get('ready').append(get('ready').querySelector('.receipt-more'));get('ready').querySelector('.receipt-more').append(get('sharePhoto'));
function checkoutSubmitLabel(){return checkoutStep<2?'Davom etish →':services.find(p=>p.id===selectedId)?.price==null?'Narx so‘rovini yuborish':'Buyurtmani tasdiqlash';}
function setCheckoutStep(step){
 checkoutStep=step;checkoutPanels.forEach((p,i)=>p.hidden=i!==step);[...checkoutProgress.children].forEach((p,i)=>{p.classList.toggle('current',i===step);if(i===step)p.setAttribute('aria-current','step');else p.removeAttribute('aria-current');});back.hidden=step===0;get('submitOrder').textContent=checkoutSubmitLabel();get('orderError').textContent='';if(step===2)renderCheckoutReview();dialog.scrollTop=0;
 checkoutPanels[step].setAttribute('tabindex','-1');checkoutPanels[step].focus({preventScroll:true});
}
function resetCheckout(){get('approved').required=false;adjust.open=false;extras.open=false;setCheckoutStep(0);get('giftTotal').textContent='Sozlamalar yuklanmoqda…';}
function validateCheckoutStep(step){
 if(!checkoutSettings){get('orderError').textContent='Buyurtma sozlamalari yuklanishini kuting yoki oynani qayta oching.';return false;}
 for(const field of checkoutPanels[step].querySelectorAll('input,textarea,select')){
  if(!field.disabled&&!field.checkValidity()){setCheckoutStep(step);const details=field.closest('details');if(details)details.open=true;field.reportValidity();return false;}
 }
 if(step===0){const file=get('file').files[0];if(file&&file.size>10485760){get('orderError').textContent='10 MB gacha rasm tanlang.';return false;}try{checkoutGift();}catch(e){get('orderError').textContent=e.message;return false;}}
 if(step===1&&!nameInput.value.trim()){get('orderError').textContent='Ismingizni kiriting.';nameInput.focus();return false;}
 return true;
}
function advanceCheckout(){
 if(checkoutStep<2){if(validateCheckoutStep(checkoutStep))setCheckoutStep(checkoutStep+1);return false;}
 for(let step=0;step<2;step++)if(!validateCheckoutStep(step))return false;
 return true;
}
function renderCheckoutReview(){
 const product=services.find(p=>p.id===selectedId),g=giftSelection();reviewContent.replaceChildren();
 const photo=new Image();photo.src=product.image;photo.alt=product.name;photo.width=96;photo.height=96;reviewContent.append(photo,textNode('h3',product.name));
 const rows=[['Soni',get('qty').value+' dona'],['Ism / tabrik',get('note').value.trim()||'—'],['Mijoz',nameInput.value.trim()],['Telefon',get('contact').value.trim()],['Qabul qilish',get('method').selectedOptions[0]?.textContent],['Manzil',g.method==='pickup'?checkoutSettings.pickup:g.address],['Vaqt',g.time],['Mahsulot',product.price==null?'Narxi kelishiladi':money(product.price*Number(get('qty').value))],['Qo‘shimchalar va yetkazish',money(g.additional)],['Jami',g.total==null?'Sotuvchi narx taklif qiladi':money(g.total)]];
 const dl=document.createElement('dl');for(const [label,value] of rows)if(value)dl.append(textNode('dt',label),textNode('dd',value));reviewContent.append(dl);
 if(g.total==null)reviewContent.append(textNode('p','Avval sotuvchi narxni belgilaydi. Siz narxni tasdiqlagach, to‘lov qilishingiz mumkin.'));
}
