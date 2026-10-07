import { AppError, errorPayload, readJson, uuid } from "./errors.js";
import { cors, type Environment, type Platform } from "./platform.js";
import {
  type Context,
  OpenAIProvider,
  OpenCodeProvider,
  type Provider,
  type ActivityReporter,
} from "./provider.js";
import type { ChatActivity, ChatActivityDetails } from "../../types/phase1.js";
import { GeminiProvider } from "./gemini.js";
import { OPENUI_CATALOG_VERSION, parseOpenUi,
  type ChatPresentation } from '../../types/openui.js';
import { reservedFormatInstructions } from './format-binding.js';
export type Dependencies = {
  env: Environment;
  platform: Platform;
  provider?: Provider;
  timeoutMs?: number;
  onStreamCompletion?: (completion: Promise<void>) => void;
};
function json(body: unknown, status: number, headers: Headers) {
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers });
}
export function sessionHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const id = crypto.randomUUID();
    let headers = new Headers({ "Cache-Control": "no-store" });
    try {
      headers = cors(request, deps.env);
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
      }
      if (request.method !== "POST") {
        throw new AppError("VALIDATION_FAILED", 400);
      }
      const actor = await deps.platform.authenticate(request);
      const data = await readJson(request);
      if (
        !uuid(data.workspaceId) ||
        typeof data.action !== "string" ||
        !["touch", "end"].includes(data.action) ||
        (Object.hasOwn(data, "rememberSession") &&
          (data.action !== "touch" ||
            typeof data.rememberSession !== "boolean")) ||
        Object.keys(data).some(
          (k) => !["workspaceId", "action", "rememberSession"].includes(k),
        )
      )
        throw new AppError("VALIDATION_FAILED", 400);
      const result = await deps.platform.rpc(
        "edge_session",
        {
          p_workspace_id: data.workspaceId,
          p_user_id: actor.userId,
          p_session_id: actor.sessionId,
          p_action: data.action,
          ...(data.action === "touch"
            ? { p_remember_session: data.rememberSession ?? false }
            : {}),
        },
        request.signal,
      );
      return json(result, 200, headers);
    } catch (error) {
      return json(
        errorPayload(error, id),
        error instanceof AppError ? error.status : 500,
        headers,
      );
    }
  };
}
export function chatHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const startedAt = Date.now();
    let id: string = crypto.randomUUID();
    let headers = new Headers({ "Cache-Control": "no-store" });
    try {
      headers = cors(request, deps.env);
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
      }
      if (request.method !== "POST") {
        throw new AppError("VALIDATION_FAILED", 400);
      }
      const actor = await deps.platform.authenticate(request);
      const data = await readJson(request);
      if (
        !uuid(data.workspaceId) ||
        !uuid(data.conversationId) ||
        !uuid(data.clientRequestId) ||
        typeof data.content !== "string" ||
        data.content.trim().length < 1 ||
        data.content.length > 8000 ||
        !Array.isArray(data.attachmentIds) ||
        data.attachmentIds.length !== 0 ||
        (data.responseFormat !== undefined && data.responseFormat !== 'text' && data.responseFormat !== 'openui') ||
        Object.keys(data).some(
          (k) =>
            ![
              "workspaceId",
              "conversationId",
              "clientRequestId",
              "content",
              "attachmentIds",
              "responseFormat",
            ].includes(k),
        )
      )
        throw new AppError("VALIDATION_FAILED", 400);
      id = data.clientRequestId;
      const base = {
        p_workspace_id: data.workspaceId,
        p_user_id: actor.userId,
        p_session_id: actor.sessionId,
      };
      await deps.platform.rpc("edge_chat_check", base, request.signal);
      await deps.platform.rpc("edge_chat_reap", base, request.signal);
      const payload = {
        ...base,
        p_conversation_id: data.conversationId,
        p_request_id: id,
        p_content: data.content,
        p_response_format: data.responseFormat === 'openui' ? 'openui' as const : 'text' as const,
      };
      const replay = await deps.platform.rpc(
        "edge_chat_replay",
        payload,
        request.signal,
      );
      const key = deps.env("OPENAI_API_KEY");
      const geminiKey = deps.env("GEMINI_API_KEY");
      const openCodeKey =
        deps.env("OPENCODE_API_KEY") ?? deps.env("DEEPSEEK_API_KEY");
      if (!replay && !key && !openCodeKey && !geminiKey && !deps.provider) {
        throw new AppError("PROVIDER_NOT_CONFIGURED", 503);
      }
      const prepared =
        replay ??
        (await deps.platform.rpc("edge_chat_prepare", { ...payload,
          p_format_instructions: reservedFormatInstructions(payload.p_response_format),
        }, request.signal));
      const context = prepared.context as Context;
      const responseFormat = context.responseFormat ?? 'text';
      if (responseFormat !== payload.p_response_format) throw new AppError('INTERNAL_ERROR');
      let reportActivity: ActivityReporter = async () => {};
      const provider =
        deps.provider ??
        (context.model.provider === "opencode"
          ? new OpenCodeProvider(
              openCodeKey ?? "",
              fetch,
              (diagnostic) => {
                console.warn(
                  JSON.stringify({
                    component: "opencode_provider",
                    requestId: id,
                    ...diagnostic,
                  }),
                );
              },
              data.conversationId,
              (activity) => reportActivity(activity),
            )
          : context.model.provider === "gemini"
            ? new GeminiProvider(
                geminiKey ?? "",
                fetch,
                (diagnostic) => {
                  console.warn(
                    JSON.stringify({
                      component: "gemini_provider",
                      requestId: id,
                      ...diagnostic,
                    }),
                  );
                },
                (activity) => reportActivity(activity),
              )
            : context.model.provider === "openai"
              ? new OpenAIProvider(key ?? "", fetch, (activity) =>
                  reportActivity(activity),
                )
              : undefined);
      const controller = new AbortController();
      let cancelled = false;
      let output = "";
      let presentation: ChatPresentation | null = responseFormat === 'openui' ? {
        format: 'openui', catalogVersion: OPENUI_CATALOG_VERSION, source: '', state: 'streaming',
      } : null;
      let textEmitted = false;
      let usage:
        | {
            inputTokens: number | null;
            outputTokens: number | null;
            model: string;
          }
        | undefined;
      let finished = false;
      let sequence = 0;
      let lastCheckpoint = 0;
      let wake: (() => void) | undefined;
      const abort = (
        reason: AppError = new AppError("REQUEST_ABORTED", 409),
      ) => {
        controller.abort(reason);
        wake?.();
      };
      const requestAbort = () => abort();
      request.signal.addEventListener("abort", requestAbort, { once: true });
      if (request.signal.aborted) requestAbort();
      const timer = setTimeout(() => abort(), deps.timeoutMs ?? 120000);
      const checks = new AbortController();
      let checkPending: Promise<unknown> | undefined;
      let checksStopped = false;
      const liveCheck = () => {
        if (checkPending) return checkPending;
        const deadline = new AbortController();
        const signal = AbortSignal.any([
          controller.signal,
          checks.signal,
          deadline.signal,
        ]);
        const timer = setTimeout(
          () => deadline.abort(new AppError("INTERNAL_ERROR", 503)),
          2500,
        );
        let stop!: () => void;
        const stopped = new Promise<never>((_resolve, reject) => {
          stop = () => reject(signal.reason);
          signal.addEventListener("abort", stop, { once: true });
          if (signal.aborted) stop();
        });
        // A deadline must stop the provider even while the pool is still acquiring
        // a connection. The RPC also gets cancellation; late settlement is handled.
        const work = signal.aborted
          ? Promise.reject(signal.reason)
          : deps.platform.rpc("edge_chat_check", base, signal);
        checkPending = Promise.race([work, stopped]).finally(() => {
          clearTimeout(timer);
          signal.removeEventListener("abort", stop);
          checkPending = undefined;
        });
        return checkPending;
      };
      // Only while an answer/replay is active. Does not touch activity or renew a session.
      // Independent of provider output and consumer demand; at most one check in flight.
      const watchdog = setInterval(() => {
        void liveCheck().catch((error) => {
          if (!checksStopped && !controller.signal.aborted) {
            abort(
              error instanceof AppError && error.code !== "REQUEST_ABORTED"
                ? error
                : new AppError("INTERNAL_ERROR", 503),
            );
          }
        });
      }, 5000);
      const abortedError = () =>
        controller.signal.reason instanceof AppError
          ? controller.signal.reason
          : new AppError("REQUEST_ABORTED", 409);
      const final = async (status: string) => {
        if (finished) return; // Only set after DB commit: failures can still attempt conservative abort finalization.
        const result = await deps.platform.rpc(
          "edge_chat_finish",
          {
            p_workspace_id: data.workspaceId,
            p_user_id: actor.userId,
            p_request_id: id,
            p_status: status,
            p_content: output,
            p_input_tokens: usage?.inputTokens ?? null,
            p_output_tokens: usage?.outputTokens ?? null,
            p_response_model: usage?.model ?? null,
            p_presentation: presentation ? { ...presentation, state: status === 'completed' ? 'valid'
              : status === 'interrupted' ? 'interrupted' : 'invalid' } : null,
          },
          AbortSignal.timeout(2500),
        );
        finished = true;
        return result;
      };
      let completion: Promise<void>;
      const stream = new ReadableStream<Uint8Array>({
        start(sink) {
          completion = (async () => {
            const send = async (type: string, eventData: unknown) => {
              while (
                !cancelled &&
                !controller.signal.aborted &&
                (sink.desiredSize ?? 0) <= 0
              ) {
                await new Promise<void>((resolve) => {
                  wake = resolve;
                });
                wake = undefined;
              }
              if (cancelled || controller.signal.aborted) throw abortedError();
              sink.enqueue(
                new TextEncoder().encode(
                  `event: ${type}\ndata: ${JSON.stringify({
                    version: 1,
                    requestId: id,
                    sequence: ++sequence,
                    conversationId: data.conversationId,
                    type,
                    data: eventData,
                  })}\n\n`,
                ),
              );
            };
            const activity = async (
              stage: ChatActivity["stage"],
              source: ChatActivity["source"],
              details: ChatActivityDetails = {},
            ) => {
              if (deps.provider) return; // Synthetic injected transports do not claim production HTTP stages.
              // Construct fixed, bounded metadata. Never forward provider objects, text or headers.
              const safe: ChatActivityDetails = {};
              const operations = [
                "edge_chat_replay",
                "edge_chat_prepare",
                "edge_chat_finish",
                "gemini.countTokens",
                "gemini.streamGenerateContent",
                "openai.input_tokens",
                "openai.responses",
                "opencode.chat_completions",
                "deepseek.chat_completions",
              ];
              if (details.operation && operations.includes(details.operation))
                safe.operation = details.operation;
              for (const key of [
                "inputMessages",
                "requestChars",
                "maxOutputTokens",
                "reasoningChunks",
                "outputChars",
              ] as const) {
                const value = details[key];
                if (
                  typeof value === "number" &&
                  Number.isSafeInteger(value) &&
                  value >= 0
                )
                  safe[key] = value;
              }
              if (
                details.thinking &&
                ["disabled", "low", "provider_default"].includes(
                  details.thinking,
                )
              )
                safe.thinking = details.thinking;
              if (typeof details.replayed === "boolean")
                safe.replayed = details.replayed;
              safe.responseFormat = responseFormat;
              if (responseFormat === 'openui') safe.catalogVersion = OPENUI_CATALOG_VERSION;
              await send("message.activity", {
                stage,
                source,
                at: new Date().toISOString(),
                elapsedMs: Math.max(0, Date.now() - startedAt),
                provider: context.model.provider,
                modelId: context.model.providerModelId,
                details: safe,
              } satisfies ChatActivity);
            };
            reportActivity = (event) =>
              activity(
                event.stage,
                event.details?.reasoningChunks
                  ? "provider_stream"
                  : "provider_http",
                event.details,
              );
            try {
              await send("message.started", {
                messageId: prepared.messageId,
                model: context.model,
                promptVersionId: context.promptVersionId,
                replayed: prepared.replayed,
                responseFormat,
                ...(responseFormat === 'openui' ? { catalogVersion: OPENUI_CATALOG_VERSION } : {}),
              });
              await activity("auth_verified", "supabase_auth");
              await activity("context_ready", "supabase_sql_rpc", {
                operation: prepared.replayed
                  ? "edge_chat_replay"
                  : "edge_chat_prepare",
                inputMessages: context.input.length,
                requestChars: payload.p_content.length,
                replayed: prepared.replayed,
              });
              if (prepared.replayed) {
                await send("message.delta", { text: prepared.content });
                if (prepared.presentation) {
                  await send('message.presentation.final', { presentation: prepared.presentation });
                }
                await send("usage.final", {
                  inputTokens: prepared.inputTokens,
                  outputTokens: prepared.outputTokens,
                  costMicrousd: prepared.costMicrousd,
                });
                await send("message.completed", {
                  messageId: prepared.messageId,
                  replayed: true,
                });
                finished = true;
              } else {
                if (controller.signal.aborted) throw abortedError();
                await liveCheck();
                if (!provider)
                  throw new AppError("PROVIDER_NOT_CONFIGURED", 503);
                let textStarted = false;
                for await (const part of provider.stream(
                  context,
                  controller.signal,
                )) {
                  if (controller.signal.aborted) {
                    throw abortedError();
                  }
                  if ("text" in part) {
                    if (!textStarted && part.text) {
                      textStarted = true;
                      await activity("streaming", "provider_stream", {
                        outputChars: part.text.length,
                      });
                    }
                    if (presentation) {
                      presentation.source += part.text;
                      if (presentation.source.length > 100000) {
                        presentation.source = presentation.source.slice(0, 100000);
                        throw new AppError('PROVIDER_FAILED', 502);
                      }
                      const preview = parseOpenUi(presentation.source, true);
                      // Preview may replace partial strings; canonical SSE is appended only once final.
                      if (preview.text) output = preview.text;
                    } else output += part.text;
                    if ((presentation?.source.length ?? output.length) > 100000 || output.length > 100000) {
                      throw new AppError("PROVIDER_FAILED", 502);
                    }
                    if (Date.now() - lastCheckpoint >= 2000) {
                      await deps.platform.rpc(
                        "edge_chat_checkpoint",
                        {
                          ...base,
                          p_request_id: id,
                          p_content: output,
                          p_presentation: presentation,
                        },
                        controller.signal,
                      );
                      lastCheckpoint = Date.now();
                    }
                    await send(presentation ? 'message.presentation.delta' : "message.delta", { text: part.text });
                    if (controller.signal.aborted) throw abortedError();
                  } else if ("usage" in part) usage = part.usage;
                  else
                    usage = {
                      inputTokens: null,
                      outputTokens: null,
                      model: part.usageUnreliable.model,
                    };
                }
                if (
                  !usage ||
                  usage.inputTokens === null ||
                  usage.outputTokens === null
                )
                  throw new AppError("PROVIDER_FAILED", 502);
                if (controller.signal.aborted) {
                  throw abortedError();
                }
                if (presentation) {
                  const parsed = parseOpenUi(presentation.source);
                  if (parsed.text) output = parsed.text;
                  if (parsed.state !== 'valid') throw new AppError('PRESENTATION_INVALID', 502);
                  presentation.state = 'valid';
                  await send('message.delta', { text: output });
                  textEmitted = true;
                }
                await liveCheck();
                await activity("persisting", "supabase_sql_rpc", {
                  operation: "edge_chat_finish",
                  outputChars: output.length,
                });
                const result = await final("completed");
                if (result?.status !== "completed") {
                  throw new AppError("PROVIDER_FAILED", 502);
                }
                await send("usage.final", {
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                  costMicrousd: result.costMicrousd,
                });
                if (presentation) await send('message.presentation.final', { presentation });
                await send("message.completed", {
                  messageId: prepared.messageId,
                  replayed: false,
                });
              }
            } catch (error) {
              const failureReason = controller.signal.aborted
                ? abortedError()
                : error;
              const interrupted =
                cancelled ||
                controller.signal.aborted ||
                request.signal.aborted ||
                (failureReason instanceof AppError &&
                  [
                    "REQUEST_ABORTED",
                    "SESSION_EXPIRED",
                    "WORKSPACE_FORBIDDEN",
                  ].includes(failureReason.code));
              controller.abort();
              if (presentation) presentation.state = interrupted ? 'interrupted' : 'invalid';
              try {
                if (!prepared.replayed) {
                  await final(interrupted ? "interrupted" : "failed");
                }
              } catch {
                /* A hard DB failure leaves the lease/reservation intact for the next trusted reap. */
              }
              if (!cancelled) {
                try {
                  if (presentation) {
                    // The controller is already aborted: enqueue only the bounded final projection/state.
                    for (const [type, eventData] of [
                      ...(!textEmitted && output ? [['message.delta', { text: output }]] : []),
                      ['message.presentation.final', { presentation }],
                    ] as [string, unknown][]) sink.enqueue(new TextEncoder().encode(
                      `event: ${type}\ndata: ${JSON.stringify({version:1,requestId:id,sequence:++sequence,
                        conversationId:data.conversationId,type,data:eventData})}\n\n`));
                  }
                  const failure = errorPayload(
                    failureReason instanceof AppError
                      ? failureReason
                      : new AppError("PROVIDER_FAILED", 502),
                    id,
                  ).error;
                  sink.enqueue(
                    new TextEncoder().encode(
                      `event: error\ndata: ${JSON.stringify({ version: 1, requestId: id, sequence: ++sequence, conversationId: data.conversationId, type: "error", data: failure })}\n\n`,
                    ),
                  );
                } catch {
                  /* closed transport */
                }
              }
            } finally {
              clearTimeout(timer);
              checksStopped = true;
              clearInterval(watchdog);
              checks.abort();
              request.signal.removeEventListener("abort", requestAbort);
              if (!cancelled) {
                try {
                  sink.close();
                } catch {
                  /* cancelled */
                }
              }
            }
          })();
          deps.onStreamCompletion?.(completion);
        },
        pull() {
          wake?.();
        },
        cancel() {
          cancelled = true;
          abort();
          return completion;
        },
      });
      headers.set("Cache-Control", "no-cache, no-transform");
      headers.set("Content-Type", "text/event-stream; charset=utf-8");
      headers.set("X-Request-Id", id);
      headers.set("X-Accel-Buffering", "no");
      return new Response(stream, { headers });
    } catch (error) {
      return json(
        errorPayload(error, id),
        error instanceof AppError ? error.status : 500,
        headers,
      );
    }
  };
}
