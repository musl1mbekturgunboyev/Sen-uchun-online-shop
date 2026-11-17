import http from 'node:http';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import app from '../dist/server/index.js';

const sqlite = new DatabaseSync(':memory:');
for (const file of fs.readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) {
  sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
}
export const DB = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    let args = [];
    return {
      bind(...values) { args = values.map(v => v instanceof ArrayBuffer ? new Uint8Array(v) : v); return this; },
      all() { return { results: statement.all(...args) }; },
      first() { return statement.get(...args); },
      run() { return { meta: statement.run(...args) }; }
    };
  }
};
const objects = new Map();
export const BUCKET = {
  async put(key, bytes, options) { objects.set(key,{bytes:Uint8Array.from(bytes),httpMetadata:options.httpMetadata}); },
  async delete(key) { objects.delete(key); },
  async get(key) {
    const item=objects.get(key);
    return item ? {body:new Blob([item.bytes]).stream(), httpMetadata:item.httpMetadata} : null;
  }
};
if (!process.env.TEST_ONLY) {
  const portArg = process.argv.indexOf('--port');
  const port = Number(portArg<0 ? process.env.PORT || 3000 : process.argv[portArg+1]);
  http.createServer(async (req,res) => {
    try {
      const headers = new Headers();
      for (const [key,value] of Object.entries(req.headers)) {
        if (!key.startsWith('oai-') && !key.startsWith('cf-') && value) headers.set(key,String(value));
      }
      headers.set('cf-connecting-ip',req.socket.remoteAddress);
      const response = await app.fetch(new Request('http://'+req.headers.host+req.url,{
        method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:req,duplex:'half'
      }),{DB,BUCKET});
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch { res.writeHead(500);res.end(); }
  }).listen(port,'127.0.0.1');
}
