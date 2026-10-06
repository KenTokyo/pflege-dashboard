import { describe, it, expect, vi } from "vitest";
import {
  DeepSeekProvider,
  OpenCodeProvider,
  type Context,
} from "../runtime/provider.ts";
import { chatHandler } from "../runtime/handler.ts";
import {
  cloudEnvironment,
  createCloudHandler,
  DEMO_ORIGIN,
} from "../runtime/cloud.ts";
import { cloudConfiguration, PROJECT_REF } from "../runtime/config.ts";
const id = "81000000-0000-4000-8000-000000000001";
const context: Context = {
  model: {
    registryId: id,
    provider: "deepseek",
    providerModelId: "deepseek-flash",
    displayName: "DeepSeek V4.1 Flash",
    region: "unverified",
  },
  promptVersionId: id,
  instructions: "Fiktiver serverseitiger Kontext",
  input: [{ role: "user", content: "Frage" }],
  maxOutputTokens: 1024,
  inputTokenBound: 1048576,
  maximumCostMicrousd: 315802,
};
const chunk = (
  delta: object,
  reason: string | null = null,
  model = "deepseek-flash",
  usage: unknown = null,
) => ({ model, choices: [{ index: 0, delta, finish_reason: reason }], usage });
const usage = { prompt_tokens: 10, completion_tokens: 5 };
function mock(events: unknown[], done = true, trailers: unknown[] = []) {
  let cancelled = false;
  const fetcher = vi.fn(
    async () =>
      new Response(
        new ReadableStream({
          start(sink) {
            for (const event of events)
              sink.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify(event)}\r\n\r\n`,
                ),
              );
            if (done)
              sink.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            for (const trailer of trailers)
              sink.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify(trailer)}\n\n`,
                ),
              );
            sink.close();
          },
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  );
  return {
    fetcher,
    provider: new DeepSeekProvider(
      "synthetic-not-a-key",
      fetcher as typeof fetch,
    ),
    cancelled: () => cancelled,
  };
}
async function collect(provider: DeepSeekProvider) {
  const parts = [];
  for await (const p of provider.stream(context, new AbortController().signal))
    parts.push(p);
  return parts;
}
describe("DeepSeek real adapter with synthetic transport only", () => {
  it("uses official text SSE body, immutable server context, no tools or reasoning", async () => {
    const x = mock([
      chunk({ role: "assistant", content: "" }),
      chunk({ content: "Antwort" }),
      chunk({}, "stop", undefined, usage),
    ]);
    expect(await collect(x.provider)).toEqual([
      { text: "Antwort" },
      { usage: { inputTokens: 10, outputTokens: 5, model: "deepseek-flash" } },
    ]);
    expect(x.fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = x.fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    const body = JSON.parse(options.body as string);
    expect(body).toMatchObject({
      model: "deepseek-flash",
      thinking: { type: "disabled" },
      max_tokens: 1024,
      stream: true,
      stream_options: { include_usage: true },
    });
    expect(body.messages[0]).toEqual({
      role: "system",
      content: context.instructions,
    });
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
    expect(options.redirect).toBe("error");
  });
  it.each([
    "length",
    "content_filter",
    "tool_calls",
    "insufficient_system_resource",
    "aborted",
  ])("preserves known terminal usage for %s failure", async (reason) => {
    const x = mock([chunk({}, reason, "deepseek-flash", usage)]);
    const parts = [];
    await expect(
      (async () => {
        for await (const part of x.provider.stream(
          context,
          new AbortController().signal,
        ))
          parts.push(part);
      })(),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    expect(parts).toEqual([
      { usage: { inputTokens: 10, outputTokens: 5, model: "deepseek-flash" } },
    ]);
  });
  it("carries actual model mismatch through actual handler to failed finalization", async () => {
    const x = mock([
      chunk({ content: "Teiltext" }, null, "different"),
      chunk({}, "stop", "different", usage),
    ]);
    const rpc = vi.fn(async (name: string) =>
      name === "edge_chat_prepare"
        ? { messageId: id, context, replayed: false }
        : name === "edge_chat_replay"
          ? null
          : { status: "failed" },
    );
    const response = await chatHandler({
      env: () => undefined,
      platform: {
        rpc,
        authenticate: async () => ({ userId: id, sessionId: id }),
      },
      provider: x.provider,
    })(
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
      }),
    );
    const text = await response.text();
    expect(text).toContain("event: error");
    expect(text).not.toContain("event: message.completed");
    expect(
      rpc.mock.calls.find(([name]) => name === "edge_chat_finish")?.[1],
    ).toMatchObject({
      p_status: "failed",
      p_response_model: "different",
      p_input_tokens: 10,
      p_output_tokens: 5,
      p_content: "Teiltext",
    });
  });
  it.each([
    "tools",
    "reasoning",
    "missingUsage",
    "missingDone",
    "missingTerminal",
    "negativeUsage",
    "invalidJson",
  ])("refuses %s without pretending success", async (kind) => {
    const events: unknown[] =
      kind === "tools"
        ? [chunk({ tool_calls: [{}] })]
        : kind === "reasoning"
          ? [chunk({ reasoning_content: "hidden" })]
          : kind === "missingUsage"
            ? [chunk({}, "stop")]
            : kind === "missingTerminal"
              ? [chunk({ content: "Teil" })]
              : kind === "negativeUsage"
                ? [
                    chunk({}, "stop", undefined, {
                      prompt_tokens: -1,
                      completion_tokens: 5,
                    }),
                  ]
                : kind === "invalidJson"
                  ? [null]
                  : [chunk({}, "stop", undefined, usage)];
    await expect(
      collect(mock(events, kind !== "missingDone").provider),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
  });
  it("aborts a silent actual transport and cancels its reader", async () => {
    let cancelled = false;
    const fetcher = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
    );
    const ctrl = new AbortController();
    const pending = collectStream();
    async function collectStream() {
      for await (const part of new DeepSeekProvider(
        "synthetic",
        fetcher as typeof fetch,
      ).stream(context, ctrl.signal)) {
        void part;
      }
    }
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    ctrl.abort();
    await expect(pending).rejects.toMatchObject({ code: "REQUEST_ABORTED" });
    expect(cancelled).toBe(true);
  });
});

