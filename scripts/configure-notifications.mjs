import fs from 'node:fs';
const file='wrangler.json';
if(!fs.existsSync(file))throw Error('Avval haqiqiy database_id bilan wrangler.json sozlangan bo‘lishi kerak.');
const original=fs.readFileSync(file,'utf8'),config=JSON.parse(original);
const crons=config.triggers?.crons||[];
if(!crons.includes('*/5 * * * *')){
 const backup='wrangler.backup-'+Date.now()+'.json';fs.writeFileSync(backup,original,{flag:'wx'});
 config.triggers={...config.triggers,crons:[...crons,'*/5 * * * *']};
 fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');console.log('Har 5 daqiqalik navbat tekshiruvi qo‘shildi. Endi deploy qiling. Zaxira: '+backup);
}else console.log('Cron allaqachon sozlangan.');
