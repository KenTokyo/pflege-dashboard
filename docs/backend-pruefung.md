# Backend – Phase-0-Lieferung und echte Prüfung

Stand 06.10.2026. Fortsetzung im ursprünglichen Backend-Unterchat. Ausschließlich eigenes lokales Supabase; keine Ersatzdatenbank und kein Hosted-Zugriff. Die frühere fehlgeschlagene Migration war keine Abnahme. Der begrenzte damalige Verfügbarkeitsbericht bleibt als Verlauf erhalten; **dieser Bericht beschreibt den fertig nachgearbeiteten App-Stand**.

## Ergebnis und Dateien

21 workspacegebundene Anwendungstabellen, 18 Enums, durchgehende RLS, private Storage-Policies, vier gezielte auditierende RPCs, versionierte Prompts/Einstellungen, fiktive Familie und null Auth-Konten. Browser-DML auf Anwendungstabellen ist gesperrt; erlaubte Metadatenänderungen gehen über die vier RPCs. Spätere Chat-/Bestätigungs-/Provider-/Kostenfunktionen bleiben geplant.

Dateieigentum, ausschließlich unter `/Users/kentoky/Documents/React Projects/pflege-dashboard/`:

| Pfad | Lieferung |
| --- | --- |
| `supabase/config.toml` | Eigenes Projekt `pflege-dashboard-phase0`, Ports, private Storagegröße, Signup aus, JWT 300s, Session 15m/8h, echte experimentelle native Laufzeit aktiviert |
| `supabase/migrations/20261006090000_schema.sql` | Vollständiges ursprüngliches Datenmodell, zusammengesetzte Workspace-/Akteur-FKs, RLS/Grants, Schutz für Audit/Verbrauch/Versionshistorie |
| `supabase/migrations/20261006091000_rpc_storage.sql` | Vier RPCs mit Revisionen, Audit und Adminprüfung; private Storage-Regeln, vorhandenes Supabase-RLS prüfen |
| `supabase/seed.sql` | Ausschließlich fiktive Familie Beispielwald, fiktive Kasse, Aufgaben, Entwurf; Modelle deaktiviert, Budget null, keine Auth-Konten/Dateiuploads |
| `supabase/tests/phase0_rls.test.sql` | 295 pgTAP-Assertions, vollständig zurückgerollte SQL-Fixtures |
| `types/database.types.ts` | Echte CLI-generierte Datenbanktypen, keine vorläufige Schemaabschrift |
| `types/api.ts`, `types/rpc.ts`, `types/README.md` | Geplante API/SSE-Formate und präzise Null-/Reset-Eingaben für vorhandene RPCs; Herkunft erklärt |
| `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json` | Eigenständige Backend-Werkzeuge, feste Abhängigkeiten, strikte Typprüfung |
| `backend/scripts/supabase-safe.mjs`, `redact.mjs` | Eigener Ausführungsspiegel, eigene Laufzeit, keine root Env-Datei, redigierte Logs |
| `backend/scripts/phase0-check.mjs`, `runtime-probe.mjs`, `runtime-cleanup.mjs` | Begrenzter vollständiger Prüflauf, echte Lazy-Dienstaufrufe und Stop/Prüfung im `finally` |
| `backend/scripts/concurrency.mjs` | Zwei echte gleichzeitige SQL-Transaktionen gegen dieselbe App-Supabase-DB, ohne Auth-Konten |
| `backend/tests/redact.test.mjs`, `contracts.typecheck.ts` | 8 Vitest-Tests für Geheimnisschutz; positive/negative Typbeispiele |
| `docs/api-contract.md` | Vertrag v0.2, implementierte und geplante Grenzen, getrennte künftige Schreibwege, Sitzungswerte, Fehler und Ownership |
| `docs/backend-setup.md`, `docs/backend-pruefung.md` | Tatsächlich ausführbare lokale Wiederholung, Anschlussangaben, Ergebnisse und Grenzen |

