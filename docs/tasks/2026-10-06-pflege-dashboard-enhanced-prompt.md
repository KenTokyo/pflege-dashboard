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

## Improved prompt

Setze die vollständigen [Anforderungen](../anforderungen.md) als eigenständiges Projekt in `/Users/kentoky/Documents/React Projects/pflege-dashboard` um. Der aktuelle TreeChat liegt in `/Users/kentoky/Documents/React Projects/ki-pflegedashboard`; beide lokalen Unterchats erhalten den tatsächlichen Zielordner ausdrücklich. Der Orchestrator erstellt Arbeitsdokumentation, verteilt die Arbeit, prüft und bewertet sie; die Anwendung bauen ausschließlich die zwei beauftragten Unterchats.

Prüfe die konkreten Modelle und Parameter mit `treechat_capabilities`. Die Liste enthält nur Favoriten; fehlende Einträge beweisen keine fehlende Startfähigkeit. Nutzerkorrektur: GPT-6.1 Sol über `provider: codex`, `model: gpt-6.1-sol`, `reasoningEffort: xhigh`; Opus 5.5 über `claudeAgent`, `claude-opus-5-5`, `effort: high`. Die Opus-Kennung ist zusätzlich im aktuellen lokalen TreeChat-Modellregister verifiziert; beide konkreten Startwerte wurden vom Tool akzeptiert. Höchstens vier aktive Unterchats, davon ein Opus und drei Sol; für Phase 0 weiterhin nur zwei. Lokale Umgebung, voller Zugriff, Rückmeldung nach Abschluss. Keine neuen Agenten für Nacharbeit.

Phase 0: Der Frontend-Unterchat liefert drei eigenständige, seriöse Designrichtungen mit unterschiedlichen Schriften, Farben und Graffiti-Stärken als statische HTML-Mocks. Pro Richtung Login, Dashboard, Chat mit Bestätigungskarte und bereits erstelltem Dokument sowie Einstellungen mit Modus-/Modellauswahl, jeweils dunkel und hell. Liefere alle 24 PNGs unter `docs/mocks/<richtung>/` bei höchstens 1280×720 und je Richtung einen kurzen Bewegungsclip oder eine Bildfolge. Nutze nur fiktive deutsche Inhalte. Prüfe die Bilder und stelle sie mit einem kurzen Absatz je Richtung im Hauptchat vor, insgesamt höchstens zwölf Vorschaubilder. Stoppe danach ausdrücklich bis zur Designwahl. Keine App-UI vor der Wahl.

Parallel erstellt der Backend-Unterchat ausschließlich Schema, RLS-Zugriffsregeln, private Storage-Regeln, fiktiven Seed, lokale Supabase-Konfiguration, prüfbare Zugriffsregeltests, generierte TypeScript-Typen und `docs/api-contract.md`. Der Vertrag bildet die späteren Anforderungen und Grenzen verständlich ab; noch nicht gebaute Endpunkte werden als geplant gekennzeichnet. Keine AI-Aufrufe oder vorgezogene weitere Phase.

Keine Nutzer-/Login-Konten erstellen, Login-Zugangsdaten eingeben oder Schlüssel anzeigen, loggen oder committen. Nutzerkorrektur Supabase: Ein zusätzlicher Sol-6.1-xhigh-Unterchat darf das neue eigene Hosted-Projekt über den bereits geöffneten Browser und das gewünschte ChatGPT-Plugin anlegen (EU Frankfurt), das Database-Passwort festlegen und die benötigten Werte geschützt in die ignorierte `.env` hinterlegen, sofern ein tatsächlich verfügbarer sicherer Werkzeugweg dies unterstützt. Aktuell fehlt der Browser-/Plugin-Anschluss; keine Umgehung über persönlichen Chrome, keine vorgetäuschte Einrichtung. Letzte Grenze: nur funktionierendes Supabase, kein PostgreSQL-Ersatz und keine Anleitung als Ersatzlieferung. Backend-/Hostingarbeiten bleiben gestoppt, vorhandene Entwürfe erhalten. Ob Designmocks unabhängig weitergehen, wird geklärt. Keine kostenpflichtige Planbuchung oder Änderung fremder Projekte. Vorhandene Nutzerwerte/-Tabs erhalten. Keine Hosted-Migrationen vor Orchestrator-Abnahme.

Keine Dateien oder Anwendungsteile aus NoteTree kopieren. Für jeden Prüfbrowserlauf die globalen Regeln lesen, zuerst Prüfungen ohne Browser, nur unsichtbarer passender Chrome for Testing, höchstens ein Prüfbrowser gleichzeitig und 1280×720; sämtliche eigenen Prüfbrowser und Aufnahmeserver direkt nach Prüfung schließen. Der vorhandene Nutzerbrowser wird erhalten.

Der Nutzer benennt ausdrücklich ChatGPT Browser Use oder Computer Use für Supabase. Die gezielte erneute Tool-Inventarprüfung zeigt keines dieser Werkzeuge, keinen nachladbaren Tool-Suchanschluss und weiterhin keinen TreeChat-Browserhost. Daher keine Umsetzung des Online-Schritts und keine Ersatzdatenbank. Auf eine tatsächliche neue Anschlussmöglichkeit warten; keine Modell-/Agenten-Neustarts als vermeintliche Lösung desselben Werkzeugmangels.

Lokal pro geprüftem Meilenstein committen; nie pushen, wie die konkrete Anforderungsdatei festlegt. Gate-Berichte auf Deutsch: Ergebnis, tatsächliche Prüfungen, ehrliche Vorher-/Nachher-Bewertungen, Bilder, offene Nachweisgrenzen und benötigte Designentscheidung. Spätere Phasen aus der Anforderungsdatei bleiben im Arbeitsplan, beginnen aber erst nach dem jeweiligen Gate.
