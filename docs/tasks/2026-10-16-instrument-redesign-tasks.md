# Design-Option „Instrument“: komplettes Redesign

## Initial goal

Das Pflege-Dashboard bekommt neben Tagwerk eine zweite, wählbare Design-Option „Instrument“, die jede Seite neu
gestaltet. GPT-6.1 Sol (High) baut sie in vier Bereichen mit den Modellregeln aus dem Modelltest vom 16.10.2026.

## Improved prompt

Bau für das Pflege-Dashboard das komplette Redesign im Instrument-Stil als **zusätzliche Design-Option**: Tagwerk bleibt
Standard und unverändert, „Instrument“ ist in Einstellungen → „Darstellung und Sitzung“ wählbar. Instrument gestaltet
jede Seite neu – Rahmen, Anmeldung, Übersicht, Gespräche/Chat, Dokumente, Aufgaben, Einstellungen, Sachbearbeitung,
Zustände (Laden, Leer, Fehler) –, nicht nur umgefärbt. Das Design steht im Vordergrund: Award-Niveau, so präzise und
dicht wie die Vorbilder, Motion wie ein geschnittenes Video (Auftritt als Schnittfolge, Zahlen zählen hoch, danach
Ruhe), ruhig und vertrauenswürdig für pflegende Angehörige, sofort verständlich. Alle Funktionen bleiben.

Stilquellen (vollständig lesen, nur den Stil übernehmen, keine Dateien oder Code aus NoteTree kopieren):
- Skill: `/Users/kentoky/Documents/React Projects/notetree-tanstack/.claude/skills/instrument-ui/SKILL.md`
- Vorbilder: `/Users/kentoky/Documents/React Projects/notetree-tanstack/docs/design/referenzen/2026-10-16-yury-gok-instrument/`
- Entwurf: `/Users/kentoky/Documents/React Projects/notetree-tanstack/docs/design/entwuerfe/2026-10-16-instrument-stil/index.html` und PNGs daneben
- Modellregeln (Pflicht): `/Users/kentoky/Documents/React Projects/notetree-tanstack/.treechat/modelle/GEMEINSAM.md`,
  `/Users/kentoky/Documents/React Projects/notetree-tanstack/.treechat/modelle/gpt-6.1-sol/REGELN.md`
- Lehren aus dem Modelltest (was gut und schlecht war, mit Bildern):
  `/Users/kentoky/Documents/React Projects/notetree-tanstack/docs/ai-integration/modelltest/2026-10-16-pflege-dashboard/ERGEBNIS.md`

Nutzerentscheidungen 16.10.2026, gehen älteren Regeln in `AGENTS.md` vor: vier GPT-6.1-Sol-Unterchats mit
`reasoningEffort: high` (statt höchstens zwei xhigh); Prüfbilder für Seiten in 1920×1080 (statt 1280×720).

## Vertrag (gilt für alle Bereiche)

- **Schalter:** `src/lib/design.ts` – Schlüssel `pflege-dashboard:design`, Werte `tagwerk` (Standard) | `instrument`;
  Speicherzugriff nur in `src/app/ThemeProvider.tsx` (`useDesign()`); `data-design` auf `<html>` schon im Startskript
  von `index.html` und `tests/harness/index.html` (wie `data-theme`).
- **Tagwerk unverändert:** Bestehende Tagwerk-Dateien nur um eine Weiche erweitern
  (`design === 'instrument' ? <InstrumentX /> : <bisheriger Inhalt />`). Tagwerk-Bilder müssen pixelgleich bleiben.
- **Ordner:** alles Neue unter `src/instrument/<bereich>/`; CSS je Bereich in `src/instrument/<bereich>/*.css`, im
  eigenen Baustein importiert, jede Regel unter `[data-design='instrument']`. Daten und Logik nie kopieren: bestehende
  Hooks (`src/data/queries.ts`, `src/chat/*`, `useStartConversation` …) nutzen; fehlt ein gemeinsamer Hook, ihn
  aus der Tagwerk-Seite herausziehen (gleiches Verhalten, eigener Commit).
