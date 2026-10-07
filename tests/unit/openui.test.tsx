import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnswerBody } from '../../src/chat/AnswerBody';
import { tagwerkOpenUiLibrary } from '../../src/chat/openui/library';
import { readPresentation } from '../../src/chat/openui/presentation';
import { readResponseFormat, RESPONSE_FORMAT_KEY, storeResponseFormat, useResponseFormat } from '../../src/chat/responseFormat';
import { parseChatEvent } from '../../src/chat/sse';
import { StreamStore, type PendingTurn } from '../../src/chat/streamStore';
import { AppError } from '../../src/services/errors';
import { MessageView } from '../../src/routes/chat/MessageView';
import { PendingTurnView } from '../../src/routes/chat/PendingTurnView';
import { OPENUI_CATALOG_VERSION, OPENUI_LIBRARY, OPENUI_SOURCE_LIMIT, parseOpenUi, type ChatPresentation } from '../../types/openui';
import { createFakeBackend } from '../support/fakeBackend';
import { OPENUI_SCENARIO_PRESENTATION, OPENUI_SCENARIO_SOURCE, OPENUI_SCENARIO_TEXT, openUiScenario } from '../support/openUiScenario';
import { signedInApp } from '../support/renderApp';
import { SEED_CONVERSATION } from '../support/seed';

const THREAD = `/gespraeche/${SEED_CONVERSATION}`;
const presentation = (source: string, state: ChatPresentation['state'] = 'valid'): ChatPresentation => ({ format: 'openui', catalogVersion: OPENUI_CATALOG_VERSION, source, state });

describe('Gerätewahl und echtes OpenUI-Schema', () => {
  it('speichert ausschließlich Text/OpenUI, ungültige oder gesperrte Werte fallen auf Text zurück', () => {
    expect(readResponseFormat(null)).toBe('text');
    expect(readResponseFormat({ getItem: () => 'anderes' })).toBe('text');
    expect(readResponseFormat({ getItem: () => { throw new Error('blocked'); } })).toBe('text');
    const setItem = vi.fn();
    expect(storeResponseFormat({ setItem }, 'openui')).toBe(true);
    expect(setItem).toHaveBeenCalledExactlyOnceWith(RESPONSE_FORMAT_KEY, 'openui');
    expect(storeResponseFormat({ setItem: () => { throw new Error('blocked'); } }, 'text')).toBe(false);
  });

  it('die Wahl übersteht Aushängen/Neuladen, Fremdwerte und Storage-Ereignisse sind validiert', () => {
    function PreferenceProbe() {
      const format = useResponseFormat();
      return <button onClick={() => format.setValue('openui')}>{format.value}</button>;
    }
    const view = render(<PreferenceProbe />);
    act(() => { screen.getByRole('button').click(); });
    expect(window.localStorage.getItem(RESPONSE_FORMAT_KEY)).toBe('openui');
    view.unmount();
    const next = render(<PreferenceProbe />);
    expect(screen.getByRole('button').textContent).toBe('openui');
    act(() => {
      window.localStorage.setItem(RESPONSE_FORMAT_KEY, 'Query');
      window.dispatchEvent(new StorageEvent('storage', { key: RESPONSE_FORMAT_KEY }));
    });
    expect(screen.getByRole('button').textContent).toBe('text');
    next.unmount();
  });

  it('React und Server verwenden dieselben fünf Namen und Positionsschemas', () => {
    expect(tagwerkOpenUiLibrary.toJSONSchema()).toEqual(OPENUI_LIBRARY.toJSONSchema());
    expect(Object.keys(tagwerkOpenUiLibrary.components)).toEqual(['Answer', 'Text', 'Facts', 'Steps', 'Notice']);
    expect(parseOpenUi(OPENUI_SCENARIO_SOURCE).state).toBe('valid');
  });

  it('nur der versionsgebundene erlaubte Präsentationsumschlag erreicht den Renderer', () => {
    expect(readPresentation({ ...OPENUI_SCENARIO_PRESENTATION, arbitrary: 'discard' })).toEqual(OPENUI_SCENARIO_PRESENTATION);
    expect(readPresentation({ ...OPENUI_SCENARIO_PRESENTATION, catalogVersion: 'fremder-katalog' })).toBeNull();
    expect(readPresentation({ ...OPENUI_SCENARIO_PRESENTATION, state: 'completed' })).toBeNull();
    expect(readPresentation({ ...OPENUI_SCENARIO_PRESENTATION, source: 'x'.repeat(OPENUI_SOURCE_LIMIT + 1) })).toBeNull();
  });
});

