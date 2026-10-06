# Vercel-Liveprüfung — 06.10.2026

## Ziel und aktueller Befund

Vorführung am 07.10.2026: Nutzer meldet sich an, öffnet die fiktive Pflegeperson und erhält echte DeepSeek-Antworten mit deren erlaubtem Datenkontext. Liveadresse: https://pflege-dashboard-puce.vercel.app.

Vorher: **nicht vorführbereit**. Keine Gesamt-Erfolgsnote; Anmeldung und Chat waren nicht ausführbar.

## Unabhängig bestätigte Ausgangslage

- Bestehender Chrome über ChatGPT-Browser-Plugin verbunden; keine eigene Browserinstanz gestartet. Nutzer-Tabs erhalten.
- Vercel zeigt Production Ready auf Commit `24de23616e100abcf3a20294213a610b5a2f1ff7`. Das bestätigt nur die statische Veröffentlichung.
- Echte HTTP-POSTs ohne Zugangsdaten gegen `/api/session` und `/api/chat-stream`: jeweils HTTP 404, Textantwort.
- Veröffentlichtes Einstiegspaket enthält die korrekte eigene Supabase-URL und den korrekten Publishable-Key (nur boolescher Vergleich, keine Werte ausgegeben). Weder vorhandenes Datenbankpasswort noch DATABASE_URL im Einstiegspaket gefunden. Das ist keine pauschale Prüfung aller jemals veröffentlichten Dateien.
- Hosted-DB: 0 `auth.users`, 0 Profile mit Nutzerzuordnung, 0 Workspace-Mitgliedschaften, 0 aktivierte Modelle. Zwei deaktivierte Modellplatzhalter; Budget 0.
- Supabase Auth Settings: HTTP 200, E-Mail-Login aktiv, Selbstregistrierung gesperrt, automatische E-Mail-Bestätigung deaktiviert.
- Vercel enthält bereits PROJECT_REF, SUPABASE_URL, VITE_SUPABASE_URL, DATABASE_URL, SUPABASE_DB_PASSWORD und VITE_SUPABASE_PUBLISHABLE_KEY für Production/Preview. Nur Namen und Geltungsbereiche gelesen; keine Werte geöffnet.
- Lokale Konfiguration enthält keinen Providerkey. Nur Namen und Vorhandenheit geprüft.
- Aktueller Code: lokaler Node-Prozess, geschützte Datei/CA vorausgesetzt; keine Vercel-API-Funktionen; OpenAI als einziger implementierter Provider.

## Beauftragte Korrektur

Ursprünglicher Backend-Bereichsinhaber passt den vorhandenen Node-Handler für Vercel an und ergänzt DeepSeek, Regressionstests und einen sicheren Einrichtungsweg. Keine Supabase Edge Functions. Orchestrator übernimmt unabhängige Prüfung und konkrete Hostinganbindung. Keine selbst angelegten Auth-Konten, keine Geheimnisse in Git, keine Providerkosten vor Freigabe.

Offizielle Modellzuordnung: DeepSeek-V4.1-Flash wird als `deepseek-flash` auf https://api.deepseek.com aufgerufen. Preisquelle: https://api-docs.deepseek.com/quick_start/pricing/ (am 06.10.2026 gelesen). Höchstsätze laut Seite: Input ohne Cache 0,30 USD/Million Tokens, Output 1,20 USD/Million. Diese Dokuprüfung ist kein tatsächlicher Provideraufruf.

## Noch offene echte Nachweise

- Nutzerseitig angelegter Login und anschließend zugeordnete Mitgliedschaft.
- Geschützter DeepSeek-Key, konkret freigegebenes Budget.
- Geprüfte Backendänderung und Hosted-Migration.
- Neue Veröffentlichung auf Vercel und echte Sitzung/Antwort im Browser.
- Datenkontext durch Antwort auf eine fiktive konkrete Frage belegen; keine Rechts-/Medizinberatung oder erfundenen Modellantworten.

Bis dahin keine Behauptung eines erfolgreichen Login-/KI-Gates.

## Fortschritt: bestehender Nutzerzugang

