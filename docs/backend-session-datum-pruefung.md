# Gespeicherte Anmeldung und verlässliches Datum — Backend v1.4

Stand 06.10.2026. Die ausdrücklich gewünschte gespeicherte Anmeldung und der fehlende Zeitbezug für Alltagshilfen sind serverseitig implementiert. Kein Passwort gespeichert, keine Auth-Konten/Sessions angelegt, keine Provideraufrufe, keine Hosted-Schreiboperation und keine Gitmutation durch diesen Backendlauf. Der zuvor getrennt gelieferte Vercel-Paketfix bleibt erhalten.

## Verhalten und Anschluss

`POST /api/session` behält Bearer/JSON bei. `touch` erlaubt optional `rememberSession:boolean`; `end` verbietet dieses Feld. Serveridentität kommt unverändert ausschließlich aus tatsächlich geprüftem Supabase-User und JWT. Neuer `SessionResult.sessionPolicy` unterscheidet:

| Politik | Inaktivität | Absolute Frist |
| --- | --- | --- |
| `standard` ohne Opt-in | 900 Sekunden | 28800 Sekunden |
| `remembered` nach bewusster Auswahl | 2592000 Sekunden | 2592000 Sekunden |

Absolute Frist beginnt bei **realer Auth-Sitzungsanlage**, niemals erneut bei Touch. Reale kürzere `auth.sessions.not_after`-Gültigkeit, fehlende Auth-Zeile, Supabase-Tokenprüfung und Widerruf bleiben maßgeblich. Die App garantiert kein Fortbestehen über diese externe Gültigkeit hinaus. Aktiver Standardzugang kann vor Ablauf bewusst umgestellt werden. Abgelaufene Standard-/Remember-Sitzungen oder Logout werden durch Opt-in nicht wiederbelebt. Bereits gespeicherte Policy bleibt bei anschließendem Touch mit false/ohne Flag bestehen; Umstellung zurück auf Standard durch Abmelden/Neuanmeldung. Alle Arbeitsbereiche derselben realen Sitzung teilen den Stand und werden bei Logout gemeinsam widerrufen. Keine Hintergrund-Aktivitätsverlängerung.

Frontend-Vertrag veröffentlicht vor Anbindung: `types/phase1.ts` und `docs/api-contract.md` v1.4. Exakte diskriminierte Rückgabewerte, bestehende JSON-/SSE-Pfade unverändert. Browser muss lange Fristtimer begrenzt neu planen (30 Tage überschreiten die JavaScript-Einzeltimergrenze). Client speichert nur bewusst gewählte gültige Supabase-Tokens, niemals Passwort; diese Frontendumsetzung/Liveprüfung gehört dem Frontend/Orchestrator.

Neue Migration **20261006162000_remember_session_clock.sql** wurde zunächst mit CLI `migration new remember_session_clock` angelegt; der CLI-Zeitname lag vor bereits vorhandenen Migrationen und wurde vor Anwendung hinter deren letzten Stand `20261006161000` geordnet. Bestehende zehn Migrationen und Seed unverändert. Neue geschützte Spalte `session_activity.remember_session` standardmäßig false. Vorhandene vierargumentige `edge_session` bleibt kompatibel, neue fünfargumentige Signatur nimmt ausschließlich das feste Boolean-Argument auf. Node-Whitelist erlaubt keinen freien Funktionsnamen/SQL-/Clock-/Actorweg, überprüft beide Wrapperrechte; NOLOGIN-Rolle bleibt ohne Tabellen-/Privatschema-/Auth-/Storagezugriff. Private `session_touch` dient der Geschäftskernprüfung mit Fixtures und bleibt für Browser, Service und Node unzugänglich. Produktwrapper prüft zuerst die reale Auth-Sitzung. Die Migration übernimmt keine Supabase-Systemtabellenbesitzer.

Neue Chatkontexte speichern `serverNow`, `serverDate` und `serverTimeZone:"Europe/Berlin"` aus der **Datenbankuhr** unveränderlich im Request. Serverzeit steht vor unverlässlichen Personendaten in den Systemanweisungen. Relative Zeitangaben beziehen sich auf Berlin inklusive Sommer-/Winterzeit. Replay übernimmt den originalen Snapshot, keine nachträgliche Umdeutung. Historische abgeschlossene Requests dürfen die später eingeführten Felder noch nicht enthalten. Dies ist ein verlässlicher Bezugspunkt, keine Garantie sachlich richtiger Modellantworten.