- **Tokens (A, `src/instrument/grundlage/tokens.css`):** Flächen `--bg --surface --surface2 --sunken`, Text `--text
  --text-muted --text-faint`, Linien `--border --border-strong`, genau ein Akzent `--accent` (+ `--accent-text
  --accent-soft --on-accent`), Zustand `--danger --warning --success` (+ `-soft`), Sachfarben `--thing-person
  --thing-deadline --thing-task --thing-document --thing-conversation --thing-ai`. Kein Pink. Kontrast AA hell und
  dunkel, geprüft in `tools/check-source.mjs`.
- **Bausteine (A, `src/instrument/grundlage/`):** `Icon` (selbst gezeichnete Symbole, Strich 1,5, Farbe per Sache),
  `CardHead` (Symbolkachel, Titel, Unterzeile, rechts Zähler/Aktion), `Metric` (Leitzahl Mono + Einheit + Erklärung,
  zählt hoch), `Timeline` (Zeitachse mit fester Heute-Marke, Vergangenes links), `Segments`, `Reveal` (Schnittfolge,
  `prefers-reduced-motion` → nur Einblenden). Bereiche nutzen diese Bausteine statt eigene zu bauen; fehlt etwas,
  bauen sie es in ihrem Ordner und melden es.
- **Texte:** deutsch, Sie-Form, echte Umlaute, kein Fülltext; nur echte Daten und Funktionen.
- **Prüfung je Bereich:** `npm run typecheck`, `npm run lint`, `npm run check:source`, Tests mit
  `npx vitest run --maxWorkers=4 --testTimeout=30000` (Maschine ist ausgelastet). Sicht über die `browser_*`-Werkzeuge
  (TreeChat-Hintergrundbrowser, kein eigener Chrome): Prüf-App `npx vite --config vite.harness.config.ts --port <PORT>`,
  Anmeldung `pruefung@beispiel.invalid` / `nur-synthetisch`, 1920×1080 dunkel und hell, 390 px; Zähl-Befehl für „…“ aus
  `GEMEINSAM.md`. Server und Tabs danach schließen.
- **Git:** nur eigene Pfade committen (`git commit -m … -- <pfade>`), nicht pushen; Push macht der Orchestrator.
- **Bericht:** Dateien, Prüfungen mit Ergebnis, Bildpfade, Note nach `GEMEINSAM.md` (Start 5, Belege, drei schwächste Stellen).

## Bereiche

| Nr. | Bereich | Besitzt | Port |
| --- | --- | --- | --- |
| A | Grundlage: Schalter, Tokens, Bausteine, Rahmen (Seitenleiste, Kopf, Demo-Banner, Handy-Leiste), danach Anmeldung, Einstellungen, Zustände | `src/lib/design.ts`, `ThemeProvider.tsx`, `index.html`, `tests/harness/index.html`, `src/instrument/grundlage/`, `src/instrument/rahmen/`, `src/instrument/anmeldung/`, `src/instrument/einstellungen/`, Weichen in `Shell.tsx`, `LoginPage.tsx`, `SettingsPage.tsx`, `AppGate.tsx`, `ConfigMissing.tsx`, `States.tsx`, `DemoBanner.tsx`; `tools/check-source.mjs` | 5231 |
| B | Übersicht, Aufgaben, Dokumente | `src/instrument/uebersicht/`, `src/instrument/aufgaben/`, `src/instrument/dokumente/`, Weichen in `DashboardPage.tsx`, `TasksPage.tsx`, `DocumentsPage.tsx` | 5232 |
| C | Gespräche und Chat (Liste, Verlauf, Antworten inkl. OpenUI, Composer, Dialoge, Ablauf) | `src/instrument/chat/`, Weichen in `ChatPage.tsx`, `ChatRoute.tsx`, `src/routes/chat/*`; Darstellung in `src/chat/` nur per Klassen-Haken | 5233 |
| D | Sachbearbeitung (Sichtwechsel, Fälle, Analysen, Arbeitsflächen) | `src/instrument/sachbearbeitung/`, Weiche in `StaffPage.tsx` | 5234 |

