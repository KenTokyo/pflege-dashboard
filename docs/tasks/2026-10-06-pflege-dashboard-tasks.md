# Pflege-Dashboard – Phasen und Gates

## Initial goal

[Arbeitsauftrag](2026-10-06-pflege-dashboard-enhanced-prompt.md) und [vollständige Anforderungen](../anforderungen.md).

## Phase 0 – Designs und Backend-Grundlage

- [x] Original vollständig lesen; TreeChat-, globale Browser- und Coding-Regeln lesen.
- [x] Eigenständigen Zielordner und Git-Repository anlegen; Anforderungen unverändert kopieren.
- [x] Modelle/Optionen live prüfen und nach Nutzerkorrektur genau starten: `claudeAgent/claude-opus-5-5`, `effort: high`; `codex/gpt-6.1-sol`, `reasoningEffort: xhigh`. `capabilities` zeigte nur alte Favoriten; fehlender Eintrag war kein Beleg fehlender Startfähigkeit. Opus-Kennung im lokalen TreeChat-Modellregister zusätzlich geprüft, beide Startwerte vom Tool akzeptiert.
- [x] Genau zwei lokale TreeChat-Unterchats mit vollständigem Phase-0-Brief aktiv: Frontend `agent-c2f0c080d724ad307a7f96d6f7c0dbfa`, Backend `agent-57aea06487987ff6370bde548102f71b`. Beide lokal, full-access, Abschlussmeldung aktiv. Die anfänglichen Läufe mit älteren Modellen wurden vor der Übernahme unterbrochen und archiviert. Nutzer erlaubt jetzt maximal vier, es werden hier nur zwei benötigt.
- [x] Backend: Schema, RLS, privater Storage, fiktiver Seed, lokales Supabase, generierte Typen und API-Vertrag. Nach ausdrücklicher Fortsetzung abgeschlossen; aktueller Bericht `docs/backend-pruefung.md`.
- [x] Zusätzlichen Hosting-Unterchat nach ausdrücklicher Nutzerfreigabe starten: `agent-383586b96982be3fde65afc5600c333f`, GPT-6.1 Sol / xhigh. Insgesamt drei aktiv. Alter unterbrochener Backend-Lauf auf automatische Meldung gelesen; nur Pflichtdateilesen, keine Lieferung/Änderungen, bleibt gestoppt.
- [ ] Hosted-Projekt/geschützte `.env`: blockiert. Hauptchat und Hosting-Unterchat bestätigen `available: false` / `BrowserHostUnavailable`, kein ChatGPT-Browser-Plugin-Connector. Vorlage/Anleitung liegen als Entwurf vor, sind nach letzter Nutzergrenze keine akzeptierte Ersatzlieferung.
- [x] Nach Nutzergrenze „nur wenn es geht mit supabase oder garnicht“ Backend- und Hosting-Unterchat unterbrechen. Kein PostgreSQL-Ersatz. Keine Accounts/echte `.env`/Online-Projektanlage. Klärung, ob Designs unabhängig weitergehen oder das ganze Projekt stoppen soll, steht aus.
- [x] Auf Wunsch ChatGPT Browser Use / Computer Use gezielt erneut im vollständigen Tool-Inventar suchen: beide nicht eingebunden, kein Tool-Such-/Nachladeanschluss; TreeChat `browser_status` erneut `available:false`. Der Online-Schritt bleibt unerledigt. Keine weitere Ersatzarbeit.
- [x] Bis zur Klärung bzw. tatsächlichem Supabase-Anschluss auch Frontend unterbrechen. Alle drei aktuellen Unterchats sind `interrupted`; kein eigenständiger Neustart. Eigenen Prüfbrowserstand kontrolliert: laufender Testbrowser gehört nach CWD-Prüfung zum fremden NoteTree-Projekt und bleibt unangetastet; kein eigener Pflege-Dashboard-Browser-/PostgreSQL-Prozess vorhanden.
- [x] Frontend: 24 vollständige PNGs aus statischen HTML-Mocks, drei Bewegungsfolgen, kurze Vorstellung je Richtung.
- [x] Nach jüngster Nutzerkorrektur erledigen und prüfen die Agenten ihre Bereiche selbstständig; Orchestrator führt Lieferungen, Vertrag und Ergebnisbelege zusammen. Erste unabhängige Prüfungen und frühere Nacharbeit sind im Verlauf erhalten.
- [x] Gemeinsamen Phase-0-Meilenstein zur lokalen Sicherung zusammenführen; Gate-Bericht `docs/gates/2026-10-06-phase0-designwahl.md`. Commit erfolgt vor der Übergabe im Hauptchat, kein Push.
- [x] Nutzer wählt am 06.10.2026 **Tagwerk**: „tagwerk sieht am besten aus damit weitermachen“. Phase 1 ist freigegeben.

