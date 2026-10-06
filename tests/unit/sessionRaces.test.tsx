/**
 * Sitzungsgrenzen unter verzögerten oder nie auflösenden Antworten (synthetischer Test-Transport,
 * kein echtes Konto). Belegt: lokale Abmeldung greift sofort und vollständig; späte Ergebnisse alter
 * Generationen beleben keine abgemeldete Sitzung und überschreiben keine neue.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, bounded, END_TIMEOUT_MS, useAuth } from '../../src/auth/AuthProvider';
import { setDraftHandoff, takeDraftHandoff } from '../../src/chat/draftHandoff';
import { BackendProvider } from '../../src/services/BackendContext';
import { createFakeBackend, TEST_EMAIL, TEST_PASSWORD, type FakeBackend } from '../support/fakeBackend';
import { signedInApp } from '../support/renderApp';
import { SEED_CONVERSATION } from '../support/seed';

type Auth = ReturnType<typeof useAuth>;

/** AuthProvider direkt mit Sonde: der Test steuert Anmeldung und Abmeldung ohne Oberfläche. */
function mountAuth(fake: FakeBackend = createFakeBackend()) {
  const queryClient = new QueryClient();
  const ref: { current: Auth | null } = { current: null };
  function Probe() {
    ref.current = useAuth();
    return <span data-testid="status">{ref.current.state.status}</span>;
  }
  const view = render(
    <QueryClientProvider client={queryClient}>
      <BackendProvider backend={fake}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </BackendProvider>
    </QueryClientProvider>,
  );
  const auth = () => {
    if (!ref.current) throw new Error('Sonde nicht gerendert');
    return ref.current;
  };
  return { fake, queryClient, auth, view };
}

const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

afterEach(() => {
  vi.useRealTimers();
});

describe('bounded()', () => {
  it('beendet das Warten nach der Grenze und bricht die Anfrage ab', async () => {
    vi.useFakeTimers();
    let aborted = false;
    let done = false;
    void bounded((signal) => {
      signal.addEventListener('abort', () => (aborted = true));
      return new Promise(() => undefined); // löst nie auf
    }, END_TIMEOUT_MS).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(END_TIMEOUT_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
    expect(aborted).toBe(true);
  });

  it('schluckt synchrone Fehler und Ablehnungen', async () => {
    await expect(bounded(() => Promise.reject(new Error('x')), 10)).resolves.toBeUndefined();
    await expect(
      bounded(() => {
        throw new Error('sync');
      }, 10),
    ).resolves.toBeUndefined();
  });
});

describe('Lokale Abmeldung trotz hängendem Server', () => {
  it('nie auflösendes session end und Widerruf: sofort abgemeldet, Token weg, Cache und Entwurf leer', async () => {
    const { fake, queryClient, history } = await signedInApp();
    await screen.findAllByText('Widerspruch mit Beratungsstelle prüfen');
    fake.hold.add('end');
    fake.hold.add('revoke');
    setDraftHandoff(SEED_CONVERSATION, 'Entwurf, der die Sitzung nicht überdauern darf');
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);

    const menu = screen.getAllByRole('button', { name: /Konto/ })[0];
    if (!menu) throw new Error('Kontomenü fehlt');
    act(() => menu.click());
    act(() => screen.getByRole('menuitem', { name: 'Abmelden' }).click());

    // Ohne auf Server oder Widerruf zu warten:
    expect(await screen.findByText('Sie wurden abgemeldet.')).toBeTruthy();
    expect(history.location.pathname).toBe('/anmelden');
    expect(await fake.auth.getSession()).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(takeDraftHandoff(SEED_CONVERSATION)).toBeNull();
    expect(fake.calls.detach).toBe(1);
    expect(fake.heldCount('end')).toBe(1);
  });

  it('Server-Ende wird nach der Grenze abgebrochen, danach Widerruf versucht; neue Anmeldung geht sofort', async () => {
    const m = mountAuth();
    const { fake } = m;
    await flush();
    await act(() => m.auth().signIn(TEST_EMAIL, TEST_PASSWORD));
    expect(m.auth().state.status).toBe('signedIn');
    fake.hold.add('end');
    fake.hold.add('revoke');
    act(() => m.auth().signOut('manual'));
    expect(m.auth().state).toEqual({ status: 'signedOut', reason: 'manual' });

    // Neue Anmeldung während der Widerruf noch hängt:
    await act(() => m.auth().signIn(TEST_EMAIL, TEST_PASSWORD));
    expect(m.auth().state.status).toBe('signedIn');

    await waitFor(() => expect(fake.calls.endAborted).toBe(1), { timeout: END_TIMEOUT_MS + 1500 });
    await waitFor(() => expect(fake.calls.signOut).toBe(1));
    // Der hängende Widerruf der alten Sitzung berührt die neue nicht.
    expect(m.auth().state.status).toBe('signedIn');
    expect(await fake.auth.getSession()).not.toBeNull();
  }, 15_000);
});

