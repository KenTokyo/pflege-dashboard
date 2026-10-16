# Sachbearbeitung · Instrument · Bereich D

| Fläche | Frage | Leitzahl / Datenbild | Aktion |
| --- | --- | --- | --- |
| Kennzahl-Leiste | Wie groß ist der Arbeitsbestand? | Fälle, überfällige Aufgaben, Aufgaben dieser Kalenderwoche; Zahl + Einheit | Aktualisieren |
| Fallliste | Welcher Fall ist als Nächstes dran? | offene Aufgaben / Gespräche pro Person, nächste echte Frist auf fester Heute-Achse | Fall öffnen |
| Aufgabenliste | Welche Aufgabe braucht Bearbeitung? | echte Prioritätsform, Datum auf derselben Zeitachse | zugehörigen Fall öffnen |
| Filter-Werkbank | Welchen Bestand brauche ich? | vorhandene lokale Filtergrammatik, Ergebnis als angewendete Auswahl | Ansicht zeigen |
| Modellanalyse | Was wurde tatsächlich ausgeführt? | echte Anfragen, Status-Segmentbalken und gespeicherte Nutzung je Modell | keine erfundene Aktion |
| Falldialog | Was gehört zu diesem Fall? | Pflegegrad, Aufgaben, verknüpfte Gespräche und Dokumente | KI zu diesem Fall fragen |

## Auftrag und Quellen

Basis `7bd021e92bf13606fac79e919d340a1b75f0a253`, Zweig main. Nur dieser Ordner und Weiche
`src/routes/StaffPage.tsx`. Keine Änderungen an Grundlage, Rahmen, Tools oder NewConversationDialog.
Stilquelle: instrument-ui/SKILL.md, Yury Gok Tenet-Vertragstabelle c4, heller Gesamtentwurf und dessen HTML,
Modelltest ERGEBNIS.md, GEMEINSAM.md und gpt-6.1-sol/REGELN.md. Tenet: Haarlinien, kompakte Segmente,
Name links, Fristspur mittig, Zahlen rechts. Entwurf: 20 px Radius, 20 px Innenabstand, 12 px Raster,
32 px Symbolkachel, 13–15 px Grotesk, 34 px Mono. Keine neutralen Rohfarben, keine Endlosschleifen.
React-Prüfrichtlinie: vorhandener Query-Cache, unabhängige Abfragen, abgeleitete Werte ohne Effekt.

## Phasen

### Nacharbeit vom 16.10.2026

- [x] Einheiten für 0 / 1 / mehrere in Kennzahlen, Arbeitsbestand, Analyse und Falldialog prüfen und anpassen.
- [x] Doppelten Zähler im Kopf der Fallübersicht entfernen.
- [x] Zeilenaktion mit ruhigem Rand; Akzent erst bei Hover und Tastaturfokus.
- [x] Vertragsprüfungen und Sichtabnahme wiederholt; Tagwerk-Vergleich bytegleich. Separater Commit nur eigener Pfade; kein Push.

Die gemeinsame Timeline bleibt unverändert; deren Tagesgrammatik bearbeitet Bereich A.

- [x] Regeln, Vertrag, Bausteine und Datenwege gelesen; Inhaltskarte vor Code festgelegt.
- [x] Instrument-Seite, Fallliste, Filter, Analyse und Falldialog; Tagwerk nur durch Weiche berühren.
- [x] Typecheck, Bereichs-Lint, Source, Vitest; Sicht hell/dunkel 1920×1080 und 390 px, Werkbank/Dialog.
- [x] Vergleich Tagwerk, Bewegungs-/Tastatur-/Randfallprüfung; nur eigene Dateien committen, kein Push.

## Browser-Findings

- Eigene Prüf-App auf 5234, synthetisches Szenario staff; keine echten Konten/Provider.
- Harness hat HMR/watch aus: nach Quelländerungen eigenen Server neu starten.
- Tagwerk-Basis aufgenommen vor Änderung, Pfad folgt im Abschlussbericht.