Welle 1: nur A (Grundlage + Rahmen), damit B–D auf fertigen Tokens und Bausteinen aufsetzen. Welle 2: A (Anmeldung,
Einstellungen, Zustände), B, C, D parallel.

## Phasen

- [x] Plan, Vertrag, Bereiche (Orchestrator)
- [x] Welle 1: A Grundlage und Rahmen
- [x] Welle 2: A Anmeldung/Einstellungen/Zustände, B, C, D
- [x] Orchestrator: Aufnahmen aller Seiten (Instrument hell/dunkel/Handy, Tagwerk unverändert), Noten, Nacharbeit
- [x] Commit und Push auf `main` (Vercel)

## Bereich A – Welle 1: Arbeitsplan

Basis: `1ce6c50`. Gelesen: Instrument-Skill, Referenz-README, Tenet-Vertragstabelle, Seitenleisten-Ausschnitt,
heller Gesamtentwurf und dessen HTML, Modellregeln und Modelltest. Referenzmaße: Seitenleiste 252 px,
Kartenradius 20 px, Symbolkachel 32 px, Abstand 12 px, Kopf 16–18 px, Schrift 13–15 px.

| Fläche | Frage | Leitzahl / Datenbild | Aktion |
| --- | --- | --- | --- |
| Seitenleiste | Welcher Bereich ist offen? | echte Listen-Zähler aus vorhandenen Hooks; gleitender Auswahlmarker | Bereich öffnen |
| Kopf | In welchem Arbeitsbereich arbeite ich? | Arbeitsbereichsname, aktueller Bereich; keine erfundene Kennzahl | Ansicht / Hell-Dunkel wechseln |
| Demo-Banner | Welche Daten darf ich eingeben? | tatsächlicher Demo-Zustand, keine Kennzahl | Hinweis lesen |
| Handy-Leiste | Wie komme ich zum Bereich? | aktive Position, Sachfarben | Bereich öffnen |
| CardHead | Was zeigt die Karte? | Titel, Quelle, echter Zähler optional | höchstens eine übergebene Aktion |
| Metric | Wie groß ist der Wert? | echte Zahl ≥ 32 px mit Einheit, einmaliges Zählwerk | keine eigene Aktion |
| Timeline | Liegt ein Termin vor oder nach heute? | feste Heute-Marke, vergangene Termine links, ferne am Rand gekennzeichnet | keine erfundene Aktion |
| Segments / Reveal | Welche Ansicht / welcher Auftritt? | kontrollierte Auswahl; Rahmen → Kopf → Zahl → Bild → Aktion | Auswahl ändern |

- [x] Schalter und Startskripte; Tokens dunkel/hell mit AA-Prüfung.
- [x] Sechs Bausteine samt Props/Beispielen und sinnvollen Randfalltests.
- [x] Rahmen und Einstellungs-Umschalter; Tagwerk-Inhalt erhalten.
- [x] Vertragsprüfungen, Sicht 1920×1080 hell/dunkel und 390 px, Bildvergleich Tagwerk.
- [x] Bericht mit Belegen, drei Schwächen, Bereinigung; nur Bereich-A-Pfade committen, kein Push.

Lieferung/Props: [README](../../src/instrument/grundlage/README.md).
Prüfungen, Bilder, Bewertung und Grenzen: [Bereich-A-Bericht](../../src/instrument/grundlage/PRUEFUNG.md).
Typecheck/Lint/Source bestanden, 152 Kontrastpaare; Vitest 246/246, zusätzlicher Node-Starttest 12/12.
Eigene Bewertung Welle 1: 9/10; Gesamtseiten erst Welle 2. Kein Push.

Anmeldung, Einstellungs-Innenleben und Zustände bleiben für Welle 2. Kein neuer Anbieter-/Datenanschluss.

### Browser-Findings A

