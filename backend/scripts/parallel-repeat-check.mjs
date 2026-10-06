/** Targeted recurrence for the clock-dependent race-test defect. Own real native stack only. */
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {backend} from './local-db.mjs';
let child,aborted=false,failure;const runs=[];const killTimers=new Set();
const abort=()=>{
 aborted=true;const owned=child;if(!owned)return;
 owned.kill('SIGTERM');const hard=setTimeout(()=>{killTimers.delete(hard);if(owned.exitCode===null&&owned.signalCode===null)owned.kill('SIGKILL');},5000);killTimers.add(hard);
};
process.once('SIGINT',abort);process.once('SIGTERM',abort);const total=setTimeout(abort,180000);
async function step(script,args=[],limit=30000){
 if(aborted&&!((script==='supabase-safe.mjs'&&args[0]==='stop')||script==='runtime-cleanup.mjs'))throw Error('Unterbrochen');
 await new Promise((resolve,reject)=>{
  child=spawn(process.execPath,['scripts/'+script,...args],{cwd:backend,stdio:['ignore','inherit','inherit']});
  const timer=setTimeout(abort,limit);child.once('error',reject);child.once('close',code=>{clearTimeout(timer);child=null;code===0?resolve():reject(Error('Gezielte Parallelregression fehlgeschlagen'));});
 });
}
try{
 await step('supabase-safe.mjs',['start'],120000);
 // Existing own eleven-migration DB from check:phase1; no redundant reset/seed.
 for(let i=0;i<12;i++){
  await step('phase1-concurrency.mjs');
  runs.push({iteration:i+1,passed:true,assertions:15});
 }
}catch(e){failure=e;}finally{
 try{await step('supabase-safe.mjs',['stop']);}catch(e){failure??=e;}
 try{await step('runtime-cleanup.mjs');}catch(e){failure??=e;}
 clearTimeout(total);for(const timer of killTimers)clearTimeout(timer);
 process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);
}
await writeFile(path.join(backend,'.local/parallel-repeat-result.json'),JSON.stringify({passed:!failure,runs,accountsCreated:0,providerCalls:0})+'\n',{mode:0o600});
if(failure){console.error(failure.message);process.exitCode=1;}else console.log('12 tatsächliche parallele Regressionsläufe bestanden; eigener Stack gestoppt.');
