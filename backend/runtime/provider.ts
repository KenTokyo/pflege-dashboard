import { AppError } from "./errors.js";
export type Context = {
  // New snapshots include trusted DB time; historical completed replays may predate it.
  serverNow?: string;
  serverDate?: string;
  serverTimeZone?: "Europe/Berlin";
  model: {
    registryId: string;
    provider: "openai" | "deepseek" | "opencode";
    providerModelId: string;
    displayName: string;
    region: string;
  };
  acceptedResponseModelIds?: string[];
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

type ShapeType = "object" | "array" | "string" | "number" | "boolean" | "null";
type EventShape = {
  root: ShapeType;
  fields: Partial<
    Record<
      | "id"
      | "object"
      | "created"
      | "model"
      | "choices"
      | "usage"
      | "cost"
      | "error"
      | "type",
      ShapeType
    >
  >;
  unknownFields: number;
  choices?: "zero" | "one" | "many";
  choice?: Partial<
    Record<
      "index" | "delta" | "finish_reason" | "message" | "logprobs",
      ShapeType
    >
  >;
  delta?: Partial<
    Record<"role" | "content" | "reasoning_content" | "tool_calls", ShapeType>
  >;
  usage?: Partial<
    Record<"prompt_tokens" | "completion_tokens" | "total_tokens", ShapeType>
  >;
};
const shapeType = (value: unknown): ShapeType =>
  value === null
    ? "null"
    : Array.isArray(value)
      ? "array"
      : (typeof value as ShapeType);
/** Fixed schema names/types only. Never copy untrusted names, strings, counts of text or token values. */
function eventShape(event: unknown): EventShape {
  const fields = [
    "id",
    "object",
    "created",
    "model",
    "choices",
    "usage",
    "cost",
    "error",
    "type",
  ] as const;
  const types = <K extends string>(
    value: unknown,
    names: readonly K[],
  ): Partial<Record<K, ShapeType>> => {
    const result: Partial<Record<K, ShapeType>> = {};
    if (value && typeof value === "object" && !Array.isArray(value))
      for (const name of names)
        if (Object.hasOwn(value, name))
          result[name] = shapeType((value as Record<string, unknown>)[name]);
    return result;
  };
  const object =
    event && typeof event === "object" && !Array.isArray(event)
      ? (event as Record<string, unknown>)
      : undefined;
  const choices = Array.isArray(object?.choices) ? object.choices : undefined;
  const choice = choices?.[0];
  return {
    root: shapeType(event),
    fields: types(event, fields),
    unknownFields: object
      ? Math.min(
          64,
          Object.keys(object).filter(
            (k) => !fields.includes(k as (typeof fields)[number]),
          ).length,
        )
      : 0,
    ...(choices
      ? {
          choices:
            choices.length === 0
              ? "zero"
              : choices.length === 1
                ? "one"
                : "many",
          choice: types(choice, [
            "index",
            "delta",
            "finish_reason",
            "message",
            "logprobs",
          ] as const),
          delta: types(choice?.delta, [
            "role",
            "content",
            "reasoning_content",
            "tool_calls",
          ] as const),
        }
      : {}),
    ...(object && Object.hasOwn(object, "usage")
      ? {
          usage: types(object.usage, [
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
          ] as const),
        }
      : {}),
  };
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
  phase?: "streaming" | "awaiting_usage" | "after_usage" | "after_done";
  shape?: EventShape;
  httpStatus?: number;
  contentType?: "sse" | "json" | "other" | "missing";
  observedModel?:
    | "deepseek-flash"
    | "deepseek-v4.1-flash"
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
    "deepseek-v4.1-flash",
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
    private provider: "deepseek" | "opencode" = "deepseek",
    private conversationId?: string,
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
    if (context.model.provider !== this.provider || !this.key)
      throw new AppError("PROVIDER_NOT_CONFIGURED", 503);
    let response: Response;
    try {
      response = await this.fetcher(
        this.provider === "opencode"
          ? "https://opencode.ai/zen/go/v1/chat/completions"
          : "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          redirect: "error",
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.key}`,
            ...(this.provider === "opencode"
              ? {
                  "User-Agent": "pflege-dashboard/1.5",
                  ...(this.conversationId
                    ? { "x-opencode-session": this.conversationId }
                    : {}),
                }
              : {}),
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
    let finishReason: string | undefined;
    let invalidTerminalReason: DeepSeekDiagnostic["reason"] | undefined;
    let terminalText = "";
    let invalidFinishReason = false;
    const accepted =
      this.provider === "opencode"
        ? (context.acceptedResponseModelIds ?? [context.model.providerModelId])
        : [context.model.providerModelId];
    for await (const data of sseData(response.body, signal)) {
      if (data === "[DONE]") {
        if (done)
          this.fail("EVENT_ENVELOPE", {
            httpStatus: response.status,
            contentType,
            phase: "after_done",
            shape: eventShape(data),
          });
        done = true;
        if (this.provider === "opencode") continue;
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
      const envelopeMetadata = () => ({
        ...metadata,
        phase: (done
          ? "after_done"
          : terminal
            ? "after_usage"
            : finishReason !== undefined
              ? "awaiting_usage"
              : "streaming") as NonNullable<DeepSeekDiagnostic["phase"]>,
        shape: eventShape(event),
      });
      if (
        this.provider === "opencode" &&
        event &&
        typeof event === "object" &&
        Array.isArray(event.choices) &&
        event.choices.length === 0
      ) {
        // Actual gateway source appends this exact subscription-cost trailer after DONE.
        if (
          done &&
          terminal &&
          Object.keys(event).every((k) => ["choices", "cost"].includes(k)) &&
          typeof event.cost === "string" &&
          /^\d{1,16}(?:\.\d{1,16})?$/.test(event.cost)
        )
          continue;
        // Content-free gateway metadata never establishes usage or successful completion.
        if (
          !done &&
          !terminal &&
          !event.usage &&
          Object.keys(event).every((k) =>
            ["id", "object", "created", "model", "choices", "usage"].includes(
              k,
            ),
          )
        ) {
          if (
            typeof event.model === "string" &&
            event.model.length > 0 &&
            event.model.length <= 300
          ) {
            if (!accepted.includes(event.model))
              this.fail("MODEL_MISMATCH", metadata);
            observed ??= event.model;
          } else if (event.model !== "" && event.model !== undefined)
            this.fail("EVENT_ENVELOPE", envelopeMetadata());
          continue;
        }
      }
      // Blank intermediate fields may inherit observed metadata; usage must name its actual model.
      const currentModel =
        this.provider === "opencode" && event?.model === "" && !event.usage
          ? observed
          : event?.model;
      if (
        terminal ||
        done ||
        !event ||
        typeof event !== "object" ||
        event.error ||
        typeof currentModel !== "string" ||
        currentModel.length < 1 ||
        currentModel.length > 300
      )
        this.fail("EVENT_ENVELOPE", envelopeMetadata());
      observed ??= currentModel;
      consistent &&=
        observed === currentModel ||
        (this.provider === "opencode" &&
          accepted.includes(observed) &&
          accepted.includes(currentModel));
      if (!Array.isArray(event.choices)) this.fail("CHOICE_SHAPE", metadata);
      const usageOnly =
        this.provider === "opencode" &&
        event.choices.length === 0 &&
        finishReason !== undefined;
      const choice = event.choices[0];
      if (!usageOnly && (event.choices.length !== 1 || choice?.index !== 0))
        this.fail("CHOICE_SHAPE", metadata);
      const delta = choice?.delta;
      const ending =
        usageOnly ||
        (choice.finish_reason !== null && choice.finish_reason !== undefined);
      if (ending) {
        if (!usageOnly) {
          invalidFinishReason ||=
            typeof choice.finish_reason !== "string" ||
            (finishReason !== undefined &&
              finishReason !== choice.finish_reason);
          finishReason =
            typeof choice.finish_reason === "string"
              ? choice.finish_reason
              : "invalid";
          if (delta?.tool_calls?.length)
            invalidTerminalReason ??= "UNEXPECTED_TOOLS";
          else if (delta?.reasoning_content)
            invalidTerminalReason ??= "UNEXPECTED_REASONING";
          else if (delta?.content !== null && delta?.content !== undefined) {
            if (
              typeof delta.content !== "string" ||
              (this.provider !== "opencode" && delta.content)
            )
              invalidTerminalReason ??= "CONTENT_SHAPE";
            else terminalText += delta.content;
          }
        }
        const usage = event.usage;
        // OpenAI-compatible gateways may put usage in a following choices:[] chunk.
        if (!usage && this.provider === "opencode" && !usageOnly) continue;
        if (
          !Number.isSafeInteger(usage?.prompt_tokens) ||
          usage.prompt_tokens < 0 ||
          !Number.isSafeInteger(usage?.completion_tokens) ||
          usage.completion_tokens < 0
        )
          this.fail("USAGE_SHAPE", metadata);
        yield {
          usage: {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            model: event.model,
          },
        };
        if (
          finishReason !== "stop" ||
          invalidFinishReason ||
          invalidTerminalReason ||
          !consistent ||
          !accepted.includes(event.model) ||
          usage.prompt_tokens > context.inputTokenBound ||
          usage.completion_tokens > context.maxOutputTokens
        )
          this.fail(
            !consistent || !accepted.includes(event.model)
              ? "MODEL_MISMATCH"
              : finishReason !== "stop" || invalidFinishReason
                ? "FINISH_REASON"
                : (invalidTerminalReason ?? "TOKEN_BOUND"),
            metadata,
          );
        // Go may carry the final text in its stop chunk; emit once only after usage/safety validation.
        if (terminalText) yield { text: terminalText };
        terminal = true;
      } else {
        if (
          finishReason !== undefined ||
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

/** Explicit OpenCode Go route. No endpoint override or cross-provider key fallback. */
export class OpenCodeProvider extends DeepSeekProvider {
  constructor(
    key: string,
    fetcher: typeof fetch = fetch,
    report: (diagnostic: DeepSeekDiagnostic) => void = () => {},
    conversationId?: string,
  ) {
    super(key, fetcher, report, "opencode", conversationId);
  }
}