`docs/backend-runtime-pruefung.md` ist der gesicherte frühere Verfügbarkeitsbericht. Er wird nicht als aktuelles Schema-Gate benutzt. Keine UI-, Hosting-, root Env-, Task- oder Orchestrator-Dateien verändert. Kein Stage/Commit/Push; keine weiteren Agenten oder Browser.

## Fachgerechte Nacharbeit

Die Storage-Migration versucht kein `ALTER TABLE storage.objects` und keine Besitzeränderung mehr. Supabase besitzt seine Systemtabellen weiterhin als `supabase_storage_admin`. Migration und SQL-Test prüfen das bereits vorhandene RLS; eigene Policies werden über den von Supabase erlaubten Weg angelegt. Beim Hochladen muss der Uploader sein eigenes `pending`-Objekt auch per SELECT sehen dürfen, weil Storage `INSERT RETURNING` verwendet. Andere Workspace-Mitglieder erhalten daraus keinen Zugriff auf Pending-/Owner-Dateien. Rejected-Objekte bleiben verborgen. Überschreiben bekommt keine Policy; direktes SQL-Löschen verhindert Supabase zusätzlich selbst.

Zusätzliche Datenintegrität: Anhänge und Auditereignisse mit Nachrichten müssen zum **gleichen Chat** gehören; Verbrauch ist an Modell, Request, Monat und Workspace seiner Reservierung gebunden. Das implementiert noch keine Kosten-Engine, verhindert aber widersprüchliche Verbrauchsbezüge.

Vertrag: `p_reset_to_default` ist nun vollständig enthalten. Bei Reset zeigen die Einstellungen auf den gespeicherten Defaultprompt; alte Versionen bleiben erhalten. Mode und Standardmodell sind explizite Eingaben, kein stiller Reset anderer Wünsche. Neue Gespräche und Personenzuordnung haben getrennte verbindliche **PLANNED Phase-1-RPCs**, mit Rechteprüfung, Idempotenz bzw. Revision, Audit und Workspacegrenze. Diese Funktionen werden nicht als bereits vorhanden ausgegeben. Tatsächlich konfigurierte lokale Sessionwerte 15 Minuten Inaktivität, 8 Stunden Timebox und 300 Sekunden JWT sind sichtbar; Interaktionslogout bleibt Phase 1.

## Tatsächlich ausgeführte Prüfungen

Vollständiger Ablauf: `node scripts/phase0-check.mjs` im Ordner `backend/`. Der abschließende Lauf verwendet **keinen `--runtime-only`-Bypass**. Er führt `start` und danach einen frischen `db reset --local --yes` aus: beide App-Migrationen und der fiktive Seed werden wirklich angewendet.

Letzter vollständig bestandener Lauf: **06.10.2026, 12:04:48–12:04:59 MESZ** (`10:04:48–10:04:59 UTC`). Alle 10 Prüfschritte bestanden; exakte Zeitstempel in der ignorierten `phase0-result.json`. Die anschließend ergänzte Ergebnisdokumentation verändert weder Schema noch Prüflogik.

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| Supabase CLI | 2.119.0; echte Hilfefähigkeit `stack` und `--runtime native` nachgewiesen |
| Start / frischer App-Reset | Beide Migrationen + Seed erfolgreich, CLI Exit 0 |
| Lazy-Dienste real ansprechen | Auth `/auth/v1/health`, Storage `/storage/v1/status`, REST `/rest/v1/`: jeweils HTTP 200; danach DB/REST/Auth/Storage alle `running/healthy`, `native/ready` |
| `supabase test db --local` | **1 Datei, 295 Assertions, 295 bestanden, `Result: PASS`** |
| Echte parallele RPCs | **8 Assertions bestanden**: zwei Verbindungen, nachgewiesenes Warten auf Zeilensperre, ein Erfolg, ein `40001`-Konflikt, genau ein Auditereignis, Fixturereste entfernt, null Auth-Konten |
| `supabase gen types --local --lang typescript --schema public` | Aus echter App-DB erfolgreich; `types/database.types.ts` erzeugt |
| `tsc --noEmit` | Strikt bestanden, einschließlich CLI-Typen, RPC-Nullbarkeit und negativer Typbeispiele |
| Vitest | **1 Datei, 8 Tests bestanden**; JWTs, Supabase-/Providerkeys, Datenbankpasswort und opaque gelabelte Werte werden aus Logs entfernt; normale Testergebnisse bleiben lesbar |
| Stop + Bereinigung | Exit 0, 0 eigene Prozesse, Ports 56421/56422 geschlossen |

