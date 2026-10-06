import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
/** Schema only, no row content or secrets. Stable against generated constraint names. */
export async function fingerprint(client, phase0Only = true) {
  const filter = phase0Only
    ? "and table_name not in ('conversation_requests','session_activity','model_prices','chat_requests') and not(table_name='messages' and column_name='provider_response_model') and not(table_name='workspace_budgets' and column_name='total_cap_microusd')"
    : "";
  const tableFilter = phase0Only
    ? "and t.relname not in ('conversation_requests','session_activity','model_prices','chat_requests')"
    : "";
  const policyFilter = phase0Only
    ? "and tablename not in ('conversation_requests','session_activity','model_prices','chat_requests')"
    : "";
  const cols = (await client.query(
    `select table_name,column_name,data_type,udt_name,is_nullable,column_default,is_generated,generation_expression from information_schema.columns where table_schema='public' ${filter} order by table_name,ordinal_position`,
  )).rows;
  // Phase-0 comparison excludes the explicitly later unlimited-budget nullable change.
  // The full Phase-1 fingerprint below keeps the actual nullable value.
  if (phase0Only) for (const col of cols) {
    if (col.table_name === "workspace_budgets" && col.column_name === "monthly_cap_microusd") col.is_nullable = "NO";
  }
  const constraints = (await client.query(
    `select t.relname as table_name,pg_get_constraintdef(c.oid,true) as definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' ${tableFilter} order by t.relname,pg_get_constraintdef(c.oid,true)`,
  )).rows.filter((constraint) => !(phase0Only &&
    constraint.table_name === "workspace_budgets" &&
    constraint.definition === "CHECK (total_cap_microusd >= 0)"));
  const policies = (await client.query(
    `select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' ${policyFilter} order by tablename,policyname`,
  )).rows;
  const migrationDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../supabase/migrations",
  );
  const functionNames = [];
  for (
    const file of (await readdir(migrationDir)).filter((f) =>
      f.endsWith(".sql")
    )
  ) {
    const sql = await readFile(path.join(migrationDir, file), "utf8");
    for (
      const m of sql.matchAll(
        /create(?: or replace)? function (public|private)\.([a-z_]+)/gi,
      )
    ) functionNames.push(m[1] + "." + m[2]);
  }
  const functions = phase0Only ? [] : (await client.query(
    "select pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname||'.'||p.proname)=any($1) and p.prokind='f' order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)",
    [functionNames],
  )).rows;
  const triggers = phase0Only ? [] : (await client.query(
    "select pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname,t.tgname",
  )).rows;
  const functionPrivileges = phase0Only ? [] : (await client.query(
    "select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as name,has_function_privilege('anon',p.oid,'EXECUTE') as anon,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated,has_function_privilege('service_role',p.oid,'EXECUTE') as service,case when to_regrole('pflege_backend') is null then false else has_function_privilege('pflege_backend',p.oid,'EXECUTE') end as node from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname||'.'||p.proname)=any($1) and p.prokind='f' order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)",
    [functionNames],
  )).rows;
  return JSON.stringify({
    cols,
    constraints,
    policies,
    functions,
    triggers,
    functionPrivileges,
  });
}
