import { Pool, type PoolClient, type PoolConfig } from "pg";
import { AppError, databaseError, uuid } from "./errors.js";
import type { Rpc } from "./platform.js";
type Validator = (value: unknown) => boolean;
const id: Validator = uuid;
const text: Validator = (v) => typeof v === "string" && v.length <= 100000;
const token: Validator = (v) =>
  v === null || (typeof v === "number" && Number.isSafeInteger(v) && v >= 0);
const model: Validator = (v) =>
  v === null || (typeof v === "string" && v.length <= 300);
const base: [string, string, Validator][] = [
  ["p_workspace_id", "uuid", id],
  ["p_user_id", "uuid", id],
  ["p_session_id", "uuid", id],
];
const payload: [string, string, Validator][] = [
  ...base,
  ["p_conversation_id", "uuid", id],
  ["p_request_id", "uuid", id],
  ["p_content", "text", text],
];
// Names/casts/roles are constants. No request string ever becomes SQL syntax.
const specs: Record<string, [string, string, Validator][]> = Object.freeze({
  edge_session: [
    ...base,
    ["p_action", "text", (v) => v === "touch" || v === "end"],
  ],
  edge_chat_check: base,
  edge_chat_reap: base,
  edge_chat_replay: payload,
  edge_chat_prepare: payload,
  edge_chat_checkpoint: [
    ...base,
    ["p_request_id", "uuid", id],
    ["p_content", "text", text],
  ],
  edge_chat_finish: [
    ["p_workspace_id", "uuid", id],
    ["p_user_id", "uuid", id],
    ["p_request_id", "uuid", id],
    [
      "p_status",
      "text",
      (v) => v === "completed" || v === "interrupted" || v === "failed",
    ],
    ["p_content", "text", text],
    ["p_input_tokens", "bigint", token],
    ["p_output_tokens", "bigint", token],
    ["p_response_model", "text", model],
  ],
});
export function rpcQuery(name: string, args: Record<string, unknown>) {
  if (!Object.hasOwn(specs, name)) throw new AppError("VALIDATION_FAILED", 400);
  const spec =
    name === "edge_session" && Object.hasOwn(args, "p_remember_session")
      ? [
          ...specs[name],
          [
            "p_remember_session",
            "boolean",
            (v: unknown) => typeof v === "boolean",
          ] as [string, string, Validator],
        ]
      : name === 'edge_chat_prepare' && Object.hasOwn(args, 'p_response_format')
        ? [...specs[name], ['p_response_format', 'text', (v: unknown) => v === 'text' || v === 'openui'] as [string,string,Validator],
          ['p_format_instructions','text', (v: unknown) => typeof v === 'string' && v.length <= 40000] as [string,string,Validator]]
        : name === 'edge_chat_replay' && Object.hasOwn(args, 'p_response_format')
          ? [...specs[name], ['p_response_format','text', (v: unknown) => v === 'text' || v === 'openui'] as [string,string,Validator]]
          : ['edge_chat_finish','edge_chat_checkpoint'].includes(name) && Object.hasOwn(args,'p_presentation')
            ? [...specs[name], ['p_presentation','jsonb', (v: unknown) => v === null || (typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v).length <= 700000)] as [string,string,Validator]]
            : specs[name];
  if (
    Object.keys(args).length !== spec.length ||
    spec.some(
      ([key, , valid]) => !Object.hasOwn(args, key) || !valid(args[key]),
    )
  )
    throw new AppError("VALIDATION_FAILED", 400);
  return {
    text: `SELECT public.${name}(${spec.map(([, cast], i) => `$${i + 1}::${cast}`).join(",")}) AS result`,
    values: spec.map(([key]) => args[key]),
  };
}
export function createDatabase(
  config: PoolConfig,
  availableProviders?: readonly string[],
) {
  const pool = new Pool({
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
    statement_timeout: 10000,
    query_timeout: 12000,
    application_name: "pflege_node_phase1",
    ...config,
  });
  pool.on("error", () => {}); // Never log SQL, URLs or credentials.
  const rpc: Rpc = async (name, args, outer) => {
    const query = rpcQuery(name, args); // Deny before acquiring a connection.
    const signal = AbortSignal.any([
      outer ?? new AbortController().signal,
      AbortSignal.timeout(15000),
    ]);
    if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
    let client: PoolClient | undefined;
    let released = false;
    const abort = () => {
      if (client && !released) {
        released = true;
        client.release(true);
      }
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      client = await pool.connect();
      if (signal.aborted) {
        abort();
        throw new AppError("REQUEST_ABORTED", 409);
      }
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE pflege_backend");
      await client.query("SET LOCAL search_path = ''");
      await client.query("SET LOCAL statement_timeout = '10s'");
      await client.query("SET LOCAL lock_timeout = '3s'");
      if (name === "edge_chat_prepare" && availableProviders !== undefined) {
        await client.query(
          "SELECT pg_catalog.set_config('pflege.available_providers', $1, true)",
          [JSON.stringify(availableProviders)],
        );
      }
      const result = await client.query(query); // Unnamed, transaction-pooler compatible.
      await client.query("COMMIT");
      return result.rows[0]?.result;
    } catch (error) {
      if (client && !released) {
        try {
          await client.query("ROLLBACK");
        } catch {
          released = true;
          client.release(true);
        }
      }
      if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      throw databaseError((error as { message?: unknown })?.message);
    } finally {
      signal.removeEventListener("abort", abort);
      if (client && !released) client.release();
    }
  };
  async function verify() {
    const client = await pool.connect();
    try {
      if (config.ssl) {
        const socket = (
          client as unknown as {
            connection: {
              stream: { encrypted?: boolean; authorized?: boolean };
            };
          }
        ).connection.stream;
        if (!socket.encrypted || !socket.authorized)
          throw new AppError("INTERNAL_ERROR");
      }
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL ROLE pflege_backend");
      const result = await client.query(`SELECT current_user AS role,
        has_function_privilege(current_user,'public.edge_session(uuid,uuid,uuid,text)','EXECUTE') AS session,
        has_function_privilege(current_user,'public.edge_session(uuid,uuid,uuid,text,boolean)','EXECUTE') AS remembered,
        has_function_privilege(current_user,'public.edge_chat_prepare(uuid,uuid,uuid,uuid,uuid,text)','EXECUTE') AS chat,
        has_function_privilege(current_user,'public.edge_chat_prepare(uuid,uuid,uuid,uuid,uuid,text,text,text)','EXECUTE') AS presentation,
        has_function_privilege(current_user,'public.edge_chat_replay(uuid,uuid,uuid,uuid,uuid,text,text)','EXECUTE') AS presentation_replay,
        has_function_privilege(current_user,'public.edge_chat_finish(uuid,uuid,uuid,text,text,bigint,bigint,text,jsonb)','EXECUTE') AS presentation_finish,
        has_function_privilege(current_user,'public.edge_chat_checkpoint(uuid,uuid,uuid,uuid,text,jsonb)','EXECUTE') AS presentation_checkpoint,
        NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolcanlogin OR rolsuper OR rolinherit OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) AS limited,
        NOT has_schema_privilege(current_user,'private','USAGE') AND NOT has_schema_privilege(current_user,'auth','USAGE') AND NOT has_schema_privilege(current_user,'storage','USAGE') AS private_denied,
        NOT EXISTS(SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relkind IN ('r','p') AND has_table_privilege(current_user,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')) AS tables_denied`);
      const proof = result.rows[0];
      if (
        proof?.role !== "pflege_backend" ||
        !proof.session ||
        !proof.remembered ||
        !proof.chat ||
        !proof.presentation || !proof.presentation_replay || !proof.presentation_finish || !proof.presentation_checkpoint ||
        !proof.limited ||
        !proof.private_denied ||
        !proof.tables_denied
      )
        throw new AppError("INTERNAL_ERROR");
      await client.query("ROLLBACK");
    } catch {
      client.release(true);
      throw new AppError("INTERNAL_ERROR");
    }
    client.release();
  }
  return { rpc, verify, close: () => pool.end(), pool };
}
