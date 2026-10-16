# Bereich A · Instrument · Welle 2

Basis: `7bd021e`. Plan und Bericht ausschließlich hier. Keine Aufgabendatei ändern, kein Push.

## Inhaltskarte vor Umsetzung

| Fläche | Frage | Leitzahl / Datenbild | Aktion |
| --- | --- | --- | --- |
| Anmeldung | Wie öffne ich meinen Arbeitsbereich? | Eigene isometrische Zugangskarte; tatsächliche Sitzungsdauer 30 Tage oder 15 Minuten, keine erfundenen Bestandszahlen | Anmelden; Demo setzt nur die bestehende Adresse |
| Modus | Was darf der Sachbearbeiter tatsächlich? | Echter Modus, Werkzeuggrenze als Auskunft → Erstellen, letzter Schritt schraffiert | Keine erfundene Modusänderung |
| Persona / Systemprompt | Welche Anweisung gilt? | Echte Prompt-Version, vollständiger Text, Versionsspur | Bearbeiten / neue Version speichern; Standard wiederherstellen |
| Modelle | Welche Modelle sind verfügbar? | Echte Zahl verfügbar / Katalog; Statusmatrix und Region pro Modell | Keine erfundene Modellfreigabe |
| Darstellung | Welche Oberfläche und Helligkeit nutze ich? | Zwei kontrollierte Segmente, gewählte Werte | Oberfläche / Hell-Dunkel wechseln |
| Sitzung / Demo | Wann endet der Zugang und was darf hinein? | Tatsächliche Sitzungsregel und Ablaufdatum, Demo-Zustand | Abmelden |
| Laden / Leer / Fehler | Was fehlt und wie komme ich weiter? | Ruhige Linienzeichnung, Zustand statt erfundener Prozentzahl, echte Vorgangsnummer bei Fehler | Vorhandenes Kind / Erneut laden |
| Zugang / Konfiguration | Warum kann ich nicht hinein? | Tatsächlicher Zugangszustand bzw. fehlende öffentliche Variablennamen | Erneut laden / Abmelden nach bestehendem Ablauf |
| Rahmen | Wo bin ich, wie viele Einträge gibt es? | Nur echte Zähler; keine Ordnungsnummern | Navigation |

Stil gelesen: Instrument-Skill, Vorbild-README, Tenet-Leerzustand mit Composer, HX-2 Läufe/Masse,
heller Gesamtentwurf und dessen HTML, Modellregeln beider Dateien und Modelltest-Ergebnis.
Übernommen: 20-px-Karte, 32-px-Symbolkachel, Haarlinien, 20-px-Innenraum, 13–15-px-Grotesk,
34-px-Mono für echte Werte, Linienzeichnung mit einem gefüllten Sachteil, kurze Schnittfolge, danach Ruhe.
Keine NoteTree-Dateien/Logik übernommen. Tagwerk bleibt außer den frühen Design-Weichen identisch.

## Phasen

- [x] Vertrag, Stilquellen, Modellregeln, bestehende Abläufe und Dateibesitz gelesen.
- [x] Tagwerk-Bilder vor Änderung und Ausgangsprüfungen sichern.
- [x] Neue Anmeldung, komplette Einstellungen und Zustände; Zahlenkorrektur im Rahmen.
- [x] Vertragsprüfungen; Browser hell/dunkel 1920×1080 und 390 px, Interaktionen, 0 Animationen.
- [x] Bilder selbst ansehen, Schwachstellen nacharbeiten, Pixelvergleich und eigener Commit.

## Browser-Findings A

Welle-1-Finding übernommen: Harness ohne Watch/HMR hält Module im Speicher. Nach Quelländerungen eigenen
Port-5231-Server neu starten, dann normal neu laden. Tabs explizit mit ID ansprechen.

