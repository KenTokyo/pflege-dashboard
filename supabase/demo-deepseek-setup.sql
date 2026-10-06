-- Operator-only setup after the locally verified 9th/10th migrations.
-- NOT a migration or seed. Hosted execution belongs exclusively to the orchestrator.
-- User authorization 2026-10-06: DeepSeek explicitly WITHOUT an app spending limit (supersedes the earlier $5).
begin;
do $$
declare w constant uuid := '10000000-0000-4000-8000-000000000001';
 a constant uuid := '10000000-0000-4000-8000-000000000002';
 m uuid; settings public.agent_settings; old public.agent_setting_versions; version_id uuid;
begin
 if current_user <> 'postgres' then raise exception 'OPERATOR_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('pflege_demo_deepseek_setup',0));
 if not exists(select 1 from public.profiles where id=a and workspace_id=w and kind='system' and user_id is null)
   then raise exception 'DEMO_WORKSPACE_REQUIRED'; end if;
 insert into public.ai_models(workspace_id,created_by,provider,provider_model_id,display_name,
   enabled,status,capabilities_verified_at,supports_tools,supports_vision,hosting_region)
 values(w,a,'deepseek','deepseek-flash','DeepSeek V4.1 Flash',true,'operational',timestamptz '2026-10-06 00:00:00+00',false,false,'unverified')
 on conflict(workspace_id,provider,provider_model_id) do update set
   display_name=excluded.display_name,enabled=true,status='operational',capabilities_verified_at=excluded.capabilities_verified_at,
   supports_tools=false,supports_vision=false,hosting_region='unverified'
 returning id into m;
 -- Peak cache-miss input ($0.30/M) and peak output ($1.20/M), upper charges.
 -- Explicit unlimited demo: permanent ESTIMATE at the documented price stand, no time-based app shutdown.
 -- Infinity marks estimates unsuitable for enforcing any positive spending cap.
 if not exists(select 1 from public.model_prices where workspace_id=w and model_id=m
    and input_microusd_per_million=300000 and output_microusd_per_million=1200000
    and expires_at='infinity'::timestamptz) then
  insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,
   output_microusd_per_million,verified_at,expires_at,evidence_url)
  values(w,a,m,300000,1200000,timestamptz '2026-10-06 00:00:00+00','infinity'::timestamptz,
   'https://api-docs.deepseek.com/quick_start/pricing/');
 end if;
 select * into settings from public.agent_settings where workspace_id=w for update;
 select * into old from public.agent_setting_versions where id=settings.current_version_id and workspace_id=w;
 if old.id is null then raise exception 'SETTINGS_REQUIRED'; end if;
 if old.default_model_id is distinct from m then
  insert into public.agent_setting_versions(workspace_id,created_by,version,mode,prompt_version_id,default_model_id)
    values(w,a,(select max(version)+1 from public.agent_setting_versions where workspace_id=w),old.mode,old.prompt_version_id,m)
    returning id into version_id;
  update public.agent_settings set current_version_id=version_id,revision=revision+1 where id=settings.id;
 end if;
 -- Explicit user choice: NULL means unlimited, never a large fictitious limit.
 -- Preserve spending, held reservations and an existing model/price safety block.
 update public.workspace_budgets set monthly_cap_microusd=null,total_cap_microusd=null
   where workspace_id=w and (monthly_cap_microusd is not null or total_cap_microusd is not null);
 if not found and not exists(select 1 from public.workspace_budgets where workspace_id=w) then raise exception 'BUDGET_REQUIRED'; end if;
 if not exists(select 1 from public.audit_log where workspace_id=w and action='demo.deepseek.configured') then
  insert into public.audit_log(workspace_id,created_by,model_id,action,outcome,metadata)
    values(w,a,m,'demo.deepseek.configured','success',jsonb_build_object('spendingLimit','unlimited','textOnly',true,'priceStand','2026-10-06','estimatedCosts',true));
 end if;
end $$;
commit;
