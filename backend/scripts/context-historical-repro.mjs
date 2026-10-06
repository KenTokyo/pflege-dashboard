/** Actual own Supabase DB, historical function restored ONLY in a rolled-back transaction. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { backend, localClient } from "./local-db.mjs";
const db = await localClient("pflege_context_historical_repro");
let original;
let result;
const definition =
  "select pg_get_functiondef('private.chat_prepare(uuid,uuid,uuid,uuid,uuid,text)'::regprocedure) as definition";
try {
  original = (await db.query(definition)).rows[0].definition;
  await db.query("BEGIN");
  const migration = await readFile(
    path.resolve(
      backend,
      "../supabase/migrations/20261006131000_phase1_chat.sql",
    ),
    "utf8",
  );
  const start = migration.indexOf("create function private.chat_prepare(");
  const end = migration.indexOf(
    "create function public.edge_chat_prepare(",
    start,
  );
  assert.ok(start >= 0 && end > start);
  await db.query(
    migration
      .slice(start, end)
      .replace("create function", "create or replace function"),
  );
  const tests = (
    await readFile(
      path.resolve(backend, "../supabase/tests/phase1_context.test.sql"),
      "utf8",
    )
  )
    .replace(/^begin;\s*$/m, "")
    .replace(/^rollback;\s*$/m, "");
  const answers = await db.query(tests);
  const tap = answers
    .flatMap((answer) => answer.rows)
    .flatMap((row) => Object.values(row))
    .filter((v) => typeof v === "string" && /^(?:not )?ok \d+/.test(v));
  const failed = tap.filter((v) => v.startsWith("not ok"));
  assert.equal(failed.length, 2);
  assert.ok(failed.some((v) => v.includes("Context keeps request pairs")));
  assert.ok(failed.some((v) => v.includes("Cancelled tasks excluded")));
  result = {
    passed: true,
    assertions: tap.length,
    expectedHistoricalFailures: 2,
    accountsCreated: 0,
    providerCalls: 0,
  };
} finally {
  try {
    await db.query("ROLLBACK");
    if (original)
      assert.equal((await db.query(definition)).rows[0].definition, original);
  } finally {
    await db.end();
  }
}
await writeFile(
  path.join(backend, ".local/context-historical-repro.json"),
  JSON.stringify({ ...result, currentFunctionRestored: true }, null, 2) + "\n",
  { mode: 0o600 },
);
console.log(
  `Historische Kontextfunktion: ${result.assertions} echte SQL-Prüfungen, genau 2 erwartete Fehler reproduziert; Änderung/Fixtures vollständig zurückgerollt.`,
);
