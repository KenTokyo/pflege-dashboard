/** Own Hosted READ ONLY: cloud config, TLS/role and actual HTTP/Auth-denial. No account/provider. */
import { readFile, lstat, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {once} from 'node:events';
import {cloudConfiguration} from '../.local/build/backend/runtime/config.js';
import {createCloudHandler,cloudEnvironment,DEMO_ORIGIN} from '../.local/build/backend/runtime/cloud.js';
import {createDatabase} from '../.local/build/backend/runtime/database.js';
import {platform} from '../.local/build/backend/runtime/platform.js';
const backend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(backend,'..');
const info=await lstat(path.join(root,'.env'));if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o077)||info.uid!==process.getuid())throw Error('Protected own env required');
const file=parseEnv(await readFile(path.join(root,'.env'),'utf8'));
// Copy only authorized own-project connection/public values; provider keys are never read into this probe.
const source=Object.fromEntries(['SUPABASE_URL','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','DATABASE_URL'].map(k=>[k,file[k]]));
const config=cloudConfiguration(source),env=cloudEnvironment({...source,SUPABASE_URL:config.env('SUPABASE_URL'),SUPABASE_PUBLISHABLE_KEY:config.env('SUPABASE_PUBLISHABLE_KEY')});
const db=createDatabase(config.database,[]),checks=[];
const ctrl=new AbortController(),deadline=setTimeout(()=>ctrl.abort(),45000);
const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
const handler=createCloudHandler(source,async()=>({env,platform:platform(env,fetch,db.rpc)}));
let port;
const server=http.createServer((req,res)=>{void(async()=>{
 const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(k!=='host'&&v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
 const response=await handler(new Request(DEMO_ORIGIN+req.url,{method:req.method,headers,signal:ctrl.signal}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
})().catch(()=>res.destroy());});
let failure;
try{
 await db.verify();check(true,'Official bundled CA verifies Hosted TLS and narrow RPC role');
 server.listen(0,'127.0.0.1');await once(server,'listening');port=server.address().port;
 const send=(pathname,headers={},method='POST')=>fetch(`http://127.0.0.1:${port}${pathname}`,{method,headers,signal:ctrl.signal});
 check((await send('/api/health',{},'GET')).status===200,'Real HTTP cloud health 200');
 for(const pathname of ['/api/session','/api/chat-stream']){
  let response=await send(pathname);check(response.status===401&&(await response.json()).error.code==='AUTH_REQUIRED',`${pathname}: missing bearer 401`);
  response=await send(pathname,{Origin:'https://evil.invalid'});check(response.status===403,`${pathname}: foreign origin 403`);
  response=await send(pathname,{Origin:DEMO_ORIGIN},'OPTIONS');check(response.status===204,`${pathname}: exact production preflight 204`);
  response=await send(pathname,{Origin:DEMO_ORIGIN,Authorization:'Bearer synthetic-invalid-not-a-login'});
  check(response.status===401&&(await response.json()).error.code==='AUTH_REQUIRED',`${pathname}: REAL own Supabase Auth rejects synthetic token`);
 }
 const missing=await send('/api/unknown');check(missing.status===404&&(await missing.json()).error.message==='Endpunkt nicht vorhanden.','Unknown API neutral JSON 404');
}catch{failure=true;}finally{
 clearTimeout(deadline);ctrl.abort();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await db.close();
}
await writeFile(path.join(backend,'.local/cloud-hosted-result.json'),JSON.stringify({passed:!failure,checks,port,closed:true,providerCalls:0,authAccountsCreated:0},null,2)+'\n',{mode:0o600});
if(failure){console.error('Cloud-Hosted-Prüfung fehlgeschlagen; nur sichere Befunde in .local/cloud-hosted-result.json.');process.exitCode=1;}
else console.log(`${checks.length} Cloud/Hosted-Prüfungen bestanden; eigene Verbindung und eigener HTTP-Port geschlossen.`);