Zwischenstand: Ausgangslauf 246/246; nach parallelem Umbau kurz rote Chat-Tests wegen fehlendem
ThemeProvider in isolierten Chat-Bausteinen (Bereich C), danach kompletter Lauf wieder 246/246 grün.
Typecheck/Lint/Source inzwischen grün. Rahmen auf `/aufgaben`: nach abgeschlossenem Auftritt
`document.getAnimations()` = `[]`, `.in-nav-order` = 0, echte Zähler `1`, `1`, `2`.
Keine zusätzliche Rahmen-Animationskorrektur nötig. Der frühere Befund allein ließ sich nicht dem Rahmen zuordnen;
der fertig geladene aktuelle Aufgabenablauf wurde erneut geprüft.

Browser: Tab-Zuordnung zweimal verloren (`browser_tabs: []`); eigenen Tab erneut geöffnet.
`browser_resize` meldet teilweise Timeout, obwohl die neue Größe angewandt wurde: danach `innerWidth/innerHeight`
lesen, nicht blind wiederholen. Browser-Zeitachse kann deutlich hinter der Wanduhr liegen; vor Bildern tatsächlich
`document.getAnimations()` und Endwerte lesen. Aufgaben-Link heißt zugänglich „Aufgaben 2 Aufgaben“ wegen echtem
Zähler; exakter Name „Aufgaben“ trifft ihn nicht. Stabil: `.in-navigation a[href="/aufgaben"]`.

## Lieferung und Dateibesitz

- `anmeldung/InstrumentLogin.tsx`, `anmeldung.css`: eigene Zugangsseite, isometrische Zeichnung, Formular,
  echte Sitzungsregel, vorhandener Demo-Einstieg, Fehler und Fokusführung.
- `einstellungen/InstrumentSettings.tsx`, `InstrumentModels.tsx`, `InstrumentPersona.tsx`, `einstellungen.css`:
  alle Abschnitte als neues zweispaltiges Arbeitsblatt; mobil in einer Spalte. Modus, Katalog/Region/Freigabe,
  vollständiger Prompt, Version, Editor, Standard, Darstellung, Sitzung, Demo und Abmelden enthalten.
- `zustaende/InstrumentStates.tsx`, `InstrumentGate.tsx`, `StateDrawing.tsx`, `zustaende.css`: statisches Laden,
  Leerzustand, Fehler mit Vorgangsnummer/Retry sowie Zugang und fehlende öffentliche Konfiguration.
- `grundlage/controls.css`, `Icon.tsx`, `README.md`: gemeinsame Bedienflächen und vier eigene Symbole;
  semantische Symbolfarbe für Fehler. Keine neuen Tokens nötig.
- `rahmen/InstrumentShell.tsx`, `rahmen.css`: Ordnungsnummern entfernt; nur tatsächliche Zähler bleiben.
- Frühe Instrument-Weichen in `LoginPage.tsx`, `SettingsPage.tsx`, `AppGate.tsx`, `ConfigMissing.tsx`,
  `components/States.tsx`. Authentifizierung, Abfragen, Mutationen und Berechtigungen bleiben am bisherigen Ort.
  `ConfigMissing` wird in `main.tsx` vor dem normalen App-Provider gerendert und benötigt deshalb seinen eigenen
  ThemeProvider. Der Provider ergänzt kein HTML; Tagwerk wurde dagegen verglichen.
- `tools/check-source.mjs`: zusätzliche Vertragsprüfung gegen Ordnungsnummern, festgehaltene Endanimationen und
  fehlenden Darstellungskontext der Konfigurationsseite.

Keine fremden Bereiche, Taskdatei, Backend- oder Paketdateien geändert. Keine künstliche Funktion oder Kennzahl.
Die vorhandenen Längenregeln der Prompt-Felder wurden übernommen, keine neuen Produktlimits eingeführt.

## Automatische Abnahme

Abschlusslauf am 16.10.2026, 19:30 Uhr, nach der letzten Quelländerung:

