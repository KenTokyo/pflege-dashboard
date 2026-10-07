// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { ChatEventV1, ChatRequestV1 } from '../../types/phase1';
import { parseChatEvent, SseParser } from '../../src/chat/sse';
import { AppError } from '../../src/services/errors';
import { PHASE1_API } from '../../types/phase1';
import { API_BASE, createChatTransport, createSessionTransport } from '../../src/services/api';

const CONV = '10000000-0000-4000-8000-000000000050';
const REQ = 'req-1';
const request: ChatRequestV1 = {
  workspaceId: 'ws',
  conversationId: CONV,
  clientRequestId: 'c-1',
  content: 'Frage',
  attachmentIds: [],
};
const model = { registryId: 'm', provider: 'openai', providerModelId: 'x', displayName: 'Testmodell', region: 'unverified' };

function frame(sequence: number, type: ChatEventV1['type'], data: unknown, overrides: Record<string, unknown> = {}) {
  const body = { version: 1, requestId: REQ, sequence, conversationId: CONV, type, data, ...overrides };
  return `event: ${type}\ndata: ${JSON.stringify(body)}\n\n`;
}
const started = frame(1, 'message.started', { messageId: 'a', model, promptVersionId: 'p', replayed: false });
const delta = (n: number, text: string) => frame(n, 'message.delta', { text });
const completed = (n: number) => frame(n, 'message.completed', { messageId: 'a', replayed: false });

function sseResponse(parts: string[], { cut = false } = {}) {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const p of parts) controller.enqueue(enc.encode(p));
      if (cut) controller.error(new TypeError('network'));
      else controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

async function run(response: Response | (() => Promise<Response>), signal = new AbortController().signal) {
  const events: ChatEventV1[] = [];
  const fetchImpl = vi.fn(typeof response === 'function' ? response : () => Promise.resolve(response));
  const transport = createChatTransport(() => Promise.resolve('jwt'), fetchImpl);
  const result = transport.stream(request, { signal, onEvent: (e) => events.push(e) }).then(
    () => null,
    (e: unknown) => e,
  );
  return { error: await result, events, fetchImpl };
}

describe('SseParser', () => {
  it('setzt beliebig geschnittene Stücke und CRLF korrekt zusammen', () => {
    const p = new SseParser();
    const text = 'event: a\r\ndata: 1\r\ndata: 2\r\n\r\n: kommentar\n\ndata: x\n\n';
    const out = Array.from({ length: text.length }, (_, i) => p.feed(text.charAt(i))).flat();
    expect(out).toEqual([
      { event: 'a', data: '1\n2' },
      { event: 'message', data: 'x' },
    ]);
  });

  it('verwirft eine unvollständige letzte Nachricht', () => {
    const p = new SseParser();
    expect(p.feed('data: halb')).toEqual([]);
    p.end();
    expect(p.feed('\n\n')).toEqual([]);
  });
});

describe('parseChatEvent', () => {
  const ok = { event: 'message.delta', data: JSON.stringify({ version: 1, requestId: REQ, sequence: 2, conversationId: CONV, type: 'message.delta', data: { text: 'x' } }) };
  it('akzeptiert gültige Ereignisse', () => {
    expect(parseChatEvent(ok, CONV).type).toBe('message.delta');
  });
  it.each([
    ['falsches Gespräch', { ...ok }, 'anderes'],
    ['Eventname passt nicht', { ...ok, event: 'message.completed' }, CONV],
    ['kein JSON', { event: 'message', data: '{' }, CONV],
    ['falsche Version', { event: 'message', data: ok.data.replace('"version":1', '"version":2') }, CONV],
  ])('lehnt ab: %s', (_name, message, conv) => {
    expect(() => parseChatEvent(message, conv)).toThrow(AppError);
  });
});

describe('App-Server-Pfade', () => {
  it('entsprechen dem Backend-Vertrag v1.1 (types/phase1.ts)', () => {
    expect(`${API_BASE}/session`).toBe(PHASE1_API.session);
    expect(`${API_BASE}/chat-stream`).toBe(PHASE1_API.chatStream);
  });
});

