// @vitest-environment node
/**
 * Echter Supabase-Adapter mit gehaltenem Fetch-Stub (kein Netz, kein Konto, synthetische Antworten).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseBackend } from '../../src/services/supabaseBackend';

const config = { supabaseUrl: 'https://beispiel.invalid', publishableKey: 'sb_publishable_test' };

function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'synthetisch-access',
    token_type: 'bearer',
    expires_in: 300,
    expires_at: now + 300,
    refresh_token: 'synthetisch-refresh',
    user: { id: '20000000-0000-4000-8000-0000000000aa', aud: 'authenticated', email: 'pruefung@beispiel.invalid', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
}

type Pending = { url: string; resolve: (r: Response) => void };

function stubFetch() {
  const pending: Pending[] = [];
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      calls.push(url);
      return new Promise<Response>((resolve) => pending.push({ url, resolve }));
    }),
  );
  const answer = (part: string, body: unknown, status = 200) => {
    const i = pending.findIndex((p) => p.url.includes(part));
    const p = pending.splice(i, 1)[0];
    if (i < 0 || !p) throw new Error(`keine offene Anfrage für ${part}`);
    p.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
  };
  return { calls, pending, answer };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Supabase-Adapter: lokale Abmeldung', () => {
  it('detach() entfernt das Token sofort, ohne auf das Netz zu warten', async () => {
    const net = stubFetch();
    const backend = createSupabaseBackend(config);
    const signIn = backend.auth.signIn('pruefung@beispiel.invalid', 'nur-synthetisch');
    await vi.waitFor(() => expect(net.pending).toHaveLength(1));
    net.answer('/auth/v1/token', fakeSession());
    await signIn;
    expect((await backend.auth.getSession())?.accessToken).toBe('synthetisch-access');

    const detached = backend.auth.detach();
    // Lokal sofort leer – kein Netzaufruf nötig.
    expect(await backend.auth.getSession()).toBeNull();
    // Die abgetrennte Sitzung liefert ihr Token nur noch für den Widerruf.
    expect(await detached.getToken()).toBe('synthetisch-access');
    // Ein hängender Widerruf blockiert nichts.
    const revoke = detached.revoke();
    await vi.waitFor(() => expect(net.calls.some((u) => u.includes('/auth/v1/logout'))).toBe(true));
    expect(await backend.auth.getSession()).toBeNull();
    net.answer('/auth/v1/logout', {});
    await revoke;
  });

  it('verspätete Anmeldung nach detach wird verworfen und beim Server widerrufen', async () => {
    const net = stubFetch();
    const backend = createSupabaseBackend(config);
    const result = backend.auth.signIn('pruefung@beispiel.invalid', 'nur-synthetisch').then(
      () => 'angemeldet',
      (e: unknown) => e,
    );
    await vi.waitFor(() => expect(net.pending).toHaveLength(1));
    backend.auth.detach(); // Abmeldung während die Anmeldung noch läuft
    net.answer('/auth/v1/token', fakeSession());
    expect(await result).toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(await backend.auth.getSession()).toBeNull();
    await vi.waitFor(() => expect(net.calls.some((u) => u.includes('/auth/v1/logout'))).toBe(true));
  });
});

/**
 * Nachbildung einer PostgREST-Tabelle: beachtet offset/limit, kürzt wie der Server auf max_rows (500) und
 * liefert bei unvollständiger Sortierung (gleiche Zeitstempel, kein `id`) wechselnde Reihenfolgen –
 * wie Postgres ohne eindeutige Sortierung.
 */
/** Spaltenwert als Sortierschlüssel (in den Testdaten nur Text, Zahl oder leer). */
const cell = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

function postgrest(tables: Record<string, Record<string, unknown>[]>, maxRows = 500, afterRequest?: (count: number) => void) {
  const requests: URL[] = [];
  let shuffle = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      requests.push(url);
      const table = url.pathname.split('/').pop() ?? '';
      const rows = [...(tables[table] ?? [])];
      const order = (url.searchParams.get('order') ?? '').split(',').filter(Boolean);
      shuffle += 1;
      const salt = shuffle;
      rows.sort((a, b) => {
        for (const part of order) {
          const [col = '', dir = 'asc'] = part.split('.');
          const x = cell(a[col]);
          const y = cell(b[col]);
          if (x !== y) return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1);
        }
        // Unentschieden: nicht deterministisch, je Anfrage anders.
        const h = (r: Record<string, unknown>) => {
          const key = cell(r.id);
          let n = 7;
          for (let i = 0; i < key.length; i++) n = (n * 31 + key.charCodeAt(i) * salt) % 1_000_003;
          return n;
        };
        return h(a) - h(b);
      });
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Math.min(Number(url.searchParams.get('limit') ?? Infinity), maxRows);
      const body = rows.slice(offset, offset + limit);
      afterRequest?.(requests.length);
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }));
    }),
  );
  return { requests };
}

