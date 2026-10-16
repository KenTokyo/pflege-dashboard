# Instrument – Bereich C: Gespräche und Chat

## Inhaltskarte

| Fläche | Frage | Leitzahl / Datenbild | Aktion |
| --- | --- | --- | --- |
| Gesprächsliste | Welches Anliegen öffne ich? | tatsächliche Trefferzahl, Zeitmarken und Person je Zeile | Neues Gespräch |
| Einstieg | Was kann ich hier bearbeiten? | Linienzeichnung eines Gesprächs, keine erfundene Leistungszahl | Neues Gespräch |
| Kopf | Zu wem und mit welchem Modell schreibe ich? | tatsächlicher Bezug, Modus und Modell | Gespräch bearbeiten / archivieren |
| Verlauf | Was wurde geantwortet? | Zeitmarke und echtes Modell, ruhige Lesebreite | Quellen öffnen |
| OpenUI | Welche Fakten und Schritte gehören zusammen? | echte Antwortabschnitte und nummerierte Schritte | Text / OpenUI wechseln |
| Ablauf | Was arbeitet gerade? | nur gemeldete Server-Schritte mit echten Sekunden; keine Prozentbehauptung | Ablauf aufklappen |
| Composer | Was frage ich als Nächstes? | Zeichenstand der eigenen Eingabe, tatsächlicher Streamingstatus | Senden / Abbrechen |
| Neues Gespräch | Welches Thema und welche Person? | Titel und bestehende Personen | Gespräch anlegen |
| Beispielfragen | Welche Frage hilft mir? | Anzahl der vorhandenen Beispiele je Thema | bearbeitbare Frage übernehmen |

## Ziel und Quellen

Zusätzliche Instrument-Fassung; Tagwerk und alle Datenabläufe erhalten. Besitz ausschließlich
`src/instrument/chat/`, Weiche `src/routes/ChatPage.tsx`, Darstellungsweichen `src/routes/chat/*`.
Gemeinsame Hooks, Streamstore, Antwortparser und OpenUI-Bibliothek unverändert nutzen.
`NewConversationDialog` behält sämtliche Props einschließlich `initialRecipientId` für Bereich D.

Gelesen: AGENTS, Anforderungen, Coding Rules, Taskvertrag und Browser-Findings A, Grundlage-README,
Instrument-Skill, beide Modellregeln und Modelltest-Ergebnis. Bildlich gelesen: Tenet Chat-Verteilung,
Tenet Leerzustand/Composer, heller Gesamtentwurf. HTML-Entwurf gelesen (nur Stil, kein Code übernommen).
Referenz: 20-px-Karten, 32-px-Kopfkachel, 13–15-px-Grotesk, Mono-Metadaten, Haarlinien,
48–56-px-Listenminimum, Composer als ruhige Innenfläche. Lesetext maximal 760 px; Handy 390 px.

## Plan

- [x] Quellen, Besitz und Ausgangsstand prüfen; Tagwerk-Basisbilder Liste, Verlauf, beide Dialoge sichern.
- [x] Instrument-Liste, Einstieg, Kopf, Composer, Antworten, Ablauf und Dialoge gestalten.
- [x] Typecheck, vollständiger Lint, Source und vollständiger Vitest-Lauf grün.
- [x] Desktop hell/dunkel und 390: Liste, offenes Gespräch, Composer und Dialoge angesehen.
- [x] Streaming, Abbruch, OpenUI, Suche/Archiv, Umbenennen, Dialog und Sachbearbeiter-Props prüfen.
- [x] Ellipsen, Überlauf, Symbolmitten, Ende der Animationen und Tagwerk-Pixelvergleich belegt.
- [x] Drei Schwächen, Note und Grenzen berichtet; Browser/Server geschlossen.
- [x] Nur eigene Pfade für den Bereich-C-Commit geprüft und aufgenommen, kein Push.

## Browser-Findings C

- Port 5233: erster Start per Shell-Hintergrund endete mit der Shell; Browser hatte keinen Tab angelegt.
  Danach Vite als verwalteten Prozess gestartet, `browser_tabs` gelesen und erst dann neu geöffnet.