## Prüfungen, Bilder und Bewertung

Die folgenden Zwischenstände dokumentieren die erste Lieferung. Die aktuelle Nacharbeit und ihre grünen
Vertragsprüfungen stehen am Ende dieses Berichts.

Zwischenstand: eigener gezielter ESLint-Lauf bestanden. Typecheck meldete nur ChatIcons (C), Gesamt-Lint nur A/B/C.
Source-Prüfung nach eigenen Mindestschrift-Korrekturen nur C. Erster Vitest-Lauf 234/246; zwölf Fehler durch
noch fehlende dokumente.css aus laufender B-Implementierung. Keine fremden Dateien verändert.
Fristachse im Browser: 659 px Spur, Heute 164,859 px (=25 %), Vergangenheit links; Kennzahlen 6 / 1 / 3,
0 Animationen nach Auftritt; Ellipsen 0 bei 1920.
Browser-Host verlor den Tab während einer Folgeaktion (BrowserInputUnsupported). browser_tabs danach leer;
keine Aktion blind wiederholt. Neuer eigener Tab, Zustand erneut lesen.

## Lieferung

- `InstrumentStaffPage.tsx`: eigener Instrument-Ablauf mit gemeinsamen Abfragen, Kennzahlen, Sicht-/Sortiersegmenten,
  Personenauswahl, Dringlichkeit, Aktualisieren, Filterrücksetzung und Zuständen.
- `Lists.tsx`: Fälle und Aufgaben, Priorität als Form + Aufgaben-Sachfarbe, gemeinsame Fristachse.
  Heute bei 25 %, gemeinsame Skalenzeile am Desktop; je Fall Datum und Tagesabstand als genau zwei Fristangaben.
- `InstrumentWorkbench.tsx`: bestehende `parseFilterRequest`-Grammatik; keine KI und keine Schreibvorgänge.
- `InstrumentCaseDialog.tsx`: native modale Fallansicht, verknüpfte Aufgaben/Gespräche/Dokumente,
  fester Kopf/Fuß, ein scrollender Inhalt, Vollbild unter 768 px. NewConversationDialog unverändert eingebunden.
- `UsageAnalysis.tsx`: echte gespeicherte Nutzungswerte, Statusanteile und Modell-/Tokenzahlen; kein Kostenersatz.
- Vier bereichseigene CSS-Dateien. Keine Änderung an `grundlage/`, `rahmen/`, `src/staff/` oder Tools.
- `src/routes/StaffPage.tsx`: ausschließlich zwei Imports und die Design-Weiche, bisheriger Inhalt unverändert.
  Sichtwechsel nutzt den fertigen Rahmen von A. Keine fehlenden gemeinsamen Bausteine nachgebaut.

## Ausgeführte Prüfungen

