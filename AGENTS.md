# Pflege-Dashboard

Lies vollständig `docs/anforderungen.md`, dann `/Users/kentoky/Documents/React Projects/shared-docs/CODING-RULES.md`. Für Browserprüfungen zusätzlich `~/.claude/CLAUDE.md` und `shared-docs/SCREENSHOT-GUIDE.md` im genannten übergeordneten Ordner lesen.

## Auftrag und aktuelles Gate

Eigenständige Neuentwicklung in diesem Ordner. Keine Dateien, Imports oder Anwendungsteile aus NoteTree übernehmen. Phase 0 ist aktiv: nur statische HTML-Designmocks und Backend-Grundlagen. Keine App-Oberfläche in `src/` bauen, bevor der Nutzer eine Richtung gewählt hat. Drei Richtungen, jeweils Login, Dashboard, Chat samt Bestätigungskarte und erstelltem Dokument sowie Einstellungen, je dunkel und hell: 24 PNGs, maximal 1280×720. Eine kurze Bewegungssequenz oder Bildfolge pro Richtung.

## Arbeitsteilung

- Orchestrator: Aufgaben verteilen, Verträge prüfen, Ergebnisse unabhängig prüfen, bewerten und dokumentieren. Keine App-Implementierung; höchstens kleine Verbindungsänderungen. Er besitzt diese Regeln, `docs/anforderungen.md`, `docs/tasks/` und Gate-Berichte.
- Derselbe Frontend-Unterchat besitzt `docs/mocks/`, später `src/` außer ausdrücklich vom Backend verwalteten generierten Typen, Designwerte, Bewegung und UI-Tests. In Phase 0 liegen etwaige Mock-Abhängigkeiten und Aufnahmeskripte ausschließlich in `docs/mocks/`.
- Derselbe Backend-Unterchat besitzt `supabase/`, `types/`, `backend/`, `docs/api-contract.md` und Backend-Einrichtungs-/Testdokumentation. Er baut keine UI. Paket-/Testscripts in Phase 0 unter `backend/`, um Dateikollisionen zu vermeiden.
- Höchstens zwei aktive TreeChat-Unterchats. Keine weiteren Chats, Provider-Subagenten oder Bildgenerierungs-Unterchats starten. Nacharbeit geht an den ursprünglichen Unterchat. Änderungen am API-Vertrag müssen zum Orchestrator.

## Grenzen

Keine Konten erstellen, auch keine lokalen Auth-Testkonten. Keine Zugangsdaten eingeben oder aus anderen Projekten lesen. Keine Schlüssel ausgeben, loggen oder committen. Lokale Supabase-Status-/Startausgaben vor Anzeige redigieren oder zunächst ausschließlich in ignorierte `.local/`-Dateien schreiben. RLS-Prüfungen mit synthetischen SQL-Claims sind keine angelegten Login-Konten. Noch nicht ausführbare angemeldete Nutzertests ehrlich benennen.

Nur fiktive Daten. Ein eigener lokaler Supabase-Stack darf gestartet werden, wenn eine vorhandene Container-Laufzeit verfügbar ist; keine sichtbaren Apps öffnen. Keine entfernten Projekte, Provideraufrufe, Deployment oder Veröffentlichung. Hosting und Schlüssel setzt später der Nutzer selbst auf. Anforderungen und Setup-Dokumente dürfen keine tatsächlichen Geheimnisse enthalten.

Der konkrete Projektauftrag `docs/anforderungen.md` hat Vorrang vor allgemeinen Git-Defaults: lokal pro Meilenstein committen, **niemals pushen**. Der Orchestrator führt die Meilenstein-Commits nach Prüfung aus. Unterchats stage/committen keine parallelen Dateien und verändern keine Git-Historie.

## Prüfung und Kommunikation

Deutsch, kurze verständliche Sätze. Berichte: Dateien/Ergebnis, tatsächlich ausgeführte Prüfungen samt Ergebnissen, ehrliche Note je Screen/Flow vor und nach Nacharbeit, verbleibende Nachweisgrenzen, Browser-/Prozessbereinigung. Unter 9/10 vor Bericht selbst verbessern.

Erst Node-/Quellprüfungen, dann Bilder. Nie persönliche Chrome-App oder mitgelieferten Playwright-Chrome starten. Chrome for Testing: `~/Library/Caches/chrome-for-testing/current/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, Version live prüfen. Keine sichtbaren Fenster, kein Fokuswechsel. Maximal 1280×720 und ein Prüfbrowser im gesamten Auftrag gleichzeitig. Keine Flags, die Bildrate oder Hintergrunddrosselung aufheben. Browser, Kontext und eigene Aufnahmeserver mit `try/finally`, Abbruchbehandlung und Zeitlimit schließen und eigene Prozesse nachprüfen. Keine endlosen dekorativen Animationen, kein WebGL/Three.js. Kurze Bewegung nur für den konkreten Aufnahmezweck; reduzierte Bewegung berücksichtigen. Eigene Prüfbrowser spätestens vor jeder Schlussantwort vollständig schließen.