const at = '2026-10-06T07:30:00Z'; // alle gleich: Sortierung muss über id eindeutig werden
const rowsOf = (n: number, extra: (i: number) => Record<string, unknown> = () => ({})): Record<string, unknown>[] =>
  Array.from({ length: n }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, created_at: at, ...extra(i) }));

describe('Supabase-Adapter: Listen werden nie still abgeschnitten', () => {
  it('langes Gespräch (1.201 Nachrichten): ganzer Verlauf in Seiten, neueste Antwort vorhanden', async () => {
    const messages = rowsOf(1201, (i) => ({ conversation_id: 'c1', role: i % 2 ? 'assistant' : 'user', content: `Nachricht ${i + 1}` }));
    const net = postgrest({ messages });
    const list = await createSupabaseBackend(config).data.listMessages('c1');
    expect(list).toHaveLength(1201);
    expect(new Set(list.map((m) => m.id)).size).toBe(1201);
    expect(list.at(-1)?.content).toBe('Nachricht 1201');
    expect(list.map((m) => m.id)).toEqual(messages.map((m) => m.id));
    expect(net.requests).toHaveLength(3);
    expect(net.requests[0]?.searchParams.get('order')).toBe('created_at.asc,id.asc');
  });

  it('genau eine volle Seite: eine leere Folgeseite beendet das Laden', async () => {
    const net = postgrest({ messages: rowsOf(500, () => ({ conversation_id: 'c1', role: 'user' })) });
    expect(await createSupabaseBackend(config).data.listMessages('c1')).toHaveLength(500);
    expect(net.requests.map((u) => u.searchParams.get('offset'))).toEqual(['0', '500']);
  });

  it('neues Gespräch während des Ladens: kein Eintrag doppelt, keiner fehlt', async () => {
    const conversations = rowsOf(600, (i) => ({ archived_at: null, created_at: `2026-10-01T00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z` }));
    // Nach der ersten Seite kommt oben (neuestes zuerst) ein Gespräch dazu und verschiebt alle Offsets.
    postgrest({ conversations }, 500, (n) => {
      if (n === 1) conversations.push({ id: 'ffffffff-0000-4000-8000-000000000001', created_at: '2026-10-06T12:00:00Z', archived_at: null });
    });
    const list = await createSupabaseBackend(config).data.listConversations('ws', false);
    const ids = list.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(600);
    expect(new Set(ids)).toEqual(new Set(conversations.slice(0, 600).map((c) => c.id)));
  });

  it('Aufgaben, Gespräche, Dokumente, Personen und Modelle vollständig (über 500)', async () => {
    postgrest({
      tasks: rowsOf(620, (i) => ({ status: 'open', due_at: null, title: `Aufgabe ${i}` })),
      conversations: rowsOf(730, () => ({ archived_at: null })),
      documents: rowsOf(540),
      care_recipients: rowsOf(510, (i) => ({ name: 'Gleicher Name', insurer_contact_id: i === 509 ? 'k1' : null })),
      contacts: [{ id: 'k1', name: 'Pflegekasse Beispiel · fiktiv' }],
      ai_models: rowsOf(505, () => ({ display_name: 'Modell' })),
    });
    const data = createSupabaseBackend(config).data;
    const [tasks, convs, docs, people, models] = await Promise.all([
      data.listOpenTasks('ws'),
      data.listConversations('ws', false),
      data.listDocuments('ws'),
      data.listCareRecipients('ws'),
      data.listModels('ws'),
    ]);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(620);
    expect(new Set(convs.map((c) => c.id)).size).toBe(730);
    expect(new Set(docs.map((d) => d.id)).size).toBe(540);
    expect(new Set(people.map((p) => p.id)).size).toBe(510);
    expect(people.find((p) => p.insurer_contact_id === 'k1')?.insurerName).toBe('Pflegekasse Beispiel · fiktiv');
    expect(new Set(models.map((m) => m.id)).size).toBe(505);
  });
});

