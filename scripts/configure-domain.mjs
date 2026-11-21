import fs from 'node:fs';
const path='wrangler.json';
if(!fs.existsSync(path))throw Error('Haqiqiy wrangler.json faylingizni loyiha papkasida saqlang.');
const original=fs.readFileSync(path,'utf8'),config=JSON.parse(original);
const origins=[...new Set([config.vars?.STOREFRONT_ORIGIN,...String(config.vars?.STOREFRONT_ORIGINS||'').split(','),'https://sen-uchun.uz','https://www.sen-uchun.uz','https://sen-uchun-onlineshop.netlify.app'].filter(Boolean).map(v=>v.trim()))];
config.vars={...config.vars,STOREFRONT_ORIGINS:origins.join(',')};
fs.writeFileSync('wrangler.backup-'+Date.now()+'.json',original,{flag:'wx'});
fs.writeFileSync(path,JSON.stringify(config,null,2)+'\n');
console.log('Domenlar ruxsat ro‘yxatiga qo‘shildi. Endi npx wrangler@4 deploy bajaring. DNS alohida sozlanadi.');
