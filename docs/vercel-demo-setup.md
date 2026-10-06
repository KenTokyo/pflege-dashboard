# Vercel-/DeepSeek-Anschluss — geprüfte Backendlieferung

Stand 06.10.2026, API-Vertrag **v1.3**. Ziel: normales Vercel-Node-Backend für die vorhandene Tagwerk-App, Supabase Auth/DB/Storage, Textantworten mit **DeepSeek V4.1 Flash** (`deepseek-flash`). Keine Supabase Edge Functions. Die bestehenden `/api/session`, `/api/chat-stream`, `/api/health` sowie JSON-/SSE-Felder bleiben kompatibel. Backendlieferung fertig; Deployment, Hosted-Übernahme und angemeldeter KI-Nutzertest gehören zur separaten Orchestrator-Abnahme.

## Ergebnis und bewusste Kostenwahl

Die vier neuen `api/*.ts` verwenden Vercels offiziellen Web-Request/Response-Export unter normalem Node. `vercel.json` verbindet diese Funktionen mit dem gebauten Root-dist, lässt unbekannte API-Pfade als neutralen JSON-404 enden und verwendet Frankfurt für die Serverfunktionen. Das bedeutet keine behauptete EU-Verarbeitung durch DeepSeek.

Cloud-Konfiguration liest nur Server-Prozessvariablen. Keine Abhängigkeit von lokaler `.env`, lokalem Zertifikatspfad, PAT oder Service-Role-Key. Die öffentliche offizielle Supabase-CA liegt ausschließlich im Serverquelltext. TLS-Zertifikat und Hostname bleiben verifiziert. Der Pool hat maximal vier Verbindungen, fünf Sekunden Idle-Timeout, `attachDatabasePool`; Transaktionen wechseln ausschließlich lokal auf die begrenzte `pflege_backend`-Rolle und lassen nur die sieben vorhandenen parametrisierten RPCs zu. `waitUntil` erhält die tatsächliche begrenzte Stream-/Abbruchfinalisierung. Keine Hintergrundschleife nach Ende der Antwort.

**Jüngste Nutzerwahl: keine DeepSeek-Ausgabenlimits in der App.** Die frühere 5-USD-Wahl ist überholt. Migrationen erhöhen kein vorhandenes Budget. Das gesonderte Operator-Setup setzt `monthly_cap_microusd=NULL` und `total_cap_microusd=NULL` ausdrücklich auf unbegrenzt. `0` bleibt gesperrt; positive Zahlen bleiben echte optionale Caps. Gesamtcaps würden alle Monate, Ledger und held/reserved zählen. Kein großer Pseudowert, kein monatlich erneuertes Demoguthaben. Verbrauch, atomare Reservierungen, Audit, Sitzung, Mitgliedschaft und Modellfehlerstopp bleiben. Bestehende `blocked`-Zustände und held-Reservierungen werden nicht zurückgesetzt. Rate-/Parallelgrenzen, maximal 1024 Ausgabetokens und 120s Antwortzeit bleiben operative Schutzmaßnahmen.

Offizieller Preisstand vom 06.10.: Peak cache miss **0,30 USD/M Eingabetokens**, Peak Ausgabe **1,20 USD/M**. Für die unbegrenzte Demo wird der Preisstand dauerhaft als **Schätzung** geführt, nicht durch einen festen Abschalttermin künstlich ungültig. `expires_at=infinity` kennzeichnet diese permanente Schätzung; Ledger trägt `estimated:true`. Spätere Änderungen beim Anbieter können diese Kosten verändern. Wer später einen positiven Cap wählt, braucht eine neu überprüfte finite Preisversion; der Server verweigert eine permanente DeepSeek-Schätzung bei einem Cap. Preisänderungen bewusst als neue unveränderliche `model_prices`-Zeile erfassen, niemals alte Rechnungs-/Snapshotzeilen umschreiben. Das Operator-Setup aktualisiert alte Verbrauchsstände nicht.

