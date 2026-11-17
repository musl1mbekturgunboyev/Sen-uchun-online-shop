import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const standalone = process.argv.includes('--cloudflare');
const mime = {html:'text/html; charset=utf-8', js:'text/javascript; charset=utf-8', css:'text/css; charset=utf-8', webp:'image/webp', jpg:'image/jpeg'};
const assets = {};
for(const file of fs.readdirSync('public',{recursive:true})){
  const filename=path.join('public',file);
  if(fs.statSync(filename).isFile()){
    const key='/'+file.replaceAll('\\','/');
    assets[key]=[mime[path.extname(file).slice(1)], standalone?'':fs.readFileSync(filename).toString('base64')];
  }
}
const admin=fs.readFileSync('server/admin.html','utf8');
const script=admin.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const adminScriptHash="'sha256-"+createHash('sha256').update(script).digest('base64')+"'";
const source=['security','orders','worker'].map(name=>fs.readFileSync('server/'+name+'.js','utf8'));
const directory=standalone?'dist/cloudflare':'dist/server';
fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(directory+'/index.js',[
  'const assets='+JSON.stringify(assets)+';',
  'const adminPage='+JSON.stringify(admin)+';',
  'const adminScriptHash='+JSON.stringify(adminScriptHash)+';',
  'const standalone='+standalone+';',
  ...source
].join('\n'));