| Befehl | Ergebnis |
| --- | --- |
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm run check:source` | Exit 0; 132 Quelldateien, 152 AA-Kontrastpaare |
| `npx vitest run --maxWorkers=4 --testTimeout=30000` | 21 Dateien, 246/246 Tests; 10,31 s |
| `node --test src/instrument/grundlage/startup.test.mjs` | 12/12; 103,5 ms |
| `git diff --check` | Exit 0 |

Protokolle: `.local/instrument-welle2-a/vitest-abnahme.log`, `startup.log`.
Ausgangslauf ebenfalls 246/246. Ein eigener vorübergehender Lintfehler entstand durch lokale Prüf-TSX-Dateien:
die unversionierte Prüfkopie liegt nun als `.tsx.txt` und gehört nicht zum Produkt. Kein Lint-Ausschluss ergänzt.
Die zwischenzeitlichen parallelen TS-/Chat-Testfehler wurden von ihren Besitzern behoben; Abschlusslauf grün.

## Browserabnahme und Bedienung

Start: `npx vite --config vite.harness.config.ts --port 5231`,
`http://127.0.0.1:5231/anmelden`, nur TreeChat-`browser_*`, unsichtbar.
Nur fiktive Harness-Anmeldung `pruefung@beispiel.invalid` / `nur-synthetisch`; keine echten Konten/Provideraufrufe.
Zusätzliche lokale Prüfkopie verwendet dieselben echten Komponenten und kontrollierte synthetische Backenddaten
für Zugangsfehler, Modellfreigaben sowie Speichern/Zurücksetzen.

| Ablauf / Frage | Beobachtetes Ergebnis |
| --- | --- |
| Anmeldung fehlerhafte E-Mail / falsches Passwort | Sichtbarer Fehler; Fokus E-Mail bzw. Passwort; falsches Passwort geleert |
| Demo-Zugang | Nur `test@test.de` eingesetzt, Passwort leer, Fokus im Passwortfeld |
| Anmeldung speichern aus / an | Tatsächliche Anzeige 15 Minuten / 30 Tage, keine zweite fiktive Kennzahl |
| Gültige synthetische Anmeldung → Einstellungen | Fertig geladen, echte Seed-Inhalte statt nur Leerzustände |
| Modus / Modelle | „Nur Auskunft“ und wirkliche Erstellgrenze; 0/2 im Seed, zusätzlich 1/2 mit freigegebenem Testmodell |
| Persona bearbeiten → Abbrechen | Editor geschlossen; gespeicherter Text unverändert |
| Speichern, kontrollierter Fehler `NOT_DEPLOYED` | „Nicht gespeichert“, bearbeiteter Text bleibt erhalten |
| Speichern, kontrollierter Erfolg | Revision 2, Prompt-Version 2, neue Persona, Editor geschlossen |
| Standard wiederherstellen | Revision 3, tatsächlicher Standardtext, Reset-Aktion danach nicht mehr nötig |
| Mitglied ohne Verwaltungsrecht | Kein Bearbeiten-Knopf, erklärter Verwaltungszustand |
| Theme / Design | Beide Themes und Instrument/Tagwerk gewechselt; bestehende Speicherung genutzt |
| Fehler erneut laden | Callback ausgelöst; AppGate-Retry bis zur fertig geladenen Einstellungsseite |
| Kein Zugang → Abmelden | Zurück zur Anmeldung |
| 390 px, Login/Einstellungen/Zustände/Gates/Config | `innerWidth = scrollWidth = 390`; Ellipsen-Zählung jeweils 0 |
| 1920×1080 | Seitenbreite und Scrollbreite 1920; alle Karten und die vollständige Scrollstrecke angesehen |
| Ruhe nach Auftritt | `document.getAnimations()` = `[]`; Endwerte 30 Tage, 1 Version, 0 von 2 geprüft |
| `/aufgaben`, nach normalem Reload/Navigation | 0 Animationen, 0 `.in-nav-order`; echte Navigationzähler 1, 1, 2 |

Ellipsen-Messung gemäß Modellregel:
`[...document.querySelectorAll('*')].filter(e => getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth).map(e => e.textContent)`.

