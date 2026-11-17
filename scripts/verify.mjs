import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import app from '../dist/server/index.js';
import external from '../dist/cloudflare/index.js';
process.env.TEST_ONLY='1';
const {DB,BUCKET}=await import('./preview.mjs');
const origin='https://test.local';
const owner={'oai-authenticated-user-id':'test','oai-authenticated-user-email':'muslimbekturgunboyev08@gmail.com'};
const call=(path,opts={},worker=app,env={DB,BUCKET})=>worker.fetch(new Request(origin+path,opts),env);
const elapsed=async(fn)=>{const start=performance.now();await fn();return performance.now()-start;};
function report(label,times){times.sort((a,b)=>a-b);console.log(label+': '+times.length+' successful; p95 '+times[Math.ceil(.95*times.length)-1].toFixed(1)+' ms');}
for(const path of ['/admin','/api/admin','/api/admin/orders'])assert.equal((await call(path)).status,404);
assert.equal((await call('/admin',{headers:owner})).status,200);
assert.equal((await call('/admin',{headers:owner},external,{DB,BUCKET})).status,401);
assert.equal((await call('/api/admin/product',{method:'POST',headers:{...owner,Origin:'https://other.test'}})).status,403);
const password=crypto.randomUUID();
assert.equal((await call('/admin',{headers:{Authorization:'Basic '+btoa('admin:'+password)}},external,{DB,BUCKET,ADMIN_PASSWORD:password})).status,200);
const catalog=()=>call('/api/catalog');
report('Concurrent catalog readers',await Promise.all(Array.from({length:100},()=>elapsed(async()=>assert.equal((await(await catalog()).json()).products.length,4)))));
const jpeg=fs.readFileSync('public/media/box.jpg');
const photo=Buffer.alloc(10*1024*1024);jpeg.copy(photo);const originalHash=await crypto.subtle.digest('SHA-256',photo);
function order(id,payload=photo){const form=new FormData();for(const [k,v] of Object.entries({id,qty:'1',product:'0',note:'Sinov',contact:''}))form.set(k,v);
form.set('photo',new Blob([payload],{type:'image/jpeg'}),'surat.jpg');
return call('/api/orders',{method:'POST',headers:{Origin:origin,'cf-connecting-ip':'test-'+id},body:form});}
const ids=Array.from({length:10},()=>crypto.randomUUID());
report('Concurrent 10 MiB uploads',await Promise.all(ids.map(id=>elapsed(async()=>assert.equal((await order(id)).status,200)))));
for(const id of ids){const path='/api/admin/orders/'+id+'/photo';
 assert.equal((await call(path)).status,404);
 const res=await call(path,{headers:owner});assert.equal(res.status,200);assert.deepEqual(await crypto.subtle.digest('SHA-256',await res.arrayBuffer()),originalHash);
}
assert.equal((await order(ids[0])).status,200);
assert.equal((await(await call('/api/admin/orders',{headers:owner})).json()).length,10);
assert.equal((await order(crypto.randomUUID(),Buffer.from('<html>fake</html>'))).status,415);
assert.equal((await order(crypto.randomUUID(),Buffer.alloc(10*1024*1024+1))).status,400);
const image='data:image/jpeg;base64,'+jpeg.toString('base64');
const product={id:null,revision:0,name:'Test',category:'Test',description:'Test',price:2000,visible:1,images:[image]};
const change=(v)=>call('/api/admin/product',{method:'POST',headers:{Origin:origin,...owner},body:JSON.stringify(v)});
assert.equal((await change(product)).status,200);
const saved=(await(await catalog()).json()).products.at(-1);
assert(saved.image.startsWith('/catalog-media/'));assert.deepEqual(Buffer.from(await(await call(saved.image)).arrayBuffer()),jpeg);
assert.equal((await change({...saved,visible:0})).status,200);assert.equal((await change(saved)).status,409);
for(let i=0;i<21;i++){const response=await call('/api/orders',{method:'POST',headers:{Origin:origin,'cf-connecting-ip':'limit-test','Content-Type':'multipart/form-data; boundary=x'},body:'--x--'});if(i===20)assert.equal(response.status,429);}
console.log('PASS: protected admin, external auth, CSRF, R2 gallery, conflict, rate limit, file type/size, idempotency and all 10 private downloads.');
