# Phase 1: Backend-Randfallprüfung vom 06.10.2026

Die bekannten Backendfunde sind behoben und geprüft. Referenz war **1dc2782**. Vertrag jetzt **v1.2**, HTTP-/SSE-Felder, sechs Browser-RPCs und Pfadkonstanten unverändert. Keine neue Produktphase, Edge Functions, Anwendungspublikation, Auth-Konten oder Providerkosten. Budget weiterhin **0**. Fremde Änderungen, Root-Pakete und Oberfläche wurden erhalten; kein Git-Schreibvorgang durch diesen Backend-Chat.

## Belegte Funde und Korrekturen

| Ablauf | Vorher / eigener Nachweis | Gelieferte Korrektur | Note vorher → nachher |
| --- | --- | --- | --- |
| Aktive Sitzung bei schweigendem Provider / Rückstau | Prüfung hing an neuen Providerstücken. Zwei Widerrufsgründe und ein gebremster Stream scheiterten in neuen Regressionen. | Unabhängiger 5s-Prüftimer nur während aktiver Antwort/Wiederholung, eine Prüfung gleichzeitig, harte 2,5s-Prüffrist (auch beim Warten auf eine Poolverbindung). Kein Aktivitäts-Touch. Widerruf stoppt Provider und weckt Rückstau; `SESSION_EXPIRED/WORKSPACE_FORBIDDEN` bleibt erhalten, Teilantwort endet interrupted. Timer/Listener werden entfernt. | 6,5 → **9,4** |
| Auth-Ausfall / Abbruch | Netzwerkfehler wurde 401 AUTH_REQUIRED; schon abgebrochene Anfrage verlor ihren Abbruchgrund und rief Auth noch auf. Zwei gezielte Tests zuvor rot. | Netz-/Dienstfehler → sichere retryable 503 INTERNAL_ERROR. 401/403 vom Auth-Dienst bleiben Login-Verweigerung. Bereits abgebrochene Anfragen → REQUEST_ABORTED vor Fetch. Erfolgreicher Auth-Transport und JWT-/User-/Session-Zuordnung bleiben zwingend. | 7,5 → **9,3** |
| Kontextreihenfolge | Frage und Antwort haben gleichen `now()`-Zeitstempel. Rückwärts angelegte Assistant-/User-UUIDs reproduzieren falsche Providerhistorie. | Achte additive Migration ersetzt nur `private.chat_prepare`: Zeit, Requestgruppe, User-vor-Assistant, zuletzt ID; letzte 40 mit umgekehrter Auswahl und anschließend aufsteigender Ausgabe. Vorhandene Zeilen werden nicht umgeschrieben. | 5,5 → **9,4** |
| Offene Aufgaben im Kontext | cancelled wurde durch `status <> done` mitgegeben. Historische SQL-Funktion reproduziert diesen Fehler. | Nur open/in_progress im serverseitigen Kontext; done/cancelled ausgeschlossen. | 8,0 → **9,4** |
| Bekannter fehlerhafter Providerabschluss | Unabhängiger Adapter→Handler-Repro und eigene Quellprüfung: falsches Modell mit bekannten Tokenzahlen wurde vor Usage-Übergabe verworfen. SQL hielt korrekt Geld, konnte Abweichung aber nicht festhalten/sperren. | Sicher darstellbare tatsächliche Usage/Modell-ID zuerst intern an Handler geben, dann Fehler. Handler finalisiert failed mit echten Werten. Bestehende SQL-Finalisierung hält Reservierung, speichert tatsächliche Modell-ID und blockiert Workspace; kein Usage-/Completed-Erfolg. Drei Adapter→Handler-Fälle für Modell/Eingabe-/Ausgabelimit und echte SQL-Prüfung. | 7,5 → **9,4** |
| Stop während Listenerstart | Echte Node-Serverprüfung: Listen-Promise blieb offen; nach abgeschlossenem Stop konnte derselbe Server erneut starten. Zwei Tests zuvor rot. | Bereitschaft wartet abbrechbar, Stop beendet den Wartepunkt; gestoppter Server verweigert späteres Listen. Bestehende Konfigurations-/Verify-Abbruchschutzstellen erhalten. | 7,0 → **9,5** |
| Workspace, Rollen, RPC, Audit | Vorherige Regeln/RLS bereits grün. Neue Kontextfunktion durfte keine Berechtigung öffnen. | 501 SQL-Prüfungen einschließlich ACL-Erhalt, Audit, FK-/Workspace-Grenzen und konservativem Abschluss; kein weiterer Schemaumbau. | 9,2 → **9,4** |
| Budget, Rate, Parallelität, Idempotenz | Bestehende atomare Sperren und Grenzen waren belegt; fehlerhafte Usage-Weitergabe ist oben getrennt. | Grenzen erhalten und im neuen echten Stack erneut geprüft; 22 echte Parallelprüfungen. Keine Freigabe gehaltenen Geldes, Budget0 erhalten. | 9,2 → **9,4** |
| Host/Origin, statische Dateien, HTTP | Vorher geprüft. Transport-/Listeneränderung erforderte Regressionen. | Exakte Origins/Hosts, Bodylimit, Traversal-/Symlink-/Dotfile-Schutz, statischer Cache und neutrale API-404 erhalten; 31 Native- und 39 Hosted-HTTP/SQL-Prüfungen. Tests auf eigenen zufälligen Ports. | 9,3 → **9,3** |
| Vertrag, Typen, Wiederholung | Dokumentation v1.1 und alte Sitzungsformulierung; Prüfskript beanspruchte 5174. | v1.2, echte neue Grenzen beschrieben, CLI-Typen neu erzeugt, Setup mit acht Migrationen und zufälligem Smoke-Port aktualisiert. | 8,8 → **9,3** |

