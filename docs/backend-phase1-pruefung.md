# Backend Phase 1 — Abschlussprüfung vom 06.10.2026

**Backend-Grundlage implementiert und eigenständig geprüft. Der echte angemeldete Phase-1-Nutzertest ist noch offen.** Vertrag **v1.0**, ursprünglicher Ausgangsmeilenstein **689e735**. Kein Stage/Commit/Push durch diesen Backend-Chat.

Lokaler letzter Komplettlauf: **2026-10-06T11:23:08.462Z bis 2026-10-06T11:23:21.933Z (UTC)**. Alle 14 Prüfschritte erfolgreich, einschließlich Stop und Nachprüfung. Supabase CLI **2.119.0**, Node **25.9.0**, Deno-Prüfbinary **2.9.6**, TypeScript **7.0.2**, Vitest **5.0.3**. Keine künstliche Versionssperre. npm meldete die deklarierte Vitest-Enginegrenze für Node 25; der tatsächliche Prüflauf mit diesem Node bestand. Andere Node-/Deno-Versionen sind nicht hier geprüft.

## Lieferung und verbindlicher Anschluss

- **25 Tabellen**, alle mit RLS und Workspace/Akteur. Sechs Migrationen frisch auf echter eigener Supabase-DB angewendet; fiktiver Seed, kein Auth-Konto.
- Vier vorhandene Browser-RPCs erhalten. **create_conversation** ist idempotent und auditierend; **assign_conversation_recipient** prüft Workspace und Revision, erlaubt explizites Entfernen der Zuordnung. Keine direkten Browser-Schreibrechte.
- Echte Supabase Edge Functions **session** und **chat-stream**. Supabase-Userprüfung, Subject/Audience/Issuer/Expiry, echte Auth-Session, Mitgliedschaft, serverseitige 15m-Aktivität und 8h-Timebox. Free-Auth garantiert diese Grenzen nicht; direkte Tabellen-/Metadaten-RPCs können bis JWT-exp weitergehen. JWT konfiguriert 300s. Kein Remember-Me-Default durch Backend vorausgesetzt.
- Serverseitiger Kontext: autorisierte Pflegeperson/Kasse, Aufgaben, Dokument-/Notiztexte und Textverlauf. Unveränderlicher Request-/Modell-/Promptstand, tatsächliche Provider-Modell-ID separat. Browser hat keinen Zugriff auf den privaten Kontext-/Preis-/Sessionbestand.
- Tatsächlicher **OpenAI Responses HTTP/SSE-Adapter**, ohne Provider-SDK und ohne Tools in beiden Modi. store=false, begrenzte Ausgabe, vorherige Kostenreservierung und Input-Tokenprüfung. Kein Mockmodus im Produkt. Fehlende Konfiguration wird konkret verweigert. Preise/Modelle im Seed bleiben ungeprüft/deaktiviert; Budget bleibt **0**.
- Atomare Nutzer-/Parallelgrenzen und Monatsreservierung; Abschluss mit Usage und Audit in einer Transaktion. Unbekannte Kosten bleiben gehalten. Replay erzeugt weder zweite Ausgabe noch zweite Rechnung. Abbruch/Timeout speichert Teilantwort; aktive Zwischenstände höchstens alle zwei Sekunden. Verwaiste Requests werden beim nächsten berechtigten Start konservativ abgeschlossen, ohne Budget freizugeben.

