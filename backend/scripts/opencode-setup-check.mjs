/** Real own Supabase operator setup, all fixtures rolled back; no Auth/account/provider. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { backend, localClient } from "./local-db.mjs";
const db = await localClient("pflege_opencode_setup");
const checks = [];
const check = (ok, name) => {
  if (!ok) throw Error(name);
  checks.push(name);
};
const source = async (name) =>
  (await readFile(path.resolve(backend, "../supabase", name), "utf8"))
    .replace(/^begin;$/m, "")
    .replace(/^commit;$/m, "");
try {
  await db.query("BEGIN");
  await db.query(await source("demo-deepseek-setup.sql"));
  const old = (
    await db.query("select id from public.ai_models where provider='deepseek'")
  ).rows[0].id;
  await db.query("update public.conversations set model_override_id=$1", [old]);
  await db.query("update public.workspace_budgets set blocked=true");
  const snapshot = async () =>
    JSON.stringify(
      (
        await db.query(
          `select id,content,model_snapshot,prompt_version_id,provider_response_model from public.messages order by id`,
        )
      ).rows,
    );
  const history = await snapshot();
  const revisions = (
    await db.query("select id,revision from public.conversations order by id")
  ).rows;
  const sql = await source("demo-opencode-setup.sql");
  await db.query(sql);
  const state = async () =>
    JSON.stringify(
      (
        await db.query(`select
  (select jsonb_agg(to_jsonb(m) order by id) from public.ai_models m) models,
  (select jsonb_agg(to_jsonb(p) order by id) from public.model_prices p) prices,
  (select jsonb_agg(to_jsonb(v) order by id) from public.agent_setting_versions v) settings,
  (select jsonb_agg(to_jsonb(c) order by id) from public.conversations c) chats,
  (select jsonb_agg(to_jsonb(a) order by id) from public.audit_log a) audits`)
      ).rows,
    );
  const first = await state();
  await db.query(sql);
  check(
    first === (await state()),
    "Repeated operator setup is fully idempotent",
  );
  check(
    history === (await snapshot()),
    "Historical messages/model/prompt snapshots unchanged",
  );
  const model = (
    await db.query("select * from public.ai_models where provider='opencode'")
  ).rows[0];
  check(
    model.provider_model_id === "deepseek-v4.1-flash" &&
      model.enabled &&
      model.status === "operational",
    "Exact V4.1 Go registry selected",
  );
  check(
    model.supports_tools === false &&
      model.supports_vision === false &&
      model.hosting_region === "unverified",
    "No unverified tools/vision/region promises",
  );
  check(
    (
      await db.query(
        "select not enabled and status='retired' as retired from public.ai_models where provider='deepseek'",
      )
    ).rows[0].retired,
    "Wrong direct route retired without deletion",
  );
  const chats = (
    await db.query(
      "select id,revision,model_override_id from public.conversations order by id",
    )
  ).rows;
  check(
    chats.every(
      (c, i) =>
        c.model_override_id === model.id &&
        c.revision === revisions[i].revision + 1,
    ),
    "Existing old overrides corrected exactly once with revision",
  );
  check(
    (
      await db.query(
        "select count(*)::int n from public.audit_log where action='conversation.provider_corrected'",
      )
    ).rows[0].n === chats.length,
    "Each override correction audited once",
  );
  check(
    (
      await db.query(
        "select count(*)::int n from public.audit_log where action='demo.opencode.configured'",
      )
    ).rows[0].n === 1,
    "One provider setup audit",
  );
  check(
    (
      await db.query(
        `select v.default_model_id=$1 and v.mode=old.mode and v.prompt_version_id=old.prompt_version_id as preserved from public.agent_setting_versions v join public.agent_settings s on s.current_version_id=v.id join public.agent_setting_versions old on old.version=v.version-1 and old.workspace_id=v.workspace_id`,
        [model.id],
      )
    ).rows[0].preserved,
    "Workspace default corrected, mode/prompt preserved",
  );
  const price = (
    await db.query(
      "select input_microusd_per_million,output_microusd_per_million,expires_at::text from public.model_prices where model_id=$1",
      [model.id],
    )
  ).rows[0];
  check(
    price.input_microusd_per_million === "300000" &&
      price.output_microusd_per_million === "1200000" &&
      price.expires_at === "infinity",
    "Go quota upper estimate, no cash-charge assertion",
  );
  check(
    (
      await db.query(
        "select monthly_cap_microusd is null and total_cap_microusd is null and blocked as preserved from public.workspace_budgets",
      )
    ).rows[0].preserved,
    "User unlimited choice and existing safety block preserved",
  );
  check(
    (
      await db.query(
        "select (select count(*) from auth.users)=0 and (select count(*) from auth.sessions)=0 as empty",
      )
    ).rows[0].empty,
    "No Auth accounts or sessions manufactured",
  );
  await db.query("ROLLBACK");
  check(
    (
      await db.query(
        "select monthly_cap_microusd from public.workspace_budgets",
      )
    ).rows[0].monthly_cap_microusd === "0",
    "Original zero-budget seed restored",
  );
  await writeFile(
    path.join(backend, ".local/opencode-setup-result.json"),
    JSON.stringify({ passed: true, checks }, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(
    `${checks.length} OpenCode-Setup-Prüfungen bestanden; Fixtures zurückgerollt.`,
  );
} finally {
  await db.end();
}