DeepSeek bietet hier keinen belegten Online-Eingabezähler. Die Reservierung verwendet deshalb die gesamte dokumentierte 1M-Kontextobergrenze mit konservativ 1.048.576 Eingabetokens und maximal 1024 Ausgabetokens (315.802 µUSD bei diesem Preisstand). Keine behauptete exakte Zeichen-/Tokenumrechnung. Der endgültige gespeicherte Verbrauch verwendet tatsächliche Terminal-Tokenzahlen. In der unbegrenzten Demo erzeugt die Reservierung keine Ausgabenbegrenzung. Cache-/Off-Peak-Rabatte werden nicht als tatsächliche Rechnung behauptet.

## Vercel-Einstellungen und Reihenfolge für den Orchestrator

1. Native Gate unten ist bestanden. Die vorhandenen acht Migrationen und der Seed sind unverändert. Die beiden CLI-angelegten neuen Dateien wurden bewusst **hinter** diese acht sortiert: `20261006160000_deepseek_provider.sql`, danach `20261006161000_deepseek_demo_cap.sql`. Enum-Erweiterung ist zuerst separat zu committen, dann Funktionen/Budget-Nullbarkeit. CLI-Anlage erzeugte die Dateien, endete aber jeweils im 10s-Zeitlimit; kein erfundener erfolgreicher CLI-Autorisierungslauf. Echter frischer Reset aller zehn Dateien ist bestanden.
2. Nur das eigene Projekt `ttbfpqveexmlqxkzwlmz` prüfen: bisheriger Bestand/Owner/RLS/Migrationshistorie. Additiv die beiden neuen Migrationen übernehmen, kein Reset, Drop, Seed-Replay oder Besitzerwechsel von Supabase-Systemtabellen. Gehostet schreibt ausschließlich der Orchestrator.
3. Anschließend `supabase/demo-deepseek-setup.sql` als enger Operatorweg: aktives DeepSeek-Textmodell, Preisstandschätzung, neue Einstellungsversion nur wenn erforderlich, unbegrenzte Nutzerwahl, ein Setup-Audit. Kein Auth-Konto, kein neues Prompt, kein Override bestehender Gespräche, kein Freigeben unbekannter alter Kosten. Wiederholung ist geprüft; vorhandene Sicherheitssperre bleibt bestehen.
4. Vercel Root bleibt dieses Repository, Build `npm run build`, Ausgabe `dist`; normale Node-Funktionen und Fluid Compute/Cancellation gemäß Konfiguration. Root-Pakete enthalten nur zusätzlich erforderliche `pg`, `@vercel/functions` und `@types/pg`; `api/tsconfig.json` integriert die API-Dateien in strikte Typ-/Lintprüfung, ohne globale Prüfausschlüsse. Backend-devDependencies müssen für den Vercel-Produktweg nicht separat installiert werden.
5. Umgebungsnamen für Production und passende Preview: `DATABASE_URL` geheim; `SUPABASE_URL` oder `VITE_SUPABASE_URL`; `SUPABASE_PUBLISHABLE_KEY` oder `VITE_SUPABASE_PUBLISHABLE_KEY`; **`DEEPSEEK_API_KEY` ausschließlich geheim/serverseitig**. Vorhandene Werte erhalten. Kein `VITE_`-Provider-/Admin-/Datenbankkey. Keine Notwendigkeit für `SUPABASE_DB_PASSWORD`, PAT, Service-Role-Key, `PGSSLROOTCERT` oder `PGSSLMODE` in der Cloud. Letztere bleiben für den lokalen Node-Weg gültig.
6. Ohne `ALLOWED_ORIGINS`: exakt `https://pflege-dashboard-puce.vercel.app` plus die vertrauenswürdige Deployment-Adresse aus Vercels `VERCEL_URL`. Keine Wildcards/Forwarded-Header-Reflektion. Ein bewusst gesetzter Wert ersetzt vollständig, ein leerer Wert sperrt Browser-Origins. Hosts nur die exakt bekannten HTTPS-Adressen. Lokaler Node behält localhost/127.0.0.1 auf 5173/5174.
7. Nach Deployment: health 200 (nur Erreichbarkeit); `/api/session` und `/api/chat-stream` ohne Bearer 401, fremde Origin/Host 403, unbekannte API JSON-404; danach tatsächlicher nutzerseitiger Login, Sitzung/Logout und echter DeepSeek-Stream. Konfigurierte URL/Public-Key müssen dasselbe eigene Supabase-Projekt nennen. Kein Mock-KI-Fallback. Die Providerkonfiguration/Antwort wird niemals aus Browserparametern ausgewählt.

