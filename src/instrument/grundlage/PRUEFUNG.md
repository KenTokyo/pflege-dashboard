# Instrument – Bereich A, Welle 1

Stand: 16.10.2026. Basis `1ce6c50`. Nur Grundlage und Rahmen; kein Push und keine Veröffentlichung.
Der komplette Seitenumbau ist Welle 2. Die Übersichtsbilder zeigen deshalb noch deren bisherigen Inneninhalt.

## Lieferung und Besitz

| Dateien | Ergebnis |
| --- | --- |
| `src/lib/design.ts`, `src/app/ThemeProvider.tsx` | Wahl `tagwerk` / `instrument`, Standard Tagwerk, `useDesign()`, geräteweit gespeichert |
| `index.html`, `tests/harness/index.html` | Design und Theme vor dem ersten Bild; ungültiger/gesperrter Speicher verhindert den Start nicht |
| `grundlage/tokens.css` | Vollständige eigene helle/dunkle Palette, ein blauer Akzent, sechs Sachfarben, kein Pink |
| `grundlage/Icon.tsx` | 22 eigene Symbole, Strich 1,5, volle Sachfarbe, optionale zugängliche Beschriftung |
| `grundlage/CardHead.tsx`, `primitives.css` | 32-px-Kachel, Titel, Unterzeile, echter Zähler und übergebene Aktion |
| `grundlage/Metric.tsx` | 34-px-Mono, deutsche Zahlen, endliches Zählwerk, echter Endwert für Screenreader |
| `grundlage/Timeline.tsx`, `timeline.css` | Heute fest bei 25 %, Vergangenheit links, ferne Termine mit Randpfeil und echtem Datum |
| `grundlage/Segments.tsx` | Kontrollierte Auswahl, gleitender Marker, Pfeiltasten/Home/End, deaktivierte Optionen überspringen |
| `grundlage/Reveal.tsx`, `motion.css` | Einmalige Schnittfolge, Endzustand als Grundregel, reduzierte Bewegung nur als Einblenden |
| `grundlage/DesignSwitch.tsx`, Weiche in `src/routes/SettingsPage.tsx` | Wählbare Oberfläche unter „Darstellung und Sitzung“; Innenleben erst Welle 2 |
| `rahmen/InstrumentShell.tsx`, `rahmen.css`, `mobile.css` | Seitenleiste, Kopf, bestehende Ansichtswechsel, Konto, Theme, Handy-Leiste |
| `rahmen/InstrumentDemoBanner.tsx`, `banner.css` | Pflichttext der Demo im neuen Stil |
| Weichen in `src/components/Shell.tsx`, `DemoBanner.tsx` | Bestehende Tagwerk-Ausgabe erhalten; keine Geschäftsabläufe kopiert |
| `tools/check-source.mjs` | Instrument-Kontrastpaare, Schriftprüfung, Dateigrenze 400 Zeilen für neue Instrument-Dateien |
| `grundlage/startup.test.mjs`, `README.md`, dieser Bericht, Aufgabenfile | Start-Randfälle, Props/Beispiele, Übergabe und Phasenstand |

Pfadkürzel `grundlage/` und `rahmen/` beziehen sich auf `src/instrument/`.
Die Listen-Zähler kommen aus `useConversations`, `useDocuments`, `useOpenTasks` und deren bestehendem Query-Cache.
Keine NoteTree-Imports, neuen Anbieteranschlüsse oder kopierten Datenabläufe.

## Automatische Prüfungen

| Befehl | Ergebnis |
| --- | --- |
| `npm run typecheck` | Bestanden |
| `npm run lint` | Bestanden |
| `npm run check:source` | Bestanden: 88 Quelldateien, 152 Kontrastpaare hell/dunkel; davon 106 für Instrument |
| `npx vitest run --maxWorkers=4 --testTimeout=30000` | 21 Dateien, 246 Tests bestanden; letzter Lauf 9,81 s |
| `node --test src/instrument/grundlage/startup.test.mjs` | 12/12 bestanden; führt beide echten HTML-Startskripte mit Node aus |
| `git diff --check` | Bestanden vor Abschluss |
| `git log 1ce6c50..main` | Vor Abschluss keine zwischenzeitlichen fremden Commits |

Ausgangsstand ebenfalls geprüft: Typecheck, Lint, Source grün; 246 Tests bestanden.
Vitest meldet wie im Ausgangsstand jsdoms nicht implementiertes `scrollTo`, ohne fehlgeschlagene Tests.
Der zusätzliche Node-Test prüft Erstbesuch, gespeichertes Design/Theme, ungültige Werte und gesperrten Speicher.
Er gehört nicht zu den 246 Vitest-Tests und läuft mit dem eigenen Befehl.

## Tatsächliche Browserprüfung