Die Noten bewerten die gelieferte Backendimplementierung und ihre benannten Nachweise. Sie behaupten keine bestandene echte Anmeldung oder KI-Unterhaltung. Kein neuer Auditzyklus nach Abschluss der bekannten Funde.

## Tatsächlich ausgeführte Prüfungen

- Neue negative Baseline: **7 fehlgeschlagene / 81 übersprungene** Tests vor den Stream-/Auth-/Listenerfixes; `.local/randfaelle-before.json`. Die sieben betroffenen Prüfungen danach bestanden. Später zusammen mit den Adapter-/HTTP-Fällen **93/93** Backendtests, davon **12 neu** gegenüber 1dc2782. Beim Abschluss des vorhandenen Watchdog-Fixes wurde zusätzlich die harte Prüffrist belegt: bloßes AbortSignal beendet ein noch wartendes RPC-Promise nicht zwingend. Eine neue Regression scheiterte vorher und besteht nach begrenztem Warten inklusive Abbruch und Timerbereinigung. SQL/Migrationen unverändert; kein weiterer Stacklauf dafür nötig.
- Eigener vollständiger nativer Supabase-Lauf: **12:58:20.500–12:58:35.650 UTC**. Acht Migrationen und unveränderter fiktiver Seed frisch angewendet; **501 SQL-Prüfungen** in vier Dateien (295 Phase0, 139 Phase1, 50 Node-Rolle, 17 Kontext), **8 + 14 Parallelprüfungen**, **18 Node-PG-Rollen-/Abbruchprüfungen**, **31 tatsächliche Native-Node-HTTP/SQL-Prüfungen**, **92 Unit-/Mocktests**, strikter Produkt-/Vertragstypcheck und Build bestanden. CLI-Generierung aus der wirklichen migrierten DB, keine handgeschriebenen Ersatztypen. Nach der letzten gekoppelten Watchdog-Prüffristkorrektur erneut Produkt-Typecheck/Build und **93/93** Unit-/HTTP-/Mocktests bestanden.
- Native Laufzeit der bestehenden Supabase-CLI **2.119.0**, eigenes `SUPABASE_HOME` unter dem Betriebssystem-Tempordner `pflege-dashboard-supabase-57aea064-phase0`, Spiegel `backend/.local/supabase-project`. Datenbank/REST/Auth/Storage tatsächlich healthy; REST/Auth/Storage jeweils **HTTP200**. Functions bewusst stopped. Kein eigener PostgreSQL-Ersatz.
- Historischer Kontext-Repro: ursprüngliche Funktion aus der unveränderten vierten Migration ausschließlich innerhalb einer zurückgerollten lokalen Transaktion eingesetzt. **17 echte SQL-Prüfungen, genau 2 erwartete Fehler** (Reihenfolge, cancelled). Danach ursprünglicher aktueller Funktionsstand exakt wiederhergestellt, keine Fixtures behalten. Aktuelle Funktion besteht alle 17.
- Ein erster SQL-Prüflauf scheiterte an einer falschen Prompt-ID **in der neuen Testfixture**. Der Fixtureverweis wurde auf die tatsächlich gespeicherte Defaultpromptversion korrigiert; danach obiger vollständiger Lauf grün. Der fehlgeschlagene Lauf wird nicht als Abnahme gezählt. Migrationen/Seed waren kein Fehler dieses Laufs.
- Der gemeinsame `.local/phase1-result.json` wurde danach durch einen zusätzlichen grünen Lauf **13:06:17–13:06:33 UTC** ersetzt. Das ist ein weiterer gemeinsamer Prüfstand, nicht die Startzeit meines eigenen Laufs. Eigene Konsolenergebnisse stehen in `.local/randfaelle-stack.log`.
- Die CLI-Autorierungshilfe `migration new phase1_context_order` endete in zwei begrenzten Versuchen nicht erfolgreich. Die additive SQL-Datei wurde manuell angelegt. Tatsächlicher Start/Reset/Migration/SQL-Test/Typgenerierung mit Supabase sind davon getrennt und erfolgreich nachgewiesen; keine behauptete erfolgreiche CLI-Autorierung.

