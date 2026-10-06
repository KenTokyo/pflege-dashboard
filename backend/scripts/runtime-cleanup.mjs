/** Verify only the two owned Supabase homes and their loopback ports after stop. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { redact } from './redact.mjs';
const backend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ownHome=path.join(tmpdir(),'pflege-dashboard-supabase-57aea064-phase0');
const oldHome=path.join(backend,'.local/supabase-home');
const run=promisify(execFile);
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR??'/tmp',LANG:'en_US.UTF-8',
  SUPABASE_HOME:ownHome,SUPABASE_EXPERIMENTAL_STACK:'1'};
const {stdout,stderr}=await run(path.join(backend,'node_modules/.bin/supabase'),
  ['status','--output-format','json'],{cwd:path.join(backend,'.local/supabase-project'),env,timeout:20000});
await writeFile(path.join(backend,'.local/runtime-status-stopped-redacted.log'),redact(stdout+'\n'+stderr),{mode:0o600});
const state=JSON.parse(stdout);
const {stdout:processList}=await run('/bin/ps',['-axo','pid=,args='],{timeout:10000});
const ownedProcesses=processList.split('\n').filter(line=>line.includes(ownHome)||line.includes(oldHome))
  .map(line=>Number(line.trim().split(/\s+/)[0]));
// Native status forgets live endpoint details after stop; include our explicit config ports.
const ports=[...new Set([56421,56422,...Object.values(state.endpoints??{}).map(e=>e.port).filter(Number.isInteger)])];
const checks=await Promise.all(ports.map(port=>new Promise(resolve=>{
  const socket=createConnection({host:'127.0.0.1',port});
  let done=false;
  const finish=listening=>{if(done)return;done=true;socket.destroy();resolve({port,listening});};
  socket.setTimeout(500,()=>finish(false));
  socket.once('error',()=>finish(false));
  socket.once('connect',()=>finish(true));
})));
const summary={runtime:state.runtime,lifecycle:state.lifecycle,readiness:state.readiness,
  services:(state.services??[]).map(s=>({service:s.service,state:s.state,lifecycle:s.lifecycle,health:s.health})),
  ownedProcesses,ports:checks};
await writeFile(path.join(backend,'.local/runtime-cleanup.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
console.log(`Supabase cleanup: ${ownedProcesses.length} eigene Prozesse; `+
  checks.map(c=>`${c.port} ${c.listening?'offen':'geschlossen'}`).join(', ')+
  '; eigener Nachweis: backend/.local/runtime-cleanup.json');
if(ownedProcesses.length||checks.some(c=>c.listening)||summary.services.some(s=>s.lifecycle==='running'))process.exitCode=1;
