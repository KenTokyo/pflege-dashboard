-- No auth.users rows or login accounts. Every fixture is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- Clone the ENTIRE seeded family to workspace B with different deterministic IDs.
-- The seed stays fiktiv; this is only an adversarial access fixture.
do $$
declare t text; row_data jsonb;
begin
  foreach t in array array['workspaces','profiles','contacts','care_recipients','ai_models','prompt_versions',
    'agent_setting_versions','agent_settings','conversations','messages','documents','document_versions',
    'tasks','notes','workspace_budgets','audit_log'] loop
    for row_data in execute format('select to_jsonb(r) from public.%I r where workspace_id=$1',t)
      using '10000000-0000-4000-8000-000000000001'::uuid loop
      row_data := replace(row_data::text,'10000000-0000-4000','90000000-0000-4000')::jsonb;
      if t in ('document_versions','notes','workspace_budgets','audit_log') then
        row_data := jsonb_set(row_data,'{id}',to_jsonb(gen_random_uuid()));
      end if;
      if t='workspaces' then
        insert into public.workspaces(id,created_by,name,demo_banner)
          select id,created_by,name,demo_banner from jsonb_populate_record(null::public.workspaces,row_data);
      else
        execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I,$1)',t,t) using row_data;
      end if;
    end loop;
  end loop;
end $$;
insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values
('11000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','20000000-0000-4000-8000-000000000001','SQL fixture admin A'),
('11000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user','20000000-0000-4000-8000-000000000002','SQL fixture member A'),
('91000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','user','20000000-0000-4000-8000-000000000003','SQL fixture member B');
insert into public.workspace_memberships(workspace_id,created_by,profile_id,role) values
('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001','admin'),
('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002','member'),
('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000003','member');
-- An operational model is a SQL fixture only, never a provider configuration.
insert into public.ai_models(id,workspace_id,created_by,provider,provider_model_id,display_name,enabled,status,capabilities_verified_at,supports_tools,supports_vision) values
('10000000-0000-4000-8000-000000000032','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','openai','sql-fixture-no-call','SQL fixture only',true,'operational',now(),true,true),
('90000000-0000-4000-8000-000000000032','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','openai','sql-fixture-no-call','SQL fixture only',true,'operational',now(),true,true);
-- Ready shared, ready owner-only, pending, rejected, and workspace-B attachment reservations.
insert into public.attachments(id,workspace_id,created_by,conversation_id,object_path,display_name,mime_type,byte_size,sha256,status,visibility) values
('10000000-0000-4000-8000-000000000080','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000050','10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000080/file.pdf','Fixture.pdf','application/pdf',100,repeat('a',64),'ready','workspace'),
('10000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002',null,'10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000081/file.pdf','Fixture.pdf','application/pdf',100,repeat('b',64),'ready','owner'),
('10000000-0000-4000-8000-000000000082','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002',null,'10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000082/file.pdf','Fixture.pdf','application/pdf',100,null,'pending','workspace'),
('10000000-0000-4000-8000-000000000083','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002',null,'10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000083/file.pdf','Fixture.pdf','application/pdf',100,null,'rejected','workspace'),
('90000000-0000-4000-8000-000000000080','90000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003',null,'90000000-0000-4000-8000-000000000001/90000000-0000-4000-8000-000000000080/file.pdf','Fixture.pdf','application/pdf',100,repeat('a',64),'ready','workspace');
insert into storage.objects(bucket_id,name,owner_id)
select bucket_id,object_path,case when workspace_id='10000000-0000-4000-8000-000000000001' then '20000000-0000-4000-8000-000000000002' else '20000000-0000-4000-8000-000000000003' end
from public.attachments where status='ready';
insert into public.cost_reservations(id,workspace_id,created_by,request_id,model_id,month,amount_microusd,price_snapshot)
select gen_random_uuid(),workspace_id,created_by,gen_random_uuid(),id,date_trunc('month',now())::date,0,'{"fixture":true}'::jsonb from public.ai_models where provider_model_id='sql-fixture-no-call';
insert into public.usage_ledger(workspace_id,created_by,reservation_id,model_id,request_id,month,input_tokens,output_tokens,cost_microusd)
select workspace_id,created_by,id,model_id,request_id,month,0,0,0 from public.cost_reservations;
insert into public.tool_proposals(workspace_id,created_by,conversation_id,message_id,kind,preview,snapshot,context_sha256,expires_at)
values('10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000050','10000000-0000-4000-8000-000000000051','note','{}','{}',repeat('a',64),now()+interval '15 min'),
('90000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000050','90000000-0000-4000-8000-000000000051','note','{}','{}',repeat('a',64),now()+interval '15 min');
set constraints all immediate;

