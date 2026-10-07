begin;
select plan(28);
insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values
 ('81000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','82000000-0000-4000-8000-000000000001','Synthetic Gemini fixture');
insert into public.workspace_memberships(workspace_id,created_by,profile_id) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000001');
insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values
 ('10000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001',now(),now()+interval '8 hours');
insert into public.ai_models(id,workspace_id,created_by,provider,provider_model_id,display_name,enabled,status,capabilities_verified_at) values
 ('84000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','gemini','gemini-3.8-flash','SQL fixture only',true,'operational',now());
insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,output_microusd_per_million,verified_at,expires_at,evidence_url) values
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000001',0,0,now(),'infinity','https://ai.google.dev/gemini-api/docs/pricing');
update public.workspace_budgets set monthly_cap_microusd=null,total_cap_microusd=null,blocked=false;
insert into public.conversations(id,workspace_id,created_by,title,care_recipient_id,model_override_id) values
 ('85000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','Synthetic Gemini','10000000-0000-4000-8000-000000000020','84000000-0000-4000-8000-000000000001');
select set_config('pflege.available_providers','["gemini"]',true);
create temporary table prepared as select private.chat_prepare('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','Question','openui','Trusted read-only catalogue') as value;
select is((select value->'context'->>'responseFormat' from prepared),'openui','Chosen format belongs to immutable execution snapshot');
select is((select value->'context'->>'catalogVersion' from prepared),'pflege-openui-v1','Catalogue version is server constant');
select ok((select value->'context'->>'instructions' like '%Trusted read-only catalogue' from prepared),'Trusted formatting prompt precedes reservation and tokenizer');
select is((select presentation->>'state' from public.messages where role='assistant'),'streaming','Response presentation begins explicitly streaming');
select is((select content from public.messages where role='user'),'Question','User content is never presentation code');
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','Question','text','Trusted')$$,'23505','IDEMPOTENCY_CONFLICT','Same request cannot switch response format');
select throws_ok($$select private.chat_prepare('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000009','Question','html','Trusted')$$,'22023','VALIDATION_FAILED','Only two safe requested formats');
select ok(private.chat_checkpoint('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','Partial notice','{"format":"openui","catalogVersion":"pflege-openui-v1","source":"root = Answer([Text(\"Partial notice","state":"streaming"}'),'Checkpoint keeps safe partial text and source');
select is((select content from public.messages where role='assistant'),'Partial notice','Partial canonical text readable on reload');
select throws_ok($$select private.chat_finish('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','completed','Answer',34,12,'gemini-3.8-flash','{"format":"openui","catalogVersion":"pflege-openui-v1","source":"x","state":"invalid"}')$$,'22023','VALIDATION_FAILED','Invalid presentation cannot finalize completed');
select throws_ok($$select private.chat_finish('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','completed','Answer',34,12,'gemini-3.8-flash',null)$$,'22023','VALIDATION_FAILED','Presentation cannot disappear at finalization');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','completed','Answer and warning',34,12,'gemini-3.8-flash','{"format":"openui","catalogVersion":"pflege-openui-v1","source":"root = Answer([Text(\"Answer and warning\")])","state":"valid"}')->>'status','completed','Valid response settles accounting atomically');
select is((select content from public.messages where role='assistant'),'Answer and warning','Canonical text survives reload independently of renderer');
select is((select presentation->>'source' from public.messages where role='assistant'),'root = Answer([Text("Answer and warning")])','Original valid language survives reload');
select is((select count(*)::int from public.usage_ledger),1,'Single original model call has one ledger receipt');
select is(private.chat_prepare('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','Question','openui','A later catalogue')->'presentation'->>'state','valid','Replay returns persisted original presentation');
select is((select count(*)::int from public.cost_reservations),1,'Replay creates no reservation');
select throws_ok($$update public.messages set presentation=null where role='assistant'$$,'42501','MESSAGE_FINAL_IMMUTABLE','Final presentation retains existing immutable-message protection');
create temporary table aborted as select private.chat_prepare('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','Abort','openui','Trusted');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000002','interrupted','Partial',null,null,'gemini-3.8-flash','{"format":"openui","catalogVersion":"pflege-openui-v1","source":"root = Answer([Text(\"Partial","state":"interrupted"}')->>'status','interrupted','Abort keeps partial presentation and held reservation');
select is((select status::text from public.cost_reservations where request_id='88000000-0000-4000-8000-000000000002'),'held','No final usage invented after cancellation');
create temporary table text_request as select private.chat_prepare('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000003','Text','text','Trusted text style') as value;
select is((select value->'context'->'input'->1->>'content' from text_request),'Answer and warning','History uses canonical text and keeps notices, never DSL');
select is(private.chat_finish('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000003','completed','Plain',34,12,'gemini-3.8-flash',null)->>'status','completed','Normal text remains compatible');
select is(private.chat_prepare('10000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000003','Text')->>'content','Plain','Legacy request hash replays new normal text');
select ok(not has_function_privilege('authenticated','public.edge_chat_prepare(uuid,uuid,uuid,uuid,uuid,text,text,text)','EXECUTE'),'Browser cannot provide trusted format instructions');
select ok(not has_function_privilege('pflege_backend','private.chat_prepare(uuid,uuid,uuid,uuid,uuid,text,text,text)','EXECUTE'),'Runtime has no private bypass');
select ok(has_function_privilege('pflege_backend','public.edge_chat_prepare(uuid,uuid,uuid,uuid,uuid,text,text,text)','EXECUTE'),'Fixed runtime role uses real Auth wrapper');
select is((select count(*)::int from auth.users),0,'No Auth account created');
select is((select count(*)::int from auth.sessions),0,'No Auth session created');
select * from finish();
rollback;
