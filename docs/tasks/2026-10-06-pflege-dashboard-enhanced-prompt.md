# Pflege-Dashboard – Arbeitsauftrag

## Unchanged original

Lies zuerst vollständig die Anforderungsdatei:
/Users/kentoky/Documents/React Projects/quizblitz/docs/prompts/08-pflege-dashboard.md

Du bist der Orchestrator und baust das Pflege-Dashboard genau nach dieser Datei: komplette Neuentwicklung mit eigener Supabase-Datenbank, NoteTree nur als Inspiration, nichts kopieren. Starte als TreeChat-Unterchats einen Frontend-Agenten (Claude Opus 5.5, Effort high) und einen Backend-Agenten (Sol 6.1, Effort high). Prüfe Modelle und Werte vorher mit treechat_capabilities. Nie mehr als 2 gleichzeitig. Du verteilst nur die Arbeit und prüfst sie, Nacharbeit geht an denselben Agenten.

Beginne mit Phase 0: 3 Designrichtungen als Mockups (4 Screens, je dunkel und hell) nach docs/mocks/. Schick sie mir im Chat und warte auf meine Wahl, bevor die Oberfläche gebaut wird. Parallel darf das Backend Schema, Zugriffsregeln, lokales Supabase und den API-Vertrag anlegen. Keine Konten anlegen, keine Zugangsdaten eingeben, keine Schlüssel ausgeben. Berichte auf Deutsch an jedem Gate.

### Nutzerkorrektur 2026-10-06

Modell: GPT-6.1 Sol (Codex), Denkstufe Extra High
Werte für treechat_create_thread: provider "codex", model "gpt-6.1-sol", options {"reasoningEffort":"xhigh"}
Okay, du kannst parallel sogar drei Sub-Agents machen, ja, zwei oder du kannst sogar vier. Also maximal ein Opus 5.5 high, ABER du kannst GPT 6.1 Sol, kannst du drei Modelle gleichzeitig auf xHigh starten bzw parallel anlassen. Für die Bilder hätte ich gesagt, reicht auch High. Genau. Da kannst du parallel immer nur als Anmerkung.

### Nutzerkorrektur Supabase 2026-10-06

https://supabase.com/dashboard/new/vercel_icfg_sQgT8Exs0FZPhYsr4w2igKzz
.env
So, bei Supabase soll alles eingerichtet werden mit Browser Use bitte. Da kannst du auch einen parallelen Sub-Agent starten. Ich habe den Browser auf. Der soll das ChatGPT Plugin verwenden. Ich habe den Browser auf. Der wird gerade was Neues erzeugt. Da kann er den Database-Passwort alles festlegen und dann quasi hinterlegen in .env. Ne? Also ist auch wichtig, dass man das auch richtig hinterlegt in der .env. Alles Mögliche einrichten, ja. Auch Create New Project, alles was sinnvoll ist, die ganzen Keys und hast nicht gesehen, obwohl ich kann das natürlich auch machen. Genau, ich versuche. Obwohl, ja, versuch du das mal. Wenn du es nicht schaffst, dann also mit einem Agenten. Den Nutz zu schicken, genau.

### Nutzergrenze Supabase 2026-10-06

nein nur wenn es geht mit supabase oder garnicht

### Gewünschter Browserweg 2026-10-06

mit chatgpt browser use oder computer use das müsste gehen

### Direkter Codex-Folgeauftrag 2026-10-06 (Original)

hast du zugang zu meinem browser und könntest bitte supabase einrichten mit alles was dazu gehört, mcp usw...

Fortsetzung: Den verfügbaren Browseranschluss für die tatsächliche Supabase-Einrichtung verwenden und den MCP-Anschluss einrichten und prüfen. Vorhandene Entwürfe erhalten. Keine vorgezogene App-/Designarbeit.

### Weitere direkte Nutzeranweisung 2026-10-06 (Original)

sehr gut, bitte inmal die env nehmen und echte eintragen: /Users/kentoky/Documents/React Projects/pflege-dashboard/env.md setze fort und arbiete bitte autonom

### Nutzerkorrektur zur Arbeitsteilung 2026-10-06

bitte keine feedbacks geben sondern nur orchestrierer spielen und die sachen zusammenknüpfen nur wenn es sein muss, besser wenn die agenten alles selbst machen

### Designwahl und Fortsetzung 2026-10-06

tagwerk sieht am besten aus damit weitermachen

## Improved prompt

Setze die vollständigen [Anforderungen](../anforderungen.md) als eigenständiges Projekt in `/Users/kentoky/Documents/React Projects/pflege-dashboard` um. Phase 0 ist geliefert und lokal mit `689e735` gesichert. Die Nutzerwahl **Tagwerk** gibt jetzt Phase 1 frei. Die historischen Werkzeugblockaden und Unterbrechungen sind keine aktuelle Fortsetzungssperre: Echtes natives Supabase samt App-Migrationen und Zugriffsprüfungen ist nachgewiesen. Das eigene Hosted-Projekt und geschützte `.env` wurden separat nutzerautorisiert eingerichtet; Hosted-App-Schema, Anmeldung und KI-Aufrufe sind noch nicht nachgewiesen.