select is((select count(*)::int from auth.users),0,'No Auth accounts exist');
select is((select count(*)::int from pg_tables where schemaname='public'),21,'21 application tables');
select ok(not exists(select 1 from pg_tables where schemaname='public' and not rowsecurity),'Every application table enables RLS');
select ok(not exists(select 1 from pg_tables t where t.schemaname='public' and not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=t.tablename and c.column_name='workspace_id')),'Every row has workspace_id');
select ok(not exists(select 1 from pg_tables t where t.schemaname='public' and not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=t.tablename and c.column_name='created_by' and c.is_nullable='NO')),'Every row has non-null created_by');
select ok((select not public and file_size_limit=10485760 from storage.buckets where id='care-private'),'Private bucket and 10 MiB limit');
select is((select pg_get_userbyid(relowner)::text from pg_class where oid='storage.objects'::regclass),'supabase_storage_admin','Storage owner preserved');
select ok((select relrowsecurity from pg_class where oid='storage.objects'::regclass),'Managed Storage RLS remains enabled');
select is((select count(*)::int from public.ai_models where provider_model_id like 'configure-%' and (enabled or supports_tools is not null or supports_vision is not null)),0,'Seed examples disabled and capabilities unverified');
select is((select monthly_cap_microusd::int from public.workspace_budgets where workspace_id='10000000-0000-4000-8000-000000000001'),0,'Demo budget is zero');
select ok(not exists(select 1 from public.profiles where kind='system' and user_id is not null),'System seed has no login identity');

-- Catalog-driven denial matrix for EVERY table, all browser DML and anon SELECT.
set local role anon;
select set_config('request.jwt.claims','{}',true);
select throws_ok(format('select * from public.%I limit 1',tablename),'42501',null,'anon SELECT denied: '||tablename)
from pg_tables where schemaname='public';
select throws_ok(format('insert into public.%I default values',tablename),'42501',null,'anon INSERT denied: '||tablename)
from pg_tables where schemaname='public';
select throws_ok(format('update public.%I set id=id',tablename),'42501',null,'anon UPDATE denied: '||tablename)
from pg_tables where schemaname='public';
select throws_ok(format('delete from public.%I',tablename),'42501',null,'anon DELETE denied: '||tablename)
from pg_tables where schemaname='public';
select throws_ok($$select public.rename_conversation('10000000-0000-4000-8000-000000000050','No',1)$$,'42501',null,'anon RPC denied');
select is((select count(*)::int from storage.objects where bucket_id='care-private'),0,'anon cannot read private objects');
select throws_ok($$insert into storage.objects(bucket_id,name) values('care-private','unreserved.pdf')$$,'42501',null,'anon private upload denied');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::int from public.care_recipients),1,'Member sees shared fiktive person');
select is((select count(*)::int from public.documents),1,'Member sees shared document created by system');
select is((select count(*)::int from public.tool_proposals),1,'Actor sees own proposal only');
select is((select count(*)::int from public.audit_log),0,'Member cannot read audit');
select is((select count(*)::int from public.workspace_budgets),0,'Member cannot read budgets');
select is((select count(*)::int from public.usage_ledger),0,'Member cannot read usage');
select is((select count(*)::int from public.cost_reservations),0,'Member cannot read reservations');
select is((select count(*)::int from storage.objects where bucket_id='care-private'),2,'Uploader sees both own ready objects');
select throws_ok(format('insert into public.%I default values',tablename),'42501',null,'Member INSERT denied: '||tablename)
from pg_tables where schemaname='public';
select throws_ok(format('update public.%I set id=id',tablename),'42501',null,'Member UPDATE denied: '||tablename)
from pg_tables where schemaname='public';
select throws_ok(format('delete from public.%I',tablename),'42501',null,'Member DELETE denied: '||tablename)
from pg_tables where schemaname='public';
-- All tables contain adversarial B rows; RLS must exclude them independently of UI filters.
select is_empty(format('select id from public.%I where workspace_id=%L',tablename,'90000000-0000-4000-8000-000000000001'),
  'Foreign workspace rows invisible: '||tablename) from pg_tables where schemaname='public';