- `page.screenshot` ist im TreeChat-Sandboxlauf nicht verfügbar. `browser_screenshot(kind: proof)` liefert
  ein lokales Artefakt; dieses wird in `.local/instrument-c/` kopiert. Kein eigener Chrome gestartet.
- Tagwerk-Basis: 1920×1080 dunkel, Liste, Seed-Gespräch, Beispielfragen und Neues-Gespräch-Dialog aufgenommen.
- Nach Quellenänderungen eigenen Harness-Server neu starten (HMR/watch bewusst deaktiviert).

- Radio-Auswahl: ein zusammengefasster `.check()`-Lauf brach ohne eindeutiges Ergebnis ab. Zustand frisch gelesen;
  im geöffneten Modellmenü per `.click()` gewählt. Danach „Für dieses Gespräch“, zurück „Standard aus Einstellungen“;
  Chat-Aufrufzahl dabei 0. Keine ungeprüfte Wiederholung.
- Kopf-Nacharbeit: nativer Select schnitt lange Modellnamen sichtbar ab, obwohl Ellipsen-Befehl 0 lieferte.
  Ersetzt durch natives Aufklappfeld mit echten Radio-Optionen und umbrechenden Namen. Die Tagwerk-Auswahl bleibt gleich.
- Symbolwechsel hatte zunächst neue Context-Abhängigkeiten in isolierten Antworttests verursacht (9 Fehler).
  Reine SVG-Darstellung übernimmt den Wechsel jetzt über `data-design`; PendingTurn bekommt nur eine optionale
  Darstellungs-Prop. Danach wieder 246/246 Tests, keine Teständerung und kein neuer Daten-/Logik-Hook.
- Lint sah zwischenzeitlich fremde temporäre TSX-Prüfdateien unter `.local/instrument-welle2-a/qa/`;
  nicht verändert oder ausgeschlossen. Abschlusslauf nach deren Bereinigung erneut ausführen.
- Pixelvergleich vier Tagwerk-Aufnahmen in 1920×1080 dunkel: alle PNG-Dateien vorher/nachher bytegleich.

- Ablauf-Prüfansicht: erster Handyversuch war leer, weil der temporären Fläche `has-thread` fehlte.
  Korrigierte Prüfansicht sichtbar kontrolliert (7 Schritte), mit `browser_resize` statt `page.setViewportSize`.
  Die direkte Playwright-Größenmethode lief im Browser-Sandboxlauf in einen Timeout; tatsächliche Größe danach lesen.
  Finale Bilder `ablauf-handy.png` (390×844) und `ablauf-hell.png` (1920×1080), danach temporäre Dateien entfernt.
- Streaming-Nacharbeit: bei langer OpenUI-Antwort lag der Status oberhalb des sichtbaren Verlaufs.
  Instrument-Status ans Ende der laufenden Antwort gesetzt und dort unten haftend gemacht; Tagwerk-Statusposition bleibt gleich.


## Lieferung

- `InstrumentConversationList.tsx` mit `CardHead`, `Metric`, `Segments`, `Reveal`; Hooks bleiben in der bisherigen Liste.
- `InstrumentEmpty.tsx`: Einstieg und eigene isometrische Gesprächszeichnung, auch für das noch leere Gespräch.
- `InstrumentModelPicker.tsx`: umbrechende Modellnamen, Standard/Einzelwahl, Region, Tastatur und Escape.
- `InstrumentProgress.tsx`: tatsächlich empfangene Zeichen und letzter gemeldeter Schritt mit Zeit; keine Schätzung.
- `ChatIcons.tsx` / `icons.css`: Darstellungsadapter für vorhandene Lucide-Aufrufe. Tagwerk-Zeichnung bleibt sichtbar,
  Instrument nutzt Grundlage-Icons sowie kleine eigene Archiv-/Stift-/Mikrofonzeichnungen. Kein neuer Context-Hook.
- Bereichs-CSS: `chat.css`, `list.css`, `answers.css`, `composer.css`, `dialogs.css`, `model-picker.css`, `icons.css`.
- Darstellungsweichen in `src/routes/ChatPage.tsx` und den zehn betroffenen Dateien unter `src/routes/chat/`.
  `ChatRoute.tsx`, `src/chat/`, Daten-/Streamlogik, Grundlage, Rahmen und Source-Prüfer nicht verändert.

