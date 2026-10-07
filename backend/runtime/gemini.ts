import { AppError } from "./errors.js";
import {
  sseData,
  type Context,
  type Provider,
  type ProviderPart,
  type ActivityReporter,
} from "./provider.js";

type Usage = { inputTokens: number; outputTokens: number; model: string };
export type GeminiDiagnostic = {
  reason:
    | "HTTP_REJECTED"
    | "STREAM_REJECTED"
    | "NETWORK"
    | "RESPONSE_SHAPE"
    | "INVALID_JSON"
    | "MODEL_MISMATCH"
    | "USAGE_SHAPE"
    | "FINISH_REASON"
    | "CONTENT_SHAPE"
    | "TOKEN_BOUND"
    | "INCOMPLETE_STREAM";
  httpStatus?: number;
  providerStatus?: number;
};
const object = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const token = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const blocked = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
]);
function invalidKeyDetails(value: unknown): boolean {
  return object(value) && Array.isArray(value.details) && value.details.some((d: unknown) =>
    object(d) && ['API_KEY_INVALID','API_KEY_EXPIRED'].includes(d.reason));
}
function rejection(status: number, invalidKey = false): AppError {
  return status === 401 || status === 403 || invalidKey
    ? new AppError('PROVIDER_AUTH_FAILED', 503)
    : status === 429 ? new AppError('PROVIDER_RATE_LIMITED', 429, true)
    : status === 408 || status >= 500 ? new AppError('PROVIDER_UNAVAILABLE', 503, true)
    : new AppError('PROVIDER_FAILED', 502);
}
async function invalidKeyReason(response: Response, signal: AbortSignal) {
  if (response.status !== 400 || !response.body) return false;
  const reader = response.body.getReader();
  let bytes = 0,
    text = "";
  const decoder = new TextDecoder();
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (!signal.aborted) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 8192) return false;
      text += decoder.decode(part.value, { stream: true });
    }
    const value = JSON.parse(text + decoder.decode());
    return invalidKeyDetails(value?.error);
  } catch {
    return false;
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Native Gemini Developer API. Fixed host, header-only key, no retries/fallback/tools. */
export class GeminiProvider implements Provider {
  constructor(
    private key: string,
    private fetcher: typeof fetch = fetch,
    private report: (diagnostic: GeminiDiagnostic) => void = () => {},
    private activity: ActivityReporter = async () => {},
  ) {}
  private fail(
    reason: GeminiDiagnostic["reason"],
    error = new AppError("PROVIDER_FAILED", 502),
    httpStatus?: number,
    providerStatus?: number,
  ): never {
    try {
      this.report({
        reason,
        ...(httpStatus === undefined ? {} : { httpStatus }),
        ...(providerStatus === undefined ? {} : { providerStatus }),
      });
    } catch {
      /* no diagnostic may change finalization */
    }
    throw error;
  }
  private async post(
    url: string,
    body: unknown,
    signal: AbortSignal,
  ): Promise<Response> {
    if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "POST",
        redirect: "error",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.key,
        },
        body: JSON.stringify(body),
      });
    } catch {
      if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      this.fail("NETWORK", new AppError("PROVIDER_UNAVAILABLE", 503, true));
    }
    if (!response.ok) {
      const invalidKey = await invalidKeyReason(response, signal);
      await response.body?.cancel().catch(() => {});
      if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      const status = response.status;
      this.fail(
        "HTTP_REJECTED",
        rejection(status, invalidKey),
        status,
      );
    }
    return response;
  }
  async *stream(
    context: Context,
    signal: AbortSignal,
  ): AsyncGenerator<ProviderPart> {
    if (!this.key || context.model.provider !== "gemini")
      throw new AppError("PROVIDER_NOT_CONFIGURED", 503);
    const model = context.model.providerModelId;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(model))
      this.fail("MODEL_MISMATCH");
    const input = {
      contents: context.input.map(({ role, content }) => ({
        role: role === "assistant" ? "model" : "user",
        parts: [{ text: content }],
      })),
      systemInstruction: { parts: [{ text: context.instructions }] },
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: context.maxOutputTokens,
        // Verified operator choice for the current text demo, no thought summaries.
        thinkingConfig: { thinkingLevel: "low", includeThoughts: false },
      },
    };
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
    await this.activity({
      stage: "token_count",
      details: { operation: "gemini.countTokens", thinking: "low" },
    });
    const count = await this.post(
      `${endpoint}:countTokens`,
      { generateContentRequest: { model: `models/${model}`, ...input } },
      signal,
    );
    let counted: any;
    try {
      counted = await count.json();
    } catch {
      if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      this.fail("RESPONSE_SHAPE");
    }
    if (
      !token(counted?.totalTokens) ||
      counted.totalTokens > context.inputTokenBound
    )
      this.fail("TOKEN_BOUND", new AppError("PRICING_UNVERIFIED", 503));
    await this.activity({
      stage: "provider_request",
      details: {
        operation: "gemini.streamGenerateContent",
        thinking: "low",
        maxOutputTokens: context.maxOutputTokens,
      },
    });
    const response = await this.post(
      `${endpoint}:streamGenerateContent?alt=sse`,
      input,
      signal,
    );
    if (
      !response.body ||
      !response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("text/event-stream")
    ) {
      await response.body?.cancel().catch(() => {});
      this.fail("RESPONSE_SHAPE");
    }
    await this.activity({
      stage: "awaiting_text",
      details: { thinking: "low" },
    });
    let observed: string | undefined,
      usage: Usage | undefined,
      terminal = false,
      finalUsage = false,
      visibleTokens = 0,
      reasoningChunks = 0;
    const accepted = context.acceptedResponseModelIds ?? [model];
    try {
      for await (const data of sseData(response.body, signal)) {
        let event: any;
        try {
          event = JSON.parse(data);
        } catch {
          this.fail("INVALID_JSON");
        }
        if (!object(event)) this.fail("RESPONSE_SHAPE");
        if (Object.hasOwn(event, 'error')) {
          // Native Gemini can send a Google RPC error inside an HTTP-200 SSE stream.
          // Earlier cumulative usage never establishes the cost of this incomplete call.
          finalUsage = false;
          terminal = false;
          const error = event.error;
          if (!object(error) || !Number.isSafeInteger(error.code) || error.code < 400 || error.code > 599 ||
            (error.status !== undefined && typeof error.status !== 'string') ||
            (error.message !== undefined && typeof error.message !== 'string') ||
            (error.details !== undefined && !Array.isArray(error.details))) this.fail('RESPONSE_SHAPE');
          this.fail('STREAM_REJECTED', rejection(error.code, error.code === 400 && invalidKeyDetails(error)), undefined, error.code);
        }
        let inconsistentModel = false;
        if (event.modelVersion !== undefined) {
          if (
            typeof event.modelVersion !== "string" ||
            !event.modelVersion ||
            event.modelVersion.length > 300
          )
            this.fail("MODEL_MISMATCH");
          inconsistentModel =
            observed !== undefined && observed !== event.modelVersion;
          observed = event.modelVersion;
        }
        if (event.usageMetadata !== undefined) {
          finalUsage = false; // A corrupt later usage cannot be billed as the previous cumulative value.
          const u = event.usageMetadata;
          if (
            !object(u) ||
            !observed ||
            !token(u.promptTokenCount) ||
            !token(u.candidatesTokenCount ?? 0) ||
            !token(u.thoughtsTokenCount ?? 0) ||
            !token(u.totalTokenCount) ||
            (u.toolUsePromptTokenCount ?? 0) !== 0
          )
            this.fail("USAGE_SHAPE");
          const output =
            (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
          if (
            !token(output) ||
            u.totalTokenCount !== u.promptTokenCount + output
          )
            this.fail("USAGE_SHAPE");
          const next = {
            inputTokens: u.promptTokenCount,
            outputTokens: output,
            model: observed,
          };
          if (
            usage &&
            (next.inputTokens < usage.inputTokens ||
              next.outputTokens < usage.outputTokens)
          )
            this.fail("USAGE_SHAPE");
          usage = next;
          visibleTokens = u.candidatesTokenCount ?? 0;
          finalUsage ||=
            terminal ||
            (typeof event.candidates?.[0]?.finishReason === "string" &&
              event.candidates[0].finishReason !== "FINISH_REASON_UNSPECIFIED");
        }
        if (inconsistentModel || (observed && !accepted.includes(observed)))
          this.fail("MODEL_MISMATCH");
        const feedback = event.promptFeedback;
        if (
          feedback?.blockReason &&
          feedback.blockReason !== "BLOCK_REASON_UNSPECIFIED"
        )
          this.fail(
            "FINISH_REASON",
            new AppError("PROVIDER_CONTENT_BLOCKED", 422),
          );
        const candidates = event.candidates;
        if (
          candidates === undefined ||
          (Array.isArray(candidates) && candidates.length === 0)
        ) {
          if (event.usageMetadata === undefined) this.fail("RESPONSE_SHAPE");
          finalUsage ||= terminal;
          continue; // A final usage-only event can follow the terminal candidate.
        }
        if (
          !Array.isArray(candidates) ||
          candidates.length !== 1 ||
          !object(candidates[0])
        )
          this.fail("CONTENT_SHAPE");
        const candidate = candidates[0];
        if ((candidate.index ?? 0) !== 0 || terminal)
          this.fail("CONTENT_SHAPE");
        const reason = candidate.finishReason;
        if (reason !== undefined && reason !== "FINISH_REASON_UNSPECIFIED") {
          terminal = true;
          finalUsage = event.usageMetadata !== undefined;
          if (reason !== "STOP")
            this.fail(
              "FINISH_REASON",
              new AppError(
                blocked.has(reason)
                  ? "PROVIDER_CONTENT_BLOCKED"
                  : "PROVIDER_FAILED",
                blocked.has(reason) ? 422 : 502,
              ),
            );
        }
        const content = candidate.content;
        if (content !== undefined) {
          if (
            !object(content) ||
            (content.role !== undefined && content.role !== "model") ||
            !Array.isArray(content.parts)
          )
            this.fail("CONTENT_SHAPE");
          for (const part of content.parts) {
            if (
              !object(part) ||
              Object.keys(part).some(
                (k) => !["text", "thought", "thoughtSignature"].includes(k),
              ) ||
              (part.text !== undefined && typeof part.text !== "string") ||
              (part.thought !== undefined &&
                typeof part.thought !== "boolean") ||
              (part.thoughtSignature !== undefined &&
                typeof part.thoughtSignature !== "string")
            )
              this.fail("CONTENT_SHAPE");
            // Thought text and signatures are provider metadata, never user content.
            if (part.thought)
              await this.activity({
                stage: "awaiting_text",
                details: {
                  thinking: "low",
                  reasoningChunks: ++reasoningChunks,
                },
              });
            if (part.text && !part.thought) yield { text: part.text };
          }
        }
      }
      if (!terminal || !usage || !observed || !finalUsage)
        this.fail("INCOMPLETE_STREAM");
      if (
        usage.inputTokens > context.inputTokenBound ||
        visibleTokens > context.maxOutputTokens ||
        usage.outputTokens >
          (context.outputTokenBound ?? context.maxOutputTokens)
      )
        this.fail("TOKEN_BOUND");
    } catch (error) {
      if (usage)
        yield finalUsage
          ? { usage }
          : { usageUnreliable: { model: usage.model } };
      if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      if (error instanceof AppError) throw error;
      this.fail("NETWORK", new AppError("PROVIDER_UNAVAILABLE", 503, true));
    }
    yield { usage };
  }
}
