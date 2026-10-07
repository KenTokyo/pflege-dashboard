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
| Login | Bestehenden Zugang nach Reload wiederaufnehmen; kein neues Konto | Neue Fassung live bestanden: Sitzung und Antworten nach Reload erhalten |
| DeepSeek | Standard erhalten, echte vollständige Antwort und Folgefrage | Neue Fassung: echte Antwort und Folgefrage live bestanden |
| Gemini | Nur bewusst wählbare Reserve, echte vollständige Antwort mit korrekter Anzeige | Vercel-App und lokaler Server mit echter Gemini-Antwort bestanden |
| Wartephase | Aktive Anfrage klar zeigen; beim ersten Text Schreibzustand; bei Ende keine laufende Anzeige | Automatisierte Zustandswechsel bestanden, reale Streaming-Schritte live bestätigt |
| Technischer Ablauf | Nur tatsächlich erfolgte Schritte und echte Konfiguration; bereinigtes JSON, keine Schlüssel/Rohgedanken/erfundenen MCP-Aufrufe | Live:6 OpenCode-/7 Gemini-Schritte, Konfiguration und bereinigtes JSON bestätigt |
| Fragen-Dialog | Klare Themen, dezente Farbe, bearbeitbarer Entwurf, kein automatisches Senden, vorhandenen Text erhalten | Beide Themes und3Breiten bestanden; mobiler Satzumbruch korrigiert |
| Sprache | Deutsch, sichtbarer Start/Stop, Zwischentext erhalten, keine doppelten Endergebnisse, kein Versand, Bereinigung bei Verlassen | Automatisierte Aufnahme-/Stop-/Fehler-/Bereinigungsabläufe bestanden; menschliche Sprachprobe offen |
| Ansichtswechsel | Im selben Demo-Zugang zwischen Kundenansicht und Sachbearbeiter-Test wechseln; keine Rechte vortäuschen | Headless und echtes Vercel-Mitglied bestanden |
| Sachbearbeitung | Fälle und Aufgaben nach Priorität/Termin betrachten, Fall öffnen, echte KI-Frage vorbereiten | Live: Nora öffnen, KI-Gespräch zuordnen, Filter anwenden/zurücksetzen bestanden |
| Kennzahlen | Gespeicherte Daten in Supabase zählen; Beispieldialoge und echte KI-Nutzung unterscheiden | Normales Mitglied sieht echte Supabaseaggregate; acht erfolgreiche Aufrufe nach Abnahme |
| Mehr Testdaten | Nur fiktiv, additiv und idempotent; vorhandene Inhalte und das eine Authkonto erhalten | Additiv eingespielt; 23 Erhaltungs-/Funktionsprüfungen bestanden |
| Gestaltung | Tagwerk erhalten; subtile Strukturgrenzen, heller/dunkler Modus, 390/768/1280px ohne verdeckte Hauptaktionen | 390 / 768 / 1280 × 720 hell/dunkel,91 UI-Prüfungen und gezielte Nachprüfung bestanden |
| Veröffentlichung | Geprüfter Commit auf main und echte Abnahme der Vercel-Hauptdomain | dcd202a auf Production Ready, öffentliche Dateien identisch zum geprüften Build; Liveablauf bestanden |

## Gestaltung und Vergleich

Referenz ist die bestehende Tagwerk-App mit Bricolage Grotesque, Atkinson Hyperlegible Next, warmer neutraler Fläche, Lavendel als Hauptakzent und sparsamen Apricot-Markierungen. Vorher-Belege stammen von der tatsächlich veröffentlichten App; der Fragen-Dialog hat etwa 680px Breite, volle Zeilen mit deutlich getrennten Radios und einen eigenen Fußbereich. Der Umbau erhält das System und macht Themenhierarchie/Flächen präziser. OpenUI dient dem Prinzip eigener kontrollierter Komponenten, nicht als Behauptung installierter Funktionen.

Vorherbewertung: echter Chat 9/10 für den geprüften kurzen Datenablauf; Wartekommunikation 5/10 (leerer Cursor), Fragen-Dialog 6/10 (schwache thematische Orientierung und wenig Akzent). Nachherbewertung erfolgt erst nach tatsächlicher Sichtprüfung. Neue Sachbearbeitung hat keine vorhandene Vorheransicht.

## Browser und Nachweisgrenzen

Bis hier ausschließlich die bereits verbundene Browser-Erweiterung verwendet, keine sichtbare Ersatz-App oder eigene Browserinstanz gestartet. Eigene Prüftabs nach Abschluss geschlossen, Nutzertabs erhalten. Der Viewport-Override wirkte nicht (weiter 1686 × 821); zurückgesetzt. Gesicherte Vergleichsausschnitte 1280 × 720 sind keine mobile oder vollständige 1280px-Abnahme. Schmale Layouts werden gesondert geprüft.

