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
- [ ] Welle 1: A Grundlage und Rahmen
- [ ] Welle 2: A Anmeldung/Einstellungen/Zustände, B, C, D
- [ ] Orchestrator: Aufnahmen aller Seiten (Instrument hell/dunkel/Handy, Tagwerk unverändert), Noten, Nacharbeit
- [ ] Commit und Push auf `main` (Vercel)
