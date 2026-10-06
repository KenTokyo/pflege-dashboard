import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SEED_CONVERSATION } from '../support/seed';
import { signedInApp } from '../support/renderApp';

const THREAD = `/gespraeche/${SEED_CONVERSATION}`;

describe('Chat', () => {
  it('Seed ohne freigegebenes Modell: ehrlicher Hinweis, Senden gesperrt, kein Aufruf', async () => {
    const { fake, user } = await signedInApp({}, THREAD);
    expect((await screen.findAllByText(/Kein Modell freigegeben/)).length).toBeGreaterThan(0);
    const box = await screen.findByLabelText(/Nachricht an den Sachbearbeiter/);
    await user.type(box, 'Hallo{Enter}');
    expect(screen.getByRole('button', { name: 'Nachricht senden' }).hasAttribute('disabled')).toBe(true);
    expect(fake.calls.chat).toHaveLength(0);
  });

  it('Frage im Dashboard → neues Gespräch über RPC → gestreamte Antwort mit Modell, Region und Quelle', async () => {
    const { fake, user, history } = await signedInApp({
      modelOperational: true,
      chat: () => ({
        kind: 'answer',
        chunks: ['Ein Widerspruch braucht ', '**Begründung** und Frist.'],
        sources: [{ title: 'BMG Pflegegrade', url: 'https://www.bundesgesundheitsministerium.de/pflegegrade' }],
      }),
    });
    await user.type(await screen.findByLabelText('Ihre Frage an den Sachbearbeiter'), 'Was muss in einen Widerspruch?');
    await user.click(screen.getByRole('button', { name: /Fragen/ }));
    await waitFor(() => expect(history.location.pathname).toMatch(/^\/gespraeche\/[0-9a-f-]{36}$/));
    // Nach Abschluss ersetzt der gespeicherte Verlauf (mit Quellen) den Live-Stand.
    const answer = await waitFor(() => {
      const el = screen.getByRole('article', { name: 'Antwort des KI-Sachbearbeiters' });
      expect(within(el).getByRole('link', { name: 'BMG Pflegegrade' })).toBeTruthy();
      return el;
    });
    expect(answer.querySelector('.md strong')?.textContent).toBe('Begründung');
    expect(answer.textContent).toContain('OpenAI · Testmodell (synthetisch)');
    expect(answer.textContent).toContain('Region ungeprüft');
    expect(fake.state.conversations[0]?.title).toBe('Was muss in einen Widerspruch?');
    expect(fake.calls.chat).toHaveLength(1);
    expect(fake.calls.chat[0]?.attachmentIds).toEqual([]);
  });

  it('Anbieter nicht eingerichtet: konkrete Meldung, keine Ersatzantwort, kein automatischer Neuversuch', async () => {
    const { fake, user } = await signedInApp({ modelOperational: true, chat: () => ({ kind: 'http_error', code: 'PROVIDER_NOT_CONFIGURED' }) }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Hallo');
    await user.keyboard('{Enter}');
    expect(await screen.findByText(/Der KI-Anbieter ist auf dem Server noch nicht eingerichtet/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Neu senden|erneut abrufen/ })).toBeNull();
    expect(fake.calls.chat).toHaveLength(1);
  });

  it('Verbindungsabriss: „Antwort erneut abrufen“ holt die gespeicherte Antwort mit derselben ID', async () => {
    const { fake, user } = await signedInApp({ modelOperational: true, chat: () => ({ kind: 'cut', afterChunks: ['Gespeicherte Antwort.'] }) }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage');
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('button', { name: /Antwort erneut abrufen/ }));
    expect((await screen.findAllByText('Gespeicherte Antwort.')).length).toBeGreaterThan(0);
    const [a, b] = fake.calls.chat;
    expect(b?.clientRequestId).toBe(a?.clientRequestId);
  });

  it('Abbrechen stoppt die Antwort; neuer Versuch nur bewusst mit neuer ID', async () => {
    const { fake, user } = await signedInApp(
      { modelOperational: true, chat: () => ({ kind: 'answer', chunks: ['Teil'], holdBeforeComplete: true }) },
      THREAD,
    );
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage');
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Antwort abbrechen' }));
    await user.click(await screen.findByRole('button', { name: /Neu senden/ }));
    await waitFor(() => expect(fake.calls.chat).toHaveLength(2));
    expect(fake.calls.chat[1]?.clientRequestId).not.toBe(fake.calls.chat[0]?.clientRequestId);
    act(() => fake.release());
  });

  it('Revisionskonflikt beim Umbenennen: verständliche Meldung, keine stille Überschreibung', async () => {
    const { fake, user } = await signedInApp({}, THREAD);
    await user.click(await screen.findByRole('button', { name: 'Gespräch umbenennen' }));
    // Jemand anderes hat das Gespräch inzwischen geändert.
    fake.state.conversations = fake.state.conversations.map((c) => ({ ...c, revision: c.revision + 1 }));
    const input = screen.getByLabelText('Titel des Gesprächs');
    await user.clear(input);
    await user.type(input, 'Neuer Titel{Enter}');
    expect(await screen.findByText(/inzwischen geändert/)).toBeTruthy();
    expect(fake.state.conversations[0]?.title).toBe('Widerspruch vorbereiten · fiktives Beispiel');
  });
});


describe('Providerfehler nach Antwortbeginn', () => {
  it('sichtbaren Teiltext ehrlich als unvollständig markieren, auch im geladenen Verlauf', async () => {
    const partial = 'Ein bereits sichtbarer Teil der Antwort. '.repeat(24).slice(0, 907);
    const { user, fake } = await signedInApp({ modelOperational: true, chat: () => ({ kind: 'stream_error', afterChunks: [partial], code: 'PROVIDER_FAILED' }) }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Was steht an?{Enter}');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Antwort nicht vollständig abgeschlossen')).toBeTruthy();
    expect(within(alert).getByText('Die Antwort wurde unterbrochen. Sie können die Anfrage erneut senden.')).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Neu senden' })).toBeTruthy();
    const persisted = await screen.findByText('Antwort nicht vollständig abgeschlossen. Der Text kann unvollständig sein.');
    expect(persisted.closest('article')?.textContent).toContain(partial.trim());
    expect(screen.queryByText('Keine Antwort erhalten')).toBeNull();
    expect(screen.queryByText('Antwort konnte nicht erzeugt werden.')).toBeNull();
    expect(screen.queryByText(/Der KI-Anbieter hat nicht geantwortet/)).toBeNull();
    expect(fake.calls.chat).toHaveLength(1);
  });

  it.each([{ afterChunks: [] }, { afterChunks: ['   '] }])('ohne sichtbaren Antworttext bleibt der ursprüngliche Fehlerhinweis ($afterChunks)', async ({ afterChunks }) => {
    const { user, fake } = await signedInApp({ modelOperational: true, chat: () => ({ kind: 'stream_error', afterChunks, code: 'PROVIDER_FAILED' }) }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Was steht an?{Enter}');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Keine Antwort erhalten')).toBeTruthy();
    expect(within(alert).getByText(/Der KI-Anbieter hat nicht geantwortet/)).toBeTruthy();
    expect(await screen.findByText('Antwort konnte nicht erzeugt werden.')).toBeTruthy();
    expect(screen.queryByText(/Antwort nicht vollständig abgeschlossen/)).toBeNull();
    expect(fake.calls.chat).toHaveLength(1);
  });
});
