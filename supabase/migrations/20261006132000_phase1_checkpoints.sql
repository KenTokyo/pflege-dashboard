begin;
-- Persist partial output during ACTIVE streaming, never an idle heartbeat.
create function private.chat_checkpoint(p_workspace_id uuid,p_user_id uuid,p_session_id uuid,p_request_id uuid,p_content text)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.chat_requests;
begin
 if p_content is null or length(p_content)>100000 then raise exception using errcode='22023',message='VALIDATION_FAILED'; end if;
 select x.* into r from public.chat_requests x join public.profiles p on p.id=x.created_by
  where x.workspace_id=p_workspace_id and x.client_request_id=p_request_id and p.user_id=p_user_id and x.session_id=p_session_id for update of x;
 if not found then raise exception using errcode='P0002',message='RESOURCE_NOT_FOUND'; end if;
 if r.status<>'streaming' then raise exception using errcode='55000',message='REQUEST_INTERRUPTED'; end if;
 perform private.session_actor(p_workspace_id,p_user_id,p_session_id);
 update public.messages set content=p_content where id=r.assistant_message_id;
 return true;
end $$;
create function public.edge_chat_checkpoint(p_workspace_id uuid,p_user_id uuid,p_session_id uuid,p_request_id uuid,p_content text)
returns boolean language plpgsql security definer set search_path='' as $$ begin
 perform private.assert_auth_session(p_user_id,p_session_id);
 return private.chat_checkpoint(p_workspace_id,p_user_id,p_session_id,p_request_id,p_content);
end $$;
revoke all on function private.chat_checkpoint(uuid,uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.edge_chat_checkpoint(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.edge_chat_checkpoint(uuid,uuid,uuid,uuid,text) to service_role;
commit;