Die SQL-Suite prüft jede der 21 Tabellen: anon SELECT/INSERT/UPDATE/DELETE verboten; authenticated Browser-DML verboten; fremde Workspace-Zeilen nicht sichtbar. Echte erlaubte RPC-Schreibvorgänge werden danach gelesen und ihr Audit geprüft. Weitere Fälle: gemeinsames System-Seed-Dokument sichtbar, Mitgliedschaftseinschleusen/Selbstbeförderung verboten, fremde Modelle/Promptversionen/Personen/Chats/Versionen per FK verboten, private Storagepfade und Uploaderrechte, Owner-Dateien selbst vor Admin verborgen, Widerruf einer Mitgliedschaft sofort wirksam, Admin-/Mitgliedgrenze für Kosten/Audit, unveränderliche Historie gegenüber service_role, veraltete Revisionen und erzwungener Auditfehler mit vollständigem Rollback.

Der erste Testlauf brach an einer realen Storage-Systemregel ab; er wurde nicht als PASS gewertet. Ein erster Paralleltest verwendete eine Endpointbeschreibung ohne Datenbankzugangsdaten; der sichere Zugriff verwendet jetzt ausschließlich die CLI-Connectiondetails dieses eigenen Stacks im Speicher. Vitest benötigte seine deklarierte Vite-Peer-Abhängigkeit; sie liegt jetzt ausdrücklich im Backend-Lockfile. Alle Funde wurden vor Lieferung behoben.

## Sichere Belege und Bereinigung

Eigener Ausführungsspiegel: `/Users/kentoky/Documents/React Projects/pflege-dashboard/backend/.local/supabase-project`. Nur eigene Config/SQL/Testdateien werden kopiert; keine `.env`, keine `env.md`, keine fremden Projektdateien. Prozessumgebung für Supabase wird gezielt aus PATH/HOME/TMPDIR/LANG und eigenen Laufzeitvariablen aufgebaut. Keine Provider-/Hosted-Tokens.

Eigener SUPABASE_HOME:

`/var/folders/9v/89xd0tws1kl0j78fbm8_xjjw0000gn/T/pflege-dashboard-supabase-57aea064-phase0`

Stack darunter: `stacks/77a1ed47ad6740996600e5b4b3c1a7ab262691f86fd61daacb1135a3442805d3`. Diese Laufzeit wird von der echten Supabase CLI verwaltet; kein selbst gestarteter Ersatz-Postgres. Der erste verworfene Laufzeitordner mit Leerzeichen lag unter `backend/.local/supabase-home`; die Prozessprüfung berücksichtigt beide eigenen Pfade.

Ignorierte lokale Ergebnisdateien:

- `backend/.local/phase0-result.json`: Ergebnis je tatsächlich ausgeführtem Schritt, SQL-/Unit-Testzahl, Paralleltest.
- `backend/.local/runtime-probe.json`: echte HTTP-/Dienstbereitschaft.
- `backend/.local/concurrency-result.json`: 8 echte Parallel-/Aufräumassertions.
- `backend/.local/vitest-result.json`: tatsächliches Vitest-Ergebnis.
- `backend/.local/runtime-cleanup.json`: 0 eigene Prozesse und geschlossene eigene Ports.
- `backend/.local/supabase-reset.log`, `supabase-test.log`, `supabase-types.log`: vor dem Schreiben redigierte CLI-Ausgaben; niemals vollständigen Supabase-Status ausgeben.

Jeder komplette Prüflauf schließt den eigenen Stack auch bei Fehler, Abbruch oder Zeitlimit im `finally` und prüft anschließend eigene Prozesse/Ports. Gesamtgrenze 15 Minuten, einzelne HTTP-Aufrufe 15 Sekunden, SQL-Verbindungen/Statements begrenzt. Kein `stop --all`, kein fremder SUPABASE_HOME. Gestoppte eigene Daten und Downloadcaches bleiben für eine gezielte Wiederholung bestehen. Am Ende dieser Lieferung läuft keine eigene Datenbank, Dienstschleife, Testverbindung oder Browser.

