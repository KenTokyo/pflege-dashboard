# Unabhängige Prüfung: Text und echte OpenUI-Antworten

Stand: 07.10.2026, unabhängiger Schlusslauf 23:55 Uhr. Auftrag: [Chat-Ansichten](tasks/2026-10-07-chat-ansichten-tasks.md). Dieser Prüfagent verändert ausschließlich diesen Bericht. Keine Anwendung implementiert, kein Browser, kein Git-Schreibvorgang, keine Provideranfrage und kein Datenbankzugriff.

## Geprüfter Vertrag

Die Umsetzung nutzt tatsächlich `@openuidev/react-lang`/`lang-core` 0.3.1 mit eigenem begrenztem Tagwerk-Katalog. Das entspricht dem Integrationsweg der [offiziellen Anleitung](https://www.openui.com/docs/getting-started) mit eigener [Komponentenbibliothek](https://www.openui.com/docs/openui-lang/defining-components); es handelt sich nicht bloß um anders eingefärbtes Markdown. Provider bleiben die vorhandenen Adapter. Kein OpenUI-Gateway oder neuer Anbieteraccount.

| Bereich | Ergebnis der unabhängigen Quellprüfung |
| --- | --- |
| Standard und Eingabe | `responseFormat` ist optional; nur `text`/`openui`. Weglassen bleibt Text. Freie Browser-Systemprompts, Katalogversionen und weitere Felder werden abgewiesen. |
| Speicherung | `messages.content` enthält die kanonische lesbare Projektion; `messages.presentation` enthält getrennt Originalprogramm, Katalogversion und Zustand. Modellherkunft bleibt unberührt. |
| Wiederabruf | OpenUI ist Teil des Inhaltsabgleichs der Anfrage-ID. Gleiche ID mit anderem Format kollidiert; ursprüngliche Text-Hashes bleiben kompatibel. Ein Replay liefert gespeicherte Präsentation ohne erneuten Provideraufruf. |
| Gesprächskontext | Folgefragen bekommen den kanonischen gespeicherten Text einschließlich Hinweisen, nicht das Darstellungsprogramm. |
| Streaming | Eigene Präsentationsereignisse tragen das tatsächliche Programm; die vollständige Textprojektion wird am Abschluss einmal gesendet. Prüfpunkte speichern Text und Präsentation gemeinsam. |
| Fehler/Abbruch | Ungültiges/endgültig unvollständiges Programm wird nicht als erfolgreiche Antwort ausgegeben. Teiltext, Originalprogramm und unvollständiger Zustand bleiben getrennt; bekannte Nutzungswerte werden erhalten. |
| Darstellungsschalter | Gerätepräferenz speichert nur `text`/`openui`, keine Gesprächsinhalte. Umschaltung ändert bestehende Nachrichten nicht und startet keine Anfrage. Neue Antworten verwenden die Wahl; gleicher Wiederabruf verwendet das ursprüngliche Format. |
| Entwürfe | Normaler Composer-Entwurf bleibt beim Umschalten erhalten. Dashboard-Übergabe bleibt der bestehende einmalige Sendeweg. Staff-Einstieg verwendet denselben Gesprächsweg mit zugeordneter Person. |
| Quellen und Warnungen | `MessageView` erhält Modellherkunft, Quellen und Statuswarnungen außerhalb der austauschbaren Antwortkomponente. Texte und Komponenten verwenden denselben sicheren Markdownrenderer. |

## Katalog und Nebenwirkungen

Gelesen wurden Shared-Katalog/Parser, Backend-Handler/SQL-Verträge, Streamstore/SSE, `AnswerBody`, `OpenUiAnswer`, React-Katalog und installierter SDK-Quelltext.

- Zugelassen: eine literale `Answer`-Wurzel mit `Text`, `Facts`, `Steps`, `Notice`. Der vollständige lexikalische Check weist zusätzliche Statements, Referenzen, Ausdrücke, Zustände, `Query`, `Mutation`, `Action`, unbekannte Komponenten und überzählige Argumente ab. Kein Vertrauen allein in den Modellprompt.
- Nach dem SDK-Parser wird die Struktur erneut mit den gemeinsamen Schemas geprüft. Die Größe bleibt begrenzt: 100.000 Quellzeichen, 24 Abschnitte, 40 Einträge pro Liste. Keine freie Rekursion von Layoutknoten.
- React rendert Strings sicher; Markdown-HTML bleibt ausgeschaltet, unsichere Linkschemata und Modellbilder bleiben gesperrt. Ein unverarbeitetes Programm darf nur als React-Text innerhalb von `pre` erscheinen.
- Renderer verwendet `toolProvider={null}`, `publishObservability={false}` und keinen `onAction`-Handler. Query-/Mutation-Programme gelangen schon wegen des Literalchecks nicht bis zur Laufzeit; allein ein Null-Provider wäre kein ausreichender Nachweis gegen SDK-Timer.
- Das SDK-Web-Entry startet im Entwicklungsmodus sonst ein eigenes Devtools-Widget. Der vorangestellte Bootstrap setzt dessen Initialisierungswächter. Das ist eine interne SDK-Anbindung, die bei normalen Paketupdates geprüft werden muss; es gibt keine künstliche Versionssperre.
- Die lokale SDK-Library-Registrierung im Entwicklungsmodus enthält Katalognamen, keine Antworttexte. Stream-Observability ist ausdrücklich ausgeschaltet. Node-Telemetrie ist laut installierter Quelle opt-in (`OPENUI_RUNTIME_TELEMETRY_ENABLED`) und respektiert `OPENUI_TELEMETRY_DISABLED`/`DO_NOT_TRACK`. Für die unabhängigen Node-Läufe wurde sie explizit deaktiviert. Kein Telemetrie-Netzaufruf beobachtet; ein Browser-Netzwerkbeweis steht aus.

## Befunde und Nacharbeit

| Schwere | Befund | Nacharbeit / Stand |
| --- | --- | --- |
| P2, behoben | `RenderBoundary key={result.source}` baute SDK-Renderer, Parser, Store und die erzeugten Linkelemente bei jedem Fragment neu auf. Das konnte Fokus verlieren und erzeugte unnötige Arbeit. | Quelltext-Key entfernt. Stabile Rendereridentität, gezielter Reset nur nach Fehler und geänderter Quelle. Der unabhängige Test mit echtem SDK bestätigt gleiche Link-DOM-Identität und erhaltenen Fokus bei weiteren Fragmenten. Scrollwirkung im echten Browser bleibt dort zu prüfen. |
| P2, behoben | Eine gültige Präsentation konnte einen anderen Inhalt als `messages.content` anzeigen, weil Text und Komponenten ohne Abgleich aus getrennten Feldern stammten. | Fertige valide Quelle wird gegen kanonischen Text geprüft; bei Abweichung Text plus Warnung. Eine leere kanonische fertige Antwort wird nicht still ersetzt. Beide Varianten im unabhängigen Frontendlauf bestanden. |
| P2, behoben | Die Originalansicht bei Formatfehlern war im unmittelbaren Anfrageweg nicht erreichbar, wenn keine sichere Textprojektion entstand: `PendingTurnView` rief `AnswerBody` ausschließlich bei `visibleText` auf. | Nach beendeter Anfrage reicht eine vorhandene Präsentation zum Einhängen des Ersatzes. Der unabhängige Test mit unbekannter Komponente und leerem Text bestätigt Warnung sowie Originalzugang vor einem Reload. Normale Anbieterprosa wird sicher als Markdown erhalten. Kein automatischer weiterer Modellaufruf. |

Die Nacharbeit erfolgte jeweils beim Frontend-Owner. Zusätzliche Schlusskontrolle: gemeinsame Positionsschemas und Beschreibungen, sichere Inline-Betonung in Abschnittstiteln, Teilabschnitte nach Abbruch und Scroll-Abhängigkeit vom Präsentationsstrom. Keine noch offene konkrete Fehlerstelle aus diesem Review.

## Tatsächlich ausgeführte Prüfungen

- Direkter Node-Lauf gegen den echten Shared-Parser mit elf Fällen: gültiges Programm, Teilprogramm, Query, Mutation, Action, Referenz, unbekannte Komponente, Zusatzargument, leere Wurzel, alleiniger Codezaun, maskierte Zeichen. Erwartete Zustände beobachtet; keine Ausnahme.
- `OPENUI_TELEMETRY_DISABLED=1 npm test -- --run tests/openui.test.ts` im Backend: **31/31 bestanden**, unabhängig wiederholt um 23:54 Uhr. Unter anderem jedes Präfix der Beispielantwort, Zeichenerhalt, Syntax-/Schema-/Mengengrenzen, Zugriff vor Reservierung, tatsächlich gestreamte Programmstücke, genau eine kanonische Projektion, Speicherung vor Completion, Formatfehler, unveränderter Replay und Abbruch mit Teiltext.
- `OPENUI_TELEMETRY_DISABLED=1 npx vitest run tests/unit/openui.test.tsx`: **22/22 bestanden**, final um 23:55 Uhr nach Schreibabschluss des Owners. Tatsächlicher SDK-Renderer in JSDOM, gemeinsame Schemas, Storage-Ausfall/ungültige Präferenz, sichere Links/HTML/Bilder, kanonische Textabweichung, Titelbetonung, Fokusidentität, Quellen, Abbruch, unmittelbarer Formatfallback, erhaltene Entwürfe, genau ein Abschluss, kein Aufruf durch Umschaltung, bewusst neuer Textversuch und Replay mit eingefrorenem Format.
- `npm run typecheck` jeweils in Root und Backend: **beide bestanden**. Keine Build-Ausgabe durch diesen Prüfagenten erzeugt.
- SQL-Datei mit 28 gezielten Fällen gelesen: Format-Hash, Snapshot, Checkpoint, kanonische Historie, Replay, Unveränderlichkeit, Rollenrechte und kein Authkonto. Dieser Prüfagent hat sie **nicht ausgeführt**. Ausführung/Nachweis beim Backend-Owner und Root.
- Der Frontend-Owner meldet zusätzlich 242/242 Gesamttests sowie Gesamtlint, Build, Quell- und Bundleprüfung grün. Das ist ein übernommener Bereichsnachweis; der unabhängige Eigenlauf dieses Berichts umfasst die oben genannten 53 gezielten Tests und beide Typprüfungen.

Der erste Frontendlauf hatte 17/19 bestanden: unterschiedliche Katalogbeschreibungen und eine zu frühe Freigabe des künstlich gehaltenen Streams im Test. Gemeinsame Beschreibungen sowie Warten auf die tatsächliche Halteposition korrigierten beide Punkte; der finale erweiterte Lauf ist vollständig grün. Die JSDOM-Meldung zur nicht implementierten `window.scrollTo()`-Methode ist eine Testumgebungsgrenze und kein Scrollnachweis.

## Bedeutung für Angehörige und Sachbearbeitung

Beide Einstiege verwenden dieselben gespeicherten Nachrichten und denselben Renderer. Fakten sind geordnete Aussagen der Modellantwort, keine neu berechneten oder unabhängig verifizierten Daten. Schritte sind Vorschläge; der Katalog hat keine ausführenden Aktionen. Die Darstellung verbessert die Lesereihenfolge, beweist aber keine fachliche Richtigkeit der Antwort. Unsicherheiten bleiben als Text oder Hinweis erhalten; Quellen und Status kommen weiterhin aus dem bisherigen Nachrichtenweg. Bestehende Textantworten werden beim Umschalten vollständig als Text angezeigt und lösen keine nachträgliche Modellumwandlung aus.

Die gelesenen Stilregeln bleiben bei Tagwerk: 44px Schalter, 16px Abschnittstitel, 18px Abschnittsabstand, feine Trenner und eine dezente Hinweisfläche. Keine verschachtelten Layoutkarten oder neue Dauerschleife. Farbkontrast, Platzbedarf, Screenreader-Verhalten und tatsächliches Scrollen lassen sich aus diesen Quell-/JSDOM-Prüfungen nicht abschließend bewerten; dafür wird hier keine unbelegte visuelle Note vergeben.

## Akzeptanz vor Veröffentlichung

1. UI-Endfall: Entwurf → OpenUI wählen → echte Komponenten → Text umschalten → Folgefrage → Reload; kein zusätzlicher Aufruf durch bloßen Sichtwechsel.
2. Alter Textverlauf, ungültige/unbekannte Katalogversion, ungültige Präsentation ohne Projektion, unterbrochener Stream und Replay mit ursprünglichem Format.
3. Beide Einstiegspfade: pflegende Angehörige über Kundenansicht sowie Sachbearbeiter über Fallöffnung, gleiche echte Berechtigungen.
4. 390/768/1280px, hell/dunkel, Tastatur, langer Modell-/Personenname, Quellenlinks und Fokus während Streaming; Eingabe bleibt erreichbar.
5. Browser-Netzwerk: kein OpenUI-Gateway, Telemetrie, SDK-Toolaufruf oder zusätzliches Request durch Rendern/Wechseln. Kein weiterlaufender Prüfbrowser.

Schlussurteil: Die geprüfte Konstruktion und die gezielten lokalen Nachweise sind tragfähig; die drei gefundenen Fehlerstellen sind nachgebessert und unabhängig geprüft. Bereit für die Browser- und Onlineabnahme des Orchestrators. Visuelle Qualität, tatsächlicher Provideroutput, Hosted-SQL und Vercel-Endablauf werden hier nicht als geprüft behauptet. Keine eigenen Browser oder dauerhaften Prüfprozesse gestartet; alle Node-Prüfungen beendet.

## Nachtrag 08.10.2026: Formatwechsel nach bestehender Historie

Anlass ist ein vom Orchestrator beobachteter echter DeepSeek-Ablauf: OpenUI-Antwort erfolgreich, danach Textantwort erfolgreich, beim dritten Turn nach Rückwechsel zu OpenUI normales Markdown statt des angeforderten Komponentenprogramms. Dieser Prüfagent hat den Liveablauf nicht selbst ausgeführt. Enger Nachprüfauftrag: Korrektur der Formatbindung, unveränderte Historie, vertrauenswürdige Anweisung, Tokenbudget, Anbieterwege und keine heimliche Wiederholung.

**Zusätzlicher bestätigter Konstruktionsfehler:** Der bisher tatsächlich erzeugte `OPENUI_INSTRUCTIONS`-String enthielt trotz `bindings:false` SDK-Ratschläge wie `Use references for readability`, `prefer references` und einen Hoisting-Abschnitt. Diese widersprachen unserem strikten Literalparser. Der String wurde unabhängig direkt ausgegeben und geprüft. Die Nacharbeit ersetzt diesen allgemeinen SDK-Prompt durch einen eindeutigen serverseitigen Prompt mit genau den fünf erlaubten Positionssignaturen, Inline-Kindern und JSON-Stringliteralen. Der echte SDK-Parser/Renderer und gemeinsame Katalog bleiben erhalten. Der finale Prompt enthält keinen dieser widersprüchlichen Ratschläge; sein tatsächliches Inline-Beispiel wurde unabhängig mit `parseOpenUi` als `valid` geprüft.

Geprüfte Änderungen: `backend/runtime/format-binding.ts`, `handler.ts`, `provider.ts`, `gemini.ts`, `types/openui.ts` sowie `backend/tests/format-binding.test.ts` und die angepassten OpenUI-Tests. Keine Änderung an SQL oder HTTP-Vertragsfeldern nötig.

| Prüffrage | Ergebnis am finalen Stand |
| --- | --- |
| Bleiben frühere Aussagen erhalten? | `boundProviderInput` übernimmt alle bisherigen User-/Assistant-Einträge und die aktuelle Frage unverändert und in derselben Reihenfolge. Ein neues Array ergänzt ausschließlich unmittelbar vor der aktuellen Frage eine vertrauenswürdige Systemnachricht. Der Quellkontext wird nicht mutiert; keine erfundene Nutzerzeile, keine Umschreibung gespeicherter Nachrichten. |
| Ist die aktuelle Wahl maßgeblich? | Die Serverkonstante benennt ausdrücklich den aktiven Transportvertrag. Früherer kanonischer Text ist Sachkontext und kein Formatvorbild; „kurz“ oder „ein Satz“ steuern den Inhalt innerhalb des gewählten Formats. Textwahl fordert ausdrücklich normalen Text, OpenUI ausschließlich das erlaubte Programm. |
| Kann der Browser diese Anweisung frei setzen? | Nein. Der Request erlaubt nur die Format-Enumeration. `reservedFormatInstructions` wird im Handler vor `edge_chat_prepare` aus Serverkonstanten gebildet; das geschützte Snapshot enthält sie vor Reservierung und Ausführung. Der spätere Zusatz stammt wieder aus derselben Serverkonstante und dem Snapshotformat. |
| Wird zusätzlicher Input berücksichtigt? | Eine Kopie steht bereits in den reservierten `instructions`. Die zusätzliche Kopie auf dem Anbieterweg wurde als UTF-8 nach JSON-Escapes gegen den bestehenden SQL-Transportpuffer von 4096 Bytes geprüft; beide Formate liegen darunter. OpenAI und Gemini zählen exakt denselben gebundenen Input wie bei der anschließenden Generierung. DeepSeek/OpenCode behalten die bestehende konservative Kontext-/Reservierungsgrenze; Ausgabegrenzen werden nicht erhöht. |
| Sind Anbieterrollen passend? | OpenAI sowie DeepSeek/OpenCode verwenden eine Systemnachricht vor der letzten echten Nutzerfrage. Gemini behält ausschließlich `user`/`model` in `contents`; die zusätzliche Konstante steht dort in `systemInstruction`. Der Test vergleicht für Gemini vollständigen Zähl- und Generierungsbody sowie unveränderte historische Inhalte. |
| Entstehen zusätzliche Antworten oder automatische Wiederholungen? | Nein. OpenCode führt genau eine Generierung aus. OpenAI/Gemini behalten jeweils ihren vorhandenen Zählaufruf und eine Generierung. Der vollständige Handler-/OpenCode-Test prüft gültigen Output und erneuten Markdown-Formatfehler: jeweils genau eine Generierung und ein Abschluss. Ein Formatfehler bleibt lesbar, `failed`/`PRESENTATION_INVALID`, mit bekannter tatsächlicher Nutzung; keine verdeckte Reparaturanfrage. |
| Bleiben Wiederabruf und ältere Snapshots erhalten? | Ohne historisches Formatfeld bleibt der Anbieterinput unverändert. Der bestehende Replay-Test liefert gespeicherte Präsentation ohne Provideraufruf oder neue Reservierung. Die neue Verstärkung wird nicht auf gespeicherte Antworten angewendet. |

**Unabhängig ausgeführt am 08.10.2026 um 00:19 Uhr:**

- `OPENUI_TELEMETRY_DISABLED=1 npm test -- --run tests/format-binding.test.ts tests/openui.test.ts tests/deepseek.test.ts tests/gemini.test.ts tests/opencode-ending.test.ts` im Backend: **185/185 Tests in fünf Dateien bestanden**, einschließlich zwölf neuer Formatbindungsregressionen mit der fünfzeiligen gemischten Historie des Livefehlers.
- Backend `npm run typecheck`: **bestanden**.
- Zusätzlich direkte Prüfung des tatsächlichen Promptstrings, seines Inline-Beispiels und der UTF-8-Größe der zusätzlichen Systemnachricht. Keine Browser-, Datenbank- oder Provideranfrage.

**Urteil und Nachweisgrenze:** Keine verbleibende konkrete Fehlerstelle in dieser eng geprüften Korrektur. Die zwölf neuen Tests verwenden künstlichen Anbietertransport und beweisen Aufbau, Historienerhalt, Budgeteinrechnung und Fehlerverhalten. Sie beweisen nicht, dass ein echtes Modell die klarere Anweisung stets befolgt, und ersetzen keine echte Annahme des Requests durch jeden Anbieter. Der ursprüngliche gemischte Onlineablauf muss nach Veröffentlichung durch den Orchestrator erneut vollständig bis Antwort, Textwechsel und Reload geprüft werden. Dieser Nachtrag behauptet keinen neuen Liveerfolg und keine zusätzliche Layoutabnahme.
