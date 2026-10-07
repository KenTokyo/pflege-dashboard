begin;
select plan(18);
-- Only application identities and synthetic SQL claims; no Auth accounts or login sessions.
insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values
 ('71000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','72000000-0000-4000-8000-000000000001','Normal staff test member');
insert into public.workspace_memberships(workspace_id,created_by,profile_id,role) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','member');
insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values
 ('10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001',now(),now()+interval '8 hours');
insert into public.ai_models(id,workspace_id,created_by,provider,provider_model_id,display_name,enabled,status,capabilities_verified_at) values
 ('74000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','gemini','gemini-3.8-flash','SQL fixture only',true,'operational',now());
insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,output_microusd_per_million,verified_at,expires_at,evidence_url) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','74000000-0000-4000-8000-000000000001',0,0,now(),'infinity','https://example.invalid/sql-fixture');
update public.workspace_budgets set monthly_cap_microusd=null,total_cap_microusd=null;
update public.conversations set model_override_id='74000000-0000-4000-8000-000000000001';
select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000050','78000000-0000-4000-8000-000000000001','Synthetic fixture, no provider call');
select private.chat_finish('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','completed','Synthetic response',34,1200,'gemini-3.8-flash');
select is((select output_tokens from public.usage_ledger),1200::bigint,'Separate Gemini output bound preserves native thinking+candidate usage over 1024');
select ok((select not blocked from public.workspace_budgets),'Honest Gemini thinking usage causes no false model block');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::int from public.usage_ledger),0,'Normal member still cannot read raw ledger rows');
select throws_ok($$select * from public.chat_requests$$,'42501',null,'Raw request rows remain server-only');
create temporary table staff as select public.staff_overview('10000000-0000-4000-8000-000000000001') as value;
select is((select value->'totals'->>'careRecipients' from staff),'1','Normal member sees real person count');
select is((select value->'totals'->>'openTasks' from staff),'2','Normal member sees real task count');
select is((select value->'totals'->>'conversations' from staff),'1','Stored seed conversation count is independent from generated answers');
select is((select value->'totals'->>'completedRequests' from staff),'1','Real completed request fixture counted');
select is((select value->'totals'->>'inputTokens' from staff),'34','Privilege-scoped aggregate preserves actual token sum');
select is((select value->'totals'->>'outputTokens' from staff),'1200','Aggregate does not replace unavailable direct ledger with zero');
select is((select value->'people'->0->>'completedAnswers' from staff),'1','Per-person answers require completed request, message and usage row');
select is((select jsonb_array_length(value->'usage') from staff),1,'Exactly one model has recorded usage');
select throws_ok($$select public.staff_overview('90000000-0000-4000-8000-000000000001')$$,'42501','WORKSPACE_FORBIDDEN','Member cannot select another workspace');
select set_config('request.jwt.claims','{"sub":"72000000-0000-4000-8000-000000000009","role":"authenticated","user_metadata":{"role":"admin"}}',true);
select throws_ok($$select public.staff_overview('10000000-0000-4000-8000-000000000001')$$,'42501','WORKSPACE_FORBIDDEN','Unrelated user metadata cannot grant staff access');
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.staff_overview('10000000-0000-4000-8000-000000000001')$$,'42501','AUTH_REQUIRED','Authenticated role without user claim is denied');
reset role;
select ok(not has_function_privilege('anon','public.staff_overview(uuid)','EXECUTE'),'Anonymous callers have no staff RPC privilege');
select ok(not has_function_privilege('pflege_backend','private.rpc_staff_overview(uuid)','EXECUTE'),'RPC-only runtime role gains no new staff bypass');
select ok((select count(*) from auth.users)=0 and (select count(*) from auth.sessions)=0,'SQL checks created no Auth account or session');
select * from finish();
rollback;
