# Echter Supabase-Verfügbarkeitsnachweis – 06.10.2026

**Historischer, gesicherter Verfügbarkeitslauf.** Die anschließend beauftragte vollständige Phase-0-Nacharbeit samt behobener App-Migration, 295 SQL-Assertions, echten Paralleltests und generierten Typen steht im aktuellen [Backend-Prüfbericht](backend-pruefung.md). Die offenen Punkte dieses alten Laufs sind keine Aussage über den späteren Lieferstand.

Auftrag in diesem Lauf: ausschließlich echte Supabase-Verfügbarkeit prüfen. Keine Ersatzdatenbank, kein Hosted-/Env-/Browserauftrag. Die bisherigen Schemaentwürfe bleiben erhalten; dieses Ergebnis ist **kein bestandenes Backend-/Phase-0-Schema-Gate**.

## Tatsächlich ausgeführt

Supabase CLI **2.119.0**, zuerst per `npx --yes supabase --version`, anschließend als feste Backend-Abhängigkeit installiert. Die reale CLI-Hilfe bestätigt `stack start`, `--runtime native`, `--exclude` und `--preparation`. `[experimental] stack = true` ist aktiviert. Der Start verwendet ausdrücklich `--runtime native`. Ein normales Startkommando ohne Aktivierung wäre hier weiterhin auf Docker angewiesen.

Eigenes Ausführungsprojekt: `/Users/kentoky/Documents/React Projects/pflege-dashboard/backend/.local/supabase-project`. Hier liegen nur Kopien unserer Supabase-Dateien. Keine root `.env` wird kopiert oder gelesen. Prozessumgebung nur PATH/HOME/TMPDIR/LANG und eigene Supabase-Laufzeitvariablen; keine übernommenen Provider-/Hosted-Tokens. Status-/Startausgaben werden in Speicher gesammelt und **vor** dem Schreiben redigiert; vollständige Ausgaben werden nie gedruckt. Logs unter `backend/.local/`, durch vorhandenes `.gitignore` ausgeschlossen.

Eigener `SUPABASE_HOME`:

`/var/folders/9v/89xd0tws1kl0j78fbm8_xjjw0000gn/T/pflege-dashboard-supabase-57aea064-phase0`

Eigener Stackordner:

`/var/folders/9v/89xd0tws1kl0j78fbm8_xjjw0000gn/T/pflege-dashboard-supabase-57aea064-phase0/stacks/77a1ed47ad6740996600e5b4b3c1a7ab262691f86fd61daacb1135a3442805d3`

Das allgemeine `~/.supabase` wurde nicht verwendet. Kein fremder Stack wurde angehalten oder geändert.

| Versuch | Tatsächliches Ergebnis |
| --- | --- |
| Eigener Laufzeitpfad unter `backend/.local/supabase-home` | Echter Supabase-Start scheitert an Pfad mit Leerzeichen im nativen TLS-/Datenbankstart: Shell versucht `/Users/kentoky/Documents/React`; `Permission denied`, anschließend `invalid secret key` als Fehlermeldung ohne ausgegebenen Schlüssel. Eigenen Versuch gestoppt. |
| Temporärer eigener SUPABASE_HOME ohne Leerzeichen, vorhandene App-Migrationen | Supabase beginnt beide Migrationen; zweite Migration scheitert mit `ERROR: must be owner of table objects (SQLSTATE 42501)`. **Nicht bestanden.** Kein Seed-/RLS-/Typnachweis. Eigenen Versuch gestoppt. |
| Derselbe echte Supabase-Stack, `start --runtime-only` | Nur im ignorierten Ausführungsspiegel wurden App-Migrationen und Seed für diesen Bereitschaftslauf ausgelassen. Die originalen SQL-Dateien blieben unverändert. Start Exit 0; zusätzlich reale Dienstprüfungen, siehe unten. Kein App-Schema-Gate. |

## Begrenzte Bereitschaftsprüfung

Lazy-Start wurde wirklich ausgelöst: `runtime-probe.mjs` spricht ohne Login und ohne API-Schlüssel die Loopback-Endpunkte an. Je Request höchstens 15 Sekunden, CLI-Status höchstens 20 Sekunden. Keine Modellaufrufe und keine Auth-Konten.

