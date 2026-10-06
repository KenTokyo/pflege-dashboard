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
create function pg_temp.touch(remember boolean default false,started timestamptz default now()-interval '1 hour',auth_deadline timestamptz default null,action text default 'touch',user_id uuid default '32000000-0000-4000-8000-000000000001',sid uuid default '33000000-0000-4000-8000-000000000001',w uuid default '10000000-0000-4000-8000-000000000001') returns jsonb language sql as $$
 select private.session_touch(w,user_id,sid,action,remember,started,auth_deadline)
$$;
select is(pg_temp.touch()->>'sessionPolicy','standard','Default policy remains standard');
select is(pg_temp.touch()->>'inactivitySeconds','900','Standard idle is 15 minutes');
select is(pg_temp.touch()->>'timeboxSeconds','28800','Standard absolute is 8 hours');
select is((pg_temp.touch()->>'expiresAt')::timestamptz,now()+interval '7 hours','Deadline anchored to actual Auth birth, not touch');
select is((select count(*)::int from public.audit_log where action='session.started'),1,'Repeated touch creates one start audit');
select is(pg_temp.touch(true)->>'sessionPolicy','remembered','Explicit active opt-in selects remembered');
select is(pg_temp.touch()->>'inactivitySeconds','2592000','Remember choice persists without a flag');
select is(pg_temp.touch()->>'timeboxSeconds','2592000','Remember is exactly 30 days');
select is((pg_temp.touch()->>'expiresAt')::timestamptz,now()+interval '30 days'-interval '1 hour','Remember anchored to Auth birth');
select is((select count(*)::int from public.audit_log where action='session.remembered'),1,'Remember enrollment audited once');
update public.session_activity set last_interaction_at=now()-interval '1 day';
select lives_ok($$select private.session_actor('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001')$$,'Remembered chat check allows tomorrow without heartbeat');
select is(pg_temp.touch(false,now()-interval '1 day')->>'sessionPolicy','remembered','Reopening next day remains remembered');
select is((pg_temp.touch(false,now()-interval '1 day')->>'expiresAt')::timestamptz,now()+interval '29 days','Repeated touch never slides absolute birth deadline');
select throws_ok($$select pg_temp.touch(false,now()-interval '30 days')$$,'28000','SESSION_EXPIRED','Exact 30-day boundary denied');
select throws_ok($$select pg_temp.touch(true,now()-interval '1 hour',now())$$,'28000','SESSION_EXPIRED','Expired real Auth not_after cannot be extended');
select is((pg_temp.touch(false,now()-interval '1 hour',now()+interval '2 hours')->>'expiresAt')::timestamptz,now()+interval '2 hours','Earlier real Auth deadline is authoritative');
-- Another human cannot borrow the first human's stored policy even with the same sid.
select throws_ok($$select pg_temp.touch(false,now()-interval '1 day',null,'touch','32000000-0000-4000-8000-000000000002')$$,'28000','SESSION_EXPIRED','Other actor cannot borrow remembered policy');
select throws_ok($$select pg_temp.touch(false,now()-interval '1 hour',null,'touch','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001')$$,'42501','WORKSPACE_FORBIDDEN','Foreign workspace still denied');
-- New standard session: idle expiry must be checked before remember enrollment.
select is(pg_temp.touch(false,now()-interval '1 hour',null,'touch','32000000-0000-4000-8000-000000000002')->>'sessionPolicy','standard','Other actor remains standard');
update public.session_activity set last_interaction_at=now()-interval '15 minutes' where created_by='31000000-0000-4000-8000-000000000002';
select throws_ok($$select pg_temp.touch(true,now()-interval '1 hour',null,'touch','32000000-0000-4000-8000-000000000002')$$,'28000','SESSION_EXPIRED','Opt-in cannot revive idle standard session');
update public.session_activity set last_interaction_at=now(),expires_at=now()-interval '1 second' where created_by='31000000-0000-4000-8000-000000000002';
select throws_ok($$select pg_temp.touch(true,now()-interval '1 hour',null,'touch','32000000-0000-4000-8000-000000000002')$$,'28000','SESSION_EXPIRED','Opt-in cannot revive stored absolute expiry');
select throws_ok($$select pg_temp.touch(true,now()-interval '8 hours',null,'touch','32000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000002')$$,'28000','SESSION_EXPIRED','Brand-new remembered enrollment cannot revive old standard Auth');
-- Create another genuine app membership, no auth.users account.
set constraints all deferred;
insert into public.workspaces(id,created_by,name) values('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','Synthetic other workspace');
insert into public.profiles(id,workspace_id,created_by,kind,display_name) values('90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','system','Synthetic system');
insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','user','32000000-0000-4000-8000-000000000001','Synthetic other membership');
insert into public.workspace_memberships(workspace_id,created_by,profile_id) values('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001');
select is(pg_temp.touch(false,now()-interval '1 hour',null,'touch','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001')->>'sessionPolicy','remembered','Same real session policy follows trusted workspace membership');
select is(pg_temp.touch(false,now()-interval '1 hour',null,'end')->>'ended','true','Remembered logout works');
select is((select count(*)::int from public.session_activity where created_by in ('31000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001') and revoked_at is not null),2,'Logout revokes all workspace rows');
select throws_ok($$select pg_temp.touch(true)$$,'28000','SESSION_EXPIRED','Remember flag cannot revive explicit logout');
select throws_ok($$select private.session_actor('90000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001')$$,'28000','SESSION_EXPIRED','Other workspace chat check observes logout');
select throws_ok($$select pg_temp.touch(true,now()-interval '1 hour',null,'end')$$,'22023','VALIDATION_FAILED','End cannot enroll a remembered session');
select ok(not has_function_privilege('authenticated','private.session_touch(uuid,uuid,uuid,text,boolean,timestamptz,timestamptz)','EXECUTE'),'Browser cannot supply trusted Auth clock');
select ok(not has_function_privilege('pflege_backend','private.session_touch(uuid,uuid,uuid,text,boolean,timestamptz,timestamptz)','EXECUTE'),'Node cannot bypass real Auth wrapper');
select ok(has_function_privilege('pflege_backend','public.edge_session(uuid,uuid,uuid,text,boolean)','EXECUTE'),'Fixed Node role can use explicit remember wrapper');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"32000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.edge_session('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','touch',true)$$,'42501',null,'Synthetic JWT cannot enter server-only remember wrapper');
select throws_ok($$update public.session_activity set remember_session=true$$,'42501',null,'Browser cannot change remembered policy directly');
set local role anon;
select throws_ok($$select public.edge_session('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','touch',true)$$,'42501',null,'Anonymous cannot enroll remember');
reset role;
grant usage on schema extensions to pflege_backend; -- rolled-back test harness access only
set local role pflege_backend;
select throws_ok($$select public.edge_session('10000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','touch',true)$$,'28000','SESSION_EXPIRED','Forged/no actual Auth session rejected even by fixed Node role');
reset role;
select is((select count(*)::int from auth.users),0,'No Auth accounts');
select is((select count(*)::int from auth.sessions),0,'No Auth sessions');
select * from finish();
rollback;
