# Supabase-Verfügbarkeit am 06.10.2026

Die direkte Nutzer-Nachricht „Bitte mach mit deiner Aufgabe weiter.“ wurde in den ursprünglichen Backend- und Frontend-Unterchats verifiziert. Sie ersetzt deren vorherige Unterbrechung. Es wurden keine neuen Agenten gestartet.

## Tatsächlicher Nachweis

Der Orchestrator hat `npx --yes supabase@latest --version` unabhängig ausgeführt: Version **2.119.0**, Exit 0. Das allein wäre noch kein Supabase-Nachweis.

Der Backend-Unterchat hat anschließend die echte Supabase-Laufzeit mit `[experimental] stack = true` und `--runtime native` gestartet. Die offizielle [Supabase-Dokumentation](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes) beschreibt diesen experimentellen Betrieb ohne Docker auf Apple Silicon. Es wurde kein eigenständiger PostgreSQL-Ersatz verwendet.

Der eigene Laufzeitordner ist `pflege-dashboard-supabase-57aea064-phase0` unter dem macOS-Temporärordner. Ein erster Versuch mit einem Pfad mit Leerzeichen scheiterte; dessen Dienste wurden beendet. Der zweite Versuch verwendet ausschließlich einen eigenen Pfad ohne Leerzeichen und einen isolierten Projektspiegel ohne die Projekt-`.env`.

Der Orchestrator hat das Prüfskript und seinen gespeicherten, geheimnisfreien Bericht `backend/.local/runtime-probe.json` gelesen:

| Prüfung | Ergebnis |
| --- | --- |
| Laufzeit | `native`, `running`, `ready` |
| Datenbank | `running`, `healthy` |
| Datenzugriff (REST) | `running`, `healthy`; HTTP 200 mit OpenAPI-Antwort |
| Anmeldung (Auth) | `running`, `healthy`; Gesundheitsprüfung HTTP 200 |
| Dateispeicher (Storage) | `running`, `healthy`; Statusprüfung HTTP 200 |

Die HTTP-Aufrufe waren auf lokale Adressen beschränkt, mit Zeitlimit und ohne Login oder Kontoanlage. Antwortwerte und Schlüssel wurden nicht ausgegeben. Gesundheitsprüfungen beweisen noch keine angemeldeten Nutzertests, Uploads oder korrekten Dashboard-Zugriffsregeln. Edge Functions und weitere ausgeschlossene Dienste gehören nicht zu diesem Nachweis.

## Bereinigung unabhängig geprüft

Nach dem Stoppen hat der Orchestrator selbst `node backend/scripts/runtime-cleanup.mjs` ausgeführt: Exit 0, keine Prozesse mit einem der beiden eigenen Supabase-Laufzeitpfade, Ports 56421 und 56422 geschlossen, alle vier Dienste `unavailable`. Kein Browser wurde für diese Prüfung gestartet.

## Grenze und nächste Arbeit

**Supabase-Verfügbarkeit bestanden. Dashboard-Backend noch nicht abgenommen.** Die App-Migration scheiterte separat an Besitzrechten auf einer Supabase-Storage-Systemtabelle. Schema, Seed, Zugriffsregeln und generierte Datenbanktypen sind deshalb noch nicht durch diesen Lauf bestätigt.

Der verbleibende ursprüngliche Phase-0-Auftrag einschließlich dieser Nacharbeit geht an denselben Backend-Unterchat. Keine Hosted-Migration, Provideraufrufe, Kontoanlage, Browser- oder Env-Arbeit gehören zu diesem Auftrag. Der ursprüngliche Frontend-Unterchat bearbeitet die bereits unabhängig geprüften Layout-Funde. Keine App-Oberfläche vor der Designwahl.

Bewertung des begrenzten Verfügbarkeitsnachweises: **9/10**. Die App-Migration bleibt bis zur Reparatur und tatsächlichen Sicherheitsprüfung ohne Abnahme.