Frontend: **/Users/kentoky/Documents/React Projects/pflege-dashboard/types/rpc.ts → BackendDatabase** (sechs Browser-RPCs; originale CLI-Metadaten erhalten), **/Users/kentoky/Documents/React Projects/pflege-dashboard/types/phase1.ts → SessionRequest/Result, ChatRequestV1, ChatEventV1**. Chat über POST /functions/v1/chat-stream mit JWT und öffentlichem Projektkey, attachmentIds leer. Sitzung über POST /functions/v1/session mit workspaceId/action touch oder end. Reihenfolge: echter Login → berechtigt sichtbaren Workspace bestimmen → Session touch → Gespräch/RPC → Stream. Logout: Stream abbrechen, Session end, auth.signOut(scope local), Caches/Benutzerzustand löschen. Keine Hintergrundaktivität als Benutzerinteraktion werten. Genauer Vertrag: **/Users/kentoky/Documents/React Projects/pflege-dashboard/docs/api-contract.md**.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis und echte Nachweisgrenze |
| --- | --- |
| Frischer nativer Supabase-Reset | **PASS**, alle sechs Migrationen und fiktiver Seed; kein PostgreSQL-Ersatz |
| Supabase-Dienste | **database/rest/auth/storage/functions** nach echten Aufrufen healthy; Auth/Storage/REST HTTP 200, eigene Chat-Function HTTP 401 AUTH_REQUIRED |
| SQL/RLS/RPC/Audit/Session/Kosten | **434/434 PASS**, zwei pgTAP-Dateien: 295 Phase-0-Regressionen + 139 Phase-1-Prüfungen |
| Echte PostgreSQL-Parallelfälle | **22/22 PASS**: tatsächlich beobachtete Sperren, ein Gewinner/ein Revisions- oder Budgetkonflikt, idempotente Erstellung/ein Audit, gehaltene unbekannte Kosten; Fixtures entfernt |
| Echte Supabase Edge HTTP | **26/26 PASS**: zwei wirkliche Functions, fehlende/ungültige Anmeldung 401, erlaubte Herkunft exakt, fremde Herkunft 403. Kein erfolgreicher Login-/KI-Stream |
| Vitest | **47/47 PASS**: 39 Auth-/HTTP-/SSE-/Provider-Mockfälle und 8 Geheimnisredaktionsfälle. Keine externen Providerkontakte |
| TypeScript strict | **PASS**, Backend-/Frontend-Vertrag inklusive Nullbarkeit, Reset, verbotener Phase-2-RPC und originaler SetofOptions |
| Deno check | **PASS**, beide tatsächlichen Edge-Einstiegspunkte samt gemeinsamen Modulen |
| Datenbanktypen | **Tatsächlich durch Supabase CLI aus der App-DB erzeugt**, kein manuell abgeleiteter Ersatz |
| Eigener Hosted-DB-Anschluss | **PASS**, offizielles CA-verifiziertes TLS, verschlüsselt/authorized, Zertifikatsprüfung aktiv |
| Hosted-App-Schema | **PASS**, alle 25 Tabellen, Policies, Constraints, eigene Functions/Trigger und Funktionsrechte entsprechen dem lokalen geprüften Stand; sechs Migrationen im normalen Supabase-Journal, ein Demo-Workspace |
| Hosted HTTP ohne Login | Tatsächlich **401** für Workspace-Lesen; beide noch nicht deployed Edge-Endpunkte tatsächlich **404** |

SQL-Fälle prüfen erlaubte und verbotene CRUD-Zugriffe, anon, fremde Workspaces/Personen/Modelle, Mitgliedschaft und Self-Escalation, private Storage-Ownership, Auditrollback, Idempotenz, Revision, Sitzung ab exakt 15m/Timebox/Revokation, workspaceübergreifende Nutzergrenzen, unbekannte/abweichende Preise/Usage, Monatszuordnung und harte Budgetparallelität. Positive Session-Geschäftslogik verwendet **nur synthetische App-Sitzungszeilen als postgres**. Die service-only Produktionswrapper verweigern die nicht vorhandene reale auth.sessions-Zeile. **Diese Tests sind ausdrücklich kein Nachweis eines echten Auth-Kontos oder angemeldeten Nutzers.** auth.users und auth.sessions bleiben lokal leer; Hosted auth.users ebenfalls 0.

Mock-Providerprüfungen testen tatsächliche Handler-/Adapterlogik mit künstlichen fetch-Antworten: Split-UTF-8/CRLF-SSE, geordnete Ereignisse, Provider-/DB-Fehler, Abbruch, Serverzeitlimit, Replay ohne Provideraufruf, keine Tools, Tokenbound/Outputlimit und unverifizierte Modell-ID. Kein Mock-KI-Fallback oder Provider-Testschlüssel in Produktkonfiguration.

## Eigene Nacharbeit und Bewertung

Die Vorhernoten bewerten den angetretenen Phase-1-Zustand; sie werten den guten Phase-0-Schemaabschluss nicht ab. Nachhernoten gelten für die belegte Backend-Implementierung, **nicht** für noch nicht ausgeführte Nutzer-/KI-/UI-Abnahme.

