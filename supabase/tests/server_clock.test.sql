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
create temporary table prepared_context as select private.chat_prepare(
 '10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001',
 '75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Current question') as value;
select is((select value->'context'->>'serverDate' from prepared_context),to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD'),'Date comes from actual DB clock in Berlin');
select is((select value->'context'->>'serverTimeZone' from prepared_context),'Europe/Berlin','Explicit server time zone');
select is((select (value->'context'->>'serverNow')::timestamptz from prepared_context),now(),'Immutable clock captures request transaction instant');
select ok((select value->'context'->>'instructions' like '%Heutiges Datum in Europe/Berlin: '||to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD')||'%' from prepared_context),'Provider system instructions include trusted date');
select ok((select strpos(value->'context'->>'instructions','Verlässlicher Serverzeitpunkt:')<strpos(value->'context'->>'instructions','Die folgenden JSON-Daten') from prepared_context),'Trusted clock appears before untrusted person/context data');
select is(to_char('2026-10-06 22:30:00+00'::timestamptz at time zone 'Europe/Berlin','YYYY-MM-DD'),'2026-10-07','Berlin summer midnight differs from UTC');
select is(to_char('2026-12-06 23:30:00+00'::timestamptz at time zone 'Europe/Berlin','YYYY-MM-DD'),'2026-12-07','Berlin winter midnight uses correct seasonal offset');
select is((select context_snapshot from public.chat_requests), (select value->'context' from prepared_context),'Clock stored in immutable context snapshot');
select throws_ok($$update public.chat_requests set context_snapshot=context_snapshot||'{"serverDate":"1999-01-01"}'::jsonb$$,'42501','REQUEST_SNAPSHOT_IMMUTABLE','Clock cannot be reassigned after creation');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','completed','Answer',10,5,'context-fixture-no-call')->>'status','completed','Snapshot finalizes with no provider call');
select is(private.chat_prepare('10000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000001','Current question')->'context',(select value->'context' from prepared_context),'Replay retains exact original date/time snapshot');
select is((select count(*)::int from auth.users),0,'No Auth accounts');
select is((select count(*)::int from auth.sessions),0,'No Auth sessions');
select * from finish();
rollback;
