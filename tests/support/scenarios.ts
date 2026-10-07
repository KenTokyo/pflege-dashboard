/**
 * Synthetische Randfall-Bestände für Bild-Harness und UI-Tests: lange Namen und Texte, Fristen rund um
 * „heute“, leere Bestände. Nur fiktive Werte, nie im Produkt-Build.
 */
import type { SeedState } from './seed';
import { MARTHA, SEED_CONVERSATION } from './seed';

const WS = '10000000-0000-4000-8000-000000000001';
const SYS = '10000000-0000-4000-8000-000000000002';
const base = { workspace_id: WS, created_by: SYS };
const DAY = 86_400_000;
const id = (prefix: string, i: number) => `${prefix}-0000-4000-8000-${String(i).padStart(12, '0')}`;
const iso = (ms: number) => new Date(ms).toISOString();

export const LONG_PERSON = 'Hildegard Friederike von Sonnenberg-Wiesenthal-Hohenstein · fiktiv';
export const LONG_CONVERSATION_TITLE =
  'Widerspruch gegen den Bescheid zur Einstufung in Pflegegrad 2 mit Bitte um erneute Begutachtung durch den Medizinischen Dienst';
export const LONG_CONVERSATION = '60000000-0000-4000-8000-000000000001';

/** Lange Namen, Titel und Texte; Fristen überfällig, heute, morgen, ohne Termin. */
export function longContent(state: SeedState, now = Date.now()) {
  const insurer = state.people[0]?.insurer_contact_id ?? null;
  state.people = [
    {
      ...base,
      id: MARTHA,
      created_at: iso(now - 30 * DAY),
      name: LONG_PERSON,
      care_grade: 5,
      birth_date: '1938-02-14',
      address: {},
      insurer_contact_id: insurer,
      summary: '',
      insurerName: 'Allgemeine Ortskrankenkasse – Pflegekasse für Nordrhein-Westfalen und Hamburg, Zweigstelle Beispielstadt · fiktiv',
    },
    {
      ...base,
      id: id('61000000', 1),
      created_at: iso(now - 20 * DAY),
      name: 'Jo Li · fiktiv',
      care_grade: 0,
      birth_date: null,
      address: {},
      insurer_contact_id: null,
      summary: '',
      insurerName: null,
    },
  ];
  const task = (i: number, title: string, due: number | null, priority: 'urgent' | 'high' | 'normal' | 'low', source: string | null, person: string | null = MARTHA) => ({
    ...base,
    id: id('62000000', i),
    created_at: iso(now - DAY),
    care_recipient_id: person,
    conversation_id: null,
    title,
    description: '',
    due_at: due === null ? null : iso(due),
    deadline_source: source,
    priority,
    status: 'open' as const,
    kind: 'standard' as const,
  });
  state.tasks = [
    task(
      1,
      'Widerspruchsbegründung mit Pflegetagebuch, Arztbericht und Stellungnahme des Pflegedienstes an die Pflegekasse senden',
      now - 3 * DAY,
      'urgent',
      'Fiktive manuelle Demo-Aufgabenplanung nach Gespräch mit der Beratungsstelle am Pflegestützpunkt',
    ),
    task(2, 'Rückruf Pflegekasse', now + 2 * 3_600_000, 'high', null),
    task(3, 'Entlastungsbetrag abrechnen', now + DAY, 'normal', null, null),
    task(4, 'Unterlagen sortieren', null, 'low', null, id('61000000', 1)),
    task(5, 'Verhinderungspflege für November beantragen', now + 12 * DAY, 'normal', 'Fiktive Demo-Planung'),
  ];
  state.documents = [
    ...state.documents,
    {
      ...base,
      id: id('63000000', 1),
      created_at: iso(now - 400 * DAY),
      care_recipient_id: MARTHA,
      conversation_id: null,
      kind: 'application',
      title: 'Antrag auf Höherstufung des Pflegegrades wegen deutlich gestiegenen Unterstützungsbedarfs bei Mobilität und Selbstversorgung',
      content: { demo: true },
      rendered_text: 'FIKTIV\nhttps://www.beispiel.invalid/ein/sehr/langer/pfad/ohne/leerzeichen/der/nicht/umbrechen/will/und/trotzdem/passen/muss',
      status: 'sent',
      revision: 3,
    },
  ];
  state.conversations = [
    {
      ...base,
      id: LONG_CONVERSATION,
      created_at: iso(now - 2 * 3_600_000),
      title: LONG_CONVERSATION_TITLE.slice(0, 120),
      care_recipient_id: MARTHA,
      archived_at: null,
      mode_override: null,
      model_override_id: null,
      revision: 1,
    },
    ...state.conversations.map((c) => ({ ...c, created_at: iso(now - 380 * DAY) })),
  ];
  const msg = (i: number, role: 'user' | 'assistant', content: string, at: number, status: 'completed' | 'interrupted' = 'completed') => ({
    ...base,
    id: id('64000000', i),
    created_at: iso(at),
    conversation_id: LONG_CONVERSATION,
    role,
    content,
    status,
    model_id: null,
    model_snapshot: role === 'assistant' ? { displayName: 'OpenAI · Testmodell (synthetisch)', region: 'unverified' } : null,
    prompt_version_id: null,
    input_tokens: null,
    output_tokens: null,
    tool_calls: [],
    sources: role === 'assistant' ? [{ title: 'SGB XI § 78 (Gesetze im Internet)', url: 'https://www.gesetze-im-internet.de/sgb_11/__78.html' }] : [],
    client_request_id: null,
    provider_response_model: role === 'assistant' ? 'synthetisches-modell-2026-10-01-mit-sehr-langer-kennung' : null,
    presentation: null,
  });
  state.messages = [
    ...state.messages,
    msg(
      1,
      'user',
      'Ich habe hier den Link zum Bescheid: https://www.beispiel.invalid/bescheide/2026/10/pflegegrad/einstufung/widerspruch/unterlagen/anlage-7.pdf und das Aktenzeichen PK-2026-0000000000000000000000000000000000000000000001. Was jetzt?',
      now - 26 * 3_600_000,
    ),
    msg(
      2,
      'assistant',
      [
        'Hier ein Überblick. **Bitte prüfen Sie die Frist im Original-Bescheid.**',
        '',
        '| Schritt | Wer | Unterlage | Hinweis | Quelle | Stand |',
        '| --- | --- | --- | --- | --- | --- |',
        '| Widerspruch einlegen | Sie oder Bevollmächtigte | Schreiben mit Aktenzeichen | Frist laut Bescheid | Bescheid | ungeprüft |',
        '| Begründung nachreichen | Sie | Pflegetagebuch | konkrete Alltagsbeispiele | Pflegeberatung | ungeprüft |',
        '',
        '```',
        'Aktenzeichen: PK-2026-0000000000000000000000000000000000000000000001 · Beispielstraße 1 · 00000 Demostadt',
        '```',
        '',
        '> Unsicher: Ob ein neues Gutachten nötig ist, kann ich nicht beurteilen.',
      ].join('\n'),
      now - 26 * 3_600_000 + 60_000,
    ),
    msg(3, 'user', 'Danke.', now - 3 * 3_600_000),
    msg(4, 'assistant', 'Gern. Die Antwort wurde hier unterbrochen', now - 3 * 3_600_000 + 30_000, 'interrupted'),
  ];
  return state;
}

/** Leerer Arbeitsbereich: keine Personen, Aufgaben, Dokumente, Gespräche. */
export function emptyWorkspace(state: SeedState) {
  state.people = [];
  state.tasks = [];
  state.documents = [];
  state.conversations = [];
  state.messages = state.messages.filter((m) => m.conversation_id !== SEED_CONVERSATION);
  return state;
}