## Autorisierte Hosted-Übernahme

Eigenes Projekt ausschließlich **ttbfpqveexmlqxkzwlmz**, offizielle CA/TLS: encrypted/authorized, `rejectUnauthorized:true`. Vor Änderung: 25 App-Tabellen mit RLS und erwarteten Besitzern, sieben Migrationen, ein Demo-Workspace, null Auth-Nutzer, Nullbudget. Storage `buckets/objects` weiterhin im Besitz `supabase_storage_admin` mit RLS. Vergleich zur neuen lokalen Struktur zeigte genau eine geänderte Funktionsdefinition.

Der Apply-Weg prüfte den **gesamten bisherigen Siebenerstand samt privaten Funktionskörpern und ACL** gegen den lokal bewiesenen Stand, bevor er die eine neue Funktionsdefinition schrieb. Ausschließlich **20261006150000_phase1_context_order.sql** wurde additiv übernommen. Keine alten Migrationen erneut ausgeführt, keine Daten zurückgesetzt/gelöscht, **kein Seed-Replay**. Anschließender vollständiger Struktur-/Rechtevergleich entspricht lokal; acht Journaleinträge, ein Workspace, null Auth-Nutzer und Budget0 erhalten.

Danach, vor der letzten ausschließlich lokalen Handler-Prüffristkorrektur, **39 echte Hosted-Node-/HTTP-/Static-Prüfungen** mit gebautem Produktserver auf eigenem Port **50557** bestanden: echte Supabase-Verweigerung ungültiger Bearer, minimale Health, Origin/Host, SQL-Rollengrenzen, fehlende API-Pfade, statische Dateien und Cleanup. Das ist kein erfolgreicher Login/Provideraufruf. Die letzte Änderung betrifft ausschließlich `backend/runtime/handler.ts`: begrenztes Promise-Warten mit eigener Abbruchfrist und Listener-/Timerbereinigung. Sie ist durch den vorher roten Timeout-Repro sowie den abschließenden strikten Typecheck, Build und alle 93 Tests einschließlich echter HTTP-Tests belegt. Der Orchestrator prüft den Endstand zusätzlich unabhängig; dessen noch laufender letzter Hosted-/Static-Smoke wird hier nicht vorweg als bestanden ausgegeben. Sicherheitsberater vor/nach Änderung: **3 erwartete INFO** für drei serverinterne RLS-Tabellen ohne Browserpolicy, **0 Warnungen, 0 Fehler**.

Persistierte sichere Belege liegen ausschließlich im ignorierten `backend/.local/`: `randfaelle-before.json`, `randfaelle-unit.json`, `randfaelle-final-unit.json`, `randfaelle-check-deadline-before.json`, `randfaelle-stack.log`, `context-historical-repro.json`, `phase1-result.json`, `node-database.json`, `node-smoke-local.json`, `node-smoke-hosted.json`, `randfaelle-hosted-before.json`, `hosted-apply.json`, `hosted-inspect.json`, `randfaelle-advisors.json`, `randfaelle-cleanup.json`. CLI-Rohstatus oder Secretwerte wurden nicht angezeigt. Generierte `types/database.types.ts` ist nach tatsächlicher Neuerzeugung bytegleich, weil öffentliche Typformen unverändert sind.

## Anforderungen und verbleibende Grenzen

