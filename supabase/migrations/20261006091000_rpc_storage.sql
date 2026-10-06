begin;
create function private.rpc_rename_conversation(p_conversation_id uuid,p_title text,p_expected_revision integer)
returns public.conversations language plpgsql security definer set search_path = '' as $$
declare c public.conversations; a uuid;
begin
  select * into c from public.conversations where id = p_conversation_id
    and private.is_member(workspace_id) for update;
  if not found then raise exception using errcode='P0002', message='RESOURCE_NOT_FOUND'; end if;
  if c.revision <> p_expected_revision or p_expected_revision is null then
    raise exception using errcode='40001', message='REVISION_CONFLICT'; end if;
  if p_title is null or length(btrim(p_title)) not between 1 and 120 then
    raise exception using errcode='22023', message='VALIDATION_FAILED'; end if;
  a := private.current_actor(c.workspace_id);
  update public.conversations set title=btrim(p_title), revision=revision+1 where id=c.id returning * into c;
  insert into public.audit_log(workspace_id,created_by,conversation_id,action,target_table,target_id,outcome)
    values(c.workspace_id,a,c.id,'conversation.renamed','conversations',c.id,'success');
  return c;
end $$;
create function public.rename_conversation(p_conversation_id uuid,p_title text,p_expected_revision integer)
returns public.conversations language sql security invoker set search_path = '' as $$
  select private.rpc_rename_conversation(p_conversation_id,p_title,p_expected_revision)
$$;

create function private.rpc_set_conversation_preferences(p_conversation_id uuid,p_mode public.agent_mode,
  p_model_id uuid,p_archived boolean,p_expected_revision integer)
returns public.conversations language plpgsql security definer set search_path = '' as $$
declare c public.conversations; a uuid;
begin
  select * into c from public.conversations where id=p_conversation_id
    and private.is_member(workspace_id) for update;
  if not found then raise exception using errcode='P0002', message='RESOURCE_NOT_FOUND'; end if;
  if c.revision <> p_expected_revision or p_expected_revision is null then
    raise exception using errcode='40001', message='REVISION_CONFLICT'; end if;
  if p_archived is null then raise exception using errcode='22023', message='VALIDATION_FAILED'; end if;
  if p_model_id is not null and not exists(select 1 from public.ai_models
    where id=p_model_id and workspace_id=c.workspace_id and enabled and status='operational') then
    raise exception using errcode='22023', message='MODEL_UNAVAILABLE'; end if;
  a := private.current_actor(c.workspace_id);
  update public.conversations set mode_override=p_mode,model_override_id=p_model_id,
    archived_at=case when p_archived then coalesce(archived_at,now()) else null end,
    revision=revision+1 where id=c.id returning * into c;
  insert into public.audit_log(workspace_id,created_by,conversation_id,action,target_table,target_id,outcome)
    values(c.workspace_id,a,c.id,'conversation.preferences_changed','conversations',c.id,'success');
  return c;
end $$;
create function public.set_conversation_preferences(p_conversation_id uuid,p_mode public.agent_mode,
  p_model_id uuid,p_archived boolean,p_expected_revision integer)
returns public.conversations language sql security invoker set search_path = '' as $$
  select private.rpc_set_conversation_preferences(p_conversation_id,p_mode,p_model_id,p_archived,p_expected_revision)
$$;

create function private.rpc_mark_document_status(p_document_id uuid,p_status public.document_status,p_expected_revision integer)
returns public.documents language plpgsql security definer set search_path = '' as $$
declare d public.documents; a uuid;
begin
  select * into d from public.documents where id=p_document_id and private.is_member(workspace_id) for update;
  if not found then raise exception using errcode='P0002', message='RESOURCE_NOT_FOUND'; end if;
  if d.revision <> p_expected_revision or p_expected_revision is null then
    raise exception using errcode='40001', message='REVISION_CONFLICT'; end if;
  if p_status is null then raise exception using errcode='22023', message='VALIDATION_FAILED'; end if;
  a := private.current_actor(d.workspace_id);
  update public.documents set status=p_status,revision=revision+1 where id=d.id returning * into d;
  insert into public.audit_log(workspace_id,created_by,conversation_id,action,target_table,target_id,outcome,
    metadata) values(d.workspace_id,a,d.conversation_id,'document.status_marked','documents',d.id,'success',
    jsonb_build_object('status',p_status,'manual',true));
  return d;
end $$;
create function public.mark_document_status(p_document_id uuid,p_status public.document_status,p_expected_revision integer)
returns public.documents language sql security invoker set search_path = '' as $$
  select private.rpc_mark_document_status(p_document_id,p_status,p_expected_revision)
$$;

create function private.rpc_update_agent_settings(p_workspace_id uuid,p_mode public.agent_mode,p_persona text,
  p_system_prompt text,p_model_id uuid,p_expected_revision integer,p_reset_to_default boolean)
