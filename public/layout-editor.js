/* Customer positions are percentages so touch and desktop produce identical print layouts. */
let layoutLayer='photo',layoutDrag=null;
const layoutCanvas=get('wrapper'),layoutTools=textNode('div','','layout-tools');
const layerButtons=textNode('div','','layout-tabs');layerButtons.setAttribute('role','group');layerButtons.setAttribute('aria-label','Tahrirlanadigan qism');
for(const [key,title] of [['photo','Surat'],['label','Yozuv']]){const b=textNode('button',title);b.type='button';b.dataset.layer=key;b.onclick=()=>{layoutLayer=key;syncLayoutTools();};layerButtons.append(b);}
const layoutHint=textNode('p','Surat yoki yozuvni tanlang, so‘ng maket ustida barmoq yoki sichqoncha bilan sudrang.');
const layoutControls={};
function layoutControl(key,title,min,max,type='range'){
 const label=textNode('label',title),input=document.createElement('input'),value=textNode('output','');input.type=type;input.id='layout-'+key;input.min=min;input.max=max;input.step='1';label.append(input,value);layoutControls[key]={input,value,label};return label;
}
const positions=document.createElement('details');positions.append(textNode('summary','Aniq joylashuv va o‘lcham'));
for(const [key,title,min,max] of [['x','Chapdan',0,99],['y','Yuqoridan',0,99],['w','Eni',1,100],['h','Bo‘yi',1,100]])positions.append(layoutControl(key,title,min,max));
const font=layoutControl('size','Yozuv kattaligi',1,30),color=layoutControl('color','Yozuv rangi',0,0,'color');
const photoSize=layoutControl('scale','Surat o‘lchami',10,200);
const reset=textNode('button','Asl joylashuvga qaytarish','secondary');reset.type='button';reset.onclick=()=>{initLayoutEditor(checkoutSettings?.template);get('approved').checked=false;refreshGift();};
layoutTools.append(layerButtons,layoutHint,photoSize,font,color,positions,reset);layoutCanvas.before(layoutTools);
const layoutStage=textNode('div','','layout-stage'),outline=textNode('div','','layout-outline');outline.setAttribute('aria-hidden','true');layoutCanvas.before(layoutStage);layoutStage.append(layoutCanvas,outline);
function initLayoutEditor(t){
 customerLayout=t?.enabled?{photo:{...t.photo},label:{...t.label}}:null;layoutLayer='photo';layoutDrag=null;syncLayoutTools();
}
function syncLayoutTools(){
 layoutTools.hidden=!customerLayout;outline.hidden=!customerLayout;if(!customerLayout)return;
 const r=customerLayout[layoutLayer];for(const b of layerButtons.children)b.setAttribute('aria-pressed',String(b.dataset.layer===layoutLayer));
 for(const [key,control] of Object.entries(layoutControls)){
  control.label.hidden=key==='scale'?layoutLayer!=='photo':(key==='size'||key==='color')&&layoutLayer!=='label';
  if(key==='scale'){const scale=Math.round(100*r.w/(checkoutSettings?.template?.photo.w||r.w));control.input.value=scale;control.value.textContent=scale+'%';continue;}
  control.input.value=r[key]??(key==='color'?'#ffffff':8);control.value.textContent=key==='color'?'':Math.round(r[key]||0)+'%';
 }
 Object.assign(outline.style,{left:r.x+'%',top:r.y+'%',width:r.w+'%',height:r.h+'%'});
}
function updateLayout(){get('approved').checked=false;syncLayoutTools();refreshGift();}
const bounded=(v,min,max)=>Math.max(min,Math.min(max,v));
for(const [key,{input}] of Object.entries(layoutControls))input.addEventListener('input',()=>{
 if(!customerLayout)return;const r=customerLayout[layoutLayer];
 if(key==='scale'){const base=checkoutSettings.template.photo,scale=Math.min(Number(input.value)/100,100/base.w,100/base.h);r.w=Math.max(1,base.w*scale);r.h=Math.max(1,base.h*scale);r.x=Math.min(r.x,100-r.w);r.y=Math.min(r.y,100-r.h);updateLayout();return;}
 r[key]=key==='color'?input.value:Number(input.value);
 if(key==='w')r.w=Math.min(r.w,100-r.x);if(key==='h')r.h=Math.min(r.h,100-r.y);
 r.x=bounded(r.x,0,100-r.w);r.y=bounded(r.y,0,100-r.h);updateLayout();
});
function layoutPoint(event){const r=layoutCanvas.getBoundingClientRect();return {x:100*(event.clientX-r.left)/r.width,y:100*(event.clientY-r.top)/r.height};}
layoutCanvas.addEventListener('pointerdown',event=>{
 if(!customerLayout||event.button!==0)return;
 const p=layoutPoint(event),contains=r=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
 // Prefer the chosen layer when regions overlap; otherwise select the touched layer.
 if(!contains(customerLayout[layoutLayer])){if(contains(customerLayout.label))layoutLayer='label';else if(contains(customerLayout.photo))layoutLayer='photo';else return;}
 const r=customerLayout[layoutLayer];layoutDrag={pointer:event.pointerId,start:p,x:r.x,y:r.y};layoutCanvas.setPointerCapture(event.pointerId);syncLayoutTools();event.preventDefault();
});
layoutCanvas.addEventListener('pointermove',event=>{
 if(!layoutDrag||layoutDrag.pointer!==event.pointerId)return;const p=layoutPoint(event),r=customerLayout[layoutLayer];
 r.x=bounded(Math.round(layoutDrag.x+p.x-layoutDrag.start.x),0,100-r.w);r.y=bounded(Math.round(layoutDrag.y+p.y-layoutDrag.start.y),0,100-r.h);updateLayout();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])layoutCanvas.addEventListener(type,()=>{layoutDrag=null;});
