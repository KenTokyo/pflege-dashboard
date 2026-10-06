-- Dedicated non-login role for the local Node RPC transport; no browser or RLS bypass rights.
-- Existing six migrations and edge_* compatibility names remain unchanged.
begin;
do $$ begin
  if exists(select 1 from pg_roles where rolname='pflege_backend') then
    if (select rolcanlogin or rolsuper or rolinherit or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication from pg_roles where rolname='pflege_backend')
      or shobj_description((select oid from pg_roles where rolname='pflege_backend'),'pg_authid') is distinct from 'Pflege Dashboard Phase 1: local Node RPC-only role, no login' then
      raise exception 'NODE_ROLE_DRIFT';
    end if;
  else
    create role pflege_backend nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
    comment on role pflege_backend is 'Pflege Dashboard Phase 1: local Node RPC-only role, no login';
  end if;
end $$;
grant pflege_backend to postgres;
grant usage on schema public to pflege_backend;
revoke all on all tables in schema public from pflege_backend;
revoke all on all functions in schema public from pflege_backend;
revoke all on schema private,auth,storage from pflege_backend;
-- Older invoker wrappers inherited PUBLIC execution; retain authenticated grants only.
revoke execute on function public.create_conversation(uuid,text,uuid,uuid),
 public.assign_conversation_recipient(uuid,uuid,integer) from public,anon;
grant execute on function public.edge_session(uuid,uuid,uuid,text),
 public.edge_chat_check(uuid,uuid,uuid),public.edge_chat_reap(uuid,uuid,uuid),
 public.edge_chat_replay(uuid,uuid,uuid,uuid,uuid,text),public.edge_chat_prepare(uuid,uuid,uuid,uuid,uuid,text),
 public.edge_chat_checkpoint(uuid,uuid,uuid,uuid,text),
 public.edge_chat_finish(uuid,uuid,uuid,text,text,bigint,bigint,text) to pflege_backend;
commit;