Laut separater Orchestrator-Rückmeldung existiert inzwischen ein bestätigter eigener Nutzer samt Demo-Profil/Mitgliedschaft. Dieser Backendauftrag hat weder das Konto noch die Hosted-Mitgliedschaft angelegt oder Login-Daten verwendet. Kein paralleles Provisionieren durchführen.

## Wiederholbare Zuordnung eines bereits vorhandenen Kontos

Nur falls künftig ausdrücklich benötigt: Operator nimmt die **bereits vorhandene bestätigte Auth-User-UUID** aus dem eigenen Projekt, niemals Passwort/Metadata/Browser-Actor. Im selben Workspace unter einer Transaktionssperre Profil und Mitgliedschaft idempotent ergänzen. Das folgende Muster ist dokumentiert, in diesem Auftrag **nicht Hosted ausgeführt** und ohne Auth-Testkonto kein positiv ausgeführter Konto-Provisionierungstest:

```sql
begin;
do $$
declare
 u uuid := '<UUID eines bereits bestätigten vorhandenen Auth-Nutzers>';
 w constant uuid := '10000000-0000-4000-8000-000000000001';
 a constant uuid := '10000000-0000-4000-8000-000000000002';
 p uuid; made_profile boolean; made_member boolean;
begin
 if current_user <> 'postgres' then raise exception 'OPERATOR_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w::text||u::text,0));
 if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null
   and deleted_at is null and (banned_until is null or banned_until<=now())) then
  raise exception 'EXISTING_CONFIRMED_USER_REQUIRED'; end if;
 if not exists(select 1 from public.profiles where id=a and workspace_id=w and kind='system' and user_id is null) then
  raise exception 'DEMO_WORKSPACE_REQUIRED'; end if;
 insert into public.profiles(workspace_id,created_by,kind,user_id,display_name)
  values(w,a,'user',u,'Demo-Nutzer') on conflict(workspace_id,user_id) do nothing returning id into p;
 made_profile := found;
 if p is null then select id into p from public.profiles where workspace_id=w and user_id=u and kind='user'; end if;
 if p is null then raise exception 'PROFILE_CONFLICT'; end if;
 insert into public.workspace_memberships(workspace_id,created_by,profile_id,role,status)
  values(w,a,p,'member','active') on conflict(workspace_id,profile_id) do nothing;
 made_member := found;
 if not exists(select 1 from public.workspace_memberships where workspace_id=w and profile_id=p and status='active') then
  raise exception 'EXPLICIT_REAUTHORIZATION_REQUIRED'; end if;
 if made_profile or made_member then
  insert into public.audit_log(workspace_id,created_by,action,outcome)
   values(w,a,'demo.membership.provisioned','success'); end if;
end $$;
commit;
```

Kein Adminaufstieg, keine automatische Reaktivierung einer gesperrten Mitgliedschaft, kein Schreiben in `auth.users` oder `auth.sessions`. Fehler rollen alles zurück. Browser darf diesen Operatorweg nicht aufrufen. Das Beispiel enthält absichtlich keine echte User-ID.

## Tatsächlich ausgeführte Prüfung und sichere Wiederholung

