-- Phase 0: original workspace-scoped schema. No auth users or provider calls.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
revoke create on schema public from public, anon, authenticated;

create type public.actor_kind as enum ('system','user');
create type public.membership_role as enum ('member','admin');
create type public.membership_status as enum ('active','revoked');
create type public.agent_mode as enum ('answer_only','create');
create type public.document_status as enum ('draft','reviewed','sent');
create type public.document_kind as enum ('letter','application','objection','respite','relief');
create type public.task_priority as enum ('low','normal','high','urgent');
create type public.task_status as enum ('open','in_progress','done','cancelled');
create type public.message_role as enum ('user','assistant','system','tool');
create type public.message_status as enum ('pending','streaming','completed','interrupted','failed');
create type public.attachment_status as enum ('pending','ready','rejected','deleted');
create type public.attachment_scope as enum ('workspace','owner');
create type public.ai_provider as enum ('openai','anthropic','mistral');
create type public.hosting_region as enum ('eu','us','unverified');
create type public.model_status as enum ('planned','operational','retired');
create type public.proposal_kind as enum ('document','task','note','handover');
create type public.proposal_status as enum ('pending','confirmed','rejected','expired','stale');
create type public.reservation_status as enum ('reserved','settled','held','released');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid generated always as (id) stored not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 120),
  demo_banner boolean not null default true,
  unique(id, workspace_id)
);
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  kind public.actor_kind not null,
  user_id uuid,
  display_name text not null check (length(display_name) between 1 and 120),
  check ((kind = 'system' and user_id is null) or (kind = 'user' and user_id is not null)),
  unique (id,workspace_id),
  unique (workspace_id,user_id),
  foreign key (created_by,workspace_id) references public.profiles(id,workspace_id) deferrable initially deferred
);
alter table public.workspaces add foreign key (created_by,workspace_id)
  references public.profiles(id,workspace_id) deferrable initially deferred;
