async function digest(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2,'0')).join('');
}
async function ownerAccess(request, env) {
  if (!standalone) return isOwner(request);
  const password = env.ADMIN_PASSWORD;
  if (!password || password.length < 24) return false;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Basic ') || auth.length > 2048) return false;
  let supplied;
  try { supplied = atob(auth.slice(6)); } catch { return false; }
  const [a,b] = await Promise.all([digest(supplied),digest('admin:'+password)]);
  let difference=0;
  for(let i=0;i<a.length;i++) difference |= a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
async function allowRequest(request, env, scope, limit) {
  const period = Math.floor(Date.now()/600000);
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('oai-authenticated-user-id') || 'unknown';
  const key = await digest(scope+'|'+period+'|'+ip);
  const row = await env.DB.prepare('INSERT INTO request_limits VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(key,period,limit).first();
  if (row?.hits===1) await env.DB.prepare('DELETE FROM request_limits WHERE period<?').bind(period-1).run();
  return !!row;
}
async function limitedBody(request, cap) {
  if (Number(request.headers.get('Content-Length'))>cap) throw new RangeError();
  const reader=request.body?.getReader();
  if(!reader)throw new TypeError();
  const parts=[];let length=0;
  for (;;) {
    const {done,value}=await reader.read();if(done)break;
    length+=value.byteLength;
    if(length>cap){await reader.cancel();throw new RangeError();}
    parts.push(value);
  }
  return new Blob(parts,{type:request.headers.get('Content-Type')||''});
}
function secure(response) {
  const res=new Response(response.body,response);
  res.headers.set('X-Content-Type-Options','nosniff');
  res.headers.set('Referrer-Policy','same-origin');
  res.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' "+adminScriptHash+"; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'");
  return res;
}
