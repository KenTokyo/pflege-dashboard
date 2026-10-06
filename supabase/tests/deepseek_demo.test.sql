begin;
select plan(24);
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

update public.ai_models set provider='deepseek',provider_model_id='deepseek-flash' where id='74000000-0000-4000-8000-000000000001';
update public.workspace_budgets set total_cap_microusd=5000000,monthly_cap_microusd=5000000;
-- Replace only fixture prices, never immutable application seed or production data.
delete from public.model_prices;
insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,output_microusd_per_million,verified_at,expires_at,evidence_url) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','74000000-0000-4000-8000-000000000001',300000,1200000,now(),now()+interval '1 day','https://api-docs.deepseek.com/quick_start/pricing/');
select set_config('pflege.available_providers','["openai"]',true);
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Question')$$,'P0001','PROVIDER_NOT_CONFIGURED','Wrong configured provider denied before reservation');
select is((select count(*)::int from public.cost_reservations),0,'No reservation for missing selected provider key');
select set_config('pflege.available_providers','["deepseek"]',true);
create temporary table deep_prepared as select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Question') as value;
select is((select value->'context'->'model'->>'provider' from deep_prepared),'deepseek','Immutable context uses selected DeepSeek');
select is((select value->'context'->>'inputTokenBound' from deep_prepared),'1048576','Full documented context reserved without guessed tokenizer');
select is((select amount_microusd from public.cost_reservations),315802::bigint,'Peak full-context reservation upper bound');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','completed','Answer',10,5,'deepseek-flash')->>'status','completed','Known exact usage can complete');
select ok((select estimated from public.usage_ledger),'DeepSeek upper-price ledger honestly marked estimated');
select is((select cost_microusd from public.usage_ledger),9::bigint,'Peak upper charge for 10 input/5 output tokens');
select is((select provider_response_model from public.messages where role='assistant'),'deepseek-flash','Actual provider model stored');
-- Spend in a previous month must reduce the TOTAL demonstration allowance.
insert into public.cost_reservations(workspace_id,created_by,request_id,model_id,month,amount_microusd,status,price_snapshot) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','79000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000001',date_trunc('month',now()-interval '1 month')::date,4800000,'held','{}');
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000002','Question')$$,'P0001','BUDGET_EXCEEDED','Prior-month held reserve counts against lifetime cap');
select is((select count(*)::int from public.chat_requests),1,'Denied total cap leaves no request');
update public.cost_reservations set status='settled' where request_id='79000000-0000-4000-8000-000000000001';
insert into public.usage_ledger(workspace_id,created_by,reservation_id,model_id,request_id,month,input_tokens,output_tokens,cost_microusd)
 select workspace_id,created_by,id,model_id,request_id,month,1,1,4800000 from public.cost_reservations where request_id='79000000-0000-4000-8000-000000000001';
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000002','Question')$$,'P0001','BUDGET_EXCEEDED','Prior-month settled ledger counts against lifetime cap');
select ok(not has_table_privilege('authenticated','public.workspace_budgets','UPDATE'),'Browser cannot increase lifetime cap');
select ok(not has_table_privilege('pflege_backend','public.workspace_budgets','UPDATE'),'Runtime cannot increase lifetime cap');
select is((select count(*)::int from auth.users),0,'No Auth users');
select is((select count(*)::int from auth.sessions),0,'No Auth sessions');
select is((select count(*)::int from public.audit_log where action='chat.completed'),1,'One atomic completion audit');
select is((select count(*)::int from public.cost_reservations where status='reserved'),0,'No outstanding test request reservation');

update public.model_prices set expires_at='infinity';
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000002','Question')$$,'P0001','PRICING_UNVERIFIED','Permanent estimate cannot promise a positive hard cap');
update public.workspace_budgets set monthly_cap_microusd=null,total_cap_microusd=null;
create temporary table unlimited_prepared as select private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000002','Question');
select is((select count(*)::int from public.chat_requests),2,'Explicit unlimited budget permits start despite prior-month spend');
select is((select count(*)::int from public.cost_reservations where status='reserved'),1,'Unlimited still records atomic cost reservation');
select ok((select monthly_cap_microusd is null and total_cap_microusd is null from public.workspace_budgets),'Unlimited is explicit NULL, not a huge artificial limit');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000002','completed','Answer',10,5,'deepseek-flash')->>'status','completed','Unlimited still records completion');
select is((select count(*)::int from public.usage_ledger),3,'Unlimited preserves previous ledger and records new charge');
select * from finish();
rollback;
