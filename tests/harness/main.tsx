/**
 * Prüf-Harness für Bildaufnahmen: echte App (Login-Formular, Routen, Sitzung, Stream-Verarbeitung)
 * mit synthetischem Test-Transport statt Supabase. Läuft nur über vite.harness.config.ts, nie im
 * Produkt-Build. Keine echten Konten, keine Netzaufrufe, keine KI-Kosten.
 */
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import '@fontsource-variable/bricolage-grotesque/index.css';
import '../../src/styles/app.css';
import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/app/App';
import type { Clock } from '../../src/auth/activity';
import { createFakeBackend, type ChatScript, type FakeOptions } from '../support/fakeBackend';
import { emptyWorkspace, longContent } from '../support/scenarios';
import { staffScenario } from '../support/staffScenario';
import { openUiScenario } from '../support/openUiScenario';

const params = new URLSearchParams(location.search);
const szenario = params.get('szenario') ?? 'seed';

const CHUNKS = [
    'Für einen Widerspruch gegen die Einstufung sind meist drei Punkte wichtig:\n\n',
    '1. **Frist:** Sie steht im Bescheid. Ich kann sie hier nicht prüfen, ',
    'bitte lesen Sie das Datum im Original nach.\n',
    '2. **Begründung:** Beschreiben Sie konkrete Einschränkungen im Alltag, ',
    'zum Beispiel beim Waschen, Anziehen oder bei der Orientierung.\n',
    '3. **Unterlagen:** Pflegetagebuch und ärztliche Berichte stützen die Begründung.\n\n',
    'Unsicher ist, ob in Ihrem Fall ein neues Gutachten nötig ist. Das sollte eine Pflegeberatung klären.',
];
const ANSWER: ChatScript = {
  kind: 'answer',
  holdBeforeComplete: params.get('halten') === '1',
  chunks: CHUNKS,
  sources: [{ title: 'BMG: Pflegegrade', url: 'https://www.bundesgesundheitsministerium.de/pflegegrade' }],
};

const SZENARIEN: Record<string, FakeOptions> = {
  seed: {},
  modell: { modelOperational: true, tickMs: 90, chat: () => ANSWER },
  anbieter: { modelOperational: true, chat: () => ({ kind: 'http_error', code: 'PROVIDER_NOT_CONFIGURED' }) },
  budget: { modelOperational: true, chat: () => ({ kind: 'http_error', code: 'BUDGET_EXCEEDED' }) },
  abriss: { modelOperational: true, tickMs: 60, chat: () => ({ kind: 'cut', afterChunks: CHUNKS.slice(0, 3) }) },
  mitglied: { role: 'member' },
  // Randfälle: lange Inhalte, leerer Bestand, sehr langsame Antwort (zum Abbrechen).
  lang: { modelOperational: true, tickMs: 60, chat: () => ANSWER, extend: (s) => longContent(s) },
  leer: { extend: emptyWorkspace },
  staff: { modelOperational: true, role: 'member', extend: staffScenario },
  langsam: { modelOperational: true, tickMs: 4000, chat: () => ANSWER },
  openui: openUiScenario({ hold: params.get('halten') === '1' }),
  'openui-fehler': openUiScenario({ invalid: true }),
};

// Uhr mit Vorspulen, damit der 15-Minuten-Abmeldeweg ohne Warten sichtbar wird.
let offset = 0;
const timers = new Map<number, { at: number; fn: () => void }>();
const clock: Clock = {
  now: () => Date.now() + offset,
  setTimeout: (fn, ms) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.set(id, { at: Date.now() + offset + ms, fn });
    return id;
  },
  clearTimeout: (h) => {
    window.clearTimeout(h as number);
    timers.delete(h as number);
  },
};

const fake = createFakeBackend(SZENARIEN[szenario] ?? {});
Object.assign(window, {
  __harness: {
    szenario,
    release: () => fake.release(),
    isStreamHeld: () => fake.isStreamHeld(),
    advance: (ms: number) => {
      offset += ms;
      for (const [id, t] of [...timers.entries()].sort((a, b) => a[1].at - b[1].at)) {
        if (t.at > clock.now()) continue;
        clock.clearTimeout(id);
        t.fn();
      }
    },
    calls: fake.calls,
  },
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App backend={fake} queryClient={new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: false } } })} clock={clock} />
    </StrictMode>,
  );
}