Der Nutzer hat test@test.de selbst angelegt. Danach genau ein bestätigtes Auth-Konto geprüft. Eine enge idempotente Transaktion hat dieses bestehende Konto als normales Mitglied dem vorhandenen fiktiven Demo-Workspace zugeordnet und den Vorgang im Auditlog festgehalten. Abschlussquery: genau 1 aktive Demo-Mitgliedschaft. Kein Auth-Konto und kein Passwort durch Agenten erzeugt oder eingegeben.

Kostenfreigabe liegt jetzt ausdrücklich für **5 USD insgesamt** vor. Sie ist noch kein technischer Nachweis einer wirksamen Grenze oder eines erfolgreichen Modellaufrufs.

Die vom Nutzer autorisierte gezielte Suche nach einem direkten DeepSeek-Key in den beiden NoteTree-Env-Dateien blieb ohne Treffer. DeepSeek-Modellvorgaben existieren dort über einen anderen Provider. Kein fremder Schlüssel übernommen, keine Geheimnisse ausgegeben. Nutzer hinterlegt den direkten Schlüssel selbst geschützt.

Zusätzliche Rollenprüfung mit Claims des vorhandenen Nutzers und `SET LOCAL ROLE authenticated`: sichtbar sind 1 Workspace, 1 fiktive Pflegeperson und 2 offene Aufgaben. Die Transaktion wurde zurückgerollt. Diese SQL-Rollenprüfung bestätigt die Datenfreigabe, ersetzt aber ausdrücklich keinen Browserlogin mit einer echten Sitzung.

## Vorrangige Budgetänderung

Nutzer korrigiert ausdrücklich: „ersmtal keine limits bei deepseek“. Die 5-USD-Grenze ist zurückgenommen, der Backendauftrag entsprechend aktualisiert. Ziel ist eine explizite unbegrenzte App-Budgeteinstellung bei erhaltener Nutzungsaufzeichnung und Zugriffsprüfung. Noch keine Provideraufrufe erfolgt.

## Unabhängige Code-/Lokalabnahme

- Root `npm run check` vollständig bestanden: Typprüfung, Lint, 131 Tests, Build, Geheimnisprüfung aller 29 erzeugten Bundle-Dateien, Quellprüfung/46 Kontrastpaare, 21 Proxy- und 14 Prozessprüfungen. Kleiner Anzeigefehler korrigiert: DeepSeek wird in Einstellungen nicht mehr als Mistral AI beschriftet.
- Backend Typecheck, 121 Tests und Build unabhängig bestanden.
- Vollständiger nativer Supabase-Endlauf am 06.10.2026 14:17 UTC unabhängig bestanden: 10 Migrationen, 525 SQL, 8 Setup-Idempotenzprüfungen, 22 Parallelprüfungen, 31 Node-HTTP/SQL, 18 Rollen-/Abbruchprüfungen und 121 Backendtests. 17 historische Kontextprüfungen reproduzieren genau die erwarteten früheren Fehler. Typen neu erzeugt.
- Cleanup unabhängig bestätigt: 0 eigene Prozesse, alle drei eigenen Supabase-Prüfports geschlossen. Kein eigener Prüfbrowser.
- Vercel-Schema unterstützt die verwendeten Optionen supportsCancellation/maxDuration/excludeFiles laut aktuell abgerufenem offiziellem JSON-Schema.

## Upgradeprüfung vor Hosted-Änderung

Der erste `hosted:apply`-Versuch stoppte vor jeder Migration (`applied: []`, Seed nicht wiederholt). Verschlüsselte Verbindung, korrekte Projektkennung, RLS/Owner korrekt. Ursache: historischer Phase0-Schemavergleich berücksichtigt die neue Budget-CHECK-Constraint noch fälschlich. Der Backend-Bereichsinhaber korrigiert ausschließlich diesen Vergleich und prüft den Upgradeweg von acht auf zehn Migrationen. Die vollständige Endstrukturprüfung bleibt bestehen.

## Technische Übernahme abgeschlossen

Der historische Vergleich wurde exakt für die neue CHECK-Constraint korrigiert; der volle Endvergleich bleibt unverändert. Unabhängiger Lauf `check:phase1 -- --upgrade` erfolgreich: 12 echte Acht-zu-zehn-Upgradeprüfungen plus gesamter 525-SQL-/121-Backendtestlauf und Cleanup.

