const giftStatusNames=['Qabul qilindi','Tayyorlanmoqda','Tayyor','Topshirildi'];
const giftSettingNames={width:'Shokolad o‘rami eni (mm, 1–190)',height:'Shokolad o‘rami bo‘yi (mm, 1–277)',pickup:'Olib ketish manzili',delivery:'Yetkazish narxi (buyurtmaga, so‘m)',photo:'Qo‘shimcha foto (donasiga, so‘m)',card:'Tabrik kartasi (donasiga, so‘m)',bag:'Sovg‘a paketi (donasiga, so‘m)'};
async function loadGiftSettings(){
 const panel=document.getElementById('giftSettings');
 try{
  const response=await fetch('/api/gifts');if(!response.ok)throw Error();
  const settings=await response.json();const controls={};
  for(const [key,title] of Object.entries(giftSettingNames)){
   const label=document.createElement('label'),field=document.createElement('input');
   field.type=key==='pickup'?'text':'number';if(key!=='pickup'){field.min='0';field.max=String(({width:190,height:277})[key]||100000000);field.step='1';}
   else field.maxLength=200;
   field.value=settings[key]??'';label.append(title,field);panel.append(label);controls[key]=field;
  }
  const save=document.createElement('button'),message=document.createElement('p');message.setAttribute('role','status');
  save.textContent='Sozlamalarni saqlash';panel.append(save,message);
  save.onclick=async()=>{
   const data={};for(const [key,field] of Object.entries(controls)){
    if(!field.reportValidity())return;
    data[key]=key==='pickup'?field.value.trim():field.value===''?(['width','height'].includes(key)?0:null):Number(field.value);
   }
   save.disabled=true;
   try{const r=await fetch('/api/admin/gifts',{method:'POST',body:JSON.stringify(data)});if(!r.ok)throw Error();message.textContent='Sozlamalar saqlandi.';}
   catch{message.textContent='Saqlanmadi. O‘ramning ikkala o‘lchamini tekshiring.';}finally{save.disabled=false;}
  };
 }catch{panel.append('Sozlamalarni yuklab bo‘lmadi. Sahifani yangilang.');}
}
function adminGift(order,info){
 const status=document.createElement('select');status.setAttribute('aria-label','Buyurtma holati');
 if(!order.stage)status.add(new Option('Avvalgi buyurtma',''));
 giftStatusNames.forEach(stage=>status.add(new Option(stage,stage)));status.value=order.stage||'';
 const feedback=document.createElement('small');info.append(status,feedback);
 status.onchange=async()=>{
  status.disabled=true;
  try{const r=await fetch('/api/admin/stage',{method:'POST',body:JSON.stringify({id:order.id,previous:order.stage,stage:status.value})});if(!r.ok)throw Error();order.stage=status.value;feedback.textContent=' Saqlandi.';}
  catch{status.value=order.stage||'';feedback.textContent=' Yangilab qayta urining.';}finally{status.disabled=false;}
 };
 if(!order.gift)return;
 const g=JSON.parse(order.gift);
 const line=text=>{const p=document.createElement('p');p.textContent=text;info.append(p);};
 line(({pickup:'Olib ketish',delivery:'Yetkazish',agree:'Kelishilgan holda'})[g.method]+' · '+[g.address,g.time].filter(Boolean).join(' · '));
 for(const item of g.extras)line(giftLabels[item.key]+' · '+money(item.price)+' × '+order.qty);
 if(g.method==='delivery')line('Yetkazish: '+money(g.fee));
 line(g.total===null?'Mahsulot narxi kelishiladi':'Jami: '+money(g.total));
 if(!g.design)return;
 const button=document.createElement('button');button.textContent='A4 maketni yuklash · PDF';info.append(button);
 button.onclick=async()=>{
  button.disabled=true;
  try{const img=new Image();img.src='/api/admin/orders/'+order.id+'/photo';await img.decode();
   const canvas=document.createElement('canvas');drawWrapper(canvas,img,g.design);downloadSheet(canvas,g.design,order.id);
  }catch{feedback.textContent=' Surat yuklanmadi. Qayta urinib ko‘ring.';}finally{button.disabled=false;}
 };
}
loadGiftSettings();