create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  profile_id uuid not null,
  role public.membership_role not null default 'member',
  status public.membership_status not null default 'active',
  unique (workspace_id,profile_id)
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('insurer','doctor','care_service','relative','other')),
  name text not null check (length(name) between 1 and 200),
  address jsonb not null default '{}' check (jsonb_typeof(address) = 'object'),
  email text, phone text, reference text
);
create table public.care_recipients (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 200),
  care_grade smallint not null default 0 check (care_grade between 0 and 5),
  birth_date date, address jsonb not null default '{}' check (jsonb_typeof(address) = 'object'),
  insurer_contact_id uuid, summary text not null default ''
);
create table public.ai_models (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  provider public.ai_provider not null,
  provider_model_id text not null check (length(provider_model_id) between 1 and 200),
  display_name text not null,
  hosting_region public.hosting_region not null default 'unverified',
  region_evidence_url text, capabilities_verified_at timestamptz,
  supports_tools boolean, supports_vision boolean,
  enabled boolean not null default false, status public.model_status not null default 'planned',
  check (not enabled or (status = 'operational' and capabilities_verified_at is not null)),
  unique (workspace_id,provider,provider_model_id)
);
create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  version integer not null check (version > 0),
  persona text not null check (length(persona) between 1 and 2000),
  system_prompt text not null check (length(system_prompt) between 1 and 20000),
  is_default boolean not null default false,
  unique (workspace_id,version)
);
create unique index one_default_prompt on public.prompt_versions(workspace_id) where is_default;
create table public.agent_setting_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  version integer not null check (version > 0), mode public.agent_mode not null default 'answer_only',
  prompt_version_id uuid not null, default_model_id uuid,
  unique (workspace_id,version)
);
create table public.agent_settings (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null unique, created_by uuid not null,
  created_at timestamptz not null default now(),
  current_version_id uuid not null, revision integer not null default 1 check (revision > 0)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  title text not null check (length(title) between 1 and 120),
  care_recipient_id uuid, mode_override public.agent_mode, model_override_id uuid,
  archived_at timestamptz, revision integer not null default 1 check (revision > 0)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  conversation_id uuid not null, role public.message_role not null,
  content text not null default '', status public.message_status not null default 'completed',
  model_id uuid, model_snapshot jsonb, prompt_version_id uuid,
  input_tokens bigint check (input_tokens >= 0), output_tokens bigint check (output_tokens >= 0),
  tool_calls jsonb not null default '[]' check (jsonb_typeof(tool_calls) = 'array'),
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  client_request_id uuid,
  check (role <> 'assistant' or (model_id is not null and model_snapshot is not null and prompt_version_id is not null)),
  check (model_snapshot is null or jsonb_typeof(model_snapshot) = 'object'),
  unique (workspace_id,client_request_id,role),
  unique (id,conversation_id,workspace_id)
);
create table public.documents (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  care_recipient_id uuid, conversation_id uuid,
  kind public.document_kind not null, status public.document_status not null default 'draft',
  title text not null check (length(title) between 1 and 200),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  rendered_text text not null, revision integer not null default 1 check (revision > 0)
);
create table public.document_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  document_id uuid not null, version integer not null check (version > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object'), rendered_text text not null,
  unique (document_id,version)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  care_recipient_id uuid, conversation_id uuid,
  kind text not null default 'standard' check (kind in ('standard','handover')),
  title text not null check (length(title) between 1 and 200), description text not null default '',
  due_at timestamptz, deadline_source text,
  priority public.task_priority not null default 'normal', status public.task_status not null default 'open'
);
create table public.notes (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  care_recipient_id uuid not null, conversation_id uuid,
  body text not null check (length(body) between 1 and 20000)
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  care_recipient_id uuid, conversation_id uuid, message_id uuid,
  bucket_id text not null default 'care-private' check (bucket_id = 'care-private'),
  object_path text not null unique,
  display_name text not null check (length(display_name) between 1 and 200),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  sha256 text check (sha256 ~ '^[a-f0-9]{64}$'),
  status public.attachment_status not null default 'pending',
  visibility public.attachment_scope not null default 'workspace',
  check (message_id is null or conversation_id is not null),
  check (object_path ~ ('^' || workspace_id::text || '/' || id::text || '/[A-Za-z0-9_-]+\.(pdf|jpg|jpeg|png|webp)$')),
  check (status <> 'ready' or sha256 is not null)
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  conversation_id uuid, message_id uuid, model_id uuid,
  action text not null, tool_name text, target_table text, target_id uuid,
  outcome text not null check (outcome in ('success','denied','failed')),
  request_id uuid, metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  check (message_id is null or conversation_id is not null)
);
create table public.tool_proposals (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  conversation_id uuid not null, message_id uuid not null, kind public.proposal_kind not null,
  preview jsonb not null check (jsonb_typeof(preview) = 'object'),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  context_sha256 text not null check (context_sha256 ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null check (expires_at > created_at),
  status public.proposal_status not null default 'pending', revision integer not null default 1 check (revision > 0),
  confirmed_preview jsonb, confirmed_at timestamptz, idempotency_key uuid, payload_sha256 text,
  result_id uuid,
  check ((status = 'confirmed' and confirmed_preview is not null and confirmed_at is not null
    and idempotency_key is not null and payload_sha256 is not null and result_id is not null)
    or (status <> 'confirmed' and confirmed_at is null and result_id is null)),
  unique (workspace_id,created_by,idempotency_key)
);
create table public.workspace_budgets (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null unique, created_by uuid not null,
  created_at timestamptz not null default now(),
  monthly_cap_microusd bigint not null default 0 check (monthly_cap_microusd >= 0),
  currency text not null default 'USD' check (currency = 'USD'), blocked boolean not null default false
);
create table public.cost_reservations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  request_id uuid not null, model_id uuid not null, month date not null check (extract(day from month) = 1),
  amount_microusd bigint not null check (amount_microusd >= 0),
  price_snapshot jsonb not null check (jsonb_typeof(price_snapshot) = 'object'),
  status public.reservation_status not null default 'reserved', settled_at timestamptz,
  unique (workspace_id,request_id),
  unique (id,workspace_id,model_id,request_id,month)
);
create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  reservation_id uuid not null, model_id uuid not null, request_id uuid not null,
  month date not null check (extract(day from month) = 1),
  input_tokens bigint not null check (input_tokens >= 0), output_tokens bigint not null check (output_tokens >= 0),
  cached_tokens bigint not null default 0 check (cached_tokens >= 0),
  cost_microusd bigint not null check (cost_microusd >= 0),
  estimated boolean not null default false,
  unique (workspace_id,request_id)
);

-- Every application table has matching actor/workspace FKs; no cross-workspace references.
do $$
declare t text;
begin
  foreach t in array array['workspace_memberships','contacts','care_recipients','ai_models','prompt_versions',
    'agent_setting_versions','agent_settings','conversations','messages','documents','document_versions',
    'tasks','notes','attachments','audit_log','tool_proposals','workspace_budgets','cost_reservations','usage_ledger'] loop
    execute format('alter table public.%I add unique (id,workspace_id)', t);
    execute format('alter table public.%I add foreign key (workspace_id) references public.workspaces(id)', t);
    execute format('alter table public.%I add foreign key (created_by,workspace_id) references public.profiles(id,workspace_id) deferrable initially deferred', t);
    execute format('create index on public.%I (workspace_id,created_at)', t);
  end loop;
