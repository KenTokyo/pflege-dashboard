// Gemeinsamer Mock-Inhalt. Alle Personen, Kassen, Praxen und Vorgänge sind frei erfunden.
// Stichtag der Mocks: Dienstag, 6. Oktober 2026.

export const today = { long: 'Dienstag, 6. Oktober 2026', short: '06.10.2026' };

export const banner = {
  title: 'Demo – keine echten Daten eingeben',
  detail: 'Alle Personen und Vorgänge sind fiktiv.',
};

export const user = { name: 'Sabine Keller', salutation: 'Frau Keller', initials: 'SK', role: 'Bevollmächtigte' };
export const workspace = { name: 'Familie Brandt', note: 'Demo-Arbeitsbereich' };

export const recipients = [
  {
    id: 'ingrid',
    name: 'Ingrid Brandt',
    initials: 'IB',
    meta: 'Mutter · 81 Jahre',
    pg: 'Pflegegrad 3',
    pgShort: 'PG 3',
    kasse: 'Pflegekasse Weserland',
    status: 'Widerspruch in Vorbereitung',
    deadline: {
      label: 'Widerspruchsfrist',
      date: '15.10.2026',
      remaining: 'noch 9 Tage',
      days: 9,
      source: 'laut Bescheid vom 12.09.2026',
      urgent: true,
    },
  },
  {
    id: 'werner',
    name: 'Werner Brandt',
    initials: 'WB',
    meta: 'Vater · 84 Jahre',
    pg: 'Pflegegrad 2',
    pgShort: 'PG 2',
    kasse: 'Pflegekasse Weserland',
    status: 'Verhinderungspflege 02.–13.11. geplant',
    deadline: {
      label: 'Antrag Verhinderungspflege',
      date: '20.10.2026',
      remaining: 'noch 14 Tage',
      days: 14,
      source: 'eigene Planung',
      urgent: false,
    },
  },
];

export const tasks = [
  // Sortiert nach Dringlichkeit (Fälligkeit). Die Widerspruchsfrist bleibt zusätzlich hervorgehoben.
  { title: 'Arztbericht bei Dr. Albers anfordern', who: 'Ingrid Brandt', due: '09.10.', left: '3 Tage', level: 'hoch', kind: 'Für die Begründung' },
  { title: 'Widerspruch an die Pflegekasse senden', who: 'Ingrid Brandt', due: '15.10.', left: '9 Tage', level: 'hoch', kind: 'Frist aus Bescheid', urgent: true },
  { title: 'Antrag Verhinderungspflege einreichen', who: 'Werner Brandt', due: '20.10.', left: '14 Tage', level: 'mittel', kind: 'Eigene Planung' },
  { title: 'Rechnung Alltagshilfe September einreichen', who: 'Werner Brandt', due: '31.10.', left: '25 Tage', level: 'normal', kind: 'Entlastungsbetrag' },
  { title: 'Pflegetagebuch für die Begutachtung ergänzen', who: 'Ingrid Brandt', due: 'laufend', left: '', level: 'normal', kind: 'Notiz' },
];

export const documents = [
  { title: 'Widerspruch gegen Bescheid vom 12.09.2026', who: 'Ingrid Brandt', status: 'entwurf', statusLabel: 'Entwurf', when: 'heute, 09:41' },
  { title: 'Bitte um Zusendung des Gutachtens', who: 'Ingrid Brandt', status: 'geprueft', statusLabel: 'Geprüft', when: 'heute, 09:38' },
  { title: 'Antrag auf Verhinderungspflege', who: 'Werner Brandt', status: 'geprueft', statusLabel: 'Geprüft', when: 'gestern' },
  { title: 'Abrechnung Entlastungsbetrag August', who: 'Werner Brandt', status: 'versendet', statusLabel: 'Versendet', when: '28.09.' },
];

export const conversations = [
  { title: 'Widerspruch Pflegegrad', who: 'Ingrid Brandt', when: '09:41', snippet: 'Entwurf liegt zur Bestätigung bereit.', active: true },
  { title: 'Verhinderungspflege im November', who: 'Werner Brandt', when: 'gestern', snippet: 'Antrag ist erstellt und geprüft.' },
  { title: 'Was zählt zum Entlastungsbetrag?', who: 'Allgemein', when: '29.09.', snippet: 'Quelle: Merkblatt der Pflegekasse.' },
  { title: 'Begutachtung vorbereiten', who: 'Ingrid Brandt', when: '24.09.', snippet: 'Checkliste für den Termin.' },
  { title: 'Rechnung Alltagshilfe', who: 'Werner Brandt', when: '18.09.', snippet: 'An Menschen übergeben.' },
];

export const askPrompts = [
  'Was muss in die Begründung des Widerspruchs?',
  'Welche Unterlagen fehlen für die Verhinderungspflege?',
];