| Anforderungsbereich | Phase-1-Ergebnis / Grenze |
| --- | --- |
| Eigenständige Supabase-Grundlage | Eigene Migrationen/Seed, 25 Tabellen mit Workspace/Akteur/RLS, echte Mitgliedschaftsgrenzen und Privatbucket; keine NoteTree-Übernahme. |
| Auth/Sitzung/Logout | Reale Auth-Validierung, Session-ID/Subject/Audience/Issuer/Expiry, reale SQL-Session und Mitgliedschaft, App-Inaktivität15m/Zeitbox8h. Timer erneuert keine Aktivität. Positive echte Login-Session weiterhin ungeprüft, keine Konten erstellt. |
| Dashboard und Chat-Historie | Berechtigte DB-Daten und sechs auditierende menschliche RPCs. Kontext und Herkunftssnapshots unveränderlich; Reihenfolge/aktive Aufgaben korrigiert. Themen, UI, Browser und Root-start gehören Opus und sind kein Backend-Bildnachweis. |
| Streaming / Provider | Tatsächlicher Node-Produktadapter, kein Mockfallback. Providertransport in Unit-/HTTP-Fällen ausdrücklich synthetisch; echte Auth-Verweigerung/SQL zusätzlich geprüft. Kein bezahlter AI-Smoke. |
| Kosten / Rate / Wiederholung | Atomare Reservierung/Monatscap, 10 Starts/Minute und 2 aktive Requests pro Benutzer über Workspaces, ein aktiver Request je Gespräch. Replay bezahlt nichts neu; Fehler/Abbruch braucht bewusst neuen Key. Unbekannter Verbrauch bleibt held, bekannte Abweichung blockiert. |
| Host/Origin / statische Vorschau / Stop | Loopback, feste Origins/Hosts, sichere Root-dist-Auslieferung, kein API-SPA-Fallback, begrenzte Streams/SQL/Shutdown und eigener Cleanup. Keine Veröffentlichung. |
| Modellkatalog, Prompt-/Settingsversionen | Geschützte/konfigurierbare Registry und unveränderliche Versionen vorhanden; Beispielmodelle disabled/planned. Ein OpenAI-Adapter in Phase1. Anthropic/EU-Anbieter spätere Erweiterung, keine erfundenen Fähigkeiten, Preise oder Datenschutzgarantien. |
| Bestätigung, Tools, Uploads, RAG, Exporte, Übergabe | **Geplante Phase2**, keine angeblich funktionierende Erstellung. Phase1 sendet in jedem Mode keine Tools. Anhänge werden aktuell verweigert. Bestehendes Storage-RLS ist Grundlagenprüfung, keine fertige Uploadabnahme. |
| Demo-Paket und Abschlussfeinschliff | Phase3/4; kein neuer Beginn. Seed bleibt fiktiv. |

Echter Nutzerfluss **Anmeldung → Mitgliedschaft → Gespräch → KI-Stream** bleibt offen: Konto/Mitgliedschaft, Providerkey, überprüftes aktives Modell/Preise und bewusst freigegebenes Budget fehlen. Direkte Browser-Lese-/Metadatenzugriffe können trotz App-Logout bis JWT-exp bestehen; lokal JWT300s, Hosted-Laufzeit weiterhin nicht als300s belegt. Die Anwendung garantiert 15m/8h am empfindlichen Serverweg, nicht durch behauptete Hosted-Free-Auth-Einstellungen. Externe Rechnung, Datenschutz-/Hostingfreigabe, weitere Anbieter und bestätigte Dokumenterstellung sind keine bestandenen Gates.

## Befehle und sichere Wiederholung

Ausgeführt: erster fokussierter Vitest-Repro mit sieben roten Fällen; danach fokussierte Korrekturprüfung, vollständiger Backend-Vitest, Produkt-Typecheck/Build; `node scripts/phase1-check.mjs`; `node scripts/hosted-schema.mjs inspect`, `apply`, erneut `inspect`; `node scripts/node-smoke.mjs --hosted --static`; gezielte `node --check` für geänderte JS-Prüfskripte. Hosted-Ausgaben zuerst in ignorierte Logs. Kein `supabase login/link/deploy`, Root-Env-Print, Browser oder Git-Schreibbefehl.

Kostenfreie gezielte Regressionen, ohne Konto und ohne Stack:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
npm run typecheck
npm run build
node node_modules/vitest/vitest.mjs run --reporter=dot
```

Nur neue gekoppelte Randfälle (12 Prüfungen; andere Tests übersprungen):

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
node node_modules/vitest/vitest.mjs run --reporter=dot -t 'active live-session watchdog|Auth network failure|aborted Auth|listener startup|actual adapter transports known rejected|real HTTP silent stream'
```

