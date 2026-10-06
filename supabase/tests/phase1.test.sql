-- Business SQL fixtures only. No auth.users/auth.sessions insert and no login credentials.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values
 ('31000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','32000000-0000-4000-8000-000000000001','Phase1 SQL fixture A'),
 ('31000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','32000000-0000-4000-8000-000000000002','Phase1 SQL fixture B');
insert into public.workspace_memberships(workspace_id,created_by,profile_id)
 select workspace_id,created_by,id from public.profiles where id::text like '31000000-%';
insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at)
 select workspace_id,id,'33000000-0000-4000-8000-000000000001',now(),now()+interval '8 hours' from public.profiles where id::text like '31000000-%';
select is((select count(*)::int from auth.users),0,'No Auth account was created');
select is((select count(*)::int from auth.sessions),0,'No Auth session was created');
select ok(not exists(select 1 from pg_tables where schemaname='public' and not rowsecurity),'All 25 application tables have RLS');
select ok(not exists(select 1 from pg_tables t where schemaname='public' and not exists(select 1 from information_schema.columns c
 where c.table_schema='public' and c.table_name=t.tablename and c.column_name='created_by' and c.is_nullable='NO')),'All 25 tables bind an actor');
set local role anon;
select throws_ok(format('select * from public.%I',t),'42501',null,'anon registry read denied '||t)
 from unnest(array['conversation_requests','session_activity','model_prices','chat_requests']) t;
select throws_ok($$select public.create_conversation('10000000-0000-4000-8000-000000000001','No',null,gen_random_uuid())$$,'42501',null,'anon cannot create chat');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"32000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok(format('select * from public.%I',t),'42501',null,'browser cannot read sensitive registry '||t)
 from unnest(array['conversation_requests','session_activity','model_prices','chat_requests']) t;
select throws_ok(format('insert into public.%I default values',t),'42501',null,'browser cannot insert registry '||t)
 from unnest(array['conversation_requests','session_activity','model_prices','chat_requests']) t;
select throws_ok(format('update public.%I set id=id',t),'42501',null,'browser cannot update registry '||t)
 from unnest(array['conversation_requests','session_activity','model_prices','chat_requests']) t;
select throws_ok(format('delete from public.%I',t),'42501',null,'browser cannot delete registry '||t)
 from unnest(array['conversation_requests','session_activity','model_prices','chat_requests']) t;