describe("safe real-adapter diagnostics without provider response content", () => {
  it.each([400, 401, 402, 422, 429, 500, 503])(
    "records only fixed metadata for HTTP %s",
    async (status) => {
      const secret = "fixture-private-key-and-response-content";
      const report = vi.fn();
      const provider = new DeepSeekProvider(
        secret,
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({ error: { message: secret, code: secret } }),
              {
                status,
                headers: {
                  "Content-Type": "application/json; secret=" + secret,
                },
              },
            ),
        ) as typeof fetch,
        report,
      );
      await expect(collect(provider)).rejects.toMatchObject({
        code: "PROVIDER_FAILED",
      });
      expect(report).toHaveBeenCalledExactlyOnceWith({
        reason: "HTTP_REJECTED",
        httpStatus: status,
        contentType: "json",
      });
      expect(JSON.stringify(report.mock.calls)).not.toContain(secret);
    },
  );
  it("untrusted provider metadata never becomes diagnostic text", async () => {
    const secret = "fixture-private-value";
    const report = vi.fn();
    const x = mock([
      {
        model: secret,
        error: { code: secret, type: secret, message: secret },
        choices: [],
      },
    ]);
    const provider = new DeepSeekProvider(
      secret,
      x.fetcher as typeof fetch,
      report,
    );
    await expect(collect(provider)).rejects.toMatchObject({
      code: "PROVIDER_FAILED",
    });
    expect(report).toHaveBeenCalledExactlyOnceWith({
      reason: "EVENT_ENVELOPE",
      httpStatus: 200,
      contentType: "sse",
      observedModel: "other",
      errorCode: "other",
      phase: "streaming",
      shape: {
        root: "object",
        fields: { model: "string", choices: "array", error: "object" },
        unknownFields: 0,
        choices: "zero",
        choice: {},
        delta: {},
      },
    });
    expect(JSON.stringify(report.mock.calls)).not.toContain(secret);
  });
  it("known public upstream error is allowlisted, message is discarded", async () => {
    const report = vi.fn();
    const x = mock([
      {
        model: "deepseek-flash",
        error: { code: "invalid_request_error", message: "never log" },
        choices: [],
      },
    ]);
    await expect(
      collect(
        new DeepSeekProvider("synthetic", x.fetcher as typeof fetch, report),
      ),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    expect(report.mock.calls[0][0]).toMatchObject({
      reason: "EVENT_ENVELOPE",
      errorCode: "invalid_request_error",
      observedModel: "deepseek-flash",
    });
    expect(JSON.stringify(report.mock.calls)).not.toContain("never log");
  });
  it("separates request/network failure without printing exception", async () => {
    const report = vi.fn();
    const provider = new DeepSeekProvider(
      "synthetic",
      vi.fn(async () => {
        throw new Error("secret request header");
      }) as typeof fetch,
      report,
    );
    await expect(collect(provider)).rejects.toMatchObject({
      code: "PROVIDER_FAILED",
    });
    expect(report).toHaveBeenCalledExactlyOnceWith({ reason: "NETWORK" });
  });
  it("broken diagnostics cannot prevent safe provider failure", async () => {
    const x = mock([null]);
    await expect(
      collect(
        new DeepSeekProvider("synthetic", x.fetcher as typeof fetch, () => {
          throw new Error("logging unavailable");
        }),
      ),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
  });
  it("does not diagnose user abort as upstream failure", async () => {
    const report = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const provider = new DeepSeekProvider(
      "synthetic",
      vi.fn(async () => {
        throw new Error("abort detail");
      }) as typeof fetch,
      report,
    );
    await expect(
      provider.stream(context, controller.signal).next(),
    ).rejects.toMatchObject({ code: "REQUEST_ABORTED" });
    expect(report).not.toHaveBeenCalled();
  });
});

