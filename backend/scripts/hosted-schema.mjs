/** Explicit own-project connection only. Secrets stay in memory, TLS requires the official CA. */
import {
  appendFile,
  lstat,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { Client } from "pg";
import { backend } from "./local-db.mjs";
import { fingerprint } from "./schema-fingerprint.mjs";
import { redact } from "./redact.mjs";
const root = path.resolve(backend, ".."), ref = "ttbfpqveexmlqxkzwlmz";
const action = process.argv[2];
if (!["inspect", "apply"].includes(action)) {
  throw new Error("Erlaubt: inspect oder apply.");
}
const names = new Set([
  "PROJECT_REF",
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "DATABASE_URL",
  "PGSSLROOTCERT",
  "PGSSLMODE",
]);
let db;
let local;
let failure;
const result = {
  projectRef: ref,
  action,
  startedAt: new Date().toISOString(),
  applied: [],
  seedApplied: false,
};
async function state(client) {
  const tables = (await client.query(
    "select tablename as name,tableowner as owner,rowsecurity as rls from pg_tables where schemaname='public' order by tablename",
  )).rows;
  const storage = (await client.query(
    "select relname as name,pg_get_userbyid(relowner) as owner,relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' and relname in ('buckets','objects') order by relname",
  )).rows;
  const functions = (await client.query(
    "select p.proname as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.proname",
  )).rows.map((x) => x.name);
  const bucket = (await client.query(
    "select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='care-private'",
  )).rows;
  const policies = (await client.query(
    "select policyname as name,cmd from pg_policies where schemaname='storage' and policyname like 'care_private_%' order by policyname",
  )).rows;
  return { tables, storage, functions, bucket, policies };
}

try {
  const envFile = path.join(root, ".env");
  const stat = await lstat(envFile);
  if (
    !stat.isFile() || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid()
  ) throw new Error("Eigene Env-Datei ist nicht geschützt.");
  const env = {};
  for (const line of (await readFile(envFile, "utf8")).split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/
      .exec(line);
    if (match && names.has(match[1])) {
      let value = match[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  }
  if (
    env.PROJECT_REF !== ref ||
    new URL(env.VITE_SUPABASE_URL).hostname !== `${ref}.supabase.co` ||
    new URL(env.SUPABASE_URL).hostname !== `${ref}.supabase.co`
  ) throw new Error("Fremdes Projekt wird verweigert.");
  const url = new URL(env.DATABASE_URL);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !(url.hostname === `db.${ref}.supabase.co` ||
      decodeURIComponent(url.username) === `postgres.${ref}`) ||
    !url.password
  ) throw new Error("Datenbankprojekt nicht eindeutig zugeordnet.");
  const caPath = path.resolve(root, env.PGSSLROOTCERT);
  if (
    caPath !== path.join(root, ".local/supabase-ca.crt") ||
    !["verify-full", "verify-ca", "require"].includes(env.PGSSLMODE)
  ) throw new Error("Offizielle CA-Konfiguration fehlt.");
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("ssl")) url.searchParams.delete(key);
  }
  db = new Client({
    connectionString: url.toString(),
    ssl: {
      ca: await readFile(caPath, "utf8"),
      rejectUnauthorized: true,
      servername: url.hostname,
    },
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
    query_timeout: 45000,
    application_name: "pflege_dashboard_phase1_schema",
  });
  await db.connect();
  const socket = db.connection.stream;
  if (!socket.encrypted || !socket.authorized) {
    throw new Error("TLS/CA-Prüfung fehlgeschlagen.");
  }
  result.tls = {
    encrypted: true,
    authorized: true,
    verificationDisabled: false,
  };
  result.before = await state(db);
  try {
    const baseline = JSON.parse(
      await readFile(path.join(backend, ".local/schema-baseline.json"), "utf8"),
    );
    const actual = JSON.parse(await fingerprint(db, false));
    const expected = JSON.parse(baseline.phase1);
    result.structureMatchesLocal =
      JSON.stringify(actual) === JSON.stringify(expected);
    result.structureDifferences = Object.keys(expected).map((key) => ({
      key,
      actual: actual[key].length,
      expected: expected[key].length,
      different: actual[key].filter((v, i) =>
        JSON.stringify(v) !== JSON.stringify(expected[key][i])
      ).length,
    })).filter((x) =>
      x.different || x.actual !== x.expected
    );
    await writeFile(
      path.join(backend, ".local/hosted-structure.json"),
      JSON.stringify({ actual, expected }),
      { mode: 0o600 },
    );
  } catch {}
  if (
    result.before.storage.length !== 2 ||
    result.before.storage.some((t) =>
      !t.rls || t.owner !== "supabase_storage_admin"
    )
  ) throw new Error("Storage-Owner/RLS weicht ab; keine Besitzübernahme.");
  if (result.before.tables.some((t) => !t.rls || t.owner !== "postgres")) {
    throw new Error("Ungeprüfter App-Owner oder RLS-Zustand.");
  }
  if (action === "apply") {
    const gate = JSON.parse(
      await readFile(path.join(backend, ".local/phase1-result.json"), "utf8"),
    );
    if (!gate.passed || gate.scope !== "phase1") {
      throw new Error("Aktuelles vollständiges lokales Gate fehlt.");
    }
    const baselineRaw = await readFile(
      path.join(backend, ".local/schema-baseline.json"),
      "utf8",
    );
    if (
      createHash("sha256").update(baselineRaw).digest("hex") !==
        gate.schemaBaselineSha256
    ) throw new Error("Schema-Nachweis stimmt nicht mit lokalem Gate überein.");
    const baseline = JSON.parse(baselineRaw);
    const files = (await readdir(path.join(root, "supabase/migrations")))
      .filter((n) => /^\d+_.*\.sql$/.test(n)).sort();
    const sources = await Promise.all(
      files.map(async (file) => ({
        file,
        sql: await readFile(
          path.join(root, "supabase/migrations", file),
          "utf8",
        ),
      })),
    );
    const hashes = sources.map((x) => ({
      file: x.file,
      sha256: createHash("sha256").update(x.sql).digest("hex"),
    }));
    if (
      createHash("sha256").update(
          await readFile(path.join(root, "supabase/seed.sql")),
        ).digest("hex") !== gate.seedSha256 ||
      JSON.stringify(hashes) !== JSON.stringify(gate.migrations)
    ) throw new Error("Migrationen wurden seit lokalem Gate geändert.");
    if (
      result.before.tables.length !== 0 && result.before.tables.length !== 21 &&
      result.before.tables.length !== 25
    ) {
      throw new Error(
        "Teilbestand ist ungeprüft; keine destruktive Reparatur.",
      );
    }
    if (
      result.before.tables.length &&
      await fingerprint(db, true) !== baseline.phase0
    ) throw new Error("App-Schemadrift gegenüber geprüfter Phase-0-Grundlage.");
    // Standard Supabase CLI metadata, no app rows and no ownership changes.
    await db.query("create schema if not exists supabase_migrations");
    await db.query(
      "create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text)",
    );
    const journal = (await db.query(
      "select version,statements from supabase_migrations.schema_migrations",
    )).rows;
    const recorded = new Map(journal.map((x) => [x.version, x.statements]));
    const originalCount = result.before.tables.length;
    for (const source of sources) {
      const [version, ...parts] = source.file.replace(/\.sql$/, "").split("_");
      const checksum = createHash("sha256").update(source.sql).digest("hex");
      if (recorded.has(version)) {
        const stored = recorded.get(version);
        if (stored?.length === 1 && stored[0] === source.sql) continue;
        // Existing official CLI journals can split statements. Check actual structural presence below.
        if (originalCount === 0) {
          throw new Error("Journal und leerer App-Bestand widersprechen sich.");
        }
      }
      let present = version === "20261006090000"
        ? originalCount >= 21
        : version === "20261006091000"
        ? [
          "rename_conversation",
          "set_conversation_preferences",
          "mark_document_status",
          "update_agent_settings",
        ].every((n) => result.before.functions.includes(n)) &&
          result.before.policies.length === 2 &&
          result.before.bucket.length === 1
        : version === "20261006130000"
        ? originalCount === 25 &&
          result.before.functions.includes("edge_session")
        : version === "20261006131000"
        ? originalCount === 25 &&
          result.before.functions.includes("edge_chat_replay")
        : false;
      if (!present) {
        // Each checked migration is its own atomic additive transaction. No reset/drop/data erasure.
        await db.query(source.sql);
        result.applied.push({ file: source.file, sha256: checksum });
      }
      await db.query(
        "insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3) on conflict(version) do nothing",
        [version, [source.sql], parts.join("_")],
      );
    }
    if (originalCount === 0) {
      await db.query(
        await readFile(path.join(root, "supabase/seed.sql"), "utf8"),
      );
      result.seedApplied = true;
    }
    result.after = await state(db);
    result.structureMatchesLocal =
      await fingerprint(db, false) === baseline.phase1;
    if (
      !result.structureMatchesLocal || result.after.tables.length !== 25 ||
      result.after.tables.some((t) => !t.rls) ||
      !result.after.functions.includes("edge_chat_replay")
    ) throw new Error("Hosted-Abschlussstruktur unvollständig.");
  }
  result.journalVersions = (await db.query(
    "select version from supabase_migrations.schema_migrations order by version",
  ).catch(() => ({ rows: [] }))).rows.map((x) => x.version);
  if (action === "inspect") {
    const base = env.VITE_SUPABASE_URL;
    const headers = { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY };
    result.http = [];
    for (
      const [name, route] of [
        ["anonymous-workspaces", "/rest/v1/workspaces?select=id"],
        ["session-deployment", "/functions/v1/session"],
        ["chat-deployment", "/functions/v1/chat-stream"],
      ]
    ) {
      try {
        const response = await fetch(base + route, {
          headers,
          signal: AbortSignal.timeout(15000),
          redirect: "error",
        });
        result.http.push({ name, status: response.status });
        await response.body?.cancel();
      } catch {
        result.http.push({ name, status: null });
      }
    }
  }
  result.data = {
    authUsers:
      (await db.query("select count(*)::int n from auth.users")).rows[0].n,
    workspaces: result.before.tables.some((t) => t.name === "workspaces")
      ? (await db.query("select count(*)::int n from public.workspaces"))
        .rows[0].n
      : result.seedApplied
      ? 1
      : 0,
  };
  result.passed = true;
} catch (error) {
  failure = error;
  result.passed = false;
  result.reason = redact(error.message);
} finally {
  await Promise.allSettled([db?.end(), local?.end()].filter(Boolean));
  result.finishedAt = new Date().toISOString();
}
await writeFile(
  path.join(backend, `.local/hosted-${action}.json`),
  JSON.stringify(result, null, 2) + "\n",
  { mode: 0o600 },
);
await appendFile(
  path.join(backend, ".local/hosted-history.jsonl"),
  JSON.stringify(result) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    projectRef: ref,
    action,
    passed: result.passed,
    tls: result.tls,
    appTables: result.after?.tables.length ?? result.before?.tables.length,
    storage: result.before?.storage,
    structureDifferencesBefore: result.structureDifferences,
    structureMatchesLocal: result.structureMatchesLocal,
    applied: result.applied.map((x) => x.file),
    seedApplied: result.seedApplied,
    journalVersions: result.journalVersions,
    http: result.http,
    data: result.data,
    reason: result.reason,
  }),
);
if (failure) process.exitCode = 1;
