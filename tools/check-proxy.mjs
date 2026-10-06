/**
 * Echter HTTP-Test des /api-Wegs ohne Konto und ohne Provider:
 * Browser-Client (src/services/api.ts, über Vite geladen) → echter Vite-Dev-Server mit vite.config.ts
 * → synthetischer Upstream auf einem freien Port (statt des Node-App-Servers).
 * Geprüft: Pfade, Header (Bearer ja, apikey/Cookies nein, Host umgeschrieben), Fehler-JSON,
 * SSE ungepuffert, Abbruch schließt Upstream, Upstream weg → 502 NETWORK, kein Token in Logs.
 * Startet keinen Browser. Alle Server werden am Ende geschlossen.
 */
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const TOKEN = 'synthetic-token-7f3e9a';
const WS = '10000000-0000-4000-8000-000000000001';
const CONV = '10000000-0000-4000-8000-000000000050';
const failures = [];
const logs = [];
let passed = 0;
// Notbremse: hängt etwas, endet der Prozess samt eigener Server (keine fremden Prozesse).
setTimeout(() => {
  console.error('Proxy-Prüfung: Gesamtzeit überschritten (45 s).');
  process.exit(1);
}, 45_000).unref();

function check(name, ok, detail = '') {
  if (ok) passed += 1;
  else failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = createNetServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

function frame(sequence, type, data) {
  const body = { version: 1, requestId: 'req-proxy', sequence, conversationId: CONV, type, data };
  return `event: ${type}\ndata: ${JSON.stringify(body)}\n\n`;
}
const model = { registryId: 'm', provider: 'openai', providerModelId: 'x', displayName: 'Synthetisch', region: 'unverified' };

// ---- synthetischer Upstream --------------------------------------------------------------
const seen = [];
let releaseStream = deferred();
let upstreamClosed = deferred();
let mode = 'normal';

const upstream = createHttpServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    seen.push({ method: req.method, url: req.url, headers: { ...req.headers }, body });
    if (req.url === '/api/session' && req.method === 'POST') {
      if (mode === 'expired') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'SESSION_EXPIRED', message: 'x', requestId: 'r-401', retryable: false } }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ expiresAt: '2026-10-06T20:00:00Z', idleExpiresAt: '2026-10-06T12:15:00Z' }));
      return;
    }
    if (req.url === '/api/chat-stream' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' });
      res.flushHeaders();
      res.on('close', () => upstreamClosed.resolve(!res.writableFinished));
      res.write(frame(1, 'message.started', { messageId: 'a', model, promptVersionId: 'p', replayed: false }));
      if (mode === 'hold') return; // bleibt offen, bis der Client abbricht
      void releaseStream.promise.then(() => {
        res.write(frame(2, 'message.delta', { text: 'Hallo' }));
        res.end(frame(3, 'message.completed', { messageId: 'a', replayed: false }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'NOT_DEPLOYED', message: 'x', requestId: 'r-404', retryable: false } }));
  });
});

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => (timer = setTimeout(() => reject(new Error(`Zeitüberschreitung: ${label}`)), ms))),
  ]).finally(() => clearTimeout(timer));
}

const upstreamPort = await freePort();
await new Promise((r) => upstream.listen(upstreamPort, '127.0.0.1', r));
process.env.API_PROXY_TARGET = `http://127.0.0.1:${upstreamPort}`;