describe("synthetic cloud key path; no real credentials or network", () => {
  it("preserves the provider-specific value through both cloud configuration layers", () => {
    const synthetic = "sk-Synthetic.Mixed_12+/==";
    const config = cloudConfiguration({
      SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
      SUPABASE_PUBLISHABLE_KEY: "synthetic-public",
      DATABASE_URL: `postgresql://postgres.${PROJECT_REF}:synthetic@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
      DEEPSEEK_API_KEY: synthetic,
      OPENAI_API_KEY: "other-provider-value",
    });
    expect(config.env("DEEPSEEK_API_KEY")).toBe(synthetic);
    expect(
      cloudEnvironment({
        DEEPSEEK_API_KEY: config.env("DEEPSEEK_API_KEY"),
        OPENAI_API_KEY: config.env("OPENAI_API_KEY"),
      })("DEEPSEEK_API_KEY"),
    ).toBe(synthetic);
  });
  it("actual cloud handler chooses the DeepSeek key and transmits its exact Bearer header", async () => {
    const synthetic = "sk-Synthetic.Mixed_12+/==";
    const x = mock([
      chunk({ content: "Test" }),
      chunk({}, "stop", undefined, usage),
    ]);
    vi.stubGlobal("fetch", x.fetcher);
    try {
      const env = cloudEnvironment({
        DEEPSEEK_API_KEY: synthetic,
        OPENAI_API_KEY: "must-not-be-used",
        SUPABASE_PUBLISHABLE_KEY: "not-a-provider-key",
      });
      const rpc = vi.fn(async (name: string) =>
        name === "edge_chat_prepare"
          ? {
              messageId: id,
              context: {
                ...context,
                model: {
                  ...context.model,
                  provider: "opencode",
                  providerModelId: "deepseek-v4.1-flash",
                },
                acceptedResponseModelIds: [
                  "deepseek-v4.1-flash",
                  "deepseek-flash",
                ],
              },
              replayed: false,
            }
          : name === "edge_chat_replay"
            ? null
            : name === "edge_chat_finish"
              ? { status: "completed", costMicrousd: 9 }
              : true,
      );
      const handler = createCloudHandler({}, async () => ({
        env,
        platform: {
          rpc,
          authenticate: async () => ({ userId: id, sessionId: id }),
        },
      }));
      const response = await handler(
        new Request(DEMO_ORIGIN + "/api/chat-stream", {
          method: "POST",
          headers: {
            Origin: DEMO_ORIGIN,
            Authorization: "Bearer synthetic-user-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspaceId: id,
            conversationId: id,
            clientRequestId: id,
            content: "Frage",
            attachmentIds: [],
          }),
        }),
      );
      expect(await response.text()).toContain("event: message.completed");
      expect(x.fetcher).toHaveBeenCalledOnce();
      const [url, options] = x.fetcher.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toBe("https://opencode.ai/zen/go/v1/chat/completions");
      expect(new Request(url, options).headers.get("Authorization")).toBe(
        `Bearer ${synthetic}`,
      );
      expect(new Request(url, options).headers.has("apikey")).toBe(false);
      expect(new Headers(options.headers).get("User-Agent")).toBe(
        "pflege-dashboard/1.5",
      );
      expect(new Headers(options.headers).get("x-opencode-session")).toBe(id);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

const ocContext: Context = {
  ...context,
  model: {
    ...context.model,
    provider: "opencode",
    providerModelId: "deepseek-v4.1-flash",
  },
  acceptedResponseModelIds: ["deepseek-v4.1-flash", "deepseek-flash"],
};
async function collectOpenCode(
  events: unknown[],
  done = true,
  trailers: unknown[] = [],
) {
  const x = mock(events, done, trailers);
  const parts = [];
  for await (const part of new OpenCodeProvider(
    "synthetic-opencode-key",
    x.fetcher as typeof fetch,
  ).stream(ocContext, new AbortController().signal))
    parts.push(part);
  return { parts, fetcher: x.fetcher };
}
describe("OpenCode Go exact provider/model and gateway protocol", () => {
  it.each(["deepseek-v4.1-flash", "deepseek-flash"])(
    "preserves actual accepted V4.1 model %s and never changes endpoint",
    async (model) => {
      const result = await collectOpenCode([
        chunk({ content: "Antwort" }, null, model),
        chunk({}, "stop", model, usage),
      ]);
      expect(result.parts).toEqual([
        { text: "Antwort" },
        { usage: { inputTokens: 10, outputTokens: 5, model } },
      ]);
      const [url, options] = result.fetcher.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toBe("https://opencode.ai/zen/go/v1/chat/completions");
      expect(new Headers(options.headers).get("Authorization")).toBe(
        "Bearer synthetic-opencode-key",
      );
      expect(JSON.parse(options.body as string)).toMatchObject({
        model: "deepseek-v4.1-flash",
        thinking: { type: "disabled" },
        max_tokens: 1024,
        stream: true,
        stream_options: { include_usage: true },
      });
      expect(JSON.parse(options.body as string)).not.toHaveProperty("tools");
    },
  );
  it("supports separate final usage without inventing usage at finish", async () => {
    const result = await collectOpenCode([
      chunk({ content: "Antwort" }),
      chunk({}, "stop"),
      { model: "deepseek-flash", choices: [], usage },
    ]);
    expect(result.parts).toHaveLength(2);
    expect(result.parts[1]).toEqual({
      usage: { inputTokens: 10, outputTokens: 5, model: "deepseek-flash" },
    });
  });
  it("accepts only harmless empty gateway metadata, inherited intermediate identity and exact cost trailer", async () => {
    const result = await collectOpenCode(
      [
        {
          id: "synthetic",
          object: "chat.completion.chunk",
          model: "deepseek-v4.1-flash",
          choices: [],
        },
        { id: "", model: "", choices: [] },
        chunk({ content: "Antwort" }, null, ""),
        chunk({}, "stop", "deepseek-flash", usage),
      ],
      true,
      [{ choices: [], cost: "0" }],
    );
    expect(result.parts).toEqual([
      { text: "Antwort" },
      { usage: { inputTokens: 10, outputTokens: 5, model: "deepseek-flash" } },
    ]);
  });
  it.each(["different", "deepseek-v4-flash"])(
    "known unexpected actual model %s is retained before rejection",
    async (model) => {
      const x = mock([chunk({}, "stop", model, usage)]),
        parts = [];
      await expect(
        (async () => {
          for await (const p of new OpenCodeProvider(
            "synthetic",
            x.fetcher as typeof fetch,
          ).stream(ocContext, new AbortController().signal))
            parts.push(p);
        })(),
      ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
      expect(parts).toEqual([
        { usage: { inputTokens: 10, outputTokens: 5, model } },
      ]);
    },
  );
  it.each([
    "costOnly",
    "missingUsage",
    "missingDone",
    "missingFinish",
    "blankFirstContent",
    "blankFinalModel",
    "unsafeTrailer",
    "textAfterDone",
    "earlyUsage",
    "reasoning",
    "tools",
    "duplicateUsage",
  ])("does not turn %s into successful completion", async (kind) => {
    const ending = chunk({}, "stop", "deepseek-flash", usage);
    const events =
      kind === "costOnly"
        ? [{ choices: [], cost: "0" }]
        : kind === "missingUsage"
          ? [chunk({}, "stop")]
          : kind === "missingFinish"
            ? [{ model: "deepseek-flash", choices: [], usage }]
            : kind === "blankFirstContent"
              ? [chunk({ content: "Text" }, null, "")]
              : kind === "blankFinalModel"
                ? [chunk({ content: "Text" }), chunk({}, "stop", "", usage)]
                : kind === "earlyUsage"
                  ? [chunk({ content: "Text" }, null, undefined, usage)]
                  : kind === "reasoning"
                    ? [chunk({ reasoning_content: "no" })]
                    : kind === "tools"
                      ? [chunk({ tool_calls: [{}] })]
                      : kind === "duplicateUsage"
                        ? [ending, ending]
                        : [ending];
    const trailers =
      kind === "unsafeTrailer"
        ? [{ choices: [], cost: "0", content: "hidden" }]
        : kind === "textAfterDone"
          ? [chunk({ content: "extra" })]
          : [];
    await expect(
      collectOpenCode(events, kind !== "missingDone", trailers),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
  });
  it("terminal tools violation still carries known model/tokens to failed finalization", async () => {
    const x = mock([
      chunk({ tool_calls: [{}] }, "stop", "deepseek-flash", usage),
    ]);
    const parts = [];
    await expect(
      (async () => {
        for await (const part of new OpenCodeProvider(
          "synthetic",
          x.fetcher as typeof fetch,
        ).stream(ocContext, new AbortController().signal))
          parts.push(part);
      })(),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    expect(parts).toEqual([
      { usage: { inputTokens: 10, outputTokens: 5, model: "deepseek-flash" } },
    ]);
  });
});

describe("OpenCode actual adapter to actual handler, synthetic transport", () => {
  it.each(["deepseek-flash", "deepseek-v4.1-flash", "deepseek-v4-flash"])(
    "finalizes actual model %s without rewriting identity",
    async (model) => {
      const x = mock([chunk({}, "stop", model, usage)]);
      const rpc = vi.fn(async (name: string) =>
        name === "edge_chat_prepare"
          ? { messageId: id, context: ocContext, replayed: false }
          : name === "edge_chat_replay"
            ? null
            : {
                status: model === "deepseek-v4-flash" ? "failed" : "completed",
                costMicrousd: 9,
              },
      );
      const response = await chatHandler({
        env: () => undefined,
        platform: {
          rpc,
          authenticate: async () => ({ userId: id, sessionId: id }),
        },
        provider: new OpenCodeProvider("synthetic", x.fetcher as typeof fetch),
      })(
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
        }),
      );
      const body = await response.text();
      expect(body.includes("event: message.completed")).toBe(
        model !== "deepseek-v4-flash",
      );
      expect(
        rpc.mock.calls.find(([name]) => name === "edge_chat_finish")?.[1],
      ).toMatchObject({
        p_status: model === "deepseek-v4-flash" ? "failed" : "completed",
        p_response_model: model,
        p_input_tokens: 10,
        p_output_tokens: 5,
      });
    },
  );
  it.each(["preferred", "empty"])(
    "respects %s explicit OpenCode key without implicit direct-provider fallback",
    async (kind) => {
      const x = mock([chunk({}, "stop", "deepseek-flash", usage)]);
      vi.stubGlobal("fetch", x.fetcher);
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const rpc = vi.fn(async (name: string) =>
        name === "edge_chat_prepare"
          ? { messageId: id, context: ocContext, replayed: false }
          : name === "edge_chat_replay"
            ? null
            : { status: "completed", costMicrousd: 9 },
      );
      try {
        const response = await chatHandler({
          env: (name) =>
            name === "DEEPSEEK_API_KEY"
              ? "legacy-synthetic"
              : name === "OPENCODE_API_KEY"
                ? kind === "empty"
                  ? ""
                  : "preferred-synthetic"
                : undefined,
          platform: {
            rpc,
            authenticate: async () => ({ userId: id, sessionId: id }),
          },
        })(
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
          }),
        );
        const body = await response.text();
        if (kind === "empty") {
          expect(x.fetcher).not.toHaveBeenCalled();
          expect(body).toContain("PROVIDER_NOT_CONFIGURED");
        } else {
          expect(body).toContain("event: message.completed");
          expect(
            new Headers(
              (x.fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
                .headers,
            ).get("Authorization"),
          ).toBe("Bearer preferred-synthetic");
        }
      } finally {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
      }
    },
  );
});

describe("OpenCode Go terminal text regression from real live failure", () => {
  it.each([false, true])(
    "preserves last text with separate usage=%s",
    async (separate) => {
      const events = [
        chunk({ content: "gepr" }),
        chunk(
          { content: "üft." },
          "stop",
          "deepseek-v4.1-flash",
          separate ? null : usage,
        ),
        ...(separate
          ? [{ model: "deepseek-v4.1-flash", choices: [], usage }]
          : []),
      ];
      const result = await collectOpenCode(events, true, [
        { choices: [], cost: "0" },
      ]);
      expect(
        result.parts
          .filter((p) => "text" in p)
          .map((p) => p.text)
          .join(""),
      ).toBe("geprüft.");
      expect(result.parts.filter((p) => "usage" in p)).toEqual([
        {
          usage: {
            inputTokens: 10,
            outputTokens: 5,
            model: "deepseek-v4.1-flash",
          },
        },
      ]);
    },
  );
  it.each(["tools", "reasoning", "contentShape", "finishConflict", "bound"])(
    "retains usage and classifies %s without claiming token overflow",
    async (kind) => {
      const report = vi.fn();
      const end = chunk(
        kind === "tools"
          ? { tool_calls: [{}] }
          : kind === "reasoning"
            ? { reasoning_content: "must not emit" }
            : kind === "contentShape"
              ? { content: 17 }
              : { content: "must not emit" },
        "stop",
        "deepseek-v4.1-flash",
        kind === "bound" ? { ...usage, completion_tokens: 1025 } : usage,
      );
      const x = mock([
        ...(kind === "finishConflict"
          ? [chunk({}, "length", "deepseek-v4.1-flash")]
          : []),
        end,
      ]);
      const parts = [];
      await expect(
        (async () => {
          for await (const p of new OpenCodeProvider(
            "synthetic",
            x.fetcher as typeof fetch,
            report,
          ).stream(ocContext, new AbortController().signal))
            parts.push(p);
        })(),
      ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
      expect(parts.filter((p) => "text" in p)).toEqual([]);
      expect(parts[0]).toHaveProperty("usage");
      expect(report).toHaveBeenCalledWith(
        expect.objectContaining({
          reason:
            kind === "tools"
              ? "UNEXPECTED_TOOLS"
              : kind === "reasoning"
                ? "UNEXPECTED_REASONING"
                : kind === "contentShape"
                  ? "CONTENT_SHAPE"
                  : kind === "finishConflict"
                    ? "FINISH_REASON"
                    : "TOKEN_BOUND",
        }),
      );
    },
  );
  it("actual adapter→handler completes and persists full terminal text with real live token values", async () => {
    const measured = { prompt_tokens: 725, completion_tokens: 275 };
    const x = mock(
      [
        chunk({ content: "durch einen Menschen gep" }),
        chunk({ content: "rüft." }, "stop", "deepseek-v4.1-flash"),
        { model: "deepseek-v4.1-flash", choices: [], usage: measured },
      ],
      true,
      [{ choices: [], cost: "0" }],
    );
    const rpc = vi.fn(async (name: string) =>
      name === "edge_chat_prepare"
        ? { messageId: id, context: ocContext, replayed: false }
        : name === "edge_chat_replay"
          ? null
          : { status: "completed", costMicrousd: 548 },
    );
    const response = await chatHandler({
      env: () => undefined,
      platform: {
        rpc,
        authenticate: async () => ({ userId: id, sessionId: id }),
      },
      provider: new OpenCodeProvider("synthetic", x.fetcher as typeof fetch),
    })(
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
      }),
    );
    const body = await response.text();
    expect(body).toContain("event: message.completed");
    expect(body).not.toContain("event: error");
    expect(body).toContain("rüft.");
    expect(
      rpc.mock.calls.find(([n]) => n === "edge_chat_finish")?.[1],
    ).toMatchObject({
      p_status: "completed",
      p_content: "durch einen Menschen geprüft.",
      p_input_tokens: 725,
      p_output_tokens: 275,
      p_response_model: "deepseek-v4.1-flash",
    });
  });
});

describe("OpenCode unknown final envelope safe shape diagnosis", () => {
  it.each([
    "streaming",
    "awaiting_usage",
    "after_usage",
    "after_done",
  ] as const)(
    "reports %s phase without granting unknown shape",
    async (phase) => {
      const bad = {
        model:
          phase === "streaming" || phase === "awaiting_usage"
            ? 17
            : "deepseek-v4.1-flash",
        choices: [],
        usage: null,
      };
      const end = chunk({}, "stop", "deepseek-v4.1-flash", usage);
      const x = mock(
        phase === "streaming"
          ? [bad]
          : phase === "awaiting_usage"
            ? [chunk({}, "stop", "deepseek-v4.1-flash"), bad]
            : phase === "after_usage"
              ? [end, bad]
              : [end],
        phase === "after_done",
        phase === "after_done" ? [bad] : [],
      );
      const report = vi.fn();
      await expect(
        (async () => {
          for await (const _ of new OpenCodeProvider(
            "synthetic",
            x.fetcher as typeof fetch,
            report,
          ).stream(ocContext, new AbortController().signal)) {
          }
        })(),
      ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
      expect(report).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "EVENT_ENVELOPE",
          phase,
          shape: expect.objectContaining({
            root: "object",
            choices: "zero",
            fields: {
              model:
                phase === "streaming" || phase === "awaiting_usage"
                  ? "number"
                  : "string",
              choices: "array",
              usage: "null",
            },
          }),
        }),
      );
    },
  );
  it("does not copy unknown field names, secret/text values, usage counts or data into logs", async () => {
    const marker = "private-synthetic-value-must-never-be-logged";
    const event = {
      id: marker,
      model: "deepseek-v4.1-flash",
      choices: [
        {
          index: 0,
          delta: {
            content: marker,
            reasoning_content: marker,
            tool_calls: [{ secret: marker }],
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 123456,
        completion_tokens: 876,
        extraSecret: marker,
      },
      error: { message: marker, code: marker },
      [marker]: marker,
    };
    const x = mock([chunk({}, "stop", "deepseek-v4.1-flash", usage), event]);
    const report = vi.fn();
    await expect(
      (async () => {
        for await (const _ of new OpenCodeProvider(
          marker,
          x.fetcher as typeof fetch,
          report,
        ).stream(ocContext, new AbortController().signal)) {
        }
      })(),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    const diagnostic = report.mock.calls[0][0];
    expect(diagnostic.shape).toMatchObject({
      unknownFields: 1,
      choices: "one",
      delta: {
        content: "string",
        reasoning_content: "string",
        tool_calls: "array",
      },
      usage: { prompt_tokens: "number", completion_tokens: "number" },
    });
    const log = JSON.stringify(diagnostic);
    expect(log).not.toContain(marker);
    expect(log).not.toContain("123456");
    expect(log).not.toContain("876");
    expect(log).not.toContain("extraSecret");
  });
  it("does not log untrusted array entries or number of choices", async () => {
    const report = vi.fn();
    // Trigger envelope validation before any array-content handling.
    const y = mock([
      chunk({}, "stop", "deepseek-v4.1-flash", usage),
      {
        model: "deepseek-v4.1-flash",
        choices: ["private", {}, {}],
        usage: null,
      },
    ]);
    await expect(
      (async () => {
        for await (const _ of new OpenCodeProvider(
          "synthetic",
          y.fetcher as typeof fetch,
          report,
        ).stream(ocContext, new AbortController().signal)) {
        }
      })(),
    ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    expect(report.mock.calls[0][0].shape.choices).toBe("many");
    expect(JSON.stringify(report.mock.calls)).not.toContain("private");
  });
});
