import { describe, it, expect, vi, afterEach } from "vitest";
import { GeminiProvider } from "../runtime/gemini.ts";
import { type Context, type ProviderPart } from "../runtime/provider.ts";
import { chatHandler } from "../runtime/handler.ts";
import { errorPayload } from "../runtime/errors.ts";
const id = "81000000-0000-4000-8000-000000000001";
const model = "gemini-3.8-flash";
const context: Context = {
  model: {
    registryId: id,
    provider: "gemini",
    providerModelId: model,
    displayName: "Gemini 3.8 Flash · Google AI Studio",
    region: "unverified",
  },
  acceptedResponseModelIds: [model],
  promptVersionId: id,
  instructions: "Fiktiver serverseitiger Kontext",
  input: [
    { role: "user", content: "Frage" },
    { role: "assistant", content: "Antwort" },
    { role: "user", content: "Folgefrage" },
  ],
  maxOutputTokens: 1024,
  inputTokenBound: 10000,
  maximumCostMicrousd: 0,
  outputTokenBound: 65536,
};
const usage = {
  promptTokenCount: 34,
  candidatesTokenCount: 12,
  totalTokenCount: 46,
};
const chunk = (
  text: string,
  finishReason?: string,
  u: unknown = usage,
  version = model,
) => ({
  modelVersion: version,
  usageMetadata: u,
  candidates: [
    {
      index: 0,
      content: { role: "model", parts: [{ text }] },
      ...(finishReason ? { finishReason } : {}),
    },
  ],
});
const sse = (events: unknown[]) =>
  events
    .map(
      (e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\r\n\r\n`,
    )
    .join("");
const response = (events: unknown[]) =>
  new Response(sse(events), {
    headers: { "Content-Type": "text/event-stream" },
  });
function transport(events: unknown[]) {
  return vi
    .fn()
    .mockResolvedValueOnce(Response.json({ totalTokens: 33 }))
    .mockResolvedValueOnce(response(events));
}
async function consume(
  provider: GeminiProvider,
  c = context,
  signal = new AbortController().signal,
) {
  const parts: ProviderPart[] = [];
  for await (const part of provider.stream(c, signal)) parts.push(part);
  return parts;
}
afterEach(() => vi.unstubAllGlobals());
describe("native Gemini transport, synthetic responses only", () => {
  it("streams the actually observed terminal signature shape and identical cumulative usage", async () => {
    const stop = chunk("", "STOP");
    Object.assign(stop.candidates[0].content.parts[0], {
      thoughtSignature: "synthetic-private-signature",
    });
    const f = transport([chunk("Guten Tag."), stop]);
    expect(await consume(new GeminiProvider("synthetic-key", f))).toEqual([
      { text: "Guten Tag." },
      { usage: { inputTokens: 34, outputTokens: 12, model } },
    ]);
    expect(f).toHaveBeenCalledTimes(2);
    const [countURL, countOptions] = f.mock.calls[0];
    expect(countURL).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens`,
    );
    const [url, options] = f.mock.calls[1];
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    );
    expect(url).not.toContain("synthetic-key");
    expect(options.headers).toEqual({
      "Content-Type": "application/json",
      "x-goog-api-key": "synthetic-key",
    });
    const body = JSON.parse(options.body);
    expect(body.systemInstruction).toEqual({
      parts: [{ text: context.instructions }],
    });
    expect(body.contents.map((v: any) => v.role)).toEqual([
      "user",
      "model",
      "user",
    ]);
    expect(body.generationConfig).toEqual({
      candidateCount: 1,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingLevel: "low", includeThoughts: false },
    });
    expect(JSON.parse(countOptions.body).generateContentRequest).toEqual({
      model: `models/${model}`,
      ...body,
    });
    expect(options.redirect).toBe("error");
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("toolConfig");
  });
  it("counts thoughts as output usage but hides thought text/signatures", async () => {
    const end = chunk("Sichtbar", "STOP", {
      ...usage,
      thoughtsTokenCount: 5,
      totalTokenCount: 51,
    });
    end.candidates[0].content.parts.unshift({
      text: "Private Überlegung",
      thought: true,
      thoughtSignature: "private",
    } as any);
    expect(await consume(new GeminiProvider("key", transport([end])))).toEqual([
      { text: "Sichtbar" },
      { usage: { inputTokens: 34, outputTokens: 17, model } },
    ]);
  });
  it("keeps legitimate separately reported thought usage above the visible answer token limit", async () => {
    const u = {
      promptTokenCount: 34,
      candidatesTokenCount: 12,
      thoughtsTokenCount: 1200,
      totalTokenCount: 1246,
    };
    expect(
      await consume(
        new GeminiProvider("key", transport([chunk("Antwort", "STOP", u)])),
      ),
    ).toEqual([
      { text: "Antwort" },
      { usage: { inputTokens: 34, outputTokens: 1212, model } },
    ]);
  });
  it("accepts explicit usage-only completion after STOP and records usage once", async () => {
    const end = chunk("Antwort", "STOP", undefined);
    delete end.usageMetadata;
    expect(
      await consume(
        new GeminiProvider(
          "key",
          transport([
            chunk("Vorher"),
            end,
            { modelVersion: model, usageMetadata: usage },
          ]),
        ),
      ),
    ).toEqual([
      { text: "Vorher" },
      { text: "Antwort" },
      { usage: { inputTokens: 34, outputTokens: 12, model } },
    ]);
  });
  it("refuses a missing final usage even if earlier cumulative usage is present", async () => {
    const end = chunk("", "STOP");
    delete end.usageMetadata;
    const parts: ProviderPart[] = [];
    await expect(
      (async () => {
        for await (const p of new GeminiProvider(
          "key",
          transport([chunk("Teil"), end]),
        ).stream(context, new AbortController().signal))
          parts.push(p);
      })(),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    expect(parts).toEqual([{ text: "Teil" }, { usageUnreliable: { model } }]);
  });
  it.each([401, 403, 429, 503, 500, 400])(
    "classifies HTTP%s without raw secrets or retry",
    async (status) => {
      const f = vi
        .fn()
        .mockResolvedValue(
          new Response("private-key-and-provider-message", { status }),
        );
      const report = vi.fn();
      let error: unknown;
      try {
        await consume(new GeminiProvider("private-key", f, report));
      } catch (e) {
        error = e;
      }
      const code =
        status === 401 || status === 403
          ? "PROVIDER_AUTH_FAILED"
          : status === 429
            ? "PROVIDER_RATE_LIMITED"
            : status >= 500
              ? "PROVIDER_UNAVAILABLE"
              : "PROVIDER_FAILED";
      expect(error).toMatchObject({
        code,
        retryable: status === 429 || status >= 500,
      });
      expect(f).toHaveBeenCalledTimes(1);
      expect(
        JSON.stringify([report.mock.calls, errorPayload(error, id)]),
      ).not.toContain("private-key");
      expect(JSON.stringify(report.mock.calls)).not.toContain(
        "provider-message",
      );
    },
  );
  it("missing key and wrong provider make zero external requests", async () => {
    const f = vi.fn();
    await expect(consume(new GeminiProvider("", f))).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
    });
    await expect(
      consume(new GeminiProvider("key", f), {
        ...context,
        model: { ...context.model, provider: "opencode" },
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
    expect(f).not.toHaveBeenCalled();
  });
  it("native invalid-key reason on HTTP400 is classified without exposing its message", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            error: {
              message: "private-key-material",
              details: [{ reason: "API_KEY_INVALID" }],
            },
          },
          { status: 400 },
        ),
      );
    let error: unknown;
    try {
      await consume(new GeminiProvider("private-key", f));
    } catch (e) {
      error = e;
    }
    expect(error).toMatchObject({ code: "PROVIDER_AUTH_FAILED" });
    expect(JSON.stringify(errorPayload(error, id))).not.toContain(
      "private-key-material",
    );
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("cannot turn registry model text into an arbitrary URL", async () => {
    const f = vi.fn();
    await expect(
      consume(new GeminiProvider("key", f), {
        ...context,
        model: { ...context.model, providerModelId: "../other?key=anything" },
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    expect(f).not.toHaveBeenCalled();
  });
  it("failed online token bound never reaches generation", async () => {
    const f = vi.fn().mockResolvedValue(Response.json({ totalTokens: 10001 }));
    await expect(consume(new GeminiProvider("key", f))).rejects.toMatchObject({
      code: "PRICING_UNVERIFIED",
    });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it.each([
    [
      "network",
      () => {
        throw new TypeError("secret network text");
      },
    ],
    ["bad count", () => Response.json({ totalTokens: -1 })],
  ])("handles %s safely", async (_name, f) => {
    await expect(
      consume(new GeminiProvider("key", vi.fn(f as any))),
    ).rejects.toMatchObject({
      code: _name === "network" ? "PROVIDER_UNAVAILABLE" : "PRICING_UNVERIFIED",
    });
  });
  it.each([
    ["invalid JSON", ["broken"]],
    ["missing STOP", [chunk("Teil")]],
    ["wrong model", [chunk("", "STOP", usage, "gemini-other")]],
    [
      "output overflow",
      [
        chunk("", "STOP", {
          promptTokenCount: 34,
          candidatesTokenCount: 1025,
          totalTokenCount: 1059,
        }),
      ],
    ],
    [
      "total output overflow",
      [
        chunk("", "STOP", {
          promptTokenCount: 34,
          candidatesTokenCount: 12,
          thoughtsTokenCount: 65536,
          totalTokenCount: 65582,
        }),
      ],
    ],
    [
      "input overflow",
      [
        chunk("", "STOP", {
          promptTokenCount: 10001,
          candidatesTokenCount: 1,
          totalTokenCount: 10002,
        }),
      ],
    ],
    ["bad usage total", [chunk("", "STOP", { ...usage, totalTokenCount: 2 })]],
    [
      "negative usage",
      [chunk("", "STOP", { ...usage, candidatesTokenCount: -1 })],
    ],
    ["MAX_TOKENS", [chunk("", "MAX_TOKENS")]],
    ["duplicate STOP", [chunk("", "STOP"), chunk("", "STOP")]],
    [
      "wrong role",
      [
        {
          ...chunk("", "STOP"),
          candidates: [
            {
              content: { role: "user", parts: [{ text: "wrong" }] },
              finishReason: "STOP",
            },
          ],
        },
      ],
    ],
    [
      "tool output",
      [
        {
          ...chunk("", "STOP"),
          candidates: [
            {
              content: { parts: [{ functionCall: { name: "create" } }] },
              finishReason: "STOP",
            },
          ],
        },
      ],
    ],
    [
      "malformed thought",
      [
        {
          ...chunk("", "STOP"),
          candidates: [
            {
              content: { parts: [{ text: "x", thought: "yes" }] },
              finishReason: "STOP",
            },
          ],
        },
      ],
    ],
  ])(
    "rejects %s with no successful terminal receipt",
    async (_name, events) => {
      await expect(
        consume(new GeminiProvider("key", transport(events))),
      ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    },
  );
  it.each(["SAFETY", "RECITATION", "SPII"])(
    "classifies blocked %s and preserves final known usage",
    async (reason) => {
      const parts: ProviderPart[] = [];
      await expect(
        (async () => {
          for await (const p of new GeminiProvider(
            "key",
            transport([chunk("hidden", reason)]),
          ).stream(context, new AbortController().signal))
            parts.push(p);
        })(),
      ).rejects.toMatchObject({ code: "PROVIDER_CONTENT_BLOCKED" });
      expect(parts).toEqual([
        { usage: { inputTokens: 34, outputTokens: 12, model } },
      ]);
    },
  );
  it("classifies a prompt block with no generated candidate", async () => {
    await expect(
      consume(
        new GeminiProvider(
          "key",
          transport([
            {
              modelVersion: model,
              promptFeedback: { blockReason: "SAFETY" },
              usageMetadata: { promptTokenCount: 34, totalTokenCount: 34 },
            },
          ]),
        ),
      ),
    ).rejects.toMatchObject({ code: "PROVIDER_CONTENT_BLOCKED" });
  });
  it("aborted request makes no provider call", async () => {
    const f = vi.fn(),
      controller = new AbortController();
    controller.abort();
    await expect(
      consume(new GeminiProvider("key", f), context, controller.signal),
    ).rejects.toMatchObject({ code: "REQUEST_ABORTED" });
    expect(f).not.toHaveBeenCalled();
  });
  it("native lifecycle reports actual operations and configuration without raw thoughts or signatures", async () => {
    const report = vi.fn(async () => {});
    await consume(
      new GeminiProvider(
        "key",
        transport([chunk("Antwort", "STOP")]),
        () => {},
        report,
      ),
    );
    expect(report.mock.calls.map((c: any) => c[0].stage)).toEqual([
      "token_count",
      "provider_request",
      "awaiting_text",
    ]);
    expect(report.mock.calls[1]?.[0]).toMatchObject({
      details: {
        operation: "gemini.streamGenerateContent",
        thinking: "low",
        maxOutputTokens: 1024,
      },
    });
    expect(JSON.stringify(report.mock.calls)).not.toContain("Antwort");
  });
  it("aborting a silent native stream cancels its reader and returns the abort cause", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const f = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ totalTokens: 33 }))
      .mockResolvedValueOnce(
        new Response(body, {
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
    const controller = new AbortController();
    const consumed = consume(
      new GeminiProvider("key", f),
      context,
      controller.signal,
    );
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    controller.abort();
    await expect(consumed).rejects.toMatchObject({ code: "REQUEST_ABORTED" });
    expect(cancelled).toBe(true);
    expect(body.locked).toBe(false);
  });
});
describe("Gemini same-origin handler preserves request finalization and replay", () => {
  function handler(replay = false) {
    const rpc = vi.fn(async (name: string) =>
      name === "edge_chat_replay"
        ? replay
          ? {
              context,
              messageId: id,
              replayed: true,
              content: "Gespeichert",
              inputTokens: 34,
              outputTokens: 12,
              costMicrousd: 0,
            }
          : null
        : name === "edge_chat_prepare"
          ? { context, messageId: id, replayed: false }
          : name === "edge_chat_finish"
            ? { status: "completed", costMicrousd: 0 }
            : true,
    );
    return {
      rpc,
      deps: {
        env: (name: string) =>
          name === "GEMINI_API_KEY" ? "synthetic-key" : undefined,
        platform: {
          authenticate: vi.fn(async () => ({ userId: id, sessionId: id })),
          rpc,
        },
      },
    };
  }
  const request = () =>
    new Request("https://example.invalid/api/chat-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: id,
        conversationId: id,
        clientRequestId: id,
        content: "Frage",
        attachmentIds: [],
      }),
    });
  it("selects Gemini explicitly and atomically persists actual identity and usage", async () => {
    const x = handler(),
      f = transport([chunk("Antwort", "STOP")]);
    vi.stubGlobal("fetch", f);
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).toContain('"provider":"gemini"');
    expect(text).toContain("event: message.completed");
    expect(text).not.toContain("synthetic-key");
    expect(
      x.rpc.mock.calls.filter((c) => c[0] === "edge_chat_finish"),
    ).toHaveLength(1);
    expect(
      (x.rpc.mock.calls.find((c) => c[0] === "edge_chat_finish") as any)[1],
    ).toMatchObject({
      p_status: "completed",
      p_input_tokens: 34,
      p_output_tokens: 12,
      p_response_model: model,
    });
    expect(f).toHaveBeenCalledTimes(2);
    const activities = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => JSON.parse(line.slice(5)))
      .filter((event) => event.type === "message.activity");
    expect(activities.map((event) => event.data.stage)).toEqual([
      "auth_verified",
      "context_ready",
      "token_count",
      "provider_request",
      "awaiting_text",
      "streaming",
      "persisting",
    ]);
    expect(JSON.stringify(activities)).not.toContain(
      "Fiktiver serverseitiger Kontext",
    );
    expect(JSON.stringify(activities)).not.toContain("Folgefrage");
    expect(
      activities.every(
        (event) =>
          Number.isSafeInteger(event.data.elapsedMs) &&
          event.data.elapsedMs >= 0,
      ),
    ).toBe(true);
  });
  it("completed replay works without any current provider keys or provider call", async () => {
    const x = handler(true),
      f = vi.fn();
    vi.stubGlobal("fetch", f);
    x.deps.env = () => undefined;
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).toContain("Gespeichert");
    expect(text).toContain('"replayed":true');
    expect(f).not.toHaveBeenCalled();
    expect(
      x.rpc.mock.calls.some(
        (c) => c[0] === "edge_chat_prepare" || c[0] === "edge_chat_finish",
      ),
    ).toBe(false);
  });
  it("provider 429 fails exactly once without completed or cross-provider fallback", async () => {
    const x = handler(),
      f = vi
        .fn()
        .mockResolvedValue(new Response("private message", { status: 429 }));
    vi.stubGlobal("fetch", f);
    const text = await (await chatHandler(x.deps)(request())).text();
    expect(text).toContain("PROVIDER_RATE_LIMITED");
    expect(text).not.toContain("private message");
    expect(text).not.toContain("message.completed");
    expect(f).toHaveBeenCalledTimes(1);
    expect(
      x.rpc.mock.calls.filter((c) => c[0] === "edge_chat_finish"),
    ).toHaveLength(1);
    expect(
      (x.rpc.mock.calls.find((c) => c[0] === "edge_chat_finish") as any)[1],
    ).toMatchObject({
      p_status: "failed",
      p_input_tokens: null,
      p_output_tokens: null,
    });
  });
});
