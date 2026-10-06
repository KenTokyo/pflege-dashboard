/** Actual two-transaction budget/idempotency races in the owned real Supabase database. */
import { backend, localClient } from "./local-db.mjs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { redact } from "./redact.mjs";
const w = "51000000-0000-4000-8000-000000000001",
  system = "51000000-0000-4000-8000-000000000002";
const actorA = "51000000-0000-4000-8000-000000000003",
  actorB = "51000000-0000-4000-8000-000000000004";
const uidA = "52000000-0000-4000-8000-000000000001",
  uidB = "52000000-0000-4000-8000-000000000002",
  sid = "53000000-0000-4000-8000-000000000001";
const model = "51000000-0000-4000-8000-000000000005",
  prompt = "51000000-0000-4000-8000-000000000006",
  version = "51000000-0000-4000-8000-000000000007";
const chatA = "51000000-0000-4000-8000-000000000008",
  chatB = "51000000-0000-4000-8000-000000000009";
const requestA = "54000000-0000-4000-8000-000000000001",
  requestB = "54000000-0000-4000-8000-000000000002";
const clients = [];
let owner, a, b;
let checks = 0;
let failure;
let stage = "connect";
let fixturesRemoved = false;
const equal = (left, right) => {
  assert.deepEqual(left, right);
  checks++;
};
async function waiting() {
  for (let i = 0; i < 50; i++) {
    const row = await owner.query(
      "select wait_event_type from pg_stat_activity where application_name='pflege_phase1_writer_b'",
    );
    if (row.rows.some((r) => r.wait_event_type === "Lock")) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}
const prepare = (client, user, chat, request) =>
  client.query("select private.chat_prepare($1,$2,$3,$4,$5,$6) as value", [
    w,
    user,
    sid,
    chat,
    request,
    "Pure SQL fixture; never sent to a provider",
  ]);
try {
  for (const name of ["owner", "writer_a", "writer_b"]) {
    clients.push(await localClient(`pflege_phase1_${name}`));
  }
  [owner, a, b] = clients;
  equal(
    (await owner.query("select count(*)::int as n from auth.users")).rows[0].n,
    0,
  );
  stage = "fixture";
  await owner.query("begin");
  await owner.query(
    "insert into public.workspaces(id,created_by,name) values($1,$2,$3)",
    [w, system, "Parallel SQL fixture"],
  );
  await owner.query(
    "insert into public.profiles(id,workspace_id,created_by,kind,user_id,display_name) values($1,$2,$1,'system',null,'SQL system'),($3,$2,$1,'user',$5,'SQL A'),($4,$2,$1,'user',$6,'SQL B')",
    [system, w, actorA, actorB, uidA, uidB],
  );
  await owner.query(
    "insert into public.workspace_memberships(workspace_id,created_by,profile_id) values($1,$2,$3),($1,$2,$4)",
    [w, system, actorA, actorB],
  );
  await owner.query(
    "insert into public.ai_models(id,workspace_id,created_by,provider,provider_model_id,display_name,enabled,status,capabilities_verified_at) values($1,$2,$3,'openai','sql-fixture-no-call','SQL fixture',true,'operational',now())",
    [model, w, system],
  );
  await owner.query(
    "insert into public.prompt_versions(id,workspace_id,created_by,version,persona,system_prompt,is_default) values($1,$2,$3,1,'SQL persona','SQL fixture prompt',true)",
    [prompt, w, system],
  );
  await owner.query(
    "insert into public.agent_setting_versions(id,workspace_id,created_by,version,prompt_version_id,default_model_id) values($1,$2,$3,1,$4,$5)",
    [version, w, system, prompt, model],
  );
  await owner.query(
    "insert into public.agent_settings(workspace_id,created_by,current_version_id) values($1,$2,$3)",
    [w, system, version],
  );
  await owner.query(
    "insert into public.session_activity(workspace_id,created_by,session_id,last_interaction_at,expires_at) values($1,$2,$4,now(),now()+interval '8 hours'),($1,$3,$4,now(),now()+interval '8 hours')",
    [w, actorA, actorB, sid],
  );
  await owner.query(
    "insert into public.conversations(id,workspace_id,created_by,title) values($1,$3,$4,$6),($2,$3,$5,$6)",
    [chatA, chatB, w, actorA, actorB, "SQL fixture chat"],
  );
  await owner.query(
    "insert into public.model_prices(workspace_id,created_by,model_id,input_microusd_per_million,output_microusd_per_million,verified_at,expires_at,evidence_url) values($1,$2,$3,1000000,1000000,now(),now()+interval '1 day','https://example.invalid/sql-fixture')",
    [w, system, model],
  );
  await owner.query(
    "insert into public.workspace_budgets(workspace_id,created_by,monthly_cap_microusd) values($1,$2,100000000)",
    [w, system],
  );
  await owner.query("commit");
  // Discover exact test reservation without retaining a request or increasing the actual demo budget.
  await owner.query("begin");
  const max =
    (await prepare(owner, uidA, chatA, requestA)).rows[0].value.context
      .maximumCostMicrousd;
  await owner.query("rollback");
  await owner.query(
    "update public.workspace_budgets set monthly_cap_microusd=$1 where workspace_id=$2",
    [max, w],
  );
  stage = "budget-race";
  await a.query("begin");
  await b.query("begin");
  const first = (await prepare(a, uidA, chatA, requestA)).rows[0].value;
  equal(first.replayed, false);
  const second = prepare(b, uidB, chatB, requestB).then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  equal(await waiting(), true);
  await a.query("commit");
  const loser = await second;
  equal(loser.error?.message, "BUDGET_EXCEEDED");
  await b.query("rollback");
  equal(
    (await owner.query(
      "select count(*)::int as n from public.chat_requests where workspace_id=$1",
      [w],
    )).rows[0].n,
    1,
  );
  equal(
    Number(
      (await owner.query(
        "select sum(amount_microusd)::text as n from public.cost_reservations where workspace_id=$1 and status='reserved'",
        [w],
      )).rows[0].n,
    ),
    max,
  );
  await owner.query(
    "select private.chat_finish($1,$2,$3,'interrupted','Partial SQL fixture',null,null,null)",
    [w, uidA, requestA],
  );
  equal(
    (await owner.query(
      "select status from public.cost_reservations where workspace_id=$1",
      [w],
    )).rows[0].status,
    "held",
  );
  const stillBlocked = await prepare(b, uidB, chatB, requestB).then(
    () => null,
    (e) => e.message,
  );
  equal(stillBlocked, "BUDGET_EXCEEDED");
  stage = "idempotency-race";
  for (const client of [a, b]) {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: uidA, role: "authenticated" }),
    ]);
  }
  const key = "55000000-0000-4000-8000-000000000001";
  const args = [w, "Concurrent create fixture", null, key];
  const created = (await a.query(
    "select id from public.create_conversation($1,$2,$3,$4)",
    args,
  )).rows[0].id;
  const retry = b.query(
    "select id from public.create_conversation($1,$2,$3,$4)",
    args,
  );
  equal(await waiting(), true);
  await a.query("commit");
  equal((await retry).rows[0].id, created);
  await b.query("commit");
  equal(
    (await owner.query(
      "select count(*)::int as n from public.audit_log where workspace_id=$1 and action='conversation.created'",
      [w],
    )).rows[0].n,
    1,
  );
  equal(
    (await owner.query("select count(*)::int as n from auth.users")).rows[0].n,
    0,
  );
  equal(
    (await owner.query(
      "select monthly_cap_microusd::text as n from public.workspace_budgets where workspace_id='10000000-0000-4000-8000-000000000001'",
    )).rows[0].n,
    "0",
  );
} catch (error) {
  failure = error;
  await writeFile(
    path.join(backend, ".local/phase1-concurrency-failure.log"),
    redact(`${stage}: ${error.message}\n`),
    { mode: 0o600 },
  );
} finally {
  await Promise.allSettled(clients.map((c) => c.query("rollback")));
  if (owner) {
    try {
      await owner.query("begin");
      for (
        const table of [
          "audit_log",
          "usage_ledger",
          "chat_requests",
          "conversation_requests",
          "messages",
          "cost_reservations",
          "conversations",
          "session_activity",
          "model_prices",
          "agent_settings",
          "agent_setting_versions",
          "prompt_versions",
          "ai_models",
          "workspace_budgets",
          "workspace_memberships",
        ]
      ) {
        await owner.query(`delete from public.${table} where workspace_id=$1`, [
          w,
        ]);
      }
      await owner.query("set constraints all deferred");
      await owner.query("delete from public.profiles where workspace_id=$1", [
        w,
      ]);
      await owner.query("delete from public.workspaces where id=$1", [w]);
      await owner.query("commit");
      fixturesRemoved = (await owner.query(
        "select count(*)::int as n from public.workspaces where id=$1",
        [w],
      )).rows[0].n === 0;
      equal(fixturesRemoved, true);
    } catch (error) {
      failure ??= error;
      await owner.query("rollback").catch(() => {});
    }
  }
  await Promise.allSettled(clients.map((c) => c.end()));
}
const result = {
  passed: !failure,
  checks,
  fixturesRemoved,
  stage,
  scenarios: [
    "real budget row lock: one winner, one denied",
    "unknown costs remain held",
    "real idempotency lock: same chat, one audit",
    "actual demo budget stays zero",
  ],
};
await writeFile(
  path.join(backend, ".local/phase1-concurrency.json"),
  JSON.stringify(result, null, 2) + "\n",
  { mode: 0o600 },
);
console.log(JSON.stringify(result));
if (failure) {
  console.error(
    "Phase1-Parallelprüfung fehlgeschlagen; nur redigiertes lokales Log.",
  );
  process.exitCode = 1;
}
