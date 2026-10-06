# Pflege-Dashboard – Phasen und Gates

## Initial goal

[Arbeitsauftrag](2026-10-06-pflege-dashboard-enhanced-prompt.md) und [vollständige Anforderungen](../anforderungen.md).

## Phase 0 – Designs und Backend-Grundlage

- [x] Original vollständig lesen; TreeChat-, globale Browser- und Coding-Regeln lesen.
- [x] Eigenständigen Zielordner und Git-Repository anlegen; Anforderungen unverändert kopieren.
- [x] Modelle und Optionen live prüfen: `claudeAgent/claude-opus-5`, `effort: high`; `codex/gpt-5.6-sol`, `reasoningEffort: high`. Die gewünschten Versionen 5.5 und 6.1 stehen nicht im freigegebenen Katalog. Abweichung im Chat erklärt.
- [ ] Genau zwei lokale TreeChat-Unterchats mit vollständigem Phase-0-Brief starten.
- [ ] Backend: Schema, RLS, privater Storage, fiktiver Seed, lokales Supabase, generierte Typen und API-Vertrag.
- [ ] Frontend: 24 vollständige PNGs aus statischen HTML-Mocks, drei Bewegungsfolgen, kurze Vorstellung je Richtung.
- [ ] Orchestrator prüft Berichte, Dateien, relevante Node-/SQL-Prüfungen und Bilder selbst. Nacharbeit an denselben Agenten.
- [ ] Geprüften Phase-0-Meilenstein lokal committen; Gate-Bericht und Bilder im Hauptchat.
- [ ] Nutzer wählt Designrichtung. Bis dahin bleibt die App-UI ungebaut.

Ergebnis: Vorbereitung abgeschlossen, beide Lieferungen noch offen. Pfade: `docs/mocks/`, `docs/api-contract.md`, `supabase/`.

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