## Tatsächlich ausgeführte Prüfung

Frischer kompletter nativer Supabase-Lauf **15:10:20.554–15:10:34.897 UTC**: echte Database/REST/Auth/Storage-Dienste; begrenzte Auth/Storage/REST-Proben jeweils HTTP200. Elf Migrationen plus unveränderter fiktiver Seed tatsächlich frisch angewendet. Ergebnis:

- **579/579 SQL-Prüfungen**, sieben Dateien. Darunter **37 neue Remember-Prüfungen** und **13 neue Uhrzeitprüfungen**; weitere zusätzliche Aussagen entstehen in vorhandenen automatisch aufgezählten Rollen-/Funktionsprüfungen. Standardfristen, aktiver Opt-in, Wiederaufnahme nach einem Tag, absolute/Idle-Grenzen, kein Revival, fremder Akteur/Workspace, Logout in mehreren Workspaces, Browser/anon/Node-Kernverweigerung, fehlende echte Auth-Zeile, Auth-Deadline und Audit geprüft. Uhrzeit aus DB, Berlin-Mitternacht in Sommer/Winter, Snapshot-Schutz und Replay geprüft.
- **134/134 Backendtests**, sieben Dateien, davon **13 neue gezielte Remember-Handler-/HTTP-/Whitelist-Tests**. Erfolgreicher HTTP-Rememberpfad benutzt synthetisch verifizierte Identität und RPC-Mock auf eigenem zufälligem Port; kein echter Login. Ungültige Booleanformen, verbotenes end-Flag, Authfehler und fremde SQL-Argumente werden vor Ausführung zurückgewiesen.
- **31 echte Native-Node-HTTP-/SQL-Proben**, **19 echte PG-Rollen-/Abbruchprüfungen**, **8 + 15 Parallelprüfungen**, acht Demo-Setupprüfungen. Historischer Kontext-Repro erkennt weiterhin genau die zwei ursprünglichen Fehler und rollt zurück. Alle ohne Login-Konto oder Providerkontakt.
- Tatsächliche Supabase-CLI-Typgenerierung aus der migrierten App-DB, vollständige Schema-Baseline, strikter Typecheck und Build bestanden. Danach letzter reiner Kontext-Typzusatz mit erneutem Typecheck/Build und API-Lint bestanden.

Zusätzlicher **echter Zehn-zu-elf-Upgradeweg** mit `backend/scripts/session-upgrade-check.mjs`: zwölf Aussagen bestanden. Zuerst tatsächliche zehn historischen Migrationen im eigenen Prüfspiegel, bestehende Standard-Sitzungsfixture und Seed. Additive Migration elf angewendet; vollständiger Schema-/Funktions-/Rechtefingerprint exakt gleich zur separat frisch geprüften Elf-Migrationsbasis. Alte Daten, Nachrichten und Nullbudget erhalten; vorhandene Sitzung erhält default false ohne Änderung ihrer Identität/Aktivität/Deadline. Kein Browserrecht am neuen Wrapper, kein privater Node-Kernzugriff. Negative Kontrolle: eine bewusst falsche Browserfreigabe wird vom vollen Fingerprint erkannt und zurückgerollt. Eigene Upgradefixtures vor Shutdown gelöscht. Keine gelockerte Fingerprintprüfung.

Die erste Vorbereitung fand einen PL/pgSQL-CASE-Syntaxfehler und einen pgTAP-Prüfrollen-Zugriff im Testaufbau. Beide behoben; Endresultate oben stammen aus tatsächlich erfolgreich wiederholten Prüfungen, keine von Hand grün gesetzten Belege. Ein separater HTTP-Test verwendete zunächst Port0 in der Host-Erwartung und wurde auf einen tatsächlich ermittelten eigenen freien Port korrigiert; Hostschutz wurde nicht gelockert.

## Sichere Wiederholung

