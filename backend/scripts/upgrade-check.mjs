/** Actual historical eight -> all current additive migrations. Only own native DB; existing rows retained. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {localClient,backend} from './local-db.mjs';
import {fingerprint} from './schema-fingerprint.mjs';
const db=await localClient('pflege_historical_upgrade_regression');
const checks=[];
const check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
try {
 const baseline=JSON.parse(await readFile(path.join(backend,'.local/schema-baseline.json'),'utf8'));
 const before=await fingerprint(db,true);
 const fullBefore=await fingerprint(db,false);
 const journal=(await db.query('select version from supabase_migrations.schema_migrations order by version')).rows;
 check(journal.length===8,'Starts with exactly the actual eight historical migrations');
 const rows=async()=>JSON.stringify((await db.query(`select (select count(*) from auth.users) as users,
  (select count(*) from public.care_recipients) as recipients,(select count(*) from public.tasks) as tasks,
  (select count(*) from public.messages) as messages,(select monthly_cap_microusd from public.workspace_budgets) as budget`)).rows[0]);
 const seedBefore=await rows();
 const additions=(await readdir(path.resolve(backend,'../supabase/migrations'))).filter(f=>f.endsWith('.sql')&&f>='20261006160000').sort();
 for(const file of additions) {
  const sql=await readFile(path.resolve(backend,'../supabase/migrations',file),'utf8');
  await db.query(sql); // Separate committed enum migration before enum label is used.
  await db.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',[file.slice(0,14),file.slice(15,-4),[sql]]);
 }
 const after=await fingerprint(db,true),fullAfter=await fingerprint(db,false);
 check(before===after,'Historical Phase-0 fingerprint stays equal across the additive upgrade');
 check(fullBefore!==fullAfter,'Full Phase-1 fingerprint detects actual new schema');
 check(fullAfter===baseline.phase1,'Upgraded schema exactly equals the independently fresh full current-migration baseline');
 check(await rows()===seedBefore,'Existing rows, messages and zero budget remain unchanged');
 const constraints=JSON.parse(fullAfter).constraints;
 check(constraints.some(c=>c.table_name==='workspace_budgets'&&c.definition==='CHECK (total_cap_microusd >= 0)'), 'Full fingerprint retains total-cap CHECK');
 check(JSON.parse(after).constraints.some(c=>c.table_name==='workspace_budgets'&&c.definition==='CHECK (monthly_cap_microusd >= 0)'), 'Historical fingerprint retains original monthly CHECK');
 // Negative control: ignore only the exact intended new CHECK, never other drift.
 await db.query('BEGIN');
 try{
  await db.query('alter table public.workspace_budgets drop constraint workspace_budgets_total_cap_microusd_check');
  await db.query('alter table public.workspace_budgets add constraint workspace_budgets_total_cap_microusd_check check (total_cap_microusd>=1)');
  check(await fingerprint(db,true)!==after,'Different total-cap constraint still fails historical comparison');
  check(await fingerprint(db,false)!==fullAfter,'Full comparison detects altered total-cap constraint');
 }finally{await db.query('ROLLBACK');}
 await db.query('BEGIN');
 try{
  await db.query('alter table public.workspace_budgets drop constraint workspace_budgets_monthly_cap_microusd_check');
  check(await fingerprint(db,true)!==after,'Historical comparison still rejects missing original monthly constraint');
 }finally{await db.query('ROLLBACK');}
 check(await fingerprint(db,false)===fullAfter,'Negative drift fixtures rolled back; full schema restored');
 const final=(await db.query('select version from supabase_migrations.schema_migrations order by version')).rows;
 check(final.length===8+additions.length,'Ends with all current actual journalled migrations');
 await writeFile(path.join(backend,'.local/upgrade-result.json'),JSON.stringify({passed:true,checks,hostedWrites:0},null,2)+'\n',{mode:0o600});
 console.log(`${checks.length} echte historische Upgradeprüfungen bestanden; voller Driftvergleich erhalten.`);
}finally{await db.end();}