end $$;
alter table public.workspace_memberships add foreign key (profile_id,workspace_id) references public.profiles(id,workspace_id);
alter table public.care_recipients add foreign key (insurer_contact_id,workspace_id) references public.contacts(id,workspace_id);
alter table public.agent_setting_versions add foreign key (prompt_version_id,workspace_id) references public.prompt_versions(id,workspace_id);
alter table public.agent_setting_versions add foreign key (default_model_id,workspace_id) references public.ai_models(id,workspace_id);
alter table public.agent_settings add foreign key (current_version_id,workspace_id) references public.agent_setting_versions(id,workspace_id);
alter table public.conversations add foreign key (care_recipient_id,workspace_id) references public.care_recipients(id,workspace_id);
alter table public.conversations add foreign key (model_override_id,workspace_id) references public.ai_models(id,workspace_id);
alter table public.messages add foreign key (conversation_id,workspace_id) references public.conversations(id,workspace_id);
alter table public.messages add foreign key (model_id,workspace_id) references public.ai_models(id,workspace_id);
alter table public.messages add foreign key (prompt_version_id,workspace_id) references public.prompt_versions(id,workspace_id);
do $$
declare t text;
begin
  foreach t in array array['documents','tasks','notes','attachments'] loop
    execute format('alter table public.%I add foreign key (care_recipient_id,workspace_id) references public.care_recipients(id,workspace_id)',t);
    execute format('alter table public.%I add foreign key (conversation_id,workspace_id) references public.conversations(id,workspace_id)',t);
  end loop;
end $$;
alter table public.document_versions add foreign key (document_id,workspace_id) references public.documents(id,workspace_id);
alter table public.attachments add foreign key (message_id,conversation_id,workspace_id) references public.messages(id,conversation_id,workspace_id);
alter table public.audit_log add foreign key (conversation_id,workspace_id) references public.conversations(id,workspace_id);
alter table public.audit_log add foreign key (message_id,conversation_id,workspace_id) references public.messages(id,conversation_id,workspace_id);
alter table public.audit_log add foreign key (model_id,workspace_id) references public.ai_models(id,workspace_id);
alter table public.tool_proposals add foreign key (conversation_id,workspace_id) references public.conversations(id,workspace_id);
alter table public.tool_proposals add foreign key (message_id,conversation_id,workspace_id) references public.messages(id,conversation_id,workspace_id);
alter table public.cost_reservations add foreign key (model_id,workspace_id) references public.ai_models(id,workspace_id);
alter table public.usage_ledger add foreign key (model_id,workspace_id) references public.ai_models(id,workspace_id);
alter table public.usage_ledger add foreign key (reservation_id,workspace_id,model_id,request_id,month)
  references public.cost_reservations(id,workspace_id,model_id,request_id,month);
create index on public.tasks(workspace_id,status,due_at);
create index on public.messages(workspace_id,conversation_id,created_at);
create index on public.documents(workspace_id,status,created_at);
create index on public.profiles(user_id,workspace_id) where user_id is not null;

create function private.current_actor(p_workspace_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p join public.workspace_memberships m
  on m.profile_id = p.id and m.workspace_id = p.workspace_id
  where p.workspace_id = p_workspace_id and p.kind = 'user' and p.user_id = auth.uid()
    and m.status = 'active'
$$;
create function private.is_member(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.current_actor(p_workspace_id) is not null
$$;
create function private.is_admin(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_memberships m where m.workspace_id = p_workspace_id
    and m.profile_id = private.current_actor(p_workspace_id) and m.role = 'admin' and m.status = 'active')
$$;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    if t in ('audit_log','workspace_budgets','cost_reservations','usage_ledger') then
      execute format('create policy admin_read on public.%I for select to authenticated using (private.is_admin(workspace_id))',t);
    elsif t = 'tool_proposals' then
      execute format('create policy actor_read on public.%I for select to authenticated using (created_by = private.current_actor(workspace_id))',t);
    elsif t = 'attachments' then
      execute format('create policy attachment_read on public.%I for select to authenticated using (private.is_member(workspace_id) and (visibility = ''workspace'' or created_by = private.current_actor(workspace_id)))',t);
    else
      execute format('create policy member_read on public.%I for select to authenticated using (private.is_member(workspace_id))',t);
    end if;
  end loop;
end $$;
-- Immutability also applies to trusted service clients, not just the browser.
revoke update,delete,truncate on public.audit_log,public.usage_ledger,public.prompt_versions,
  public.agent_setting_versions,public.document_versions from service_role;
alter default privileges in schema public revoke all on tables from public,anon,authenticated;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;
commit;
