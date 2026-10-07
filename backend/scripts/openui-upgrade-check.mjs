/** Native sixteen -> seventeen upgrade, preserved real SQL rows; no accounts/hosting/provider. */
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { backend, localClient } from './local-db.mjs';
import { fingerprint } from './schema-fingerprint.mjs';
import { OPENUI_INSTRUCTIONS, TEXT_STYLE_INSTRUCTIONS, parseOpenUi } from '../.local/build/types/openui.js';
let active, db, failure, interrupted=false;
const checks=[];
const abort=()=>{interrupted=true;active?.kill('SIGTERM');};
process.once('SIGINT',abort);process.once('SIGTERM',abort);
const total=setTimeout(abort,300000);
async function run(action,args=[]){
  if(interrupted&&!['stop','cleanup'].includes(action))throw Error('Unterbrochen');
  await new Promise((resolve,reject)=>{
    active=spawn(process.execPath,[action==='cleanup'?'scripts/runtime-cleanup.mjs':'scripts/supabase-safe.mjs',...(action==='cleanup'?[]:[action,...args])],{cwd:backend,stdio:['ignore','inherit','inherit']});
    const t=setTimeout(()=>active?.kill('SIGTERM'),120000);
    active.once('error',reject);active.once('close',c=>{clearTimeout(t);active=null;c===0?resolve():reject(Error('Eigener Upgradeprüfschritt fehlgeschlagen'));});
  });
}
const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
const ws='10000000-0000-4000-8000-000000000001',person='10000000-0000-4000-8000-000000000002',chat='10000000-0000-4000-8000-000000000050',
  profile='91000000-0000-4000-8000-000000000001',user='92000000-0000-4000-8000-000000000001',session='93000000-0000-4000-8000-000000000001',
  request='94000000-0000-4000-8000-000000000001',next='94000000-0000-4000-8000-000000000002';