Symbolknöpfe als echte DOM-Ausschnitte 4× angesehen (`buttons-4x.png`). Kundenansicht, Sachbearbeiter-Test,
Bearbeiten, Abmelden, Anmelden und Erneut laden: Symbol-/Textmitten-Abstand 0 px, Zwischenraum 7 px.
Dunkel/Hell: Mitten-Abstand 0,09375 px. Größter gemessener Inhaltsversatz im Knopf 0,0078125 px.
Damit innerhalb ±0,5 px und 6–8 px. Hover, Editor und Scrollen bis Abmelden geprüft.

## Bildbelege

Alle folgenden Dateien liegen lokal unter **`.local/instrument-welle2-a/`**. `bilder.json` enthält Originalpfad,
URL, Aufnahmezeit und Bildgröße. Die Abnahmebilder wurden selbst geöffnet; keine Bewertung nur aus Geometrie.

| Fläche | 1920×1080 hell / dunkel | 390 px |
| --- | --- | --- |
| Anmeldung | `final-login-hell.png`, `final-login-dunkel.png` | `final-login-handy-hell.png`, `final-login-handy-dunkel.png` |
| Einstellungen | `final-settings-hell.png`, `final-settings-dunkel.png`; vollständige Seite zusätzlich `*-full.png` | `final-settings-handy-hell.png`, `final-settings-handy-dunkel.png`; echte Bildschirmbilder `final-settings-handy-dunkel-viewport.png`, `final-settings-handy-unten.png` |
| Laden / Leer / Fehler | `states-hell.png`, `states-dunkel.png` | `states-handy.png` |
| Zugang lädt | `gate-loading-hell.png`, `gate-loading-dunkel.png` | `gate-loading-handy.png` |
| Zugang fehlt | `gate-noaccess-hell.png`, `gate-noaccess-dunkel.png` | `gate-noaccess-handy.png` |
| Zugang Fehler | `gate-error-hell.png`, `gate-error-dunkel.png` | `gate-error-handy.png` |
| Konfiguration fehlt | `config-hell.png`, `config-dunkel.png` | `config-handy.png` |
| Rahmen Aufgaben | `final-tasks-frame.png` | Rahmenbreite zuvor mit Einstellungen geprüft |

Weitere Belege: `login-error-handy.png`, `settings-save-error.png`, `buttons-4x.png`.
Bei langen Handy-Vollbildern zeichnet der Browser die feste untere Navigation an ihrer Bildschirmposition in das
Gesamtbild. Das ist kein im Produkt mitscrollender Zwischenbalken; deshalb zusätzlich obere/untere Viewportbilder.

## Tagwerk: Bildvergleich

Kontrollierter Vergleich der ursprünglichen Komponenten aus `git show 7bd021e:<pfad>` mit den aktuellen Weichen;
identische synthetische Inhalte, feste Sitzungsfrist, identische Schriftladebedingungen. Nicht aus einer nur
vermeintlich umgestellten Designwahl abgeleitet. Original- und Prüfkörper bleiben unversioniert unter `.local/`.

**11 Bildpaare bytegleich** (`Path.read_bytes()`), also auch pixelgleich:

- Anmeldung und Einstellungen jeweils 1920 dunkel, 1920 hell und 390 dunkel: 6 Paare.
- Laden/Leer/Fehler-Galerie, AppGate Laden/Kein Zugang/Fehler, ConfigMissing jeweils 390 dunkel: 5 Paare.

Dateimuster `tagwerk-<fläche>-before-<theme>-<breite>.png` und `after`; Desktop-Dunkel ohne Breitensuffix.
Einzelresultate in `.local/instrument-welle2-a/tagwerk-vergleich.json`, alle `equal: true`.
Das ist ein Vergleich dieser Ansichten/Zustände, keine Behauptung über jede mögliche Textlänge oder alle Fremdseiten.

## Eigene Gestaltungsnote