describe('Supabase-Adapter: Sitzungswechsel und Abbruch beim seitenweisen Laden', () => {
  /** Hält jede Anfrage fest, bis der Test sie beantwortet; merkt sich URL und Abbruchsignal. */
  function heldFetch() {
    const open: { url: URL; signal: AbortSignal | null | undefined; resolve: (r: Response) => void; reject: (e: unknown) => void }[] = [];
    const seen: URL[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
        seen.push(url);
        return new Promise<Response>((resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          open.push({ url, signal, resolve, reject });
        });
      }),
    );
    const reply = (body: unknown) => {
      const p = open.shift();
      if (!p) throw new Error('keine offene Anfrage');
      p.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }));
    };
    return { open, seen, reply };
  }

  it('Abmeldung zwischen zwei Seiten: keine Folgeseite über den neuen Client, kein Teilergebnis', async () => {
    const net = heldFetch();
    const backend = createSupabaseBackend(config);
    const loading = backend.data.listMessages('c1');
    const outcome = loading.then(
      () => 'geliefert',
      (e: unknown) => (e as { code?: string }).code,
    );
    await vi.waitFor(() => expect(net.open).toHaveLength(1));
    backend.auth.detach();
    net.reply(rowsOf(500, () => ({ conversation_id: 'c1', role: 'user' })));
    expect(await outcome).toBe('AUTH_REQUIRED');
    expect(net.seen.filter((u) => u.pathname.endsWith('/messages')).map((u) => u.searchParams.get('offset'))).toEqual(['0']);
  });

  it('Anmeldung nur gewechselt, Anfrage schon unterwegs: Einzelabfrage liefert kein fremdes Ergebnis', async () => {
    const net = heldFetch();
    const backend = createSupabaseBackend(config);
    const loading = backend.data.getConversation('c1').then(
      () => 'geliefert',
      (e: unknown) => (e as { code?: string }).code,
    );
    await vi.waitFor(() => expect(net.open).toHaveLength(1));
    backend.auth.detach();
    net.reply([{ id: 'c1', title: 'Alt' }]);
    expect(await loading).toBe('AUTH_REQUIRED');
  });

  it('Abbruchsignal erreicht die PostgREST-Anfrage und beendet das Laden', async () => {
    const net = heldFetch();
    const backend = createSupabaseBackend(config);
    const controller = new AbortController();
    const loading = backend.data.listOpenTasks('ws', { signal: controller.signal }).then(
      () => 'geliefert',
      (e: unknown) => (e as { code?: string }).code,
    );
    await vi.waitFor(() => expect(net.open).toHaveLength(1));
    const request = net.open[0];
    expect(request?.signal).toBeTruthy();
    controller.abort();
    expect(request?.signal?.aborted).toBe(true);
    expect(await loading).toBe('REQUEST_ABORTED');
    expect(net.seen).toHaveLength(1);
  });
});

function browserStorage() {
  const make = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
      values,
    };
  };
  const localStorage = make();
  const sessionStorage = make();
  vi.stubGlobal('window', { localStorage, sessionStorage });
  return { localStorage, sessionStorage };
}

describe('Supabase-Adapter: Wiederaufnahme der gespeicherten Anmeldung', () => {
  it('neuer Client übernimmt gültige gemerkte Anmeldung ohne Passwortaufruf; Logout löscht sie sofort', async () => {
    const browser = browserStorage();
    const net = stubFetch();
    const original = createSupabaseBackend(config);
    const pending = original.auth.signIn('pruefung@beispiel.invalid', 'nur-synthetisch', true);
    await vi.waitFor(() => expect(net.pending).toHaveLength(1));
    net.answer('/auth/v1/token', fakeSession());
    await pending;
    browser.sessionStorage.clear();
    const reopened = createSupabaseBackend(config);
    expect(await reopened.auth.getSession()).toMatchObject({ accessToken: 'synthetisch-access', rememberSession: true });
    expect(net.calls).toHaveLength(1);
    expect([...browser.localStorage.values.values()].join(' ')).not.toContain('nur-synthetisch');
    reopened.auth.detach();
    expect(await createSupabaseBackend(config).auth.getSession()).toBeNull();
  });

  it('ungültiges Refresh-Token wird beim Wiederöffnen verworfen', async () => {
    const browser = browserStorage();
    const net = stubFetch();
    const stored = fakeSession();
    stored.expires_at = Math.floor(Date.now() / 1000) - 10;
    browser.localStorage.setItem('pflege-auth-beispiel.invalid:remember', 'true');
    browser.localStorage.setItem('pflege-auth-beispiel.invalid:session', JSON.stringify(stored));
    const reopened = createSupabaseBackend(config);
    const pending = reopened.auth.getSession();
    await vi.waitFor(() => expect(net.pending).toHaveLength(1));
    net.answer('/auth/v1/token', { code: 'refresh_token_not_found', message: 'Invalid Refresh Token' }, 400);
    expect(await pending).toBeNull();
    expect(browser.localStorage.getItem('pflege-auth-beispiel.invalid:session')).toBeNull();
  });
});