Zusätzliche, in der Grundlage noch nicht vorhandene Bausteine sind nur im C-Ordner gebaut: Modell-Aufklappwahl,
Streamstatus, Gesprächszeichnung und reine Symboladapter. Kein Hook kopiert. Kein neues Paket.

## Prüfungen am 16.10.2026

| Prüfung | Ergebnis |
| --- | --- |
| `npm run typecheck` | Exit 0, final nach dem Status-Fix |
| `npm run check:source` | Exit 0: 132 Dateien, 152 Kontrastpaare, AA hell/dunkel, Schrift ≥ 12 px, keine Endlosschleife |
| `npx eslint --max-warnings=0 src/instrument/chat src/routes/ChatPage.tsx src/routes/chat` | Exit 0 |
| `npx vitest run --maxWorkers=4 --testTimeout=30000` | 21 Dateien, 246/246 Tests, erneut 19:36 Uhr, 8,58 s |
| `npm run lint` | Final Exit 0 nach Bereinigung fremder Prüfansichten |
| `git diff --check -- src/instrument/chat src/routes/ChatPage.tsx src/routes/chat` | Exit 0 |
| Zeilenlänge / Dateigröße der neuen C-Dateien | keine Zeile über 160 Zeichen, jede Datei unter 400 Zeilen |

Gesamt-Lint war zwischenzeitlich durch sechs temporäre A-Dateien, danach eine D-Prüfansicht blockiert.
Beim letzten gemeinsamen Prüfschritt war zudem kurz die D-Vergleichsweiche in `StaffPage.tsx` aktiv;
Lint/Typecheck meldeten dadurch den unbenutzten `TagwerkStaffPage`. Auf Bereinigung durch D begrenzt gewartet,
fremde Dateien weder verändert noch ausgeschlossen. Anschließend **Gesamt-Lint und Typecheck erneut Exit 0**.
Die vier Vertrags-Prüfungen sind damit zum Abschluss grün.
Vitest meldet den bekannten jsdom-Hinweis zu `window.scrollTo`, alle Tests bestehen; keine Tests verändert.

### Browserabläufe

Eigener Harness auf Port 5233, TreeChat-Hintergrundbrowser. Ausschließlich fiktive Daten, kein echter Anbieteraufruf.

- Gespräch angelegt, Titel geändert, archiviert und wiederhergestellt; gesperrter Composer im Archiv angezeigt.
- Suche ohne Treffer und fertig geladenes leeres Archiv gelesen: „Archiv ist leer“, 0 laufende Animationen.
- Beispielfrage ausgewählt und übernommen: Entwurf bleibt bearbeitbar, kein automatischer Chat-Aufruf.
- Text/OpenUI umgeschaltet: vorhandene Komponentenansicht wechselt, 0 zusätzliche Chat-Aufrufe.
- Modell auf Einzelwahl und zurück zum Standard gewechselt: Label/Region aktualisiert, 0 zusätzliche Chat-Aufrufe.
- Textantwort und OpenUI-Antwort bis zum fertigen Ergebnis geprüft; Quellen und Abschnitte bleiben bedienbar.
- Gehaltener OpenUI-Stream: 47 → 785 tatsächlich empfangene Zeichen. Status bei langem Inhalt sichtbar über dem
  Composer (760 × 40 px). Freigegeben bis zum fertigen Ergebnis; separater Lauf abgebrochen, danach Status entfernt.
- Abbruch / fertig / Dialog / Liste: nach dem einmaligen Auftritt jeweils 0 laufende Animationen.
- Sachbearbeitung aus D: Martha → „KI zu diesem Fall fragen“ → neuer Dialog mit vorausgewählter Martha
  (`…0020`) → „Rückfragen zu Marthas Unterlagen“ angelegt → Gespräch mit demselben Personenbezug geöffnet.
  `initialRecipientId`, gemeinsamer `useStartConversation` und alle bisherigen Props bleiben erhalten.