Subjektive Note nach Nacharbeit: **9/10 für Bereich A**. Start bei 5; vier Bildbelege für vier zusätzliche Punkte:

1. **+1 Aufbau:** `final-settings-hell.png` – vier zusammenhängende Arbeitsfelder, fluchtende Kanten,
   gemeinsame Kartenköpfe; Vergleich mit Entwurf `desktop-hell.png` und HX-2 `d2-hx2-laeufe-und-masse.jpg`.
2. **+1 Hierarchie:** `final-settings-dunkel.png` – echte Mono-Werte 1/30/0, kleine Einheiten, klare Kopf-/Textstufen,
   volle Sachfarbe an den Symbolen; neben der Stilquelle dieselbe ruhige Instrumentenordnung.
3. **+1 eigene Bildsprache:** `final-login-hell.png` und `states-dunkel.png` – selbst gezeichnete isometrische
   Zugangskarte und geschichtete Leerzustände, präzise Striche und ein gefüllter Sachteil wie Tenet/Vigil.
4. **+1 vollständiger kleiner Bildschirm:** `final-login-handy-dunkel.png`, `final-settings-handy-unten.png`,
   `config-handy.png` – echte Bedienflächen, geordnete Umbrüche, erreichbarer Abschluss statt abgeschnittener Aktionen.

Je Ablauf vor / nach eigener Nacharbeit: Anmeldung 8 → 9 (Pseudo-Datenbild entfernt, reale Sitzungszahl),
Einstellungen 8 → 9 (lange Einzelkarten zu dichtem 2×2-Aufbau mit geteilter Sitzung), Zustände/Gates 8 → 9
(eigene Zeichnung, sichtbarer ruhiger Ladetext, klare Fehlerfarbe), Rahmen 8 → 9 (nur tatsächliche Zähler).
Keine externe Award-Bewertung; Bilder und diese Note sind die eigene Abnahme.

Die **drei schwächsten Stellen** bleiben:

1. `.local/instrument-welle2-a/final-settings-handy-dunkel.png`: Der vollständige Systemprompt macht die
   Handyseite lang. Bewusst vollständig lesbar; ein zusätzlicher Sprung zum Abschnitt wäre künftig hilfreich.
2. `.local/instrument-welle2-a/gate-noaccess-dunkel.png`: Die Zugangsskulptur ist stimmig, aber abstrakter als
   ein unmittelbar lesbares Schloss; die konkrete Aussage trägt die Überschrift.
3. `.local/instrument-welle2-a/final-settings-hell.png`: Im Nur-Auskunft-Feld verbleibt unter der kurzen Erklärung
   mehr Ruhefläche als im Modellkatalog. Gleiche Zeilenhöhe hält den Gesamtaufbau geordnet; keine Fülldaten eingesetzt.

## Integration, Grenzen und Bereinigung

`git log 7bd021e..main` vor Abschluss gelesen: `d40dde5` (gemeinsamer Übersichts-Fragenablauf) und `427bfc4`
(Sachbearbeitung) sind berücksichtigt: vorhandene Hooks, Rahmen/View-Umschaltung und alle Tests bleiben nutzbar.
Zusätzliche uncommittete B/C/D-Änderungen sind im gemeinsamen Prüflauf enthalten, nicht Teil dieses Commits.

Kein echter Supabase-/Provider-/Vercel-Abnahmelauf und keine Veröffentlichung in diesem Designauftrag.
Kein dauerhafter CPU-Vergleich: 0 Browseranimationen belegt das Bewegungsende, keine gemessene CPU-Einsparung.
Keine Änderungen an Welle-1-Startskripten nötig; deren bestehender Start-/Reduced-Motion-Test bleibt 12/12 grün.

Eigene Browser-Tabs geschlossen (`browser_tabs: []`), eigener Port-5231-Server beendet; Port 5231 ohne Listener.
Prüfbilder, Protokolle und synthetische Prüfansichten bleiben ignoriert unter `.local/`.
Abschluss mit ausschließlich eigenen Pfaden auf `main`; **kein Push**. Fremde Änderungen bleiben unangetastet.