| Backendablauf | Vorher → Nachher | Selbst behobene Punkte |
| --- | --- | --- |
| Gespräch erstellen/Person zuordnen | 6,5 → **9,4/10** | Zuvor geplant; jetzt atomare RPCs, Payloadhash, Revision, Workspacegrenze und Auditrollback |
| Session/JWT/Logout | 6,0 → **9,2/10** | Live-Sessionbindung, globale Aktivität/Revokation, keine Wiederbelebung, Issuerprüfung, klare Free-/JWT-Restgrenze |
| Stream/Fehler/Replay/Abbruch | 4,0 → **9,2/10** | Tatsächliche Edge-Einstiegspunkte, geordnetes SSE, geteilte Parserlogik, konservativer Retry, aktive Checkpoints und Timeout |
| Nutzergrenzen/Kosten/Audit | 5,0 → **9,5/10** | Datenbanksperren statt Edge-Memory, Monatsbuchung, held statt blind freigeben, identischer Request einmal, atomarer Audit |
| RLS/Storage/geschützte Felder | 9,2 → **9,5/10** | Rechte aller neuen Register/Wrapper geprüft, private Helper-ACL präzisiert, Herkunftssnapshots geschützt; Storage-Besitz unverändert |
| Typen/Setup/Hosted-Anschluss | 7,0 → **9,3/10** | Reale Typgenerierung und CLI-Metadaten, lokale/Hosted-Ziele klar, TLS verifiziert, additive Übernahme/Strukturvergleich |
| Prüfung/Aufräumen | 8,5 → **9,5/10** | Ein begrenzter Node-Ablauf mit finally, CLI-Prozessgruppe nur eigen, Abbrucheskalation, Ressourcen- und Fixtureprüfung |

Wirklich behobene Prüffunde: Ein erster Gesamtvergleich zählte die Supabase-eigene rls_auto_enable-Funktion als App-Abweichung; sie blieb erhalten, verglichen werden ausschließlich unsere Functions samt Rechten. Die native Gateway-Voranfrage OPTIONS nutzt '*'; geschützte POSTs wurden zusätzlich tatsächlich auf genaue Herkunft/Ablehnung geprüft. Der anfangs fehlgeschlagene Lauf wurde gestoppt/aufgeräumt, bevor nachgebessert wurde. Eine nach Codeformatierung versetzte Typecheck-Fehlermarkierung wurde korrigiert; der endgültige Strict-Lauf ist grün. Keine fehlgeschlagenen Zwischenläufe als bestanden ausgegeben.

## Hosted-Übernahme und offene Gates

Nur das vom Nutzer autorisierte neue Projekt **ttbfpqveexmlqxkzwlmz**. Beim ersten wirklichen Bestandscheck **0 App-Tabellen**, 0 Auth-Nutzer. Vier Kernmigrationen und Seed wurden erstmals additiv übernommen, anschließend Checkpoint-/ACL-Migration. Abschließender Bestandsvergleich: **structureMatchesLocal=true**, 25 App-Tabellen, alle RLS, ein fiktiver Workspace, 0 Auth-Nutzer. Keine Wiederholung des Seeds bei bestehendem Bestand, kein Reset/Drop von Nutzerdaten. Supabase-eigene Storage-Tabellen bleiben beim Owner **supabase_storage_admin**, vorhandenes RLS wird geprüft; ausschließlich unsere privaten Bucket-/Objektpolicies sind ergänzt. Supabase-eigene Hilfsfunktion erhalten. Eigene Hosted-Verbindungen werden im finally geschlossen; keine globale Supabase-Konfiguration verwendet.

**Echte Grenze:** In diesem Backend-Scope ist kein Supabase-Management-/Deploywerkzeug callable, und die eigene geschützte Env-Datei enthält weder SUPABASE_ACCESS_TOKEN noch Server-/Providerkey. Deploymenthilfe der tatsächlichen CLI ist geprüft (--use-api und --project-ref vorhanden), aber kein Login/Link/Deploy ausgeführt. Hosted-HTTP liefert für session/chat-stream 404. Die echte lokale Supabase-Edge-Laufzeit ersetzt diesen fehlenden Hosted-Nachweis nicht.

Nutzer muss vorhandenes Auth-Konto selbst anlegen und vertrauenswürdige Mitgliedschaft setzen, Management-Autorisierung/Edge-Secrets bereitstellen, reales Modell und obere Preisversion prüfen und ein Budget bewusst freigeben. Keine Konten, Zugangsdaten oder Provideranlage durch diesen Agenten. Kein echtes Modell aufgerufen; Nullbudget nie erhöht. Danach erst echtes Login → Gespräch → Antwortenstream in beiden Themes. **Phase-1-Nutzergate noch offen**. Phase 2 (Tools/Bestätigung/RAG/Uploads/Exports/Übergabe und Nutzerchat → Bestätigung → Dokument) bleibt ausdrücklich geplant, nicht als funktionierend ausgeliefert. Keine Datenschutz-/EU-Verarbeitungsgarantie.