Nur TreeChat-`browser_*`, eigene Prüf-App `npx vite --config vite.harness.config.ts --port 5231`.
Desktop 1920×1080 hell/dunkel; Handy 390×844 hell/dunkel. Ausschließlich ausdrücklich synthetischer Harness-Login.
Vorhandene gefüllte Übersicht mit Aufgaben, Dokument und Gespräch gesehen; keine reine Leerzustandsprüfung.
Die sechs Bausteine zusätzlich mit einer vorübergehenden lokalen Prüfansicht ausgeführt. Diese wurde entfernt;
sie ist keine Produktseite und ihre als Prüfwerte beschrifteten Daten sind kein angeblicher Live-Datenbestand.

| Prüfung | Beobachtung / Messwert |
| --- | --- |
| Umschalter | Tagwerk → Instrument → Tagwerk; Design nach normalem Neuladen erhalten, Theme unabhängig |
| Rahmen | Übersicht, Einstellungen, Dokumente, Aufgaben, Gespräche und Sachbearbeiter-Einstieg über vorhandene Links erreichbar |
| Handy | Einstellungen/Theme/Konto im Kopf; Auswahl auch nach Scrollen oberhalb der festen Handy-Leiste erreichbar |
| Konto | Öffnen und Schließen, Escape schließt; Abmeldung nutzt weiterhin `signOut('manual')` |
| Breite | `document.documentElement.scrollWidth`: 1920 bei 1920, 390 bei 390; kein horizontaler Seitenüberlauf |
| Timeline | −3 Tage links, 0 Tage genau bei 25 %, +88 Tage rechts am Rand 98 %; weit vergangen am Rand 2 % |
| Kalender | Tagesabstand über Sommerzeitwechsel = 1; Kalendertage lokal geparst, kein Millisekundenversatz |
| Timeline am Handy | Abstand zwischen „−14 Tage“ und „Heute“ nach Nacharbeit 13,203125 px |
| Segments | End → „Offen“, gesperrte Option übersprungen; zwei rechte Pfeiltasten → „Alle“ |
| Metric | Wechsel 1.204 ↔ 7,4 erreicht Endwert; mit reduzierter Bewegung direkt beendet |
| Reduzierte Bewegung | `matchMedia` wahr; Reveal verwendet `instrument-fade`, kein Blur-/Bewegungsauftritt |
| Ruhe nach Auftritt | 0 laufende Animationen nach 1.500 ms in Prüfansicht; nach normalem App-Reload 0 nach 1.300 ms |
| Symbolknöpfe | Kundenansicht und Sachbearbeiter-Test: Mitteldifferenz 0 px, Abstand 7 px, Inhalt mittig 0 px Abweichung |
| Symbolknopf Prüfaktion | Mitteldifferenz 0 px, Abstand 8 px, Inhalt mittig; Ausschnitt 4× geöffnet |
| Tagwerk-Vergleich | Übersicht Desktop dunkel vorher/nachher bytegleich (`cmp`, Exit 0) |

Ellipsen-Befehl aus `GEMEINSAM.md`, jeweils auf der geladenen Ansicht:

```js
[...document.querySelectorAll('*')]
  .filter(e => getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth)
  .map(e => e.textContent)
```

- Neue Bausteinansicht am Handy: **0**. Einstellungen am Handy: **0**.
- Übersicht am Handy: **1** bestehender Dokument-Nebentext (`Widerspruch · Martha Beispielwald · 06.10.`).
  Das ist Bereich B, Welle 2; keine Aussage „die gesamte App schneidet nichts ab“.

Kein Pixelvergleich aller Tagwerk-Seiten oder von Tagwerk hell/Handy. Die neue Einstellungszeile ist die beauftragte
Erweiterung und ändert dort zwangsläufig die Seitenhöhe. Keine Live-/Provider-/Supabase-Abnahme durchgeführt.
Keine CPU-Dauermessung im Vorder-/Hintergrund; 0 laufende Animationen belegt nur das Ende der Auftrittsanimationen.

## Bilder

Alle Aufnahmen geöffnet und angesehen. Lokal unter `.local/instrument-welle1/`, bewusst nicht im Commit.
Links gelten im gemeinsamen Checkout; der Bericht behauptet keine veröffentlichten Bild-URLs.

