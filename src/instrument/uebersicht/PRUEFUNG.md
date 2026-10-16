# Instrument · Bereich B

Basis: `7bd021e92bf13606fac79e919d340a1b75f0a253`, main. Besitz ausschließlich Übersicht, Aufgaben, Dokumente und ihre drei Seitenweichen.

## Inhaltskarte (vor dem Code)

| Fläche | Frage | Leitzahl / Datenbild | Aktion |
| --- | --- | --- | --- |
| Übersicht · Kennzahlleiste | Wie groß ist mein Bestand? | Personen, offene Aufgaben, Dokumente; echte Hook-Daten, Zahl + Einheit | keine zusätzliche Aktion |
| Übersicht · Personen | Für wen organisiere ich Pflege? | Pflegegrad je Person, sechsteilige Skala 0–5; Kasse und Alter | personenbezogenes Gespräch öffnen |
| Übersicht · Fristen | Was muss zuerst geschehen? | überfällige Aufgaben; gemeinsame Timeline −14/+42 mit Heute bei 25 % | Aufgaben öffnen |
| Übersicht · Dokumente | Was muss geprüft werden? | Entwürfe; Statusverteilung und letzte Dokumente | Dokumente öffnen |
| Übersicht · Gespräche | Welche Gespräche kann ich fortsetzen? | aktive Gespräche, Liste mit Datum und Personenbezug | Frage stellen (vorhandener Start-Hook) |
| Aufgaben · Kennzahlleiste | Wo besteht Handlungsbedarf? | überfällig / heute bis +7 Tage / ohne Termin; disjunkte Mengen | keine zusätzliche Aktion |
| Aufgaben · Arbeitsliste | Was ist fällig und woher stammt die Frist? | gefilterte Treffer, Prioritätsstriche, echte Quelle / Beschreibung, feste Timeline | vorhandenes Quellgespräch öffnen, falls vorhanden |
| Dokumente · Kennzahlleiste | In welchem Bearbeitungsstand sind die Schreiben? | Entwurf / geprüft / versendet aus bestehendem Zählhelfer | keine zusätzliche Aktion |
| Dokumente · Register | Welches Schreiben möchte ich prüfen? | Trefferzahl, Statusverteilung, Auswahlregister und direkt lesbarer Originaltext | Dokument auswählen, Status manuell setzen |

Keine Frist auf Personenkarten: Datumsdetail nur in der Timeline. Keine erfundenen Bearbeitungsquoten, Beträge oder Leistungen.
Leere und unbekannte Daten werden unterschieden; bei Fehlern keine Null-Kennzahl behaupten.

## Plan

- [x] Vertrag, Modellregeln, Stilquellen und vorhandene Bausteine lesen.
- [x] Tagwerk-Basisbilder aufnehmen, vor Code Node-Prüfungen ausführen.
- [x] Neue Instrument-Komponenten bauen, ausschließlich Weichen in Tagwerk-Seiten.
- [x] Typecheck, Lint, Source-Check und Vitest mit begrenzten Workern.
- [x] Hintergrundbrowser Port 5232: 1920×1080 hell/dunkel und 390; echte Inhalte, lange/leere Daten, Filter, Status, Frage.
- [x] Animationen nach Auftritt 0, Ellipsen messen, Fristrichtung, Symbolknöpfe ±0,5 px / 6–8 px prüfen.
- [x] Tagwerk-Bilder vergleichen, Bildsicht und ehrliche Noten mit drei Schwächen dokumentieren.
- [x] Fremde neue Commits lesen, nur eigene Pfade committen, kein Push; Server/Tab schließen.

## Browser-Findings

A übernommen: Harness ohne HMR/Watcher; nach Codeänderungen eigenen Server neu starten und normal laden. Tatsächliche Person Martha Beispielwald. Explizite Tab-ID verwenden. Kein eigener Chrome.

## Lieferung