returns public.agent_settings language plpgsql security definer set search_path = '' as $$
declare s public.agent_settings; a uuid; prompt_id uuid; setting_id uuid;
begin
  if not private.is_admin(p_workspace_id) then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
  select * into s from public.agent_settings where workspace_id=p_workspace_id for update;
  if not found then raise exception using errcode='P0002',message='RESOURCE_NOT_FOUND'; end if;
  if s.revision <> p_expected_revision or p_expected_revision is null then
    raise exception using errcode='40001',message='REVISION_CONFLICT'; end if;
  if p_mode is null or p_reset_to_default is null then raise exception using errcode='22023',message='VALIDATION_FAILED'; end if;
  if p_model_id is not null and not exists(select 1 from public.ai_models
    where id=p_model_id and workspace_id=p_workspace_id and enabled and status='operational') then
    raise exception using errcode='22023',message='MODEL_UNAVAILABLE'; end if;
  a := private.current_actor(p_workspace_id);
  if p_reset_to_default then
    select id into prompt_id from public.prompt_versions where workspace_id=p_workspace_id and is_default;
    if prompt_id is null then raise exception using errcode='P0002',message='DEFAULT_PROMPT_NOT_FOUND'; end if;
  else
    if p_persona is null or length(btrim(p_persona)) not between 1 and 2000 or
      p_system_prompt is null or length(btrim(p_system_prompt)) not between 1 and 20000 then
      raise exception using errcode='22023',message='VALIDATION_FAILED'; end if;
    insert into public.prompt_versions(workspace_id,created_by,version,persona,system_prompt)
      select p_workspace_id,a,coalesce(max(version),0)+1,btrim(p_persona),btrim(p_system_prompt)
      from public.prompt_versions where workspace_id=p_workspace_id returning id into prompt_id;
  end if;
  insert into public.agent_setting_versions(workspace_id,created_by,version,mode,prompt_version_id,default_model_id)
    select p_workspace_id,a,coalesce(max(version),0)+1,p_mode,prompt_id,p_model_id
    from public.agent_setting_versions where workspace_id=p_workspace_id returning id into setting_id;
  update public.agent_settings set current_version_id=setting_id,revision=revision+1 where id=s.id returning * into s;
  insert into public.audit_log(workspace_id,created_by,action,target_table,target_id,outcome,metadata)
    values(p_workspace_id,a,'agent_settings.versioned','agent_settings',s.id,'success',
      jsonb_build_object('version_id',setting_id,'prompt_version_id',prompt_id,'reset',p_reset_to_default));
  return s;
end $$;
create function public.update_agent_settings(p_workspace_id uuid,p_mode public.agent_mode,p_persona text,
  p_system_prompt text,p_model_id uuid,p_expected_revision integer,p_reset_to_default boolean)
returns public.agent_settings language sql security invoker set search_path = '' as $$
  select private.rpc_update_agent_settings(p_workspace_id,p_mode,p_persona,p_system_prompt,p_model_id,
    p_expected_revision,p_reset_to_default)
$$;
revoke all on all functions in schema private from public,anon;
grant execute on all functions in schema private to authenticated,service_role;
revoke all on function public.rename_conversation(uuid,text,integer),
  public.set_conversation_preferences(uuid,public.agent_mode,uuid,boolean,integer),
  public.mark_document_status(uuid,public.document_status,integer),
  public.update_agent_settings(uuid,public.agent_mode,text,text,uuid,integer,boolean) from public,anon;
grant execute on function public.rename_conversation(uuid,text,integer),
  public.set_conversation_preferences(uuid,public.agent_mode,uuid,boolean,integer),
  public.mark_document_status(uuid,public.document_status,integer),
  public.update_agent_settings(uuid,public.agent_mode,text,text,uuid,integer,boolean) to authenticated,service_role;

-- Storage is supplied by Supabase. No file is seeded. Only an exact reserved path is writable.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('care-private','care-private',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']);
create function private.storage_allowed(p_bucket text,p_path text,p_owner text,p_write boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.attachments a join public.profiles p
    on p.id=a.created_by and p.workspace_id=a.workspace_id
    where p_bucket='care-private' and a.bucket_id=p_bucket and a.object_path=p_path
      and p.kind='user' and p.user_id::text=p_owner and private.is_member(a.workspace_id)
      and case when p_write then a.created_by=private.current_actor(a.workspace_id)
          and a.status='pending' and p_owner=auth.uid()::text
        else (a.status='ready' and (a.visibility='workspace' or a.created_by=private.current_actor(a.workspace_id)))
          or (a.status='pending' and a.created_by=private.current_actor(a.workspace_id)) end)
$$;
revoke all on function private.storage_allowed(text,text,text,boolean) from public,anon;
grant execute on function private.storage_allowed(text,text,text,boolean) to authenticated,service_role;
-- Supabase owns these tables and already enables RLS. Policy creation is supported;
-- ALTER TABLE / changing ownership is neither needed nor allowed.
do $$ begin
  if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='storage' and c.relname='objects' and c.relrowsecurity) or
    not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='storage' and c.relname='buckets' and c.relrowsecurity) then
    raise exception 'Supabase Storage RLS must already be enabled';
  end if;
end $$;
create policy care_private_read on storage.objects for select to authenticated
  using(private.storage_allowed(bucket_id,name,owner_id,false));
create policy care_private_upload on storage.objects for insert to authenticated
  with check(private.storage_allowed(bucket_id,name,owner_id,true));
-- No UPDATE/upsert or direct delete policy. Future deletion endpoint audits + cleans derived content.
commit;
