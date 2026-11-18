// One editor per product. Coordinates remain proportional on phones and in the PDF.
async function openTemplateEditor(product){
 const dialog=document.createElement('dialog');dialog.className='template-dialog';
 dialog.setAttribute('aria-label',product.name+' maketi');
 const title=document.createElement('h2');title.textContent=product.name+' · Maket';
 const close=document.createElement('button');close.type='button';close.textContent='Yopish';close.onclick=()=>dialog.close();
 const message=document.createElement('p');message.setAttribute('role','status');message.textContent='Yuklanmoqda…';
 dialog.append(close,title,message);document.body.append(dialog);dialog.showModal();
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 let background,requestVersion=0;
 try{
  const response=await fetch('/api/gifts?product='+product.id,{cache:'no-store'});if(!response.ok)throw Error('Sozlamalar yuklanmadi.');
  const settings=await response.json();if(!dialog.open)return;
  const saved=settings.template;
  const t=saved?structuredClone(saved):{enabled:false,width:150,height:100,background:product.images[0],photo:{x:25,y:10,w:50,h:60},label:{x:10,y:78,w:80,h:16,color:'#ffffff',size:8}};
  const layout=document.createElement('div');layout.className='template-layout';
  const preview=document.createElement('div');preview.className='template-preview';
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Maket va belgilangan joylar');
  const explanation=document.createElement('p');explanation.textContent='Ko‘k chiziq — mijoz surati. Pushti chiziq — ism. Rasm ichidagi eski odam yoki yozuv avtomatik o‘chmaydi: bo‘sh joyli, tekis bosma maket yuklang. Eni va bo‘yi haqiqiy bosma o‘lcham bo‘lsin.';
  preview.append(canvas,explanation);
  const form=document.createElement('form');form.className='template-fields';
  const field=(parent,title,type,value)=>{const label=document.createElement('label'),input=document.createElement('input');input.type=type;input.value=value;label.append(title,input);parent.append(label);return input;};
  const enabled=field(form,'Bu mahsulotda maketni yoqish','checkbox','');enabled.checked=t.enabled;
  const dims=document.createElement('div');dims.className='coords';form.append(dims);
  const width=field(dims,'Eni (mm)','number',t.width),height=field(dims,'Bo‘yi (mm)','number',t.height);
  for(const [input,max] of [[width,190],[height,277]]){input.required=true;input.min=1;input.max=max;input.step=1;}
  const selectLabel=document.createElement('label');selectLabel.textContent='Mahsulot rasmini tanlash';
  const select=document.createElement('select');selectLabel.append(select);form.append(selectLabel);
  const images=[...new Set([t.background,...product.images])];images.forEach((src,i)=>select.add(new Option(i===0&&saved?'Saqlangan maket':'Rasm '+(i+1),src)));
  const upload=field(form,'Yoki bo‘sh bosma maket yuklash (JPG, PNG, WebP, 10 MB)','file','');upload.accept='image/jpeg,image/png,image/webp';
  const controls={};
  for(const [key,name] of [['photo','Surat joyi (%)'],['label','Ism joyi (%)']]){
   const group=document.createElement('fieldset'),legend=document.createElement('legend'),grid=document.createElement('div');legend.textContent=name;grid.className='coords';group.append(legend,grid);form.append(group);controls[key]={};
   for(const [axis,label] of [['x','Chapdan'],['y','Tepadan'],['w','Eni'],['h','Bo‘yi']]){
    const input=field(grid,label,'number',t[key][axis]);input.min=['w','h'].includes(axis)?1:0;input.max=100;input.step='.1';input.required=true;controls[key][axis]=input;
   }
  }
  const color=field(form,'Ism rangi','color',t.label.color),size=field(form,'Shrift o‘lchami (maket bo‘yining %)','number',t.label.size);size.min=1;size.max=30;size.step=1;size.required=true;
  const sample=field(form,'Tekshirish uchun ism','text','Gulsevar');sample.maxLength=80;
  const save=document.createElement('button');save.type='submit';save.className='primary';save.textContent='Maketni saqlash';form.append(save);
  layout.append(preview,form);dialog.append(layout);
  function read(){
   t.enabled=enabled.checked;t.width=+width.value;t.height=+height.value;
   for(const key of ['photo','label'])for(const axis of ['x','y','w','h'])t[key][axis]=+controls[key][axis].value;
   t.label.color=color.value;t.label.size=+size.value;
  }
  function valid(){return [t.photo,t.label].every(r=>r.x>=0&&r.y>=0&&r.w>=1&&r.h>=1&&r.x+r.w<=100&&r.y+r.h<=100)&&t.width>=1&&t.width<=190&&t.height>=1&&t.height<=277;}
  function redraw(){
   read();if(!background||!valid())return;
   drawWrapper(canvas,null,{width:t.width,height:t.height,template:t,text:sample.value,zoom:100,x:50,y:50},background);
   const c=canvas.getContext('2d');c.lineWidth=Math.max(2,canvas.width/300);c.setLineDash([12,8]);
   for(const [key,color] of [['photo','#0078d4'],['label','#e42e76']]){const r=t[key];c.strokeStyle=color;c.strokeRect(r.x*canvas.width/100,r.y*canvas.height/100,r.w*canvas.width/100,r.h*canvas.height/100);}
  }
  async function load(src){
   const version=++requestVersion;background=null;save.disabled=true;message.textContent='Maket rasmi yuklanmoqda…';
   try{const image=await loadTemplateImage({background:src});if(version!==requestVersion||!dialog.open)return;
    t.background=src;background=image;save.disabled=false;message.textContent='Surat va ism joylarini belgilang. Saqlashdan oldin chegaralarni tekshiring.';redraw();
   }catch{if(version===requestVersion)message.textContent='Rasm yuklanmadi. Boshqa rasm tanlang.';}
  }
  form.addEventListener('input',redraw);select.onchange=()=>load(select.value);
  upload.onchange=async()=>{
   const file=upload.files[0];if(!file)return;
   if(file.size>10485760||!['image/jpeg','image/png','image/webp'].includes(file.type)){message.textContent='10 MB gacha JPG, PNG yoki WebP tanlang.';return;}
   save.disabled=true;
   try{const bitmap=await createImageBitmap(file);let data;
    try{for(const edge of [2400,1800,1400,1000]){const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);data=c.toDataURL('image/webp',.93);if(data.length<800000)break;}}finally{bitmap.close();}
    if(data.length>=800000)throw Error();await load(data);
   }catch{message.textContent='Rasmni tayyorlab bo‘lmadi. Boshqa rasm tanlang.';save.disabled=!background;}
  };
  form.onsubmit=async e=>{
   e.preventDefault();read();if(!background||!valid()){message.textContent='Surat va ism joylari maket chegarasidan chiqmasin.';return;}
   save.disabled=true;upload.disabled=true;select.disabled=true;
   try{const r=await fetch('/api/admin/template',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:product.id,revision:saved?.revision||0,template:t})});
    if(!r.ok){const data=await r.json();throw Error(data.error||'Maket saqlanmadi.');}
    dialog.close();document.getElementById('status').textContent=product.name+' maketi saqlandi.';
   }catch(error){message.textContent=error.message;save.disabled=false;upload.disabled=false;select.disabled=false;}
  };
  await load(t.background);
 }catch(error){message.textContent=error.message||'Maket ochilmadi. Sahifani yangilang.';}
}
