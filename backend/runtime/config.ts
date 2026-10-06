import { readFile, lstat, realpath } from "node:fs/promises";
import { parseEnv } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolConfig } from "pg";
import type { Environment } from "./platform.ts";
import { SUPABASE_CA } from "./supabase-ca.ts";
export const PROJECT_REF = "ttbfpqveexmlqxkzwlmz";
const names = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "DATABASE_URL",
  "PGSSLROOTCERT",
  "PGSSLMODE",
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "ALLOWED_ORIGINS",
  "HOST",
  "PORT",
  "STATIC_DIR",
] as const;
// Works from source and compiled backend/.local/build/backend/runtime.
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  import.meta.url.includes("/.local/build/") ? "../../../../.." : "../..",
);
export type Configuration = {
  env: Environment;
  database: PoolConfig;
  host: string;
  port: number;
  staticDir?: string;
};
/** Cloud uses only server process variables: never .env, certificate paths or local listeners. */
export function cloudConfiguration(
  source: Record<string, string | undefined>,
): Configuration {
  const values = { ...source };
  const url = new URL(values.SUPABASE_URL ?? values.VITE_SUPABASE_URL ?? "");
  const key =
    values.SUPABASE_PUBLISHABLE_KEY ?? values.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (
    url.origin !== `https://${PROJECT_REF}.supabase.co` ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !key
  )
    throw new Error("CONFIG_OWN_PROJECT");
  const connection = ownConnection(values.DATABASE_URL);
  values.SUPABASE_URL = url.origin;
  values.SUPABASE_PUBLISHABLE_KEY = key;
  return {
    env: (name) => values[name],
    database: {
      connectionString: connection.toString(),
      ssl: { ca: SUPABASE_CA, rejectUnauthorized: true },
      max: 4,
      idleTimeoutMillis: 5000,
    },
    host: "127.0.0.1",
    port: 5174,
  };
}
function ownConnection(value: string | undefined) {
  const connection = new URL(value ?? "");
  if (
    !["postgres:", "postgresql:"].includes(connection.protocol) ||
    connection.pathname !== "/postgres" ||
    !connection.password ||
    !(
      (connection.hostname.endsWith(".pooler.supabase.com") &&
        decodeURIComponent(connection.username) ===
          `postgres.${PROJECT_REF}`) ||
      (connection.hostname === `db.${PROJECT_REF}.supabase.co` &&
        decodeURIComponent(connection.username) === "postgres")
    )
  )
    throw new Error("CONFIG_OWN_DATABASE");
  for (const key of [...connection.searchParams.keys()])
    if (key.startsWith("ssl")) connection.searchParams.delete(key);
  return connection;
}
export async function loadConfiguration(): Promise<Configuration> {
  const envPath = path.join(ROOT, ".env");
  const info = await lstat(envPath);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    (info.mode & 0o077) !== 0 ||
    info.uid !== process.getuid?.()
  )
    throw new Error("CONFIG_PROTECTED_ENV");
  const file = parseEnv(await readFile(envPath, "utf8"));
  const values: Record<string, string | undefined> = {};
  for (const name of names)
    values[name] =
      process.env[name] !== undefined ? process.env[name] : file[name];
  const url = new URL(values.VITE_SUPABASE_URL ?? "");
  if (
    url.protocol !== "https:" ||
    url.hostname !== `${PROJECT_REF}.supabase.co` ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !values.VITE_SUPABASE_PUBLISHABLE_KEY
  )
    throw new Error("CONFIG_OWN_PROJECT");
  const connection = ownConnection(values.DATABASE_URL);
  if (
    !values.PGSSLROOTCERT ||
    !["verify-full", "verify-ca", "require"].includes(values.PGSSLMODE ?? "")
  )
    throw new Error("CONFIG_TLS");
  const ca = await readFile(path.resolve(ROOT, values.PGSSLROOTCERT), "utf8");
  if (!ca.includes("-----BEGIN CERTIFICATE-----"))
    throw new Error("CONFIG_TLS");
  const host = values.HOST ?? "127.0.0.1";
  if (host !== "127.0.0.1") throw new Error("CONFIG_LOOPBACK");
  const port = Number(values.PORT ?? "5174");
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("CONFIG_PORT");
  let staticDir: string | undefined;
  if (values.STATIC_DIR) {
    if (!path.isAbsolute(values.STATIC_DIR))
      throw new Error("CONFIG_STATIC_PATH");
    staticDir = await realpath(values.STATIC_DIR);
    // Limit preview to the actual built app, never permit a server env directory.
    if (staticDir !== path.join(ROOT, "dist"))
      throw new Error("CONFIG_STATIC_PATH");
  }
  values.SUPABASE_URL = url.origin;
  values.SUPABASE_PUBLISHABLE_KEY = values.VITE_SUPABASE_PUBLISHABLE_KEY;
  return {
    env: (name) => values[name],
    database: {
      connectionString: connection.toString(),
      ssl: { ca, rejectUnauthorized: true },
    },
    host,
    port,
    staticDir,
  };
}
