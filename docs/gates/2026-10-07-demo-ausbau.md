# Liveabnahme: Demoausbau am 07.10.2026

Auftrag und Fortschritt: [Originalaufträge](../tasks/2026-10-07-gemini-live-enhanced-prompt.md), [Aufgaben](../tasks/2026-10-07-gemini-live-tasks.md).

## Ausgangslage, unabhängig geprüft

Der erste Nutzerscreenshot zeigt localhost, nicht die Vercel-Hauptdomain. Lokale geschützte Konfiguration hatte weder OpenCode- noch DeepSeek-/OpenAI-Schlüssel. Der neue nutzerbereitgestellte Gemini-Schlüssel wurde ausschließlich in die ignorierte `.env` (0600) und als Vercel-Production-Secret `GEMINI_API_KEY` geschrieben. Kein Client-Hardcoding, kein neues Konto, Tarif oder Guthaben.

Vercel führte am 07.10.2026 Commit `b3fcd64` aus. Ein eigener echter UI-Test mit bestehendem nutzerseitigem Demo-Zugang war erfolgreich: Gespräch `93aa125a-e065-4811-94a2-ae4b66456c61`, Anfrage `2ca71ced-c85c-43d6-b0c2-bfdcc300fead`, tatsächliches Modell `deepseek-v4.1-flash`, Request und Nachricht `completed`, 875 Zeichen, 724 Eingabe-/283 Ausgabetokens, genau eine Ledgerzeile. Bezug zu Martha und beiden gespeicherten Aufgaben bestätigt. Nach Reload: Zugang und Antwort erhalten, keine Fehlermeldung. Der Nutzer bestätigt den Erfolg ebenfalls. Der Online-Chat braucht keinen laufenden lokalen Rechner oder CLI.

Gemini-Direktprüfung: `listModels`, `generateContent` und `streamGenerateContent` HTTP200 mit `gemini-3.8-flash`, tatsächliche modelVersion identisch, Finish STOP. Native Streaming-Endnachricht enthält eine leere Text-Part mit thoughtSignature; die Signatur wird nicht dargestellt. Modellmetadaten: 1.048.576 Eingabe-/65.536 Ausgabetoken maximal. Das ist noch keine vollständige App-/Vercel-Gemini-Abnahme.