Keine Behauptung eines ununterbrochenen Hardware-Diktats allein aus automatisierten Ereignistests. Browserabhängige Mikrofonfreigabe und Spracherkennungsdienst müssen als tatsächliche Prüfung oder verbleibende Grenze ausgewiesen werden.

## Abgeschlossene lokale und Hosted-Prüfung vor Veröffentlichung

Unabhängig durch Root: 219 Frontendtests, 242 Backendtests, Typprüfung, Lint, Produktbuild, Bundleprüfung gegen fünf tatsächliche nichtöffentliche Env-Werte, 46 Kontrastpaare, 21 Proxyprüfungen und 14 Prozessprüfungen bestanden. Die tatsächliche Vercel-Node-Paketierung besteht 20 Prüfungen einschließlich Ausführung aller vier gebauten Einstiege. Native Backendabnahme durch den Bereichsinhaber: 16 Migrationen, 656 SQL-Assertions, 17 Operatorprüfungen, 31 HTTP/SQL-Smokes, 19 PostgreSQL-Abbruchprüfungen und 8+15 Parallelprüfungen. Zusätzlich echter nativer 13→16-Upgrade mit 15 Prüfungen: alte OpenCode-Nachrichten, Nutzung, Budget und Sitzung bleiben erhalten. Keine Authkonten oder Provideraufrufe aus diesen synthetischen Prüfungen.

Root-Oberflächenlauf: 91 Prüfungen bei 390 / 768 / 1280 × 720 in beiden Themes, sechs fiktive Fälle, zwölf Aufgaben und langer Name. Fälle/Filter/Detaildialog, Escape, Fokus, Rückwechsel, Fragenwahl mit erhaltenem Entwurf, kein automatischer Versand, Modellsperre während Stream und abgeschlossene Antwort bestanden. Keine Browser-JavaScript-Fehler und keine laufende Endlosanimation nach Abschluss. Ein echter mobiler Satzumbruchfehler im Fragenkontext wurde durch den Frontendinhaber korrigiert; drei Größen anschließend mit normaler Bewegung erneut bestanden. Bilder dieses Stands wurden einzeln angesehen. Fragen-Dialog nach Korrektur 9/10, Sachbearbeiter-Test 9/10, Fall-Dialog 9/10, Dashboardfläche 9/10. Die Bewertung bezieht sich auf die abgebildeten getesteten Zustände, nicht jede denkbare Datenmenge.

Prüfbrowser: ausschließlich headless Chrome for Testing 155.0.8059.40 passend zum Nutzer-Chrome. Höchstens 1280 × 720, keine drosselungsaufhebenden Flags, jeweils nur eine Instanz. Browser-PIDs 99012 / 6918 samt Kindern und Wächtern beendet, eigene Harness-Server geschlossen. Der erste Lauf brach an einem veralteten Testselektor ab und wurde ebenfalls bereinigt; das war kein Produktfehler.

Gemini-Adapter zusätzlich tatsächlich gegen Google geprüft: native Tokenzählung und Antwortstream vollständig, Modell `gemini-3.8-flash`, 41 Eingabe-/18 Ausgabetokens; korrekte Ein-Satz-Antwort zu fiktiver Nora. Noch keine Behauptung einer vollständigen Vercel-App-Abnahme daraus.

Hosted-Schemaübernahme am 07.10. bestanden: genau drei neue Migrationen, 16 im Journal, vollständige Struktur identisch zum lokalen Gate, TLS/CA geprüft, Storage-Eigentümer/RLS erhalten. Ursprünglicher Seed nicht wiederholt. Separates additives Setup mit Gemini `select_default=false` und fiktiven Fällen bestand 23 Rootprüfungen: sechs Personen, zwölf Aufgaben, fünf Kontakte, drei Notizen, ein bestehendes Authkonto. Alle zuvor gespeicherten Personen/Kontakte/Aufgaben/Notizen/Dokumente/Profile/Workspace sowie sämtliche bisherigen Gespräche/Nachrichten/Requests/Ledger/Budgets/Agenteneinstellungen anhand von Zeilenhashes unverändert. Normaler bestehender Demo-Mitgliedszugang liefert echte Staffaggregate. DeepSeek über OpenCode bleibt Standard. Die separate Live-Appabnahme ist unten belegt.

## Tatsächlicher Online-Endablauf

Vercel-Deployment `qwwzetgyXiQTACbr8scy6kSub7av`, Produktcommit `dcd202a5c41a46cf881dba840ae3e62331ffceee`, Production **Ready**. Öffentliche Hauptdomain und `/api/health` HTTP200; referenzierte JS-/CSS-Dateien stimmen exakt mit dem lokal geprüften Produktbuild überein. Gemini-Secret wurde beim neuen Deployment übernommen.

Im bereits angemeldeten bestehenden Demo-Zugang: Sachbearbeiter-Test geöffnet, Nora Hafen angesehen, aus dem Fall heraus Gespräch „Vorführung · Nora und die Erstberatung“ angelegt. Person war richtig vorausgewählt; kein neuer Nutzerzugang. Gespräch `6863e18b-e6b1-4567-b6db-19aad13011e5`.

