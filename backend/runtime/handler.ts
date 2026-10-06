import { AppError, errorPayload, readJson, uuid } from "./errors.js";
import { cors, type Environment, type Platform } from "./platform.js";
import {
  type Context,
  OpenAIProvider,
  OpenCodeProvider,
  type Provider,
} from "./provider.js";
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
        Object.keys(data).some(
          (k) =>
            ![
              "workspaceId",
              "conversationId",
              "clientRequestId",
              "content",
              "attachmentIds",
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
      };
      const replay = await deps.platform.rpc(
        "edge_chat_replay",
        payload,
        request.signal,
      );
      const key = deps.env("OPENAI_API_KEY");
      const openCodeKey =
        deps.env("OPENCODE_API_KEY") ?? deps.env("DEEPSEEK_API_KEY");
      if (!replay && !key && !openCodeKey && !deps.provider) {
        throw new AppError("PROVIDER_NOT_CONFIGURED", 503);
      }
      const prepared =
        replay ??
        (await deps.platform.rpc("edge_chat_prepare", payload, request.signal));
      const context = prepared.context as Context;
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
            )
          : context.model.provider === "openai"
            ? new OpenAIProvider(key ?? "")
            : undefined);
      const controller = new AbortController();
      let cancelled = false;
      let output = "";
      let usage:
        | { inputTokens: number; outputTokens: number; model: string }
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
            try {
              await send("message.started", {
                messageId: prepared.messageId,
                model: context.model,
                promptVersionId: context.promptVersionId,
                replayed: prepared.replayed,
              });
              if (prepared.replayed) {
                await send("message.delta", { text: prepared.content });
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
                for await (const part of provider.stream(
                  context,
                  controller.signal,
                )) {
                  if (controller.signal.aborted) {
                    throw abortedError();
                  }
                  if ("text" in part) {
                    output += part.text;
                    if (output.length > 100000) {
                      throw new AppError("PROVIDER_FAILED", 502);
                    }
                    if (Date.now() - lastCheckpoint >= 2000) {
                      await deps.platform.rpc(
                        "edge_chat_checkpoint",
                        {
                          ...base,
                          p_request_id: id,
                          p_content: output,
                        },
                        controller.signal,
                      );
                      lastCheckpoint = Date.now();
                    }
                    await send("message.delta", { text: part.text });
                    if (controller.signal.aborted) throw abortedError();
                  } else usage = part.usage;
                }
                if (!usage) throw new AppError("PROVIDER_FAILED", 502);
                if (controller.signal.aborted) {
                  throw abortedError();
                }
                await liveCheck();
                const result = await final("completed");
                if (result?.status !== "completed") {
                  throw new AppError("PROVIDER_FAILED", 502);
                }
                await send("usage.final", {
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                  costMicrousd: result.costMicrousd,
                });
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
              try {
                if (!prepared.replayed) {
                  await final(interrupted ? "interrupted" : "failed");
                }
              } catch {
                /* A hard DB failure leaves the lease/reservation intact for the next trusted reap. */
              }
              if (!cancelled) {
                try {
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