try{
  const baseline=JSON.parse(await readFile(path.join(backend,'.local/schema-baseline.json'),'utf8'));
  await run('start',['--openui-base']);await run('reset',['--openui-base']);
  db=await localClient('pflege_openui_sixteen_to_seventeen');
  check((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n===16,'Actual sixteen-migration pre-existing Supabase');
  const before=await fingerprint(db,true);
  await db.query(`insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values($1,$2,$3,'user',$4,'Synthetic SQL-only upgrade member')`,[profile,ws,person,user]);
  await db.query('insert into public.workspace_memberships(workspace_id,created_by,profile_id) values($1,$2,$3)',[ws,person,profile]);
  await db.query("insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values($1,$2,$3,now(),now()+interval '7 hours')",[ws,profile,session]);
  await db.query((await readFile(path.resolve(backend,'../supabase/demo-opencode-setup.sql'),'utf8')).replace(/^begin;$/m,'').replace(/^commit;$/m,''));
  await db.query('select private.chat_prepare($1,$2,$3,$4,$5,$6)',[ws,user,session,chat,request,'Historical normal response']);
  await db.query("select private.chat_finish($1,$2,$3,'completed',$4,34,12,'deepseek-flash')",[ws,user,request,'Old **answer** and *notice*']);
  const data=async()=>{
    const values=[];
    for(const table of ['messages','chat_requests','usage_ledger','cost_reservations','ai_models','model_prices','agent_settings','agent_setting_versions','workspace_budgets','session_activity'])
      values.push((await db.query(`select ${table==='messages'?"to_jsonb(t)-'presentation'":'to_jsonb(t)'} from public.${table} t order by id`)).rows);
    return JSON.stringify(values);
  };
  const storedBefore=await data();
  const sql=await readFile(path.resolve(backend,'../supabase/migrations/20261007214239_openui_presentation.sql'),'utf8');
  await db.query(sql);
  await db.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',['20261007214239','openui_presentation',[sql]]);
  check((await data())===storedBefore,'Existing answers, sources, origin, snapshots, ledger, defaults, budgets and session unchanged');
  check((await db.query('select count(*)::int n from public.messages where presentation is not null')).rows[0].n===0,'Historical normal responses keep null presentation');
  check(await fingerprint(db,true)===before,'Historical schema including original RLS unchanged');
  check(await fingerprint(db,false)===baseline.phase1,'Sixteen-upgraded schema exactly matches fresh full seventeen baseline');
  const old=(await db.query('select private.chat_prepare($1,$2,$3,$4,$5,$6,$7,$8) value',[ws,user,session,chat,request,'Historical normal response','text',TEXT_STYLE_INSTRUCTIONS])).rows[0].value;
  check(old.replayed&&old.content==='Old **answer** and *notice*'&&old.presentation===null&&old.context.responseFormat===undefined,'New runtime replays unchanged historical text hash without a provider');
  try{await db.query('select private.chat_prepare($1,$2,$3,$4,$5,$6,$7,$8)',[ws,user,session,chat,request,'Historical normal response','openui',OPENUI_INSTRUCTIONS]);throw Error('Expected idempotency conflict');}
  catch(e){check(e.code==='23505','Historical request cannot silently change to UI format');}
  const prepared=(await db.query('select private.chat_prepare($1,$2,$3,$4,$5,$6,$7,$8) value',[ws,user,session,chat,next,'UI question','openui',OPENUI_INSTRUCTIONS])).rows[0].value;
  check(prepared.context.responseFormat==='openui'&&prepared.context.catalogVersion==='pflege-openui-v1'&&prepared.context.instructions.includes(OPENUI_INSTRUCTIONS),'Actual generated catalogue is reserved in trusted immutable context');
  check(prepared.context.input.some(x=>x.content==='Old **answer** and *notice*'),'Next model context preserves canonical history and emphasis');
  const source='root = Answer([Text("**Antrag** prüfen"), Notice("Einordnung", "*Frist unbestätigt.*")])';
  const parsed=parseOpenUi(source);
  check(parsed.state==='valid','Official parser and restrictive gate accept real catalogue fixture');
  const presentation={format:'openui',catalogVersion:'pflege-openui-v1',source,state:'valid'};
  const result=(await db.query("select private.chat_finish($1,$2,$3,'completed',$4,34,20,'deepseek-flash',$5::jsonb) value",[ws,user,next,parsed.text,JSON.stringify(presentation)])).rows[0].value;
  check(result.status==='completed','Canonical answer and source finalized with known original usage');
  const replay=(await db.query('select private.chat_prepare($1,$2,$3,$4,$5,$6,$7,$8) value',[ws,user,session,chat,next,'UI question','openui','Later prompt ignored by replay'])).rows[0].value;
  check(replay.replayed&&replay.content===parsed.text&&JSON.stringify(replay.presentation)===JSON.stringify({...replay.presentation,source}), 'Presentation source and canonical text survive actual replay');
  check((await db.query('select count(*)::int n from auth.users')).rows[0].n===0&&(await db.query('select count(*)::int n from auth.sessions')).rows[0].n===0,'No Auth accounts or Auth sessions manufactured');
  check((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n===17,'Exactly one new journalled migration');
  await db.query('delete from public.usage_ledger where request_id=any($1::uuid[])',[ [request,next] ]);
  for(const [table,key] of [['chat_requests','client_request_id'],['audit_log','request_id'],['messages','client_request_id'],['cost_reservations','request_id']])
    await db.query(`delete from public.${table} where ${key}=any($1::uuid[])`,[[request,next]]);
  await db.query('delete from public.session_activity where created_by=$1',[profile]);
  await db.query('delete from public.workspace_memberships where profile_id=$1',[profile]);
  await db.query('delete from public.profiles where id=$1',[profile]);
  check((await db.query('select count(*)::int n from public.profiles where id=$1',[profile])).rows[0].n===0,'Own SQL-only member and answer fixtures removed');
}catch(e){failure=e;}finally{
  await db?.end();try{await run('stop');}catch(e){failure??=e;}try{await run('cleanup');}catch(e){failure??=e;}
  clearTimeout(total);process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);
}
await writeFile(path.join(backend,'.local/openui-upgrade-result.json'),JSON.stringify({passed:!failure,checks,hostedWrites:0,providerCalls:0})+'\n',{mode:0o600});
if(failure){console.error(failure.message);process.exitCode=1;}else console.log(`${checks.length} echte Sechzehn-zu-siebzehn-Upgradeprüfungen bestanden; eigener Stack beendet.`);
