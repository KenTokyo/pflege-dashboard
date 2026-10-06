/** Real parallel RPCs in the actual owned Supabase DB; SQL claims, no Auth accounts. */
import { Client } from 'pg';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { redact } from './redact.mjs';
const backend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR??'/tmp',LANG:'en_US.UTF-8',
  SUPABASE_HOME:path.join(tmpdir(),'pflege-dashboard-supabase-57aea064-phase0'),SUPABASE_EXPERIMENTAL_STACK:'1'};
const status=await promisify(execFile)(path.join(backend,'node_modules/.bin/supabase'),
  ['status','--output-format','json'],{cwd:path.join(backend,'.local/supabase-project'),env,timeout:20000});
const info=JSON.parse(status.stdout); // secrets stay in memory; never persist raw status
const dbUrl=info.env?.DB_URL??info.endpoints?.['database.sql']?.url;
const endpoint=new URL(dbUrl);
assert.equal(endpoint.hostname,'127.0.0.1');assert.equal(endpoint.port,'56422');
const options={connectionString:dbUrl,connectionTimeoutMillis:10000,statement_timeout:10000,query_timeout:15000};
const owner=new Client({...options,application_name:'pflege_phase0_owner'});
const a=new Client({...options,application_name:'pflege_phase0_writer_a'});
const b=new Client({...options,application_name:'pflege_phase0_writer_b'});
const actor='12000000-0000-4000-8000-000000000001';
const membership='12000000-0000-4000-8000-000000000002';
const conversation='12000000-0000-4000-8000-000000000003';
const workspace='10000000-0000-4000-8000-000000000001';
const creator='10000000-0000-4000-8000-000000000002';
const claims=JSON.stringify({sub:'22000000-0000-4000-8000-000000000001',role:'authenticated'});
const clients=[owner,a,b];
let failure;
let checks=0;
let stage='connect';
try{
  await Promise.all(clients.map(client=>client.connect()));
  stage='fixtures';
  assert.equal((await owner.query('select count(*)::int as n from auth.users')).rows[0].n,0);checks++;
  await owner.query('begin');
  await owner.query("insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values($1,$2,$3,'user',$4,'SQL concurrency fixture')",
    [actor,workspace,creator,'22000000-0000-4000-8000-000000000001']);
  await owner.query("insert into public.workspace_memberships(id,workspace_id,created_by,profile_id) values($1,$2,$3,$4)",[membership,workspace,creator,actor]);
  await owner.query("insert into public.conversations(id,workspace_id,created_by,title) values($1,$2,$3,'SQL concurrency fixture')",[conversation,workspace,actor]);
  await owner.query('commit');
  stage='parallel-rpc';
  for(const client of [a,b]){
    await client.query('begin');await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claims',$1,true)",[claims]);
  }
  const first=await a.query('select revision from public.rename_conversation($1,$2,1)',[conversation,'Concurrent winner']);
  assert.equal(first.rows[0].revision,2);checks++;
  const second=b.query('select revision from public.rename_conversation($1,$2,1)',[conversation,'Concurrent stale'])
    .then(value=>({value}),error=>({error}));
  let waiting=false;
  for(let i=0;i<40;i++){
    const active=await owner.query("select wait_event_type from pg_stat_activity where application_name='pflege_phase0_writer_b'");
    if(active.rows.some(row=>row.wait_event_type==='Lock')){waiting=true;break;}
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.equal(waiting,true,'Second transaction really waited on the first row lock');checks++;
  await a.query('commit');
  const loser=await second;
  assert.equal(loser.error?.code,'40001');checks++;
  await b.query('rollback');
  const row=(await owner.query('select title,revision from public.conversations where id=$1',[conversation])).rows[0];
  assert.deepEqual(row,{title:'Concurrent winner',revision:2});checks++;
  const log=(await owner.query('select count(*)::int as n,min(created_by::text) as actor from public.audit_log where conversation_id=$1',[conversation])).rows[0];
  assert.deepEqual(log,{n:1,actor});checks++;
  assert.equal((await owner.query('select count(*)::int as n from auth.users')).rows[0].n,0);checks++;
}catch(error){failure=error;
  await writeFile(path.join(backend,'.local/concurrency-failure.log'),redact(`${stage}: ${error.message}\n`),{mode:0o600});
}finally{
  await Promise.allSettled([a,b].map(client=>client.query('rollback')));
  try{
    await owner.query('rollback');await owner.query('begin');
    await owner.query('delete from public.audit_log where conversation_id=$1',[conversation]);
    await owner.query('delete from public.conversations where id=$1',[conversation]);
    await owner.query('delete from public.workspace_memberships where id=$1',[membership]);
    await owner.query('delete from public.profiles where id=$1',[actor]);
    await owner.query('commit');
    const count=(await owner.query('select count(*)::int as n from public.profiles where id=$1',[actor])).rows[0].n;
    assert.equal(count,0);checks++;
  }catch(error){failure??=error;}
  await Promise.allSettled(clients.map(client=>client.end()));
}
const result={passed:!failure,checks,stage,scenario:'two real transactions; one accepted, one revision conflict; one audit',fixturesRemoved:!failure};
await writeFile(path.join(backend,'.local/concurrency-result.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(result));
if(failure){console.error(`Concurrency check failed (${failure.code??'assertion'}); no raw SQL/connection details printed.`);process.exitCode=1;}
