import { AppError } from "./errors.js";
export type Context = {
  // New snapshots include trusted DB time; historical completed replays may predate it.
  serverNow?: string;
  serverDate?: string;
  serverTimeZone?: "Europe/Berlin";
  model: {
    registryId: string;
    provider: "openai" | "deepseek";
    providerModelId: string;
    displayName: string;
    region: string;
  };
  promptVersionId: string;
  instructions: string;
  input: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens: number;
  inputTokenBound: number;
  maximumCostMicrousd: number;
};
export type ProviderPart =
  | { text: string }
  | {
      usage: { inputTokens: number; outputTokens: number; model: string };
    };
export interface Provider {
  stream(context: Context, signal: AbortSignal): AsyncIterable<ProviderPart>;
}
/** Bounded, CRLF-safe SSE framing for split UTF-8 chunks. Used for actual provider transport. */
export async function* sseData(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      const part = await reader.read();
      if (part.done) {
        if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
        break;
      }
      buffer += decoder.decode(part.value, { stream: true });
      if (buffer.length > 1000000) throw new AppError("PROVIDER_FAILED", 502);
      let match: RegExpExecArray | null;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const data = block
          .split(/\r?\n/)
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).replace(/^ /, ""))
          .join("\n");
        if (data) yield data;
      }
    }
    if (buffer.trim()) throw new AppError("PROVIDER_FAILED", 502);
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export class OpenAIProvider implements Provider {
  constructor(
    private key: string,
    private fetcher: typeof fetch = fetch,
  ) {}
  async *stream(
    context: Context,
    signal: AbortSignal,
  ): AsyncGenerator<ProviderPart> {
    const input = {
      model: context.model.providerModelId,
      instructions: context.instructions,
      input: context.input,
    };
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.key}`,
    };
    const count = await this.fetcher(
      "https://api.openai.com/v1/responses/input_tokens",
      {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        signal,
        redirect: "error",
      },
    );
    if (!count.ok) throw new AppError("PROVIDER_FAILED", 502);
    const counted = await count.json();
    if (
      !Number.isSafeInteger(counted.input_tokens) ||
      counted.input_tokens < 0 ||
      counted.input_tokens > context.inputTokenBound
    ) {
      throw new AppError("PRICING_UNVERIFIED", 503);
    }
    // Phase 1 never sends tools or tool_choice, even for create mode. No provider retries.
    const response = await this.fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...input,
        store: false,
        stream: true,
        max_output_tokens: context.maxOutputTokens,
      }),
      signal,
      redirect: "error",
    });
    if (
      !response.ok ||
      !response.body ||
      !response.headers.get("content-type")?.includes("text/event-stream")
    )
      throw new AppError("PROVIDER_FAILED", 502);
    let finished = false;
    for await (const data of sseData(response.body, signal)) {
      if (data === "[DONE]") continue;
      let event: any;
      try {
        event = JSON.parse(data);
      } catch {
        throw new AppError("PROVIDER_FAILED", 502);
      }
      if (
        event.type === "response.output_text.delta" ||
        event.type === "response.refusal.delta"
      ) {
        if (typeof event.delta !== "string") {
          throw new AppError("PROVIDER_FAILED", 502);
        }
        yield { text: event.delta };
      } else if (
        event.type === "response.completed" ||
        event.type === "response.incomplete"
      ) {
        const r = event.response;
        const usage = r?.usage;
        if (
          !Number.isSafeInteger(usage?.input_tokens) ||
          !Number.isSafeInteger(usage?.output_tokens) ||
          usage.input_tokens < 0 ||
          usage.output_tokens < 0 ||
          typeof r?.model !== "string" ||
          r.model.length < 1 ||
          r.model.length > 300
        ) {
          throw new AppError("PROVIDER_FAILED", 502);
        }
        yield {
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            model: r.model,
          },
        };
        // Known actual usage/model must reach conservative SQL finalization even
        // when it cannot be billed against the saved model/price/token snapshot.
        if (
          event.type === "response.incomplete" ||
          usage.input_tokens > context.inputTokenBound ||
          usage.output_tokens > context.maxOutputTokens ||
          r.model !== context.model.providerModelId
        ) {
          throw new AppError("PROVIDER_FAILED", 502);
        }
        finished = true;
        break;
      } else if (
        event.type === "error" ||
        event.type === "response.failed" ||
        event.type?.includes("function_call")
      )
        throw new AppError("PROVIDER_FAILED", 502);
    }
    if (!finished) throw new AppError("PROVIDER_FAILED", 502);
  }
}

export type DeepSeekDiagnostic = {
  reason:
    | "HTTP_REJECTED"
    | "RESPONSE_SHAPE"
    | "NETWORK"
    | "INVALID_JSON"
    | "EVENT_ENVELOPE"
    | "CHOICE_SHAPE"
    | "USAGE_SHAPE"
    | "MODEL_MISMATCH"
    | "FINISH_REASON"
    | "TOKEN_BOUND"
    | "TERMINAL_DELTA"
    | "DELTA_SHAPE"
    | "CONTENT_SHAPE"
    | "INCOMPLETE_STREAM"
    | "UNEXPECTED_REASONING"
    | "UNEXPECTED_TOOLS"
    | "EARLY_USAGE";
  httpStatus?: number;
  contentType?: "sse" | "json" | "other" | "missing";
  observedModel?:
    | "deepseek-flash"
    | "deepseek-v4-flash"
    | "deepseek-v4-flash-vision-exp"
    | "deepseek-v4-pro"
    | "deepseek-chat"
    | "deepseek-reasoner"
    | "other"
    | "missing";
  errorCode?:
    | "invalid_request_error"
    | "authentication_error"
    | "insufficient_balance"
    | "insufficient_quota"
    | "rate_limit_exceeded"
    | "model_not_found"
    | "invalid_api_key"
    | "other"
    | "missing";
};
function classifiedDeepSeekModel(
  value: unknown,
): DeepSeekDiagnostic["observedModel"] {
  const known = [
    "deepseek-flash",
    "deepseek-v4-flash",
    "deepseek-v4-flash-vision-exp",
    "deepseek-v4-pro",
    "deepseek-chat",
    "deepseek-reasoner",
  ];
  return typeof value !== "string"
    ? "missing"
    : known.includes(value)
      ? (value as DeepSeekDiagnostic["observedModel"])
      : "other";
}
function classifiedDeepSeekError(
  value: unknown,
): DeepSeekDiagnostic["errorCode"] {
  if (!value || typeof value !== "object") return "missing";
  const known = [
    "invalid_request_error",
    "authentication_error",
    "insufficient_balance",
    "insufficient_quota",
    "rate_limit_exceeded",
    "model_not_found",
    "invalid_api_key",
  ];
  const code =
    (value as Record<string, unknown>).code ??
    (value as Record<string, unknown>).type;
  return typeof code === "string" && known.includes(code)
    ? (code as DeepSeekDiagnostic["errorCode"])
    : "other";
}

/** Official DeepSeek Chat Completions SSE; no tools, retries or fallback. */
export class DeepSeekProvider implements Provider {
  constructor(
    private key: string,
    private fetcher: typeof fetch = fetch,
    private report: (diagnostic: DeepSeekDiagnostic) => void = () => {},
  ) {}
  private fail(
    reason: DeepSeekDiagnostic["reason"],
    metadata: Omit<DeepSeekDiagnostic, "reason"> = {},
  ): never {
    // All fields are locally classified constants; no response text, key, URL or prompt.
    try {
      this.report({ reason, ...metadata });
    } catch {
      /* Diagnostics must not change finalization. */
    }
    throw new AppError("PROVIDER_FAILED", 502);
  }
  async *stream(
    context: Context,
    signal: AbortSignal,
  ): AsyncGenerator<ProviderPart> {
    if (context.model.provider !== "deepseek" || !this.key)
      throw new AppError("PROVIDER_NOT_CONFIGURED", 503);
    let response: Response;
    try {
      response = await this.fetcher(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          redirect: "error",
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.key}`,
          },
          body: JSON.stringify({
            model: context.model.providerModelId,
            messages: [
              { role: "system", content: context.instructions },
              ...context.input,
            ],
            thinking: { type: "disabled" },
            max_tokens: context.maxOutputTokens,
            stream: true,
            stream_options: { include_usage: true },
          }),
        },
      );
    } catch {
      if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      this.fail("NETWORK");
    }
    const mime = response.headers.get("content-type")?.toLowerCase();
    const contentType: NonNullable<DeepSeekDiagnostic["contentType"]> =
      mime?.includes("text/event-stream")
        ? "sse"
        : mime?.includes("application/json")
          ? "json"
          : mime
            ? "other"
            : "missing";
    if (
      !response.ok ||
      !response.body ||
      !response.headers.get("content-type")?.includes("text/event-stream")
    ) {
      await response.body?.cancel();
      this.fail(!response.ok ? "HTTP_REJECTED" : "RESPONSE_SHAPE", {
        httpStatus: response.status,
        contentType,
      });
    }
    let terminal = false,
      done = false,
      observed: string | undefined,
      consistent = true;
    for await (const data of sseData(response.body, signal)) {
      if (data === "[DONE]") {
        done = true;
        break;
      }
      let event: any;
      try {
        event = JSON.parse(data);
      } catch {
        this.fail("INVALID_JSON");
      }
      const metadata = {
        httpStatus: response.status,
        contentType,
        observedModel: classifiedDeepSeekModel(event?.model),
        errorCode: classifiedDeepSeekError(event?.error),
      };
      if (
        terminal ||
        !event ||
        typeof event !== "object" ||
        event.error ||
        typeof event.model !== "string" ||
        event.model.length < 1 ||
        event.model.length > 300
      )
        this.fail("EVENT_ENVELOPE", metadata);
      observed ??= event.model;
      consistent &&= observed === event.model;
      if (
        !Array.isArray(event.choices) ||
        event.choices.length !== 1 ||
        event.choices[0]?.index !== 0
      )
        this.fail("CHOICE_SHAPE", metadata);
      const choice = event.choices[0],
        delta = choice.delta;
      const ending =
        choice.finish_reason !== null && choice.finish_reason !== undefined;
      if (ending) {
        const usage = event.usage;
        if (
          !Number.isSafeInteger(usage?.prompt_tokens) ||
          usage.prompt_tokens < 0 ||
          !Number.isSafeInteger(usage?.completion_tokens) ||
          usage.completion_tokens < 0
        )
          this.fail("USAGE_SHAPE", metadata);
        // Even failed/mismatched terminals carry known usage to conservative SQL finalization.
        yield {
          usage: {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            model: event.model,
          },
        };
        if (
          choice.finish_reason !== "stop" ||
          !consistent ||
          event.model !== context.model.providerModelId ||
          usage.prompt_tokens > context.inputTokenBound ||
          usage.completion_tokens > context.maxOutputTokens ||
          delta?.content ||
          delta?.tool_calls?.length ||
          delta?.reasoning_content
        )
          this.fail(
            !consistent || event.model !== context.model.providerModelId
              ? "MODEL_MISMATCH"
              : choice.finish_reason !== "stop"
                ? "FINISH_REASON"
                : usage.prompt_tokens > context.inputTokenBound ||
                    usage.completion_tokens > context.maxOutputTokens
                  ? "TOKEN_BOUND"
                  : "TERMINAL_DELTA",
            metadata,
          );
        terminal = true;
      } else {
        if (
          !delta ||
          typeof delta !== "object" ||
          delta.tool_calls?.length ||
          delta.reasoning_content ||
          event.usage
        )
          this.fail(
            delta?.tool_calls?.length
              ? "UNEXPECTED_TOOLS"
              : delta?.reasoning_content
                ? "UNEXPECTED_REASONING"
                : event.usage
                  ? "EARLY_USAGE"
                  : "DELTA_SHAPE",
            metadata,
          );
        if (delta.content !== null && delta.content !== undefined) {
          if (typeof delta.content !== "string")
            this.fail("CONTENT_SHAPE", metadata);
          if (delta.content) yield { text: delta.content };
        }
      }
    }
    if (!terminal || !done)
      this.fail("INCOMPLETE_STREAM", {
        httpStatus: response.status,
        contentType,
      });
  }
}
