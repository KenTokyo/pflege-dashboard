-- No login identity: verify the dedicated NOLOGIN server permission role.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select ok(exists(select 1 from pg_roles where rolname='pflege_backend' and not rolcanlogin and not rolsuper and not rolinherit and not rolbypassrls and not rolcreatedb and not rolcreaterole and not rolreplication),'Node role has no login, ownership escalation or RLS bypass');
select ok(pg_has_role('postgres','pflege_backend','MEMBER'),'trusted own connection can SET ROLE');
select ok(not pg_has_role('authenticated','pflege_backend','MEMBER'),'browser cannot SET ROLE into Node');
select ok(not pg_has_role('anon','pflege_backend','MEMBER'),'anon cannot SET ROLE into Node');
select ok(has_function_privilege('pflege_backend',p.oid,'EXECUTE'),'Node can call fixed wrapper '||p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'edge_%';
select ok(not has_function_privilege('pflege_backend',p.oid,'EXECUTE'),'Node cannot call browser write RPC '||p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('create_conversation','assign_conversation_recipient','rename_conversation','set_conversation_preferences','mark_document_status','update_agent_settings');
select ok(not has_schema_privilege('pflege_backend',n,'USAGE'),'no direct private schema access '||n) from unnest(array['private','auth','storage']) n;
select ok(not has_table_privilege('pflege_backend',quote_ident('public')||'.'||quote_ident(tablename),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),'no direct table privileges '||tablename) from pg_tables where schemaname='public';
-- Test-only pgTAP namespace access; rolled back below, absent in production.
grant usage on schema extensions to pflege_backend;
set local role pflege_backend;
select throws_ok($q$select * from public.profiles$q$,'42501',null,'direct profile read denied');
select throws_ok($q$insert into public.audit_log(workspace_id,created_by,action) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','spoof')$q$,'42501',null,'direct audit write denied');
select throws_ok($q$select private.chat_prepare(null,null,null,null,null,'x')$q$,'42501',null,'private session-bypassing core denied');
select throws_ok($q$select public.edge_chat_check('10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003')$q$,'28000','SESSION_EXPIRED','allowed wrapper still validates actual Auth session');
reset role;
select is((select count(*)::int from auth.users),0,'NOLOGIN permission role did not create an Auth account');
select * from finish();
rollback;
