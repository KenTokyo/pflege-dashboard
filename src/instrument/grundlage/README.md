# Instrument – Vertrag für die Bereiche B–D

Welle 1, Bereich A. Keine NoteTree-Imports oder kopierten Daten-/Geschäftsabläufe.
Alle Bausteine direkt aus ihrer Datei importieren. Die Palette lädt `ThemeProvider`; Komponenten importieren ihr CSS.
Jede CSS-Regel bleibt unter `[data-design='instrument']`. Keine eigenen neutralen Rohfarben in Bereichsdateien.

## Auswahl und Tokens

`import { useDesign } from '../../app/ThemeProvider'`: `{ design, setDesign }`, Werte `tagwerk | instrument`.
Schlüssel `pflege-dashboard:design`, Standard Tagwerk; nur ThemeProvider liest/schreibt den Gerätespeicher.
Beide HTML-Startskripte setzen `data-design` vor dem ersten Bild. `useTheme()` bleibt unverändert.

`tokens.css`: `--bg`, `--surface`, `--surface2`, `--sunken`; `--text`, `--text-muted`, `--text-faint`;
`--border`, `--border-strong`; `--accent`, `--accent-text`, `--accent-soft`, `--on-accent`;
`--danger`, `--warning`, `--success` und jeweils `-soft`.
Sachfarben: `--thing-person`, `--thing-deadline`, `--thing-task`, `--thing-document`, `--thing-conversation`, `--thing-ai`.
Schrift: `--font-body` = System-Grotesk, `--font-mono` mit Menlo/Consolas-Rückfall.
`--shadow` nur hell, `--radius` 20 px, `--radius-sm` 10 px. Akzent Blau; keine weitere Themenauswahl erfunden.
AA-Paare einschließlich aller Text-/Sachfarben auf den vier Grundflächen prüft `npm run check:source`.

## Icon

`import { Icon } from '../grundlage/Icon'`

Props: `name: IconName` (Pflicht), `thing?: Thing`, `size?: number` (18), `label?: string`, `className?: string`.
Ohne `label` dekorativ und vor Screenreadern verborgen, mit `label` ein beschriftetes Bild.
`thing` überschreibt die Sachrolle; Symbole tragen die volle Farbe, Strich 1,5. Kein Lucide für neue Instrument-UI.

```tsx
<Icon name="document" size={18} />
<Icon name="check" thing="task" label="Aufgabe erledigt" />
```

Namen: `person`, `deadline`, `task`, `document`, `conversation`, `ai`, `overview`, `settings`, `sun`, `moon`,
`logout`, `chevron`, `check`, `plus`, `close`, `search`, `arrow`, `shield`, `warning`, `mail`, `menu`, `care`.
Weitere eigene Symbole in der zuständigen Bereichsdatei, fehlende gemeinsame Namen an A melden.

## CardHead

Props: `icon: IconName`, `title: string` (Pflicht), `thing?: Thing`, `subtitle?: ReactNode`,
`count?: number`, `end?: ReactNode`, `id?: string` (am h2), `className?: string`.
Titel und Quelle brechen um; 32-px-Symbolkachel; optional echter Zähler und höchstens eine Aktion rechts.
Die Klasse `in-card` ist die gemeinsame Kartenhülle (ohne Innenpadding); Inhalt separat mit 20 px polstern.

```tsx
<section className="in-card" aria-labelledby="documents-title">
  <CardHead icon="document" title="Dokumente" subtitle="Zuletzt erstellt" count={documents.length} id="documents-title" />
  <div className="documents-body">{/* echte Dokumente */}</div>
</section>
```

## Metric

Props: `value: number`, `label: string` (Pflicht), `unit?: string`, `explanation?: ReactNode`,
`decimals?: number` (0), `tone?: Thing | 'danger' | 'warning' | 'success' | 'accent'`, `className?: string`.
34-px-Mono, kleine Einheit, deutsche Zahlformate. Zählt 760 ms von 0 bzw. dem vorherigen Wert.
Zählwerk nur im sichtbaren Bereich; Ende bei verborgenem Tab, reduzierter Bewegung, Verlassen oder Aushängen.
Screenreader bekommen direkt den echten Endwert. Keine Live-Region für jedes Einzelbild.
Nicht endliche Werte erscheinen als „–“ mit der zugänglichen Beschriftung „Nicht verfügbar“.
Bekannte zählbare Einheiten werden automatisch an die angezeigte Zahl angepasst, auch während des Zählwerks:
Tag/Tage, Minute/Minuten, Stunde/Stunden, Aufgabe/Aufgaben, Version/Versionen, Person/Personen,
Dokument/Dokumente, Gespräch/Gespräche, Modell/Modelle, Fall/Fälle und Anfrage/Anfragen.
Einzahl oder Mehrzahl darf übergeben werden; feste Angaben wie `kg`, `%` und `von 5` bleiben unverändert.

```tsx
<Metric value={openTasks.length} unit="Aufgaben" label="Offen" explanation="Nach Fälligkeit sortiert" tone="task" />
```