| Prüfung | Ergebnis / Beleg |
| --- | --- |
| `npm run typecheck` | Exit 0; `.local/instrument-d/typecheck-final.log` |
| `npm run check:source` | Exit 0; 132 Dateien / 152 Kontrastpaare; `source-final.log` |
| `npx vitest run --maxWorkers=4 --testTimeout=30000` | Exit 0, 246/246 Tests in 21 Dateien; `vitest-final.log` |
| `npm run lint` | Vollständiger Lauf 17:15 UTC Exit 0 (`lint.log`). Letzter Lauf trifft fremde temporäre QA-Dateien: siehe Grenze unten. |
| `npx eslint --max-warnings=0 src/instrument/sachbearbeitung src/routes/StaffPage.tsx` | Exit 0; `lint-owned.log` |
| `git diff --check -- src/routes/StaffPage.tsx src/instrument/sachbearbeitung` | Exit 0 |
| Tagwerk-Quellvergleich | Nach Entfernen der sieben Weichen-Zeilen exakt identisch mit Basis `7bd021e` |
| Tagwerk-Bildvergleich | Original aus Basis-Commit gegen finale Weiche bei gleichem aktuellem Gesamtstand: PNGs bytegleich, `cmp` Exit 0 |
| Smartphone / Tablet | 390×844 und 768×1024: `scrollWidth` exakt 390 / 768, Ellipsen-Zählung 0 |
| Desktop | 1920×1080 hell und dunkel; sechs echte Harness-Fälle einschließlich langem Namen; Bilder geöffnet |
| Zahlen / Auftritt | Während Auftritt steigende Werte gesehen, Endwert 6 Fälle / 1 überfällig / 3 diese Woche; anschließend 0 laufende Animationen |
| Fristachse | Gestern links, heute an fester Marke, +88 Tage rechts mit Randpfeil; Datum + Abstand korrekt |
| Symbolknöpfe | DOM-Mittenabweichung 0 px, Abstand 7 px, Inhalt genau mittig; 4×-Ausschnitte geöffnet |
| Werkbank | Anfrage nach Priorität angewendet; unbekannte Person liefert Fehlermeldung; Aufgabenanfrage wechselt Ansicht; Chat-Aufrufe 0 |
| Falldialog | Hell/dunkel, 390 und 768; langer Name vollständig; Desktop 1020 px breit und mittig (x=450 bei 1920) |
| Tastatur | Escape gibt Fokus zurück; native Modalität geprüft, keine Hintergrundaktion erreicht. |
| KI-Einstieg | Gewählte Person übernommen (`10000000-0000-4000-8000-000000000020`); 0 automatische Chat-Aufrufe |
| Modellwerte | Isolierte Datenprobe: 7 Anfragen, Status 5/1/1, 5 Nutzungen, 1.690 Tokens, 1.234 ein / 456 aus; Desktop und 390 geprüft |

Die Proben sind ausdrücklich synthetisch. Produktdarstellung bleibt ausschließlich an vorhandene Abfragen gebunden.
Keine echten Supabase-/Provider-Aufrufe, kein Live-Erfolg, keine neue Kontoanlage. Temporäre eigene Original-/Datenproben
wurden anschließend entfernt und die endgültige Weiche wiederhergestellt. Keine Prüfcode-Ausnahme hinzugefügt.

### Bildkarte

Alle folgenden Pfade liegen unter `.local/instrument-d/` und sind nur lokale Prüfbelege:

| Zustand | Bild |
| --- | --- |
| Gesamtansicht dunkel 1920×1080 | `desktop-dunkel.png` |
| Gesamtansicht hell 1920×1080 | `desktop-hell.png` |
| Werkbank offen hell / dunkel | `werkbank-hell.png`, `werkbank-dunkel.png` |
| Falldialog hell / dunkel | `dialog-hell.png`, `dialog-dunkel.png` |
| Handy hell / dunkel | `handy-hell-final.png`, `handy-dunkel.png` |
| Handy Fallliste mit langem Namen | `handy-faelle-final.png` |
| Handy Werkbank offen | `handy-werkbank.png` |
| Handy Falldialog mit langem Namen hell / dunkel | `handy-dialog-hell.png`, `handy-dialog-dunkel.png` |
| Tablet 768, dringend gefiltert | `tablet.png` |
| Frist-Randfälle und gefüllte Modellanalyse | `randfaelle-1920.png`, `randfaelle-390.png` |
| 4×-Symbolausschnitte | `knopf-4x.png`, `schliessen-4x.png` |
| Exakte Original-/Weichen-Gegenprobe | `tagwerk-original-gegenprobe.png`, `tagwerk-weiche-gegenprobe.png` |

Der erste zeitlich auseinanderliegende Tagwerk-Vergleich zeigte 21 Pixel mit maximal einer Farbstufe Abweichung.
Deshalb Gegenprobe: Originalkomponente aus Basis-Commit bei aktuellem CSS-/Modulstand aufgenommen, anschließend
Prüf-App neu gestartet, endgültige Weiche aufgenommen. Beide PNGs: 167.217 Byte und bytegleich.
Keine Toleranz eingeführt. Der frühere Vergleich bleibt als `tagwerk-vorher.png` / `tagwerk-nachher.png` erhalten.

