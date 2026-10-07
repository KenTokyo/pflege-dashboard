# Gemini, Warteanzeige, Spracheingabe und Tagwerk-Feinschliff

Stand: 07.10.2026. Frontend-Bereich; kein Browserstart und keine Gitmutation durch diesen Agenten. Der Orchestrator übernimmt echte Live- und Sichtprüfungen sowie Veröffentlichung.

## Ergebnis

- Gemini erscheint als **Google AI Studio** in Katalog, aktueller Modellauswahl und Antwort-Snapshots. Der konkrete Modellname kommt weiterhin aus dem serverseitigen Katalog. Ungeprüfte Region und nicht bereitgestellte Werkzeug-/Bildfähigkeiten werden nicht aufgewertet.
- DeepSeek/OpenCode bleibt erhalten. Die neue native Auswahl im vorhandenen Chatkopf speichert einen Gesprächs-Override oder den Workspace-Standard über den bestehenden `set_conversation_preferences`-RPC. Mitgliedschaft, Modellfreigabe und Revision bleiben serverseitig geprüft. Ein Modellwechsel sendet keine Nachricht und erhält den Entwurf, Personbezug, Modus und Archivstatus.
- Neue Anbieterfehler sind getrennt verständlich: fehlende Einrichtung, abgelehnter Zugang, Anfragegrenze, vorübergehend nicht erreichbar und verweigerte Antwort. Kein automatischer Modellwechsel oder Neuversuch. Nur ausdrücklich ausgelöste Neuversuche erhalten eine neue Anfrage-ID; erneutes Abrufen einer möglicherweise gespeicherten Antwort nutzt weiterhin dieselbe ID.
- Die aktive Anfrage zeigt **Anfrage wird gesendet …**, nach Annahme ohne Text **Denkt nach …**, mit sichtbarem Text **Antwort wird geschrieben …**. Kein leerer Wartecursor, kein dekorativer Timer. Abschluss, Fehler und Abbruch beenden die Warteanzeige. Teiltext bleibt ehrlich als unvollständige Antwort sichtbar.
- Spracheingabe nutzt die tatsächlich vorhandene `SpeechRecognition`- oder `webkitSpeechRecognition`-Fähigkeit: `de-DE`, kontinuierliche Erkennung und Zwischenergebnisse. Finale Ergebnisse kommen in den vorhandenen Entwurf. Es wird nichts automatisch gesendet. Ein bewusstes Stoppen wartet auf das finale Ergebnis; falls der Browser Abschlussereignisse auslässt, endet das Mikrofon spätestens nach 800 ms und sichert den Zwischentext. Späte finale Korrekturen werden nicht doppelt angehängt.
- Normale Browser-Enden dürfen während einer bewusst aktiven Aufnahme fortgesetzt werden. Nur drei aufeinanderfolgende Enden **ohne neuen Text** begrenzen einen erfolglosen Neustart; echte Ergebnisse setzen diesen Schutz zurück. Verbergen, Seitenwechsel, Abmeldung, Aushängen, eine KI-Antwort oder geöffnete Beispiele stoppen die Aufnahme und räumen Listener/Timer auf.
- **Ablauf und Technik** zeigt nur echte `message.activity`-Ereignisse des Servers: Anmeldung, Kontext, Eingabelänge, Anbieteraufruf, Warten auf Text, Textempfang und Speicherung. Thinking-Konfiguration wird genau aus diesen Metadaten angezeigt. Das bereinigte JSON enthält nur feste Stufen/Quellen, erlaubte Operationen und Zähler. Eingaben, Schlüssel, Header und Gedankeninhalte werden verworfen. Aktuelle Trace bleibt nach einer abgeschlossenen Antwort aufklappbar, ohne die gespeicherte Antwort zu verdoppeln; es werden keine historischen Ereignisse nach Neuladen erfunden.
- Der Alltagsthemen-Dialog hat klare Themenicons, eine ruhigere Hierarchie, thematische Kurzbeschreibungen und dezente vorhandene Akzentflächen. Die Auswahl bleibt ein bearbeitbarer Entwurf. Der Dashboard-Einstieg hat einen subtilen Tokenrand und eine Akzentfläche am Icon.
- `NewConversationDialog` unterstützt optional `initialRecipientId`, validiert gegen die übergebenen Personen. Eine ausdrückliche Nutzerauswahl hat Vorrang. Dies verbindet die separate Sachbearbeiteransicht mit dem bestehenden Dialog.

## Referenz und konkrete Gestaltung

