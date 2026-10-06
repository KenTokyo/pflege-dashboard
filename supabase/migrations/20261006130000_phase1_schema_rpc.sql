begin;
-- All application rows remain workspace/actor scoped, including server-only registries.
create table public.conversation_requests (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  created_by uuid not null, created_at timestamptz not null default now(),
  idempotency_key uuid not null, payload_sha256 text not null, conversation_id uuid not null,
  unique(workspace_id,created_by,idempotency_key), unique(id,workspace_id),
  foreign key(created_by,workspace_id) references public.profiles(id,workspace_id),
  foreign key(conversation_id,workspace_id) references public.conversations(id,workspace_id)
);
create table public.session_activity (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  created_by uuid not null, created_at timestamptz not null default now(),
  session_id uuid not null, last_interaction_at timestamptz not null,
  expires_at timestamptz not null, revoked_at timestamptz,
  unique(workspace_id,created_by,session_id), unique(id,workspace_id),
  foreign key(created_by,workspace_id) references public.profiles(id,workspace_id)
);
create table public.model_prices (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  created_by uuid not null, created_at timestamptz not null default now(), model_id uuid not null,
  input_microusd_per_million bigint not null check(input_microusd_per_million > 0),
  output_microusd_per_million bigint not null check(output_microusd_per_million > 0),
  verified_at timestamptz not null, expires_at timestamptz not null check(expires_at > verified_at),
  evidence_url text not null check(evidence_url like 'https://%'), currency text not null default 'USD' check(currency='USD'),
  text_only boolean not null default true check(text_only), unique(id,workspace_id),
  foreign key(created_by,workspace_id) references public.profiles(id,workspace_id),
  foreign key(model_id,workspace_id) references public.ai_models(id,workspace_id)
);
create table public.chat_requests (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  created_by uuid not null, created_at timestamptz not null default now(), session_id uuid not null,
  client_request_id uuid not null, conversation_id uuid not null, payload_sha256 text not null,
  status text not null check(status in ('streaming','completed','interrupted','failed')),
  lease_expires_at timestamptz not null, context_snapshot jsonb not null,
  model_id uuid not null, prompt_version_id uuid not null, reservation_id uuid not null,
  assistant_message_id uuid not null, user_message_id uuid not null,
  unique(workspace_id,client_request_id), unique(id,workspace_id),
  foreign key(created_by,workspace_id) references public.profiles(id,workspace_id),
  foreign key(conversation_id,workspace_id) references public.conversations(id,workspace_id),
  foreign key(model_id,workspace_id) references public.ai_models(id,workspace_id),
  foreign key(prompt_version_id,workspace_id) references public.prompt_versions(id,workspace_id),
  foreign key(reservation_id,workspace_id) references public.cost_reservations(id,workspace_id),
  foreign key(assistant_message_id,conversation_id,workspace_id) references public.messages(id,conversation_id,workspace_id),
  foreign key(user_message_id,conversation_id,workspace_id) references public.messages(id,conversation_id,workspace_id)
);
do $$ declare t text; begin
  foreach t in array array['conversation_requests','session_activity','model_prices','chat_requests'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
    execute format('create index on public.%I(workspace_id,created_at)',t);
  end loop;
end $$;
-- Browser only sees its own request state, never provider contexts/price/session registries.
grant select(id,workspace_id,created_by,created_at,client_request_id,conversation_id,status,assistant_message_id,user_message_id)
  on public.chat_requests to authenticated;
create policy own_chat_requests on public.chat_requests for select to authenticated
 using(private.is_member(workspace_id) and created_by=private.current_actor(workspace_id));
revoke update,delete on public.model_prices from service_role;

create function private.rpc_create_conversation(p_workspace_id uuid,p_title text,p_care_recipient_id uuid,p_idempotency_key uuid)
returns public.conversations language plpgsql security definer set search_path='' as $$
declare a uuid; h text; r public.conversation_requests; c public.conversations;
begin
  a:=private.current_actor(p_workspace_id);
  if a is null then raise exception using errcode='42501',message='WORKSPACE_FORBIDDEN'; end if;
  if p_title is null or length(btrim(p_title)) not between 1 and 120 or p_idempotency_key is null then
    raise exception using errcode='22023',message='VALIDATION_FAILED'; end if;
  h:=encode(sha256(convert_to(jsonb_build_array(btrim(p_title),p_care_recipient_id)::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||a::text||p_idempotency_key::text,0));
  select * into r from public.conversation_requests where workspace_id=p_workspace_id and created_by=a and idempotency_key=p_idempotency_key;
  if found then
    if r.payload_sha256<>h then raise exception using errcode='23505',message='IDEMPOTENCY_CONFLICT'; end if;
    select * into c from public.conversations where id=r.conversation_id; return c;
  end if;
  if p_care_recipient_id is not null and not exists(select 1 from public.care_recipients where id=p_care_recipient_id and workspace_id=p_workspace_id) then
    raise exception using errcode='P0002',message='RESOURCE_NOT_FOUND'; end if;
  insert into public.conversations(workspace_id,created_by,title,care_recipient_id)
    values(p_workspace_id,a,btrim(p_title),p_care_recipient_id) returning * into c;
  insert into public.conversation_requests(workspace_id,created_by,idempotency_key,payload_sha256,conversation_id)
    values(p_workspace_id,a,p_idempotency_key,h,c.id);
  insert into public.audit_log(workspace_id,created_by,conversation_id,action,target_table,target_id,outcome,request_id)
    values(p_workspace_id,a,c.id,'conversation.created','conversations',c.id,'success',p_idempotency_key);
  return c;
end $$;
create function public.create_conversation(p_workspace_id uuid,p_title text,p_care_recipient_id uuid,p_idempotency_key uuid)
returns public.conversations language sql security invoker set search_path='' as $$
 select private.rpc_create_conversation(p_workspace_id,p_title,p_care_recipient_id,p_idempotency_key)
$$;
create function private.rpc_assign_conversation_recipient(p_conversation_id uuid,p_care_recipient_id uuid,p_expected_revision integer)
returns public.conversations language plpgsql security definer set search_path='' as $$
declare c public.conversations; a uuid;
begin
  select * into c from public.conversations where id=p_conversation_id and private.is_member(workspace_id) for update;
  if not found then raise exception using errcode='P0002',message='RESOURCE_NOT_FOUND'; end if;
  if p_expected_revision is null or p_expected_revision<>c.revision then raise exception using errcode='40001',message='REVISION_CONFLICT'; end if;
  if p_care_recipient_id is not null and not exists(select 1 from public.care_recipients where id=p_care_recipient_id and workspace_id=c.workspace_id) then
    raise exception using errcode='P0002',message='RESOURCE_NOT_FOUND'; end if;
  a:=private.current_actor(c.workspace_id);
  update public.conversations set care_recipient_id=p_care_recipient_id,revision=revision+1 where id=c.id returning * into c;
  insert into public.audit_log(workspace_id,created_by,conversation_id,action,target_table,target_id,outcome,metadata)
    values(c.workspace_id,a,c.id,'conversation.recipient_assigned','conversations',c.id,'success',jsonb_build_object('care_recipient_id',p_care_recipient_id));
  return c;
end $$;
create function public.assign_conversation_recipient(p_conversation_id uuid,p_care_recipient_id uuid,p_expected_revision integer)
returns public.conversations language sql security invoker set search_path='' as $$
 select private.rpc_assign_conversation_recipient(p_conversation_id,p_care_recipient_id,p_expected_revision)
$$;
grant execute on function private.rpc_create_conversation(uuid,text,uuid,uuid),private.rpc_assign_conversation_recipient(uuid,uuid,integer)
 to authenticated,service_role;
grant execute on function public.create_conversation(uuid,text,uuid,uuid),public.assign_conversation_recipient(uuid,uuid,integer)
 to authenticated,service_role;

-- Core activity check is testable with SQL fixtures. Only trusted wrappers can enter it.
create function private.session_actor(p_workspace_id uuid,p_user_id uuid,p_session_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid; s public.session_activity;
begin
  select p.id into a from public.profiles p join public.workspace_memberships m on m.profile_id=p.id and m.workspace_id=p.workspace_id
    where p.workspace_id=p_workspace_id and p.user_id=p_user_id and p.kind='user' and m.status='active';
  if a is null then raise exception using errcode='42501',message='WORKSPACE_FORBIDDEN'; end if;
  select * into s from public.session_activity where workspace_id=p_workspace_id and created_by=a and session_id=p_session_id;
  if not found or s.revoked_at is not null or s.expires_at<=now() or (select max(x.last_interaction_at) from public.session_activity x join public.profiles p on p.id=x.created_by where p.user_id=p_user_id and x.session_id=p_session_id and x.revoked_at is null)<=now()-interval '15 minutes' then
    raise exception using errcode='28000',message='SESSION_EXPIRED'; end if;
  return a;
end $$;
create function private.assert_auth_session(p_user_id uuid,p_session_id uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare started timestamptz;
begin
  select created_at into started from auth.sessions where id=p_session_id and user_id=p_user_id;
  if started is null or started<=now()-interval '8 hours' then raise exception using errcode='28000',message='SESSION_EXPIRED'; end if;
  return started;
end $$;
create function public.edge_session(p_workspace_id uuid,p_user_id uuid,p_session_id uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid; started timestamptz; s public.session_activity;
begin
  started:=private.assert_auth_session(p_user_id,p_session_id);
  select p.id into a from public.profiles p join public.workspace_memberships m on m.profile_id=p.id and m.workspace_id=p.workspace_id
   where p.workspace_id=p_workspace_id and p.user_id=p_user_id and p.kind='user' and m.status='active';
  if a is null then raise exception using errcode='42501',message='WORKSPACE_FORBIDDEN'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||p_session_id::text,0));
  -- A revoked session in any workspace cannot be recreated through another membership.
  if exists(select 1 from public.session_activity x join public.profiles p on p.id=x.created_by
      where p.user_id=p_user_id and x.session_id=p_session_id and x.revoked_at is not null) then
    raise exception using errcode='28000',message='SESSION_EXPIRED'; end if;
  if p_action='end' then
    insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at,revoked_at)
      values(p_workspace_id,a,p_session_id,now(),started+interval '8 hours',now())
      on conflict(workspace_id,created_by,session_id) do update set revoked_at=now();
    update public.session_activity x set revoked_at=now() from public.profiles p
      where p.id=x.created_by and p.user_id=p_user_id and x.session_id=p_session_id;
    insert into public.audit_log(workspace_id,created_by,action,outcome) values(p_workspace_id,a,'session.ended','success');
    return jsonb_build_object('ended',true);
  elsif p_action<>'touch' or p_action is null then raise exception using errcode='22023',message='VALIDATION_FAILED'; end if;
  if (select max(x.last_interaction_at) from public.session_activity x join public.profiles p on p.id=x.created_by where p.user_id=p_user_id and x.session_id=p_session_id)<=now()-interval '15 minutes' then
    raise exception using errcode='28000',message='SESSION_EXPIRED'; end if;
  update public.session_activity x set last_interaction_at=now() from public.profiles p where p.id=x.created_by and p.user_id=p_user_id and x.session_id=p_session_id and x.revoked_at is null;
  select * into s from public.session_activity where workspace_id=p_workspace_id and created_by=a and session_id=p_session_id for update;
  if found then
    perform private.session_actor(p_workspace_id,p_user_id,p_session_id);
    update public.session_activity set last_interaction_at=now() where id=s.id returning * into s;
  else
    insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at)
      values(p_workspace_id,a,p_session_id,now(),started+interval '8 hours') returning * into s;
    insert into public.audit_log(workspace_id,created_by,action,outcome) values(p_workspace_id,a,'session.started','success');
  end if;
  return jsonb_build_object('workspaceId',p_workspace_id,'expiresAt',s.expires_at,'idleExpiresAt',s.last_interaction_at+interval '15 minutes',
    'inactivitySeconds',900,'timeboxSeconds',28800);
end $$;
-- Actual provider model and prompt snapshots cannot be reassigned after creation.
create function private.protect_message_origin() returns trigger language plpgsql set search_path='' as $$
begin
  if (new.workspace_id,new.created_by,new.conversation_id,new.role,new.model_id,new.model_snapshot,new.prompt_version_id,new.client_request_id)
     is distinct from (old.workspace_id,old.created_by,old.conversation_id,old.role,old.model_id,old.model_snapshot,old.prompt_version_id,old.client_request_id) then
    raise exception using errcode='42501',message='MESSAGE_ORIGIN_IMMUTABLE'; end if;
  if old.status in ('completed','interrupted','failed') and new is distinct from old then
    raise exception using errcode='42501',message='MESSAGE_FINAL_IMMUTABLE'; end if;
  return new;
end $$;
create trigger message_origin before update on public.messages for each row execute function private.protect_message_origin();
revoke all on function private.session_actor(uuid,uuid,uuid),private.assert_auth_session(uuid,uuid),private.protect_message_origin() from public,anon,authenticated,service_role;
revoke all on function public.edge_session(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.edge_session(uuid,uuid,uuid,text) to service_role;
commit;
