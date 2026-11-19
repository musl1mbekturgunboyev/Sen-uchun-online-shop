const giftEl=id=>document.getElementById(id);
let checkoutSettings,checkoutBackground,renderedDesign,customName=false;
async function setupGift(product){
 checkoutSettings=null;checkoutBackground=null;renderedDesign=null;customName=false;
 const session=orderId;
 giftEl('giftOptions').hidden=true;
 try{
  const response=await fetch('/api/gifts?product='+product.id,{cache:'no-store'});if(!response.ok)throw Error();
  const settings=await response.json();if(session!==orderId)return;
  checkoutSettings=settings;
  const note=giftEl('templateNote');
  note.textContent=settings.template?.enabled?'Surat va ism tanlangan mahsulot maketiga joylanadi.':'Bu mahsulot uchun maket hali sozlanmagan. Asl surat va matn sotuvchiga yuboriladi; joylashuv sotuvchi bilan kelishiladi.';
  giftEl('selectedProduct').src=product.image;giftEl('selectedProduct').alt=product.name;
  giftEl('selectedProduct').hidden=!!settings.template?.enabled;
  if(settings.template?.enabled){
   note.textContent='Mahsulot maketi yuklanmoqda…';
   try{const bg=await loadTemplateImage(settings.template);if(session!==orderId)return;checkoutBackground=bg;note.textContent='Suratni yuklang va ismni yozing. Joylashuvni tasdiqlashdan oldin tekshiring.';}
   catch{if(session!==orderId)return;checkoutSettings=null;throw Error();}
  }

  const methods=giftEl('method');methods.replaceChildren();
  if(settings.pickup)methods.add(new Option('Olib ketish · '+settings.pickup,'pickup'));
  if(settings.delivery!==null)methods.add(new Option('Yetkazish · '+money(settings.delivery),'delivery'));
  if(!methods.length)methods.add(new Option('Sotuvchi bilan kelishish','agree'));
  const extras=giftEl('giftExtras');extras.replaceChildren();
  for(const [key,label] of Object.entries(giftLabels)){
   if(settings[key]===null)continue;
   const wrapper=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=key;
   wrapper.append(input,' '+label+' · '+money(settings[key])+' / dona');extras.append(wrapper);
  }
  showDeliveryInfo(giftEl('checkoutTerms'),settings);
  giftEl('giftOptions').hidden=false;refreshGift();
 }catch{if(session===orderId)giftEl('orderError').textContent='Buyurtma sozlamalari yuklanmadi. Buyurtma oynasini qayta oching.';}
}
function giftSelection(){
 const cfg=checkoutSettings;if(!cfg)throw Error('Sozlamalar yuklanishini kuting.');
 const extras=[...giftEl('giftExtras').querySelectorAll(':checked')].map(input=>input.value);
 const method=giftEl('method').value,qty=Number(giftEl('qty').value);
 const product=services.find(item=>item.id===selectedId);
 const additions=extras.reduce((sum,k)=>sum+cfg[k],0);
 const fee=method==='delivery'?cfg.delivery:0;
 const total=product.price==null?null:(product.price+additions)*qty+fee;
 const design=cfg.template?.enabled&&giftEl('file').files.length?{
  width:cfg.template.width,height:cfg.template.height,template:cfg.template,templateRevision:cfg.template.revision,text:giftEl('wrapText').value.trim(),x:+giftEl('cropX').value,y:+giftEl('cropY').value,zoom:+giftEl('cropZoom').value
 }:null;
 return {signature:JSON.stringify(cfg),method,extras,address:method==='delivery'?giftEl('address').value.trim():'',time:method==='agree'?'':giftEl('needed').value.trim(),total,design,additional:additions*qty+fee};
}
function refreshGift(){
 if(!checkoutSettings)return;
 const g=giftSelection();
 giftEl('addressBox').hidden=g.method!=='delivery';giftEl('address').required=g.method==='delivery';
 giftEl('timeBox').hidden=g.method==='agree';giftEl('needed').required=g.method==='pickup';
 giftEl('giftTotal').textContent=g.total===null?'Mahsulot narxi kelishiladi. Qo‘shimchalar va yetkazish: '+money(g.additional):'Jami: '+money(g.total);
 giftEl('wrapEditor').hidden=!checkoutSettings.template?.enabled;giftEl('approved').required=!!g.design;
 giftEl('approved').disabled=!g.design||!checkoutBackground||!giftEl('preview').naturalWidth;
 renderedDesign=null;
 if(checkoutBackground){
  const design=g.design||{width:checkoutSettings.template.width,height:checkoutSettings.template.height,template:checkoutSettings.template,text:giftEl('wrapText').value.trim(),x:50,y:50,zoom:100};
  drawWrapper(giftEl('wrapper'),g.design?giftEl('preview'):null,design,checkoutBackground);
  if(g.design&&giftEl('preview').naturalWidth)renderedDesign=JSON.stringify(g.design);
 }
}
giftEl('form').addEventListener('input',e=>{
 if(e.target.id==='wrapText')customName=true;
 if(e.target.id==='note'&&!customName){giftEl('wrapText').value=e.target.value.trim().slice(0,80);giftEl('approved').checked=false;}
 if(e.target!==giftEl('approved')&&(e.target.closest('#wrapEditor')||e.target.id==='file'))giftEl('approved').checked=false;
 refreshGift();
});
giftEl('preview').addEventListener('load',refreshGift);
function checkoutGift(){
 const g=giftSelection();
 if(g.design&&(!giftEl('preview').naturalWidth||!giftEl('approved').checked||renderedDesign!==JSON.stringify(g.design)))throw Error('Rasm yuklangach, maketni tasdiqlang.');
 if(g.design){delete g.design.template;}
 return JSON.stringify(g);
}
function trackingLink(token){return location.origin+'/#buyurtma='+token;}
async function openTracking(){
 const token=/^#buyurtma=([a-f0-9-]{36})$/.exec(location.hash)?.[1];if(!token)return;
 const box=giftEl('trackDialog');giftEl('trackingActions').replaceChildren();giftEl('tracked').textContent='Yuklanmoqda…';if(!box.open)box.showModal();
 try{const r=await fetch('/api/track',{headers:{'X-Tracking-Key':token},cache:'no-store'});if(!r.ok)throw Error();
 const o=await r.json();giftEl('tracked').textContent=o.product+' · '+o.qty+' dona · '+o.stage;showTrackingActions(token,o);
 }catch{giftEl('tracked').textContent='Buyurtma topilmadi yoki ulanish uzildi.';}
}
giftEl('trackClose').onclick=()=>{giftEl('trackDialog').close();history.replaceState(null,'',location.pathname+location.search);};
window.addEventListener('hashchange',openTracking);window.addEventListener('load',openTracking);

giftEl('copyTracking').onclick=async()=>{
 const link=giftEl('trackReceipt');
 if(link.hidden)return;
 try{await navigator.clipboard.writeText(link.href);giftEl('hint').textContent='Kuzatuv havolasi nusxalandi.';}
 catch{giftEl('hint').textContent='Kuzatuv havolasini bosib turing va nusxalang.';}
};