select throws_ok($$update public.workspace_memberships set role='admin'$$,'42501',null,'No self-escalation');
select throws_ok($$insert into public.workspace_memberships(workspace_id,created_by,profile_id,role) values('90000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002','admin')$$,'42501',null,'No membership injection');
select throws_ok($$update public.ai_models set enabled=true,hosting_region='eu'$$,'42501',null,'No model/capability/region tampering');
select throws_ok($$insert into public.audit_log(workspace_id,created_by,action,outcome) values('10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','forged','success')$$,'42501',null,'No forged audit actor');

select is((public.rename_conversation('10000000-0000-4000-8000-000000000050','  Geprüfter Titel  ',1)).revision,2,'Allowed rename increments revision');
select is((select title from public.conversations where id='10000000-0000-4000-8000-000000000050'),'Geprüfter Titel','Rename persisted');
select throws_ok($$select public.rename_conversation('10000000-0000-4000-8000-000000000050','Stale',1)$$,'40001',null,'Stale revision denied');
select throws_ok($$select public.rename_conversation('10000000-0000-4000-8000-000000000050',' ',2)$$,'22023',null,'Empty title denied');
select throws_ok($$select public.rename_conversation('90000000-0000-4000-8000-000000000050','Foreign',1)$$,'P0002',null,'Foreign RPC hidden');
select throws_ok($$select public.rename_conversation('10000000-0000-4000-8000-000000000050','No revision',null)$$,'40001',null,'Revision required');
select is((public.set_conversation_preferences('10000000-0000-4000-8000-000000000050','create','10000000-0000-4000-8000-000000000032',true,2)).revision,3,'Member may set verified same-workspace model and mode');
select ok((select archived_at is not null from public.conversations where id='10000000-0000-4000-8000-000000000050'),'Archive persisted');
select throws_ok($$select public.set_conversation_preferences('10000000-0000-4000-8000-000000000050',null,'90000000-0000-4000-8000-000000000032',false,3)$$,'22023',null,'Foreign model denied');
select throws_ok($$select public.set_conversation_preferences('10000000-0000-4000-8000-000000000050',null,'10000000-0000-4000-8000-000000000030',false,3)$$,'22023',null,'Planned disabled model denied');
select is((public.set_conversation_preferences('10000000-0000-4000-8000-000000000050',null,null,false,3)).revision,4,'Null preferences restore workspace defaults');
select ok((select archived_at is null and mode_override is null and model_override_id is null from public.conversations where id='10000000-0000-4000-8000-000000000050'),'Defaults and unarchive persisted');
select is((public.mark_document_status('10000000-0000-4000-8000-000000000060','reviewed',1)).status,'reviewed'::public.document_status,'Manual reviewed status allowed');
select throws_ok($$select public.mark_document_status('10000000-0000-4000-8000-000000000060','sent',1)$$,'40001',null,'Stale document status denied');
select throws_ok($$select public.mark_document_status('90000000-0000-4000-8000-000000000060','sent',1)$$,'P0002',null,'Foreign document status hidden');
select throws_ok($$select public.update_agent_settings('10000000-0000-4000-8000-000000000001','create','x','x',null,1,false)$$,'42501',null,'Member cannot change workspace settings');

