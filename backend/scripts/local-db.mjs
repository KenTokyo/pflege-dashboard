import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";
import { writeFile } from "node:fs/promises";
import { redact } from "./redact.mjs";
export const backend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export async function localStatus() {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    LANG: "en_US.UTF-8",
    SUPABASE_HOME: path.join(
      tmpdir(),
      "pflege-dashboard-supabase-57aea064-phase0",
    ),
    SUPABASE_EXPERIMENTAL_STACK: "1",
  };
  try {
    const { stdout, stderr } = await promisify(execFile)(
      path.join(backend, "node_modules/.bin/supabase"),
      ["status", "--output-format", "json"],
      {
        cwd: path.join(backend, ".local/supabase-project"),
        env,
        timeout: 20000,
      },
    );
    await writeFile(
      path.join(backend, ".local/status-read-redacted.log"),
      redact(stdout + "\n" + stderr),
      { mode: 0o600 },
    );
    return JSON.parse(stdout);
  } catch {
    throw new Error(
      "Eigener Supabase-Status konnte nicht sicher gelesen werden.",
    );
  }
}
export async function localClient(name = "pflege_phase1_sql") {
  const status = await localStatus();
  const connectionString = status.env?.DB_URL;
  const url = new URL(connectionString);
  if (url.hostname !== "127.0.0.1" || url.port !== "56422") {
    throw new Error("Fremder Datenbankanschluss verweigert.");
  }
  const client = new Client({
    connectionString,
    application_name: name,
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  await client.connect();
  return client;
}