export const chat = {
  title: 'Widerspruch Pflegegrad',
  person: 'Ingrid Brandt',
  personMeta: 'Pflegegrad 3 · Pflegekasse Weserland',
  mode: 'Auskunft + Erstellen',
  modeNote: 'für dieses Gespräch',
  model: 'Claude Sonnet',
  modelRegion: 'US',
  userMessage: 'Die Kasse lehnt Pflegegrad 4 ab. Können Sie einen Widerspruch vorbereiten?',
  attachment: { name: 'Bescheid_Pflegekasse_12-09-2026.pdf', meta: 'PDF · 2 Seiten' },
  agentMessage: [
    'Gern. Laut Bescheid (S. 2) endet die Frist am **15.10.2026**, bitte prüfen. Zuerst habe ich das Gutachten angefordert.',
  ],
  sources: ['Bescheid vom 12.09.2026, S. 2', 'Pflegekasse / Pflegestützpunkt'],
  created: {
    kind: 'Brief',
    title: 'Bitte um Zusendung des Gutachtens',
    status: 'Erstellt · Entwurf',
    when: '09:38',
    to: 'Pflegekasse Weserland',
    lines: [
      'Sehr geehrte Damen und Herren,',
      'für meine Mutter, Ingrid Brandt, bitte ich um Zusendung des vollständigen Gutachtens zur Begutachtung vom 28.08.2026.',
    ],
  },
  confirm: {
    question: 'Widerspruch gegen Bescheid vom 12.09.2026 – Entwurf erstellen?',
    type: 'Widerspruch',
    for: 'Ingrid Brandt',
    to: 'Pflegekasse Weserland',
    subject: 'Widerspruch gegen den Bescheid vom 12.09.2026',
    lines: [
      'Sehr geehrte Damen und Herren,',
      'hiermit lege ich für meine Mutter Widerspruch gegen den Bescheid vom 12.09.2026 ein. Die Begründung folgt nach Erhalt des Gutachtens.',
    ],
    note: 'Nur Entwurf – nichts wird versendet.',
  },
  honesty: 'Keine Rechts- oder Medizinberatung. Fristen und Beträge nur aus Ihren Unterlagen.',
  composer: 'Nachricht an den Sachbearbeiter …',
};

export const settings = {
  modes: [
    { id: 'auskunft', title: 'Nur Auskunft', text: 'Beantwortet Fragen. Erstellt nichts.' },
    { id: 'erstellen', title: 'Auskunft + Erstellen', text: 'Schlägt Briefe und Aufgaben vor – erst nach Bestätigung.' },
  ],
  activeMode: 'erstellen',
  serverNote: 'Serverseitig durchgesetzt: Bei „Nur Auskunft“ erhält das Modell keine Erstell-Werkzeuge.',
  chatOverride: 'Einzelne Gespräche dürfen abweichen',
  persona: {
    name: 'Sachbearbeiter, sachlich und höflich',
    version: 'Version 3',
    changed: 'geändert am 02.10.2026',
    excerpt:
      'Sie sind ein höflicher, genauer Sachbearbeiter für Pflegefragen und siezen. Keine verbindliche Rechts- oder Medizinberatung. Bei Unsicherheit sagen Sie es und nennen die zuständige Stelle.',
    versions: [
      { v: 'Version 3', note: 'aktiv', active: true },
      { v: 'Version 2', note: '24.09.2026' },
      { v: 'Standard', note: 'Ausgangsfassung' },
    ],
  },
  models: [
    { name: 'Claude Sonnet', provider: 'Anthropic', region: 'US', tools: true, vision: true, enabled: true, default: true },
    { name: 'Claude Haiku', provider: 'Anthropic', region: 'US', tools: true, vision: true, enabled: true },
    { name: 'GPT', provider: 'OpenAI', region: 'US', tools: true, vision: true, enabled: true },
    { name: 'Mistral Large', provider: 'Mistral AI', region: 'EU', tools: true, vision: false, enabled: false, pending: 'Einrichtung offen' },
  ],
  regionNote: 'Regionen sind Planungsangaben der Demo. Vor echtem Einsatz vertraglich prüfen (AVV).',
  demo: {
    title: 'Demo-Hinweis anzeigen',
    text: 'Der Hinweis „Demo – keine echten Daten eingeben“ bleibt sichtbar, bis Sie ihn ausschalten.',
    checklist: 'Vor echten Daten: Checkliste Datenschutz (AVV, DSFA, persönliche Zugänge).',
  },
};

export const login = {
  title: 'Anmelden',
  lead: 'Ihr Arbeitsbereich für Pflegeanträge, Fristen und Schreiben.',
  email: 'E-Mail-Adresse',
  emailPh: 'name@beispiel.de',
  password: 'Passwort',
  submit: 'Anmelden',
  forgot: 'Passwort vergessen?',
  access: 'Zugänge vergibt Ihre Verwaltung. Eine Selbstregistrierung gibt es nicht.',
  timeout: 'Nach 15 Minuten ohne Aktivität werden Sie abgemeldet.',
  points: [
    { icon: 'calendar-clock', title: 'Fristen im Blick', text: 'Widerspruchsfristen und Termine nach Dringlichkeit.' },
    { icon: 'message-square-text', title: 'KI-Sachbearbeiter', text: 'Rund um die Uhr erreichbar. Erstellt nur nach Bestätigung.' },
    { icon: 'shield-check', title: 'Ehrlich statt verbindlich', text: 'Keine Rechts- oder Medizinberatung. Mit Quellenangabe.' },
  ],
};
