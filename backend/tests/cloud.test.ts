import { describe, it, expect, vi } from "vitest";
import http from "node:http";
import { once } from "node:events";
import {
  createCloudHandler,
  cloudEnvironment,
  DEMO_ORIGIN,
} from "../runtime/cloud.ts";
import { cloudConfiguration, PROJECT_REF } from "../runtime/config.ts";
import { AppError } from "../runtime/errors.ts";
const source = { VERCEL_URL: "preview-fixture.vercel.app" };
const configuration = {
  SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-value",
  DATABASE_URL: `postgresql://postgres.${PROJECT_REF}:synthetic-password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=no-verify`,
};
const request = (path = "/api/session", init: RequestInit = {}) =>
  new Request(DEMO_ORIGIN + path, {
    method: "POST",
    headers: { Origin: DEMO_ORIGIN },
    ...init,
  });
const deps = {
  env: cloudEnvironment(source),
  platform: {
    rpc: vi.fn(),
    authenticate: vi.fn(async () => {
      throw new AppError("AUTH_REQUIRED", 401);
    }),
  },
};
describe("ordinary Vercel Node entry / immutable configuration", () => {
  it("cloud configuration needs no .env or local CA path and retains TLS verification", () => {
    const config = cloudConfiguration(configuration);
    expect(config.database.ssl).toMatchObject({ rejectUnauthorized: true });
    expect((config.database.ssl as { ca: string }).ca).toContain(
      "BEGIN CERTIFICATE",
    );
    expect(config.database.connectionString).not.toContain("sslmode");
    expect(config.database.idleTimeoutMillis).toBe(5000);
    expect(config.database.max).toBe(4);
    expect(config.env("SUPABASE_PUBLISHABLE_KEY")).toBe(
      "synthetic-public-value",
    );
  });
  it.each([
    "postgresql://postgres:synthetic@foreign.invalid/postgres",
    `postgresql://postgres.other:synthetic@aws-0-eu-central-1.pooler.supabase.com/postgres`,
    `postgresql://postgres:synthetic@db.${PROJECT_REF}.supabase.co/other`,
  ])("refuses a foreign database", (DATABASE_URL) => {
    expect(() =>
      cloudConfiguration({ ...configuration, DATABASE_URL }),
    ).toThrow("CONFIG_OWN_DATABASE");
  });
  it("explicit empty CORS is retained; trusted preview origin is exact", () => {
    expect(
      cloudEnvironment({ ...source, ALLOWED_ORIGINS: "" })("ALLOWED_ORIGINS"),
    ).toBe("");
    expect(cloudEnvironment(source)("ALLOWED_ORIGINS")).toBe(
      `${DEMO_ORIGIN},https://preview-fixture.vercel.app`,
    );
  });
  it.each([
    "https://evil.invalid",
    "https://pflege-dashboard-puce.vercel.app.evil.invalid",
    "null",
  ])("denies origin %s before initializing a pool", async (origin) => {
    const init = vi.fn(async () => deps);
    const response = await createCloudHandler(
      source,
      init,
    )(request(undefined, { headers: { Origin: origin } }));
    expect(response.status).toBe(403);
    expect(init).not.toHaveBeenCalled();
  });
  it("denies a foreign Host despite trusted URL/forwarded headers", async () => {
    const init = vi.fn(async () => deps);
    const response = await createCloudHandler(
      source,
      init,
    )(
      request(undefined, {
        headers: {
          Host: "evil.invalid",
          "x-forwarded-host": new URL(DEMO_ORIGIN).host,
        },
      }),
    );
    expect(response.status).toBe(403);
    expect(init).not.toHaveBeenCalled();
  });
  it("missing Bearer is 401 without a database init or cookie authentication", async () => {
    const init = vi.fn(async () => deps);
    const response = await createCloudHandler(
      source,
      init,
    )(request(undefined, { headers: { Cookie: "access_token=synthetic" } }));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("AUTH_REQUIRED");
    expect(init).not.toHaveBeenCalled();
  });
  it("liveness/preflight are available; missing API is neutral JSON 404", async () => {
    const init = vi.fn(async () => deps),
      handler = createCloudHandler(source, init);
    expect(
      await (await handler(request("/api/health", { method: "GET" }))).json(),
    ).toEqual({ ok: true });
    expect(
      (await handler(request(undefined, { method: "OPTIONS" }))).status,
    ).toBe(204);
    const missing = await handler(request("/api/gibtsnicht"));
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.message).toBe(
      "Endpunkt nicht vorhanden.",
    );
    expect(init).not.toHaveBeenCalled();
  });
  it("initialization failures never expose URL/credentials", async () => {
    const response = await createCloudHandler(source, async () => {
      throw Error("synthetic-password DATABASE_URL postgres://fake");
    })(request(undefined, { headers: { Authorization: "Bearer synthetic" } }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(
      /synthetic-password|DATABASE_URL|postgres/,
    );
  });
  it("genuine HTTP requests reach cloud routes on an owned dynamic port", async () => {
    const init = vi.fn(async () => deps);
    const handler = createCloudHandler(source, init);
    const server = http.createServer((req, res) => {
      void (async () => {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers))
          if (v !== undefined && k !== "host")
            headers.set(k, Array.isArray(v) ? v.join(",") : v);
        const response = await handler(
          new Request(DEMO_ORIGIN + req.url, { method: req.method, headers }),
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(await response.text());
      })().catch(() => res.destroy());
    });
    try {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const port = (server.address() as { port: number }).port;
      const base = `http://127.0.0.1:${port}`;
      expect(await (await fetch(base + "/api/health")).json()).toEqual({
        ok: true,
      });
      expect(
        (await fetch(base + "/api/session", { method: "POST" })).status,
      ).toBe(401);
      expect(
        (
          await fetch(base + "/api/chat-stream", {
            method: "POST",
            headers: { Origin: "https://evil.invalid" },
          })
        ).status,
      ).toBe(403);
      expect(
        (await fetch(base + "/api/unknown", { method: "POST" })).status,
      ).toBe(404);
      expect(init).not.toHaveBeenCalled();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
