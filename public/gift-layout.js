// Responsive derivatives of the bundled catalogue artwork.
function responsivePhoto(img,src,sizes){
 img.removeAttribute('srcset');img.removeAttribute('sizes');
 const match=/^\/media\/(chocolate|hero|box|book|photo|book-inside|box-detail)\.(?:webp|jpg)$/.exec(src);
 if(match){const widths=({hero:[480,960],chocolate:[480,520],'book-inside':[270,540],'box-detail':[270,540]})[match[1]]||[480,640];img.srcset='/media/'+match[1]+'-480.webp '+widths[0]+'w, /media/'+match[1]+'-960.webp '+widths[1]+'w';img.sizes=sizes;}
 img.src=src;
}
const giftLabels={photo:'Qo‘shimcha foto',card:'Tabrik kartasi',bag:'Sovg‘a paketi'};
const money=value=>Number(value).toLocaleString('uz-UZ')+' so‘m';
async function loadTemplateImage(template){
 if(!template)return null;
 const image=new Image();image.src=template.background;await image.decode();return image;
}
function drawWrapper(canvas,image,design,background){
 if(design.template){
  const t=design.template;if(!background?.naturalWidth)throw Error('Maket rasmi yuklanmagan.');
  canvas.width=Math.round(design.width*12);canvas.height=Math.round(design.height*12);
  const w=canvas.width,h=canvas.height,c=canvas.getContext('2d');
  c.fillStyle='#ffffff';c.fillRect(0,0,w,h);c.drawImage(background,0,0,w,h);
  const r=t.photo,px=r.x*w/100,py=r.y*h/100,pw=r.w*w/100,ph=r.h*h/100;
  if(image?.naturalWidth){
   const scale=Math.max(pw/image.naturalWidth,ph/image.naturalHeight)*design.zoom/100;
   const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
   c.save();c.beginPath();c.rect(px,py,pw,ph);c.clip();
   c.drawImage(image,px+(pw-iw)*design.x/100,py+(ph-ih)*design.y/100,iw,ih);c.restore();
  }
  const a=t.label,ax=a.x*w/100,ay=a.y*h/100,aw=a.w*w/100,ah=a.h*h/100;
  c.save();c.beginPath();c.rect(ax,ay,aw,ah);c.clip();c.fillStyle=a.color;c.textAlign='center';c.textBaseline='middle';
  let size=Math.min(h*a.size/100,ah*.8);c.font='bold '+size+'px Georgia,serif';
  const text=design.text||'',measured=c.measureText(text).width;
  if(measured>aw*.95){size*=aw*.95/measured;c.font='bold '+size+'px Georgia,serif';}
  c.fillText(text,ax+aw/2,ay+ah/2);c.restore();return;
 }
 // Legacy orders retain their original, approved layout.

 const {width,height,x,y,zoom,text}=design;
 canvas.width=Math.round(width*12);canvas.height=Math.round(height*12);
 const w=canvas.width,h=canvas.height,c=canvas.getContext('2d');
 c.fillStyle='#f5e8db';c.fillRect(0,0,w,h);
 const px=w*.06,py=h*.06,pw=w*.88,ph=h*.68;
 const scale=Math.max(pw/image.naturalWidth,ph/image.naturalHeight)*zoom/100;
 const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
 c.save();c.beginPath();c.rect(px,py,pw,ph);c.clip();
 c.drawImage(image,px+(pw-iw)*x/100,py+(ph-ih)*y/100,iw,ih);c.restore();
 c.fillStyle='#822e47';c.fillRect(0,h*.78,w,h*.22);
 c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';
 c.font='bold '+Math.max(1,Math.min(h*.085,w*.12))+'px Georgia,serif';
 c.fillText(text||'Sen uchun',w/2,h*.89,w*.9);
}
// A4 portrait, embedded JPEG at the approved physical dimensions.
function downloadSheet(canvas,design,id){
 const jpeg=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.97).split(',')[1]),c=>c.charCodeAt(0));
 const pt=72/25.4, w=design.width*pt,h=design.height*pt;
 const stream='q '+w+' 0 0 '+h+' '+(210*pt-w)/2+' '+(297*pt-h)/2+' cm /Gift Do Q';
 const chunks=[],offsets=[0];let length=0;
 function push(data){const bytes=typeof data==='string'?new TextEncoder().encode(data):data;chunks.push(bytes);length+=bytes.length;}
 function object(i,...parts){offsets[i]=length;push(i+' 0 obj\n');parts.forEach(push);push('\nendobj\n');}
 push('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.2756 841.8898] /Resources << /XObject << /Gift 4 0 R >> >> /Contents 5 0 R >>');
 object(4,'<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n',jpeg,'\nendstream');
 object(5,'<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');
 const start=length;push('xref\n0 6\n0000000000 65535 f \n');
 offsets.slice(1).forEach(n=>push(String(n).padStart(10,'0')+' 00000 n \n'));
 push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
 const url=URL.createObjectURL(new Blob(chunks,{type:'application/pdf'}));
 const link=document.createElement('a');link.href=url;link.download='Sen-uchun-'+id.slice(0,8)+'-A4.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