### Nacharbeit und Browser-Findings

- Erste Dialogfassung stand links oben: eigene Hülle mit `margin: auto` korrigiert und erneut in beiden Themes angesehen.
- Erste mobile Sortierung brach „Gespräche“ um: Segmente auf volle Breite und 12 px gesetzt; final 79×44 px je Segment.
- Per-Zeile wiederholte Skalen am Desktop durch gemeinsame Skalenzeile ersetzt; Heute bleibt exakt ausgerichtet.
- Ein Sammelaufruf scheiterte nach Rücksetzung an einem bereits verschwundenen Zurücksetzen-Knopf.
  Screenshot gelesen und nur die noch ausstehenden Aktionen ausgeführt.
- Nach Themewechsel auf Tagwerk gibt es in Einstellungen keinen Sachbearbeiter-Link. Für die Gegenprobe daher
  Direktlink mit `szenario=staff`, erneut synthetisch angemeldet. Keine Produkt-Navigation erfunden.
- Browser `emulateMedia` wird vom Werkzeug nicht unterstützt. Keine native Steuerung, kein eigener Chrome als Ersatz.
  Eigener Code nutzt unverändert A-Reveal/Metric samt deren vorhandener Reduced-Motion-Behandlung;
  reduzierte Bewegung in diesem Bereich nicht nochmals mit einer echten Browser-Medienvorgabe geprüft.

## Bewertung nach Modellregeln

Eigene Bewertung **9/10**, keine unabhängige Jurywertung. Start bei 5:

- +1: Leitzahlen mit Einheit und erkennbare Mono-Ziffern; Bild `desktop-dunkel.png`.
- +1: echte Fristdaten, gemeinsame feste Heute-Linie, fachliche Prioritätsformen; `desktop-hell.png` neben
  Tenet c4 betrachtet. Kein zusätzliches Farbschema und keine Ampel.
- +1: volle Arbeitsbreite mit vier gefüllten Spalten; vollständige lange Namen und mobile Vollbild-Fallarbeit;
  `handy-faelle-final.png`, `handy-dialog-dunkel.png`.
- +1: Schnittfolge/Zählwerk mit Endruhe, ausgemessene Knöpfe und tatsächlich durchgeführte Filter-/Fallabläufe;
  `knopf-4x.png`, Messwerte oben.

| Fläche | Vor eigener Nacharbeit | Danach | Grund |
| --- | --- | --- | --- |
| Fallübersicht | 8 | 9 | gemeinsame Skala statt wiederholter Achsen, volle Breite |
| Werkbank / Filter | 8 | 9 | schmale Segmente passen ohne Wortbruch, echte Filterrückmeldung |
| Falldialog | 7 | 9 | Desktop mittig, mobil Vollbild, langer Name und fester Aktionsfuß |
| Analyse | 8 | 9 | null und gefüllte Daten geprüft, keine erfundenen Kosten |

Drei schwächste Stellen:

1. Sechs vollständige Fälle plus Analyse brauchen Scrollen; nicht alle Fälle stehen gleichzeitig im ersten
   1080-px-Ausschnitt. Bild: `desktop-dunkel.png`. Bewusster Platz für Namen und echte Fristquelle im Dialog.
2. Nahe Termine liegen auf der festen 56-Tage-Skala eng zusammen; ihr Abstand ist vor allem am Datum/Tagestext
   erkennbar. Bild: `desktop-hell.png`. Skala bleibt wahr und unverändert.
3. Der gemeinsame Timeline-Baustein schreibt „Seit 1 Tagen“. Bild: `handy-dialog-hell.png`.
   Das ist eine kleine Textschwäche von A; Grundlage wird durch D ausdrücklich nicht verändert.

