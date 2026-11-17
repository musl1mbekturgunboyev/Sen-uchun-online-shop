const giftLabels={photo:'Qo‘shimcha foto',card:'Tabrik kartasi',bag:'Sovg‘a paketi'};
const money=value=>Number(value).toLocaleString('uz-UZ')+' so‘m';
function drawWrapper(canvas,image,design){
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