Gelesene Referenzen: bestehende Tagwerk-Komponenten und Theme-Werte, `QuestionExamplesDialog`, `ThreadHead`, `Composer`, `DashboardPage`, sowie der Nutzerscreenshot `/var/folders/9v/89xd0tws1kl0j78fbm8_xjjw0000gn/T/codex-clipboard-b235f138-4b41-4e54-b977-ef5f98f4adab.png` (638 × 505 px).

Der Screenshot zeigt den KI-Fragebereich mit etwa 596 px Breite, 18 px seitlichem Innenabstand, 21 px Titel, 40 × 40 px Iconfläche und 46 px Eingabefeld/Knopf. Die helle Außenkontur stammte tatsächlich aus `.ask { border: 1.5px solid var(--text) }`, nicht aus einem Tastaturfokus. Ersetzt durch dezente Tiefe/Tokenrand; der sichtbare Eingabefokus bleibt unverändert. Keine neue Schrift und kein zweites Farbsystem.

Der Beispiel-Dialog behält 680 px Desktop-Maximalbreite, 18 px Titel, 14–16 px Inhalt und 44 px Bedienziele. Themen sind in zwei ruhigen Spalten angeordnet; Inhalt bleibt ein einzelner scrollender Bereich. Unter 768 px verwendet er weiter die vorhandene Vollbildhülle mit festen Kopf-/Fußbereichen und sicheren Bildschirmrändern. Hover/aktiv/fokussiert/deaktiviert sind aus den vorhandenen Theme-Tokens abgeleitet; keine Endlosanimation.

Die unabhängige Root-Sichtprüfung bei 390/768/1280 px in beiden Themes fand anschließend einen mobilen Satzumbruchfehler: `.question-context` erbte `display: flex` von `.note` und trennte Satzteile. Die lokale Regel setzt jetzt ausdrücklich `display: block`; der normale Inline-Satzumbruch ist damit wiederhergestellt. Betroffene Fragenregression **3/3**, Quellprüfung und Diffprüfung danach erneut bestanden. Die visuelle Wiederabnahme dieser letzten CSS-Korrektur liegt beim Orchestrator.

