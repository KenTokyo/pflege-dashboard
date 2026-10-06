import { describe, it, expect, vi } from "vitest";
import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import { mkdtemp, writeFile, mkdir, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAppServer } from "../runtime/server.ts";
import { chatHandler, type Dependencies } from "../runtime/handler.ts";
import { cors } from "../runtime/platform.ts";
import { rpcQuery } from "../runtime/database.ts";
import { AppError } from "../runtime/errors.ts";
const w = "10000000-0000-4000-8000-000000000001",
  u = "60000000-0000-4000-8000-000000000002",
  s = "60000000-0000-4000-8000-000000000003",
  r = "60000000-0000-4000-8000-000000000004";
const context = {
  model: {
    registryId: r,
    provider: "openai" as const,
    providerModelId: "mock-no-cost",
    displayName: "Fiktiver Test",
    region: "unverified",
  },
  promptVersionId: r,
  instructions: "Test",
  input: [{ role: "user" as const, content: "Test" }],
  maxOutputTokens: 1024,
  inputTokenBound: 10000,
  maximumCostMicrousd: 1000,
};
const payload = {
  workspaceId: w,
  conversationId: r,
  clientRequestId: r,
  content: "Test",
  attachmentIds: [],
};
function deps(): Dependencies & {
  platform: {
    authenticate: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };
} {
  return {
    env: () => undefined,
    platform: {
      authenticate: vi.fn(async () => ({ userId: u, sessionId: s })),
      rpc: vi.fn(async (name: string) =>
        name === "edge_chat_prepare"
          ? { messageId: r, context, replayed: false }
          : name === "edge_chat_replay"
            ? null
            : name === "edge_chat_finish"
              ? { status: "completed", costMicrousd: 10 }
              : name === "edge_session"
                ? { ended: true }
                : true,
      ),
    },
    provider: {
      async *stream() {
        yield { text: "Hallo" };
        yield {
          usage: { inputTokens: 10, outputTokens: 1, model: "mock-no-cost" },
        };
      },
    },
  };
}
async function setup(x = deps(), staticDir?: string) {
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = (probe.address() as net.AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  const app = createAppServer(x, { host: "127.0.0.1", port, staticDir });
  await app.listen();
  const url = `http://127.0.0.1:${port}`;
  const post = (
    route: string,
    body: unknown = payload,
    headers: Record<string, string> = {},
    signal?: AbortSignal,
  ) =>
    fetch(url + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer fixture-mocked-auth",
        Origin: "http://localhost:5173",
        ...headers,
      },
      body: JSON.stringify(body),
      signal,
    });
  return { app, url, port, post, x };
}
async function withServer(
  run: (s: Awaited<ReturnType<typeof setup>>) => Promise<void>,
  x = deps(),
  dir?: string,
) {
  const server = await setup(x, dir);
  try {
    await run(server);
  } finally {
    await server.app.close();
  }
}
describe("real Node HTTP transport; MOCK identity/provider only, no Auth accounts", () => {
  it("health is minimal and successful session uses the verified actor", async () =>
    withServer(async ({ url, post, x }) => {
      expect(await (await fetch(url + "/api/health")).json()).toEqual({
        ok: true,
      });
      expect(
        await (
          await post("/api/session", { workspaceId: w, action: "end" })
        ).json(),
      ).toEqual({ ended: true });
      expect(x.platform.rpc.mock.calls[0]).toEqual([
        "edge_session",
        { p_workspace_id: w, p_user_id: u, p_session_id: s, p_action: "end" },
        expect.any(AbortSignal),
      ]);
    }));
  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ])("allows explicit %s preflight", async (origin) =>
    withServer(async ({ url, x }) => {
      const res = await fetch(url + "/api/chat-stream", {
        method: "OPTIONS",
        headers: { Origin: origin },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe(origin);
      expect(x.platform.authenticate).not.toHaveBeenCalled();
    }),
  );
  it.each([
    "https://evil.invalid",
    "null",
    "http://localhost:5173.evil.invalid",
    "http://127.0.0.1:9999",
  ])("rejects %s before Auth or SQL", async (origin) =>
    withServer(async ({ post, x }) => {
      const res = await post("/api/chat-stream", payload, { Origin: origin });
      expect(res.status).toBe(403);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
      expect(x.platform.authenticate).not.toHaveBeenCalled();
      expect(x.platform.rpc).not.toHaveBeenCalled();
    }),
  );
  it("explicit empty origin override remains closed", async () => {
    const x = deps();
    x.env = (n) => (n === "ALLOWED_ORIGINS" ? "" : undefined);
    await withServer(
      async ({ post }) =>
        expect(
          (await post("/api/session", { workspaceId: w, action: "touch" }))
            .status,
        ).toBe(403),
      x,
    );
  });
  it("wildcards never enable reflection", () =>
    expect(() =>
      cors(
        new Request("http://127.0.0.1", {
          headers: { Origin: "https://evil.invalid" },
        }),
        () => "*",
      ),
    ).toThrow(AppError));
  it("host spoof and forwarded host are rejected before authentication", async () =>
    withServer(async ({ url, x }) => {
      const status = await new Promise<number>((resolve, reject) => {
        const req = http.request(
          {
            host: "127.0.0.1",
            port: new URL(url).port,
            path: "/api/chat-stream",
            method: "POST",
            headers: {
              Host: "evil.invalid",
              "X-Forwarded-Host": "localhost:5174",
            },
          },
          (res) => {
            res.resume();
            resolve(res.statusCode!);
          },
        );
        req.on("error", reject);
        req.end("{}");
      });
      expect(status).toBe(403);
      expect(x.platform.authenticate).not.toHaveBeenCalled();
    }));
  it("unknown API is JSON 404, including encoded confusion", async () =>
    withServer(async ({ url, post, x }) => {
      for (const route of [
        "/api/missing",
        "/api//chat-stream",
        "/api/%67ibtsnicht",
      ]) {
        const res = await fetch(url + route);
        expect(res.status).toBe(404);
        expect(res.headers.get("content-type")).toContain("application/json");
        expect((await res.json()).error).toMatchObject({
          code: "RESOURCE_NOT_FOUND",
          message: "Endpunkt nicht vorhanden.",
        });
      }
      const res = await post("/api/gibtsnicht");
      expect(res.status).toBe(404);
      expect((await res.json()).error).toMatchObject({
        code: "RESOURCE_NOT_FOUND",
        message: "Endpunkt nicht vorhanden.",
      });
      expect(x.platform.authenticate).not.toHaveBeenCalled();
      expect(x.platform.rpc).not.toHaveBeenCalled();
    }));
  it("missing conversation keeps its conversation-specific message", async () => {
    const x = deps();
    x.platform.rpc.mockRejectedValue(new AppError("RESOURCE_NOT_FOUND", 404));
    await withServer(async ({ post }) => {
      const res = await post("/api/chat-stream");
      expect(res.status).toBe(404);
      expect((await res.json()).error).toMatchObject({
        code: "RESOURCE_NOT_FOUND",
        message: "Das Gespräch ist nicht verfügbar.",
      });
    }, x);
  });
  it("completed incoming request close leaves normal streaming alive and uncompressed", async () =>
    withServer(async ({ post }) => {
      const res = await post("/api/chat-stream");
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
      expect(res.headers.get("content-encoding")).toBeNull();
      const text = await res.text();
      expect(text).toContain("message.completed");
      expect(text).toContain("Hallo");
    }));
  it("Auth refusal exposes no SQL or raw error and never invokes provider", async () => {
    const x = deps();
    x.platform.authenticate.mockRejectedValue(
      new AppError("AUTH_REQUIRED", 401),
    );
    await withServer(async ({ post, x }) => {
      const res = await post("/api/chat-stream");
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("AUTH_REQUIRED");
      expect(x.platform.rpc).not.toHaveBeenCalled();
    }, x);
  });
  it("content-length oversized body is refused", async () =>
    withServer(async ({ post, x }) => {
      expect(
        (await post("/api/session", { padding: "x".repeat(40001) })).status,
      ).toBe(400);
      expect(x.platform.authenticate).not.toHaveBeenCalled();
    }));
  it("chunked oversized body is refused without allocation beyond cap", async () =>
    withServer(async ({ port, x }) => {
      const status = await new Promise<number>((resolve, reject) => {
        const req = http.request(
          {
            host: "127.0.0.1",
            port,
            path: "/api/session",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Transfer-Encoding": "chunked",
            },
          },
          (res) => {
            res.resume();
            resolve(res.statusCode!);
          },
        );
        req.on("error", reject);
        req.write("x".repeat(39999));
        req.end("more");
      });
      expect(status).toBe(400);
      expect(x.platform.authenticate).not.toHaveBeenCalled();
    }));
  it("client socket close aborts provider and conservatively finalizes partial text", async () => {
    const x = deps();
    let aborted = false;
    x.provider = {
      async *stream(_context, signal) {
        yield { text: "Teiltext" };
        await new Promise<void>((resolve) =>
          signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              resolve();
            },
            { once: true },
          ),
        );
      },
    };
    await withServer(async ({ post, x }) => {
      const controller = new AbortController();
      const res = await post(
        "/api/chat-stream",
        payload,
        {},
        controller.signal,
      );
      const reader = res.body!.getReader();
      let text = "";
      while (!text.includes("Teiltext")) {
        const part = await reader.read();
        text += new TextDecoder().decode(part.value);
      }
      controller.abort();
      await reader.cancel().catch(() => {});
      await vi.waitFor(() => expect(aborted).toBe(true));
      await vi.waitFor(() =>
        expect(
          x.platform.rpc.mock.calls.some(
            (call) =>
              call[0] === "edge_chat_finish" &&
              call[1].p_status === "interrupted" &&
              call[1].p_content === "Teiltext" &&
              call[1].p_input_tokens === null,
          ),
        ).toBe(true),
      );
    }, x);
  });
  it("slow consumer keeps provider production bounded", async () => {
    const x = deps();
    let generated = 0;
    x.provider = {
      async *stream() {
        for (let i = 0; i < 1000; i++) {
          generated++;
          yield { text: "x".repeat(1000) };
        }
      },
    };
    const response = await chatHandler(x)(
      new Request("http://localhost:5174/api/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(generated).toBeLessThanOrEqual(1);
    await response.body!.cancel();
    expect(
      x.platform.rpc.mock.calls.some(
        (call) =>
          call[0] === "edge_chat_finish" && call[1].p_status === "interrupted",
      ),
    ).toBe(true);
  });
  it("shutdown aborts an active SSE response and closes within 5 seconds", async () => {
    const x = deps();
    x.provider = {
      async *stream(_context, signal) {
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
      },
    };
    const state = await setup(x);
    try {
      const res = await state.post("/api/chat-stream");
      const reader = res.body!.getReader();
      await reader.read();
      const start = Date.now();
      await state.app.close();
      expect(Date.now() - start).toBeLessThan(4500);
      await reader.cancel().catch(() => {});
      expect(state.app.server.listening).toBe(false);
    } finally {
      await state.app.close();
    }
  });
});
describe("fixed parameterized RPC whitelist", () => {
  it.each([
    "__proto__",
    "constructor",
    "edge_session;DROP TABLE profiles",
    "private.chat_prepare",
    "pg_sleep",
    "update_agent_settings",
  ])("refuses %s", (name) =>
    expect(() => rpcQuery(name, {})).toThrow(AppError),
  );
  it("arguments cannot introduce syntax or extra role/actor fields", () => {
    const base = {
      p_workspace_id: w,
      p_user_id: u,
      p_session_id: s,
      p_action: "touch",
    };
    expect(rpcQuery("edge_session", base)).toEqual({
      text: "SELECT public.edge_session($1::uuid,$2::uuid,$3::uuid,$4::text) AS result",
      values: [w, u, s, "touch"],
    });
    expect(() =>
      rpcQuery("edge_session", { ...base, role: "postgres" }),
    ).toThrow(AppError);
    expect(() =>
      rpcQuery("edge_session", { ...base, p_user_id: "bad" }),
    ).toThrow(AppError);
  });
});
describe("actual static HTTP delivery", () => {
  it("navigation fallback/cache, assets, dotfiles, traversal and symlink protection", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "pflege-node-static-"));
    const dist = path.join(temp, "dist");
    try {
      await mkdir(path.join(dist, "assets"), { recursive: true });
      await writeFile(path.join(dist, "index.html"), "<h1>Test</h1>");
      await writeFile(path.join(dist, "assets", "a.js"), "export {}");
      await writeFile(path.join(temp, "private.txt"), "private");
      await symlink(
        path.join(temp, "private.txt"),
        path.join(dist, "outside.js"),
      );
      await withServer(
        async ({ url }) => {
          const index = await fetch(url + "/");
          expect(index.status).toBe(200);
          expect(index.headers.get("cache-control")).toBe("no-cache");
          expect(
            (
              await fetch(url + "/chat/one", {
                headers: { Accept: "text/html" },
              })
            ).status,
          ).toBe(200);
          expect((await fetch(url + "/chat/one")).status).toBe(404);
          const asset = await fetch(url + "/assets/a.js");
          expect(asset.headers.get("cache-control")).toContain("immutable");
          for (const route of ["/assets/missing.js", "/api/missing"])
            expect(
              (await fetch(url + route, { headers: { Accept: "text/html" } }))
                .status,
            ).toBe(404);
          for (const route of [
            "/.env",
            "/%2eenv",
            "/assets/%2e%2e%2f%2eenv",
            "/outside.js",
            "/%5c.env",
          ])
            expect((await fetch(url + route)).status).toBe(403);
        },
        deps(),
        dist,
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