| Beleg | Datei |
| --- | --- |
| Echter Rahmen dunkel 1920×1080 | [rahmen-dunkel.png](../../../.local/instrument-welle1/rahmen-dunkel.png) |
| Echter Rahmen hell 1920×1080 | [rahmen-hell.png](../../../.local/instrument-welle1/rahmen-hell.png) |
| Handy-Rahmen dunkel | [rahmen-handy-dunkel.png](../../../.local/instrument-welle1/rahmen-handy-dunkel.png) |
| Handy-Rahmen hell, Einstellungen | [rahmen-handy-hell.png](../../../.local/instrument-welle1/rahmen-handy-hell.png) |
| Sechs Bausteine dunkel | [bausteine-dunkel.png](../../../.local/instrument-welle1/bausteine-dunkel.png) |
| Sechs Bausteine hell | [bausteine-hell.png](../../../.local/instrument-welle1/bausteine-hell.png) |
| Bausteine Handy | [bausteine-handy.png](../../../.local/instrument-welle1/bausteine-handy.png) |
| Handy-Umschalter nach Scrollen | [umschalter-handy.png](../../../.local/instrument-welle1/umschalter-handy.png) |
| Symbolknopf 4× | [symbolknopf-4x.png](../../../.local/instrument-welle1/symbolknopf-4x.png) |
| Tagwerk vor Umbau | [tagwerk-vorher.png](../../../.local/instrument-welle1/tagwerk-vorher.png) |
| Tagwerk nach Umbau | [tagwerk-nachher.png](../../../.local/instrument-welle1/tagwerk-nachher.png) |

Helles Rahmenbild und Handy-Bausteinbild entstanden vor der letzten Änderung des Gefahr-Rots zu Korallrot;
deren Layout ist unverändert. Letzte Palette ist in den beiden Desktop-Bausteinbildern und dem dunklen Rahmenbild.

## Bewertung und Nacharbeit

Eigene Einschätzung **9/10 für den Welle-1-Umfang**, keine Note für das komplette Redesign.
Start bei 5. Vergleich mit `c4-tenet-vertragstabelle.jpg`, dem Seitenleisten-Ausschnitt und dem hellen Instrument-Entwurf:

| Punkt über 5 | Sichtbarer Beleg |
| --- | --- |
| +1 Flächen und Hierarchie | `bausteine-dunkel.png`: dunkle Karte auf matter Bühne, feine Linien, Radius 20, Kopfkachel 32 |
| +1 Präzise Schrift und Sachfarben | Beide Bausteinbilder: 34-px-Mono, kleine Einheit, sechs klar farbige eigene Symbole; keine Courier-Serifen |
| +1 Wahres Datenbild | Bausteinbilder: feste Heute-Spalte, Vergangenheit links, fernes Datum vollständig und Randpfeil sichtbar |
| +1 Ruhiger, nutzbarer Rahmen in beiden Größen | Rahmenbilder: dichte Navigation, echte Zähler, Inhalt ohne zusätzliche Breitenbegrenzung; Handy-Kopf und Leiste trennen die Bedienwege |

Vor Nacharbeit: Handy-Rahmen **7/10** (Ansichtsnamen zerbrachen), Handy-Timeline **8/10** (Achsenlabels berührten sich).
Danach für diese beiden Welle-1-Flächen jeweils **9/10**: Ansichtswahl in eigener voller Zeile; Heute-Label rechts an
der festen Marke, gemessene Lücke. Desktop-Rahmen und Bausteine jeweils **9/10** im genannten Umfang.
Die Prüfung orientiert sich an der Materialität und Präzision der Vorbilder; deren Vertragsdaten werden nicht kopiert.

Drei schwächste Stellen, damit die nächste Welle gezielt weiterarbeitet:

1. **Gesamtseite noch gemischt:** `rahmen-dunkel.png` zeigt neue Hülle mit bisherigen Übersichtskarten, wiederholter
   Frist und großer Restfläche. Das ist noch keine fertige Instrument-Übersicht; Bereich B muss den Inhalt neu ordnen.
2. **Modellliste am Handy gedrängt:** oberer Teil von `umschalter-handy.png` zeigt alte Modellnamen/Badges in engem
   Layout. Bereich A gestaltet das Einstellungs-Innenleben in Welle 2. Der neue Umschalter selbst bleibt vollständig.
3. **Ferne Zeitpunkte verdichtet:** `bausteine-handy.png` / `bausteine-dunkel.png`: +88 Tage sitzt am Skalenrand.
   Pfeil und Datum machen die Begrenzung ehrlich; mehrere ferne Termine werden nicht proportional voneinander
   getrennt. Absicht der festen −14/+42-Tage-Skala, bei langen Listen später fachlich passend gruppieren.

## Bereinigung / Übergabe

- Temporäre TSX-Prüfansicht entfernt; keine Prüfdaten in Produktseiten eingebaut.
- Eigener Vite-Prozess beendet, Port 5231 ohne Listener (`lsof`, Exit 1).
- `browser_tabs` meldet `tabs: []`; keine eigenen Prüftabs verbleiben.
- B–D können die exakten Bausteine und Tokens aus [README.md](README.md) verwenden.
- Anmeldung, Einstellungen-Innenleben und Zustände ausdrücklich Welle 2. Keine fremden Pfade bearbeitet.