## Timeline

Props: `items: readonly TimelineItem[]` (Pflicht), `today?: string | Date` (jetzt),
`label?: string` (Termine im Zeitverlauf), `className?: string`.
Item: `{ id: string, date: string | Date, label: string, description?: ReactNode, thing?: Thing }`.
Datumsstrings als `YYYY-MM-DD` oder ISO-Zeitpunkt; bei Kalendertagen wird lokale Mittagzeit benutzt.
Feste Skala −14 bis +42 Tage, Heute immer bei 25 %. Vergangenheit links; ferne Termine als Randpunkt mit Pfeil.
Das echte Datum und der Abstand bleiben immer lesbar, keine abgeschnittene Beschriftung.
Sortiert aufsteigend, verändert das übergebene Array nicht. Kein Polling; nach Tageswechsel bei Navigation neu rendern.
Abstände heißen „Seit 1 Tag überfällig“ / „Seit 2 Tagen überfällig“ und „In 1 Tag“ / „In 2 Tagen“.
Regression: `node --test src/instrument/grundlage/wording.test.mjs`.

```tsx
<Timeline today="2026-10-16" items={tasks.filter(task => task.due_at !== null).map(task => ({
  id: task.id, date: task.due_at!, label: task.title, thing: 'deadline',
}))} />
```

Nur Einträge mit tatsächlich vorhandenem Datum übergeben. Leere/Fehler-Zustände liefert die Bereichsseite.

## Segments

Generisch über String-Werte. Props: `label: string`, `value: T`, `options: readonly SegmentOption<T>[]`,
`onChange: (value: T) => void` (Pflicht), `className?: string`.
Option: `{ value: T, label: ReactNode, disabled?: boolean }`. Gleiche Zellbreiten, gleitende Auswahl (180 ms).
Buttons mit `aria-pressed`; Pfeil links/rechts und Home/End überspringen deaktivierte Optionen. Kontrollierter Wert.

```tsx
<Segments label="Ansicht wählen" value={view} onChange={setView}
  options={[{ value: 'offen', label: 'Offen' }, { value: 'alle', label: 'Alle' }]} />
```

## Reveal

Props: normale `div`-Attribute plus `stage?: 'frame' | 'head' | 'metric' | 'data' | 'action'` (frame),
`index?: number` (0), `children`, `className`, `style`.
Schnittfolge mit 60 ms Versatz je Index, Phasen 0/110/220/340/460 ms, Schärfe zieht nach.
Endzustand ist die Grundregel, kein `forwards`; reduzierte Bewegung = reines Einblenden (160 ms).
Kein Blur auf laufendem Lese-/Schreibtext; nur die neue Fläche beim einmaligen Auftritt umhüllen.

```tsx
<Reveal index={0} stage="frame">
  <section className="in-card">
    <Reveal stage="head"><CardHead icon="task" title="Aufgaben" /></Reveal>
    <Reveal stage="metric"><Metric value={2} label="Offen" unit="Aufgaben" /></Reveal>
    <Reveal stage="data">{/* eigenes Datenbild */}</Reveal>
    <Reveal stage="action">{/* eine Hauptaktion */}</Reveal>
  </section>
</Reveal>
```

Neue Seite: vorhandene Hooks aufrufen; Shell einmal verwenden; `useDesign()`-Weiche in der vorhandenen Seite.
Rahmen nutzt die vorhandenen Listen-Hooks mit gemeinsamem Query-Cache. Im Handy-Kopf bleiben Einstellungen,
Ansicht, Theme und Konto erreichbar. Anmeldung/Einstellungs-Innenleben/Zustände werden erst in Welle 2 gestaltet.

## Prüfbelege

Zusätzlicher Starttest: `node --test src/instrument/grundlage/startup.test.mjs` (12 Fälle für beide echten HTML-Skripte).
Browser-Randfälle, Bildpfade, Messwerte, Grenzen und Bewertung stehen in [PRUEFUNG.md](PRUEFUNG.md).

## Ergänzungen aus Welle 2 (A)

`controls.css`: eigene Instrument-Knöpfe (`in-button`, `in-button-primary`), Felder (`in-field`,
`in-field-label`, `in-input`, `in-input-invalid`, `in-textarea`), Hinweise (`in-hint`, `in-notice`)
und Zustandsmarken (`in-badge`, `in-badge-good`). Nur importieren, wenn verwendet.
Optional `tone="danger" | "warning" | "success"` für echte Zustände; Sachrolle bleibt sonst erhalten.
Eigene Icons zusätzlich: `lock`, `edit`, `reset`, `globe`.
Die Seitenleiste zeigt ausschließlich echte Datenzähler; keine Ordnungsnummern.
`ConfigMissing` liefert seinen Darstellungs-Kontext selbst, weil es vor `App` gerendert wird.
Anmeldung/Einstellungen/Zustände und ihre Sichtbelege: `../anmeldung/PRUEFUNG.md`.