- `uebersicht/InstrumentDashboard.tsx`: breite Kopfleiste, vier Arbeitskarten im zweispaltigen Raster.
- `PeoplePanel.tsx`: Personen, Pflegegrad mit Skala 0–5, echte Pflegekasse und Zusammenfassung, Gesprächseinstieg.
- `ConversationsPanel.tsx`: echte Gesprächsliste, eigene statische Iso-Zeichnung, nutzbarer Frage-Einstieg.
- `Panel.tsx`, `workspace.css`, `uebersicht.css`: Bereich-B-Raster und Karten auf den gemeinsamen Bausteinen.
- `aufgaben/InstrumentTasks.tsx`, `aufgaben.css`: Arbeitsliste, Prioritätsstriche, Quellgespräch und feste Fristachse.
- `dokumente/InstrumentDocuments.tsx`, `dokumente.css`: auswählbares Register mit direkt lesbarem Schreiben,
  manuell gesetztem Status und funktionsfähigen Filtern. Der Link aus der Übersicht wählt auch Dokument 2 richtig.
- `dokumente/StatusDistribution.tsx`: geteiltes, wirklich aus dem Dokumentbestand berechnetes Datenbild.
- Drei Seitenweichen in `DashboardPage.tsx`, `TasksPage.tsx`, `DocumentsPage.tsx`.

Alle sechs Bausteine aus A verwendet: Icon, CardHead, Metric, Timeline, Segments und Reveal.
Keine Grundlage-/Rahmen-Datei und kein gemeinsames Prüfwerkzeug durch B geändert.
Fehlende Sonderbausteine: Statusverteilung und Bereichskarte liegen bewusst in B; keine zweite Token- oder Icon-Sammlung.

Die bisher in Tagwerk eingebettete Frage-Logik wurde unverändert in `useOverviewQuestion.ts` herausgezogen,
separater Commit **d40dde5**. Beide Designs verwenden denselben tatsächlichen Gesprächsstart.
Keine neue Datenquelle, kein neuer Versand und keine neue Fristberechnung.

## Vertragsprüfungen

Abschlusslauf nach dem letzten eigenen Quellschritt, 16.10.2026, lokal auf main:

| Befehl | Ergebnis | Beleg |
| --- | --- | --- |
| `npm run typecheck` | Exit 0 | `.local/instrument-b/typecheck-acceptance.log` |
| `npm run lint` | Exit 0, vollständiger Lauf | `.local/instrument-b/lint-acceptance.log` |
| `npm run check:source` | Exit 0, 132 Dateien, 152 Kontrastpaare hell/dunkel | `.local/instrument-b/source-acceptance.log` |
| `npx vitest run --maxWorkers=4 --testTimeout=30000` | Exit 0, 246/246 Tests in 21 Dateien | `.local/instrument-b/vitest-acceptance.log` |
| `git diff --check -- <B-Pfade>` | Exit 0 | eigener Diff geprüft |
| Zeilenprüfung der zwölf eigenen TS/TSX/CSS-Dateien | alle unter 400 Zeilen, keine Zeile über 160 Zeichen | längste Datei `dokumente.css`: 321 Zeilen |

Maschinenlesbare Exitcodes: `.local/instrument-b/checks.json`.
Die vorhandenen jsdom-Tests melden weiterhin „Window scrollTo not implemented“; alle Tests bestehen.
Vorübergehend erfasste der vollständige Lint fremde temporäre `.local`-Prüfdateien. Der Abschlusslauf braucht keinen Ausschluss mehr.

## Browser und tatsächlich ausgeführte Abläufe

Start: `npx vite --config vite.harness.config.ts --port 5232`, ausschließlich TreeChat-Hintergrundbrowser.
Vorhandene synthetische Harness-Anmeldung; kein echtes Konto, keine Anbieteranfrage und keine Zugangsdaten aus anderen Projekten.
Normales Neuladen nach Serverneustart. Kein Preview-Build als Ersatz für diesen Startweg.

