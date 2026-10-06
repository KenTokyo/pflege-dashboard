import { describe, expect, it, vi } from "vitest";
import { chatHandler, sessionHandler } from "../runtime/handler.ts";
import { AppError } from "../runtime/errors.ts";
import { type Context, OpenAIProvider, sseData } from "../runtime/provider.ts";
import { cors, platform } from "../runtime/platform.ts";
const w = "10000000-0000-4000-8000-000000000001",
  c = "10000000-0000-4000-8000-000000000050",
  r = "40000000-0000-4000-8000-000000000001";
const u = "40000000-0000-4000-8000-000000000002",
  s = "40000000-0000-4000-8000-000000000003";
const context: Context = {
  model: {
    registryId: r,
    provider: "openai",
    providerModelId: "fixture-no-call",
    displayName: "Test",
    region: "unverified",
  },
  promptVersionId: r,
  instructions: "Sie. Fiktiver Test.",
  input: [{ role: "user", content: "Test" }],
  maxOutputTokens: 1024,
  inputTokenBound: 10000,
  maximumCostMicrousd: 10000,
};
const request = (extra: Record<string, unknown> = {}, signal?: AbortSignal) =>
  new Request("https://example.invalid/api/chat-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer synthetic-test-token",
    },
    body: JSON.stringify({
      workspaceId: w,
      conversationId: c,
      clientRequestId: r,
      content: "Test",
      attachmentIds: [],
      ...extra,
    }),
    signal,
  });