Angewendete Skills: `redesign-existing-projects`, `better-ui` und für den vorhandenen RPC-Anschluss `supabase`. Aktuelle Dokumentation geprüft: [Supabase JavaScript RPC](https://supabase.com/docs/reference/javascript/rpc), [Supabase Changelog](https://supabase.com/changelog), [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [continuous](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous), [interimResults](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/interimResults), [Fehlerereignisse](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/error_event) und [Endereignis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/end_event). Chrome kann die Aufnahme über seinen Spracherkennungsdienst verarbeiten; eine lokale Offline-Erkennung wird nicht behauptet.

| Schwere | Stelle | Vorher | Nachher | Grund |
| --- | --- | --- | --- | --- |
| Mittel | `src/routes/chat/PendingTurnView.tsx` | Kleiner Wartehinweis/leer wirkender Cursor | Klare statische Statusfolge und ehrlicher Teiltext | Sichtbarer Zustand während tatsächlicher Arbeit |
| Mittel | `src/styles/app.css`, `.ask` | Sehr heller Panelrand und weiße Iconfläche | Dezenter Tokenrand/Akzentfläche, Inputfokus erhalten | Tiefe und Struktur unterscheiden |
| Mittel | `QuestionExamplesDialog.tsx`, `app.css` | Gleichförmige Themenknöpfe ohne thematische Orientierung | Themenicons, Beschreibungen, klare Auswahlzustände | Gruppierung und leichteres Lesen |
| Hoch, behoben | Spracheingabe-Lifecycle | Neue Funktion: spätes Final nach Stop und Browser-Enden konnten Textverlust/Duplikate verursachen | Finale Ergebnisse dedupliziert; begrenzter Fehlerneustart und vollständige Aufräumpfade | Entwurf erhalten, Mikrofon nicht im Hintergrund behalten |
| Hoch, behoben | Debug-Transport | Neue Ereignisse würden vom bisherigen Parser abgelehnt | Vertrag erweitert, Felder normalisiert und strikt bereinigt | Tatsächlichen Ablauf nutzbar machen, keine Rohdaten anzeigen |

## Tatsächliche Prüfungen

- 9 fokussierte Testdateien: **143/143 bestanden**. `chat`, `chatKeyboard`, `model`, `sse`, `streamStore`, `supabaseBackend`, `questionExamples`, `speechInput`, `activityTrace`.
- Der vollständige Frontendlauf vor der abschließenden Staff-Nacharbeit: **215/216 bestanden**; der einzige Fehler lag in einem Navigations-Race der neuen separaten Staff-Testdatei. Dieser wurde vom Staff-Bereichsinhaber korrigiert; den abschließenden Gesamtlauf berichtet er bzw. der Orchestrator. Keine eigene Änderung an seinen Dateien.
- Der Staff-Bereichsinhaber meldete anschließend seinen vollständigen Lauf **216/216** und Gesamtlint bestanden. Nach seinem zusätzlichen Nutzungsanzeige-Test und eingeklapptem Staff-Anfragebereich meldete er nochmals **13/13** fokussiert sowie Typecheck/Lint bestanden. Diese separat berichteten Ergebnisse sind kein eigener Gesamtlauf dieses Agenten.
- Typecheck und Produktbuild inklusive bereits integrierter Staff-Dateien bestanden.
- Fokussiertes Lint für die eigenen Quell-/Testdateien bestanden; letzte rein formale Testkorrektur (`act`-Callback) separat geprüft.
- Quellprüfung bestanden: 64 Dateien, 46 Kontrastpaare für Hell/Dunkel, keine Endlosanimation, kein Polling, keine unerlaubten Client-Servernamen, deutsche Sie-Form.
- Bundleprüfung bestanden: 34 Dateien, 1193 KiB. Fünf nicht öffentliche Konfigurationswerte ausschließlich im Speicher gegengeprüft. Kein Schlüssel, Testtransport, Sourcemap oder eigener Edge-Pfad im Produktbuild. Google-Keymuster und Google/Gemini/OpenCode/DeepSeek-Variablennamen wurden im Prüfer ergänzt.
- `git diff --check` bestanden. Kein eigener Browser, Aufnahmeserver oder langlebiger Prüfprozess gestartet.

Wichtige Negativfälle: kein fehlendes/deaktiviertes Modell durch ein anderes ersetzt; Modellwahl während eines Streams gesperrt; Senden und vorhandener Neuversuch während des Speicherns gesperrt; Revisionskonflikt lädt aktuelle Fassung; gespeicherte Antworten behalten ihren historischen Anbieter; alle vier neuen Fehler vor und nach Teiltext; kein Erfolg ohne `message.completed`; aktive Mikrofonerkennung/Stop/späte Finalkorrektur/manuelle Textänderung/fehlende Freigabe/Netzfehler/Verbergen/Aushängen/Neustartabbruch; unbekannte Trace-Stufen verworfen und zusätzliche sensible Felder aus JSON entfernt.

JSDOM meldet weiterhin das bekannte fehlende `window.scrollTo`. Dies ist kein Nachweis für einen Browserfehler; die echten Bild-/Bedienprüfungen bleiben getrennt.

## Bewertung und Nachweisgrenzen

| Bereich | Vorher | Nachher | Grundlage |
| --- | --- | --- | --- |
| Wartephase und Fehlerrückmeldung | 7,5/10 | 9,3/10 | Quellzustände und synthetischer vollständiger Chatflow |
| Modell-/Anbieterdarstellung | 8/10 | 9,3/10 | Katalog, Gesprächs-Override, historischer Snapshot, Transporttests |
| Spracheingabe | Neu | 9,2/10 für geprüfte Logik | Lifecycle und Negativfälle mit synthetischer Browser-API |
| Technische Ablaufansicht | Neu | 9,2/10 für geprüfte Logik | Echter Vertrag, Allowlist, Abschluss-/Deduplikationstests |
| Dialog/Dashboard-Gestaltung | 8/10 im gelieferten Screenshot | Visuelle Note offen | Quelle überarbeitet; Root-Sichtprüfung noch nötig |

**Not verified:** eigener echter Mikrofonton, reale Chrome-Erkennungsqualität und Berechtigungsdialog, lange Diktate mit echtem Dienst, tatsächliche 390/768-px-Bedienung, Live-Sichtprüfung beider Themes, tatsächliche Gemini-/DeepSeek-Antworten mit diesen Frontendänderungen und Reload auf Vercel. Der Orchestrator besitzt die einzige Browserprüfung. Gespeicherte Anmeldung und Verlaufslogik wurden durch bestehende Regressionstests geprüft; keine neue Sitzungspersistenz implementiert.

Der Orchestrator meldete separat **91 bestandene UI-Prüfungen** bei 390/768/1280 px in beiden Themes, ohne sonstigen Überlauf oder JavaScriptfehler in den geprüften Grundflows. Sein Bericht und die noch ausstehende Wiederabnahme des mobilen Kontextsatzes liefern den tatsächlichen visuellen Nachweis; dieser Agent hat dafür keinen eigenen Browser gestartet.

**Approve – ausschließlich die geprüften Quell-, Build-, Transport- und Logikbereiche.** Visuelle und echte Live-Abnahme bleiben ausdrücklich beim Orchestrator offen.
