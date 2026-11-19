function mountExperienceAdmin(){
 const root=document.getElementById('commerceAdmin');
 const seasonBox=document.createElement('details');seasonBox.append(adminNode('summary','Fasliy dizayn'));const seasonForm=document.createElement('form'),select=document.createElement('select');select.setAttribute('aria-label','Do‘kon fasli');
 for(const [value,label] of [['auto','Avtomatik — oyga qarab'],['spring','Bahor — gullar'],['summer','Yoz — quyosh'],['autumn','Kuz — barglar'],['winter','Qish — qor va sovg‘alar'],['off','Fasliy bezaksiz']])select.add(new Option(label,value));
 const save=adminNode('button','Dizaynni saqlash'),message=adminNode('p','');save.className='primary';seasonForm.append(select,save,message);seasonBox.append(seasonForm);root.prepend(seasonBox);let revision=0;
 async function loadSeason(){try{const d=await adminJson('/api/storefront');select.value=d.season;revision=d.revision;save.disabled=false;}catch(e){message.textContent=e.message;save.disabled=true;}}
 save.disabled=true;loadSeason();seasonForm.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await adminJson('/api/admin/storefront',{season:select.value,revision});message.textContent='Saqlandi. Do‘kon sahifasini yangilang.';await loadSeason();}catch(error){message.textContent=error.message;save.disabled=false;}};
 const box=document.createElement('details');box.append(adminNode('summary','To‘lov cheklariga tasdiq berish'));root.prepend(box);
 const filter=document.createElement('select');filter.setAttribute('aria-label','Chek holati');for(const [value,label] of [['pending','Tekshirilmoqda'],['approved','Tasdiqlangan'],['rejected','Rad etilgan']])filter.add(new Option(label,value));
 const reload=adminNode('button','Yangilash'),message2=adminNode('p',''),list=adminNode('div',''),more=adminNode('button','Yana ko‘rish');message2.setAttribute('role','status');more.hidden=true;box.append(filter,reload,message2,list,more);let cursor=null,generation=0;
 async function load(append=false){const version=++generation;more.hidden=true;if(!append){list.replaceChildren();cursor=null;}message2.textContent='Yuklanmoqda…';try{
  const d=await adminJson('/api/admin/receipts?status='+filter.value+(cursor?'&before='+cursor:''));if(version!==generation)return;
  for(const r of d.receipts){const card=adminNode('section','');card.className='receipt-admin';card.append(adminNode('h3',r.product+' · № '+r.order_id.slice(0,8)),adminNode('strong',money(r.amount)),adminNode('p',new Date(r.created).toLocaleString('uz-UZ')));
   const link=adminNode('a','Chekni kattalashtirish ↗');link.href='/api/admin/receipt?id='+r.id;link.target='_blank';link.rel='noopener';const img=new Image();img.src=link.href;img.alt='To‘lov cheki';img.loading='lazy';img.width=180;card.append(img,link);
   if(r.status==='pending'){
    const form=document.createElement('form');form.onsubmit=e=>e.preventDefault();const note=adminField(form,'Izoh (rad etilsa sababini yozing)','text','');note.maxLength=300;
    const approve=adminNode('button','Pul tushgan — tasdiqlash'),reject=adminNode('button','Rad etish'),info=adminNode('p','Chekdagi o‘tkazmani bank hisobingizdan tekshiring. Tasdiqlash ushbu summani olingan pulga qo‘shadi; oldin qo‘lda kiritilgan pulni qayta tasdiqlamang.');approve.type=reject.type='button';approve.className='primary';form.append(info,approve,reject);card.append(form);
    async function decide(status){approve.disabled=reject.disabled=true;try{if(status==='rejected'&&!note.value.trim())throw Error('Rad etish sababini yozing.');const finance=await adminJson('/api/admin/finance?id='+r.order_id);await adminJson('/api/admin/receipt',{id:r.id,status,note:note.value.trim(),revision:finance.revision});await load();document.dispatchEvent(new Event('order-stage-saved'));}catch(e){info.textContent=e.message;approve.disabled=reject.disabled=false;}}
    approve.onclick=()=>decide('approved');reject.onclick=()=>decide('rejected');
   }else card.append(adminNode('p',r.note));list.append(card);cursor=r.cursor;
  }message2.textContent=list.childElementCount?'':'Bu bo‘limda chek yo‘q.';more.hidden=!d.more;
 }catch(e){if(version===generation)message2.textContent=e.message;}}
 reload.onclick=filter.onchange=()=>load();more.onclick=()=>load(true);box.addEventListener('toggle',()=>{if(box.open)load();});
}
mountExperienceAdmin();