- Ablauf: echte `ActivityView` und `InstrumentProgress` mit sieben ausdrücklich synthetischen Ereignissen geprüft;
  Zeiten 0 / 0,36 / 0,72 / 1,08 / 1,44 / 1,8 / 2,16 s, Desktop hell/dunkel und 390 sichtbar. Temporäre Prüfansicht gelöscht.
  Normale Harness-Antworten liefern keine Activity-Ereignisse; kein echter Anbieterablauf behauptet.

### Maße, Schrift und Symbole

- Lesebreite Desktop: 760 px. Fließtext 15 px mit 1,8-fachem Zeilenabstand; Handy-Eingabe 16 px.
- Mono im Browser: `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`.
- 390 × 844: Dokumentbreite = 390 px in Liste, Gespräch, Composer, beiden Dialogen und Ablauf-Prüfansicht.
- Pflicht-Ellipsenbefehl in diesen Handyansichten: jeweils `[]`, also **0** abgeschnittene Ellipsentexte.
  Die zuerst dennoch abgeschnittene native Modellwahl wurde unabhängig davon sichtbar erkannt und ersetzt.
- Neuer Dialog am Handy: 390 × 844 px, beide Themen; Footer erreichbar. Zeichenstand bleibt auf einer Zeile.
- Symbolknöpfe in 4×-Ausschnitten geöffnet: Neu, Einstieg, Umbenennen, Archivieren, Beispiele, Mikrofon, Senden,
  Schließen, alle fünf Fragethemen und Übernehmen. Dateien `.local/instrument-c/symbol-*-4x.png` sowie `symbol-archiv.png`.
- Browsermessung: Archivieren ΔY 0,15625 px, Beispiele 0,09375 px, Einstieg 0 px, fünf Themen je 0,5 px,
  Übernehmen 0,25 px. Jeweils 7 px Abstand und Inhalt horizontal mittig (ΔX 0 px).
  Symbolknöpfe ohne Text ebenfalls horizontal mittig; keine Textmitte vorhanden.
- Quellen-/Status- und Fachsymbole tragen Sachfarben; Senden und primäre Aktion verwenden kontrastierende Aktionsfarbe.
  Ein deaktivierter Knopf bleibt bewusst erkennbar deaktiviert.

### Tagwerk

Vier vorher/nachher-PNG-Paare in 1920 × 1080 dunkel per Bytevergleich identisch: Liste, offenes Gespräch,
Beispielfragen und Neues-Gespräch-Dialog. Belege `tagwerk-{liste,thread,fragen,dialog}-{vorher,nachher}.png`.
Das belegt diese vier Ansichten zum Vergleichszeitpunkt, keine pauschale Pixelgarantie für jede mögliche Datenlage.

## Bildbelege (alle selbst geöffnet)

Lokale, ignorierte Prüfarbeitsstände unter `.local/instrument-c/`, nicht im Commit.

| Ansicht | 1920 × 1080 hell | 1920 × 1080 dunkel | 390 × 844 |
| --- | --- | --- | --- |
| Liste / Einstieg | `liste-hell.png` | `liste-dunkel.png` | `liste-handy-hell.png`, `liste-handy-dunkel.png` |
| OpenUI / Composer | `openui-hell.png` | `openui-dunkel.png` | `thread-handy-hell.png`, `thread-handy-dunkel.png` |
| Composer unten | in OpenUI-Bild | in OpenUI-Bild | `composer-handy-dunkel.png` |
| Neues Gespräch | `neues-gespraech-hell.png` | `neues-gespraech-dunkel.png` | `neues-gespraech-handy-{hell,dunkel}.png` |
| Beispielfragen | `fragen-hell.png` | `fragen-dunkel.png` | `fragen-handy-hell.png` |
| Ablauf, synthetisch | `ablauf-hell.png` | `ablauf-dunkel.png` | `ablauf-handy.png` |
| Langer aktiver Stream | – | `streaming-dunkel.png` | separat Abbruch / fertigen Composer geprüft |

