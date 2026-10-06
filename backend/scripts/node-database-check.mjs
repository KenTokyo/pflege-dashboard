/** Native Supabase only: whitelist, bounded roles, rollback and cancellation of a real blocked RPC. */
import assert from "node:assert/strict";
import { backend, localStatus, localClient } from "./local-db.mjs";
import { createDatabase } from "../.local/build/backend/runtime/database.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
let db;
let holder;
let checks = 0;
let failure = false;
const records = [];
const check = (value, label) => {
  assert.ok(value, label);
  checks++;
  records.push({ label, passed: true });
};
try {
  const status = await localStatus();
  db = createDatabase({ connectionString: status.env.DB_URL });
  await db.verify();
  check(true, "native real database and NOLOGIN RPC-only role");
  const ids = {
    p_workspace_id: "10000000-0000-4000-8000-000000000001",
    p_user_id: "60000000-0000-4000-8000-000000000002",
    p_session_id: "60000000-0000-4000-8000-000000000003",
  };
  const request = {
    ...ids,
    p_conversation_id: "10000000-0000-4000-8000-000000000050",
    p_request_id: "60000000-0000-4000-8000-000000000004",
    p_content: "Fiktiver SQL-Test",
  };
  for (const [name, args] of [
    ["edge_session", { ...ids, p_action: "end" }],
    ["edge_chat_check", ids],
    ["edge_chat_reap", ids],
    ["edge_chat_replay", request],
    ["edge_chat_prepare", request],
    [
      "edge_chat_checkpoint",
      { ...ids, p_request_id: request.p_request_id, p_content: "Test" },
    ],
  ]) {
    await assert.rejects(
      db.rpc(name, args),
      (e) => e.code === "SESSION_EXPIRED",
    );
    check(true, `${name} rejects absent actual Auth session`);
  }
  const finish = {
    p_workspace_id: ids.p_workspace_id,
    p_user_id: ids.p_user_id,
    p_request_id: request.p_request_id,
    p_status: "interrupted",
    p_content: "Test",
    p_input_tokens: null,
    p_output_tokens: null,
    p_response_model: null,
  };
  await assert.rejects(
    db.rpc("edge_chat_finish", finish),
    (e) => e.code === "RESOURCE_NOT_FOUND",
  );
  check(true, "trusted cleanup cannot finalize another/nonexistent request");
  for (const name of [
    "__proto__",
    "private.chat_prepare",
    "edge_chat_finish;select 1",
    "pg_sleep",
  ]) {
    await assert.rejects(
      db.rpc(name, {}),
      (e) => e.code === "VALIDATION_FAILED",
    );
    check(true, `denies fixed-name bypass ${name}`);
  }
  holder = await localClient("pflege_node_abort_fixture");
  await holder.query("BEGIN");
  await holder.query(
    "LOCK TABLE public.chat_requests IN ACCESS EXCLUSIVE MODE",
  );
  const controller = new AbortController();
  const operation = db.rpc("edge_chat_finish", finish, controller.signal);
  void operation.catch(() => {});
  let waiting = false;
  for (let i = 0; i < 100; i++) {
    await holder.query("SELECT pg_stat_clear_snapshot()");
    const rows = (
      await holder.query(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name='pflege_node_phase1' AND wait_event_type='Lock' ",
      )
    ).rows;
    if (rows[0].n === 1) {
      waiting = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  check(waiting, "real product RPC blocked in PostgreSQL before abort");
  const abortedAt = Date.now();
  controller.abort();
  await assert.rejects(operation, (e) => e.code === "REQUEST_ABORTED");
  check(
    Date.now() - abortedAt < 1000,
    "abort destroys owned PG connection within 1s",
  );
  await holder.query("ROLLBACK");
  const client = await db.pool.connect();
  try {
    const result = (
      await client.query(
        "SELECT current_user AS role, current_setting('search_path') AS path, (SELECT count(*)::int FROM auth.users) AS accounts, (SELECT monthly_cap_microusd FROM public.workspace_budgets WHERE workspace_id=$1::uuid) AS budget",
        [ids.p_workspace_id],
      )
    ).rows[0];
    check(
      result.role !== "pflege_backend",
      "role never persists outside a transaction",
    );
    check(result.path !== "", "local search path reset after rollback/abort");
    check(result.accounts === 0, "no Auth account created");
    check(
      Number(result.budget) === 0,
      "fictitious workspace budget remains zero",
    );
  } finally {
    client.release();
  }
} catch {
  failure = true;
  console.error(
    "Node-Datenbankprüfung fehlgeschlagen; keine SQL-/Secret-Rohausgabe.",
  );
} finally {
  if (holder) {
    await holder.query("ROLLBACK").catch(() => {});
    await holder.end();
  }
  await db?.close();
  await writeFile(
    path.join(backend, ".local/node-database.json"),
    JSON.stringify(
      {
        passed: !failure,
        checks,
        records,
        scope: "actual native Supabase, no Auth account or provider call",
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
}
console.log(
  `Node-PG-Rollen/Abbruch: ${checks} bestandene Prüfungen; ${failure ? "fehlgeschlagen" : "bestanden"}.`,
);
if (failure) process.exitCode = 1;