describe('Echter Renderer, lesbare Textfassung und sichere Fehler', () => {
  it('zeigt Fakten, geordnete Schritte, Einordnung, Fettdruck und Kursiv mit dem echten SDK', async () => {
    const { container } = render(<AnswerBody text={OPENUI_SCENARIO_TEXT} presentation={OPENUI_SCENARIO_PRESENTATION} responseFormat="openui" />);
    await screen.findByRole('heading', { name: 'Nächste Schritte gemeinsam abstimmen' });
    expect(container.querySelector('.openui-facts ul')).toBeTruthy();
    expect(container.querySelector('.openui-steps ol')?.children).toHaveLength(3);
    expect(container.querySelector('.openui-notice')).toBeTruthy();
    expect(container.querySelectorAll('strong').length).toBeGreaterThan(3);
    expect(container.querySelector('em')?.textContent).toContain('erfundene');
    expect(container.textContent).not.toContain('root =');
    expect(document.querySelector('[data-openui-devtools-auto-mount]')).toBeNull();
  });

  it('Umschaltung erhält den gesamten kanonischen Inhalt; normale Antworten bleiben normales Markdown', async () => {
    const view = render(<AnswerBody text={OPENUI_SCENARIO_TEXT} presentation={OPENUI_SCENARIO_PRESENTATION} responseFormat="openui" />);
    await screen.findByRole('heading', { name: 'Was noch ungeklärt ist' });
    view.rerender(<AnswerBody text={OPENUI_SCENARIO_TEXT} presentation={OPENUI_SCENARIO_PRESENTATION} responseFormat="text" />);
    expect(view.container.querySelector('.openui-answer')).toBeNull();
    expect(view.container.textContent).toContain('Eine tatsächliche Rechtsfrist wurde nicht ermittelt.');
    expect(view.container.textContent).toContain('Es wurde nichts versendet oder geändert.');
    view.rerender(<AnswerBody text="**Normale Antwort** mit *Einordnung*." responseFormat="openui" />);
    expect(view.container.querySelector('.openui-answer')).toBeNull();
    expect(screen.getByText('Normale Antwort')).toBeTruthy();
  });

  it('gültig markierter fremder Inhalt wird bei widersprechendem oder leerem gespeichertem Text nicht gerendert', async () => {
    const source = 'root = Answer([Text("Der Antrag wurde erledigt.")])';
    const view = render(<AnswerBody text="Der Antrag wurde NICHT erledigt." presentation={presentation(source)} responseFormat="openui" />);
    await screen.findByText(/Komponentenansicht konnte nicht vollständig/);
    expect(screen.getByText('Der Antrag wurde NICHT erledigt.')).toBeTruthy();
    expect(view.container.querySelector('.openui-answer')).toBeNull();
    view.rerender(<AnswerBody text="" presentation={presentation(source)} responseFormat="openui" />);
    await screen.findByText('Unverarbeitete Anbieterantwort ansehen');
    expect(view.container.querySelector('.openui-answer')).toBeNull();
  });

  it.each([
    'root = Answer([Query("fälle_laden", {})])',
    '$value = "secret"\nroot = Answer([Text($value)])',
    'root = Answer([Unknown("x")])',
    'root = Answer([Text("x")])\nMutation("write", {})',
  ])('führt keine Werkzeuge, dynamischen Werte oder unbekannten Komponenten aus', async (source) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const view = render(<AnswerBody text="Gespeicherte Textantwort." presentation={presentation(source)} responseFormat="openui" />);
    await screen.findByText(/Komponentenansicht konnte nicht vollständig/);
    expect(screen.getByText('Gespeicherte Textantwort.')).toBeTruthy();
    expect(view.container.querySelector('.openui-answer')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Formatfehler mit normaler Prosa behalten sichere lesbare Anbieterinhalte und einen Warnhinweis', async () => {
    const source = '**Unterlagen** bitte prüfen. *Die Frist ist unbekannt.*';
    render(<AnswerBody text="" presentation={presentation(source, 'invalid')} responseFormat="openui" />);
    await screen.findByText('Unterlagen');
    expect(screen.getByText('Die Frist ist unbekannt.')).toBeTruthy();
    expect(screen.getByText(/Komponentenansicht konnte nicht vollständig/)).toBeTruthy();
  });

  it('Komponententext verwendet denselben sicheren Markdownweg: keine HTML/Bilder/unsicheren Links', async () => {
    const source = `root = Answer([Text(${JSON.stringify('**Wichtig** <img src="x" onerror="alert(1)"> ![Tracker](https://example.invalid/a.png) [unsicher](javascript:alert(1)) [Beratung](https://example.invalid/beratung)')})])`;
    const view = render(<AnswerBody text={parseOpenUi(source).text} presentation={presentation(source)} responseFormat="openui" />);
    const link = await screen.findByRole('link', { name: 'Beratung' });
    expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('[onerror]')).toBeNull();
    expect(view.container.querySelectorAll('a')).toHaveLength(1);
    expect(screen.getByText(/Bild: Tracker/)).toBeTruthy();
  });

  it('ein fokussierter Link behält DOM-Identität bei weiteren Streaming-Chunks', async () => {
    const first = 'root = Answer([Text("[Beratung](https://example.invalid/beratung)"), Text("Erste Einordnung")])';
    const second = first.replace('Erste Einordnung', 'Erste Einordnung mit Ergänzung');
    const view = render(<AnswerBody text="" presentation={presentation(first, 'streaming')} responseFormat="openui" streaming />);
    const link = await screen.findByRole('link', { name: 'Beratung' });
    link.focus();
    view.rerender(<AnswerBody text="" presentation={presentation(second, 'streaming')} responseFormat="openui" streaming />);
    await screen.findByText('Erste Einordnung mit Ergänzung');
    expect(screen.getByRole('link', { name: 'Beratung' })).toBe(link);
    expect(document.activeElement).toBe(link);
  });

  it('erlaubte Quellpräfixe warten ohne Warnung; unvollständige Abschnittsnamen unterbrechen sichtbare Teile nicht', async () => {
    const first = 'root = A';
    const view = render(<AnswerBody text="" presentation={presentation(first, 'streaming')} responseFormat="openui" streaming />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText(/Komponentenansicht konnte nicht vollständig/)).toBeNull();
    const next = 'root = Answer([Text("[Beratung](https://example.invalid/beratung)"), Fa';
    view.rerender(<AnswerBody text="" presentation={presentation(next, 'streaming')} responseFormat="openui" streaming />);
    await screen.findByRole('link', { name: 'Beratung' });
    expect(screen.queryByText(/Komponentenansicht konnte nicht vollständig/)).toBeNull();
  });

  it('formatierte Abschnittstitel bleiben sicheres Inline-Markdown ohne Absatz oder rohes Sternchen', async () => {
    const source = 'root = Answer([Facts("**Bekannte Fakten** und *Einordnung*", ["Ein Stichpunkt."])])';
    const view = render(<AnswerBody text={parseOpenUi(source).text} presentation={presentation(source)} responseFormat="openui" />);
    const heading = await screen.findByRole('heading', { name: 'Bekannte Fakten und Einordnung' });
    expect(heading.querySelector('strong')?.textContent).toBe('Bekannte Fakten');
    expect(heading.querySelector('em')?.textContent).toBe('Einordnung');
    expect(heading.querySelector('p,div,h1,h2,h3')).toBeNull();
    expect(view.container.textContent).not.toContain('**');
  });

  it('ungültige Präsentation ohne Projektion zeigt den Originalzugang bereits im lokalen Fehlerweg', async () => {
    const source = 'root = Answer([Unknown("unerlaubte Komponente")])';
    const turn: PendingTurn = { conversationId: SEED_CONVERSATION, clientRequestId: 'synthetisch', content: 'Frage', phase: 'failed',
      text: '', model: null, messageId: null, replayed: false, usage: null, activity: [], responseFormat: 'openui',
      presentation: presentation(source, 'invalid'), error: new AppError('PRESENTATION_INVALID'),
    };
    const view = render(<PendingTurnView turn={turn} showUser={false} showAssistant responseFormat="openui"
      onFetchAgain={() => undefined} onSendNew={() => undefined} onReload={() => undefined} onEdit={() => undefined} onDismiss={() => undefined} />);
    await screen.findByText('Unverarbeitete Anbieterantwort ansehen');
    expect(view.container.querySelector('.openui-original pre')?.textContent).toBe(source);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(view.container.querySelector('.openui-answer')).toBeNull();
  });

  it('teilweise gelieferte Abschnitte bleiben beim Abbruch lesbar und werden nicht als fertig dargestellt', async () => {
    const source = 'root = Answer([Text("**Unterlagen** prüfen."), Notice("Einordnung", "Noch offen';
    const turn: PendingTurn = { conversationId: SEED_CONVERSATION, clientRequestId: 'synthetisch', content: 'Frage', phase: 'aborted',
      text: '', model: null, messageId: null, replayed: false, usage: null, activity: [], responseFormat: 'openui',
      presentation: presentation(source, 'interrupted'), error: new AppError('REQUEST_ABORTED'),
    };
    render(<PendingTurnView turn={turn} showUser={false} showAssistant responseFormat="openui"
      onFetchAgain={() => undefined} onSendNew={() => undefined} onReload={() => undefined} onEdit={() => undefined} onDismiss={() => undefined} />);
    await screen.findByText('Unterlagen');
    expect(screen.getByText('Antwort abgebrochen')).toBeTruthy();
    expect(screen.queryByText('Antwort wird geschrieben …')).toBeNull();
  });

  it('Quellen und Unvollständigkeitswarnung stehen auch bei Komponenten außerhalb der Antwort', async () => {
    const fake = createFakeBackend(openUiScenario());
    const stored = fake.state.messages.find(m => m.role === 'assistant');
    if (!stored) throw new Error('Fixture fehlt');
    render(<MessageView message={{ ...stored, status: 'interrupted' }} responseFormat="openui" />);
    await screen.findByRole('heading', { name: 'Was noch ungeklärt ist' });
    expect(screen.getByText('Antwort wurde unterbrochen. Der Text ist unvollständig.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'BMG: Pflegegrade' })).toBeTruthy();
  });
});

describe('Anfrageformat, Streaming und gespeicherte Antwort', () => {
  it('Wechsel sendet nichts, erhält den Entwurf und ändert laufende Anfrage nicht; Abschluss bleibt einmal', async () => {
    const { fake, user } = await signedInApp({ ...openUiScenario({ hold: true }), tickMs: 0 }, THREAD);
    const input = await screen.findByLabelText<HTMLTextAreaElement>(/Nachricht an den Sachbearbeiter/);
    await user.type(input, 'Bitte ordnen');
    await user.click(screen.getByRole('button', { name: 'OpenUI' }));
    expect(input.value).toBe('Bitte ordnen');
    expect(fake.calls.chat).toHaveLength(0);
    await user.type(input, '{Enter}');
    await waitFor(() => expect(fake.calls.chat).toHaveLength(1));
    expect(fake.calls.chat[0]?.responseFormat).toBe('openui');
    await user.click(screen.getByRole('button', { name: 'Text' }));
    expect(fake.calls.chat[0]?.responseFormat).toBe('openui');
    expect(fake.calls.chat).toHaveLength(1);
    await waitFor(() => expect(screen.getAllByText('Pflege zu Hause vorbereiten')).toHaveLength(2));
    await waitFor(() => expect(fake.isStreamHeld()).toBe(true));
    act(() => fake.release());
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Antwort abbrechen' })).toBeNull());
    expect(fake.state.messages.filter(m => m.role === 'assistant')).toHaveLength(2);
    expect(screen.getAllByText('Pflege zu Hause vorbereiten')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'OpenUI' }));
    await screen.findAllByRole('heading', { name: 'Nächste Schritte gemeinsam abstimmen' });
    expect(fake.calls.chat).toHaveLength(1);
  });

  it('Darstellungsfehler ist kein Erfolg und kann bewusst als Text erneut angefragt werden', async () => {
    const { fake, user } = await signedInApp(openUiScenario({ invalid: true }), THREAD);
    await user.click(await screen.findByRole('button', { name: 'OpenUI' }));
    await user.type(screen.getByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage{Enter}');
    await screen.findByText(/gewünschte Komponentenformat/);
    expect(fake.state.messages.filter(m => m.role === 'assistant').at(-1)?.status).toBe('failed');
    await user.click(screen.getByRole('button', { name: 'Text' }));
    await user.click(screen.getByRole('button', { name: 'Neu senden' }));
    await waitFor(() => expect(fake.calls.chat).toHaveLength(2));
    expect(fake.calls.chat[1]?.responseFormat).toBe('text');
    expect(fake.calls.chat[1]?.clientRequestId).not.toBe(fake.calls.chat[0]?.clientRequestId);
  });

  it('sichere Präsentationsereignisse werden normalisiert, kaputte Kataloge abgewiesen', () => {
    const frame = (type: string, data: unknown) => ({ event: type, data: JSON.stringify({ version: 1, type, requestId: 'r', sequence: 1, conversationId: 'c', data }) });
    expect(parseChatEvent(frame('message.presentation.delta', { text: 'root = Answer(' }), 'c').type).toBe('message.presentation.delta');
    const final = parseChatEvent(frame('message.presentation.final', { presentation: { ...OPENUI_SCENARIO_PRESENTATION, arbitrary: 'discard' } }), 'c');
    expect(final.data).toEqual({ presentation: OPENUI_SCENARIO_PRESENTATION });
    expect(() => parseChatEvent(frame('message.presentation.final', { presentation: { ...OPENUI_SCENARIO_PRESENTATION, catalogVersion: 'bad' } }), 'c')).toThrow();
    expect(() => parseChatEvent(frame('message.presentation.final', { presentation: { ...OPENUI_SCENARIO_PRESENTATION, state: 'streaming' } }), 'c')).toThrow();
  });

  it('Netzabriss-Replay verwendet eingefrorenes Format und getrennte DSL/Textfelder ohne Duplikat', async () => {
    const fake = createFakeBackend({ modelOperational: true, chat: () => ({ kind: 'openui', chunks: [OPENUI_SCENARIO_SOURCE], cutBeforeComplete: true }) });
    const store = new StreamStore({ chat: fake.chat, workspaceId: fake.state.workspace.workspace.id, registerStream: () => () => undefined,
      onSettled: () => undefined, onSessionLost: () => undefined, schedule: fn => queueMicrotask(fn),
    });
    try {
      store.send(SEED_CONVERSATION, 'Frage', 'openui');
      await waitFor(() => expect(store.get(SEED_CONVERSATION)?.phase).toBe('failed'));
      const original = store.get(SEED_CONVERSATION)?.clientRequestId;
      store.fetchAgain(SEED_CONVERSATION);
      await waitFor(() => expect(store.get(SEED_CONVERSATION)?.phase).toBe('completed'));
      expect(fake.calls.chat.map(r => [r.responseFormat, r.clientRequestId])).toEqual([['openui', original], ['openui', original]]);
      expect(store.get(SEED_CONVERSATION)?.text).toBe(OPENUI_SCENARIO_TEXT);
      expect(store.get(SEED_CONVERSATION)?.presentation).toEqual(OPENUI_SCENARIO_PRESENTATION);
      expect(fake.state.messages.filter(m => m.role === 'assistant')).toHaveLength(1);
    } finally { store.dispose(); }
  });
});
