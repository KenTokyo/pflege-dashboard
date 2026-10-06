import type { ChatRequestV1, SessionResult } from '../../types/phase1';
import { SseParser, errorFromEvent, parseChatEvent } from '../chat/sse';
import { AppError, isAppErrorCode } from './errors';
import type { ChatPort, SessionPort, StreamHandlers } from './types';

export type TokenSource = () => Promise<string | null>;
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Eigener App-Server, gleicher Ursprung. Dev: Vite leitet /api an den lokalen Node-Server weiter. */
export const API_BASE = '/api';
export type ApiEndpoint = 'chat-stream' | 'session';

/**
 * Aufrufe des eigenen Node-Servers (keine Edge Functions). Token nur im Authorization-Header,
 * nie in der URL; kein Projektschlüssel, keine Cookies.
 * Fehler vor Streambeginn: JSON `{error:{code,message,requestId,retryable}}` (Vertrag v1.0).
 */
async function post(
  fetchImpl: FetchLike,
  base: string,
  getToken: TokenSource,
  name: ApiEndpoint,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const token = await getToken();
  if (!token) throw new AppError('AUTH_REQUIRED');
  let response: Response;
  try {
    response = await fetchImpl(`${base}/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: name === 'chat-stream' ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw new AppError('REQUEST_ABORTED');
    if (error instanceof AppError) throw error;
    throw new AppError('NETWORK');
  }
  if (!response.ok) throw await errorFromResponse(response);
  return response;
}

export async function errorFromResponse(response: Response): Promise<AppError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Kein JSON: Statuscode entscheidet.
  }
  const err = typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  if (typeof err === 'object' && err !== null) {
    const { code, requestId, retryable } = err as { code?: unknown; requestId?: unknown; retryable?: unknown };
    if (isAppErrorCode(code)) {
      return new AppError(code, {
        requestId: typeof requestId === 'string' ? requestId : null,
        ...(typeof retryable === 'boolean' ? { retryable } : {}),
      });
    }
  }
  if (response.status === 404) return new AppError('NOT_DEPLOYED');
  // App-Server nicht erreichbar (Proxy ohne Ziel, Neustart): Verbindungsproblem, kein Serverfehler.
  if (response.status === 502 || response.status === 503 || response.status === 504) return new AppError('NETWORK');
  if (response.status === 401) return new AppError('AUTH_REQUIRED');
  if (response.status === 403) return new AppError('WORKSPACE_FORBIDDEN');
  return new AppError('INTERNAL_ERROR');
}

export function createChatTransport(getToken: TokenSource, fetchImpl: FetchLike = fetch, base: string = API_BASE): ChatPort {
  return {
    async stream(request: ChatRequestV1, { signal, onEvent }: StreamHandlers): Promise<void> {
      const response = await post(fetchImpl, base, getToken, 'chat-stream', request, signal);
      if (!(response.headers.get('content-type') ?? '').includes('text/event-stream') || !response.body) {
        throw new AppError('PROTOCOL');
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      const parser = new SseParser();
      let lastSequence = 0;
      let requestId: string | null = null;
      try {
        for (;;) {
          let chunk: ReadableStreamReadResult<string>;
          try {
            chunk = await reader.read();
          } catch {
            throw signal.aborted ? new AppError('REQUEST_ABORTED') : new AppError('NETWORK');
          }
          if (chunk.done) break;
          for (const message of parser.feed(chunk.value)) {
            const event = parseChatEvent(message, request.conversationId);
            requestId ??= event.requestId;
            if (event.requestId !== requestId) throw new AppError('PROTOCOL');
            if (event.sequence <= lastSequence) continue; // doppelt geliefert: ignorieren
            if (event.sequence !== lastSequence + 1) throw new AppError('PROTOCOL', { requestId });
            lastSequence = event.sequence;
            if (event.type === 'error') throw errorFromEvent(event.data);
            onEvent(event);
            if (event.type === 'message.completed') return;
          }
        }
        // HTTP 200 ohne message.completed ist kein Erfolg (Vertrag v1.0).
        throw new AppError('PROTOCOL', { requestId, retryable: false });
      } finally {
        parser.end();
        reader.cancel().catch(() => undefined);
      }
    },
  };
}

export function createSessionTransport(getToken: TokenSource, fetchImpl: FetchLike = fetch, base: string = API_BASE): SessionPort {
  return {
    async touch(workspaceId) {
      const response = await post(fetchImpl, base, getToken, 'session', { workspaceId, action: 'touch' });
      const data: unknown = await response.json().catch(() => null);
      if (
        typeof data !== 'object' ||
        data === null ||
        typeof (data as SessionResult).expiresAt !== 'string' ||
        typeof (data as SessionResult).idleExpiresAt !== 'string'
      ) {
        throw new AppError('PROTOCOL');
      }
      return data as SessionResult;
    },
    async end(workspaceId, options = {}) {
      const tokenSource = options.via ? () => options.via?.getToken() ?? Promise.resolve(null) : getToken;
      await post(fetchImpl, base, tokenSource, 'session', { workspaceId, action: 'end' }, options.signal);
    },
  };
}