Aus dem Projektordner, keine Secret-Ausgabe:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard'
npm --prefix backend run check:phase1
node backend/scripts/session-upgrade-check.mjs
node backend/scripts/parallel-repeat-check.mjs
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix backend run build
node node_modules/eslint/bin/eslint.js --max-warnings=0 api
```

Erster Befehl startet/resettiert ausschließlich den eigenen echten nativen Supabase-Prüfstack, wendet alle elf Migrationen an, prüft, erzeugt Typen/Baseline und beendet/prüft im finally. Zweiter Befehl verwendet denselben exklusiven eigenen Stack für tatsächliches 10→11, mit Zeitlimit/finally, getrenntem Ergebnis, ohne das erfolgreiche Gesamtlauf-Gate zu überschreiben. Deshalb **nacheinander**, niemals parallel oder während eines anderen Agenten-Supabase-Laufs ausführen. `supabase-safe.mjs --session-base` entfernt nur Migration elf aus dem ignorierten Testspiegel; keine Quelldatei. Der historische `--phase1-base`/`--upgrade`-Weg ist auf alle nach acht folgenden Migrationen aktualisiert; der hier gesondert ausgeführte Anschluss ist 10→11.

Belege unter ignoriertem `backend/.local/`: `phase1-result.json`, `supabase-test.log`, `vitest-result.json`, `session-upgrade-result.json`, `node-database.json`, `node-smoke-local.json`, `schema-baseline.json`, `runtime-probe.json`, `runtime-cleanup.json` und `parallel-repeat-result.json`. CLI-/Statusausgaben bleiben redigiert dort; keine Token/URLs/Secrets im Bericht.

## Bewertung und Grenzen

| Backendablauf | Vorher → Nachher | Nachweis |
| --- | --- | --- |
| Bewusst gespeicherte Anmeldung | 4 → **9,5/10** | Vorher trotz Tokenspeicherung nach15m/8h blockiert; jetzt geschützte 30-Tage-Policy mit echten Ablauf-/Widerrufsgates |
| Relativer Datumsbezug | 5 → **9,4/10** | Vorher kein vertrauenswürdiges Datum; jetzt DB-/Berlin-Snapshot, unveränderlich und replayfest |
| Additive Übernahme/Rechte | 9,3 → **9,6/10** | Echte frische und10→11-Struktur identisch, Bestand und Rechte erhalten, negativer Rechtekontrolltest |
| API/Typen/Prozessabschluss | 9,3 → **9,5/10** | v1.4, tatsächlich generierte Typen, feste SQL-Überladung, begrenzter eigener HTTP-/Native-Lauf |

Noten gelten für Backendimplementierung mit den genannten Nachweisen. **Hosted-Übernahme führt ausschließlich der Orchestrator durch.** Sicherer vorhandener Anschluss danach: `npm --prefix backend run hosted:apply`, anschließend `npm --prefix backend run hosted:inspect`; der vorhandene Helfer prüft Gate/Hashes/Besitzer/TLS und eigenes Projekt vor additiven Writes, kein Reset und kein Seed-Replay bei bereits bestehendem Workspace. Diese Befehle wurden in diesem Auftrag nicht durch den Backendagenten ausgeführt. Erst die Übernahme ermöglicht den neuen fünfargumentigen Sessionpfad auf Hosted. Echte angemeldete Live-Wiederaufnahme, sichtbare Abmeldung und echte DeepSeek-Antwort folgen beim unabhängigen Browserprüfer/Orchestrator mit nutzerseitig vorhandenem Zugang. Keine Behauptung eines positiven Auth-/KI-Gates aus privaten SQL-Kernen oder Mock-Transport. Phase2-Tools/Bestätigung/Exports/RAG bleiben unimplementiert.

Cleanup: komplette eigene Dienste nach jedem Erfolg/Fehlschlag gestoppt; abschließendes `runtime-cleanup.json`: **null eigene Prozesse**, Ports **56421/56422/56428 geschlossen**. Letzter vollständiger Node-Smoke eigener Port **52788**, PID **66171** beendet. Neue HTTP-Regression schließt Listener im finally; eigene Upgradefixtures gelöscht, Verbindungen geschlossen. Eigenes `SUPABASE_HOME` ausschließlich macOS-Temporärordner `/var/folders/.../pflege-dashboard-supabase-57aea064-phase0`, Prüfspiegel `backend/.local/supabase-project`. Kein Browser gestartet, keine fremden Stacks/Ports, Konfigurationen, Frontend-/Orchestrator-/Rootdateien oder Gitzustände geändert. Ignorierte reproduzierbare Logs/Prüfwerkzeuge bleiben, kein laufender Prozess.

## Eigene Dateien dieser Fortsetzung

- `supabase/migrations/20261006162000_remember_session_clock.sql`, `supabase/tests/remember_session.test.sql`, `supabase/tests/server_clock.test.sql`.
- `backend/runtime/{database,handler,provider}.ts`, `backend/tests/{remember-session.test.ts,chat.test.ts,contracts.typecheck.ts}`.
- `backend/scripts/{session-upgrade-check,node-database-check,supabase-safe,upgrade-check,phase1-concurrency,parallel-repeat-check}.mjs`.
- `types/{phase1.ts,database.types.ts,README.md}`, `docs/{api-contract.md,backend-setup.md,backend-session-datum-pruefung.md}`. Frühere packbezogene Anpassung in `docs/vercel-demo-setup.md` gehört zum separat gesicherten Paketbericht, kein neue Produktfunktion.

Offizielle Grundlage für echte Session-ID, fehlende Sitzungszeile nach Logout und externe Sessiongültigkeit: [Supabase User sessions](https://supabase.com/docs/guides/auth/sessions), aktuell gelesen am06.10.2026. Auth-Sessionlimits auf Free werden nicht als garantiert beschrieben.

## Abschließender unabhängiger Parallelbefund und Nacharbeit

Der Orchestrator fand nach dem ersten grünen Lauf einen intermittierenden Prüffehler `6236 !== 6237` beim Budgetrennen. Das war **kein Budgetdurchbruch**: Der Test verwendete die Kosten einer zuvor zurückgerollten Kalibrieranfrage als exakt identische Kosten der echten konkurrierenden Anfrage. `serverNow` wird je Transaktion neu gespeichert; seine JSON-Bruchsekunden haben unterschiedliche Textlängen und ändern damit den konservativen Token-/Kostenrahmen geringfügig. Der wirkliche gespeicherte Snapshotbetrag war niedriger als der angenommene Vergleichswert.

`phase1-concurrency.mjs` benutzt jetzt ausschließlich `first.context.maximumCostMicrousd` aus dem tatsächlichen ersten Request. Innerhalb dessen bereits gehaltener echten Budgetzeilensperre setzt der Test nur den synthetischen Fixtureworkspace exakt auf diesen Betrag, bevor der zweite Writer die Sperre abwartet. Nach Commit prüft er zusätzlich den wirklichen Cap. Zweiter Start wird weiterhin wegen atomar sichtbarer erster Reservierung abgelehnt, unbekannte Kosten bleiben held, tatsächlicher Demo-Seedcap bleibt0. Kein Produktbudgetschutz, SQL-Guard, Clock, Provider oder Nutzerdaten geändert.

Danach kompletter eigener echter nativer **Endlauf15:10:20.554–15:10:34.897 UTC** erneut grün:579SQL,134Tests,31HTTP,19PG, nun8+15Parallelfälle, übrige Prüfungen und Cleanup wie oben. Zusätzlich `parallel-repeat-check.mjs` zwölf tatsächliche Rennprüfläufe nacheinander auf derselben eigenen echten Elf-Migrations-DB, ohne erneuten Reset/Seed: pro Lauf15 Aussagen, eigene Fixtures jeweils entfernt, danach Stack/Verbindungen/Ports im finally geschlossen. Nachweis `parallel-repeat-result.json`. Die grüne Endaussage bezieht sich auf diese neuen wirklichen Prüfungen, nicht auf die vom unabhängigen Fehlversuch überschriebenen früheren Logs.

Qualität des Rennnachweises **7 →9,5/10**: Abhängigkeit von einer fremden Kalibriertransaktion entfernt; wirklicher Gewinnerbetrag/Cap, abgewartete Zeilensperre, Verweigerung und Cleanup wiederholt belegt. Der zusätzliche Helfer ist ein begrenzter Wiederholtest, keine wiederkehrende Produktarbeit. Er ist nach dem vollen `check:phase1` auszuführen und braucht exklusiven eigenen Supabase-Stack. Nach Lieferung keine weiteren Quellenänderungen oder eigenen Stackläufe; unabhängige Übernahme wieder beim Orchestrator.
