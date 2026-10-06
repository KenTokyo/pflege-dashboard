# Pflege-Dashboard – Phasen und Gates

## Initial goal

[Arbeitsauftrag](2026-10-06-pflege-dashboard-enhanced-prompt.md) und [vollständige Anforderungen](../anforderungen.md).

## Phase 0 – Designs und Backend-Grundlage

- [x] Original vollständig lesen; TreeChat-, globale Browser- und Coding-Regeln lesen.
- [x] Eigenständigen Zielordner und Git-Repository anlegen; Anforderungen unverändert kopieren.
- [x] Modelle/Optionen live prüfen und nach Nutzerkorrektur genau starten: `claudeAgent/claude-opus-5-5`, `effort: high`; `codex/gpt-6.1-sol`, `reasoningEffort: xhigh`. `capabilities` zeigte nur alte Favoriten; fehlender Eintrag war kein Beleg fehlender Startfähigkeit. Opus-Kennung im lokalen TreeChat-Modellregister zusätzlich geprüft, beide Startwerte vom Tool akzeptiert.
- [x] Genau zwei lokale TreeChat-Unterchats mit vollständigem Phase-0-Brief aktiv: Frontend `agent-c2f0c080d724ad307a7f96d6f7c0dbfa`, Backend `agent-57aea06487987ff6370bde548102f71b`. Beide lokal, full-access, Abschlussmeldung aktiv. Die anfänglichen Läufe mit älteren Modellen wurden vor der Übernahme unterbrochen und archiviert. Nutzer erlaubt jetzt maximal vier, es werden hier nur zwei benötigt.
- [ ] Backend: Schema, RLS, privater Storage, fiktiver Seed, lokales Supabase, generierte Typen und API-Vertrag.
- [x] Zusätzlichen Hosting-Unterchat nach ausdrücklicher Nutzerfreigabe starten: `agent-383586b96982be3fde65afc5600c333f`, GPT-6.1 Sol / xhigh. Insgesamt drei aktiv. Alter unterbrochener Backend-Lauf auf automatische Meldung gelesen; nur Pflichtdateilesen, keine Lieferung/Änderungen, bleibt gestoppt.
- [ ] Hosted-Projekt/geschützte `.env`: blockiert. Hauptchat und Hosting-Unterchat bestätigen `available: false` / `BrowserHostUnavailable`, kein ChatGPT-Browser-Plugin-Connector. Vorlage/Anleitung liegen als Entwurf vor, sind nach letzter Nutzergrenze keine akzeptierte Ersatzlieferung.
- [x] Nach Nutzergrenze „nur wenn es geht mit supabase oder garnicht“ Backend- und Hosting-Unterchat unterbrechen. Kein PostgreSQL-Ersatz. Keine Accounts/echte `.env`/Online-Projektanlage. Klärung, ob Designs unabhängig weitergehen oder das ganze Projekt stoppen soll, steht aus.
- [x] Auf Wunsch ChatGPT Browser Use / Computer Use gezielt erneut im vollständigen Tool-Inventar suchen: beide nicht eingebunden, kein Tool-Such-/Nachladeanschluss; TreeChat `browser_status` erneut `available:false`. Der Online-Schritt bleibt unerledigt. Keine weitere Ersatzarbeit.
- [x] Bis zur Klärung bzw. tatsächlichem Supabase-Anschluss auch Frontend unterbrechen. Alle drei aktuellen Unterchats sind `interrupted`; kein eigenständiger Neustart. Eigenen Prüfbrowserstand kontrolliert: laufender Testbrowser gehört nach CWD-Prüfung zum fremden NoteTree-Projekt und bleibt unangetastet; kein eigener Pflege-Dashboard-Browser-/PostgreSQL-Prozess vorhanden.
- [ ] Frontend: 24 vollständige PNGs aus statischen HTML-Mocks, drei Bewegungsfolgen, kurze Vorstellung je Richtung.
- [ ] Orchestrator prüft Berichte, Dateien, relevante Node-/SQL-Prüfungen und Bilder selbst. Nacharbeit an denselben Agenten.
- [ ] Geprüften Phase-0-Meilenstein lokal committen; Gate-Bericht und Bilder im Hauptchat.
- [ ] Nutzer wählt Designrichtung. Bis dahin bleibt die App-UI ungebaut.

Ergebnis: Vorbereitung lokal committed (`02c7ad8`); aktueller Entwurfsstand wird als unfertiger Zwischenstand gesichert. API-Vertrag v0.1 und geplante API-Typen wurden früh gelesen, Schema/Seed sind unvollständig geprüfte Entwürfe. Alle Agenten nach letzter Nutzergrenze gestoppt, echtes Supabase mangels Anschluss/Runtime nicht eingerichtet. Keine fertigen 24 Mock-PNGs, keine Phase-0-Abnahme, keine App-UI. Pfade: `docs/mocks/`, `docs/api-contract.md`, `supabase/`.

## Phase 1 – Fundament (nach Designwahl)

- [ ] Login, Sitzung/Timeout, App-Hülle, beide Themes, Dashboard mit Seed, Streaming-Chat auf einem Modell, Audit-Schreiben.
- [ ] Vertrag vor Datenanbindung prüfen; Typen, Lint, Tests, RLS und Node-Smoke sowie beide Themes prüfen.
- [ ] Gate: Nutzer kann sich selbst anmelden und in beiden Themes eine echte Unterhaltung führen.

Ergebnis: Nicht begonnen. Pfade: `src/`, `supabase/functions/`, `docs/api-contract.md`.

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