-- Private Storage allows ONLY an exact pending reservation and its uploader.
select lives_ok($$insert into storage.objects(bucket_id,name,owner_id) values('care-private','10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000082/file.pdf','20000000-0000-4000-8000-000000000002') returning id$$,'Own reserved upload with RETURNING allowed');
select is((select count(*)::int from storage.objects where name like '%000000000082/file.pdf'),1,'Uploader can read pending upload metadata');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('care-private','10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000082/other.pdf','20000000-0000-4000-8000-000000000002')$$,'42501',null,'Unreserved filename denied');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('care-private','10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000083/file.pdf','20000000-0000-4000-8000-000000000002')$$,'42501',null,'Rejected upload denied');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('care-private','10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000082/file.pdf','20000000-0000-4000-8000-000000000001')$$,'42501',null,'Spoofed owner denied');
select is_empty($$update storage.objects set metadata='{}' where bucket_id='care-private' returning id$$,'Direct overwrite denied by RLS');
select throws_ok($$delete from storage.objects where bucket_id='care-private' returning id$$,null,
  'Direct deletion from storage tables is not allowed. Use the Storage API instead.','Supabase itself denies direct SQL object deletion');
select is((select count(*)::int from storage.objects where bucket_id='care-private'),3,'Denied overwrite/delete leaves objects intact');

select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::int from storage.objects where bucket_id='care-private'),1,'Other member sees shared ready file; private/pending hidden');
select is((select count(*)::int from public.attachments where visibility='owner'),0,'Owner-only metadata hidden even from admin');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('care-private','10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000082/file.pdf','20000000-0000-4000-8000-000000000002')$$,'42501',null,'Other member cannot upload for owner');
select is((select count(*)::int from public.tool_proposals),0,'Other actor proposal hidden from admin');
select is((select count(*)::int from public.usage_ledger),1,'Admin sees own workspace usage only');
select is((select count(*)::int from public.audit_log where action='conversation.renamed'),1,'Exactly one rename audit despite rejected attempts');
select is((select created_by::text from public.audit_log where action='conversation.renamed'),'11000000-0000-4000-8000-000000000002','Audit binds actual actor');
select is((select count(*)::int from public.audit_log where action='document.status_marked' and metadata->>'manual'='true'),1,'Manual document status audited');
select is((public.update_agent_settings('10000000-0000-4000-8000-000000000001','create','Prüfpersona','Prüfprompt',null,1,false)).revision,2,'Admin versions settings');
select is((select count(*)::int from public.prompt_versions),2,'Custom prompt appends immutable version');
select is((select count(*)::int from public.agent_setting_versions),2,'Settings append version');
select is((public.update_agent_settings('10000000-0000-4000-8000-000000000001','answer_only',null,null,null,2,true)).revision,3,'Reset to default is explicit RPC input');
select is((select v.prompt_version_id::text from public.agent_settings s join public.agent_setting_versions v on v.id=s.current_version_id),'10000000-0000-4000-8000-000000000040','Reset restores default prompt pointer');
select is((select count(*)::int from public.prompt_versions),2,'Reset preserves prompt history');
select is((select count(*)::int from public.audit_log where action='agent_settings.versioned'),2,'Settings updates and reset audited');
select throws_ok($$select public.update_agent_settings('10000000-0000-4000-8000-000000000001','create','x','x',null,2,false)$$,'40001',null,'Stale settings revision denied');
select throws_ok($$select public.update_agent_settings('10000000-0000-4000-8000-000000000001','create',' ','x',null,3,false)$$,'22023',null,'Invalid settings atomic failure');
select is((select count(*)::int from public.agent_setting_versions),3,'Failed settings writes do not append a version');
select throws_ok($$select public.update_agent_settings('90000000-0000-4000-8000-000000000001','create','x','x',null,1,false)$$,'42501',null,'Admin cannot change foreign workspace');