Vollständige echte eigene lokale DB-/RLS-/Typenprüfung, nur bei neuer Frage erforderlich; enthält Zeitlimit und Stop/Cleanup im finally:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
node scripts/phase1-check.mjs
```

Reiner eigener Hosted-Bestand und realer Produktserver auf zufälligem eigenem Port; Root-dist muss bereits vom Frontend gebaut sein:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
node scripts/hosted-schema.mjs inspect
node scripts/node-smoke.mjs --hosted --static
```

Die tatsächlich ausgeführte additive Übernahme verwendete `node scripts/hosted-schema.mjs apply`. Sie benötigt weiterhin das frische vollständige lokale Gate mit gleichen Migrations-/Seed-/Schemahashes. Kein Hosted-Reset. Eine erneute Übernahme ist für den vorhandenen Acht-Migrationsstand nicht erforderlich.

Technische Primärquellen: [Supabase Sitzungen und Session-ID](https://supabase.com/docs/guides/auth/sessions), [Supabase Changelog](https://supabase.com/changelog), [PostgreSQL CREATE OR REPLACE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html). Die unveränderten Besitzer/Rechte bei Funktionsersetzung sind zusätzlich durch tatsächliche lokale/Hosted-ACL-Prüfungen belegt. Weitere Anbieterfakten werden hier nicht neu behauptet.

## Eigene Dateien

Geändert oder hinzugefügt; alle Pfade absolut:

- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/runtime/handler.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/runtime/platform.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/runtime/provider.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/runtime/server.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/context-historical-repro.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/hosted-schema.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/node-smoke.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/phase1-check.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/tests/chat.test.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/tests/node.test.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/migrations/20261006150000_phase1_context_order.sql
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/tests/phase1_context.test.sql
- /Users/kentoky/Documents/React Projects/pflege-dashboard/types/phase1.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/types/README.md
- /Users/kentoky/Documents/React Projects/pflege-dashboard/docs/api-contract.md
- /Users/kentoky/Documents/React Projects/pflege-dashboard/docs/backend-setup.md
- /Users/kentoky/Documents/React Projects/pflege-dashboard/docs/backend-phase1-randfaelle.md

Tatsächlich neu generiert, inhaltlich unverändert: /Users/kentoky/Documents/React Projects/pflege-dashboard/types/database.types.ts. Alte sieben Migrationen und /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/seed.sql unverändert. `runtime/index.ts` musste für den weiteren Listenerfund nicht erneut geändert werden: seine vorhandenen Stopprüfungen bleiben erhalten, der betroffene Wartepunkt wurde im Server geschlossen.

## Aufräumnachweis und Anschluss

Eigener nativer Stack im finally gestoppt: **0 eigene Prozesse**, Ports **56421/56422/56428 geschlossen**. Native Parallelfixtures entfernt, SQLfixtures zurückgerollt. Eigener Hosted-Smoke-PID **59929** nach Beendigung nicht mehr vorhanden, sein Port **50557 geschlossen**, Cleanup innerhalb5s. Temporäres eigenes CLI-Autorierungsverzeichnis entfernt; keine entsprechenden CLI-Prozesse übrig. Kein Browser gestartet. Frontendports5173/5174 wurden nicht benutzt oder beendet. Lokale Supabase-Cache-/Spiegel-/redigierte Nachweisdateien bleiben ignoriert erhalten; keine fremden Ressourcen geändert.

Letzter eigener Stand: Produkt-Typecheck/Build und **93/93** Backendtests grün, davon **12 neue** Regressionen. Unabhängiger nativer 501-SQL-Lauf laut Orchestrator zusätzlich bestätigt; für die abschließende reine Handleränderung kein erneuter Stackreset. Frontendabschluss mit 131 Tests liegt laut Orchestrator separat vor und ist kein eigener Backendnachweis.

Anschluss für Orchestrator: Vertrag **v1.2**, unveränderte konsumierbare HTTP-/SSE-Typformen unter `types/phase1.ts`, actual DB-Typen unter `types/database.types.ts`, Hosted-Schema mit acht Migrationen gleich lokal. Nach Bericht keine weitere Bereichsarbeit, keine Nachricht/Freigabe an Frontend und keine Phase2.