| Dienst | Reale Prüfung | Ergebnis |
| --- | --- | --- |
| Supabase Auth | `GET /auth/v1/health` | HTTP 200, JSON mit Feldern `version/name/description` |
| Supabase Storage | `GET /storage/v1/status` | HTTP 200; dieser Gesundheitsendpoint hat keine JSON-Antwort |
| Supabase REST | `GET /rest/v1/` | HTTP 200, OpenAPI-JSON |
| Supabase Database | Status nach den HTTP-Aufrufen | `running`, `healthy` |

Status **nach** den HTTP-Aufrufen: `runtime=native`, `lifecycle=running`, `readiness=ready`; Database, REST, Auth und Storage jeweils `running/healthy`. Die erste Momentaufnahme vor Requests hatte schlafende Dienste; sie wurde nicht als Dienstnachweis gewertet. Realtime, Functions, Studio, Mail, Analytics und Pooler waren ausdrücklich ausgeschlossen.

Sichere Belege ohne Schlüssel: `backend/.local/runtime-probe.json` und `backend/.local/runtime-cleanup.json`. Redigierte Logs: `supabase-start.log`, `supabase-stop.log`, `runtime-status-after-redacted.log`, `runtime-status-stopped-redacted.log`. Die Startdatei enthält den letzten Bereitschaftslauf; die früheren Fehler sind im Prüfverlauf und oben festgehalten.

## Sichere Wiederholung dieses begrenzten Laufs

Vom Projektordner aus, ohne Hosted-Zugriff und ohne Env-Datei:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
node scripts/supabase-safe.mjs start --runtime-only
node scripts/runtime-probe.mjs
node scripts/supabase-safe.mjs stop
node scripts/runtime-cleanup.mjs
```

`stop` immer ausführen, auch wenn Start oder Probe scheitern. Keine Rohstatusausgabe ausführen/zeigen. Diese Befehle sind **nur ein Supabase-Dienstnachweis**, keine Einrichtungsanleitung als Ersatzlieferung und kein Migrations-/RLS-Test. `supabase-safe.mjs start` ohne `--runtime-only` nimmt die vorhandenen App-Migrationen mit und ist wegen des oben belegten Storagefehlers noch kein grüner Pfad.

## Bereinigung und Grenzen

Eigene erste und zweite Versuche wurden gezielt gestoppt; nach dem erfolgreichen Bereitschaftslauf ebenfalls `stop` mit Exit 0. Abschließende Prozessprüfung sucht ausschließlich beide eigenen SUPABASE_HOME-Pfade: **0 eigene Prozesse**. Abschließender Status: `readiness=unavailable`, alle vier gespeicherten Dienstbeschreibungen `unavailable`, keine laufende Lifecycle. Die vier gespeicherten Beschreibungen sind keine vier laufenden Dienste. Zusätzlich werden die eigenen konfigurierten Ports 56421/56422 auf einen Listener geprüft. Eigene gestoppte Daten-/Downloadcaches bleiben zur gezielten Wiederholung bestehen. Keine sichtbare App, kein Browser, kein eigenständiger PostgreSQL-Prozess außerhalb Supabase, kein Hosting, kein Konto, kein Commit/Stage/Push.

Selbstbewertung nur für diesen Prüfablauf: vorher **3/10** (CLI/Docker fehlten, echte Verfügbarkeit nicht geprüft), nachher **9/10** (echte Supabase-Dienste, begrenzte Aufrufe, isolierter Lauf und gezielte Bereinigung). Keine Qualitätsnote für ungetestete App-/Chatflows. Keine behaupteten grünen RLS-/Seed-/Migrationstests oder generierten DB-Typen. Die SQL-Tests sind noch nicht geschrieben; die frühere Implementiert-Formulierung im API-Vertrag ist nachzuarbeiten. Ebenso neue Gespräche/Personenzuordnung und `p_reset_to_default` im RPC-Vertrag. Auf ausdrücklichen Orchestrator-Auftrag bleibt diese Nacharbeit bis nach dem Laufzeitergebnis zurückgestellt.

Offene Gates: Storage-Migrationsfehler beheben; echte Migration/Seed/RLS-/SQL-Tests und DB-Typgenerierung; später manuell provisionierter Login und Nutzer-Chat/Bestätigung/Dokument. Das Hosted-Projekt bleibt unverändert. Nach dieser Lieferung warten.

Primärquellen, am 06.10.2026 geprüft: [Supabase Docker/native](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes), [Stack-Aktivierung und lokale Isolation](https://supabase.com/docs/guides/local-development/running-multiple-local-projects).
