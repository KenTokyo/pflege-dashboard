-- Rolled-back SQL fixtures. No Auth accounts/sessions and no provider contact.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values
 ('71000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','72000000-0000-4000-8000-000000000001','Synthetic context fixture');
insert into public.workspace_memberships(workspace_id,created_by,profile_id) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001');
insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values
 ('10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001',now(),now()+interval '8 hours');
insert into public.ai_models(id,workspace_id,created_by,provider,provider_model_id,display_name,enabled,status,capabilities_verified_at) values
 ('74000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','openai','context-fixture-no-call','SQL only',true,'operational',now());
insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,output_microusd_per_million,verified_at,expires_at,evidence_url) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','74000000-0000-4000-8000-000000000001',1,1,now(),now()+interval '1 day','https://example.invalid/context-fixture');
update public.workspace_budgets set monthly_cap_microusd=100000000,blocked=false;
insert into public.conversations(id,workspace_id,created_by,title,care_recipient_id,model_override_id) values
 ('75000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','Synthetic order','10000000-0000-4000-8000-000000000020','74000000-0000-4000-8000-000000000001');
-- Both pairs share the timestamp, and both assistant UUIDs sort before user UUIDs.
insert into public.messages(id,workspace_id,created_by,conversation_id,role,content,client_request_id,model_id,model_snapshot,prompt_version_id) values
 ('76000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','user','Question A','77000000-0000-4000-8000-000000000001',null,null,null),
 ('76000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','assistant','Answer A','77000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000001','{}',(select id from public.prompt_versions where workspace_id='10000000-0000-4000-8000-000000000001' and is_default)),
 ('76000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','user','Question B','77000000-0000-4000-8000-000000000002',null,null,null),
 ('76000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','assistant','Answer B','77000000-0000-4000-8000-000000000002','74000000-0000-4000-8000-000000000001','{}',(select id from public.prompt_versions where workspace_id='10000000-0000-4000-8000-000000000001' and is_default));
insert into public.tasks(workspace_id,created_by,care_recipient_id,title,status) values
 ('10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000020','CTX_OPEN','open'),
 ('10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000020','CTX_PROGRESS','in_progress'),
 ('10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000020','CTX_DONE','done'),
 ('10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000020','CTX_CANCELLED','cancelled');
create temporary table prepared_context as select private.chat_prepare(
 '10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001',
 '75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Current question') as value;
select is((select count(distinct created_at)::int from public.messages where conversation_id='75000000-0000-4000-8000-000000000001'),1,'Same transaction timestamps reproduce UUID ordering hazard');
select is((select value->'context'->'input' from prepared_context),
 '[{"role":"user","content":"Question A"},{"role":"assistant","content":"Answer A"},{"role":"user","content":"Question B"},{"role":"assistant","content":"Answer B"},{"role":"user","content":"Current question"}]'::jsonb,
 'Context keeps request pairs and question before answer despite reversed UUIDs');
select ok((select value->'context'->>'instructions' like '%CTX_OPEN%' and value->'context'->>'instructions' like '%CTX_PROGRESS%' from prepared_context),'Open and in-progress tasks remain in context');
select ok((select value->'context'->>'instructions' not like '%CTX_DONE%' from prepared_context),'Done tasks excluded');
select ok((select value->'context'->>'instructions' not like '%CTX_CANCELLED%' from prepared_context),'Cancelled tasks excluded');
select is((select count(*)::int from public.chat_requests where client_request_id='78000000-0000-4000-8000-000000000001'),1,'New context still creates exactly one request');
select is((select count(*)::int from public.cost_reservations where request_id='78000000-0000-4000-8000-000000000001'),1,'New context still reserves once');
select ok((select context_snapshot=value->'context' from public.chat_requests,prepared_context where client_request_id='78000000-0000-4000-8000-000000000001'),'Executed context equals immutable stored context');
select is((select count(*)::int from public.audit_log where request_id='78000000-0000-4000-8000-000000000001'),1,'Context start audited once');
select ok(not has_function_privilege('authenticated','private.chat_prepare(uuid,uuid,uuid,uuid,uuid,text)','EXECUTE'),'Replacement preserves browser denial');
select ok(not has_function_privilege('pflege_backend','private.chat_prepare(uuid,uuid,uuid,uuid,uuid,text)','EXECUTE'),'Replacement preserves private-core denial for Node');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','failed','Partial answer',10,5,'different')->>'status','failed','Known mismatched model cannot finish successfully');
select is((select provider_response_model from public.messages where client_request_id='78000000-0000-4000-8000-000000000001' and role='assistant'),'different','Known mismatched model is retained');
select ok((select blocked from public.workspace_budgets where workspace_id='10000000-0000-4000-8000-000000000001'),'Known rejected usage blocks future workspace spending');
select is((select status::text from public.cost_reservations where request_id='78000000-0000-4000-8000-000000000001'),'held','Known rejected usage conservatively holds full reservation');
select is((select count(*)::int from auth.users),0,'No Auth users');
select is((select count(*)::int from auth.sessions),0,'No Auth sessions');
select * from finish();
rollback;