Endstand: echter native Supabase-Gesamtlauf **14:13:21–14:13:39 UTC** am 06.10.2026, CLI **2.119.0**, eigener Spiegel `backend/.local/supabase-project`, eigener `SUPABASE_HOME` unter dem macOS-Tempordner `pflege-dashboard-supabase-57aea064-phase0`. Kein eigener PostgreSQL-Ersatz.

| Prüfung | Ergebnis/Beleg |
|---|---|
| Frischer echter Supabase-Start/Reset/Seed | 10 Migrationen; DB/REST/Auth/Storage tatsächlich gesund, REST/Auth/Storage 200; keine Functions |
| SQL/RLS/RPC/Storage/Workspace/Audit/Idempotenz/Kosten | **525** Aussagen bestanden: 501 erhalten + 24 DeepSeek/Budget; keine Auth-Konten |
| Reale Parallelprüfungen | 8 bestehende + 14 Phase-1-Prüfungen bestanden, Fixtures entfernt |
| Enger Node-PG-Weg/Abbruch | **18** bestanden, echter PostgreSQL-Rollenwechsel/Abbruch/Whitelist |
| Reales lokales Node-HTTP gegen native Supabase | **31** bestanden, eigene dynamische Ports, keine Login-Konten/Providerkosten |
| Demo-Operator-Setup | **8** bestanden: wiederholbar, ein Modell/Preis/Setting/Audit, ausdrücklich unbegrenzt, vorhandene Sperre erhalten; Transaktion zurückgerollt, Seedbudget wieder 0 |
| Backend-Unit/Adapter/Cloud/Stream | **121** bestanden: 93 erhalten + 15 DeepSeek + 13 Cloud; Providertransport ausschließlich synthetisch |
| Strict Typecheck + Backendbuild | Bestanden, einschließlich API-Einstiegspunkte |
| Datenbanktypen | Tatsächlich aus der migrierten App-Supabase-DB erzeugt; `deepseek`, nullable Monats-/Gesamtcap enthalten |
| Cloud-Konfiguration gegen eigenes Hosted | **11** bestanden: öffentliche offizielle CA/TLS/enge Rolle, tatsächliches HTTP, tatsächliche Supabase-Auth-Verweigerung ungültiger synthetischer Tokens; ausschließlich read-only/keine Provider |
| Root-Anschluss | Eigener Typecheck/Lint/Build/Bundle/Source grün; Orchestrator meldet vollständiges `npm run check` mit 131 Frontendtests,21 Proxy,14 Prozessprüfungen unabhängig grün |

