// Public product links never include private order tokens or tracking fragments.
function productShareURL(product){
 const url=new URL('/',location.origin);url.searchParams.set('product',String(product.id));return url.href;
}
function openSharedProduct(){
 const id=new URL(location.href).searchParams.get('product');if(id===null)return;
 const product=services.find(p=>String(p.id)===id);
 if(product){get('stylePicker').close();openProduct(product);}else notify('Bu mahsulot hozir mavjud emas.');
}
function shareProduct(product){
 const url=productShareURL(product),dialog=document.createElement('dialog');dialog.className='product-share-dialog';
 const title=document.createElement('h2');title.textContent='Mahsulotni ulashish';title.id='shareTitle';dialog.setAttribute('aria-labelledby',title.id);
 const close=document.createElement('button');close.className='close';close.textContent='×';close.setAttribute('aria-label','Yopish');close.onclick=()=>dialog.close();
 const name=document.createElement('p');name.textContent=product.name;
 const input=document.createElement('input');input.readOnly=true;input.value=url;input.setAttribute('aria-label','Mahsulot havolasi');
 const status=document.createElement('p');status.setAttribute('role','status');
 const copy=document.createElement('button');copy.className='primary';copy.textContent='Havolani nusxalash';copy.onclick=async()=>{
  try{await navigator.clipboard.writeText(url);status.textContent='Havola nusxalandi.';}catch{input.focus();input.select();status.textContent='Havolani tanlab, nusxalang.';}
 };
 const telegram=document.createElement('a');telegram.className='secondary';telegram.textContent='Telegram orqali ulashish';telegram.href='https://t.me/share/url?'+new URLSearchParams({url,text:product.name+' — '+priceText(product)});telegram.target='_blank';telegram.rel='noopener noreferrer';
 dialog.append(close,title,name,input,copy,telegram);
 if(navigator.share){const native=document.createElement('button');native.className='secondary';native.textContent='Boshqa ilovalar';native.onclick=async()=>{try{await navigator.share({title:product.name,text:product.name+' — '+priceText(product),url});}catch(e){if(e.name!=='AbortError')status.textContent='Havolani nusxalash orqali ulashing.';}};dialog.append(native);}
 dialog.append(status);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
const detailShare=document.createElement('button');detailShare.className='secondary';detailShare.type='button';detailShare.textContent='↗ Ulashish';detailShare.onclick=()=>{if(activeProduct)shareProduct(activeProduct);};get('dName').after(detailShare);