## Zusatz: Einzahl und Mehrzahl der Bausteine

- [x] Timeline: −2 / −1 / heute / +1 / +2 prüfen; „Seit 1 Tag“, „Seit 2 Tagen“, „In 1 Tag“, „In 2 Tagen“.
- [x] Metric: bekannte zählbare Einheiten nach der angezeigten Zahl beugen, auch im Zählwerk und zugänglichen Text.
- [x] Übrige Bausteintexte prüfen; Tagwerk-`src/lib/format.ts` unverändert lassen.
- [x] Kleine Regression, Vertragsprüfungen, Browserbild und Bericht; ausschließlich eigene Pfade committen, kein Push.

Geändert: `grundlage/Timeline.tsx`, `Metric.tsx`, `README.md`; neue Regression `wording.test.mjs`.
Metric nimmt weiter eine Zeichenfolge als Einheit entgegen: beide Formen werden für elf vorhandene zählbare
Begriffe erkannt. Beispielsweise werden aus `unit="Tage"` bei 1 „Tag“ und aus `unit="Version"` bei 2 „Versionen“.
Feste Einheiten und Angaben wie `kg`, `%`, `von 5` bleiben wörtlich erhalten. Die sichtbare Einheit folgt auch dem
gerundeten Zwischenwert des endlichen Zählwerks; der zugängliche Text nennt den grammatisch richtigen Endwert.
CardHead, Segments, Reveal und DesignSwitch enthalten keine weiteren variablen Zahltexte. Die festen
Timeline-Achsenwerte −14/+42 behalten korrekt „Tage“. Andere Bereiche und Tagwerk-Texte nicht geändert.

Abnahme 16.10.2026, 19:40 Uhr:

- Typecheck, Lint, Source: Exit 0; weiterhin 132 Dateien und 152 Kontrastpaare.
- Vitest: 21 Dateien, 246/246, 10,17 s (`vitest-zahltexte.log`).
- `node --test src/instrument/grundlage/wording.test.mjs src/instrument/grundlage/startup.test.mjs`:
  17/17 (`zahltexte-node.log`): 12 Starttests und fünf Zähltext-Tests einschließlich vier Untertests.
  Metric-Regression mit 88 Kombinationen aus Einheit, übergebener Wortform und Zahl; zusätzlich Rundung,
  Dezimalwert, feste Einheit und ungültige Werte. Timeline mit fünf Tagen um Heute.
- Echte Bausteine zusätzlich in temporärer Prüfgalerie auf Port 5231: sichtbare und zugängliche Texte korrekt.
  1.662 beobachtete Zahl-/Einheit-Paare während des Zählwerks, **0 falsche Paare**. Nach Auftritt 0 Animationen.
- 1920×1080 dunkel/hell und 390 px: Bilder selbst geöffnet. 390 px Scrollbreite, 0 aktive Ellipsen.
  Belege `.local/instrument-welle2-a/zahltexte-dunkel.png`, `zahltexte-hell.png`, `zahltexte-handy.png`;
  Metadaten `zahltexte-bilder.json`. Gestaltung unverändert, keine neue Gestaltungsnote aus dieser Textkorrektur.
- Vorherige Browser-Falle ergänzt: HTML über Vites `/@fs/` wird roh ausgeliefert. Für eine isolierte Prüfgalerie
  Moduldatei extern einbinden, damit Vite deren Imports auflöst. Leeres Erstbild verworfen, nur geladene Galerie gewertet.
- Temporäre eigene Prüfdateien entfernt, eigener Tab geschlossen und Port-5231-Server beendet.
  `git log 4bc06a2..main` berücksichtigt `86b86ae` (Chat), `4e71687` (Sachbearbeitungs-Einheiten/Aktionen)
  und `3015e5c` (Übersicht/Aufgaben/Dokumente); keine Änderung in den gemeinsamen A-Bausteinen.