## Grenzen und Abschluss

- Die letzte vollständige Lint-Wiederholung meldet temporäre A-Dateien unter `.local/instrument-welle2-a/qa/`
  sowie `src/instrument/chat/ablauf-pruefung.tsx` (C). D ändert/löscht diese fremden Dateien nicht.
  Der frühere vollständige Lint-Lauf und der abschließende bereichseigene Lauf sind grün. Gesamt-Lint nach
  Bereinigung der parallel laufenden Prüfungen beim Orchestrator erneut ausführen.
- Keine CPU-Prozentverbesserung behauptet. Gemessen ist die Endruhe der Animationen; keine neue wiederkehrende Arbeit.
- Neuer gemeinsamer Commit `d40dde5` seit Basis gelesen: geteilter Übersichts-Fragenablauf (B), keine zusätzliche
  Änderung an Staff erforderlich. Spätere eigene Abschlussprüfung folgt unmittelbar vor Commit.
- Eigene Tabs geschlossen, `browser_tabs` leer; eigene Vite-App auf 5234 beendet. Keine anderen Ports/Prozesse berührt.
- Nur eigene Pfade committen, kein Push. Fremde Arbeit bleibt im Checkout.

- [x] Implementierung und Nacharbeit abgeschlossen.
- [x] Bereichseigene Prüfungen und alle 246 Tests bestanden; Sichtbelege geöffnet.
- [x] Tagwerk-Gegenprobe bytegleich.
- [x] Gesamt-Lint nach fremder QA-Bereinigung nochmals grün; siehe Nacharbeit.
- [x] Eigene Pfade für separaten Commit geprüft; kein Push.

Letzte Wiederholung vor Commit: Typecheck erneut Exit 0 (`typecheck-release.log`).
Gesamt-Lint (`lint-release.log`) jetzt ausschließlich sechs temporäre Dateien von A in `.local/instrument-welle2-a/qa/`;
C hat seine temporäre Probe inzwischen entfernt. Keine D-Fehler. Port 5234 frei (`lsof` ohne Listener),
Browserwerkzeug bestätigt abschließend `tabs: []`.

## Nacharbeit: Einheiten und ruhigere Tabelle

Basis dieser Nacharbeit: `427bfc4`. Nur fünf Bereichsdateien und dieser Bericht geändert;
`src/routes/StaffPage.tsx` nach der temporären Gegenprobe exakt wiederhergestellt (kein Diff).

- Kennzahlen wählen Fall/Fälle bzw. Aufgabe/Aufgaben anhand des tatsächlichen Endwerts.
- Arbeitsbestand wählt offene Aufgabe/Aufgaben, Gespräch/Gespräche und echte KI-Antwort/Antworten.
- Falldialog: Offene Aufgabe, Gespeichertes Gespräch und Dokument bei jeweils genau einem Eintrag.
- Analyse berücksichtigt auch Anfrage/Anfragen, Nutzung/Nutzungen und Token/Tokens.
- Der zusätzliche Zähler im Kopf der Fall-/Aufgabenübersicht entfällt.
- Fall öffnen bleibt als Randknopf mit Pfeil; nur Hover und Tastaturfokus erhalten Akzentfläche, -text und -rand.
  Derselbe Zeilenknopf gilt für die Aufgabenansicht. Hauptaktionen in Werkbank/Falldialog bleiben eindeutig.
- Grundlage/Timeline und NewConversationDialog unverändert verwendet. Keine neue Produktlogik oder Testdaten im Produkt.

### Wiederholte Abnahme

