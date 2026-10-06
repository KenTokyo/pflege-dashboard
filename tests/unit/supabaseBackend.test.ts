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
