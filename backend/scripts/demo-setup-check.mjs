/** Operator-only SQL setup proof in a rolled-back own Supabase transaction. No account/provider. */
import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import {backend,localClient} from './local-db.mjs';
const db=await localClient('pflege_demo_setup_regression');
const assertions=[];
const check=(condition,name)=>{if(!condition)throw Error(name);assertions.push(name);};
try{
 const sql=(await readFile(path.resolve(backend,'../supabase/demo-deepseek-setup.sql'),'utf8')).replace(/^begin;$/m,'').replace(/^commit;$/m,'');
 await db.query('BEGIN');
 await db.query('update public.workspace_budgets set blocked=true');
 await db.query(sql);
 const state=async()=> (await db.query(`select (select count(*) from public.ai_models where provider='deepseek')::int as models,
  (select count(*) from public.model_prices)::int as prices,
  (select count(*) from public.agent_setting_versions)::int as versions,
  (select count(*) from public.audit_log where action='demo.deepseek.configured')::int as audits,
  (select count(*) from auth.users)::int as users,
  (select count(*) from public.workspace_memberships)::int as memberships,
  (select monthly_cap_microusd is null and total_cap_microusd is null from public.workspace_budgets) as unlimited,
  (select blocked from public.workspace_budgets) as blocked,
  (select provider from public.ai_models m join public.agent_setting_versions v on v.default_model_id=m.id
    join public.agent_settings s on s.current_version_id=v.id) as provider`)).rows[0];
 const first=await state(); await db.query(sql);const second=await state();
 check(JSON.stringify(first)===JSON.stringify(second),'Repeated setup is idempotent');
 check(second.models===1&&second.prices===1,'One DeepSeek registry and price version');
 check(second.versions===2&&second.audits===1,'One settings version change and setup audit');
 check(second.unlimited,'User choice explicitly unlimited');
 check(second.blocked,'Existing safety block preserved');
 check(second.users===0&&second.memberships===0,'No accounts or memberships created');
 check(second.provider==='deepseek','Workspace default selected DeepSeek');
 await db.query('ROLLBACK');
 const budget=(await db.query('select monthly_cap_microusd,total_cap_microusd from public.workspace_budgets')).rows[0];
 check(budget.monthly_cap_microusd==='0'&&budget.total_cap_microusd===null,'Original zero seed budget restored by rollback');
 await writeFile(path.join(backend,'.local/demo-setup-result.json'),JSON.stringify({passed:true,checks:assertions},null,2)+'\n',{mode:0o600});
 console.log(`${assertions.length} Demo-Setup-Prüfungen bestanden; sämtliche Teständerungen zurückgerollt.`);
}finally{await db.end();}
