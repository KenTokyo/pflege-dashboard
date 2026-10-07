import { OPENUI_CATALOG_VERSION, parseOpenUi } from '../../types/openui';
import type { FakeOptions } from './fakeBackend';
import type { SeedState } from './seed';

/** Synthetic fixture only; never imported by the product application. */
export const OPENUI_SCENARIO_SOURCE = 'root = Answer([Text("**Pflege zu Hause vorbereiten**\\n\\n*Diese Beispielantwort verwendet ausschließlich erfundene Testdaten.*"), Facts("Fakten zur gemeinsamen Vorbereitung von Angehörigen und Sachbearbeitung", ["**Person:** Martha Beispielwald", "**Pflegegrad:** 2 im fiktiven Datensatz", "**Offen:** Widerspruch mit Beratungsstelle prüfen; Vertretung planen"]), Steps("Nächste Schritte gemeinsam abstimmen", ["**Unterlagen sammeln:** Die vorhandenen Bescheide und Notizen mitbringen.", "**Beratung vereinbaren:** Zuständigkeit und erforderliche Nachweise gemeinsam klären.", "**Stand festhalten:** Erst nach menschlicher Prüfung als erledigt markieren."]), Notice("Was noch ungeklärt ist", "*Eine tatsächliche Rechtsfrist wurde nicht ermittelt.* Die Termine stammen aus der erfundenen Aufgabenplanung. Es wurde nichts versendet oder geändert.")])';
export const OPENUI_SCENARIO_TEXT = parseOpenUi(OPENUI_SCENARIO_SOURCE).text;
export const OPENUI_SCENARIO_PRESENTATION = { format: 'openui', catalogVersion: OPENUI_CATALOG_VERSION, source: OPENUI_SCENARIO_SOURCE, state: 'valid' } as const;

export function addOpenUiScenario(state: SeedState) {
  const base = state.messages[0];
  if (!base) throw new Error('Synthetische Basisnachricht fehlt');
  state.messages.push({ ...base, id: '10000000-0000-4000-8000-000000000091', role: 'assistant', content: OPENUI_SCENARIO_TEXT,
    presentation: OPENUI_SCENARIO_PRESENTATION,
    sources: [{ title: 'BMG: Pflegegrade', url: 'https://www.bundesgesundheitsministerium.de/pflegegrade' }],
  });
}

export function openUiScenario({ hold = false, invalid = false } = {}): FakeOptions {
  return {
    modelOperational: true, tickMs: 120, extend: addOpenUiScenario,
    chat: (request) => request.responseFormat === 'openui'
      ? { kind: 'openui', holdBeforeComplete: hold, chunks: (invalid ? 'root = Answer([Query("unerlaubt", {})])' : OPENUI_SCENARIO_SOURCE).match(/.{1,70}/gs) ?? [] }
      : { kind: 'answer', holdBeforeComplete: hold, chunks: [OPENUI_SCENARIO_TEXT], sources: [{ title: 'BMG: Pflegegrade', url: 'https://www.bundesgesundheitsministerium.de/pflegegrade' }] },
  };
}