describe('Chat-Transport', () => {
  it('ruft den eigenen Server gleichen Ursprungs, Token nur im Header', async () => {
    const { fetchImpl } = await run(sseResponse([started, delta(2, 'Hallo'), completed(3)]));
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/chat-stream');
    expect(url).not.toContain('jwt');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt');
    // Kein Supabase-Projektschlüssel, keine Cookies an den App-Server.
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('apikey');
    expect(init.credentials).toBe('omit');
    expect(JSON.parse(init.body as string)).toEqual(request);
  });

  it('liefert Ereignisse in Reihenfolge und ignoriert doppelte Sequenzen', async () => {
    const { error, events } = await run(sseResponse([started, delta(2, 'Hal'), delta(2, 'Hal'), delta(3, 'lo'), completed(4)]));
    expect(error).toBeNull();
    expect(events.map((e) => e.type)).toEqual(['message.started', 'message.delta', 'message.delta', 'message.completed']);
  });

  it('Sequenzlücke ist ein Protokollfehler', async () => {
    const { error } = await run(sseResponse([started, delta(3, 'x')]));
    expect((error as AppError).code).toBe('PROTOCOL');
  });

  it('HTTP 200 ohne message.completed ist kein Erfolg', async () => {
    const { error, events } = await run(sseResponse([started, delta(2, 'nur halb')]));
    expect((error as AppError).code).toBe('PROTOCOL');
    expect(events).toHaveLength(2);
  });

  it('übersetzt ein SSE-error-Ereignis in den Vertragscode', async () => {
    const err = frame(2, 'error', { code: 'BUDGET_EXCEEDED', message: '', requestId: REQ, retryable: false });
    const { error } = await run(sseResponse([started, err]));
    expect(error).toMatchObject({ code: 'BUDGET_EXCEEDED', requestId: REQ, retryable: false });
  });

  it('Verbindungsabriss während des Streams wird NETWORK', async () => {
    const { error } = await run(sseResponse([started], { cut: true }));
    expect((error as AppError).code).toBe('NETWORK');
  });

  it('Abbruch durch den Nutzer wird REQUEST_ABORTED', async () => {
    const controller = new AbortController();
    controller.abort();
    const { error } = await run(() => Promise.reject(new DOMException('aborted', 'AbortError')), controller.signal);
    expect((error as AppError).code).toBe('REQUEST_ABORTED');
  });

  it.each(['REQUEST_IN_PROGRESS', 'IDEMPOTENCY_CONFLICT', 'REQUEST_INTERRUPTED'] as const)('409 %s bleibt erhalten', async (code) => {
    const res = new Response(JSON.stringify({ error: { code, message: 'x', requestId: 'r9', retryable: false } }), { status: 409 });
    const { error } = await run(res);
    expect(error).toMatchObject({ code, requestId: 'r9' });
  });

  it('503 PROVIDER_NOT_CONFIGURED wird verständlich gemeldet, kein Ersatztext', async () => {
    const res = new Response(JSON.stringify({ error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'x', requestId: 'r', retryable: false } }), { status: 503 });
    const { error, events } = await run(res);
    expect((error as AppError).code).toBe('PROVIDER_NOT_CONFIGURED');
    expect((error as AppError).message).toMatch(/nicht eingerichtet/);
    expect(events).toHaveLength(0);
  });

  it.each([
    ['PROVIDER_AUTH_FAILED', 502, false, /Zugangsschlüssel abgelehnt/],
    ['PROVIDER_RATE_LIMITED', 429, true, /Anfragegrenze des KI-Anbieters/],
    ['PROVIDER_UNAVAILABLE', 503, true, /gerade nicht erreichbar/],
    ['PROVIDER_CONTENT_BLOCKED', 422, false, /keine Antwort freigegeben/],
  ] as const)('%s bleibt als HTTP- und Streamfehler verständlich und ohne Anbieterdetails erhalten', async (code, status, retryable, text) => {
    const data = { code, message: 'secret-provider-debug', requestId: REQ, retryable };
    const http = await run(new Response(JSON.stringify({ error: data }), { status }));
    expect(http.error).toMatchObject({ code, requestId: REQ, retryable });
    expect((http.error as AppError).message).toMatch(text);
    expect((http.error as AppError).message).not.toContain('secret-provider-debug');
    expect(http.events).toHaveLength(0);
    const stream = await run(sseResponse([started, delta(2, 'Teilantwort'), frame(3, 'error', data)]));
    expect(stream.error).toMatchObject({ code, requestId: REQ, retryable });
    expect((stream.error as AppError).message).toMatch(text);
    expect(stream.events.map((e) => e.type)).toEqual(['message.started', 'message.delta']);
    expect(stream.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('Gemini-Stream behält Google-Modellkennung und ungeprüfte Region; der Browser ruft nur /api auf', async () => {
    const geminiModel = { ...model, provider: 'gemini', providerModelId: 'gemini-testmodell', displayName: 'Gemini · Testmodell' };
    const begin = frame(1, 'message.started', { messageId: 'a', model: geminiModel, promptVersionId: 'p', replayed: false });
    const { error, events, fetchImpl } = await run(sseResponse([begin, delta(2, 'Antwort'), completed(3)]));
    expect(error).toBeNull();
    expect(events[0]).toMatchObject({ type: 'message.started', data: { model: geminiModel } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/chat-stream');
  });

  it('unbekannter Endpunkt (404 ohne JSON) wird NOT_DEPLOYED', async () => {
    const { error } = await run(new Response('not found', { status: 404 }));
    expect((error as AppError).code).toBe('NOT_DEPLOYED');
  });

  it.each([502, 503, 504])('App-Server nicht erreichbar (%i ohne JSON) wird NETWORK', async (status) => {
    const { error } = await run(new Response('Bad Gateway', { status }));
    expect((error as AppError).code).toBe('NETWORK');
  });

  it('ohne Token kein Netzaufruf', async () => {
    const fetchImpl = vi.fn();
    const transport = createChatTransport(() => Promise.resolve(null), fetchImpl);
    await expect(transport.stream(request, { signal: new AbortController().signal, onEvent: vi.fn() })).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('Session-Transport', () => {
  it('sendet bewusste Merken-Auswahl und übernimmt bestätigte Ablaufwerte', async () => {
    const result = { workspaceId: 'ws', sessionPolicy: 'remembered', expiresAt: '2026-11-05T10:00:00Z', idleExpiresAt: '2026-11-05T10:00:00Z', inactivitySeconds: 2592000, timeboxSeconds: 2592000 };
    const fetchImpl = vi.fn(() => Promise.resolve(new Response(JSON.stringify(result), { status: 200 })));
    expect(await createSessionTransport(() => Promise.resolve('jwt'), fetchImpl).touch('ws', true)).toEqual(result);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ workspaceId: 'ws', action: 'touch', rememberSession: true });
  });
  it('fremder Workspace oder ungültiger Ablauf wird nicht als aktive Sitzung angezeigt', async () => {
    const result = { workspaceId: 'fremd', sessionPolicy: 'remembered', expiresAt: 'kein Datum', idleExpiresAt: '2026-11-05T10:00:00Z', inactivitySeconds: 2592000, timeboxSeconds: 2592000 };
    const fetchImpl = () => Promise.resolve(new Response(JSON.stringify(result), { status: 200 }));
    await expect(createSessionTransport(() => Promise.resolve('jwt'), fetchImpl).touch('ws', true)).rejects.toMatchObject({ code: 'PROTOCOL' });
  });
  it('touch prüft die Antwortform', async () => {
    const t = createSessionTransport(() => Promise.resolve('jwt'), () => Promise.resolve(new Response('{}', { status: 200 })));
    await expect(t.touch('ws')).rejects.toMatchObject({ code: 'PROTOCOL' });
  });
  it('401 SESSION_EXPIRED wird durchgereicht', async () => {
    const body = JSON.stringify({ error: { code: 'SESSION_EXPIRED', message: 'x', requestId: 'r', retryable: false } });
    const t = createSessionTransport(() => Promise.resolve('jwt'), () => Promise.resolve(new Response(body, { status: 401 })));
    await expect(t.touch('ws')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });
  it('sendet action end mit Workspace an /api/session', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));
    await createSessionTransport(() => Promise.resolve('jwt'), fetchImpl).end('ws');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/session');
    expect(JSON.parse(init.body as string)).toEqual({ workspaceId: 'ws', action: 'end' });
  });
});
