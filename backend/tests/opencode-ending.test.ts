/** Confirmed live Go order: inline usage, usage-only, DONE, cost trailer, EOF. No network/accounts. */
import { describe, it, expect, vi } from "vitest";
import {
  OpenCodeProvider,
  type Context,
  type ProviderPart,
} from "../runtime/provider.ts";
import { chatHandler } from "../runtime/handler.ts";
const id = "81000000-0000-4000-8000-000000000001";
const model = "deepseek-v4.1-flash";
const usage = {
  prompt_tokens: 725,
  completion_tokens: 275,
  total_tokens: 1000,
};
const context: Context = {
  model: {
    registryId: id,
    provider: "opencode",
    providerModelId: model,
    displayName: "V4.1",
    region: "unverified",
  },
  acceptedResponseModelIds: [model, "deepseek-flash"],
  promptVersionId: id,
  instructions: "Fiktive Prüfung",
  input: [{ role: "user", content: "Frage" }],
  maxOutputTokens: 1024,
  inputTokenBound: 1048576,
  maximumCostMicrousd: 315802,
};
const terminal = {
  model,
  choices: [
    {
      index: 0,
      delta: { content: "Antwort vollständig." },
      finish_reason: "stop",
    },
  ],
  usage,
};
const extra = (overrides: object = {}) => ({
  id: "synthetic",
  object: "chat.completion.chunk",
  created: 1,
  model,
  choices: [],
  usage,
  ...overrides,
});
function fixture(additional: unknown, done = true, eof = true) {
  let body: ReadableStream<Uint8Array> | undefined;
  const cancel = vi.fn();
  const report = vi.fn();
  const fetcher = vi.fn(
    async () =>
      new Response(
        (body = new ReadableStream({
          start(s) {
            for (const event of [terminal, additional])
              s.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            if (done) {
              s.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              s.enqueue(
                new TextEncoder().encode('data: {"choices":[],"cost":"0"}\n\n'),
              );
            }
            if (eof) s.close();
          },
          cancel,
        })),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  );
  return {
    provider: new OpenCodeProvider(
      "synthetic",
      fetcher as typeof fetch,
      report,
    ),
    report,
    cancel,
    body: () => body,
  };
}
async function collect(
  x: ReturnType<typeof fixture>,
  signal = new AbortController().signal,
) {
  const parts: ProviderPart[] = [];
  for await (const p of x.provider.stream(context, signal)) parts.push(p);
  return parts;
}
describe("confirmed Go duplicate usage ending", () => {
  it("exact live event sequence emits one usage and one complete text", async () => {
    const x = fixture(extra());
    const parts = await collect(x);
    expect(parts).toEqual([
      { usage: { inputTokens: 725, outputTokens: 275, model } },
      { text: "Antwort vollständig." },
    ]);
    expect(x.report).not.toHaveBeenCalled();
    expect(x.body()?.locked).toBe(false);
  });
  it("total token field is optional but must be consistent when present", async () => {
    const x = fixture(
      extra({ usage: { prompt_tokens: 725, completion_tokens: 275 } }),
    );
    expect((await collect(x)).filter((p) => "usage" in p)).toHaveLength(1);
  });
  it.each([
    "input",
    "output",
    "total",
    "float",
    "missing",
    "model",
    "alias",
    "extraText",
    "textChoice",
    "afterDone",
    "noDone",
  ])(
    "%s does not silently complete or produce a duplicate charge",
    async (kind) => {
      const event =
        kind === "input"
          ? extra({ usage: { ...usage, prompt_tokens: 726 } })
          : kind === "output"
            ? extra({ usage: { ...usage, completion_tokens: 276 } })
            : kind === "total"
              ? extra({ usage: { ...usage, total_tokens: 999 } })
              : kind === "float"
                ? extra({ usage: { ...usage, prompt_tokens: 725.5 } })
                : kind === "missing"
                  ? extra({ usage: { total_tokens: 1000 } })
                  : kind === "model"
                    ? extra({ model: "different" })
                    : kind === "alias"
                      ? extra({ model: "deepseek-flash" })
                      : kind === "extraText"
                        ? extra({ content: "forbidden" })
                        : kind === "textChoice"
                          ? extra({
                              choices: [
                                {
                                  index: 0,
                                  delta: { content: "forbidden" },
                                  finish_reason: null,
                                },
                              ],
                            })
                          : extra();
      const x = fixture(event, kind !== "noDone");
      const parts: ProviderPart[] = [];
      if (kind === "afterDone") {
        const fetcher = vi.fn(
          async () =>
            new Response(
              new ReadableStream({
                start(s) {
                  for (const data of [
                    JSON.stringify(terminal),
                    "[DONE]",
                    JSON.stringify(event),
                  ])
                    s.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                  s.close();
                },
              }),
              { headers: { "Content-Type": "text/event-stream" } },
            ),
        );
        x.provider = new OpenCodeProvider(
          "synthetic",
          fetcher as typeof fetch,
          x.report,
        );
      }
      await expect(
        (async () => {
          for await (const p of x.provider.stream(
            context,
            new AbortController().signal,
          ))
            parts.push(p);
        })(),
      ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
      expect(parts.filter((p) => "text" in p)).toEqual([
        { text: "Antwort vollständig." },
      ]);
      if (
        ["input", "output", "total", "float", "missing", "alias"].includes(kind)
      ) {
        expect(parts.at(-1)).toEqual({
          usageUnreliable: {
            model: kind === "alias" ? "deepseek-flash" : model,
          },
        });
        expect(x.report).toHaveBeenCalledWith(
          expect.objectContaining({ reason: "USAGE_CONFLICT" }),
        );
      }
      if (kind === "model")
        expect(parts.at(-1)).toEqual({
          usage: { inputTokens: 725, outputTokens: 275, model: "different" },
        });
    },
  );
  it("DONE without actual EOF waits and cancels rather than completing early", async () => {
    const x = fixture(extra(), true, false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15);
    try {
      await expect(collect(x, controller.signal)).rejects.toMatchObject({
        code: "REQUEST_ABORTED",
      });
      expect(x.cancel).toHaveBeenCalledOnce();
    } finally {
      clearTimeout(timer);
    }
  });
  it.each([false, true])(
    "actual handler finalizes once, contradictory counts=%s",
    async (conflict) => {
      const x = fixture(
        extra(conflict ? { usage: { ...usage, prompt_tokens: 726 } } : {}),
      );
      const rpc = vi.fn(async (name: string) =>
        name === "edge_chat_prepare"
          ? { messageId: id, context, replayed: false }
          : name === "edge_chat_replay"
            ? null
            : {
                status: conflict ? "failed" : "completed",
                costMicrousd: conflict ? null : 548,
                reservationHeld: conflict,
              },
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
      const body = await response.text();
      expect(body.includes("event: message.completed")).toBe(!conflict);
      expect(body.includes("event: error")).toBe(conflict);
      const finals = rpc.mock.calls.filter(
        ([name]) => name === "edge_chat_finish",
      );
      expect(finals).toHaveLength(1);
      expect(finals[0][1]).toMatchObject({
        p_status: conflict ? "failed" : "completed",
        p_content: "Antwort vollständig.",
        p_input_tokens: conflict ? null : 725,
        p_output_tokens: conflict ? null : 275,
        p_response_model: model,
      });
      expect((body.match(/event: usage.final/g) ?? []).length).toBe(
        conflict ? 0 : 1,
      );
    },
  );
});
