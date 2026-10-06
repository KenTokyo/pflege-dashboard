/** Actual own native ten -> current upgrade; never hosted, always targeted cleanup. */
import {spawn} from 'node:child_process';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {backend,localClient} from './local-db.mjs';
import {fingerprint} from './schema-fingerprint.mjs';
const checks=[];let active,interrupted=false,db;let failure;
const abort=()=>{interrupted=true;active?.kill('SIGTERM');};
process.once('SIGTERM',abort);process.once('SIGINT',abort);
const overall=setTimeout(abort,300000);
async function run(action,args=[]){
 if(interrupted&&action!=='stop'&&action!=='cleanup')throw Error('Unterbrochen');
 await new Promise((resolve,reject)=>{
  active=spawn(process.execPath,[action==='cleanup'?'scripts/runtime-cleanup.mjs':'scripts/supabase-safe.mjs',...(action==='cleanup'?[]:[action,...args])],{cwd:backend,stdio:['ignore','inherit','inherit']});
  const timer=setTimeout(()=>active?.kill('SIGTERM'),120000);
  active.once('error',reject);active.once('close',c=>{clearTimeout(timer);active=null;c===0?resolve():reject(Error('Eigener Upgrade-Prüfschritt fehlgeschlagen'));});
 });
}
const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
try{
 const baseline=JSON.parse(await readFile(path.join(backend,'.local/schema-baseline.json'),'utf8'));
 await run('start',['--session-base']);await run('reset',['--session-base']);
 db=await localClient('pflege_remember_ten_to_eleven');
 const before=await fingerprint(db,true),fullBefore=await fingerprint(db,false);
 check((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n===10,'Actual ten historical migrations before upgrade');
 const rows=async()=>JSON.stringify((await db.query(`select (select count(*) from auth.users) as users,(select count(*) from auth.sessions) as sessions,
  (select count(*) from public.care_recipients) as people,(select count(*) from public.messages) as messages,
  (select row_to_json(b) from public.workspace_budgets b) as budget`)).rows[0]);
 const seedBefore=await rows();
 // Real pre-existing app session fixture: no Auth row/account is manufactured.
 await db.query(`insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values
 ('31000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','32000000-0000-4000-8000-000000000001','Upgrade fixture');
 insert into public.workspace_memberships(workspace_id,created_by,profile_id) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000001');
 insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values('10000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001',now(),now()+interval '7 hours');`);
 const original=(await db.query('select id,expires_at,last_interaction_at from public.session_activity')).rows[0];
 const additions=(await readdir(path.resolve(backend,'../supabase/migrations'))).filter(f=>f.endsWith('.sql')&&f>='20261006162000').sort();
 for(const file of additions){
 const sql=await readFile(path.resolve(backend,'../supabase/migrations',file),'utf8');
 await db.query(sql);
 await db.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',[file.slice(0,14),file.slice(15,-4),[sql]]);
 }
 check(await fingerprint(db,true)===before,'Historical Phase-0 structure remains unchanged');
 check(await fingerprint(db,false)!==fullBefore,'Full schema detects the actual session/date change');
 check(await fingerprint(db,false)===baseline.phase1,'Actual upgraded schema equals freshly reset current-migration baseline');
 check(await rows()===seedBefore,'Existing seed, messages, zero budgets and no Auth accounts preserved');
 const existing=(await db.query('select id,expires_at,last_interaction_at,remember_session from public.session_activity')).rows[0];
 check(existing.remember_session===false,'Pre-existing session stays standard without silent opt-in');
 delete existing.remember_session;
 check(JSON.stringify(existing)===JSON.stringify(original),'Existing session identity/activity/deadline unchanged');
 check((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n===10+additions.length,'All current journalled migrations');
 check((await db.query(`select has_function_privilege('pflege_backend','public.edge_session(uuid,uuid,uuid,text,boolean)','EXECUTE') allowed,
  has_function_privilege('authenticated','public.edge_session(uuid,uuid,uuid,text,boolean)','EXECUTE') browser,
  has_function_privilege('pflege_backend','private.session_touch(uuid,uuid,uuid,text,boolean,timestamptz,timestamptz)','EXECUTE') bypass`)).rows.every(r=>r.allowed&&!r.browser&&!r.bypass),'New wrapper permitted only through fixed role and real Auth, private clock denied');
 // Equivalent proof is not weakened to ignore function bodies or new permissions.
 await db.query('BEGIN');try{
  await db.query('grant execute on function public.edge_session(uuid,uuid,uuid,text,boolean) to authenticated');
  check(await fingerprint(db,false)!==baseline.phase1,'Negative permission drift is still detected');
 }finally{await db.query('ROLLBACK');}
 check(await fingerprint(db,false)===baseline.phase1,'Negative fixture rolled back, full structure intact');
 await db.query(`delete from public.session_activity where created_by='31000000-0000-4000-8000-000000000001';
 delete from public.workspace_memberships where profile_id='31000000-0000-4000-8000-000000000001';
 delete from public.profiles where id='31000000-0000-4000-8000-000000000001';`);
 check((await db.query("select count(*)::int n from public.profiles where id='31000000-0000-4000-8000-000000000001'")).rows[0].n===0,'Own additive-upgrade fixtures removed before shutdown');
}catch(e){failure=e;}finally{
 await db?.end();
 try{await run('stop');}catch(e){failure??=e;}
 try{await run('cleanup');}catch(e){failure??=e;}
 clearTimeout(overall);process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);
}
await writeFile(path.join(backend,'.local/session-upgrade-result.json'),JSON.stringify({passed:!failure,checks,hostedWrites:0})+'\n',{mode:0o600});
if(failure){console.error(failure.message);process.exitCode=1;}else console.log(`${checks.length} tatsächliche Zehn-zu-aktuell-Upgradeprüfungen bestanden; eigener Stack beendet.`);
