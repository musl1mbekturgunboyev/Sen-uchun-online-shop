const root=document.documentElement,picker=document.getElementById('stylePicker'),sky=document.getElementById('sky');
function setting(key,value){try{if(value!==undefined)localStorage.setItem('sen-'+key,value);return localStorage.getItem('sen-'+key)}catch{return null}}
const chosen=setting('style');
root.dataset.style=chosen==='glass'?'glass':'classic';
function theme(dark){root.dataset.theme=dark?'dark':'light';sky.setAttribute('aria-checked',String(dark));}
theme((setting('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))==='dark');
sky.onclick=()=>{theme(root.dataset.theme!=='dark');setting('theme',root.dataset.theme);};
picker.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{root.dataset.style=b.dataset.choice;setting('style',b.dataset.choice);picker.close();});
document.getElementById('styles').onclick=()=>picker.showModal();
if(!chosen)picker.showModal();