`*-v1.png` sind verworfene Zwischenstände. Das finale Streamingbild ist nur `streaming-dunkel.png`.
Frühes Listen-Handybild entstand vor der Vergrößerung des Neu-Knopfs auf 44 px; das dunkle Bild zeigt die Endfassung.
Beim hellen Handy-Gespräch ist ein vorübergehender Theme-Tooltip sichtbar; er gehört zum Rahmen, nicht zum Chat.

## Gestaltung und ehrliche Note: 8,5 / 10

Ausgangspunkt 5. Gegenüber den geöffneten Vorbildern `c1-tenet-chat-verteilung.jpg` und
`c3-tenet-leerzustand-composer.jpg` gewinnt die Fassung folgende belegte Punkte:

- +1: ruhige, geschichtete Materialflächen und begrenzte Lesebreite statt gleichförmiger Chat-Blöcke
  (`openui-hell.png`, `openui-dunkel.png`).
- +1: zusammenhängende Schreibfläche mit integrierter Formatwahl, Sachfarben und sauber zentrierten Symbolen
  (`composer-handy-dunkel.png`, 4×-Ausschnitte / Messwerte oben).
- +1: brauchbare 390-px-Fassung mit vollständig lesbaren Titeln, offenen Modellnamen und bedienbaren Dialogen
  (`thread-handy-dunkel.png`, `neues-gespraech-handy-dunkel.png`, Ellipsenzählung 0).
- +0,5: glaubwürdiger, am langen Stream sichtbarer Fortschritt und einmalige Schnittfolge mit anschließender Ruhe
  (`streaming-dunkel.png`, `ablauf-dunkel.png`, 0 laufende Animationen nach Abschluss).

Keine 9: Im direkten Bildvergleich haben die Vorbilder eine noch stärkere Verdichtung und feinere Illustration.
Die drei schwächsten Stellen bleiben:

1. Bei nur einem oder zwei Gesprächen bleibt die gleich hohe Desktop-Liste unten deutlich leer
   (`liste-hell.png`). Keine erfundenen Gespräche oder Kennzahlen zum Auffüllen.
2. Lange OpenUI-Antworten benötigen Scrollen; der Composer beansprucht am Handy einen merklichen Teil der Höhe
   (`composer-handy-dunkel.png`). Lesbarkeit und erreichbare Aktionen haben Vorrang vor kleinerer Schrift.
3. Die eigene Leerzustandszeichnung ist einfacher als die Referenzillustration; der breite Einstieg wirkt luftiger
   (`liste-hell.png` gegenüber `c3-tenet-leerzustand-composer.jpg`).

## Grenzen und Abschluss

Kein Live-/Provider-, Mikrofon-/Betriebssystem- oder CPU-Nachweis. Die Leerlaufaussage bezieht sich auf gemessene
laufende Animationen; keine dauerhafte CPU-Verbesserung behauptet. Reduzierte Bewegung ist in Grundlage/CSS vorgesehen,
aber hier nicht gesondert per Betriebssystemumschaltung geprüft. Keine neue wiederkehrende Hintergrundarbeit.

Nach Kontextübergang war ein Browser-Tab nicht mehr vorhanden. Frische Tabs gelesen, neuen Tab angelegt; ein
zusammengefasster Login-Lauf lief in eine Zeitüberschreitung. Anschließend Zustand gelesen und die Eingaben in
kleinen, beobachteten Schritten ausgeführt. Keine sichtbare Computer-Ausweichsteuerung benutzt.
Beim Archiv-Leerzustand zunächst fälschlich eine Überschrift erwartet; Zustand anschließend per DOM-Text bestätigt.

`git log 1ce6c50..main` vor Abschluss gelesen: A-Grundlage `7bd021e`, B-Hook `d40dde5`, D-Sachbearbeitung `427bfc4`.
Der D-Dialogweg wurde danach tatsächlich bis zum angelegten Gespräch geprüft. Fremde Arbeit bleibt erhalten.
Eigener Vite-Prozess beendet (Exit 130 nach Strg+C), Port 5233 ohne Listener; Browser-Werkzeug meldet keine Tabs.
Kein Push. Bilder und temporäre Prüfstände bleiben lokal; keine temporären TSX-/HTML-Ansichten von C übrig.
