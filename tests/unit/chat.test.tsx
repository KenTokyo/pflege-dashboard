import { act, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PendingTurn } from '../../src/chat/streamStore';
import { PendingTurnView } from '../../src/routes/chat/PendingTurnView';
import { AppError } from '../../src/services/errors';
import { MODEL_OPENAI, SEED_CONVERSATION, type SeedState } from '../support/seed';
import { signedInApp } from '../support/renderApp';

const THREAD = `/gespraeche/${SEED_CONVERSATION}`;
const GEMINI = '10000000-0000-4000-8000-000000000033';

function withBothProviders(state: SeedState) {
  const current = state.models[0];
  if (!current) throw new Error('Testmodell fehlt');
  state.models = [
    { ...current, provider: 'opencode', display_name: 'DeepSeek · Testmodell (synthetisch)', provider_model_id: 'deepseek-testmodell' },
    { ...current, id: GEMINI, provider: 'gemini', display_name: 'Gemini · Testmodell (synthetisch)', provider_model_id: 'gemini-testmodell', supports_tools: false, supports_vision: false },
    ...state.models.slice(1),
  ];
}

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

describe('Modellauswahl pro Gespräch', () => {
  it('zeigt Google AI Studio im Katalog und behauptet keine geprüfte Region oder Werkzeuge', async () => {
    await signedInApp({ modelOperational: true, extend: withBothProviders }, '/einstellungen');
    const name = await screen.findByText('Gemini · Testmodell (synthetisch) · Google AI Studio');
    const row = name.closest('li');
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('Google AI Studio');
    expect(row?.textContent).toContain('Region ungeprüft');
    expect(row?.textContent).toContain('Freigegeben');
    expect(row?.textContent).not.toMatch(/Werkzeuge|Bilder|Mistral/);
  });

  it('Gemini bewusst auswählen, Entwurf behalten, Folgefrage und Verlauf mit historischem Anbieter', async () => {
    const { fake, user, history } = await signedInApp({
      modelOperational: true,
      extend: withBothProviders,
      chat: (request) => ({ kind: 'answer', chunks: [`Antwort auf: ${request.content}`] }),
    }, THREAD);
    const input = await screen.findByLabelText(/Nachricht an den Sachbearbeiter/);
    await user.type(input, 'Meine erste Frage');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Modell für die nächste Antwort' }), GEMINI);
    await waitFor(() => expect(fake.state.conversations[0]?.model_override_id).toBe(GEMINI));
    expect(fake.calls.chat).toHaveLength(0);
    expect((input as HTMLTextAreaElement).value).toBe('Meine erste Frage');
    await user.click(input);
    await user.keyboard('{Enter}');
    await screen.findByText('Antwort auf: Meine erste Frage');
    await waitFor(() => expect(screen.getByText('Antwort auf: Meine erste Frage').closest('article')?.textContent).toContain('gemini-testmodell-synthetisch'));
    expect(screen.getByText('Antwort auf: Meine erste Frage').closest('article')?.textContent).toContain('Google AI Studio');
    await user.type(input, 'Und danach?{Enter}');
    await screen.findByText('Antwort auf: Und danach?');
    expect(fake.calls.chat).toHaveLength(2);
    act(() => history.push('/aufgaben'));
    await screen.findByRole('heading', { name: 'Offene Aufgaben und Fristen', level: 1 });
    act(() => history.push(THREAD));
    await waitFor(() => expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Modell für die nächste Antwort' }).value).toBe(GEMINI));
    expect(await screen.findByText('Antwort auf: Meine erste Frage')).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Modell für die nächste Antwort' }), '');
    await waitFor(() => expect(fake.state.conversations[0]?.model_override_id).toBeNull());
    await user.type(screen.getByLabelText(/Nachricht an den Sachbearbeiter/), 'Jetzt mit Standard{Enter}');
    await screen.findByText('Antwort auf: Jetzt mit Standard');
    await waitFor(() => expect(screen.getByText('Antwort auf: Jetzt mit Standard').closest('article')?.textContent).toContain('deepseek-testmodell-synthetisch'));
    expect(screen.getByText('Antwort auf: Jetzt mit Standard').closest('article')?.textContent).toContain('über OpenCode');
    expect(screen.getByText('Antwort auf: Meine erste Frage').closest('article')?.textContent).toContain('Google AI Studio');
    expect(fake.state.settings.version.default_model_id).toBe(MODEL_OPENAI);
  });

  it('während des Speicherns nicht mit altem Modell senden; Modus und Person bleiben erhalten', async () => {
    const { fake, user } = await signedInApp({ modelOperational: true, extend: withBothProviders }, THREAD);
    const input = await screen.findByLabelText(/Nachricht an den Sachbearbeiter/);
    const original = fake.state.conversations[0];
    fake.hold.add('rename');
    await user.type(input, 'Entwurf');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Modell für die nächste Antwort' }), GEMINI);
    expect(await screen.findByText('Modell wird gespeichert …')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nachricht senden' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('combobox', { name: 'Modell für die nächste Antwort' }).hasAttribute('disabled')).toBe(true);
    act(() => fake.settleHeld('rename'));
    await waitFor(() => expect(fake.state.conversations[0]?.model_override_id).toBe(GEMINI));
    expect(fake.state.conversations[0]?.care_recipient_id).toBe(original?.care_recipient_id);
    expect(fake.state.conversations[0]?.mode_override).toBe(original?.mode_override);
    expect(fake.state.conversations[0]?.archived_at).toBeNull();
    expect(fake.calls.chat).toHaveLength(0);
  });

  it('Revisionskonflikt übernimmt aktuelle Modellwahl statt still zu überschreiben', async () => {
    const { fake, user } = await signedInApp({ modelOperational: true, extend: withBothProviders }, THREAD);
    await screen.findByLabelText(/Nachricht an den Sachbearbeiter/);
    fake.state.conversations = fake.state.conversations.map((c) => ({ ...c, revision: c.revision + 1 }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Modell für die nächste Antwort' }), GEMINI);
    expect(await screen.findByText(/inzwischen geändert/)).toBeTruthy();
    expect(fake.state.conversations[0]?.model_override_id).toBeNull();
    expect(fake.calls.chat).toHaveLength(0);
  });

  it('ein vorhandener Neuversuch startet während der Modelländerung keinen Aufruf mit dem alten Modell', async () => {
    const { fake, user } = await signedInApp({ modelOperational: true, extend: withBothProviders, chat: () => ({ kind: 'http_error', code: 'PROVIDER_UNAVAILABLE' }) }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage{Enter}');
    const retry = await screen.findByRole('button', { name: 'Neu senden' });
    fake.hold.add('rename');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Modell für die nächste Antwort' }), GEMINI);
    await screen.findByText('Modell wird gespeichert …');
    expect(retry.hasAttribute('disabled')).toBe(true);
    await user.click(retry);
    expect(fake.calls.chat).toHaveLength(1);
    act(() => fake.settleHeld('rename'));
    await waitFor(() => expect(retry.hasAttribute('disabled')).toBe(false));
  });
});

describe('Sichtbare Wartephase', () => {
  const props = {
    showUser: false, showAssistant: true,
    onFetchAgain: () => undefined, onSendNew: () => undefined, onReload: () => undefined,
    onEdit: () => undefined, onDismiss: () => undefined,
  };
  const turn: PendingTurn = {
    conversationId: SEED_CONVERSATION, clientRequestId: 'synthetisch', content: 'Frage', phase: 'sending',
    text: '', model: null, messageId: null, replayed: false, usage: null, error: null,
    activity: [],
  };

  it('Senden → Denkt nach → Schreiben → Abschluss, ohne leeren Cursor oder verbleibende Warteanzeige', () => {
    const view = render(<PendingTurnView {...props} turn={turn} />);
    expect(screen.getByRole('status').textContent).toBe('Anfrage wird gesendet …');
    view.rerender(<PendingTurnView {...props} turn={{ ...turn, phase: 'streaming', text: '   ' }} />);
    expect(screen.getByRole('status').textContent).toBe('Denkt nach …');
    expect(view.container.querySelector('.caret')).toBeNull();
    view.rerender(<PendingTurnView {...props} turn={{ ...turn, phase: 'streaming', text: 'Erster Text' }} />);
    expect(screen.getByRole('status').textContent).toBe('Antwort wird geschrieben …');
    expect(screen.getByText('Erster Text')).toBeTruthy();
    view.rerender(<PendingTurnView {...props} turn={{ ...turn, phase: 'completed', text: 'Erster Text' }} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(view.container.querySelector('.caret')).toBeNull();
  });

  it.each(['aborted', 'failed'] as const)('%s beendet Denkt-nach-Anzeige und lässt die passende Rückmeldung sichtbar', (phase) => {
    render(<PendingTurnView {...props} turn={{ ...turn, phase, error: new AppError(phase === 'failed' ? 'PROVIDER_UNAVAILABLE' : 'REQUEST_ABORTED') }} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Denkt nach …')).toBeNull();
  });

  it('echte aktive Streamphase ohne Text zeigt Denkt nach, sperrt Modellwechsel und endet beim Abbruch', async () => {
    const { user } = await signedInApp({ modelOperational: true, extend: withBothProviders, chat: () => ({ kind: 'answer', chunks: [], holdBeforeComplete: true }) }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage{Enter}');
    expect(await screen.findByText('Denkt nach …')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Modell für die nächste Antwort' }).hasAttribute('disabled')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Antwort abbrechen' }));
    expect(await screen.findByText('Antwort abgebrochen')).toBeTruthy();
    expect(screen.queryByText('Denkt nach …')).toBeNull();
  });
});

describe('Neue Anbieterfehler', () => {
  it.each([
    ['PROVIDER_AUTH_FAILED', /Zugangsschlüssel abgelehnt/],
    ['PROVIDER_CONTENT_BLOCKED', /keine Antwort freigegeben/],
  ] as const)('%s: verständlicher Hinweis, nur bewusste Bearbeitung, kein automatischer Ersatzanbieter', async (code, text) => {
    const { fake, user } = await signedInApp({ modelOperational: true, chat: () => ({ kind: 'http_error', code }) }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage{Enter}');
    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Neu senden|Antwort erneut abrufen/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Text bearbeiten' }));
    expect(screen.getByLabelText<HTMLTextAreaElement>(/Nachricht an den Sachbearbeiter/).value).toBe('Frage');
    expect(fake.calls.chat).toHaveLength(1);
  });

  it.each(['PROVIDER_RATE_LIMITED', 'PROVIDER_UNAVAILABLE'] as const)('%s: neuer Versuch nur per Klick mit neuer Anfrage-ID', async (code) => {
    let count = 0;
    const { fake, user } = await signedInApp({ modelOperational: true, chat: () => count++ === 0 ? { kind: 'http_error', code } : { kind: 'answer', chunks: ['Jetzt beantwortet.'] } }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage{Enter}');
    const retry = await screen.findByRole('button', { name: 'Neu senden' });
    expect(fake.calls.chat).toHaveLength(1);
    await user.click(retry);
    expect(await screen.findByText('Jetzt beantwortet.')).toBeTruthy();
    expect(fake.calls.chat).toHaveLength(2);
    expect(fake.calls.chat[0]?.clientRequestId).not.toBe(fake.calls.chat[1]?.clientRequestId);
  });

  it.each(['PROVIDER_AUTH_FAILED', 'PROVIDER_RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'PROVIDER_CONTENT_BLOCKED'] as const)('%s nach Teiltext bleibt als unvollständige Antwort erhalten', async (code) => {
    const { fake, user } = await signedInApp({ modelOperational: true, chat: () => ({ kind: 'stream_error', afterChunks: ['Teil der Antwort.'], code }) }, THREAD);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage{Enter}');
    expect(await screen.findByText('Antwort nicht vollständig abgeschlossen')).toBeTruthy();
    expect(await screen.findByText('Antwort nicht vollständig abgeschlossen. Der Text kann unvollständig sein.')).toBeTruthy();
    expect(screen.getByText('Teil der Antwort.')).toBeTruthy();
    expect(screen.queryByText('Keine Antwort erhalten')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(fake.calls.chat).toHaveLength(1);
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