describe('Späte Ergebnisse alter Generationen', () => {
  it('verspätetes loadWorkspace belebt eine abgemeldete Sitzung nicht wieder', async () => {
    const { fake, auth } = mountAuth();
    await flush();
    fake.hold.add('loadWorkspace');
    let signIn!: Promise<void>;
    act(() => {
      signIn = auth().signIn(TEST_EMAIL, TEST_PASSWORD);
    });
    await waitFor(() => expect(fake.heldCount('loadWorkspace')).toBe(1));
    act(() => auth().signOut('manual'));
    await act(async () => {
      fake.settleHeld('loadWorkspace');
      await signIn;
    });
    await flush();
    expect(auth().state.status).toBe('signedOut');
    expect(fake.calls.touch).toBe(0);
    expect(await fake.auth.getSession()).toBeNull();
  });

  it('verspätete Anmeldung wird verworfen, die Sitzung bleibt unzugänglich', async () => {
    const { fake, auth } = mountAuth();
    await flush();
    fake.hold.add('signIn');
    let result!: Promise<unknown>;
    act(() => {
      result = auth().signIn(TEST_EMAIL, TEST_PASSWORD).then(
        () => 'ok',
        (e: unknown) => e,
      );
    });
    await waitFor(() => expect(fake.heldCount('signIn')).toBe(1));
    act(() => auth().signOut('manual'));
    fake.settleHeld('signIn');
    expect(await result).toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(auth().state.status).toBe('signedOut');
    expect(await fake.auth.getSession()).toBeNull();
  });

  it('alter Touch nach Neuanmeldung: weder Sitzungsstatus noch Abmeldung der neuen Sitzung', async () => {
    const { fake, auth } = mountAuth();
    await flush();
    fake.hold.add('touch');
    await act(() => auth().signIn(TEST_EMAIL, TEST_PASSWORD));
    await waitFor(() => expect(fake.heldCount('touch')).toBe(1)); // Touch der 1. Sitzung hängt
    act(() => auth().signOut('manual'));
    await act(() => auth().signIn(TEST_EMAIL, TEST_PASSWORD));
    await waitFor(() => expect(fake.heldCount('touch')).toBe(2)); // Touch der 2. Sitzung hängt
    const endsBefore = fake.calls.end;

    // Alte Antwort: Sitzung abgelaufen → darf die neue Sitzung nicht abmelden.
    await act(async () => {
      fake.touchError = 'SESSION_EXPIRED';
      fake.settleHeld('touch');
      await Promise.resolve();
    });
    await flush();
    expect(auth().state.status).toBe('signedIn');
    expect(auth().serverSession).toEqual({ state: 'pending' });
    expect(fake.calls.end).toBe(endsBefore);

    // Antwort der aktuellen Sitzung zählt.
    await act(async () => {
      fake.touchError = null;
      fake.settleHeld('touch');
      await Promise.resolve();
    });
    await waitFor(() => expect(auth().serverSession.state).toBe('active'));
  });

  it('verspätete Touch-Erfolgsantwort der alten Sitzung setzt keinen Sitzungsstatus der neuen', async () => {
    const { fake, auth } = mountAuth();
    await flush();
    fake.hold.add('touch');
    await act(() => auth().signIn(TEST_EMAIL, TEST_PASSWORD));
    await waitFor(() => expect(fake.heldCount('touch')).toBe(1));
    act(() => auth().signOut('manual'));
    expect(auth().serverSession).toEqual({ state: 'pending' });
    await act(async () => {
      fake.settleHeld('touch'); // alte Sitzung, nach Abmeldung
      await Promise.resolve();
    });
    await flush();
    expect(auth().serverSession).toEqual({ state: 'pending' });
    await act(() => auth().signIn(TEST_EMAIL, TEST_PASSWORD));
    await waitFor(() => expect(fake.heldCount('touch')).toBe(1)); // neuer Touch hängt
    expect(auth().serverSession).toEqual({ state: 'pending' });
  });

  it('alte Generation kann die neue Sitzung nicht abmelden (z. B. verspäteter Stream-Fehler)', async () => {
    const { auth } = mountAuth();
    await flush();
    await act(() => auth().signIn(TEST_EMAIL, TEST_PASSWORD));
    const first = auth().state;
    if (first.status !== 'signedIn') throw new Error('nicht angemeldet');
    act(() => auth().signOut('manual'));
    await act(() => auth().signIn(TEST_EMAIL, TEST_PASSWORD));
    act(() => auth().signOut('expired', first.epoch));
    expect(auth().state.status).toBe('signedIn');
    expect(auth().isCurrentSession(first.epoch)).toBe(false);
  });

  it('verspätete Schreibaktion füllt den geleerten Cache nach Abmeldung nicht wieder', async () => {
    const { fake, queryClient, user } = await signedInApp({}, `/gespraeche/${SEED_CONVERSATION}`);
    await user.click(await screen.findByRole('button', { name: 'Gespräch umbenennen' }));
    fake.hold.add('rename');
    const input = screen.getByLabelText('Titel des Gesprächs');
    await user.clear(input);
    await user.type(input, 'Später Titel{Enter}');
    await waitFor(() => expect(fake.heldCount('rename')).toBe(1));
    await user.click(screen.getAllByRole('button', { name: /Konto/ })[0] as HTMLElement);
    await user.click(await screen.findByRole('menuitem', { name: 'Abmelden' }));
    await screen.findByText('Sie wurden abgemeldet.');
    await act(async () => {
      fake.settleHeld('rename');
      await Promise.resolve();
    });
    await flush();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(screen.queryByText('Änderung nicht gespeichert')).toBeNull();
  });

  it('Aushängen: späte Antworten setzen keinen Zustand und lösen keinen Touch aus', async () => {
    const errors = vi.spyOn(console, 'error');
    const { fake, auth, view } = mountAuth();
    await flush();
    fake.hold.add('loadWorkspace');
    let signIn!: Promise<void>;
    act(() => {
      signIn = auth().signIn(TEST_EMAIL, TEST_PASSWORD);
    });
    await waitFor(() => expect(fake.heldCount('loadWorkspace')).toBe(1));
    view.unmount();
    fake.settleHeld('loadWorkspace');
    await signIn;
    await new Promise((r) => setTimeout(r, 10));
    expect(fake.calls.touch).toBe(0);
    expect(errors).not.toHaveBeenCalled();
  });

  it('Aushängen bricht laufende Streams ab', async () => {
    const { fake, user } = await signedInApp(
      { modelOperational: true, chat: () => ({ kind: 'answer', chunks: ['Teil'], holdBeforeComplete: true }) },
      `/gespraeche/${SEED_CONVERSATION}`,
    );
    let aborted = false;
    const original = fake.chat.stream.bind(fake.chat);
    fake.chat.stream = (req, h) => {
      h.signal.addEventListener('abort', () => (aborted = true));
      return original(req, h);
    };
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage{Enter}');
    await screen.findByText('Teil');
    // Alles aushängen (z. B. Seitenwechsel im Test oder Hot Reload).
    document.body.innerHTML = '';
    const { cleanup } = await import('@testing-library/react');
    cleanup();
    await waitFor(() => expect(aborted).toBe(true));
  });
});
