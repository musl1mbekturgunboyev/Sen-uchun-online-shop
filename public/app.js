let services=[];
let selectedId, orderId;
const paths={
 gift:'M3 8h18v4H3z M5 12v9h14v-9 M12 8v13 M12 8C4 8 5 2 8 3c2 0 4 5 4 5zm0 0s2-5 4-5c3-1 4 5-4 5z',
 grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 heart:'M20.7 4.9a5.2 5.2 0 0 0-7.4 0L12 6.2l-1.3-1.3a5.2 5.2 0 0 0-7.4 7.4L12 21l8.7-8.7a5.2 5.2 0 0 0 0-7.4z',
 telegram:'M2 10l20-7-4 18-6-5-3 3v-5l9-8-11 7z',bag:'M2 3h3l3 12h11l3-9H6 M10 20a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3 M18 20a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3',search:'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
 right:'M4 12h16m-7-7 7 7-7 7',home:'M2 11l10-9 10 9 M5 10v11h5v-7h4v7h5V10',
 book:'M3 4q5-2 9 1 4-3 9-1v15q-5-2-9 1-4-3-9-1z M12 5v15',photo:'M3 3h18v18H3z M4 18l6-7 4 4 3-3 4 4 M15 7h1',
 check:'M4 12l5 5L20 6',plus:'M12 5v14M5 12h14'
};
const icon=k=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[k]+'"/></svg>';
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const get=id=>document.getElementById(id);
const dialog=get('order');
let service,previewURL,message,mode='home',group='',timer;
function read(key){try{return new Set(JSON.parse(localStorage.getItem('sen-'+key)||'[]'));}catch{return new Set();}}
const fav=read('fav'),bag=read('bag');
function toggle(set,key,id){if(set.has(id))set.delete(id);else set.add(id);try{localStorage.setItem('sen-'+key,JSON.stringify([...set]));}catch{}}
function showOrder(id){
 orderId=crypto.randomUUID();get('orderError').textContent='';selectedId=id;const item=services.find(p=>p.id===id);if(!item)return;service=item.name+(item.price===null?'':' ('+item.price.toLocaleString()+' so‘m)');track('open',id); get('form').reset();clearPreview();get('title').textContent=service;
 get('ready').hidden=true;get('form').hidden=false;dialog.showModal();setupGift(item);
}
function notify(msg){get('toast').textContent=msg;get('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>get('toast').classList.remove('show'),1400);}
function select(view,category=''){closeCatalog();mode=view;group=category;get('search').value='';render();if(view==='home')window.scrollTo({top:0});else get('katalog').scrollIntoView({block:'start'});}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>b.dataset.view==='all'?toggleCatalog():select(b.dataset.view));
function categories(){get('filters').replaceChildren();for(const item of [{group:'Barchasi',icon:'grid'},...Array.from(new Set(services.map(p=>p.group)),group=>({group,icon:'gift'}))]){
 const b=document.createElement('button');b.innerHTML=icon(item.icon);b.append(item.group);b.dataset.group=item.group==='Barchasi'?'':item.group;b.onclick=()=>select('all',b.dataset.group);get('filters').append(b);
}
}
function render(){
 const q=get('search').value.trim().toLocaleLowerCase();
 document.querySelector('.hero').hidden=!services.length||!!q||!!group||['fav','bag'].includes(mode);
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',mode===b.dataset.view));
 document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(!['fav','bag'].includes(mode)&&b.dataset.group===group)));
 document.querySelector('.count').textContent=bag.size;
 get('listTitle').textContent=mode==='fav'?'Saralangan':mode==='bag'?'Savat':q?'Qidiruv natijalari':group||'Sovg‘alar katalogi';
 get('cards').replaceChildren();get('cards').setAttribute('aria-busy','false');
 services.forEach(s=>{const id=s.id;
 if((mode==='fav'&&!fav.has(id))||(mode==='bag'&&!bag.has(id))||(group&&s.group!==group)||!(s.name+' '+s.desc+' '+s.group).toLowerCase().includes(q))return;
 const card=document.createElement('article');
 card.innerHTML='<button class="product"><img></button><button class="love">'+icon('heart')+'</button><h3><button></button></h3><p></p><div class="base"><strong></strong><button class="add">'+icon(bag.has(id)?'check':'bag')+'</button></div>';
 const photo=card.querySelector('img');photo.width=480;photo.height=480;photo.loading='lazy';photo.decoding='async';responsivePhoto(photo,s.image,'(max-width:620px) 46vw, (max-width:930px) 30vw, 290px');card.querySelector('img').alt=s.name;
 card.querySelector('h3 button').textContent=s.name;card.querySelector('p').textContent=s.desc;card.querySelector('strong').textContent=s.price===null?'Narx kelishiladi':s.price.toLocaleString()+' so‘m';
 for(const [selector,label,pressed] of [['.product','Batafsil',null],['.love','Saralangan',fav.has(id)],['.add','Savat',bag.has(id)]]){
 const btn=card.querySelector(selector);btn.setAttribute('aria-label',s.name+' · '+label);if(pressed!==null)btn.setAttribute('aria-pressed',String(pressed));}
 card.querySelector('.product').onclick=card.querySelector('h3 button').onclick=card.querySelector('p').onclick=card.querySelector('strong').onclick=()=>openProduct(s);
 card.querySelector('.love').onclick=()=>{toggle(fav,'fav',id);render();notify(fav.has(id)?'Saralanganlarga qo‘shildi':'Saralanganlardan olindi');};
 card.querySelector('.add').onclick=()=>{toggle(bag,'bag',id);render();notify(bag.has(id)?'Savatga qo‘shildi':'Savatdan olindi');};
 if(mode==='bag'){const b=document.createElement('button');b.className='primary';b.textContent='Buyurtma berish';b.onclick=()=>showOrder(id);card.append(b);}
 get('cards').append(card);
 });
 const n=get('cards').children.length;get('total').textContent=n+' ta xizmat';get('empty').hidden=!!n;
 get('empty').textContent=mode==='bag'?'Savat bo‘sh. Mahsulot yonidagi savat tugmasini bosing.':mode==='fav'?'Hali sovg‘a tanlamagansiz. Saqlash uchun yurakchani bosing.':'Mos xizmat topilmadi. Boshqa so‘z bilan qidiring.';
}
get('search').oninput=()=>{closeCatalog();mode='all';group='';render();};
function track(kind,id){fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,id}),keepalive:true}).catch(()=>{});}
get('send').addEventListener('click',()=>track('telegram',selectedId));
get('heroOrder').onclick=()=>select('all');
async function init(){
 const r=await fetch('/api/catalog');if(!r.ok)throw Error();
 const data=await r.json();services=data.products.map(p=>({...p,group:p.category,desc:p.description}));
 fetch('/api/session').then(r=>r.json()).then(session=>{if(session.owner){const a=document.createElement('a');a.href='/admin';a.textContent='Boshqaruv';document.querySelector('footer').append(a);}}).catch(()=>{});
 const valid=new Set(services.map(p=>p.id));for(const list of [fav,bag])for(const id of list)if(!valid.has(id))list.delete(id);
 categories();render();setupBanner();track('view',-1);
}
window.addEventListener('DOMContentLoaded',()=>init().catch(()=>{get('cards').replaceChildren();get('cards').setAttribute('aria-busy','false');get('empty').hidden=false;get('empty').textContent='Katalogni yuklab bo‘lmadi. Sahifani yangilang.';}));
function clearPreview() {
  if (previewURL) URL.revokeObjectURL(previewURL);
  get('preview').hidden = true;
  get('preview').removeAttribute('src');
}
get('file').onchange = () => {
  get('approved').checked=false;
  clearPreview();
  const file = get('file').files[0];
  if (file) {
    previewURL = URL.createObjectURL(file);
    get('preview').src = previewURL;
    get('preview').hidden = false;
  }
};
dialog.querySelector('.close').onclick = () => dialog.close();
dialog.onclose = clearPreview;
get('form').onsubmit=async e=>{
 e.preventDefault();
 const file=get('file').files[0],note=get('note').value.trim(),qty=get('qty').value;
 if(file&&file.size>10485760){get('orderError').textContent='10 MB gacha rasm tanlang.';return;}
 const form=new FormData();for(const [key,value] of Object.entries({id:orderId,product:selectedId,qty,note,contact:get('contact').value.trim()}))form.set(key,String(value));
 if(file)form.set('photo',file,file.name);
 const button=get('submitOrder');if(button.disabled)return;button.disabled=true;button.textContent='Yuborilmoqda…';get('orderError').textContent='';
 const pendingId=orderId;
 try{
  form.set('gift',checkoutGift());
  const r=await fetch('/api/orders',{method:'POST',headers:{'X-Order-Key':await orderHistoryKey()},body:form});const saved=await r.json();if(!r.ok)throw Error(saved.error||'Buyurtma yuborilmadi.');
  if(pendingId!==orderId)return;
  const link=new URL('/api/admin/orders/'+saved.id+'/photo',location.origin).href;
  message=['Assalomu alaykum! Sen uchun buyurtmam #'+saved.id.slice(0,8),service+' — '+qty+' dona.',note&&'Matn: '+note,file&&'Asl surat: '+link].filter(Boolean).join('\n');
  get('details').textContent=service+' — '+qty+' dona. Buyurtma № '+saved.id.slice(0,8);
  get('details').textContent+=' Keyin «Buyurtmalarim» bo‘limida ko‘rishingiz mumkin.';
  get('trackReceipt').hidden=!saved.tracking;if(saved.tracking)get('trackReceipt').href=trackingLink(saved.tracking);
  get('send').href='https://t.me/Life_Uz1?text='+encodeURIComponent(message);
  get('hint').textContent=file?'Asl surat sotuvchining admin paneliga yetkazildi.':'Sotuvchi buyurtmani admin panelda ko‘radi.';
  const share=get('sharePhoto');share.hidden=!(file&&navigator.canShare?.({files:[file]}));
  share.onclick=async()=>{try{await navigator.share({files:[file],text:service+' — '+qty+' dona. '+note});}catch(err){if(err.name!=='AbortError')get('hint').textContent='Ulashish ochilmadi. Surat admin panelda saqlangan.';}};
  get('copy').textContent='Buyurtma matnini nusxalash';get('ready').hidden=false;get('form').hidden=true;
 }catch(err){if(pendingId===orderId)get('orderError').textContent=err.message||'Qayta urinib ko‘ring.';}
 finally{button.disabled=false;button.textContent='Buyurtmani yuborish →';}
};
get('copy').onclick = async () => {
  try {await navigator.clipboard.writeText(message);get('copy').textContent='Nusxalandi ✓';}
  catch {const range=document.createRange();range.selectNodeContents(get('details'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);get('copy').textContent='Matnni nusxalang';}
};
