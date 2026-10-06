begin;
-- Explicit ACL also on private metadata helpers (the schema was already private).
revoke all on function private.rpc_create_conversation(uuid,text,uuid,uuid),
 private.rpc_assign_conversation_recipient(uuid,uuid,integer) from public,anon;
commit;
