const banner=document.querySelector('.hero');
let promotion=0, rotation, activeProduct, photoIndex=0;
function priceText(p){return p.price===null?'Narx kelishiladi':p.price.toLocaleString()+' so‘m';}
function showPromotion(i){
 const product=services[i];if(!product)return;
 promotion=i;const photo=get('heroPhoto');responsivePhoto(photo,product.id===0&&product.image==='/media/chocolate.webp'?'/media/hero.webp':product.image,'(max-width:620px) 50vw, 730px');
 get('heroName').textContent=product.name;get('heroDesc').textContent=product.desc;
 get('heroOrder').onclick=()=>openProduct(product);
 for(const el of [photo,banner.querySelector('.copy')])if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el.animate([{opacity:.3,transform:'translateX(9px)'},{opacity:1,transform:'translateX(0)'}],{duration:480});
 [...get('dots').children].forEach((b,index)=>b.setAttribute('aria-pressed',String(index===i)));
}
function startRotation(){
 clearInterval(rotation);
 if(services.length>1)rotation=setInterval(()=>{if(!banner.hidden&&!document.hidden&&!document.querySelector('dialog[open]')&&get('mega').hidden&&!banner.contains(document.activeElement))showPromotion((promotion+1)%services.length);},5000);
}
function setupBanner(){
 get('dots').replaceChildren();
 services.forEach((s,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',s.name+' reklamasini ko‘rish');b.onclick=()=>{showPromotion(i);startRotation()};get('dots').append(b);});
 showPromotion(0);startRotation();
}
function closeCatalog(){get('mega').hidden=true;document.querySelectorAll('[data-view="all"]').forEach(b=>b.setAttribute('aria-expanded','false'));}
function toggleCatalog(){
 if(!get('mega').hidden){closeCatalog();return;}
 const groups=[...new Set(services.map(s=>s.group))];get('departments').replaceChildren();
 function department(name){
  get('deptTitle').textContent=name||'Barcha mahsulotlar';get('deptItems').replaceChildren();
  [...get('departments').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.name===name)));
  for(const s of services.filter(p=>!name||p.group===name)){
   const item=document.createElement('button'),img=new Image();img.src=s.image;img.alt='';
   const info=document.createElement('span'),price=document.createElement('small');price.textContent=priceText(s);
   info.append(s.name,price);item.append(img,info);item.onclick=()=>{closeCatalog();openProduct(s)};get('deptItems').append(item);
  }
 }
 for(const name of ['',...groups]){
  const b=document.createElement('button');b.dataset.name=name;
  const example=services.find(s=>s.group===name);
  if(example){const img=new Image();img.src=example.image;img.alt='';b.append(img);}else b.innerHTML=icon('grid');
  b.append(name||'Barchasi');b.onclick=b.onfocus=()=>department(name);b.onpointerenter=e=>{if(e.pointerType==='mouse')department(name)};get('departments').append(b);
 }
 department('');get('mega').hidden=false;document.querySelectorAll('[data-view="all"]').forEach(b=>b.setAttribute('aria-expanded','true'));get('mega').scrollIntoView({block:'start'});
}
get('menuClose').onclick=closeCatalog;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!get('mega').hidden)closeCatalog();});
document.addEventListener('click',e=>{if(!get('mega').hidden&&!e.target.closest('#mega,[data-view="all"]'))closeCatalog();});
function showPhoto(index){
 const photos=activeProduct.images;
 photoIndex=(index+photos.length)%photos.length;
 for(const id of ['dPhoto','zoomPhoto']){get(id).src=photos[photoIndex];get(id).alt=activeProduct.name+', '+(photoIndex+1)+'-rasm';}
 get('zCount').textContent=(photoIndex+1)+' / '+photos.length;
 [...get('thumbs').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===photoIndex)));
 for(const id of ['prev','next','zPrev','zNext'])get(id).hidden=photos.length<2;
}
function openProduct(p){
 activeProduct=p;get('dName').textContent=p.name;get('dText').textContent=p.desc;get('dPrice').textContent=priceText(p);get('thumbs').replaceChildren();
 if(p.images.length>1)p.images.forEach((src,i)=>{const b=document.createElement('button'),img=new Image();img.src=src;img.width=50;img.height=50;img.loading='lazy';img.alt=(i+1)+'-rasm';b.append(img);b.onclick=()=>showPhoto(i);get('thumbs').append(b)});
 showPhoto(0);get('detail').showModal();get('detail').scrollTop=0;
}
get('enlarge').onclick=()=>get('zoom').showModal();get('dBuy').onclick=()=>{get('detail').close();showOrder(activeProduct.id)};
for(const id of ['detail','zoom']){
 const dlg=get(id);dlg.querySelector('.close').onclick=()=>dlg.close();
 dlg.onkeydown=e=>{if(e.key==='ArrowLeft')showPhoto(photoIndex-1);if(e.key==='ArrowRight')showPhoto(photoIndex+1);};
 const surface=id==='zoom'?get('zoomPhoto'):dlg.querySelector('.stage');let start;
 surface.addEventListener('touchstart',e=>{start=e.touches[0].clientX},{passive:true});surface.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-start;if(Math.abs(delta)>55)showPhoto(photoIndex+(delta<0?1:-1))},{passive:true});
}
for(const id of ['prev','zPrev'])get(id).onclick=()=>showPhoto(photoIndex-1);
for(const id of ['next','zNext'])get(id).onclick=()=>showPhoto(photoIndex+1);