`hosted:apply` hat danach ausschließlich `20261006160000_deepseek_provider.sql` und `20261006161000_deepseek_demo_cap.sql` angewendet. Kein Seed-Replay. Vollständige Hosted-Struktur entspricht dem lokal geprüften Endschema; Nutzerkonto erhalten.

Das geprüfte DeepSeek-Setup ist Hosted ausgeführt. Nachkontrolle: `deepseek-flash` / DeepSeek V4.1 Flash aktiv und Workspace-Standard, Monats- und Gesamtausgabenlimit NULL (explizit unbegrenzt), blocked=false, ein bestätigter Demo-Zugang und eine aktive Mitgliedschaft. Preisstand dauerhaft als Schätzung; kein festes Abschaltdatum.

Danach unabhängig 33 echte Hosted-Node-HTTP/SQL-Prüfungen bestanden. `hosted:inspect`: keinerlei Strukturabweichung, zehn Migrationen, alle 25 Tabellen mit RLS, Storage-Owner unverändert, anonymer Workspacezugriff HTTP 401. Zusätzlich elf unabhängige Cloud-/Hosted-Prüfungen bestanden, eigener Port/Pool geschlossen.

Supabase-Sicherheitsadvisor: drei erwartete INFO-Hinweise zu serverinternen Tabellen ohne Browser-Policies (conversation_requests/model_prices/session_activity, bewusst standardmäßig gesperrt); bestehender WARN-Hinweis zum deaktivierten Schutz gegen bekannt gewordene Passwörter. Keine RLS-Aufweichung. [Hinweis zur Passwortprüfung](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Im Browser ist inzwischen eine gespeicherte DEEPSEEK_API_KEY-Zeile im eigenen Vercel-Projekt sichtbar; Eingabedialog geschlossen. Nur Speicherstatus gelesen, Schlüsselwert weder geöffnet noch ausgegeben. Schlüsseleingabe erledigt; Gültigkeit/Guthaben vor echtem Modellaufruf noch nicht bewiesen.

Noch offen: Abnahme der neuen Vercel-Veröffentlichung, nutzerseitiger Login und echter DeepSeek-Chat auf Vercel. Kein eigener Prüfbrowser gestartet; Nutzer-Tabs erhalten. Backend-Bereichsinhaber abgeschlossen/idle, alle eigenen Prüfprozesse beendet.

## Git-Freigabe und Veröffentlichung

Nutzer hat den Upload ausdrücklich bestätigt und anschließend die generelle Push-Sperre aufgehoben. Commit `c94ed1c` erfolgreich nach `origin/main` hochgeladen. Aktive Projektvorgaben und Aufgaben entsprechend bereinigt; Vercel-Abnahme läuft.

## Erster Livefehler und Paketkorrektur

Deployment `v2RynY6GaEdJNyavtzc8sbHrq5mA` aus `c94ed1c` war Vercel Ready, aber alle API-Einstiege lieferten HTTP500. Vercel-Log konkret: ERR_MODULE_NOT_FOUND für backend/runtime/cloud.ts aus api/session.js (ebenso übrige Einstiege). Ready/Build wurde deshalb ausdrücklich nicht als Funktionsnachweis gewertet.

Korrektur `2601b4a`: relative Serverimporte referenzieren ausgelieferte .js-Dateien, API-Compiler konfiguriert. Unabhängig Backend-Typecheck/Build/121Tests und tatsächlicher @vercel/node-Artefaktbau bestanden: 20 Paket-/Antwortprüfungen, alle vier gebauten Einstiege ohne tsx tatsächlich geladen, erwartete HTTP200/401/401/404, keine Env-Dateien verpackt. Prüfspeicher geschlossen/entfernt. Fix getrennt von laufender Frontend-/Remember-Nacharbeit committed und nach main gepusht.

Nach Veröffentlichung von `2601b4a` unabhängig gegen die echte Hauptdomain geprüft: `/api/health` 200 JSON; Session/Chat ohne Bearer401JSON; unbekannteAPI404JSON; fremdeOrigin403JSON; `/anmelden`200HTML. Ein absichtlich ungültiger Bearer erreicht nach Cloud-/DB-Initialisierung die erwartete401AUTH_REQUIRED. Der Paketfehler ist damit tatsächlich live behoben; dies ersetzt weiterhin keinen positiven Nutzer-/KI-Test.

Die gespeicherte Anmeldung und Beispielanfragen sind zusätzliche ausdrückliche Nutzeraufträge. Supabase-Sitzungsdokumentation am06.10.2026 geprüft: https://supabase.com/docs/guides/auth/sessions ; Changelog-Index abgerufen, keine relevante neue Session-API-Brechstufe für diesen Anschluss. Normale und gespeicherte App-Sitzung bleiben voneinander unterschieden; Providerbudget bleibt unbegrenzt gemäß Nutzerwahl.

## Zusätzliche Alltagshilfen und gespeicherte Anmeldung

Frontend liefert fünf Themen mit insgesamt 15 bearbeitbaren Beispielanfragen, ohne automatischen Versand und mit Erhalt vorhandener Entwürfe. Die sichtbare Auswahl zum Speichern der Anmeldung ist auf ausdrücklichen Nutzerwunsch aktiviert. Passwort wird nicht gespeichert. Der neue v1.4-Vertrag unterscheidet normale Sitzung (15 Minuten Inaktivität/8 Stunden) und bewusst gespeicherte Sitzung (höchstens 30 Tage). Ungültige Supabase-Sitzungen und Abmelden bleiben wirksam. Der tatsächliche Serverzeitpunkt und das Datum in Europe/Berlin werden im Gesprächskontext gesichert.

Unabhängig gesamter Root-Check bestanden: 146 Tests, Typen/Lint/Build, 29 Bundle-Dateien ohne Geheimnisse, 53 Quelldateien/46 Kontrastpaare, 21 Proxy- und 14 Prozessprüfungen. Backend-Typen/Build/134 Tests und 20 tatsächliche Vercel-Paketprüfungen ebenfalls unabhängig bestanden.

Ein unabhängiger nativer Zwischenlauf fand eine instabile Testannahme: zeitbedingt variierende Reservierung 6236 statt 6237 Mikro-USD, kein Produkt-Budgetdurchbruch. Der Test vergleicht jetzt den wirklichen ersten Snapshotbetrag; der echte Budget-Zeilensperrennachweis bleibt erhalten. Nach Korrektur neuer unabhängiger Endlauf vollständig grün: 579 SQL-Prüfungen, 134 Backendtests, 31 HTTP-/19 PG-Prüfungen, 8+15 Parallelprüfungen, 8 Setupprüfungen, echte Typgenerierung und Schema-Baseline. Anschließend 12 echte Zehn-zu-elf-Upgradeprüfungen mit Bestandserhalt und negativer Rechtekontrolle bestanden. Alle eigenen Prozesse beendet, Prüfports geschlossen.

Hosted hat ausschließlich die additive Migration `20261006162000_remember_session_clock.sql` übernommen; vorhandenes Konto und Daten erhalten, Seed nicht erneut angewendet. Vollschema entspricht der unabhängigen lokalen Baseline. Danach 33 Hosted-Node- und 11 Cloud-/Hosted-Prüfungen bestanden, alle eigenen Verbindungen/Ports geschlossen. Sicherheitsadvisor unverändert: drei bewusst browsergesperrte interne Tabellen und der bereits dokumentierte Passwortschutzhinweis.

## Tatsächlicher angemeldeter Liveablauf und Providerblock

Der Nutzer hat sich selbst angemeldet. Root hat im bestehenden Chrome-Plugin-Tab den Demo-Zugang, Marthas fiktive Angaben und Aufgaben gesehen. SQL bestätigt eine aktive bewusst gespeicherte Sitzung mit 30 Tagen. Nach tatsächlichem Neuladen bleiben Konto, Gespräch, Nutzernachricht und gewähltes helles Design erhalten. Kein Passwort gelesen oder gespeichert. Ein kompletter Browser-Neustart und echtes Abmelden wurden in diesem angemeldeten Liveablauf nicht ausgeführt.

Alle fünf Vorlagenthemen wurden geöffnet, jeweils drei Optionen gezählt. Die Telefonat-Vorlage wurde an den vorhandenen Testentwurf angehängt: Präfix und Leerzeile erhalten, Composer fokussiert, keine automatische Anfrage. Escape schließt den Dialog. Visuelle Prüfung fand eine links oben statt mittig angezeigte Dialogfläche; Ursache Tailwind-Margin-Reset, Korrektur `60eb994` mit explizitem `margin:auto` hochgeladen. Der Viewport-Override des vorhandenen Plugin-Tabs änderte das tatsächlich beobachtete Maß 1920×821 nicht; Override zurückgesetzt, deshalb kein behaupteter mobiler Live-Nachweis.

Erste echte KI-Anfrage 19:11 schlug ohne Inhalt/Usage fehl. Die ursprüngliche generische Fehlermeldung war nicht hinreichend diagnostizierbar. `f489365` ergänzt ausschließlich fest klassifizierte Fehlerdaten, keine Antworttexte, Schlüssel, Prompts oder Stacks. Unabhängig Typecheck/Build/146 Backendtests und 20 tatsächliche Vercel-Paketprüfungen bestanden. Vercel-Deployment C9wv97eyz2Hu1idAY7WVcbrRi3LU war Ready.

Die anschließende echte Anfrage 19:18:13 (ccfa9992-cef4-4ba8-9f47-89771a53ba9f) liefert den eindeutigen Serverbefund HTTP_REJECTED, httpStatus401, contentTypejson von DeepSeek. Das ist ein Provider-Authentifizierungsblock; kein erfolgreiches Modellgespräch und kein Guthabenbefund. Keine weitere gleichartige Anfrage ohne korrigierte Zugangskonfiguration. Der Nutzer muss den gültigen DeepSeek-Schlüssel geschützt in Vercel ersetzen. Weiterhin offen: erfolgreiche echte Antwort, korrekter Datenbezug, Folgefrage und gespeicherte erfolgreiche Antwort.

Dialogfix `60eb994` ist in Vercel-Deployment 47XfCzDhxEU7GS8jeKwoLk7L1mfo Ready und nach Neuladen tatsächlich geprüft: helles und dunkles Theme, zentrierter Dialog bei x620/y45, etwa 680×732 in 1920×821, alle Bereiche lesbar. Bewertung Position zuvor6/10, nachher9/10. Keine eigenen Browserprozesse gestartet; bestehende Nutzertabs erhalten, temporäre Viewporteinstellung zurückgesetzt. Backend-Quellprüfung bestätigt unveränderte Durchgabe von DEEPSEEK_API_KEY an den Authorization-Header; kein nachgewiesener Codefehler bei der Schlüsselübermittlung. Der tatsächliche Schlüsselwert blieb ungelesen.

## Providerkorrektur nach Nutzerbeleg

Der Nutzer bestätigt den Schlüssel als OpenCode-Schlüssel und liefert seine OpenCode-Servicekontoansicht. Der bisherige direkte DeepSeek-Anschluss war falsch. HTTP401 belegt die Ablehnung beim falschen Ziel, nicht die generelle Ungültigkeit des Schlüssels. Die Aufforderung zum Ersetzen des Schlüssels ist überholt.

Unabhängig geprüft: OpenCode-Zen-Dokumentation nennt `deepseek-v4.1-flash` über `https://opencode.ai/zen/v1/chat/completions`; der öffentliche Modellkatalog enthält diese Kennung. Im vorhandenen OpenCode-Konto ist DeepSeek V4.1 Flash bereits aktiviert; der benannte Schlüssel ist aktiv. Keine Konto-, Schlüssel- oder Modelleinstellung geändert, kein voller Schlüssel gelesen. Offizielle Quellen: https://opencode.ai/docs/zen/ und https://opencode.ai/zen/v1/models . Backend und Modellregister werden darauf angepasst; positiver Live-Nachweis folgt erst nach Bereitstellung.

### Kurzer Ablauf für die Vorführung (erst nach erfolgreichem Livegate)

1. Übersicht öffnen: fiktive Martha und ihre offenen Aufgaben zeigen.
2. Frage: „Welche Angaben hast du zu Martha gespeichert? Was sollte ich zuerst erledigen? Bitte nenne die hinterlegten Termine.“
3. Folgefrage: „Sortiere das bitte in drei einfache nächste Schritte. Was fehlt noch, damit ich weitermachen kann?“
4. „Was kann ich fragen?“ öffnen, Thema „Ein Gespräch vorbereiten“ wählen und die Telefonat-Vorlage in den Entwurf übernehmen. Vor dem Senden kurz anpassen.
5. Gespräch neu laden: Anmeldung und Antworten bleiben erhalten.

Der Chat liefert Auskunft und Textentwürfe. Aufgabenänderungen, Versand und PDF-/DOCX-Export sind damit noch nicht umgesetzt und werden in der Vorführung nicht behauptet.

Weitere Kontoprüfung vor Umsetzung: OpenCode-Overview zeigt aktives Go-Abo, 0% rollierende/0% wöchentliche und12% monatliche Nutzung, separates Guthaben0USD, Zusatznutzung und automatische Aufladung aus. Deshalb wird ausschließlich der dokumentierte Go-Anschluss `https://opencode.ai/zen/go/v1/chat/completions` genutzt; der oben genannte Zen-Katalog diente zunächst der Modellidentifizierung. https://opencode.ai/docs/go/ bestätigt V4.1 und externen API-Zugriff. Keine Kontoeinstellungen verändert. Angezeigte interne Kosten bleiben konservative Verbrauchsschätzungen, kein Nachweis zusätzlicher Geldabbuchungen.

## OpenCode-Go-Anschluss: unabhängige technische Abnahme

Root hat den vollständigen aktuellen Frontendcheck (Typen, Lint, Tests, Build, Bundle, Quelle, Proxy und Prozessbereinigung) bestanden. Nach den endgültigen Backendtypen erneut Typen, Build, 29 Bundle-Dateien ohne vier private Projektwerte sowie 172 Backendtests geprüft. Tatsächliches Vercel-Paket: 20 Prüfungen, alle vier gebauten Einstiege in plain Node ausgeführt.

Unabhängiger Fresh-13-Supabase-Gesamtlauf: 611 SQL-Prüfungen, 172 Backendtests, 31 HTTP-/19 PG-Prüfungen, 13 neue und 8 vorhandene Operator-Setupprüfungen, 8+15 Parallelprüfungen, tatsächliche CLI-Typgenerierung und Schema-Baseline. Historische Fehlerreproduktion: 17 Prüfungen mit genau 2 erwarteten alten Fehlern, separat zurückgerollt. Eigener Stack beendet, 0 eigene Prozesse, Ports 56421/56422/56428 geschlossen. Backendinhaber zusätzlich: 12 echte 11→13-Upgradeprüfungen bestanden; als Bereichsinhabernachweis gekennzeichnet.

Hosted ausschließlich zwei additive Migrationen 20261006183011/20261006183021 angewendet. Die volle Struktur entspricht der unabhängigen lokalen Baseline. Danach geprüftes Operator-Setup ausgeführt: einzig aktives Modell `opencode/deepseek-v4.1-flash`, Name „DeepSeek V4.1 Flash · OpenCode Go“, Monats-/Gesamtausgabenlimit NULL, blocked=false. Bestand unverändert: 1 Authkonto, 2 Gespräche, 5 Nachrichten, 2 Aufgaben, 1 Dokument. Anschließend 33 Hosted-Node- und 11 Cloud-Hosted-Prüfungen bestanden, eigene Verbindungen und Port geschlossen. Sicherheitsadvisor unverändert: drei absichtlich browsergesperrte interne Tabellen und bestehender Passwortschutzhinweis. Reale Vercel-Antwort erst nach Deployment prüfen.

## Tatsächlicher OpenCode-Aufruf und Abschlusskorrektur

`2295d70` wurde auf Vercel als `9VgdW9FQHugV6sDtysHgnwb5eRVD` Ready veröffentlicht; Livebundle `CNhp63cW` stimmt mit geprüftem lokalen Paket überein. Anmeldung nach Neuladen weiter aktiv; neuer Martha-Chat `8b8bf5f8-5109-4b51-accf-38a1d7e79d7b` angelegt. Erste echte OpenCode-Antwort `28d3bbff-84d0-472e-9ef4-fb45c87f740e` liefert HTTP 200/SSE, das gewünschte Modell und korrekte gespeicherte Daten, scheitert aber am Abschluss. Keine vollständige Antwort behauptet.

Die Diagnose TOKEN_BOUND war irreführend: Datenbank belegt 725 Eingabe-/275 Ausgabetokens bei Grenzen 1048576/1024, Modell `deepseek-v4.1-flash`, 843 gespeicherte Zeichen, 548 Mikro-USD als interne Schätzung und ungesperrten Workspace. Der Parser hatte gültigen Text im Stop-Chunk pauschal verworfen. Der enge Fix `3d534ee` übernimmt den Schlusstext nach Usage-/Sicherheitsprüfung genau einmal und unterscheidet Fehlerdiagnosen. Vorher sieben gezielte Reproduktionen rot, nachher 180 Tests grün; Root unabhängig 180 Tests, Typen/Build und 20 echte Vercel-Paketprüfungen bestanden. Keine Schema-/Budgetänderung, deshalb kein weiterer unveränderter Datenbanklauf. Die reale vollständige Antwort wird mit dieser Veröffentlichung erneut geprüft.

## Zweiter realer Go-Abschlussbefund

Vercel bestätigt `3d534ee` als Ready, Deployment `Ahhrkuib4GsGrzayHFiU9Vbagook`. Im neuen Martha-Gespräch `2d4c6f96-264c-428e-99da-35c80d877423` liefert Anfrage `542e0382-5436-497f-a714-bdc9dad3e90c` den vollständigen Text einschließlich des letzten Satzes. Das Modell verwendet Pflegegrad 3, Kasse, Kurznotiz, Dokumententwurf und beide tatsächlichen Demoaufgaben. Trotzdem meldet der Abschluss weiterhin failed: `EVENT_ENVELOPE`, HTTP 200/SSE, `deepseek-v4.1-flash`. SQL bestätigt 725 Eingabe-/292 Ausgabetokens, 907 Zeichen und 568 Mikro-USD interne Verbrauchsschätzung. Kein erfolgreicher Gesamtabschluss behauptet. Der Backendinhaber untersucht die genaue Endformatabweichung; keine pauschale Formatfreigabe.

Für den verbleibenden Endformatfehler ergänzt `71205d8` ausschließlich feste Feldnamen, Datentypen und Zustandsphase in der sicheren Diagnose. Keine Gesprächsinhalte, Schlüssel, unbekannten Namen oder Rohereignisse werden protokolliert. Root unabhängig: 186 Backendtests, Typen/Build und 20 echte Vercel-Paketprüfungen bestanden; Push erfolgreich. Noch keine Lockerung der Abschlussprüfung.

### Belegtes doppeltes Usage-Ereignis

`71205d8` ist in Vercel als `5v38zhnn3YCjZAahADwJumbNeTSo` Ready. Anfrage `74261a94-b80f-4078-b8f4-3876a12736c9` zeigt nun die tatsächliche Ursache: `after_usage`, leeres choices-Array, nur die üblichen Felder id/object/created/model/choices/usage, keine unbekannten Felder, Usage mit numerischen prompt_tokens/completion_tokens/total_tokens. Ein zusätzliches Usage-only-Ereignis folgt auf die bereits bestätigte Inline-Usage. Der Backendinhaber ergänzt eine enge Konsistenzprüfung; keine doppelte Abrechnung und weiterhin notwendige DONE-/EOF-Marker.

Frontend-Nacharbeit bezeichnet bereits sichtbare Teilantworten jetzt ehrlich als nicht vollständig abgeschlossen, statt zu behaupten, es sei keine Antwort angekommen. Root hat unabhängig den gesamten Frontendcheck bestanden: 152 Tests, Typen, Lint, Build, 29 Bundle-Dateien, 53 Quelldateien/46 Kontrastpaare, 21 Proxy- und 14 Prozessprüfungen. Keine eigenen Restprozesse.

## Abschluss: angeforderter Live-Vorführungsablauf bestanden

Am 06.10.2026 um etwa 21:10 Uhr auf der Hauptdomain: Runtimecommit `7f9825b`, Vercel-Deployment `AswXMTrdU78Q5sTsXmqoy4hbtzYS` Ready. Root hat unabhängig 202 Backendtests, Typen/Build und 20 echte Vercel-Paketprüfungen bestanden; die Frontend-Abnahme mit 152 Tests ist oben belegt. Kein Schemawechsel durch die letzten Streamkorrekturen.

Erfolgreiches Gespräch: https://pflege-dashboard-puce.vercel.app/gespraeche/8c7a31ac-f659-4141-a3e0-1c24f79b3c01

| Echter Aufruf | Ergebnis | Speicherung | Verbrauchsschätzung |
| --- | --- | --- | --- |
| Martha-Daten und offene Aufgaben, `b9cf6529-7a36-46e3-871e-136c79d5d425` | Richtiger Pflegegrad, Kasse, Notiz, Dokument und Aufgaben samt UTC-/Berliner Terminen; 1119 Zeichen | Request und Nachricht completed; tatsächlich `deepseek-v4.1-flash`; 725/357 Tokens | Genau eine Ledgerzeile, 646 Mikro-USD |
| Drei einfache nächste Schritte, `846f65d9-79a2-4ca5-b93c-f6bbe59c2946` | Passender Gesprächsbezug, Priorisierung und fehlende Unterlagen benannt; 1041 Zeichen | Request und Nachricht completed; tatsächlich `deepseek-v4.1-flash`; 1124/309 Tokens | Genau eine Ledgerzeile, 708 Mikro-USD |

Die Werte sind interne Go-Verbrauchsschätzungen, keine behaupteten zusätzlichen Geldabbuchungen. Kein künstliches App-Ausgabenlimit gesetzt. Providerkontingente des bestehenden Kontos bleiben unverändert.

Nach beiden Antworten Chat in heller und dunkler Darstellung per Screenshot geprüft: lesbar, Eingabe und Modellanzeige klar, keine Fehler; Root-Bewertung 9/10. Während des Neuladens trennte sich die Browser-Erweiterung; über die neu verfügbare Verbindung desselben Profils wieder verbunden. Die früheren App-Tabs waren nicht mehr vorhanden. Ein eigener neuer Prüftab öffnete dasselbe Gespräch automatisch als Demo-Zugang mit beiden vollständigen Antworten und erhaltenem dunklem Design. Anschließend ein weiterer tatsächlicher Reload: Kontoanzeige 1, Antwortartikel 2, Fehlerhinweise 0, Folgeantwort vorhanden. Damit neuer Tab und Reload positiv belegt; ein vollständiger Browserneustart wird nicht behauptet. Eigenen Prüftab danach geschlossen; keine eigenen Prüfbrowser oder Server zurückgelassen.

Drei fehlgeschlagene Testgespräche wiederherstellbar archiviert. Das erfolgreiche Vorführungsgespräch und der ursprüngliche Beispieldialog bleiben aktiv. Kein Inhalt gelöscht, kein Passwort gelesen oder gespeichert. Nur die ausdrücklich gewünschte Sitzung bleibt gespeichert.

Die offene Schlüsselersatzaufforderung und frühere Providerblocks sind durch diese erfolgreiche Abnahme überholt. Der beauftragte Phase-1-Demoablauf ist bestanden. Grenzen bleiben: echtes Abmelden wurde zur Erhaltung des Nutzerzugangs nicht ausgeführt; 30 Tage sind Regel-/Testnachweis, kein verstrichener Dauertest; keine mobile Live-Abnahme wegen wirkungslosem Größenwechsel. Der Chat gibt Auskunft, sortiert Vorschläge und formuliert Text. Er legt noch keine neuen Aufgaben oder Dokumente an, verschickt keine Briefe und bietet keinen PDF-/DOCX-Export. Kein eigenständiger Start einer weiteren Entwicklungsphase.