Sichere Wiederholbefehle (keine Status-/Secretwerte ausgeben):

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard'
npm --prefix backend run check:phase1
npm --prefix backend run typecheck
npm --prefix backend run test
npm --prefix backend run build
node backend/scripts/cloud-hosted-check.mjs
npm run lint
npm run build
npm run check:bundle
```

`check:phase1` hat Gesamt-/Schrittzeitlimits sowie `try/finally`; stoppt und prüft ausschließlich den eigenen Supabase-Stack, auch bei Fehler/Signal. Alle rohen Start-/Statusausgaben bleiben in ignorierten/redigierten `.local`-Logs. Typenerzeugung geschieht darin über tatsächliche Supabase-CLI, nicht durch handgeschriebene Typersatzdateien. `cloud-hosted-check.mjs` liest die autorisierte geschützte eigene `.env` nur für diesen serverseitigen Read-only-Prüfweg, schließt eigenen Pool/HTTP-Port, macht keine Login-/Provideranfrage und zeigt keine Werte. Produkt-Cloudkonfiguration selbst liest keine `.env`.

Belege: `backend/.local/phase1-result.json`, `vitest-result.json`, `demo-setup-result.json`, `node-database.json`, `node-smoke-local.json`, `cloud-hosted-result.json`, `runtime-probe.json`, `runtime-cleanup.json`. Das erste 121/524-Gate wurde nach dem belegten Preisstandbefund gezielt um eine SQL-Regression ergänzt und vollständig als 121/525 wiederholt. Keine unveränderte Extra-Auditrunde.

## Vorher → Nachher und Nachweisgrenzen

Noten bewerten den gelieferten Backend-/Quell-/Prüfstand; sie behaupten keine bereits bestandene öffentliche Vorführung.

| Bereich | Vorher → Nachher | Grund |
|---|---|---|
| Vercel API-Anschluss | 2 → 9,3 | Vorher tatsächlicher 404, jetzt konkrete normale Node-Routen, echte negative HTTP/Auth-Proben, strikte Lintintegration |
| Cloud DB/TLS/Rolle | 4 → 9,5 | Vorher lokale Datei nötig; jetzt serverseitige Cloudwerte, öffentliche CA, TLS/Role tatsächlich Hosted geprüft |
| DeepSeek Text/Serverkontext/SSE | 1 → 9,2 | Echter Adapter mit offiziellen API-Feldern, Usage/Modellfehler/Terminal/Abbruch geprüft; keine Ersatzantwort |
| Kostenwahl/Preisstand/Setup | 5 → 9,4 | Explizit unbegrenzt ohne verstecktes Datum, ehrliche Schätzungskennzeichnung, positive Caps bleiben prüfbar, Setup wiederholbar |
| Erhaltene Sitzung/Rechte/Audit/Cleanup | 9 → 9,5 | 501 Regressionen erhalten, neue Pfade ohne Rollen-/Workspace-/Prozessaufweichung |

Noch offen außerhalb dieses Backendauftrags: tatsächlicher Vercel-Functionbuild/-Deployment und Plattform-Cancellation/Fluid-Pool-Suspension; Hosted-Übernahme der zwei additiven Migrationen/Setup; Secret-Einrichtung; echter angemeldeter DeepSeek-Nutzerchat und Abmeldung in der Oberfläche. Mock-Transport plus negative echte Auth-Proben sind kein positiver Login-/AI-Gate-Pass. Dokumente/Tasks/Notizen durch KI, Bestätigung, RAG/Dateiauswertung und Exporte bleiben Phase 2. Der Server liest nur berechtigte vorhandene Daten und liefert Text; das Modell erhält keine allgemeinen SQL-/Schreibwerkzeuge. Keine Datenschutz-/Hostinggarantie für DeepSeek.

Cleanup: eigener native Stack beendet; `runtime-cleanup.json` zeigt null eigene Prozesse sowie geschlossene Ports **56421/56422/56428**. Lokaler Node-Smoke: eigener Port **57052** und PID **70657** beendet. Cloud/Hosted-Test: eigener Port **56001** und Pool geschlossen. Kein Browser gestartet, keine Konten angelegt, kein Provideraufruf, keine Hosted-Schreiboperation, keine Gitmutation. Fremde Änderungen an Regeln/Tasks/UI/.gitignore blieben erhalten.

## Eigene Dateien

`api/{session,chat-stream,health,not-found}.ts`, `api/tsconfig.json`, `vercel.json`, `.env.example`, notwendige Ergänzungen in `package.json/package-lock.json`;
`backend/runtime/{cloud,config,database,errors,handler,index,provider,supabase-ca}.ts`;
`backend/tests/{cloud,deepseek}.test.ts`, `backend/scripts/{cloud-hosted-check,demo-setup-check,phase1-check,schema-fingerprint}.mjs`, `backend/tsconfig.json`;
`supabase/migrations/20261006160000_deepseek_provider.sql`, `20261006161000_deepseek_demo_cap.sql`, `supabase/demo-deepseek-setup.sql`, `supabase/tests/deepseek_demo.test.sql`;
`types/{database.types.ts,phase1.ts,README.md}`, `docs/api-contract.md`, diese Dokumentation.

Quellen: [DeepSeek Modell/Preisstand](https://api-docs.deepseek.com/quick_start/pricing/), [Chat Completions/SSE/Usage](https://api-docs.deepseek.com/api/create-chat-completion/), [Tokenzählung](https://api-docs.deepseek.com/quick_start/token_usage/), [Vercel Node-Export](https://vercel.com/docs/functions/runtimes/node-js), [Cancellation/waitUntil](https://vercel.com/docs/functions/functions-api-reference), [Pool-Suspension](https://vercel.com/kb/guide/connection-pooling-with-functions), [öffentliche offizielle Supabase-CA](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). Supabase-Changelog aktuell geprüft; keine verwendeten Frameworkadapter betroffen. Kein pauschales Versprechen aktueller externer Preis-/Modellverfügbarkeit aus einem lokalen Test.

## Letzter Upgradeanschluss — 06.10.2026, 14:21 UTC

Der unabhängige Hosted-Upgradeversuch wurde sicher vor Schreiboperationen abgebrochen: `applied:[]`, kein Seed. Ursache war ausschließlich der historische Phase-0-Vergleich: Er blendete die später hinzugefügte `total_cap_microusd`-Spalte aus, behielt aber deren neue CHECK-Regel. Dadurch wurde das korrekte alte Acht-Migrationsschema fälschlich als Drift gewertet.

Nacharbeit in `backend/scripts/schema-fingerprint.mjs`: Ausschließlich beim historischen Vergleich wird exakt `workspace_budgets` / `CHECK (total_cap_microusd >= 0)` ausgeklammert. Kein Tabellen-/Constraint-Gesamtausschluss. Der volle Phase-1-Vergleich bleibt vollständig und enthält dieselbe Regel weiterhin. Andere CHECK-Definitionen und fehlende ursprüngliche Regeln bleiben echte Fehler.

**Echter Regressionstest:** `backend/scripts/upgrade-check.mjs` startet mit genau acht frisch angewendeten historischen Migrationen, übernimmt beide additiven Migrationen in derselben eigenen echten Supabase-DB und prüft zwölf Aussagen. Alt-/Neu-Phase-0-Vergleich gleich; voller Vergleich tatsächlich geändert und exakt gleich zur vorher frisch geprüften Zehn-Migrationsbasis; bestehende Daten/Seedbudget erhalten. Negative Kontrollen verändern die neue CHECK-Regel sowie entfernen die ursprüngliche monatliche CHECK-Regel: beide werden weiterhin erkannt. Teständerungen werden zurückgerollt. Am Ende zehn tatsächliche Journalzeilen.

Sicherer Wiederholbefehl:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard'
npm --prefix backend run check:phase1 -- --upgrade
```

