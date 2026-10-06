/** Bounded real Supabase readiness probe. No login, no keys, no account creation. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { redact } from "./redact.mjs";
const backend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runtimeHome = path.join(
  tmpdir(),
  "pflege-dashboard-supabase-57aea064-phase0",
);
const run = promisify(execFile);
const env = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR ?? "/tmp",
  LANG: "en_US.UTF-8",
  SUPABASE_HOME: runtimeHome,
  SUPABASE_EXPERIMENTAL_STACK: "1",
};
try {
  const { stdout, stderr } = await run(
    path.join(backend, "node_modules/.bin/supabase"),
    ["status", "--output-format", "json"],
    { cwd: path.join(backend, ".local/supabase-project"), env, timeout: 20000 },
  );
  await writeFile(
    path.join(backend, ".local/runtime-status-redacted.log"),
    redact(stdout + "\n" + stderr),
    { mode: 0o600 },
  );
  const status = JSON.parse(stdout);
  const summary = {
    runtime: status.runtime,
    lifecycle: status.lifecycle,
    readiness: status.readiness,
    runtimeHome,
    services: (status.services ?? []).map((s) => ({
      service: s.service,
      state: s.state,
      lifecycle: s.lifecycle,
      health: s.health,
    })),
    checks: [],
  };
  for (const [name, route] of [
    ["auth.http", "/auth/v1/health"],
    ["storage.http", "/storage/v1/status"],
    ["rest.http", "/rest/v1/"],
  ]) {
    const endpoint = status.endpoints?.[name];
    if (!endpoint?.url) {
      summary.checks.push({ service: name, result: "endpoint absent" });
      continue;
    }
    const url = new URL(endpoint.url);
    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.search
    ) {
      throw new Error(
        "Probe refuses an endpoint outside the owned local stack.",
      );
    }
    url.pathname = url.pathname.replace(/\/$/, "") + route;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        redirect: "error",
        ...(name === "functions.http"
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            }
          : {}),
      });
      const contentType = response.headers.get("content-type") ?? "";
      let bodyKeys = [];
      let functionCode;
      try {
        const body = await response.json();
        bodyKeys = Object.keys(body);
        functionCode = body?.error?.code;
      } catch {
        /* no raw body in output */
      }
      summary.checks.push({
        service: name,
        path: url.pathname,
        status: response.status,
        contentType,
        bodyKeys,
        ready:
          name === "functions.http"
            ? response.status === 401 && functionCode === "AUTH_REQUIRED"
            : response.status === 200 &&
              (name === "storage.http" ||
                (contentType.includes("json") && bodyKeys.length > 0)),
      });
    } catch {
      summary.checks.push({
        service: name,
        path: route,
        result: "bounded request failed",
        ready: false,
      });
    }
  }
  const after = await run(
    path.join(backend, "node_modules/.bin/supabase"),
    ["status", "--output-format", "json"],
    { cwd: path.join(backend, ".local/supabase-project"), env, timeout: 20000 },
  );
  await writeFile(
    path.join(backend, ".local/runtime-status-after-redacted.log"),
    redact(after.stdout + "\n" + after.stderr),
    { mode: 0o600 },
  );
  const afterStatus = JSON.parse(after.stdout);
  summary.after = {
    lifecycle: afterStatus.lifecycle,
    readiness: afterStatus.readiness,
    services: (afterStatus.services ?? []).map((s) => ({
      service: s.service,
      state: s.state,
      lifecycle: s.lifecycle,
      health: s.health,
    })),
  };
  await writeFile(
    path.join(backend, ".local/runtime-probe.json"),
    JSON.stringify(summary, null, 2) + "\n",
    { mode: 0o600 },
  );
  summary.requiredServicesReady = ["database", "rest", "auth", "storage"].every(
    (name) =>
      summary.after.services.some(
        (s) =>
          s.service === name && s.state === "running" && s.health === "healthy",
      ),
  );
  summary.functionsStopped = summary.after.services.some(
    (s) => s.service === "functions" && s.state === "stopped",
  );
  await writeFile(
    path.join(backend, ".local/runtime-probe.json"),
    JSON.stringify(summary, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(
    `Supabase required services: ${summary.requiredServicesReady ? "healthy" : "failed"}; functions intentionally stopped; ` +
      summary.checks
        .map((c) => `${c.service} ${c.status ?? c.result}`)
        .join(", ") +
      "; eigener Nachweis: backend/.local/runtime-probe.json",
  );
  if (
    summary.checks.length !== 3 ||
    summary.checks.some((c) => !c.ready) ||
    !summary.requiredServicesReady ||
    !summary.functionsStopped
  )
    process.exitCode = 1;
} catch (error) {
  await writeFile(
    path.join(backend, ".local/runtime-probe-failure.log"),
    redact(
      (error.stdout ?? "") + "\n" + (error.stderr ?? "") + "\n" + error.message,
    ),
    { mode: 0o600 },
  );
  console.error("Supabase probe failed; redacted local log saved.");
  process.exitCode = 1;
}