| Prüfung | Ergebnis / Beleg unter `.local/instrument-d/` |
| --- | --- |
| `npm run typecheck` | Exit 0, `nacharbeit-typecheck.log` |
| `npm run lint` | Gesamtprojekt Exit 0, `nacharbeit-lint.log`; frühere fremde QA-Blockade damit erledigt |
| `npm run check:source` | Exit 0, 132 Dateien / 152 AA-Paare, `nacharbeit-source.log` |
| `npx vitest run --maxWorkers=4 --testTimeout=30000` | Exit 0, 246/246 Tests in 21 Dateien, `nacharbeit-vitest.log` |
| Desktop 1920×1080 hell / dunkel | Bilder geöffnet: `nacharbeit-Light.png`, `nacharbeit-Dark.png` |
| Dialog offen hell / dunkel | `nacharbeit-DialogHell.png`, `nacharbeit-DialogDark.png` |
| Werkbank offen hell / dunkel | `nacharbeit-WorkbenchLight.png`, `nacharbeit-WorkbenchDark.png` |
| Handy 390×844 hell / dunkel | `nacharbeit-MobileLight.png`, `nacharbeit-MobileDark.png` |
| Handy Fallliste / Werkbank | `nacharbeit-MobileCases.png`, `nacharbeit-MobileWorkbench.png` |
| Handy Dialog hell / dunkel, bis zu den Verknüpfungen gescrollt | `nacharbeit-MobileDialogLight.png`, `nacharbeit-MobileDialogDark.png`, `nacharbeit-MobileDialogBottom.png` |
| Vollständige Einzahl-Probe Desktop / Handy | `nacharbeit-Singular.png`, `nacharbeit-MobileSingular.png` |
| Falldialog mit je einem Eintrag | `nacharbeit-SingularDialog.png`: Offene Aufgabe / Gespeichertes Gespräch / Dokument, jeweils Zähler 1 |
| Sichtbare und zugängliche Einheiten | Einzahl-Probe: 1 Fall / 0 Aufgaben / 1 Aufgabe / 1 Anfrage; Arbeitsbestand 1 offene Aufgabe / 1 Gespräch / 1 echte KI-Antwort; Analyse 1 Nutzung / 1 Token |
| Mehrzahl und Null | Staff-Bestand: 6 Fälle / 1 Aufgabe / 3 Aufgaben; Liste 2 offene Aufgaben, 1–3 Gespräche, 0 echte KI-Antworten |
| Doppelter Zähler | `.is-board > .in-card-head .in-count` fehlt; sechs echte Fallzeilen bleiben vorhanden |
| Zeilenknöpfe | Alle sechs ohne `is-primary`; hell neutral RGB 239/239/236, Text 20/20/20, Rand 130/130/123 |
| Hover / Fokus | Beide Akzent weich, Text RGB 37/79/184, Rand 40/86/197; echter Tab-Fokus mit `:focus-visible`, Bild `nacharbeit-Focus.png` |
| Symbolknopf | Mittenabweichung 0 px, Abstand 7 px, Inhalt mittig; `nacharbeit-knopf-4x.png` geöffnet |
| Filter / Wechsel / KI-Einstieg | Priorität angewendet, unbekannte Person mit Fehler, Aufgabenansicht angewendet; 0 Chat-Aufrufe. KI-Einstieg übernimmt Martha in vorhandenen C-Dialog |
| Abschneiden / Leerlauf | Desktop/390: keine horizontale Überbreite, Ellipsen-Zählung 0; nach Auftritt/Interaktion 0 laufende Animationen |
| Tagwerk-Nacharbeit | Eigene CSS-Datei aus Basis `427bfc4` gegen aktuelle Datei in derselben geladenen Tagwerk-Ansicht: beide PNGs 166.561 Byte, `cmp` Exit 0 |

Alle genannten Bilder selbst geöffnet. Desktop erneut neben Tenet c4 betrachtet: ruhige Zeilenaktionen,
gemeinsame Skala, schmale Trennlinien und Daten statt Zierflächen. Die Einzahl-Probe war ausschließlich
ein temporärer synthetischer Backend-Transport unter `.local/instrument-d/`; beide Probedateien entfernt.
Keine echten Konten oder Provideraufrufe.