-- User-controlled metadata must NOT grant admin/member access.
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000099","role":"authenticated","user_metadata":{"role":"admin","workspace_id":"10000000-0000-4000-8000-000000000001"}}',true);
select is_empty(format('select id from public.%I',tablename),'Unknown signed-in user sees no rows: '||tablename)
from pg_tables where schemaname='public';
select throws_ok($$select public.rename_conversation('10000000-0000-4000-8000-000000000050','No',4)$$,'P0002',null,'Nonmember cannot use RPC');
select is((select count(*)::int from storage.objects where bucket_id='care-private'),0,'Nonmember private Storage denied');
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*)::int from public.care_recipients),1,'Workspace B member sees own person');
select is((select id::text from public.care_recipients),'90000000-0000-4000-8000-000000000020','Workspace B never sees A person');
select is((select count(*)::int from storage.objects where bucket_id='care-private'),1,'Workspace B sees own file only');
select throws_ok($$select public.rename_conversation('10000000-0000-4000-8000-000000000050','No',4)$$,'P0002',null,'Workspace B cannot mutate A via RPC');
select set_config('request.jwt.claims','{}',true);
select is((select count(*)::int from public.care_recipients),0,'Authenticated role without sub sees no workspace');

-- FK tests use trusted SQL role to prove relationships themselves reject cross-workspace data.
reset role;
select throws_ok($$insert into public.conversations(workspace_id,created_by,title,care_recipient_id) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Cross','90000000-0000-4000-8000-000000000020')$$,'23503',null,'Cross-workspace person FK denied');
select throws_ok($$insert into public.notes(workspace_id,created_by,care_recipient_id,body) values('10000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000020','Cross')$$,'23503',null,'Cross-workspace created_by denied');
select throws_ok($$insert into public.document_versions(workspace_id,created_by,document_id,version,content,rendered_text) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000060',2,'{}','Cross')$$,'23503',null,'Cross-workspace document version FK denied');
select throws_ok($$insert into public.conversations(workspace_id,created_by,title,model_override_id) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Cross','90000000-0000-4000-8000-000000000032')$$,'23503',null,'Cross-workspace model FK denied');
select throws_ok($$insert into public.tasks(workspace_id,created_by,conversation_id,title) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000050','Cross')$$,'23503',null,'Cross-workspace task/chat FK denied');
select throws_ok($$insert into public.attachments(workspace_id,created_by,object_path,display_name,mime_type,byte_size) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','wrong/file.pdf','Bad','application/pdf',100)$$,'23514',null,'Invalid storage path denied');
select throws_ok($$insert into public.tool_proposals(workspace_id,created_by,conversation_id,message_id,kind,preview,snapshot,context_sha256,expires_at) values('10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000050','90000000-0000-4000-8000-000000000051','note','{}','{}',repeat('a',64),now()+interval '15 min')$$,'23503',null,'Cross-workspace proposal message denied');
select throws_ok($$update public.tool_proposals set result_id=gen_random_uuid() where workspace_id='10000000-0000-4000-8000-000000000001'$$,'23514',null,'Unconfirmed proposal cannot claim a result');
select throws_ok($$insert into public.messages(workspace_id,created_by,conversation_id,role,content) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000050','user','Cross')$$,'23503',null,'Cross-workspace message/chat FK denied');
select throws_ok($$update public.care_recipients set insurer_contact_id='90000000-0000-4000-8000-000000000010' where id='10000000-0000-4000-8000-000000000020'$$,'23503',null,'Cross-workspace insurer FK denied');
select throws_ok($$insert into public.agent_setting_versions(workspace_id,created_by,version,prompt_version_id) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',99,'90000000-0000-4000-8000-000000000040')$$,'23503',null,'Cross-workspace prompt FK denied');
select throws_ok($$update public.agent_settings set current_version_id='90000000-0000-4000-8000-000000000041' where workspace_id='10000000-0000-4000-8000-000000000001'$$,'23503',null,'Cross-workspace setting pointer denied');
select throws_ok($$update public.workspace_memberships set profile_id='91000000-0000-4000-8000-000000000003' where profile_id='11000000-0000-4000-8000-000000000002'$$,'23503',null,'Cross-workspace membership FK denied');
insert into public.conversations(id,workspace_id,created_by,title) values('10000000-0000-4000-8000-000000000052','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Second SQL fixture chat');
select throws_ok($$update public.attachments set conversation_id='10000000-0000-4000-8000-000000000052',message_id='10000000-0000-4000-8000-000000000051' where id='10000000-0000-4000-8000-000000000080'$$,'23503',null,'Attachment message must belong to the same chat, not just workspace');
select throws_ok($$insert into public.audit_log(workspace_id,created_by,conversation_id,message_id,action,outcome) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000052','10000000-0000-4000-8000-000000000051','wrong chat','success')$$,'23503',null,'Audit message must belong to the audited chat');
select throws_ok($$update public.usage_ledger set model_id='10000000-0000-4000-8000-000000000030' where workspace_id='10000000-0000-4000-8000-000000000001'$$,'23503',null,'Usage cannot claim a different model than its reservation');

-- Revocation takes effect from the database, without changing JWT metadata.
create function pg_temp.fail_fixture_audit() returns trigger language plpgsql as $$
begin
  if new.action='conversation.renamed' then raise exception 'Synthetic audit failure'; end if;
  return new;
end $$;
create trigger phase0_fixture_audit_failure before insert on public.audit_log
  for each row execute function pg_temp.fail_fixture_audit();
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.rename_conversation('10000000-0000-4000-8000-000000000050','Must roll back',4)$$,'P0001',null,'Audit failure aborts the entire mutation');
select is((select revision from public.conversations where id='10000000-0000-4000-8000-000000000050'),4,'Audit failure rolls back revision');
select is((select title from public.conversations where id='10000000-0000-4000-8000-000000000050'),'Geprüfter Titel','Audit failure rolls back title');
select is((select count(*)::int from public.audit_log where action='conversation.renamed'),1,'Failed audit does not create an extra action');
reset role;
drop trigger phase0_fixture_audit_failure on public.audit_log;
update public.workspace_memberships set status='revoked' where profile_id='11000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::int from public.care_recipients),0,'Revoked member loses read access');
select throws_ok($$select public.rename_conversation('10000000-0000-4000-8000-000000000050','No',4)$$,'P0002',null,'Revoked member loses RPC access');
select is((select count(*)::int from storage.objects where bucket_id='care-private'),0,'Revoked member loses Storage access');

-- Service privileges are server-only; histories/audit cannot be updated or deleted.
reset role;
set local role service_role;
select throws_ok($$update public.audit_log set action='tampered'$$,'42501',null,'Service cannot rewrite audit');
select throws_ok($$delete from public.audit_log$$,'42501',null,'Service cannot delete audit');
select throws_ok($$update public.usage_ledger set cost_microusd=0$$,'42501',null,'Service cannot rewrite usage');
select throws_ok($$delete from public.document_versions$$,'42501',null,'Service cannot delete document history');
select throws_ok($$update public.prompt_versions set system_prompt='tampered'$$,'42501',null,'Service cannot rewrite prompt history');
select throws_ok($$update public.agent_setting_versions set mode='create'$$,'42501',null,'Service cannot rewrite settings history');
reset role;
select is((select count(*)::int from auth.users),0,'Still no Auth accounts after all tests');
select * from finish();
rollback;
