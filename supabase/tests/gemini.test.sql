begin;
select plan(27);
insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values
 ('71000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','72000000-0000-4000-8000-000000000001','Synthetic Gemini fixture');
insert into public.workspace_memberships(workspace_id,created_by,profile_id) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001');
insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values
 ('10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001',now(),now()+interval '8 hours');
insert into public.ai_models(id,workspace_id,created_by,provider,provider_model_id,display_name,enabled,status,capabilities_verified_at) values
 ('74000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','gemini','gemini-3.8-flash','SQL fixture only',true,'operational',now());
insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,output_microusd_per_million,verified_at,expires_at,evidence_url) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','74000000-0000-4000-8000-000000000001',0,0,now(),'infinity','https://ai.google.dev/gemini-api/docs/pricing');
update public.workspace_budgets set monthly_cap_microusd=null,total_cap_microusd=null,blocked=false;
insert into public.conversations(id,workspace_id,created_by,title,care_recipient_id,model_override_id) values
 ('75000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','Synthetic Gemini','10000000-0000-4000-8000-000000000020','74000000-0000-4000-8000-000000000001');
select set_config('pflege.available_providers','["opencode"]',true);
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Question')$$,'P0001','PROVIDER_NOT_CONFIGURED','Other key cannot authorize Gemini');
select is((select count(*)::int from public.cost_reservations),0,'Missing Gemini key has no reservation');
select set_config('pflege.available_providers','["gemini"]',true);
create temporary table prepared as select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Question') as value;
select is((select value->'context'->'model'->>'provider' from prepared),'gemini','Selected provider snapshotted');
select is((select value->'context'->'acceptedResponseModelIds' from prepared),'["gemini-3.8-flash"]'::jsonb,'Only operator-verified model identity accepted');
select ok((select (value->'context'->>'inputTokenBound')::bigint>0 from prepared),'Input has a conservative bound before online tokenizer');
select is((select amount_microusd from public.cost_reservations),0::bigint,'User-confirmed free tier records a zero monetary reservation');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','completed','Answer',34,17,'gemini-3.8-flash')->>'status','completed','Actual provider usage completes');
select is((select output_tokens from public.usage_ledger),17::bigint,'Thought and visible output tokens are recorded together');
select is((select cost_microusd from public.usage_ledger),0::bigint,'Free-tier monetary estimate stays zero');
select ok((select estimated from public.usage_ledger),'Zero price is honestly an operator free-tier estimate');
select is((select provider_response_model from public.messages where role='assistant'),'gemini-3.8-flash','Actual response model persists');
select is(private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Question')->>'content','Answer','Completed request replay persists its original model and content');
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Changed')$$,'23505','IDEMPOTENCY_CONFLICT','Request ID cannot be reused for another content');
create temporary table aborted as select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000002','Aborted');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000002','interrupted','Partial',null,null,'gemini-3.8-flash')->>'status','interrupted','Abort is never completed');
select is((select status::text from public.cost_reservations where request_id='78000000-0000-4000-8000-000000000002'),'held','Unknown final usage retains reservation');
select ok((select not blocked from public.workspace_budgets),'Unknown usage does not invent a mismatch or cost block');
create temporary table wrong_model as select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000003','Wrong model');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000003','completed','',34,17,'gemini-other')->>'status','failed','Wrong actual model cannot complete');
select ok((select blocked from public.workspace_budgets),'Known mismatch keeps existing protective accounting block');
select is((select count(*)::int from public.usage_ledger),1,'Rejected mismatch invents no monetary usage');
select is((select provider_response_model from public.messages where client_request_id='78000000-0000-4000-8000-000000000003' and role='assistant'),'gemini-other','Rejected actual identity remains visible to audit');
select ok(not has_table_privilege('authenticated','public.model_prices','INSERT,UPDATE,DELETE'),'Browser cannot fake a free tier price');
select ok(not has_table_privilege('pflege_backend','public.ai_models','INSERT,UPDATE,DELETE'),'Runtime cannot invent approved models');
select ok(not has_function_privilege('authenticated','private.chat_prepare(uuid,uuid,uuid,uuid,uuid,text)','EXECUTE'),'No private browser bypass introduced');
select is((select count(*)::int from auth.users),0,'No accounts created');
select is((select count(*)::int from auth.sessions),0,'No Auth sessions created');
select is((select count(*)::int from public.audit_log where action='chat.completed'),1,'Exactly one atomic successful audit');
select is((select count(*)::int from public.cost_reservations where status='reserved'),0,'All test requests finalized');
select * from finish();
rollback;