select throws_ok($$select public.edge_session('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','touch')$$,'42501',null,'browser cannot inject trusted session actors');
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000050',gen_random_uuid(),'No')$$,'42501',null,'browser cannot call internal chat core');
create temporary table metadata_result as select * from public.create_conversation('10000000-0000-4000-8000-000000000001',' Test ',null,'34000000-0000-4000-8000-000000000001');
select is((select title from metadata_result),'Test','Creation trims title');
select is((select revision from metadata_result),1,'Creation starts at revision 1');
select is((public.create_conversation('10000000-0000-4000-8000-000000000001','Test',null,'34000000-0000-4000-8000-000000000001')).id,(select id from metadata_result),'Same key and payload replays same chat');
select throws_ok($$select public.create_conversation('10000000-0000-4000-8000-000000000001','Different',null,'34000000-0000-4000-8000-000000000001')$$,'23505','IDEMPOTENCY_CONFLICT','Different payload cannot reuse key');
select throws_ok($$select public.create_conversation('10000000-0000-4000-8000-000000000001',' ',null,gen_random_uuid())$$,'22023','VALIDATION_FAILED','Empty creation refused');
select throws_ok($$select public.create_conversation('90000000-0000-4000-8000-000000000001','Foreign',null,gen_random_uuid())$$,'42501','WORKSPACE_FORBIDDEN','Unknown workspace not usable');
select throws_ok($$select public.create_conversation('10000000-0000-4000-8000-000000000001','Foreign','90000000-0000-4000-8000-000000000020',gen_random_uuid())$$,'P0002','RESOURCE_NOT_FOUND','Foreign person cannot be assigned on creation');
select is((public.assign_conversation_recipient((select id from metadata_result),'10000000-0000-4000-8000-000000000020',1)).revision,2,'Recipient assignment increments revision');
select throws_ok($$select public.assign_conversation_recipient((select id from metadata_result),null,1)$$,'40001','REVISION_CONFLICT','Stale recipient edit refused');
select is((public.assign_conversation_recipient((select id from metadata_result),null,2)).revision,3,'Recipient can be removed explicitly');
select throws_ok($$select public.assign_conversation_recipient((select id from metadata_result),'90000000-0000-4000-8000-000000000020',3)$$,'P0002','RESOURCE_NOT_FOUND','Foreign recipient edit refused');
reset role;
select is((select count(*)::int from public.audit_log where action='conversation.created' and request_id='34000000-0000-4000-8000-000000000001'),1,'Creation replay writes only one audit');
select is((select count(*)::int from public.audit_log where action='conversation.recipient_assigned' and conversation_id=(select id from metadata_result)),2,'Only accepted recipient changes audited');
select throws_ok($$select public.edge_session('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','touch')$$,'28000','SESSION_EXPIRED','Production session wrapper refuses non-existent Auth session');
select is(private.session_actor('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001'),'31000000-0000-4000-8000-000000000001'::uuid,'Core accepts fresh synthetic activity fixture');
update public.session_activity set last_interaction_at=now()-interval '15 minutes' where created_by='31000000-0000-4000-8000-000000000001';
select throws_ok($$select private.session_actor('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001')$$,'28000','SESSION_EXPIRED','Exactly 15 minutes idle expires');
update public.session_activity set last_interaction_at=now(),expires_at=now() where created_by='31000000-0000-4000-8000-000000000001';
select throws_ok($$select private.session_actor('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001')$$,'28000','SESSION_EXPIRED','Timebox expiration refuses core');
update public.session_activity set expires_at=now()+interval '8 hours',revoked_at=now() where created_by='31000000-0000-4000-8000-000000000001';
select throws_ok($$select private.session_actor('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001')$$,'28000','SESSION_EXPIRED','Revoked session refuses core');
update public.session_activity set revoked_at=null where created_by='31000000-0000-4000-8000-000000000001';
create function pg_temp.prepare(req uuid,chat uuid default '10000000-0000-4000-8000-000000000050') returns jsonb language sql as $$
 select private.chat_prepare('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001',chat,req,'SQL business fixture, never sent to a provider')
$$;
select throws_ok($$select pg_temp.prepare(gen_random_uuid())$$,'22023','MODEL_UNAVAILABLE','Disabled/unconfigured model fails closed');
insert into public.ai_models(id,workspace_id,created_by,provider,provider_model_id,display_name,enabled,status,capabilities_verified_at)
 values('35000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','openai','sql-fixture-no-call','SQL fixture only',true,'operational',now());
update public.conversations set model_override_id='35000000-0000-4000-8000-000000000001' where id='10000000-0000-4000-8000-000000000050';
select throws_ok($$select pg_temp.prepare(gen_random_uuid())$$,'P0001','PRICING_UNVERIFIED','Unknown prices fail closed');
-- Prices and budget below exist ONLY in rolled-back tests; no real/model cost is enabled.
insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,output_microusd_per_million,verified_at,expires_at,evidence_url)
 values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','35000000-0000-4000-8000-000000000001',1000000,2000000,now(),now()+interval '1 day','https://example.invalid/sql-fixture');
