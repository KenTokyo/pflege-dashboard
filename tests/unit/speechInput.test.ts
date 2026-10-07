import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { SpeechInputController, type SpeechRecognitionPort, type SpeechResultEvent, type SpeechSnapshot } from '../../src/chat/speechInput';
import { useSpeechInput } from '../../src/chat/useSpeechInput';

class Recognition implements SpeechRecognitionPort {
  static instances: Recognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onstart: (() => void) | null = null;
  onresult: ((event: SpeechResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn();
  abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
  result(text: string, final = false) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: final, 0: { transcript: text } }] });
  }
}

function setup(initial = 'Mein Entwurf.') {
  const onText = vi.fn<(text: string) => void>();
  const onState = vi.fn<(state: SpeechSnapshot) => void>();
  const controller = new SpeechInputController(Recognition, onText, onState);
  controller.update(initial, onText);
  controller.start();
  const current = () => Recognition.instances.at(-1) as Recognition;
  return { controller, onText, onState, current };
}

beforeEach(() => { vi.useFakeTimers(); Recognition.instances = []; });
afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, 'webkitSpeechRecognition');
  Reflect.deleteProperty(window, 'SpeechRecognition');
  Reflect.deleteProperty(document, 'hidden');
});

describe('Spracheingabe ohne echtes Mikrofon', () => {
  it('Deutsch, kontinuierlich und Zwischenergebnisse; bestehender Text bleibt stehen, finale Ergebnisse genau einmal', () => {
    const s = setup();
    expect(s.current()).toMatchObject({ lang: 'de-DE', continuous: true, interimResults: true, maxAlternatives: 1 });
    s.current().result('neue Frage');
    expect(s.onText).not.toHaveBeenCalled();
    expect(s.onState).toHaveBeenLastCalledWith(expect.objectContaining({ active: true, interim: 'neue Frage' }));
    s.current().result('Neue Frage.', true);
    s.current().result('Neue Frage.', true);
    expect(s.onText.mock.calls).toEqual([['Mein Entwurf. Neue Frage.']]);
    s.controller.dispose();
  });

  it.each(['Zwischentext', 'Korrigierter finaler Text'])('Stop → spätes Final „%s“ wird genau einmal angehängt', (final) => {
    const s = setup();
    s.current().result('Zwischentext');
    s.controller.stop();
    expect(s.onText).not.toHaveBeenCalled();
    s.current().result(final, true);
    s.current().onend?.();
    vi.runAllTimers();
    expect(s.onText.mock.calls).toEqual([[`Mein Entwurf. ${final}`]]);
    expect(s.onState).toHaveBeenLastCalledWith(expect.objectContaining({ active: false, interim: '' }));
    expect(Recognition.instances).toHaveLength(1);
  });

  it('Stop ohne Final/Ende behält den sichtbaren Zwischentext und beendet die Ressource nach höchstens 800 ms', () => {
    const s = setup();
    s.current().result('Erkannter Text');
    s.controller.stop();
    vi.advanceTimersByTime(800);
    expect(s.onText.mock.calls).toEqual([['Mein Entwurf. Erkannter Text']]);
    expect(s.current().abort).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('eine manuelle Textänderung während der Aufnahme bleibt erhalten', () => {
    const s = setup();
    s.current().result('Weitere Frage');
    s.controller.update('Von mir überarbeitet.', s.onText);
    s.current().result('Weitere Frage.', true);
    expect(s.onText).toHaveBeenLastCalledWith('Von mir überarbeitet. Weitere Frage.');
    s.controller.dispose();
  });

  it('normale Browser-Enden setzen die Aufnahme fort; echte Ergebnisse setzen die Fehlergrenze zurück', () => {
    const s = setup('');
    for (let i = 0; i < 6; i += 1) {
      s.current().result(`Satz ${i}.`, true);
      s.current().onend?.();
      vi.advanceTimersByTime(500);
    }
    expect(Recognition.instances).toHaveLength(7);
    expect(s.onText).toHaveBeenLastCalledWith('Satz 0. Satz 1. Satz 2. Satz 3. Satz 4. Satz 5.');
    s.controller.stop();
    s.current().onend?.();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aufeinanderfolgende Enden ohne neue Sprache enden begrenzt und verständlich', () => {
    const s = setup();
    for (let i = 0; i < 4; i += 1) { s.current().onend?.(); vi.advanceTimersByTime(500); }
    expect(Recognition.instances).toHaveLength(4);
    expect(s.onState.mock.lastCall?.[0].active).toBe(false);
    expect(s.onState.mock.lastCall?.[0].status).toContain('ohne neuen Text');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['not-allowed', 'audio-capture', 'network', 'no-speech'])('%s beendet die Aufnahme ohne automatischen Neuversuch und behält Text', (error) => {
    const s = setup();
    s.current().result('Schon erkannt');
    s.current().onerror?.({ error });
    expect(s.onText).toHaveBeenLastCalledWith('Mein Entwurf. Schon erkannt');
    expect(s.onState.mock.lastCall?.[0].active).toBe(false);
    expect(s.onState.mock.lastCall?.[0].error).toBeTypeOf('string');
    expect(s.current().abort).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(Recognition.instances).toHaveLength(1);
  });

  it('Verbergen beendet das Mikrofon sofort und verhindert geplante Neustarts', () => {
    const s = setup();
    s.current().result('Bleibt erhalten');
    s.controller.suspend();
    expect(s.current().abort).toHaveBeenCalledTimes(1);
    expect(s.onText).toHaveBeenLastCalledWith('Mein Entwurf. Bleibt erhalten');
    vi.runAllTimers();
    expect(Recognition.instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('Aushängen löscht Listener und Neustarttimer; verspätete Ergebnisse verändern keinen Entwurf', () => {
    const s = setup();
    const lateResult = s.current().onresult;
    s.current().onend?.();
    expect(vi.getTimerCount()).toBe(1);
    s.controller.dispose();
    lateResult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Zu spät' } }] });
    vi.runAllTimers();
    expect(s.onText).not.toHaveBeenCalled();
    expect(Recognition.instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Mikrofon-Lebenszyklus der Oberfläche', () => {
  it('versteckte Seite beendet Aufnahme und überträgt keinen Text automatisch an den Chat', () => {
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: Recognition, configurable: true });
    const onChange = vi.fn<(text: string) => void>();
    const view = renderHook(() => useSpeechInput('Vorhanden.', onChange, false));
    expect(view.result.current.supported).toBe(true);
    act(() => view.result.current.start());
    const instance = Recognition.instances[0];
    act(() => instance?.result('Diktat'));
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(instance?.abort).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Vorhanden. Diktat');
    expect(view.result.current.active).toBe(false);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('Routewechsel oder Abmeldung hängt Composer aus und beendet Listener/Mikrofon', () => {
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true });
    const onChange = vi.fn<(text: string) => void>();
    const view = renderHook(() => useSpeechInput('Entwurf.', onChange, false));
    act(() => view.result.current.start());
    const instance = Recognition.instances[0];
    view.unmount();
    expect(instance?.abort).toHaveBeenCalledTimes(1);
    expect(instance?.onresult).toBeNull();
    expect(instance?.onend).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('eine laufende KI-Antwort oder geöffneter Beispieldialog stoppt die Aufnahme', () => {
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true });
    const onChange = vi.fn<(text: string) => void>();
    const view = renderHook(({ disabled }) => useSpeechInput('Entwurf.', onChange, disabled), { initialProps: { disabled: false } });
    act(() => view.result.current.start());
    view.rerender({ disabled: true });
    expect(Recognition.instances[0]?.abort).toHaveBeenCalledTimes(1);
    expect(view.result.current.active).toBe(false);
    view.unmount();
  });
});