| Ablauf | Beobachtetes Ergebnis / Bild |
| --- | --- |
| Alle drei Seiten, 1920×1080, hell und dunkel | fertig geladene Inhalte selbst angesehen; sechs Desktopbilder unten |
| Alle drei Seiten, 390×844, hell und dunkel | sechs vollständige Scrollbilder selbst angesehen; Breite jeweils 390 |
| Aufgabenfilter mit `?szenario=lang` | Alle 5, Dringend 3, Nächste 7 Tage 3; bestehende Filterbedeutung erhalten |
| Fristbild −3 Tage / heute / morgen / +88 Tage | Vergangenheit links; Heute fest bei 25 %; −3 = 19,6429 %, morgen = 26,7857 %, +88 am 98-%-Rand mit Fernmarke; `far.png` |
| Dokumentstatus Entwurf → Geprüft | tatsächlicher Schreib-Hook, Auswahl danach `reviewed`; Geprüft zeigt 1, Entwurf leer |
| Registerwahl Dokument 2 mit langem Titel | richtiges Schreiben samt Originaltext, Person und Status sichtbar; `long-documents.png` |
| Übersicht → Dokument 2 | URL `#dok-63000000-0000-4000-8000-000000000001`, richtige Auswahl im Register |
| Frage in der Übersicht | Frage abgeschickt, synthetisches Gespräch mit Martha und fertige Antwort erreicht; `question-complete.png` |
| Personenbezug mit langem Namen | vollständiger Name zusätzlich unter der nativen Auswahl lesbar; `selected-person.png` |
| Leerer Bestand | drei echte Leerzustände; `empty-overview.png`, `empty-tasks.png`, `empty-documents.png` |
| Ladefehler / noch ladend | echte Hook-Zustände über isolierten Testadapter; unbekannte Kennzahlen „–“, keine erfundene 0; `error-state.png`, `loading-state.png` |
| Aufgaben ohne Termine | Liste bleibt nutzbar; Übersicht behauptet keinen Termin; `without-dates.png` |

Randfälle `far`, `withoutdates`, `error`, `loading` wurden nur über eine ignorierte lokale Vite-Prüfkonfiguration
in die vorhandene synthetische Datenquelle eingespeist. Keine produktive Seite und keine fremde Harness-Datei verändert.
Die Konfiguration ist als inaktive `probe.vite.config.ts.txt` dokumentiert; kein weiterer Server läuft.

### Bewegung und Geometrie

- Alle drei Seiten nach Auftritt: **`document.getAnimations().length === 0`** in Hell/Dunkel, Desktop/Handy.
- Letzte gesonderte Prüfung mit langen Inhalten auf 390: je Seite nach 1600 ms **0**, nach Scrollen und weiteren
  1600 ms erneut **0**. Die Stichproben nach nur 1000 ms enthielten noch endliche Auftrittsanimationen;
  diese wurden ausdrücklich nicht als Leerlauf gewertet.
- Keine neue Endlosschleife, kein Polling. Zählwerk und Auftritt kommen aus A und enden.
  Keine dauerhafte CPU-Einsparung behauptet; warme CPU-Vergleichsmessung war nicht Gegenstand dieses Nachweises.
- Ellipsenprüfung exakt nach `GEMEINSAM.md`: jeweils **`[]` / 0** auf allen drei Seiten bei 390,
  hell/dunkel sowie mit langen Inhalten. `document.documentElement.scrollWidth === 390`.
- Desktopbreite 1920; Inhalt beginnt bei x292, endet x1888: volle nutzbare Fläche neben der Seitenleiste,
  32 px Außenrand. Kein schmaler Mittelcontainer.
- Übersicht: obere Karten beide 451,875 px, untere beide 455,1875 px hoch. Keine äußere Lücke unter einer Spalte.
- Eigene Symbolknöpfe „Zur Person fragen“, „Aufgaben öffnen“, „Dokumente öffnen“, „Fragen“,
  „Quellgespräch öffnen“ und Dokumenttext: Symbol-/Textmitte **Δy 0 px**, Abstand **7 px**;
  Hauptaktionen innen mittig. Registerzeile: Δy 0 px, Abstand 7 px, bewusst linksbündige Listenauswahl.
- 4×-Ausschnitte selbst angesehen: `symbolknoepfe-4x.png` (fünf unveränderte Aktionen plus früherer Textname),
  `dokumenttext-4x.png` und `registerknopf-4x.png` (finaler Stand).
