/** Own local Supabase only; operator fixtures fully rolled back. No provider/Auth requests. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { backend, localClient } from "./local-db.mjs";
const db = await localClient("pflege_gemini_operator_test");
const checks = [];
const check = (ok, name) => {
  if (!ok) throw Error(name);
  checks.push(name);
};
const source = async (name) =>
  (await readFile(path.resolve(backend, "../supabase", name), "utf8"))
    .replace(/^begin;$/m, "")
    .replace(/^commit;$/m, "");
const snapshot = async (tables) => {
  const values = [];
  for (const table of tables)
    values.push(
      (
        await db.query(
          `select to_jsonb(t) value from public.${table} t order by id`,
        )
      ).rows,
    );
  return JSON.stringify(values);
};
try {
  await db.query("BEGIN");
  await db.query(await source("demo-opencode-setup.sql"));
  await db.query("update public.workspace_budgets set blocked=true");
  const preserved = [
    "workspace_budgets",
    "messages",
    "chat_requests",
    "usage_ledger",
    "cost_reservations",
    "conversations",
    "agent_settings",
    "agent_setting_versions",
  ];
  const before = await snapshot(preserved);
  const setup = await source("demo-gemini-setup.sql");
  await db.query(
    "select set_config('pflege.gemini.model_id','gemini-3.8-flash',true),set_config('pflege.gemini.verified_at',$1,true),set_config('pflege.gemini.select_default','false',true)",
    [new Date(Date.now() - 60000).toISOString()],
  );
  await db.query(setup);
  check(
    (await snapshot(preserved)) === before,
    "Alternative preserves all settings, overrides, budgets, requests, messages and spending",
  );
  const full = [
    "ai_models",
    "model_prices",
    "agent_settings",
    "agent_setting_versions",
    "audit_log",
  ];
  const once = await snapshot(full);
  await db.query(setup);
  check(
    (await snapshot(full)) === once,
    "Provider operator setup is fully idempotent",
  );
  const model = (
    await db.query("select * from public.ai_models where provider='gemini'")
  ).rows[0];
  check(
    model.provider_model_id === "gemini-3.8-flash" &&
      model.enabled &&
      model.status === "operational",
    "Verified Gemini registry is operational",
  );
  check(
    model.supports_tools === false &&
      model.supports_vision === false &&
      model.hosting_region === "unverified",
    "No unsupported tool, image or region promises",
  );
  const price = (
    await db.query("select * from public.model_prices where model_id=$1", [
      model.id,
    ])
  ).rows[0];
  check(
    price.input_microusd_per_million === "0" &&
      price.output_microusd_per_million === "0",
    "User-confirmed free tier monetary estimate zero",
  );
  check(
    (
      await db.query(
        "select enabled and status='operational' as live from public.ai_models where provider='opencode'",
      )
    ).rows[0].live,
    "DeepSeek via OpenCode stays available",
  );
  await db.query(
    "select set_config('pflege.gemini.select_default','true',true)",
  );
  await db.query(setup);
  check(
    (
      await db.query(
        "select v.default_model_id=$1 as selected from public.agent_settings s join public.agent_setting_versions v on v.id=s.current_version_id",
        [model.id],
      )
    ).rows[0].selected,
    "Explicit operator choice can select Gemini default",
  );
  const changed = await snapshot(full);
  await db.query(setup);
  check(
    (await snapshot(full)) === changed,
    "Explicit default choice is versioned and idempotent",
  );
  check(
    (await db.query("select blocked from public.workspace_budgets")).rows[0]
      .blocked,
    "Existing safety block stays intact",
  );
  const data = await source("demo-staff-data.sql");
  const usageBefore = await snapshot([
    "messages",
    "chat_requests",
    "usage_ledger",
    "cost_reservations",
  ]);
  await db.query(data);
  const dataTables = [
    "contacts",
    "care_recipients",
    "conversations",
    "tasks",
    "notes",
    "audit_log",
  ];
  const seeded = await snapshot(dataTables);
  await db.query(data);
  check(
    (await snapshot(dataTables)) === seeded,
    "Additive staff demo operator setup is fully idempotent",
  );
  check(
    (await snapshot([
      "messages",
      "chat_requests",
      "usage_ledger",
      "cost_reservations",
    ])) === usageBefore,
    "Demo examples manufacture no model messages, calls or usage",
  );
  check(
    (await db.query("select count(*)::int n from public.care_recipients"))
      .rows[0].n === 6,
    "Six fictional people, original person preserved",
  );
  check(
    (
      await db.query(
        "select count(*)::int n from public.tasks where status in ('open','in_progress')",
      )
    ).rows[0].n === 12,
    "Twelve actual stored open fictional tasks",
  );
  check(
    (
      await db.query(
        "select count(distinct care_grade)::int n from public.care_recipients",
      )
    ).rows[0].n === 6,
    "Distinct care grades zero to five",
  );
  check(
    (
      await db.query(
        "select count(*)::int n from public.audit_log where action='demo.staff_data_v1.added'",
      )
    ).rows[0].n === 1,
    "One honest additive demo audit",
  );
  check(
    (
      await db.query(
        "select (select count(*) from auth.users)=0 and (select count(*) from auth.sessions)=0 as empty",
      )
    ).rows[0].empty,
    "No Auth accounts or sessions created",
  );
  await db.query("ROLLBACK");
  check(
    (
      await db.query(
        "select monthly_cap_microusd from public.workspace_budgets",
      )
    ).rows[0].monthly_cap_microusd === "0",
    "Original local seed restored",
  );
  await writeFile(
    path.join(backend, ".local/gemini-setup-result.json"),
    JSON.stringify({ passed: true, checks, hostedWrites: 0 }, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(
    `${checks.length} Gemini-/Demo-Operatorprüfungen bestanden; sämtliche Fixtures zurückgerollt.`,
  );
} finally {
  await db.end();
}
