const adminOccasions={birthday:'Tug‘ilgan kun',mother:'Onajon uchun',love:'Sevgan insonimga',kids:'Bolajonlar uchun',holiday:'Bayram sovg‘alari'};
function adminNode(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
async function adminJson(path,body){const r=await fetch(path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||(r.status===409?'Boshqa oynada o‘zgargan. Qayta oching.':'So‘rov bajarilmadi.'));return data;}
function adminField(form,title,type,value){const label=adminNode('label',title),input=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value??'';label.append(input);form.append(label);return input;}
async function editProductDetails(product){
 const dialog=document.createElement('dialog');dialog.className='product-settings';dialog.setAttribute('aria-label','Mahsulot shartlari');const close=adminNode('button','Yopish');close.onclick=()=>dialog.close();dialog.append(close,adminNode('h2',product.name));document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 const message=adminNode('p','Yuklanmoqda…');message.setAttribute('role','status');dialog.append(message);
 try{
  const data=await adminJson('/api/gifts?product='+product.id),d=data.details,form=document.createElement('form');
  const lead=adminField(form,'Tayyorlash muddati','text',d.lead_time);lead.maxLength=100;lead.placeholder='Masalan: maket tasdiqlangach 1–2 ish kuni';
  const bundle=adminField(form,'To‘plam tarkibi (oddiy mahsulot bo‘lsa bo‘sh qoldiring)','textarea',d.bundle);bundle.maxLength=1000;bundle.placeholder='Masalan: 2 ta suratli shokolad, tabrik kartasi, sovg‘a qutisi';
  form.append(adminNode('p','To‘plamni alohida mahsulot sifatida qo‘shing va uning umumiy narxini mahsulot tahririda belgilang. Quyidagi tanlovlar mahsulotni bayram bo‘limlariga joylaydi.'));
  const checks={};for(const [key,name] of Object.entries(adminOccasions)){const label=adminNode('label',name),input=document.createElement('input');input.type='checkbox';input.checked=d.occasions.includes(key);input.className='inline-check';label.prepend(input);form.append(label);checks[key]=input;}
  const save=adminNode('button','Saqlash');save.className='primary';form.append(save);dialog.append(form);message.textContent='';
  form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await adminJson('/api/admin/product-details',{product:product.id,revision:d.revision,lead_time:lead.value.trim(),bundle:bundle.value.trim(),occasions:Object.keys(checks).filter(k=>checks[k].checked)});dialog.close();document.getElementById('status').textContent='Muddat va to‘plam saqlandi.';}catch(error){message.textContent=error.message;save.disabled=false;}};
 }catch(error){message.textContent=error.message;}
}
function addFinanceEditor(order,info){
 const details=document.createElement('details');details.append(adminNode('summary','To‘lov va xarajat hisobi'));info.append(details);let loaded=false;
 details.addEventListener('toggle',async()=>{
  if(!details.open||loaded)return;loaded=true;const status=adminNode('p','Yuklanmoqda…');status.setAttribute('role','status');details.append(status);
  try{const data=await adminJson('/api/admin/finance?id='+order.id),form=document.createElement('form');
   const agreed=adminField(form,'Mijozga taklif qilinadigan jami narx (bo‘sh — oldingi narx)','number',data.agreed_total),received=adminField(form,'Haqiqatan olingan pul (so‘m)','number',data.received),cost=adminField(form,'Shu buyurtma xarajati (so‘m)','number',data.cost),note=adminField(form,'Hisob izohi','text',data.note);note.maxLength=300;
   for(const input of [agreed,received,cost]){input.min=0;input.max=1e12;input.step=1;}received.required=cost.required=true;
   const save=adminNode('button','Hisobni saqlash');save.className='primary';form.append(save);details.append(form);status.textContent='Qiymatlar butun buyurtma uchun kiritiladi, bir dona uchun emas.';
   form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await adminJson('/api/admin/finance',{id:order.id,revision:data.revision,agreed_total:agreed.value===''?null:Number(agreed.value),received:Number(received.value),cost:Number(cost.value),note:note.value.trim()});data.revision++;status.textContent='Saqlandi. Tushum − xarajat: '+(Number(received.value)-Number(cost.value)).toLocaleString('uz-UZ')+' so‘m.';}catch(error){status.textContent=error.message;}finally{save.disabled=false;}};
  }catch(error){status.textContent=error.message;loaded=false;}
 });
}
function mountCommerceAdmin(){
 const root=document.getElementById('commerceAdmin');
 const exportBox=document.createElement('details');exportBox.append(adminNode('summary','Excel hisoboti'));const form=document.createElement('form');form.className='report-form';
 const today=new Date(Date.now()+18000000).toISOString().slice(0,10),month=new Date(Date.now()+18000000-29*86400000).toISOString().slice(0,10);
 const from=adminField(form,'Boshlanish sanasi','date',month),to=adminField(form,'Tugash sanasi','date',today);from.required=to.required=true;
 const exportButton=adminNode('button','Excel (.xlsx) yuklab olish'),exportStatus=adminNode('p','Sana O‘zbekiston vaqti bo‘yicha. Buyurtma yaratilgan sana asosida hisoblanadi.');exportStatus.setAttribute('role','status');exportButton.className='primary';form.append(exportButton,exportStatus);exportBox.append(form);root.append(exportBox);
 form.onsubmit=async e=>{e.preventDefault();exportButton.disabled=true;try{const r=await fetch('/api/admin/export?'+new URLSearchParams({from:from.value,to:to.value}));if(!r.ok)throw Error((await r.json()).error||'Hisobot yuklanmadi.');const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download='Sen-uchun-'+from.value+'_'+to.value+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);exportStatus.textContent='Hisobot yuklandi: buyurtmalar va umumiy hisob alohida varaqlarda.';}catch(error){exportStatus.textContent=error.message;}finally{exportButton.disabled=false;}};
 const telegram=document.createElement('details');telegram.append(adminNode('summary','Telegram bildirishnomalari'));const state=adminNode('p',''),refresh=adminNode('button','Holatni tekshirish'),setup=adminNode('button','Botni ulash'),retry=adminNode('button','Yuborilmagan xabarlarni qayta yuborish');state.setAttribute('role','status');telegram.append(adminNode('p','Cloudflare’dagi /admin orqali sozlang. Bot tokeni va webhook kalitini faqat Cloudflare secretsga kiriting. Mijoz botda Start bosgandan keyin xabar oladi.'),state,refresh,setup,retry);root.append(telegram);
 async function botStatus(){try{const d=await adminJson('/api/admin/telegram');state.textContent='Bot tokeni: '+(d.tokenConfigured?'bor':'yo‘q')+' · Admin chat: '+(d.adminConfigured?'bor':'yo‘q')+' · Webhook kaliti: '+(d.webhookSecretConfigured?'bor':'yo‘q')+' · Bot: '+(d.bot?'@'+d.bot:'ulanmagan')+' · Navbat: '+d.pending+' · Qayta urinish kerak: '+(d.failed||0);}catch(error){state.textContent=error.message;}}
 refresh.onclick=botStatus;setup.onclick=async()=>{setup.disabled=true;try{const d=await adminJson('/api/admin/telegram/setup',{});state.textContent='@'+d.bot+' ulandi. Cron sozlanganini ham tekshiring.';}catch(error){state.textContent=error.message;}finally{setup.disabled=false;}};
 retry.onclick=async()=>{retry.disabled=true;try{await adminJson('/api/admin/telegram/retry',{});await botStatus();}catch(error){state.textContent=error.message;}finally{retry.disabled=false;}};
 telegram.addEventListener('toggle',()=>{if(telegram.open)botStatus();});
 const reviews=document.createElement('details');reviews.append(adminNode('summary','Mijozlar sharhlarini boshqarish'));
 const filter=document.createElement('select');filter.setAttribute('aria-label','Sharh holati');for(const [k,label] of [['pending','Tasdiq kutilmoqda'],['published','E’lon qilingan'],['hidden','Yashirilgan']])filter.add(new Option(label,k));
 const reload=adminNode('button','Yangilash'),list=adminNode('div',''),more=adminNode('button','Yana ko‘rish'),message=adminNode('p','');message.setAttribute('role','status');more.hidden=true;reviews.append(filter,reload,message,list,more);root.append(reviews);
 let cursor=null,generation=0;
 async function loadReviews(append=false){const version=++generation;if(!append){cursor=null;list.replaceChildren();}more.hidden=true;message.textContent='Yuklanmoqda…';try{const d=await adminJson('/api/admin/reviews?status='+filter.value+(cursor?'&before='+cursor:''));if(version!==generation)return;
  for(const row of d.reviews){const card=adminNode('section','');card.className='review-card';card.append(adminNode('strong',row.name+' · '+row.rating+'/5'),adminNode('p',row.text),adminNode('small',row.product));
   if(row.photo_key){const img=new Image();img.src='/api/admin/review?id='+row.id;img.alt='Sharhga alohida yuklangan surat';img.loading='lazy';img.width=240;card.append(img);}
   for(const [target,label] of [['published','E’lon qilish'],['hidden','Yashirish']])if(row.status!==target){const b=adminNode('button',label);b.onclick=async()=>{b.disabled=true;try{await adminJson('/api/admin/review',{id:row.id,previous:row.status,status:target});await loadReviews();}catch(error){message.textContent=error.message;b.disabled=false;}};card.append(b);}list.append(card);cursor=row.cursor;
  }more.hidden=!d.more;message.textContent=list.childElementCount?'Faqat mijoz roziligi bilan yuborilgan sharhlar ko‘rsatiladi.':'Bu bo‘limda sharh yo‘q.';
 }catch(error){if(version===generation)message.textContent=error.message;}}
 filter.onchange=reload.onclick=()=>loadReviews();more.onclick=()=>loadReviews(true);reviews.addEventListener('toggle',()=>{if(reviews.open)loadReviews();});
}
mountCommerceAdmin();