## Eigene Bewertung – nur innerhalb der belegten Phase-0-Grenze

| Backendbereich | Vor Nacharbeit | Danach | Begründung |
| --- | --- | --- | --- |
| App-Migration/Seed | 4/10 | 9/10 | Vorher echter Storagefehler; jetzt frischer App-Reset und fiktiver Seed |
| RLS/Workspace/Ownership | 5/10 | 9,5/10 | Vorher ungeprüft; jetzt vollständige Allow-/Deny-Matrix und zusammengesetzte Beziehungen |
| Private Storage | 4/10 | 9/10 | Besitzer/RLS korrekt erhalten; SQL-Policies geprüft, Dienst real erreichbar; Auth-Uploadflow bleibt später |
| RPC/Audit/Revisionen | 6/10 | 9,5/10 | Erlaubte Änderungen, verbotene Adminaktionen, atomarer Rollback und echter Parallelkonflikt |
| Typen/Anschlussvertrag | 6/10 | 9/10 | Echte CLI-Typen, präzise Null-/Reset-Formen, geplante Schreibwege klar getrennt |
| Werkzeuge/Geheimnisschutz/Aufräumen | 7/10 | 9/10 | Begrenzter Node-Lauf mit `finally`, 8 Geheimnisschutztests, nachgewiesener Stop |

Das sind Selbstbewertungen, keine Rechts-/Datenschutzfreigabe und kein NoteTree-/Hosted-Nachweis.

## Ehrlich offene spätere Gates

- Kein angemeldeter Nutzertest: kein Auth-Konto angelegt. Signup-/Sessionkonfiguration ist vorbereitet; echter Login, Logout und Interaktionsinaktivität müssen nach Designwahl geprüft werden.
- Keine App-Oberfläche. Die beiden neuen Metadaten-RPCs sind Phase 1 geplant; der Vertrag ist verbindlich, die Funktionen noch nicht implementiert.
- Kein HTTP-Upload mit Nutzerkonto, keine Parser-/Malware-/EXIF-Prüfung, keine signierte Dateilesung oder echte Storage-API-Löschung. SQL-Policies + reale Dienstbereitschaft ersetzen diesen Phase-2-Flow nicht.
- Keine Chat-Engine, Provideradapter, Modellaufrufe, Streaming-/Bestätigungs-/Budgetengine oder AI-Smoke. Paralleltest belegt vorhandene Metadaten-RPCs, nicht spätere Vorschlagsbestätigung.
- Kein PDF/DOCX-Export, menschlicher Übergabeflow, RAG/pgvector oder Admin-UI. Schema/Vertrag bereiten sie vor.
- Kein Hosted-Reset, Deployment oder Hostingversprechen. Providerregion/Preise bleiben unverified/planned, Demoausgaben null.
- Vor echten Pflegedaten: AVV/DPA aller beteiligten Dienste, tatsächliche Providerverarbeitung/Training/Region, DSFA, persönliche Logins statt Demo-Sammellogin, Lösch- und Zugriffsprotokollkonzept sowie rechtliche Prüfung. Ein EU-Supabase-Projekt allein erfüllt diese Punkte nicht.

Phase 0 ist damit auf Backendseite geliefert. Ohne Designwahl keine Phase 1. Orchestrator erhält Vertrag und Anschlussangaben; keine weitere Implementierung durch ihn nötig.

Primärdokumentation: [Supabase-Systemschemas: Policies erlaubt, Schemaumbau eingeschränkt](https://github.com/orgs/supabase/discussions/34270), [Storage INSERT RETURNING und SELECT](https://supabase.com/docs/guides/troubleshooting/storage-error-403-forbidden-new-row-violates-row-level-security-policy-on-upload-a94384), [RLS und Grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [native Supabase-Laufzeit](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes).