const { createServer, createLogger } = await import('vite');
const base = createLogger('info', { allowClearScreen: false });
const logger = {
  ...base,
  info: (m) => logs.push(String(m)),
  warn: (m) => logs.push(String(m)),
  warnOnce: (m) => logs.push(String(m)),
  error: (m, o) => logs.push(`${String(m)} ${o?.error?.stack ?? ''}`),
  clearScreen: () => undefined,
};
const vitePort = await freePort();
const vite = await createServer({
  root,
  configFile: `${root}vite.config.ts`,
  customLogger: logger,
  server: { port: vitePort, strictPort: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
});

let exitCode = 1;
try {
  await vite.listen();
  const origin = `http://127.0.0.1:${vitePort}`;
  const api = await vite.ssrLoadModule('/src/services/api.ts');
  check('Client-Standardpfad ist gleicher Ursprung /api', api.API_BASE === '/api', String(api.API_BASE));
  const getToken = () => Promise.resolve(TOKEN);
  const session = api.createSessionTransport(getToken, fetch, `${origin}/api`);
  const chat = api.createChatTransport(getToken, fetch, `${origin}/api`);

  // 1) JSON-Weg und Header
  const touched = await session.touch(WS);
  check('touch liefert Upstream-JSON', touched.idleExpiresAt === '2026-10-06T12:15:00Z');
  const s1 = seen.at(-1);
  check('Pfad /api/session bleibt erhalten', s1.url === '/api/session', s1.url);
  check('Bearer erreicht den App-Server', s1.headers.authorization === `Bearer ${TOKEN}`);
  check('kein apikey-Header', !('apikey' in s1.headers));
  check('keine Cookies', !('cookie' in s1.headers));
  check('Host auf Ziel umgeschrieben', s1.headers.host === `127.0.0.1:${upstreamPort}`, s1.headers.host);
  check('Body unverändert', s1.body === JSON.stringify({ workspaceId: WS, action: 'touch' }), s1.body);

  // Origin des Browsers wird nicht verändert (der App-Server prüft sie).
  await fetch(`${origin}/api/session`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:5173', Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.body?.cancel());
  check('Origin bleibt erhalten', seen.at(-1).headers.origin === 'http://localhost:5173', seen.at(-1).headers.origin);

  // 2) Fehler-JSON wird durchgereicht
  mode = 'expired';
  const expired = await session.touch(WS).then(() => null, (e) => e);
  check('401 SESSION_EXPIRED kommt beim Client an', expired?.code === 'SESSION_EXPIRED' && expired.requestId === 'r-401', expired?.code);
  mode = 'normal';
  const unknown = await fetch(`${origin}/api/unbekannt`, { method: 'POST' });
  const unknownBody = await unknown.json().catch(() => null);
  check('unbekannter /api-Pfad: 404 JSON vom App-Server', unknown.status === 404 && unknownBody?.error?.code === 'NOT_DEPLOYED');

  // 3) SSE ungepuffert: Upstream sendet Bild 2 erst, nachdem der Client Bild 1 gesehen hat.
  releaseStream = deferred();
  upstreamClosed = deferred();
  const events = [];
  await withTimeout(
    chat.stream(
      { workspaceId: WS, conversationId: CONV, clientRequestId: 'c-1', content: 'Frage', attachmentIds: [] },
      {
        signal: new AbortController().signal,
        onEvent: (e) => {
          events.push(e.type);
          if (e.type === 'message.started') releaseStream.resolve();
        },
      },
    ),
    5000,
    'SSE gepuffert oder hängt',
  );
  check('SSE kommt schrittweise und vollständig an', events.join(',') === 'message.started,message.delta,message.completed', events.join(','));
  const s3 = seen.findLast((r) => r.url === '/api/chat-stream');
  check('Chat: Accept text/event-stream', s3?.headers.accept === 'text/event-stream');
  check('Chat: Bearer, kein apikey', s3?.headers.authorization === `Bearer ${TOKEN}` && !('apikey' in s3.headers));

  // 4) Abbruch durch den Client schließt die Upstream-Verbindung
  mode = 'hold';
  upstreamClosed = deferred();
  const controller = new AbortController();
  const aborted = await withTimeout(
    chat
      .stream(
        { workspaceId: WS, conversationId: CONV, clientRequestId: 'c-2', content: 'Frage', attachmentIds: [] },
        { signal: controller.signal, onEvent: (e) => e.type === 'message.started' && controller.abort() },
      )
      .then(() => null, (e) => e),
    5000,
    'Abbruch hängt',
  );
  check('Client-Abbruch wird REQUEST_ABORTED', aborted?.code === 'REQUEST_ABORTED', aborted?.code);
  const closedEarly = await withTimeout(upstreamClosed.promise, 3000, 'Upstream nach Abbruch noch offen').catch(() => false);
  check('Abbruch schließt den Upstream-Stream', closedEarly === true);
  mode = 'normal';

  // 5) Nicht-/api-Pfade gehen nicht an den App-Server
  const before = seen.length;
  await fetch(`${origin}/apix`).then((r) => r.body?.cancel());
  await fetch(`${origin}/api`).then((r) => r.body?.cancel());
  check('/apix und /api ohne Schrägstrich werden nicht weitergeleitet', seen.length === before);

  // 6) Upstream nicht erreichbar → 502 NETWORK im Vertragsformat
  upstream.closeAllConnections();
  await new Promise((r) => upstream.close(r));
  const down = await fetch(`${origin}/api/session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const downBody = await down.json().catch(() => null);
  check('Server weg: 502 JSON NETWORK', down.status === 502 && downBody?.error?.code === 'NETWORK', `${down.status}`);
  const downErr = await session.touch(WS).then(() => null, (e) => e);
  check('Server weg: Client meldet NETWORK', downErr?.code === 'NETWORK', downErr?.code);

  // 7) Kein Token und keine Header in den Logs
  const allLogs = logs.join('\n');
  check('kein Token in Vite-Logs', !allLogs.includes(TOKEN));
  check('keine Authorization-Header in Vite-Logs', !/authorization|bearer/i.test(allLogs));
  exitCode = failures.length === 0 ? 0 : 1;
} catch (error) {
  failures.push(`Abbruch: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await vite.close();
  upstream.closeAllConnections();
  if (upstream.listening) await new Promise((r) => upstream.close(r));
}

if (failures.length) {
  console.error(`Proxy-Prüfung: ${failures.length} Fehler`);
  for (const f of failures) console.error(`  ✗ ${f}`);
} else {
  console.log(`Proxy-Prüfung: ${passed} Prüfungen bestanden (Vite → synthetischer App-Server, ohne Konto).`);
}
process.exitCode = exitCode;
