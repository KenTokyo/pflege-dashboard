-- Operator-only after Gemini migrations and an actual server-side key/model probe.
-- Model/verified timestamp come from trusted transaction settings, never browser input.
-- Defaults and existing chat choices stay as selected unless select_default is explicitly true.
begin;
do $$
declare w constant uuid := '10000000-0000-4000-8000-000000000001';
 a constant uuid := '10000000-0000-4000-8000-000000000002';
 chosen_model text := nullif(current_setting('pflege.gemini.model_id',true),'');
 verified timestamptz := nullif(current_setting('pflege.gemini.verified_at',true),'')::timestamptz;
 select_default boolean := coalesce(nullif(current_setting('pflege.gemini.select_default',true),''),'false')::boolean;
 m uuid; settings public.agent_settings; old public.agent_setting_versions; version_id uuid; changed boolean;
begin
 if current_user <> 'postgres' then raise exception 'OPERATOR_REQUIRED'; end if;
 if chosen_model is null or chosen_model !~ '^gemini-[a-zA-Z0-9._-]{1,190}$' or verified is null or verified>now() then
   raise exception 'VERIFIED_GEMINI_MODEL_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('pflege_demo_gemini_setup',0));
 if not exists(select 1 from public.profiles where id=a and workspace_id=w and kind='system' and user_id is null)
   then raise exception 'DEMO_WORKSPACE_REQUIRED'; end if;
 insert into public.ai_models(workspace_id,created_by,provider,provider_model_id,display_name,
   enabled,status,capabilities_verified_at,supports_tools,supports_vision,hosting_region)
 values(w,a,'gemini',chosen_model,initcap(replace(chosen_model,'-',' '))||' · Google AI Studio',true,'operational',verified,false,false,'unverified')
 on conflict(workspace_id,provider,provider_model_id) do update set
   enabled=true,status='operational',capabilities_verified_at=excluded.capabilities_verified_at,
   display_name=excluded.display_name,supports_tools=false,supports_vision=false,hosting_region='unverified'
 returning id into m;
 -- User-provided Free-Tier evidence: zero monetary estimate, genuine tokens remain recorded.
 -- Not an invoice or a claim that the provider has no quota. No billing/account changes.
 if not exists(select 1 from public.model_prices where workspace_id=w and model_id=m
   and input_microusd_per_million=0 and output_microusd_per_million=0 and expires_at='infinity'::timestamptz) then
  insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,
   output_microusd_per_million,verified_at,expires_at,evidence_url)
  values(w,a,m,0,0,verified,'infinity'::timestamptz,'https://ai.google.dev/gemini-api/docs/pricing');
 end if;
 if select_default then
  select * into settings from public.agent_settings where workspace_id=w for update;
  select * into old from public.agent_setting_versions where id=settings.current_version_id and workspace_id=w;
  if old.id is null then raise exception 'SETTINGS_REQUIRED'; end if;
  if old.default_model_id is distinct from m then
   insert into public.agent_setting_versions(workspace_id,created_by,version,mode,prompt_version_id,default_model_id)
    values(w,a,(select max(version)+1 from public.agent_setting_versions where workspace_id=w),old.mode,old.prompt_version_id,m)
    returning id into version_id;
   update public.agent_settings set current_version_id=version_id,revision=revision+1 where id=settings.id;
   insert into public.audit_log(workspace_id,created_by,model_id,action,outcome,metadata)
    values(w,a,m,'demo.gemini.default_selected','success',jsonb_build_object('explicitOperatorChoice',true));
  end if;
 end if;
 if not exists(select 1 from public.audit_log where workspace_id=w and model_id=m and action='demo.gemini.configured') then
  insert into public.audit_log(workspace_id,created_by,model_id,action,outcome,metadata)
   values(w,a,m,'demo.gemini.configured','success',jsonb_build_object('billing','User-confirmed Google AI Studio Free Tier','estimatedCosts',true,'textOnly',true));
 end if;
end $$;
commit;
