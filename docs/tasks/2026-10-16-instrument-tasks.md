## Initial goal
Eine zweite, gespeicherte Designwahl „Instrument“ für Rahmen und Übersicht bauen; Tagwerk erhalten.

## Improved prompt
Auftrag: `/Users/kentoky/Documents/React Projects/notetree-tanstack/docs/ai-integration/modelltest/2026-10-16-pflege-dashboard/AUFGABE.md`. Ausschließlich im Worktree `/Users/kentoky/Documents/React Projects/pflege-dashboard-modelltest/r1-sol`, Zweig `modelltest/r1-sol`, Prüfport 5212. Instrument-Skill `/Users/kentoky/Documents/React Projects/notetree-tanstack/.claude/skills/instrument-ui/SKILL.md`, Vorbilder `/Users/kentoky/Documents/React Projects/notetree-tanstack/docs/design/referenzen/2026-10-16-yury-gok-instrument/`, Entwurf `/Users/kentoky/Documents/React Projects/notetree-tanstack/docs/design/entwuerfe/2026-10-16-instrument-stil/index.html` und dessen PNGs. Bestehende Daten und Funktionen, deutsche Sie-Form, eigene Sachfarben und SVGs, ein Akzent, beide Themes, 1920×1080 / 1280×800 / 390px. Vier geforderte Prüfungen, echte Sichtprüfung, Commit auf eigenem Zweig, kein Main-Push und kein Deployment.

## Phase 1 – Referenz und Vertrag
- [x] Auftrag, Worktree-Regeln, Anforderungen und Instrument-Skill vollständig lesen; sauberen Zweig bestätigen.
- [x] Referenzen ansehen: Tenet-Vertragstabelle, Vigil-Abdeckung, Instrument-Desktop; Entwurfsquelle lesen.
- [x] Datenfluss und bestehende Theme-Speicherung prüfen.
Ergebnis: 20px Kartenradien, 1px Trenner, 20px Innenabstand, 32px Symbolkacheln, 44px bedienbare Zeilen, ruhige Grotesk und Mono-Werte. Eigene Instrument-Komponenten und ausschließlich eingeschränkte CSS-Regeln schützen Tagwerk. Der vorhandene Demo-Widerspruchstermin ist keine berechnete Rechtsfrist. Keine Backendänderung.
Pfade: `src/app/ThemeProvider.tsx`, `src/routes/DashboardPage.tsx`, `src/styles/`.

## Phase 2 – Umsetzung
- [x] Gespeicherte Designwahl und Einstellungen; Instrument-Rahmen und beide Themes.
- [x] Instrument-Übersicht mit echten Abfragen, Countdown, Personen, Aufgaben, Dokumenten, Gesprächen und KI-Einstieg.
- [x] Einmalige Schnittfolge/Zählwerke, reduzierte Bewegung, danach Ruhe.
Ergebnis: Designwahl, isolierte Instrument-Komponenten, semantische Tokens für beide Themes und einmalige Animationen umgesetzt. Vier vorhandene Datenabfragen bleiben unverändert.

## Phase 3 – Prüfung und Abschluss
- [x] Typecheck, Lint, Tests, Quellprüfung; Probleme beheben.
- [x] Eingebauter Hintergrundbrowser, danach notwendiger CFT-Ausweichweg: beide Themes, 1920×1080 / 1280×800 / 390px, andere Seiten, lange/leere Inhalte, gespeicherte Wahl, Tagwerk-Vergleich.
- [x] Beweisbilder ansehen; Prüfressourcen schließen; Bericht erstellen.
- [x] Abschließenden Diff prüfen und geprüfte Lieferung im Commit auf `modelltest/r1-sol` sichern.
Ergebnis: Alle vier Pflichtprüfungen und zusätzlich Build grün; 21 Testdateien mit 248 Tests, 100 Kontrastpaare. 32 abschließende Browserprüfungen bestanden. Bericht und 12 betrachtete Beweisbilder unter `docs/pruefung/instrument-r1-sol/`.

### Browser-Findings
- Eingebauter Hintergrundbrowser auf `http://127.0.0.1:5212`, synthetische Anmeldung. `locator.fill()` führte zum Timeout, ohne Eingabeeffekt. Stabil: `human.type(locator, text)` und `human.click(locator)`. Keine Wiederholung des fehlerhaften Aufrufs.
- Harness deaktiviert Watch und HMR (`watch: null`, `hmr: false`): ein Reload übernimmt keine geänderten Quellen. Nach Änderungen eigenen Vite auf Port 5212 neu starten, dann neu öffnen und synthetisch anmelden. Frühere Bilder sind Zwischenstände.
- Erste 1920px- und 390px-Sichtprüfung hell/dunkel ohne Querscrollen. Desktop-Dichte wird vor finaler Aufnahme verbessert.

- Eingebauter Browser: weitere Aufrufe enden mit `BrowserTimeout` und `BrowserInputUnsupported`; zuletzt scheitert bereits `browser_open`. `browser_tabs` bestätigt keine eigenen offenen Tabs. Restabnahme erfolgt über den im Auftrag vorgesehenen CFT-Wrapper, unsichtbar und mit Zeitlimit.

- CFT-Restabnahme: 28 Bedien-/Layoutprüfungen bestanden; synthetische Antwort mit Quelle abgeschlossen, kein Provideraufruf. Handy-Einstellungen im geöffneten Bild: Modellname wurde durch rechtsstehende Badges zu schmal. Instrument-only auf eine Spalte mit Metadaten unter dem Namen geändert. Abschließend diese Fläche und lange/leere Bestände erneut prüfen.

- Finale CFT-Abnahme: 32 Prüfungen grün, keine Browser-Laufzeitfehler, langer und leerer Bestand in 390/1920 px zusätzlich geprüft. Nach Größenänderung vor Aufnahme 300–400 ms auf den Bildaufbau warten; unmittelbare Aufnahme konnte einen alten Bildausschnitt enthalten. Dunkles Handybild mit eigener abschließender Aufnahme ersetzt, untere Navigation korrekt sichtbar. Alle finalen Bilder tatsächlich geöffnet.
- Bewegung zusätzlich im eingebauten Browser ohne reduzierte Bewegung geprüft: Zählwerke erreichen den Endwert, nach Eintritt keine laufenden Animationen. Finale CFT-Sichtprüfung mit reduzierter Bewegung. Kein CPU-Vergleich und kein Leistungsgewinn behauptet.
- Bereinigung: letzter CFT-Prozess 51047 samt drei Kindern und Wächter beendet; vorheriger vollständiger Prüflauf 47856 samt vier Kindern beendet. Keine eigenen Browserreste. Eigener Vite-Prozess 47314 beendet, Port 5212 danach ohne Listener.