const event = (type: string, data: unknown) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
function setup(overrides: Record<string, unknown> = {}) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "edge_chat_prepare") {
      return { messageId: r, context, replayed: false };
    }
    if (name === "edge_chat_finish") {
      return { status: "completed", costMicrousd: 20 };
    }
    return name === "edge_chat_replay" ? null : true;
  });
  const authenticate = vi.fn(async () => ({ userId: u, sessionId: s }));
  const provider = {
    async *stream() {
      yield { text: "Guten " };
      yield { text: "Tag" };
      yield {
        usage: { inputTokens: 10, outputTokens: 5, model: "fixture-no-call" },
      };
    },
  };
  return {
    rpc,
    authenticate,
    provider,
    deps: {
      env: () => undefined,
      platform: { rpc, authenticate },
      provider,
      ...overrides,
    },
  };
}
describe("actual Node handler with MOCK provider, no live Auth account", () => {
  it("streams ordered events and commits before completed", async () => {
    const x = setup();
    const response = await chatHandler(x.deps)(request());
    expect(response.status).toBe(200);
    const text = await response.text();
    const data = text
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => JSON.parse(l.slice(5)));
    expect(data.map((x) => x.type)).toEqual([
      "message.started",
      "message.delta",
      "message.delta",
      "usage.final",
      "message.completed",
    ]);
    expect(data.map((x) => x.sequence)).toEqual([1, 2, 3, 4, 5]);
    const finish = x.rpc.mock.calls.find((x) => x[0] === "edge_chat_finish");
    expect(finish?.[1]).toMatchObject({
      p_content: "Guten Tag",
      p_status: "completed",
      p_user_id: u,
    });
  });
  it("uses trusted actor, never a payload actor", async () => {
    const x = setup();
    const res = await chatHandler(x.deps)(request({ userId: "spoof" }));
    expect(res.status).toBe(400);
    expect(x.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { content: "" },
    { content: "x".repeat(8001) },
    { attachmentIds: [r] },
    { workspaceId: "bad" },
    { model: "spoof" },
  ])("refuses invalid input %j", async (data) => {
    const x = setup();
    expect((await chatHandler(x.deps)(request(data))).status).toBe(400);
  });
  it("auth rejection precedes RPC/provider", async () => {
    const x = setup();
    x.authenticate.mockRejectedValue(new AppError("AUTH_REQUIRED", 401));
    const res = await chatHandler(x.deps)(request());
    expect(res.status).toBe(401);
    expect(x.rpc).not.toHaveBeenCalled();
  });
  it("expired live session cannot reserve budget", async () => {
    const x = setup();
    x.rpc.mockRejectedValue(new AppError("SESSION_EXPIRED", 401));
    expect((await chatHandler(x.deps)(request())).status).toBe(401);
  });
  it("missing provider config is explicit and performs no prepare", async () => {
    const x = setup({ provider: undefined });
    const res = await chatHandler(x.deps)(request());
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("PROVIDER_NOT_CONFIGURED");
    expect(x.rpc.mock.calls.some((x) => x[0] === "edge_chat_prepare")).toBe(
      false,
    );
  });
  it.each([
    "BUDGET_EXCEEDED",
    "RATE_LIMITED",
    "PARALLEL_LIMIT",
    "PRICING_UNVERIFIED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_CONFLICT",
  ])("propagates safe %s before SSE", async (code) => {
    const x = setup();
    x.rpc.mockImplementation(async (name) => {
      if (name === "edge_chat_prepare") throw new AppError(code, 429);
      return name === "edge_chat_replay" ? null : true;
    });
    const res = await chatHandler(x.deps)(request());
    expect((await res.json()).error.code).toBe(code);
  });
  it("completed replay never calls provider or finalizes twice", async () => {
    const x = setup();
    const call = vi.spyOn(x.provider, "stream");
    x.rpc.mockImplementation(async (name) =>
      name === "edge_chat_prepare"
        ? {
            messageId: r,
            context,
            replayed: true,
            content: "Stored",
            inputTokens: 10,
            outputTokens: 5,
            costMicrousd: 20,
          }
        : name === "edge_chat_replay"
          ? null
          : true,
    );
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).toContain("Stored");
    expect(text).toContain('"replayed":true');
    expect(call).not.toHaveBeenCalled();
    expect(x.rpc.mock.calls.some((x) => x[0] === "edge_chat_finish")).toBe(
      false,
    );
  });
  it("provider failure persists partial answer and never emits completed", async () => {
    const x = setup({
      provider: {
        async *stream() {
          yield { text: "Partial" };
          throw new Error("provider secret must never escape");
        },
      },
    });
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).toContain("PROVIDER_FAILED");
    expect(text).not.toContain("provider secret");
    expect(text).not.toContain("event: message.completed");
    expect(
      x.rpc.mock.calls.find((x) => x[0] === "edge_chat_finish")?.[1],
    ).toMatchObject({
      p_content: "Partial",
      p_status: "failed",
      p_input_tokens: null,
    });
  });
  it("stream cancellation aborts provider and persists interruption", async () => {
    let aborted = false;
    let done: () => void = () => {};
    const persisted = new Promise<void>((resolve) => (done = resolve));
    const x = setup({
      provider: {
        async *stream(_c: Context, signal: AbortSignal) {
          const stopped = new Promise<void>((resolve) => {
            const onAbort = () => {
              aborted = true;
              resolve();
            };
            if (signal.aborted) onAbort();
            else signal.addEventListener("abort", onAbort, { once: true });
          });
          yield { text: "Partial" };
          await stopped;
          throw new AppError("REQUEST_ABORTED", 409);
        },
      },
    });
    x.rpc.mockImplementation(async (name) => {
      if (name === "edge_chat_prepare") {
        return { messageId: r, context, replayed: false };
      }
      if (name === "edge_chat_finish") {
        done();
        return { status: "interrupted" };
      }
      return name === "edge_chat_replay" ? null : true;
    });
    const response = await chatHandler(x.deps)(request());
    const reader = response.body!.getReader();
    await reader.read();
    await reader.read();
    await reader.cancel();
    await persisted;
    expect(aborted).toBe(true);
    expect(
      x.rpc.mock.calls.find((x) => x[0] === "edge_chat_finish")?.[1],
    ).toMatchObject({ p_status: "interrupted" });
  });
  it("server time limit aborts provider and persists interruption", async () => {
    const x = setup({
      timeoutMs: 5,
      provider: {
        async *stream(_context: Context, signal: AbortSignal) {
          yield { text: "Partial before timeout" };
          await new Promise<void>((resolve) => {
            if (signal.aborted) resolve();
            else {
              signal.addEventListener("abort", () => resolve(), {
                once: true,
              });
            }
          });
          throw new DOMException("Synthetic aborted fetch", "AbortError");
        },
      },
    });
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).toContain("REQUEST_ABORTED");
    expect(text).not.toContain("message.completed");
    expect(
      x.rpc.mock.calls.find((call) => call[0] === "edge_chat_finish")?.[1],
    ).toMatchObject({
      p_status: "interrupted",
      p_content: "Partial before timeout",
      p_input_tokens: null,
    });
  });
  it("known usage on provider incomplete still persists usage", async () => {
    const x = setup({
      provider: {
        async *stream() {
          yield {
            usage: {
              inputTokens: 10,
              outputTokens: 5,
              model: "fixture-no-call",
            },
          };
          throw new AppError("PROVIDER_FAILED", 502);
        },
      },
    });
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).toContain("PROVIDER_FAILED");
    expect(
      x.rpc.mock.calls.find((x) => x[0] === "edge_chat_finish")?.[1],
    ).toMatchObject({
      p_input_tokens: 10,
      p_output_tokens: 5,
      p_status: "failed",
    });
  });
  it("session revoked during output stops before delta", async () => {
    const x = setup();
    let checks = 0;
    x.rpc.mockImplementation(async (name) => {
      if (name === "edge_chat_prepare") {
        return { messageId: r, context, replayed: false };
      }
      if (name === "edge_chat_check" && ++checks > 1) {
        throw new AppError("SESSION_EXPIRED", 401);
      }
      return name === "edge_chat_replay" ? null : true;
    });
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).toContain("SESSION_EXPIRED");
    expect(text).not.toContain("Guten");
  });
  it("does not emit success if DB finalization fails", async () => {
    const x = setup();
    x.rpc.mockImplementation(async (name) => {
      if (name === "edge_chat_prepare") {
        return { messageId: r, context, replayed: false };
      }
      if (name === "edge_chat_finish") throw new Error("db raw secret");
      return name === "edge_chat_replay" ? null : true;
    });
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).not.toContain("message.completed");
    expect(text).not.toContain("db raw secret");
  });
  it("session touch binds only verified identity", async () => {
    const x = setup();
    const req = new Request("https://example.invalid/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: w, action: "touch" }),
    });
    expect((await sessionHandler(x.deps)(req)).status).toBe(200);
    expect(x.rpc.mock.calls[0]).toEqual([
      "edge_session",
      {
        p_workspace_id: w,
        p_user_id: u,
        p_session_id: s,
        p_action: "touch",
      },
      expect.any(AbortSignal),
    ]);
  });

  it("session action array is invalid, not coerced into touch", async () => {
    const x = setup();
    const req = new Request("https://example.invalid/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: w, action: ["touch"] }),
    });
    expect((await sessionHandler(x.deps)(req)).status).toBe(400);
    expect(x.rpc).not.toHaveBeenCalled();
  });
  it("session end is a separate operation", async () => {
    const x = setup();
    const req = new Request("https://example.invalid/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: w, action: "end" }),
    });
    await sessionHandler(x.deps)(req);
    expect(x.rpc.mock.calls[0][1]).toMatchObject({ p_action: "end" });
  });
});
describe("actual OpenAI HTTP adapter against synthetic fetch, zero external calls", () => {
  const fetcher = (payload: string) =>
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ input_tokens: 12 }))
      .mockResolvedValueOnce(
        new Response(payload, {
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
  it("sends server instructions, bounded tokens, no tools and no provider storage", async () => {
    const fetch = fetcher(
      event("response.output_text.delta", { delta: "Hallo" }) +
        event("response.completed", {
          response: {
            model: "fixture-no-call",
            usage: { input_tokens: 12, output_tokens: 2 },
          },
        }),
    );
    const parts = [];
    for await (const p of new OpenAIProvider("synthetic-key", fetch).stream(
      context,
      new AbortController().signal,
    ))
      parts.push(p);
    expect(parts).toEqual([
      { text: "Hallo" },
      {
        usage: { inputTokens: 12, outputTokens: 2, model: "fixture-no-call" },
      },
    ]);
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body).toMatchObject({
      store: false,
      stream: true,
      max_output_tokens: 1024,
      instructions: context.instructions,
    });
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
  });
  it("actual count over reserved bound prevents generation", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ input_tokens: 10001 }));
    const generator = new OpenAIProvider("synthetic-key", fetch).stream(
      context,
      new AbortController().signal,
    );
    await expect(generator.next()).rejects.toMatchObject({
      code: "PRICING_UNVERIFIED",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    { model: "wrong", usage: { input_tokens: 1, output_tokens: 1 } },
    {
      model: "fixture-no-call",
      usage: { input_tokens: 1, output_tokens: 1025 },
    },
    { model: "fixture-no-call", usage: null },
  ])("rejects unverified completion %j", async (response) => {
    const generator = new OpenAIProvider(
      "synthetic-key",
      fetcher(event("response.completed", { response })),
    ).stream(context, new AbortController().signal);
    await expect(generator.next()).rejects.toMatchObject({
      code: "PROVIDER_FAILED",
    });
  });
  it("missing terminal event never becomes success", async () => {
    const gen = new OpenAIProvider(
      "synthetic-key",
      fetcher(event("response.output_text.delta", { delta: "partial" })),
    ).stream(context, new AbortController().signal);
    await gen.next();
    await expect(gen.next()).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
  });
  it("does not retry provider errors", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("private error", { status: 429 }));
    await expect(
      new OpenAIProvider("synthetic-key", fetch)
        .stream(context, new AbortController().signal)
        .next(),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("SSE parses split UTF-8, CRLF and multiple data lines", async () => {
    const bytes = new TextEncoder().encode(
      'data: {"text":"Grüße"}\r\n\r\ndata: first\r\ndata: second\r\n\r\n',
    );
    const body = new ReadableStream<Uint8Array>({
      start(sink) {
        for (const b of bytes) sink.enqueue(new Uint8Array([b]));
        sink.close();
      },
    });
    const data = [];
    for await (const d of sseData(body, new AbortController().signal)) {
      data.push(d);
    }
    expect(data).toEqual(['{"text":"Grüße"}', "first\nsecond"]);
  });
});
describe("Auth and CORS transport", () => {
  it("getUser validation is required before trusting decoded JWT", async () => {
    const fake = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    const p = platform(
      (n) =>
        n === "SUPABASE_URL"
          ? "https://own.example.invalid"
          : n === "AUTH_JWT_ISSUER"
            ? undefined
            : "synthetic-key",
      fake,
    );
    await expect(p.authenticate(request())).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });
    expect(fake.mock.calls[0][0]).toBe(
      "https://own.example.invalid/auth/v1/user",
    );
  });
  it("validated user and JWT subject/session must agree", async () => {
    const claims = btoa(
      JSON.stringify({
        iss: "https://own.example.invalid/auth/v1",
        sub: u,
        session_id: s,
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
    );
    const req = new Request("https://example.invalid", {
      headers: { Authorization: `Bearer fake.${claims}.fake` },
    });
    const fake = vi.fn().mockResolvedValue(Response.json({ id: u }));
    const p = platform(
      (n) =>
        n === "SUPABASE_URL"
          ? "https://own.example.invalid"
          : n === "AUTH_JWT_ISSUER"
            ? undefined
            : "synthetic-key",
      fake,
    );
    expect(await p.authenticate(req)).toEqual({ userId: u, sessionId: s });
  });

  it("foreign issuer is denied even after user transport validation", async () => {
    const claims = btoa(
      JSON.stringify({
        iss: "https://other.example.invalid/auth/v1",
        sub: u,
        session_id: s,
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
    );
    const req = new Request("https://example.invalid", {
      headers: { Authorization: `Bearer fake.${claims}.fake` },
    });
    const p = platform(
      (n) =>
        n === "SUPABASE_URL"
          ? "https://own.example.invalid"
          : n === "AUTH_JWT_ISSUER"
            ? undefined
            : "synthetic-key",
      vi.fn().mockResolvedValue(Response.json({ id: u })),
    );
    await expect(p.authenticate(req)).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
  });
  it("unapproved browser origin is denied", () => {
    expect(() =>
      cors(
        new Request("https://api.example.invalid", {
          headers: { Origin: "https://evil.example.invalid" },
        }),
        () => "https://allowed.example.invalid",
      ),
    ).toThrow(AppError);
  });
  it("approved preflight allows only explicit origin", () => {
    const h = cors(
      new Request("https://api.example.invalid", {
        headers: { Origin: "https://allowed.example.invalid" },
      }),
      () => "https://allowed.example.invalid",
    );
    expect(h.get("Access-Control-Allow-Origin")).toBe(
      "https://allowed.example.invalid",
    );
    expect(h.get("Cache-Control")).toBe("no-store");
  });
});