Quellen: [OpenCode Go, HTTP-Anschluss](https://opencode.ai/docs/go/), [Google API-Referenz](https://ai.google.dev/api/models), [Google Free-Tier-Preise](https://ai.google.dev/gemini-api/docs/pricing), [OpenUI-Prinzip kontrollierter Komponenten](https://www.openui.com/), [Browser-Spracheingabe](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Konkrete Akzeptanzkriterien

| Bereich | Erforderliches Verhalten | Stand |
| --- | --- | --- |
| Login | Bestehenden Zugang nach Reload wiederaufnehmen; kein neues Konto | Ausgangssystem live bestanden |
| DeepSeek | Standard erhalten, echte vollständige Antwort und Folgefrage | Ausgangssystem neue Antwort bestanden, neue Fassung offen |
| Gemini | Nur bewusst wählbare Reserve, echte vollständige Antwort mit korrekter Anzeige | Direkter Provider bestanden, App offen |
| Wartephase | Aktive Anfrage klar zeigen; beim ersten Text Schreibzustand; bei Ende keine laufende Anzeige | In Arbeit |
| Technischer Ablauf | Nur tatsächlich erfolgte Schritte und echte Konfiguration; bereinigtes JSON, keine Schlüssel/Rohgedanken/erfundenen MCP-Aufrufe | In Arbeit |
| Fragen-Dialog | Klare Themen, dezente Farbe, bearbeitbarer Entwurf, kein automatisches Senden, vorhandenen Text erhalten | In Arbeit |
| Sprache | Deutsch, sichtbarer Start/Stop, Zwischentext erhalten, keine doppelten Endergebnisse, kein Versand, Bereinigung bei Verlassen | In Arbeit |
| Ansichtswechsel | Im selben Demo-Zugang zwischen Kundenansicht und Sachbearbeiter-Test wechseln; keine Rechte vortäuschen | In Arbeit |
| Sachbearbeitung | Fälle und Aufgaben nach Priorität/Termin betrachten, Fall öffnen, echte KI-Frage vorbereiten | In Arbeit |
| Kennzahlen | Gespeicherte Daten in Supabase zählen; Beispieldialoge und echte KI-Nutzung unterscheiden | In Arbeit |
| Mehr Testdaten | Nur fiktiv, additiv und idempotent; vorhandene Inhalte und das eine Authkonto erhalten | In Arbeit |
| Gestaltung | Tagwerk erhalten; subtile Strukturgrenzen, heller/dunkler Modus, 390/768/1280px ohne verdeckte Hauptaktionen | In Arbeit |
| Veröffentlichung | Geprüfter Commit auf main und echte Abnahme der Vercel-Hauptdomain | Offen |

## Gestaltung und Vergleich

Referenz ist die bestehende Tagwerk-App mit Bricolage Grotesque, Atkinson Hyperlegible Next, warmer neutraler Fläche, Lavendel als Hauptakzent und sparsamen Apricot-Markierungen. Vorher-Belege stammen von der tatsächlich veröffentlichten App; der Fragen-Dialog hat etwa 680px Breite, volle Zeilen mit deutlich getrennten Radios und einen eigenen Fußbereich. Der Umbau erhält das System und macht Themenhierarchie/Flächen präziser. OpenUI dient dem Prinzip eigener kontrollierter Komponenten, nicht als Behauptung installierter Funktionen.

Vorherbewertung: echter Chat 9/10 für den geprüften kurzen Datenablauf; Wartekommunikation 5/10 (leerer Cursor), Fragen-Dialog 6/10 (schwache thematische Orientierung und wenig Akzent). Nachherbewertung erfolgt erst nach tatsächlicher Sichtprüfung. Neue Sachbearbeitung hat keine vorhandene Vorheransicht.

## Browser und Nachweisgrenzen

Bis hier ausschließlich die bereits verbundene Browser-Erweiterung verwendet, keine sichtbare Ersatz-App oder eigene Browserinstanz gestartet. Eigene Prüftabs nach Abschluss geschlossen, Nutzertabs erhalten. Der Viewport-Override wirkte nicht (weiter1686×821); zurückgesetzt. Gesicherte Vergleichsausschnitte1280×720 sind keine mobile oder vollständige1280px-Abnahme. Schmale Layouts werden gesondert geprüft.

Keine Behauptung eines ununterbrochenen Hardware-Diktats allein aus automatisierten Ereignistests. Browserabhängige Mikrofonfreigabe und Spracherkennungsdienst müssen als tatsächliche Prüfung oder verbleibende Grenze ausgewiesen werden.

## Abgeschlossene lokale und Hosted-Prüfung vor Veröffentlichung

Unabhängig durch Root: 219 Frontendtests, 242 Backendtests, Typprüfung, Lint, Produktbuild, Bundleprüfung gegen fünf tatsächliche nichtöffentliche Env-Werte, 46 Kontrastpaare, 21 Proxyprüfungen und 14 Prozessprüfungen bestanden. Die tatsächliche Vercel-Node-Paketierung besteht 20 Prüfungen einschließlich Ausführung aller vier gebauten Einstiege. Native Backendabnahme durch den Bereichsinhaber: 16 Migrationen, 656 SQL-Assertions, 17 Operatorprüfungen, 31 HTTP/SQL-Smokes, 19 PostgreSQL-Abbruchprüfungen und 8+15 Parallelprüfungen. Zusätzlich echter nativer 13→16-Upgrade mit 15 Prüfungen: alte OpenCode-Nachrichten, Nutzung, Budget und Sitzung bleiben erhalten. Keine Authkonten oder Provideraufrufe aus diesen synthetischen Prüfungen.

Root-Oberflächenlauf: 91 Prüfungen bei390/768/1280×720 in beiden Themes, sechs fiktive Fälle, zwölf Aufgaben und langer Name. Fälle/Filter/Detaildialog, Escape, Fokus, Rückwechsel, Fragenwahl mit erhaltenem Entwurf, kein automatischer Versand, Modellsperre während Stream und abgeschlossene Antwort bestanden. Keine Browser-JavaScript-Fehler und keine laufende Endlosanimation nach Abschluss. Ein echter mobiler Satzumbruchfehler im Fragenkontext wurde durch den Frontendinhaber korrigiert; drei Größen anschließend mit normaler Bewegung erneut bestanden. Bilder dieses Stands wurden einzeln angesehen. Fragen-Dialog nach Korrektur9/10, Sachbearbeiter-Test9/10, Fall-Dialog9/10, Dashboardfläche9/10. Die Bewertung bezieht sich auf die abgebildeten getesteten Zustände, nicht jede denkbare Datenmenge.

Prüfbrowser: ausschließlich headless Chrome for Testing155.0.8059.40 passend zum Nutzer-Chrome. Höchstens1280×720, keine drosselungsaufhebenden Flags, jeweils nur eine Instanz. Browser-PIDs99012/6918 samt Kindern und Wächtern beendet, eigene Harness-Server geschlossen. Der erste Lauf brach an einem veralteten Testselektor ab und wurde ebenfalls bereinigt; das war kein Produktfehler.

Gemini-Adapter zusätzlich tatsächlich gegen Google geprüft: native Tokenzählung und Antwortstream vollständig, Modell `gemini-3.8-flash`,41Eingabe-/18Ausgabetokens; korrekte Ein-Satz-Antwort zu fiktiver Nora. Noch keine Behauptung einer vollständigen Vercel-App-Abnahme daraus.

Hosted-Schemaübernahme am07.10. bestanden: genau drei neue Migrationen,16 im Journal, vollständige Struktur identisch zum lokalen Gate, TLS/CA geprüft, Storage-Eigentümer/RLS erhalten. Ursprünglicher Seed nicht wiederholt. Separates additives Setup mit Gemini `select_default=false` und fiktiven Fällen bestand23Rootprüfungen: sechs Personen, zwölf Aufgaben, fünf Kontakte, drei Notizen, ein bestehendes Authkonto. Alle zuvor gespeicherten Personen/Kontakte/Aufgaben/Notizen/Dokumente/Profile/Workspace sowie sämtliche bisherigen Gespräche/Nachrichten/Requests/Ledger/Budgets/Agenteneinstellungen anhand von Zeilenhashes unverändert. Normaler bestehender Demo-Mitgliedszugang liefert echte Staffaggregate. DeepSeek über OpenCode bleibt Standard. Live-Appabnahme folgt nach Veröffentlichung.