| Tatsächlicher Ablauf | Request-ID | Modell | Eingabe/Ausgabe | Zeichen |
| --- | --- | --- | --- | --- |
| Vercel: Überblick über neue Falldaten |877fda38-faa2-43ea-9750-c9a7220d896d|deepseek-v4.1-flash|578/432|1468|
| Vercel: Folgefrage mit vorherigem Verlauf |0564bca0-8d01-4519-942d-bc9190142a60|deepseek-v4.1-flash|1053/72|211|
| Vercel: bewusst gewählte Gemini-Übergabe |308c8663-1d59-45ba-aae4-9812d6c7fde3|gemini-3.8-flash|1071/111|377|
| Lokaler Node-Server: Gemini-Folgefrage |846123ee-dd5f-4b2c-bd4b-bff6e0695221|gemini-3.8-flash|1208/17|76|

Alle vier Requests und Antworten serverseitig `completed`, jeweils genau eine Usage-Ledgerzeile. DeepSeek und Gemini nennen korrekt die beiden neuen Aufgaben, fehlende Einstufung und fehlenden Termin. Die Folgefrage rechnet den gespeicherten 09.10.2026 08:00 UTC korrekt auf 10:00 Berliner Ortszeit um. Kein automatischer Fallback. Der tatsächliche jeweilige Modellname bleibt an historischen Antworten stehen.

Technischer Ablauf nach realen Antworten aufgeklappt: OpenCode 6 Schritte, erste Textankunft 2,64 s, Speicherung 5,24 s, tatsächliche Thinking-Konfiguration deaktiviert. Gemini 7 Schritte einschließlich Tokenzählung, Textankunft 2,47 s, Speicherung 2,91 s, Thinking niedrig. Bereinigtes JSON enthält nur erlaubte Metadaten, weder Prompt-/Nachrichtentext noch Header oder Geheimnisse. Die App führt normale SQL-/HTTP-Aufrufe aus; kein MCP-Aufruf wird vorgetäuscht. Ablaufdaten bleiben im aktuellen Seitenaufruf bis zur nächsten Anfrage sichtbar und werden nach Reload nicht als historische Daten erfunden.

Nach bewusster Rückwahl **Standard · DeepSeek**: Reload erhält drei Vercel-Antworten und gültige Anmeldung, 0 Alerts und kein Loginformular. Auch nach dem zusätzlichen lokalen Test zurück auf DeepSeek-Standard gestellt. Lokaler bestehender Pflege-App-Supervisor wurde kontrolliert neu gestartet, damit der neue serverseitige Gemini-Key und der Adapter geladen werden. Der normale Benutzer-Appdienst auf 5173/5174 bleibt erhalten; er ist kein zurückgelassener Prüfserver. Lokal ist weiterhin kein OpenCode-Key hinterlegt, dort wurde ausdrücklich Gemini geprüft. Die öffentliche Anwendung nutzt ihren eigenen vorhandenen OpenCode-Key und benötigt keinen eingeschalteten Mac.

Live-Sachbearbeitung nach allen vier Aufrufen: sechs Fälle, zwölf offene Aufgaben, zwölf gespeicherte Gespräche, acht erfolgreiche KI-Aufrufe insgesamt. Fünf ältere fehlgeschlagene Requests werden ehrlich als historische Fehler gezählt und nicht gelöscht. Filter „Daten zu Nora Hafen nach Frist“ ergibt ausschließlich Nora, Rücksetzen stellt alle Fälle wieder her. Helles und dunkles Theme funktionieren. UI-Bezeichnung des internen Werts 0 wurde abschließend auf „Kein Pflegegrad“ vereinheitlicht; 26 gezielte Chatprüfungen, Typprüfung/Lint und neuer Produktbuild/Schlüsselscan dazu bestanden.

Die echte Mikrofon-Sprachprobe wurde dem Nutzer angeboten. Bis zu seiner Rückmeldung ist Hardware-/Spracherkennungsdienst-Erfolg offen. Automatische Tests belegen Start/Stop, späte Endergebnisse ohne Duplikat, Erhalt des Entwurfs, Wiederaufnahme nach normalen Pausen und Bereinigung. Keine Garantie, dass der externe Browserdienst nie unterbricht.

Hosted-Sicherheitsberatung nach Änderung unverändert zum Ausgangsstand: drei INFO-Hinweise für absichtlich browserseitig gesperrte interne Tabellen ([RLS-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)) und bestehender Auth-WARN für nicht aktivierte [Prüfung kompromittierter Passwörter](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Kein neuer Befund und keine Kontoeinstellung geändert.

Alle eigenen Prüftabs werden nach Abschluss geschlossen; menschliche Tabs bleiben erhalten. Belege: `live-deepseek-ablauf.jpg`, `live-gemini-ablauf.jpg` und die geprüften hellen/dunklen/schmalen Layoutbilder im zugehörigen Ordner.