- Port 5231, Harness `watch: null` / HMR aus: während der Implementierung bereits geladene Module blieben im
  Serverspeicher. Wechsel zu Einstellungen meldete fehlendes `useDesign`, obwohl der Export im Quelltext stand.
  Ursache: gemischter alter/neuer Modulstand, nicht fehlender Export. Eigenen Server neu gestartet und normal neu
  geladen. Nach jedem weiteren Quellschritt Server neu starten; denselben Fehler nicht blind wiederholen.
- Erster Hintergrund-Tab wurde vom Host ersetzt; Tabs neu gelesen und danach IDs ausdrücklich mitgegeben.
- Tagwerk-Dunkel-Aufnahmen vor und nach Umbau nach Serverneustart bytegleich (`cmp`, Exit 0).
  Synthetische Person heißt Martha Beispielwald, nicht Martha Sommer; falscher Wartezielname
  verursachte nur eine Prüfzeitüberschreitung. Künftig tatsächliche Überschrift aus Snapshot benutzen.
- Handy-Kopf zunächst zu eng: Ansichtsnamen brachen mitten im Wort. Wahl in eigene volle Zeile gelegt;
  390-px-Bilder danach angesehen, `scrollWidth === 390`. Timeline-Achsenlabels trennten anfangs nicht sauber;
  Heute-Beschriftung rechts von der unveränderten 25-%-Marke, danach 13,203125 px Abstand.
- Randfälle überfällig/heute/+88 Tage und Sommerzeit geprüft, Segments per Tastatur, reduzierte Bewegung,
  Zählwerk-Endwert und 0 laufende Animationen nach Auftritt. Ellipsen-Zählung: Bausteine/Einstellungen 0;
  Übersicht 1 bestehende Dokument-Unterzeile (Bereich B, Welle 2). Keine vollständige App-Abnahme behauptet.
- Finale Bilder unter `.local/instrument-welle1/`, genaue Zuordnung im Bereich-A-Bericht. Temporäre Prüfansicht
  gelöscht, eigene Vite-App beendet, Port 5231 frei und Browser-Werkzeug meldet keine verbleibenden Tabs.

## Abnahme durch den Orchestrator (16.10.2026)

Eigene Aufnahme aller sieben Seiten (Anmeldung, Übersicht, Gespräche, Dokumente, Aufgaben, Einstellungen,
Sachbearbeitung): Instrument dunkel/hell 1920×1080 und 390 px, Tagwerk dunkel/hell gegen Basis `6f4e230`.

| Prüfung | Ergebnis |
| --- | --- |
| Typecheck, Lint, check:source (152 Kontrastpaare), Build | grün |
| Vitest | 246/246 (`--maxWorkers=2`); unter Last 25 brechen einzelne `findBy` ab – Basis ebenso |
| Tagwerk | 12 von 14 Bildern bytegleich; Einstellungen nur um die Zeile „Oberfläche: Tagwerk/Instrument“ ergänzt |
| Instrument | 0 Ellipsen, kein Querscrollen, keine Schrift < 12 px, keine Endlos-Animation |

| Bereich | Note | Beleg / Rest |
| --- | --- | --- |
| A Rahmen, Anmeldung, Einstellungen, Zustände | 8,5 | Iso-Zugangskarte, dichte Einstellungen mit Leitzahlen; Ordnungsnummern entfernt, Einheiten nach Zahl |
| B Übersicht, Aufgaben, Dokumente | 8 | Kennzahl-Leisten, Pflegegrad-Skala, Fristachsen, Statusbalken; Lücke unter der Dokumentkarte |
| C Gespräche und Chat | 8 | ruhige Lesefläche, Composer, Modellkarte; Leerzustand ohne offenes Gespräch sehr groß |
| D Sachbearbeitung | 8 | Fallachsen, Werkbank, Falldialog; Nacharbeit (Einzahl, Doppelzahl, laute Aktionen) erledigt |

Nacharbeit: D (`4e71687`) und A (`65af8c5`) nach Befund; keine Note unter 8, daher keine weitere Runde.

