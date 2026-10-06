/** Actual Supabase Edge worker HTTP; unauthenticated/invalid JWT only, never create/login account. */
import { backend, localStatus } from "./local-db.mjs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const status = await localStatus();
const url = new URL(status.endpoints["functions.http"].url);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "56421");
let checks = 0;
const outcomes = [];
for (const endpoint of ["session", "chat-stream"]) {
  const preflight = await fetch(new URL(`/functions/v1/${endpoint}`, url), {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:5173" },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  assert.equal(preflight.status, 204);
  checks++;
  const gatewayOrigin = preflight.headers.get("Access-Control-Allow-Origin");
  assert.ok(gatewayOrigin === "*" || gatewayOrigin === "http://localhost:5173");
  checks++;
  outcomes.push({
    endpoint,
    name: "native-gateway-preflight",
    status: preflight.status,
    origin: gatewayOrigin,
  });
  const allowed = await fetch(new URL(`/functions/v1/${endpoint}`, url), {
    method: "POST",
    headers: {
      Origin: "http://localhost:5173",
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  assert.equal(allowed.status, 401);
  checks++;
  assert.equal(
    allowed.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:5173",
  );
  checks++;
  assert.equal((await allowed.json()).error.code, "AUTH_REQUIRED");
  checks++;
  const foreign = await fetch(new URL(`/functions/v1/${endpoint}`, url), {
    method: "POST",
    headers: {
      Origin: "https://evil.example.invalid",
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  assert.equal(foreign.status, 403);
  checks++;
  assert.equal((await foreign.json()).error.code, "WORKSPACE_FORBIDDEN");
  checks++;
  for (
    const [name, headers] of [["no-login", {}], ["invalid-jwt", {
      Authorization: "Bearer synthetic-invalid-token",
    }]]
  ) {
    const response = await fetch(new URL(`/functions/v1/${endpoint}`, url), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        workspaceId: "10000000-0000-4000-8000-000000000001",
        action: "touch",
      }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    const body = await response.json();
    assert.equal(response.status, 401);
    checks++;
    assert.equal(body.error.code, "AUTH_REQUIRED");
    checks++;
    assert.match(body.error.requestId, /^[a-f0-9-]{36}$/);
    checks++;
    outcomes.push({
      endpoint,
      name,
      status: response.status,
      code: body.error.code,
    });
  }
}
await writeFile(
  path.join(backend, ".local/edge-smoke.json"),
  JSON.stringify(
    {
      passed: true,
      checks,
      scope: "real Supabase Edge HTTP, no login or provider calls",
      outcomes,
    },
    null,
    2,
  ) + "\n",
  { mode: 0o600 },
);
console.log(
  `Echte Supabase Edge-HTTP-Prüfung: ${checks}/${checks}, zwei Functions, kein Login-/KI-Erfolgsnachweis.`,
);