Der Orchestrator führt nur Aufgaben, Verträge und Ergebnisse zusammen. Keine App-Implementierung und keine kleinteiligen Feedbackrunden. Beide ursprünglichen Agenten bauen, prüfen und verbessern ihren Bereich selbst bis mindestens 9/10. Nacharbeit bleibt beim selben Agenten. Modelle und Optionenschlüssel werden mit `treechat_capabilities` geprüft; die Favoritenliste ist keine vollständige Verfügbarkeitsliste. Bestehende, bereits akzeptierte Modelle erhalten: Frontend `agent-c2f0c080d724ad307a7f96d6f7c0dbfa`, `claudeAgent/claude-opus-5-5`, `effort: high`; Backend `agent-57aea06487987ff6370bde548102f71b`, `codex/gpt-6.1-sol`, `reasoningEffort: xhigh`. Höchstens vier aktive Unterchats insgesamt, davon ein Opus und drei Sol; jetzt nur diese zwei. Keine neuen Unteragenten. Der bisherige Hosting-Unterchat bleibt gestoppt.

Jeder Agent erhält einen vollständigen Phase-1-Auftrag. Frontend besitzt `src/`, Root-Paketdateien, Frontend-Konfiguration, Designwerte und UI-Tests; Tagwerk-Mocks unter `docs/mocks/tagwerk/` sind die verbindliche Designreferenz. Backend besitzt `supabase/`, `types/`, `backend/`, API-Vertrag und Backend-Dokumentation. Der Vertrag wird vor der Datenanbindung aktualisiert; generierte Typen werden nicht von Hand geändert. Orchestrator besitzt Regeln, Aufgaben und Gate-Berichte. Keine Dateien, Imports oder Anwendungsteile aus NoteTree übernehmen.

Phase 1: Vite/React/TypeScript strict, TanStack Router/Query, Tailwind-CSS-Variablen, Motion und Supabase JS. Echte Supabase-Anmeldung ohne Registrierung oder Remember-me, sichere Sitzung und Abmeldung nach Inaktivität, responsive Tagwerk-App-Hülle in dunkel und hell, Dashboard aus fiktiven Supabase-Daten, Chat-Historie und Streaming auf einem tatsächlich konfigurierten Modell sowie Audit-Schreiben. Keine vorgetäuschten Speichervorgänge, KI-Antworten oder Phase-2-Funktionen. Supabase Edge Functions sind der einzige Produktweg für KI-Aufrufe. Personen-/Chat-Bezüge, Idempotenz, Revisionsschutz, Workspace-Grenzen, Sitzungsprüfung, Rate-Limit und hartes Kostenbudget bleiben serverseitig abgesichert.

Nur fiktive Daten, Demo-Banner sichtbar. Keine Auth-/Nutzerkonten anlegen und keine Login-Zugangsdaten eingeben. Keine Schlüssel ausgeben, loggen oder committen. Die vorhandene geschützte Konfiguration darf für das eigene neue Pflege-Dashboard-Projekt verwendet werden; Browser erhält ausschließlich öffentliche `VITE_SUPABASE_*`-Werte. Provider-Secrets verbleiben in Edge Functions. Keine kostenpflichtigen KI-Aufrufe ohne bereitgestellte Secrets und freigegebenes Budget; bisheriges Nullbudget nicht erhöhen. Geprüfte Migrationen dürfen nach lokalem Backend-Gate auf genau das autorisierte eigene neue Supabase-Projekt übertragen werden. Keine fremden Projekte, Tarifwechsel, Anwendungspublikation oder PostgreSQL-Ersatz. Fehlende Werkzeugfunktionen, Nutzerkonten oder Provider-Secrets werden als konkrete Nachweisgrenzen dokumentiert.

Agenten lesen die vollständigen Anforderungen, Coding-Regeln und vor Browserprüfungen die globalen Browserregeln. Erst Node-/Quellprüfungen, dann höchstens ein unsichtbarer passender Chrome for Testing gleichzeitig, maximal 1280×720. Keine persönlichen Browser, sichtbaren Apps oder Fokuswechsel. Alle eigenen Prüfbrowser und Server unmittelbar nach der Prüfung schließen; begrenzte Supabase-Prüfläufe im finally aufräumen. Keine endlosen dekorativen Animationen; inaktive Arbeit und Timer stoppen, reduzierte Bewegung berücksichtigen. AA-Kontrast, Tastaturbedienung und mobil nutzbare Ansichten prüfen.

Gate 1 verlangt eine echte angemeldete Unterhaltung in beiden Themes. Vollständige Implementierung, Tests mit synthetischen SQL-Claims/Mock-Provider und echte Supabase-Läufe sind getrennt von diesem nutzerseitigen Test zu belegen. Fehlende Konten/Secrets werden nicht durch Ersatzantworten kaschiert. Phase 2 bis 4 bleiben im Plan, beginnen erst nach dem jeweiligen Gate. Lokal pro geprüftem Meilenstein committen, niemals pushen. Deutsch, kurze Gate-Berichte mit Ergebnis, echten Prüfungen, Grenzen und Selbstbewertung.