`supabase-safe.mjs --phase1-base` berücksichtigt nur den eigenen isolierten Prüfspiegel für `start/reset`, verändert niemals die zehn echten Quelldateien. Der Upgrade-Modus ist in den vorhandenen begrenzten `try/finally`-Gesamtlauf integriert. Dieser tatsächliche Endlauf **14:21:11–14:21:27 UTC** bestand einschließlich aller **525 SQL**, **121 Unit**, acht Demo-Setup-, 18 PG-/31 HTTP- und 22 Parallelprüfungen, echter Typenerzeugung, vollständiger Schema-Baseline sowie Cleanup. Baseline-Hash und Gatebeleg wurden regulär durch diesen echten Lauf neu erzeugt, keine Belegdatei von Hand grün geschrieben.

Beleg: `backend/.local/upgrade-result.json`, ergänzend aktuelles `phase1-result.json` und `runtime-cleanup.json`. Null eigene Supabase-Prozesse; Ports 56421/56422/56428 geschlossen. Abschließender eigener Node-Port **59897**, PID **9621**, geschlossen. Keine Hosted-Schreiboperation. Nur der Orchestrator wiederholt jetzt die Hosted-Übernahme.

Zusätzliche eigene Dateien: `backend/scripts/upgrade-check.mjs`, gezielte Ergänzungen in `supabase-safe.mjs` und `phase1-check.mjs`. Upgradevergleich **4 → 9,6/10**: Fehlalarm behoben, vollständige neue Schema-/Drifterkennung durch reale positive und negative Kontrollen erhalten. Keine weitere Produktänderung, Migration oder neue Prüfrunde.