- Wiederholungen durchgelesen: Datumsfrist ausschließlich in der jeweiligen Timeline, nicht zusätzlich auf
  Personenkarten. Auf Aufgaben erscheint der zugehörige Titel in Liste und Timeline, genau zweimal.
  Sachbezogene Symbole verwenden die volle Tokenfarbe, keine graue Abblendung.

## Bilder und Sichtabnahme

Alle Pfade relativ zum Projekt: `.local/instrument-b/`. Prüfbilder bleiben lokal und werden nicht mitcommittet.

| Seite | 1920×1080 dunkel | 1920×1080 hell | 390 dunkel / hell |
| --- | --- | --- | --- |
| Übersicht | `dashboard-dark.png` | `dashboard-light.png` | `dashboard-mobile-dark.png`, `dashboard-mobile-light.png` |
| Aufgaben | `tasks-dark.png` | `tasks-light.png` | `tasks-mobile-dark.png`, `tasks-mobile-light.png` |
| Dokumente | `documents-dark.png` | `documents-light.png` | `documents-mobile-dark.png`, `documents-mobile-light.png` |

Die 390-Bilder sind vollständige Scrollbilder bei 390×844 Fenstergröße: Übersicht 2525 px,
Aufgaben 1656 px, Dokumente 1617 px Gesamthöhe. Die feste Handy-Navigation erscheint in solchen Aufnahmen
mitten im langen Bild; beim echten Scrollen geprüft, kein dauerhaft verdeckter Seitenabschnitt.
Zusätzliche Gesamtsicht: `mobile-final-light.png`, `mobile-final-dark.png`.
Lange Inhalte: `long-overview.png`, `long-tasks.png`, `long-documents.png`.

Stilquelle neben eigener 1920er-Seite angesehen: `stilvergleich.png`,
Referenz `c4-tenet-vertragstabelle.jpg`; zusätzlich heller Instrument-Entwurf und Vigil-/Iso-Motive gelesen.
Große Mono-Zahlen, volle Sachfarben, feine Teilungslinien, weiße bzw. dunkle Arbeitskarten und konkrete Datenbilder
übernommen. Es bleibt eine ruhigere, bei zwei Aufgaben weniger dicht besetzte Arbeitsfläche als die Tenet-Tabelle.

### Tagwerk

Vorher-/Nachher-Paare, jeweils 1920×1080 dunkel, normaler Seed-Bestand, nach beendetem Auftritt:

- `cmp .local/instrument-b/baseline-dashboard.png .local/instrument-b/after-dashboard.png` → **Exit 0**
- `cmp .local/instrument-b/baseline-tasks.png .local/instrument-b/after-tasks.png` → **Exit 0**
- `cmp .local/instrument-b/baseline-documents.png .local/instrument-b/after-documents.png` → **Exit 0**

Erneut am Abschlussstand aufgenommen: alle drei Paare **bytegleich**, damit auch pixelgleich.
Kein Anspruch auf einen Bildvergleich sämtlicher Tagwerk-Zustände oder des fremden Bereichs.

## Ehrliche Gestaltungseinschätzung

Start jeweils **5/10**; Zusatzpunkte sind eine gestalterische Einschätzung, keine Messwahrscheinlichkeit.

| Seite | Bildbelege für Punkte über 5 | Note |
| --- | --- | --- |
| Übersicht | +1 klare Kennzahlhierarchie; +1 Pflegegrad und echte Fristgeometrie; +1 Sachfarben und fluchtendes, gleich hohes Raster; +0,5 handytaugliche Inhalte und ruhiger Abschluss | **8,5/10** |
| Aufgaben | +1 klare Zählleiste; +1 Arbeitsliste und Quellbezug; +1 feste Zeitachse statt bloßer Datums-Chips; +0,5 präzise Symbolaktionen und saubere Hell-/Dunkel-Fassung | **8,5/10** |
| Dokumente | +1 echte Zustandsverteilung; +1 Register mit nutzbarem Originaltext; +1 manuelle Aktion klar getrennt vom tatsächlichen Versand; +0,5 volle lange Titel und saubere mobile Folge | **8,5/10** |