Tagwerk-Belege: `nacharbeit-TagwerkCSSBefore.png` / `nacharbeit-TagwerkCSSAfter.png`.
Die Produktseite blieb dabei unverändert geladen; nur der Inhalt des eigenen Instrument-Styles wurde
vorübergehend durch die Basisfassung ersetzt und danach wiederhergestellt. Alle geänderten JSX-Dateien
werden ausschließlich im Instrument-Zweig gerendert; die Weiche selbst hat keinen Diff.
Der zusätzliche Vergleich Originalkomponente aus `7bd021e` gegen aktuelle Weiche nach getrennten Serverstarts
zeigte 64 Pixel mit maximal einer Farbstufe Unterschied (`nacharbeit-TagwerkOriginal.png` / `nacharbeit-TagwerkFinal.png`).
Für den tatsächlichen Einfluss dieser Nacharbeit wurde daher der beschriebene kontrollierte CSS-Vergleich verwendet;
keine Toleranz, Maskierung oder Bildkorrektur. Der bytegleiche Originalvergleich der ersten Lieferung bleibt oben belegt.

Browser-Finding: Der Instrument-Name des Theme-Knopfs existiert in Tagwerk nicht. Der Sammelaufruf endete daher
nach erfolgreicher Anmeldung mit `BrowserEvaluationFailed`. Screenshot zeigte fertiges Tagwerk hell;
nicht erneut geklickt, Gegenbild ebenfalls in hell aufgenommen. Keine Eingabe blind wiederholt.

### Bewertung nach Nacharbeit

Fallübersicht vorher **8/10**, jetzt **9/10** (eigene Bewertung). Die vorherige 9 war angesichts falscher Einheiten,
des doppelten Zählers und sechs voller Akzentknöpfe zu hoch. Start 5, vier belegte Punkte:

- +1: korrekte Zahl + Einheit einschließlich Einzahl und Null; `nacharbeit-Singular.png`.
- +1: ruhige, dicht gefüllte Tabelle und eindeutige Aktionshierarchie; `nacharbeit-Light.png`, `nacharbeit-Dark.png`.
- +1: mobile Fälle, Werkbank und nutzbarer Vollbilddialog ohne Ellipsen; Handy-Bilder oben.
- +1: unveränderte wahrheitsgetreue Fristachse, präziser Pfeilknopf und Endruhe; Desktop / 4×-Bild und Messwerte oben.

Die drei schwächsten Stellen nach Abschluss: Scrollbedarf bei sechs Fällen plus Analyse (`nacharbeit-Dark.png`),
enge Abstände naher Fristen auf fester Skala (`nacharbeit-Light.png`), mehrzeilige Kennzahl-Erklärungen am Handy
mit entsprechendem Höhenbedarf (`nacharbeit-MobileLight.png`).

Während der Abschlussprüfung lieferte A die Korrektur für Timeline und Metric. Eigene finale Prüf-App danach
neu gestartet und normal angemeldet: `nacharbeit-FinalGemeinsam.png` zeigt 6 Fälle / 1 Aufgabe / 3 Aufgaben,
sechs neutrale Zeilenaktionen, keinen Kopfzähler und jetzt „Seit 1 Tag überfällig“. Erneut 0 Animationen;
bei 390 px `scrollWidth = 390`, Ellipsen 0. Die älteren Bilder oben zeigen noch As vorherigen Tageswortlaut.
Keine D-Änderung an A-Dateien; die zusätzliche Metric-Behandlung widerspricht den expliziten D-Einheiten nicht.

Parallel hinzugekommene Commits `4bc06a2` (A) und `86b86ae` (C) vor Abschluss gelesen;
Darstellungswechsel und unveränderter neuer Gesprächsdialog funktionieren mit diesem gemeinsamen Stand.
Eigene Probedateien entfernt, alle eigenen Tabs geschlossen, `browser_tabs: []`, eigener Server 5234 beendet.
Nur Bereich-D-Pfade in den neuen Commit aufnehmen. Kein Push.
