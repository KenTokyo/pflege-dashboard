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
