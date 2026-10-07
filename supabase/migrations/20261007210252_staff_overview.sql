-- Narrow aggregate reader for existing members; raw ledger/request access remains denied.
begin;
create function private.rpc_staff_overview(p_workspace_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if not private.is_member(p_workspace_id) then
  raise exception using errcode='42501',message='WORKSPACE_FORBIDDEN';
 end if;
 select jsonb_build_object(
  'generatedAt',now(),
  'totals',jsonb_build_object(
   'careRecipients',(select count(*) from public.care_recipients where workspace_id=p_workspace_id),
   'openTasks',(select count(*) from public.tasks where workspace_id=p_workspace_id and status in ('open','in_progress')),
   'conversations',(select count(*) from public.conversations where workspace_id=p_workspace_id),
   'activeConversations',(select count(*) from public.conversations where workspace_id=p_workspace_id and archived_at is null),
   'documents',(select count(*) from public.documents where workspace_id=p_workspace_id),
   'requests',(select count(*) from public.chat_requests where workspace_id=p_workspace_id),
   'completedRequests',(select count(*) from public.chat_requests where workspace_id=p_workspace_id and status='completed'),
   'failedRequests',(select count(*) from public.chat_requests where workspace_id=p_workspace_id and status='failed'),
   'interruptedRequests',(select count(*) from public.chat_requests where workspace_id=p_workspace_id and status='interrupted'),
   'inputTokens',(select coalesce(sum(input_tokens),0) from public.usage_ledger where workspace_id=p_workspace_id),
   'outputTokens',(select coalesce(sum(output_tokens),0) from public.usage_ledger where workspace_id=p_workspace_id),
   'costMicrousd',(select coalesce(sum(cost_microusd),0) from public.usage_ledger where workspace_id=p_workspace_id)),
  'people',(select coalesce(jsonb_agg(p order by p.name,p.id),'[]') from (
   select person.id,person.name,person.care_grade as "careGrade",
    (select count(*) from public.tasks t where t.workspace_id=p_workspace_id and t.care_recipient_id=person.id and t.status in ('open','in_progress')) as "openTasks",
    (select count(*) from public.conversations c where c.workspace_id=p_workspace_id and c.care_recipient_id=person.id) as conversations,
    (select count(*) from public.chat_requests r join public.conversations c on c.id=r.conversation_id and c.workspace_id=r.workspace_id
      join public.messages msg on msg.id=r.assistant_message_id and msg.workspace_id=r.workspace_id
      join public.usage_ledger u on u.request_id=r.client_request_id and u.workspace_id=r.workspace_id
      where r.workspace_id=p_workspace_id and c.care_recipient_id=person.id and r.status='completed' and msg.status='completed' and msg.role='assistant') as "completedAnswers",
    (select max(created_at) from public.conversations c where c.workspace_id=p_workspace_id and c.care_recipient_id=person.id) as "lastConversationAt"
   from public.care_recipients person where person.workspace_id=p_workspace_id) p),
  'usage',(select coalesce(jsonb_agg(u order by u."displayName",u."modelId"),'[]') from (
   select m.id as "modelId",m.provider,m.provider_model_id as "providerModelId",m.display_name as "displayName",
    count(*) as requests,sum(l.input_tokens) as "inputTokens",sum(l.output_tokens) as "outputTokens",
    sum(l.cost_microusd) as "costMicrousd",count(*) filter(where l.estimated) as "estimatedRequests"
   from public.usage_ledger l join public.ai_models m on m.id=l.model_id and m.workspace_id=l.workspace_id
   where l.workspace_id=p_workspace_id group by m.id,m.provider,m.provider_model_id,m.display_name) u)
 ) into result;
 return result;
end $$;
create function public.staff_overview(p_workspace_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select private.rpc_staff_overview(p_workspace_id)
$$;
revoke all on function private.rpc_staff_overview(uuid) from public,anon,service_role;
grant execute on function private.rpc_staff_overview(uuid) to authenticated;
revoke all on function public.staff_overview(uuid) from public,anon,service_role;
grant execute on function public.staff_overview(uuid) to authenticated;
commit;