Historischer Zwischenstand vor ausdrücklicher Fortsetzung: Vorbereitung lokal committed (`02c7ad8`); damaliger Entwurfsstand wurde als unfertiger Zwischenstand gesichert. API-Vertrag v0.1 und geplante API-Typen wurden früh gelesen, Schema/Seed sind unvollständig geprüfte Entwürfe. Alle Agenten nach letzter Nutzergrenze gestoppt, echtes Supabase mangels Anschluss/Runtime nicht eingerichtet. Keine fertigen 24 Mock-PNGs, keine Phase-0-Abnahme, keine App-UI. Pfade: `docs/mocks/`, `docs/api-contract.md`, `supabase/`.

## Supabase-Fortsetzung in Codex am 06.10.2026

Fortsetzung nach direkter Nutzerfreigabe: Werte aus `env.md` geschützt in `.env` übernehmen und autonom weiterarbeiten. Projekt `ttbfpqveexmlqxkzwlmz` (`pflegedashboard`) ist jetzt `ACTIVE_HEALTHY` in Frankfurt. MCP-SQL-Abfrage erfolgreich; noch keine Tabellen oder Migrationen. Parallele Backend-/Designänderungen gehören anderen Arbeiten und werden erhalten.

- [x] `env.md` zusätzlich ignorieren; Passwort und Verbindungsadresse ohne Ausgabe übernehmen. Beide Geheimnisdateien unversioniert und Rechte 0600.
- [x] Lokale `.env` per echter TLS-Datenbankverbindung prüfen; öffentliche API-Konfiguration vervollständigen. TLS-Socket verschlüsselt und mit offizieller CA verifiziert; Auth-API HTTP 200.
- [x] Auth-Grundeinstellungen prüfen und öffentliche Registrierung abschalten. Site URL 5173, Access-Token 300s. Automatische Inaktivitätsabmeldung auf Free nicht verfügbar.
- [ ] Aktuellen Backend-Abnahmestand prüfen; nur freigegebene, geprüfte Migrationen übertragen.

- [x] Direkten Folgeauftrag erfassen; vorhandene Anforderungen, Einrichtung und Migrationen lesen.
- [x] Browser-Erweiterung erfolgreich mit vorhandenem Supabase-Projektanlage-Tab verbinden. Dies ersetzt für diesen Chat den früheren Werkzeugblock.
- [x] Formular prüfen: vorhandener Name `pflegedashboard`, Organisation `kens projects` im Free-Tarif. Frankfurt auswählen; automatische Tabellenfreigabe deaktivieren und automatische RLS aktivieren.
- [x] Supabase-Erweiterung finden und zur nutzerseitigen Verbindung anbieten; aktuellen OAuth-/MCP-Weg in offiziellen Quellen prüfen.
- [x] Nutzer hat Projekt angelegt und Passwort lokal bereitgestellt; keine Passworteingabe durch den Agenten.
- [x] Projektkennung, Region und Free-Tarif nach Anlage prüfen; öffentliche Registrierung ausschalten und über API bestätigen.
- [x] Supabase-Erweiterung installiert und autorisiert; MCP durch erfolgreiche Aufrufe von `list_organizations` und `list_projects` geprüft. Inzwischen ist auch `pflegedashboard` sichtbar und per SQL erreichbar.
- [x] Projektspezifischen Datenbankzugriff nach Anlage per MCP-SQL geprüft. Keine zusätzliche globale MCP-Verbindung angelegt.
- [x] Benötigte Projektwerte geschützt lokal hinterlegen und echte Verbindung prüfen. Supabase-Sicherheitsprüfung nach Korrektur des RLS-Trigger-EXECUTE-Rechts ohne Meldungen.
- [ ] Backend-Gate abschließen, anschließend Migrationen und RLS gegen echtes Supabase prüfen.

Historischer Hosted-Bericht vor lokalem Schema-Gate: Hosted-Projekt, `.env`, Auth-Grundeinstellungen und MCP funktionieren und wurden real geprüft. Anwendungstabellen noch nicht übernommen: paralleler Backend-Bericht nennt Storage-Migrationsfehler `must be owner of table objects`; Schema-/Seed-/RLS-Gate offen. Geheimnisse ausschließlich lokal gespeichert, nicht ausgegeben oder committed. Keine eigenen Browser-/Serverprozesse; DB-Verbindungen geschlossen, Nutzer-Tab erhalten. Browser-Finding: zwei Playwright-Linkklicks meldeten Timeouts trotz sichtbarem Link; frischer AX-Zustand und Klick auf dessen aktuelle Elementnummer funktionierten. Pfade: `docs/supabase-provisioning.md`, `docs/backend-runtime-pruefung.md`, `.env.example`.

## Orchestrator-Fortsetzung: echtes lokales Supabase und Design-Nacharbeit

Die direkte Nutzer-Nachricht „Bitte mach mit deiner Aufgabe weiter.“ wurde in beiden ursprünglichen Unterchats verifiziert. Die früheren Unterbrechungseinträge sind historisch; Frontend und Backend arbeiten wieder. Der Orchestrator hat keinen Ersatzchat gestartet.

