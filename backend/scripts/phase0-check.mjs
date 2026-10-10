/** One bounded real-Supabase run. Always stops and verifies the owned stack. */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
const backend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const startedAt=new Date().toISOString();
const results=[];
let active;
let interrupted=false;
const abort=()=>{interrupted=true;active?.kill('SIGTERM');};
process.once('SIGINT',abort);
process.once('SIGTERM',abort);
const total=setTimeout(abort,900_000);
async function step(file,args=[],limit=180_000){
  if(interrupted&&!((file==='scripts/supabase-safe.mjs'&&args[0]==='stop')||file==='scripts/runtime-cleanup.mjs'))throw new Error('Abgebrochen');
  console.log(`Prüfschritt: ${file} ${args.join(' ')}`);
  const timer=setTimeout(()=>active?.kill('SIGTERM'),limit);
  try{
    await new Promise((resolve,reject)=>{
      active=spawn(process.execPath,[file,...args],{cwd:backend,stdio:['ignore','inherit','inherit']});
      active.once('error',reject);
      active.once('close',(code,signal)=>code===0?resolve():reject(new Error(`Prüfschritt fehlgeschlagen: ${code??signal}`)));
    });
    results.push({file,args,passed:true});
  }catch(error){results.push({file,args,passed:false});throw error;
  }finally{clearTimeout(timer);active=null;}
}
let failure;
try{
  await step('scripts/supabase-safe.mjs',['start'],600_000);
  await step('scripts/supabase-safe.mjs',['reset'],300_000);
  await step('scripts/runtime-probe.mjs');
  if(!process.argv.includes('--schema-only')){
    await step('scripts/supabase-safe.mjs',['test']);
    await step('scripts/concurrency.mjs');
    await step('scripts/supabase-safe.mjs',['types']);
    await step('node_modules/tsc-rs/bin/tsc-rs',['--noEmit']);
    await step('node_modules/vitest/vitest.mjs',['run','--reporter=default','--reporter=json','--outputFile=.local/vitest-result.json']);
  }
}catch(error){failure=error;}finally{
  try{await step('scripts/supabase-safe.mjs',['stop']);}catch(error){failure??=error;}
  try{await step('scripts/runtime-cleanup.mjs');}catch(error){failure??=error;}
  clearTimeout(total);process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);
}
const evidence={startedAt,finishedAt:new Date().toISOString(),passed:!failure,scope:process.argv.includes('--schema-only')?'schema-only':'phase0',results};
if(!failure&&evidence.scope==='phase0'){
  const tap=await readFile(path.join(backend,'.local/supabase-test.log'),'utf8');
  evidence.sqlAssertions=Number(tap.match(/Files=\d+, Tests=(\d+)/)?.[1]);
  const unit=JSON.parse(await readFile(path.join(backend,'.local/vitest-result.json'),'utf8'));
  evidence.unitTestsPassed=unit.numPassedTests;
  evidence.parallel=JSON.parse(await readFile(path.join(backend,'.local/concurrency-result.json'),'utf8'));
}
await writeFile(path.join(backend,'.local/phase0-result.json'),JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
if(failure){console.error(failure.message);process.exitCode=1;}
else console.log('Phase-0-Prüflauf erfolgreich; eigener Stack gestoppt und geprüft.');