select throws_ok($$select pg_temp.prepare(gen_random_uuid())$$,'P0001','BUDGET_EXCEEDED','Zero real demo budget blocks starts');
select is((select count(*)::int from public.chat_requests),0,'Denied starts persist no chat request');
update public.workspace_budgets set monthly_cap_microusd=100000000 where workspace_id='10000000-0000-4000-8000-000000000001';
create temporary table prepared as select pg_temp.prepare('36000000-0000-4000-8000-000000000001') value;
select ok(not (select (value->>'replayed')::boolean from prepared),'Valid SQL business start is fresh');
select is((select count(*)::int from public.messages where client_request_id='36000000-0000-4000-8000-000000000001'),2,'Start persists user and assistant together');
select is((select count(*)::int from public.cost_reservations where request_id='36000000-0000-4000-8000-000000000001'),1,'Exactly one reservation');
select ok((select amount_microusd>0 from public.cost_reservations where request_id='36000000-0000-4000-8000-000000000001'),'Positive worst case reserve');
select throws_ok($$select pg_temp.prepare('36000000-0000-4000-8000-000000000001')$$,'55000','REQUEST_IN_PROGRESS','Concurrent same request cannot call provider again');
select throws_ok($$select pg_temp.prepare(gen_random_uuid())$$,'55000','REQUEST_IN_PROGRESS','Different request cannot overlap same conversation');
select ok((select value->'context'->>'promptVersionId' is not null from prepared),'Prompt snapshot recorded');
select ok((select value->'context'->>'instructions' like '%Martha%' from prepared),'Authorized person facts appear in context');
select throws_ok($$update public.messages set model_snapshot='{}' where role='assistant' and client_request_id='36000000-0000-4000-8000-000000000001'$$,'42501','MESSAGE_ORIGIN_IMMUTABLE','Provider origin cannot be reassigned');
select lives_ok($q$select private.chat_checkpoint('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','36000000-0000-4000-8000-000000000001','Persisted partial')$q$,'Active SQL checkpoint stores partial output');
select is((select content from public.messages where role='assistant' and client_request_id='36000000-0000-4000-8000-000000000001'),'Persisted partial','Partial output survives separately from Edge memory');
select is((private.chat_finish('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','36000000-0000-4000-8000-000000000001','completed','SQL reply fixture',10,5,'sql-fixture-no-call')->>'costMicrousd')::int,20,'Actual fixture usage settles from saved prices');
select is((select status::text from public.cost_reservations where request_id='36000000-0000-4000-8000-000000000001'),'settled','Reservation settled');
select ok((private.chat_finish('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','36000000-0000-4000-8000-000000000001','completed','Different',10,5,'sql-fixture-no-call')->>'alreadyFinal')::boolean,'Repeated finalization changes nothing');
select is((select count(*)::int from public.usage_ledger where request_id='36000000-0000-4000-8000-000000000001'),1,'Only one usage ledger row');
select ok((pg_temp.prepare('36000000-0000-4000-8000-000000000001')->>'replayed')::boolean,'Completed request replays stored response');
select throws_ok($$update public.messages set content='Rewrite' where client_request_id='36000000-0000-4000-8000-000000000001'$$,'42501','MESSAGE_FINAL_IMMUTABLE','Final content cannot silently change');
select lives_ok($$select pg_temp.prepare('36000000-0000-4000-8000-000000000002')$$,'Second fresh request starts after completion');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','36000000-0000-4000-8000-000000000002','interrupted','Partial',null,null,null)->>'status','interrupted','Abort persists interrupted state');
select is((select status::text from public.cost_reservations where request_id='36000000-0000-4000-8000-000000000002'),'held','Unknown usage retains maximum reservation');
select throws_ok($$select pg_temp.prepare('36000000-0000-4000-8000-000000000002')$$,'55000','REQUEST_INTERRUPTED','Aborted request does not retry paid provider silently');
select throws_ok($$select private.chat_finish('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000002','36000000-0000-4000-8000-000000000001','completed','Spoof',1,1,'sql-fixture-no-call')$$,'P0002','RESOURCE_NOT_FOUND','Other actor cannot finalize response');
select lives_ok($$select pg_temp.prepare('36000000-0000-4000-8000-000000000003')$$,'Third fixture request starts');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','36000000-0000-4000-8000-000000000003','completed','Wrong provider model',10,5,'unexpected-model')->>'status','failed','Wrong actual model never marked successful');
select ok((select blocked from public.workspace_budgets where workspace_id='10000000-0000-4000-8000-000000000001'),'Unverified actual usage blocks workspace');
select is((select count(*)::int from public.usage_ledger where request_id='36000000-0000-4000-8000-000000000003'),0,'Unverified usage is not booked as zero');
set local role authenticated;
select is((select count(*)::int from public.chat_requests),3,'Actor reads own request status through permitted columns');
select set_config('request.jwt.claims','{"sub":"32000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::int from public.chat_requests),0,'Other actor cannot read private request status');
reset role;
set local role service_role;
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000050',gen_random_uuid(),'No bypass')$$,'42501',null,'Service cannot bypass production session wrapper');
select throws_ok($$select public.edge_chat_check('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001')$$,'28000','SESSION_EXPIRED','Trusted Edge wrapper still verifies real Auth session');
reset role;
select is((select count(*)::int from auth.users),0,'Auth account count remains zero');

-- Newly introduced cross-workspace relationships never accept a foreign actor/model/chat.
select throws_ok($q$insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values('10000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002',gen_random_uuid(),now(),now()+interval '8 hours')$q$,'23503',null,'Session registry rejects foreign creator');
select throws_ok($q$insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,output_microusd_per_million,verified_at,expires_at,evidence_url) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000030',1,1,now(),now()+interval '1 day','https://example.invalid/fixture')$q$,'23503',null,'Price registry rejects foreign model');
select throws_ok($q$insert into public.conversation_requests(workspace_id,created_by,idempotency_key,payload_sha256,conversation_id) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',gen_random_uuid(),repeat('a',64),'90000000-0000-4000-8000-000000000050')$q$,'23503',null,'Idempotency registry rejects foreign chat');
select throws_ok($q$update public.chat_requests set model_id='90000000-0000-4000-8000-000000000030' where client_request_id='36000000-0000-4000-8000-000000000001'$q$,'42501','REQUEST_SNAPSHOT_IMMUTABLE','Request origin rejects foreign model rewrite');
select throws_ok($q$select private.session_actor('90000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001')$q$,'42501','WORKSPACE_FORBIDDEN','Core cannot enter another workspace');
select throws_ok($q$select private.chat_prepare('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000050','36000000-0000-4000-8000-000000000001','Different content')$q$,'23505','IDEMPOTENCY_CONFLICT','Chat content hash rejects changed retry');
select ok((select value->'context'->>'instructions' like '%openTasks%' and value->'context'->>'instructions' like '%documents%' and value->'context'->>'instructions' like '%Pflegekasse%' from prepared),'Context includes authorized tasks documents and insurer');
-- Immutable request snapshots, output usage, price registry, audits.
select is((select count(*)::int from public.audit_log where request_id='36000000-0000-4000-8000-000000000001' and action='chat.completed'),1,'Exactly one completion audit');
select is((select provider_response_model from public.messages where role='assistant' and client_request_id='36000000-0000-4000-8000-000000000001'),'sql-fixture-no-call','Actual provider model is recorded');
update public.workspace_budgets set blocked=false where workspace_id='10000000-0000-4000-8000-000000000001';

-- A held reservation from a previous UTC month remains held without eating this month's cap.
insert into public.cost_reservations(workspace_id,created_by,request_id,model_id,month,amount_microusd,price_snapshot,status)
 values('10000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001','35000000-0000-4000-8000-000000000001',date_trunc('month',(now() at time zone 'UTC')-interval '1 month')::date,1000000000,'{"fixture":true}','held');
select ok((select month=date_trunc('month',now() at time zone 'UTC')::date from public.cost_reservations where request_id='36000000-0000-4000-8000-000000000001'),'Request reserves its current UTC month');
select is((select month from public.usage_ledger where request_id='36000000-0000-4000-8000-000000000001'),(select month from public.cost_reservations where request_id='36000000-0000-4000-8000-000000000001'),'Final usage books the immutable reservation month');
set local role service_role;
select throws_ok($q$update public.model_prices set input_microusd_per_million=1$q$,'42501',null,'Server clients cannot rewrite verified price versions');
select throws_ok($q$delete from public.model_prices$q$,'42501',null,'Server clients cannot delete price history');
reset role;
-- Seven successful pure SQL starts plus prior three fill the shared user's minute allowance.
do $q$ declare req uuid; i integer; begin
 for i in 1..7 loop req:=gen_random_uuid();perform pg_temp.prepare(req);
   perform private.chat_finish('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001',req,'completed','Rate fixture',1,1,'sql-fixture-no-call');
 end loop;
end $q$;
select throws_ok($q$select pg_temp.prepare(gen_random_uuid())$q$,'P0001','RATE_LIMITED','Ten starts per user minute enforced in SQL');
create or replace function pg_temp.prepare(req uuid,chat uuid default '10000000-0000-4000-8000-000000000050') returns jsonb language sql as $q$
 select private.chat_prepare('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000001',chat,req,'SQL business fixture, never sent to a provider')
$q$;
insert into public.conversations(id,workspace_id,created_by,title,model_override_id) values
 ('37000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','Parallel two','35000000-0000-4000-8000-000000000001'),
 ('37000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','Parallel three','35000000-0000-4000-8000-000000000001');
select lives_ok($q$select pg_temp.prepare('38000000-0000-4000-8000-000000000001')$q$,'First parallel conversation starts');
select lives_ok($q$select pg_temp.prepare('38000000-0000-4000-8000-000000000002','37000000-0000-4000-8000-000000000001')$q$,'Second parallel conversation starts');
select throws_ok($q$select pg_temp.prepare('38000000-0000-4000-8000-000000000003','37000000-0000-4000-8000-000000000002')$q$,'P0001','PARALLEL_LIMIT','Third request for same human rejected');
select throws_ok($q$select private.chat_finish('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000002','38000000-0000-4000-8000-000000000001','streaming','Bad state',null,null,null)$q$,'22023','VALIDATION_FAILED','Finalizer only accepts final states');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000002','38000000-0000-4000-8000-000000000001','completed','Usage exceeds reservation',100000000,1,'sql-fixture-no-call')->>'status','failed','Usage beyond conservative bound never succeeds');
select ok((select blocked from public.workspace_budgets where workspace_id='10000000-0000-4000-8000-000000000001'),'Excess usage blocks future spending');
select is((select status::text from public.cost_reservations where request_id='38000000-0000-4000-8000-000000000001'),'held','Excess usage retains full reservation');
select is((select count(*)::int from public.usage_ledger where request_id='38000000-0000-4000-8000-000000000001'),0,'Excess usage is not recorded as trustworthy');
select is((select count(*)::int from public.chat_requests where client_request_id='38000000-0000-4000-8000-000000000003'),0,'Denied parallel start creates nothing');
-- Fail an audit INSERT to demonstrate transactional rollback of NEW creation, not just old rename.
create function pg_temp.reject_new_audit() returns trigger language plpgsql as $q$ begin
 if new.action='conversation.created' then raise exception 'TEST_AUDIT_ROLLBACK'; end if; return new;
end $q$;
create trigger test_new_audit before insert on public.audit_log for each row execute function pg_temp.reject_new_audit();
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"32000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($q$select public.create_conversation('10000000-0000-4000-8000-000000000001','Audit fails',null,'39000000-0000-4000-8000-000000000001')$q$,'P0001','TEST_AUDIT_ROLLBACK','Audit failure aborts conversation creation');
reset role;
select is((select count(*)::int from public.conversation_requests where idempotency_key='39000000-0000-4000-8000-000000000001'),0,'Audit failure rolls back idempotency registration');
select is((select count(*)::int from public.conversations where title='Audit fails'),0,'Audit failure rolls back created conversation');
drop trigger test_new_audit on public.audit_log;


-- The same human in another workspace still shares rate and parallel allowances.
insert into public.workspaces(id,created_by,name) values('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','Foreign SQL test workspace');
insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values
 ('61000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','system',null,'SQL system'),
 ('61000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','user','32000000-0000-4000-8000-000000000001','Same SQL human A'),
 ('61000000-0000-4000-8000-000000000004','61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','user','32000000-0000-4000-8000-000000000002','Same SQL human B');
insert into public.workspace_memberships(workspace_id,created_by,profile_id) values
 ('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000003'),
 ('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000004');
insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values
 ('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000003','33000000-0000-4000-8000-000000000001',now(),now()+interval '8 hours'),
 ('61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000004','33000000-0000-4000-8000-000000000001',now(),now()+interval '8 hours');
insert into public.conversations(id,workspace_id,created_by,title) values
 ('61000000-0000-4000-8000-000000000050','61000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','Foreign SQL chat');
select throws_ok($q$select private.chat_prepare('61000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000050',gen_random_uuid(),'Other workspace does not reset rate')$q$,'P0001','RATE_LIMITED','Rate is shared across workspace memberships');
select throws_ok($q$select private.chat_prepare('61000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000050',gen_random_uuid(),'Other workspace does not reset parallel limit')$q$,'22023','MODEL_UNAVAILABLE','Finished first request leaves one active and makes parallel slot available');
-- One more active request in A uses the second slot; this check precedes unknown model in B.
update public.workspace_budgets set blocked=false where workspace_id='10000000-0000-4000-8000-000000000001';
select lives_ok($q$select pg_temp.prepare('38000000-0000-4000-8000-000000000004')$q$,'Released parallel slot can be reused');
select throws_ok($q$select private.chat_prepare('61000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000050',gen_random_uuid(),'Other workspace does not reset parallel limit')$q$,'P0001','PARALLEL_LIMIT','Parallel limit is shared across workspace memberships');
select throws_ok($q$select private.chat_prepare('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000050',gen_random_uuid(),'Foreign chat spoof')$q$,'P0002','RESOURCE_NOT_FOUND','Workspace parameter cannot rebind foreign chat');
select throws_ok($q$insert into public.conversation_requests(workspace_id,created_by,idempotency_key,payload_sha256,conversation_id) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',gen_random_uuid(),repeat('a',64),'61000000-0000-4000-8000-000000000050')$q$,'23503',null,'Existing real foreign chat cannot pass composite FK');
update public.session_activity set last_interaction_at=now()-interval '20 minutes' where workspace_id='61000000-0000-4000-8000-000000000001' and created_by='61000000-0000-4000-8000-000000000003';
select is(private.session_actor('61000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001'),'61000000-0000-4000-8000-000000000003'::uuid,'User activity in A remains valid when switching workspace B');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"32000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($q$select public.assign_conversation_recipient('10000000-0000-4000-8000-000000000050','61000000-0000-4000-8000-000000000020',1)$q$,'P0002','RESOURCE_NOT_FOUND','Human association cannot inject unavailable foreign person');
reset role;
select is((select count(*)::int from auth.users),0,'All new multi-workspace fixtures still have zero Auth accounts');

select throws_ok($q$select private.chat_checkpoint('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','36000000-0000-4000-8000-000000000001','Rewrite completed')$q$,'55000','REQUEST_INTERRUPTED','Checkpoint cannot rewrite completed answer');

select ok(not has_function_privilege('anon',p.oid,'EXECUTE'),'anon cannot execute trusted server function '||p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'edge_%';
select ok(not has_function_privilege('authenticated',p.oid,'EXECUTE'),'browser cannot execute trusted server function '||p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'edge_%';
select ok(has_function_privilege('service_role',p.oid,'EXECUTE'),'Edge service can execute trusted wrapper '||p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'edge_%';
select ok(not has_function_privilege('anon',p.oid,'EXECUTE'),'private metadata helper has explicit anon denial '||p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('rpc_create_conversation','rpc_assign_conversation_recipient');

select * from finish();
rollback;