## Sichere Wiederholbefehle

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
mkdir -p .local
npm ci --no-audit --no-fund > .local/npm-ci.log 2>&1
npm run check:phase1
npm run hosted:inspect
```

Der vollständige lokale Lauf startet/resettet ausschließlich den eigenen Prüfstapel und stoppt ihn anschließend. Aktuelle lokale Typgenerierung darin: supabase gen types --local --lang typescript --schema public, im eigenen Spiegel und SUPABASE_HOME. **Keine rohe status-Ausgabe drucken.** Falls additive Hosted-Wiederholung nötig: npm run hosted:apply nach erfolgreichem aktuellem lokalen Gate. Bereits vorhandene Migrationen/Seed werden erhalten. Manuelle Konto-/Mitgliedschafts-/Secrets-/Deploy-Anschlussangaben stehen in **/Users/kentoky/Documents/React Projects/pflege-dashboard/docs/backend-setup.md**; nicht ausgeführte Schritte sind dort als solche gekennzeichnet.

## Ressourcenbereinigung und sichere Belege

- Eigener SUPABASE_HOME: **/var/folders/9v/89xd0tws1kl0j78fbm8_xjjw0000gn/T/pflege-dashboard-supabase-57aea064-phase0**. Ausführungsspiegel **/Users/kentoky/Documents/React Projects/pflege-dashboard/backend/.local/supabase-project**.
- Supabase nach jedem vollständigen Prüflauf im finally gestoppt; auch der fehlgeschlagene CORS-Lauf hat Cleanup ausgeführt.
- Letzter Nachweis: **0 eigene Prozesse**, Ports **56421 geschlossen, 56422 geschlossen, 56428 geschlossen**. Fünf Dienste gestoppt/unavailable. SQL-Parallelfixtures entfernt, pgTAP-Fixtures vollständig zurückgerollt.
- Kein Browser gestartet, kein UI-/Root-Env-/Root-Paket-/Hostingdoku-/Taskdatei-Eingriff. Keine zusätzlichen Chats. Fremde Stacks/Projekte/Dateien unverändert. Eigene gestoppte Supabase-Caches und ignorierte Belege bleiben für reproduzierbare nächste Prüfung erhalten.
- Ignorierte sichere Belege: backend/.local/phase1-result.json, runtime-probe.json, runtime-cleanup.json, phase1-concurrency.json, concurrency-result.json, edge-smoke.json, vitest-result.json, schema-baseline.json, hosted-inspect.json/hosted-apply.json und hosted-history.jsonl. CLI-Ausgaben ausschließlich redigiert. Kein Secret-to-chat-/Log-/Git-Weg. Root .env wurde nur für den ausdrücklich autorisierten eigenen Hosted-Anschluss im Speicher gelesen; env.md und fremde Env-Dateien nie gelesen.

## Eigene geänderte/neue Dateien (absolute Pfade)

- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/package-lock.json
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/package.json
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/edge-smoke.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/hosted-schema.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/local-db.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/phase1-check.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/phase1-concurrency.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/runtime-cleanup.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/runtime-probe.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/schema-baseline.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/schema-fingerprint.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/scripts/supabase-safe.mjs
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/tests/contracts.typecheck.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/tests/edge.test.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/backend/tsconfig.json
- /Users/kentoky/Documents/React Projects/pflege-dashboard/docs/api-contract.md
- /Users/kentoky/Documents/React Projects/pflege-dashboard/docs/backend-phase1-pruefung.md
- /Users/kentoky/Documents/React Projects/pflege-dashboard/docs/backend-setup.md
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/config.toml
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/functions/_shared/errors.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/functions/_shared/handler.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/functions/_shared/platform.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/functions/_shared/provider.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/functions/chat-stream/index.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/functions/deno.json
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/functions/session/index.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/migrations/20261006130000_phase1_schema_rpc.sql
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/migrations/20261006131000_phase1_chat.sql
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/migrations/20261006132000_phase1_checkpoints.sql
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/migrations/20261006133000_phase1_security.sql
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/tests/phase0_rls.test.sql
- /Users/kentoky/Documents/React Projects/pflege-dashboard/supabase/tests/phase1.test.sql
- /Users/kentoky/Documents/React Projects/pflege-dashboard/types/README.md
- /Users/kentoky/Documents/React Projects/pflege-dashboard/types/api.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/types/database.types.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/types/phase1.ts
- /Users/kentoky/Documents/React Projects/pflege-dashboard/types/rpc.ts

Die beiden ursprünglichen Schema-/Storage-Migrationen und der fiktive Seed wurden erneut ausgeführt, inhaltlich erhalten. Kein Commit/Staging/Push. Backend stoppt am Phase-1-Gate und wartet auf Anschluss des Orchestrators.
