import { describe, it, expect, vi } from "vitest";
import { DeepSeekProvider, type Context } from "../runtime/provider.ts";
import { chatHandler } from "../runtime/handler.ts";
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
function mock(events: unknown[], done = true) {
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
