/** Real product Node server + actual own Supabase Auth and parameterized SQL. No accounts/AI. */
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import http from "node:http";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { backend, localStatus } from "./local-db.mjs";
import { redact } from "./redact.mjs";
import { loadConfiguration } from "../.local/build/backend/runtime/config.js";
import { createDatabase } from "../.local/build/backend/runtime/database.js";
const hosted = process.argv.includes("--hosted");
// Never share the Frontend's 5173/5174 ports. Bind only an ephemeral owned test port.
const reservation = net.createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
let child;
let db;
let processExited;
let interrupted = false;
let forced;
const results = [];
let checks = 0;
const check = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  results.push({ label, passed: true });
};
const listening = () =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let done = false;
    const end = (value) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => end(true));
    socket.once("error", () => end(false));
    socket.setTimeout(500, () => end(false));
  });
const stop = () => {
  interrupted = true;
  if (child && child.exitCode === null && child.signalCode === null) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
    forced ??= setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    }, 4500);
  }
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
const deadline = setTimeout(stop, 90000);
let log = "";
let config;
let overrides = {};
let owned = false;
let failure = false;
try {
  await mkdir(path.join(backend, ".local"), { recursive: true, mode: 0o700 });
  assert.equal(
    await listening(),
    false,
    "Own test port already used; never stop a foreign server.",
  );
  config = hosted ? await loadConfiguration() : undefined;
  if (!hosted) {
    const status = await localStatus();
    config = {
      database: { connectionString: status.env.DB_URL },
      env: (n) =>
        n === "SUPABASE_URL"
          ? status.env.API_URL
          : n === "SUPABASE_PUBLISHABLE_KEY"
            ? status.env.ANON_KEY
            : undefined,
    };
    // Test runner starts the same production server with verified real local Supabase values in memory.
    const { createAppServer } =
      await import("../.local/build/backend/runtime/server.js");
    const { platform } =
      await import("../.local/build/backend/runtime/platform.js");
    db = createDatabase(config.database);
    await db.verify();
    const app = createAppServer(
      { env: config.env, platform: platform(config.env, fetch, db.rpc) },
      { host: "127.0.0.1", port },
    );
    await app.listen();
    child = { exitCode: null, signalCode: null, app };
    owned = true;
  } else {
    db = createDatabase(config.database);
    await db.verify();
    check(true, "Hosted SQL TLS/CA and restricted-role capabilities");
    const env = { ...process.env };
    delete env.STATIC_DIR;
    if (process.argv.includes("--static"))
      env.STATIC_DIR = path.resolve(backend, "../dist");
    delete env.ALLOWED_ORIGINS;
    delete env.HOST;
    env.PORT = String(port);
    child = spawn(
      process.execPath,
      [path.join(backend, ".local/build/backend/runtime/index.js")],
      { cwd: backend, env, detached: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    processExited = once(child, "close");
    owned = true;
    child.stdout.on("data", (chunk) => {
      log += chunk;
    });
    child.stderr.on("data", (chunk) => {
      log += chunk;
    });
    for (let i = 0; i < 100 && !(await listening()); i++) {
      if (child.exitCode !== null || interrupted) throw new Error("startup");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    check(await listening(), "actual compiled product server ready");
  }
  const url = `http://127.0.0.1:${port}`;
  const health = await fetch(url + "/api/health", {
    signal: AbortSignal.timeout(10000),
  });
  check(health.status === 200, "HTTP health 200");
  check(
    JSON.stringify(await health.json()) === '{"ok":true}',
    "minimal health body",
  );
  for (const route of ["session", "chat-stream"]) {
    for (const origin of [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ]) {
      const response = await fetch(`${url}/api/${route}`, {
        method: "OPTIONS",
        headers: { Origin: origin },
        signal: AbortSignal.timeout(10000),
      });
      check(
        response.status === 204 &&
          response.headers.get("Access-Control-Allow-Origin") === origin,
        `${route} exact preflight ${origin}`,
      );
    }
    for (const origin of ["https://evil.invalid", "null"]) {
      const response = await fetch(`${url}/api/${route}`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(10000),
      });
      check(
        response.status === 403 &&
          (await response.json()).error.code === "WORKSPACE_FORBIDDEN",
        `${route} foreign origin refusal`,
      );
    }
    for (const auth of [
      undefined,
      "Bearer deliberately-invalid-no-account-token",
    ]) {
      const response = await fetch(`${url}/api/${route}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth ? { Authorization: auth } : {}),
        },
        body: "{}",
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      check(
        response.status === 401 && data.error.code === "AUTH_REQUIRED",
        `${route} ${auth ? "real Supabase invalid token" : "missing bearer"}`,
      );
      check(
        /^[a-f0-9-]{36}$/.test(data.error.requestId),
        `${route} safe request id`,
      );
    }
  }
  const spoof = await new Promise((resolve) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/api/health",
        headers: { Host: "evil.invalid" },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", () => resolve(0));
    req.end();
  });
  check(spoof === 403, "actual forged Host 403");
  const missing = await fetch(url + "/api/missing", {
    signal: AbortSignal.timeout(10000),
  });
  check(
    missing.status === 404 &&
      missing.headers.get("content-type").includes("application/json"),
    "API missing is JSON 404",
  );
  if (process.argv.includes("--static")) {
    const index = await fetch(url + "/", {
      signal: AbortSignal.timeout(10000),
    });
    check(
      index.status === 200 && index.headers.get("cache-control") === "no-cache",
      "actual compiled server serves built index safely",
    );
    await index.body?.cancel();
    const navigation = await fetch(url + "/gespraeche/test", {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    check(navigation.status === 200, "actual product navigation fallback");
    await navigation.body?.cancel();
    for (const route of ["/.env", "/%2eenv", "/assets/%2e%2e%2f%2eenv"]) {
      const response = await fetch(url + route, {
        signal: AbortSignal.timeout(10000),
      });
      check(
        response.status === 403,
        "actual product blocks static private path",
      );
      await response.body?.cancel();
    }
    const api = await fetch(url + "/api/missing", {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    check(
      api.status === 404 &&
        api.headers.get("content-type").includes("application/json"),
      "product API never receives SPA fallback",
    );
    await api.body?.cancel();
  }
  const base = {
    p_workspace_id: "10000000-0000-4000-8000-000000000001",
    p_user_id: "60000000-0000-4000-8000-000000000002",
    p_session_id: "60000000-0000-4000-8000-000000000003",
  };
  for (const [name, args] of [
    ["edge_session", { ...base, p_action: "touch" }],
    ["edge_chat_check", base],
    ["edge_chat_reap", base],
  ]) {
    await assert.rejects(
      db.rpc(name, args),
      (error) => error.code === "SESSION_EXPIRED",
    );
    check(true, `${name} actual SQL denies nonexistent Auth session`);
  }
  const initial = db.pool.totalCount;
  await assert.rejects(
    db.rpc("pg_sleep", {}),
    (error) => error.code === "VALIDATION_FAILED",
  );
  check(
    initial === db.pool.totalCount,
    "whitelist refusal without acquisition",
  );
  const client = await db.pool.connect();
  try {
    const role = (await client.query("SELECT current_user AS role")).rows[0]
      .role;
    check(role !== "pflege_backend", "SET LOCAL role reset after failed SQL");
  } finally {
    client.release();
  }
} catch {
  failure = true;
  console.error("Node-Smoke fehlgeschlagen; keine Rohfehlerausgabe.");
} finally {
  const started = Date.now();
  if (owned && child?.app) await child.app.close();
  else if (
    owned &&
    child &&
    child.exitCode === null &&
    child.signalCode === null
  ) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
    const t = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    }, 4500);
    try {
      await processExited;
    } finally {
      clearTimeout(t);
    }
  }
  await db?.close();
  clearTimeout(forced);
  clearTimeout(deadline);
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
  const closed = owned ? !(await listening()) : null;
  if (owned) {
    check(closed, "owned Node port closed after finally");
    check(Date.now() - started < 5000, "own cleanup within 5s");
  }
  await writeFile(
    path.join(
      backend,
      ".local",
      `node-smoke-${hosted ? "hosted" : "local"}.log`,
    ),
    redact(log),
    { mode: 0o600 },
  );
  await writeFile(
    path.join(
      backend,
      ".local",
      `node-smoke-${hosted ? "hosted" : "local"}.json`,
    ),
    JSON.stringify(
      {
        passed: !failure,
        scope: hosted
          ? "actual hosted Supabase Auth + SQL, compiled product Node"
          : "actual native Supabase Auth + SQL, product Node handler",
        checks,
        results,
        port,
        ownedPid: child?.app ? process.pid : child?.pid,
        closed,
        accountsCreated: 0,
        providerCalls: 0,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
}
console.log(
  `Node-HTTP/SQL-Smoke: ${checks} bestandene Prüfungen; ${failure ? "fehlgeschlagen" : "bestanden"}; kein Login-/KI-Erfolgsnachweis.`,
);
if (failure) process.exitCode = 1;