**Drei schwächste Stellen:**

1. **Übersicht reicht bei 1080 Höhe unter den ersten Bildausschnitt.** Die untere Aktion braucht etwa 127 px
   Scrollweg; die Desktop-Gesamtsicht ist weniger unmittelbar als beim Vorbild.
   Belege: `dashboard-light.png`, `overview-bottom.png`, `dashboard-mobile-light.png`.
2. **Dokumentregister mit nur einem Schreiben wirkt links dünn besetzt.** Der verfügbare Originaltext ist kurz;
   die echte 100-%-Entwurfsverteilung ist wenig differenziert. Keine zusätzlichen Inhalte erfunden.
   Belege: `documents-light.png`, `documents-dark.png`.
3. **Aufgaben am Handy priorisieren die Arbeitsliste vor der Achse.** Bei langen Beschreibungen wird der
   Zeitvergleich erst weiter unten erreicht. Die Quelle und Handlung bleiben dafür direkt am Eintrag.
   Belege: `tasks-mobile-light.png`, `long-tasks.png`.

Damit wird kein belegtes Award-Niveau von 9/10 behauptet. Die Lieferung ist geprüft und klar höherwertig als
bloßes Umfärben; die verbleibende Differenz zur Stilquelle ist oben benannt.

## Browser-Findings für die Übergabe

- Servercache aus A bestätigt: nach Quellschritten eigener Neustart statt gemischte Module weiterzuprüfen.
- Tagwerk hat andere zugängliche Überschriften und einen anderen Namen für den Theme-Knopf;
  nicht mit Instrument-Wartezielen prüfen. Ein falsches Warteziel bedeutete keinen fehlgeschlagenen Login.
- Host-Tabs verschwanden bei einzelnen längeren Sequenzen. Nach `browser_tabs` ohne Tab neu geöffnet,
  keine blinde Wiederholung und kein sichtbarer Ersatzbrowser.
- `kind: debug` liefert Bilddaten ohne gespeicherten Pfad; für den abschließenden Dateivergleich
  `kind: proof` genutzt und die drei `cmp`-Läufe tatsächlich wiederholt.
- Beim Statusprüfskript war `window.__harness.calls` ein Objekt statt einer Liste. Der Status war bereits
  gespeichert; danach nur die aktuelle Auswahl geprüft, Mutation nicht doppelt ausgeführt.
- Ein Schließen lief in eine Werkzeug-Zeitüberschreitung. `browser_tabs` zeigte den noch lebenden eigenen Tab;
  ihn anschließend gezielt geschlossen. Abschluss: **keine Tabs**, Port **5232 frei** (`lsof` ohne Treffer).

## Parallelstand und Git

Vor Abschluss `git log 7bd021e..main` gelesen: **427bfc4**, **4e71687** (D), **4bc06a2** (A), **86b86ae** (C),
plus eigener Logik-Commit **d40dde5**. A ergänzt kompatible Icons und Zustände, entfernt funktionslose Nav-Zahlen;
C stellt den Zielchat um. B nutzt diese Quellen weiter; die vollständigen Tests laufen mit diesen Änderungen.
Weitere laufende Nacharbeiten an A-Metric/Timeline (Einzahl während des Zählens, „In 1 Tag“) bleiben fremd.
Diese Pfade werden weder verändert noch aufgenommen. Die Hauptbilder zeigen den davor geprüften Stand;
Endwerte und Anordnung der gemeinsamen Nachbesserung bleiben gleich. Der erneute vollständige Node-Prüflauf
mit dieser Nachbesserung besteht ebenfalls (viermal Exit 0, 246/246 Tests).

Eigene Veröffentlichung: ausschließlich die drei B-Ordner und drei Seitenweichen, **kein Push**.
Keine `.local`-Dateien, Kontodaten oder fremden Änderungen im Commit. Keine Änderungen an der gemeinsamen Aufgabendatei.