- [x] Echte native Supabase-Laufzeit nachweisen: CLI 2.119.0, Database/REST/Auth/Storage gesund, begrenzte HTTP-Prüfungen erfolgreich. Eigene Ressourcen anschließend vom Orchestrator unabhängig als beendet geprüft. [Begrenzter Gate-Bericht](../gates/2026-10-06-supabase-native.md).
- [x] Erste 12 Designbilder tatsächlich ansehen; konkrete Nacharbeit an denselben Frontend-Unterchat geben. Chat-Bestätigungsaktionen und Einstellungsaktionen müssen vollständig sichtbar werden; weitere Inhalts- und Browserfunde sind Teil desselben Auftrags.
- [x] Derselbe Backend-Unterchat behebt den tatsächlich belegten Storage-Migrationsfehler und vervollständigt den ursprünglichen Phase-0-Auftrag in echtem Supabase: Migrationen, Seed, Zugriffs-/RPC-/Storage-/Audit-Tests, generierte Typen und korrigierter Vertrag.
- [x] Fertige Berichte und sichere Ergebnisbelege zusammenführen. Nutzerkorrektur: keine weiteren kleinteiligen Feedbacks; Agenten erledigen eigene Nacharbeit und Prüfung vollständig selbst.
- [x] 24 PNGs und drei Bewegungsfolgen zur Auswahl zusammenführen; lokal committen und im Hauptchat vorlegen. Keine Oberfläche vor Nutzerwahl.

Dieser Backend-Auftrag enthält keine Hosted-Migration, Provideraufrufe, Kontoanlage, Browser- oder Env-Arbeit. Ein separat dokumentierter Hosting-Fortsetzungsstand ist kein Nachweis des lokalen Schema-Gates. Keine App-Oberfläche vor der Designwahl.

## Phase 1 – Fundament (Tagwerk gewählt, aktiv)

- [x] Designwahl und jüngste Arbeitsteilung im selben Arbeitsauftrag und in den Projektregeln festhalten; Phase-0-Meilenstein `689e735` erhalten.
- [x] Dieselben ursprünglichen Frontend-/Backend-Unterchats mit je einem vollständigen Phase-1-Auftrag fortgesetzt; Modelle und Optionenschlüssel live bestätigt, Modelle erhalten. Hosting-Unterchat nicht neu gestartet.
- [ ] Backend veröffentlicht umgesetzten Phase-1-Vertrag und Typen vor Frontend-Datenanbindung; Agenten übernehmen eigene Prüfung und Nacharbeit.
- [ ] Login, Sitzung/Timeout, App-Hülle, beide Themes, Dashboard mit Seed, Streaming-Chat auf einem Modell, Audit-Schreiben.
- [ ] Vertrag vor Datenanbindung prüfen; Typen, Lint, Tests, RLS und Node-Smoke sowie beide Themes prüfen.
- [ ] Gate: Nutzer kann sich selbst anmelden und in beiden Themes eine echte Unterhaltung führen.

Ergebnis: Phase 1 durch Nutzerwahl freigegeben. Tagwerk-Mocks sind Designreferenz; echter lokaler Supabase-Phase-0-Prüflauf bestanden. Anmeldung und KI-Nutzertest brauchen nutzerseitiges Konto, Provider-Secrets und freigegebenes Budget. Keine Agenten-Kontoanlage, kein vorgetäuschter Chat. Pfade: `src/`, `supabase/functions/`, `docs/api-contract.md`.

## Phase 2 – Sachbearbeiter

- [ ] Bestätigungskarten, serverseitige Modi, mehrere Anbieter/Modellauswahl, Uploads.
- [ ] Dokumenteditor, PDF/DOCX, menschliche Übergabe, anschließend Wissenssuche mit Quellen.
- [ ] Vollständige Chat → Bestätigung → Dokument-Abnahme und serverseitige Sicherheitsprüfungen.

Ergebnis: Nicht begonnen. Pfade: `src/`, `supabase/functions/`, `backend/`.

## Phase 3 – Demo-Paket

- [ ] Fiktive Familie, fünfminütiges Vorführskript, Präsentationsfeinschliff.
- [ ] Bereitstellung und Schritte für nutzerseitige Konten-/Projektanlage vorbereiten; keine Konten/Schlüssel durch Agenten.
- [ ] Datenschutzliste vor Echtbetrieb schreiben.

Ergebnis: Nicht begonnen. Pfade: `docs/`, `supabase/seed.sql`, `src/`.

## Phase 4 – Abschlussfeinschliff

- [ ] Beide ursprünglichen Unterchats verbessern alle eigenen Screens und Abläufe auf mehr als 9/10.
- [ ] Orchestrator prüft erneut selbst, dokumentiert echte Nachweise und nicht geprüfte Gates.
- [ ] Abschließender lokaler Commit, keine Veröffentlichung und kein Push.

Ergebnis: Nicht begonnen. Pfade: `docs/`, `src/`, `backend/`.
