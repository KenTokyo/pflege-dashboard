# Instrument – Modelltest R1 Sol

**Ergebnis:** Instrument ist als zweite Designwahl umgesetzt. Einstellungen → Darstellung und Sitzung → Instrument. Die Wahl bleibt nach Neuladen erhalten; Tagwerk bleibt Standard. Rahmen und Übersicht sind neu gestaltet, bestehende Daten und Gesprächsfunktionen bleiben angebunden.

## Änderungen und Dateien

- Speicherung und Auswahl: `src/lib/design.ts`, `src/app/ThemeProvider.tsx`, `src/routes/SettingsPage.tsx`. Schlüssel `pflege-dashboard:design`, Attribut `html[data-design]`; tatsächlicher Speicherzugriff ausschließlich im ThemeProvider.
- Eigene Navigation, Karten und gezeichnete SVGs: `src/components/instrument/InstrumentShell.tsx`, `InstrumentDashboard.tsx`, `InstrumentAsk.tsx`, `InstrumentIcon.tsx`. Einbindung in `src/components/Shell.tsx` und `src/routes/DashboardPage.tsx`; Tagwerk-Markup bleibt erhalten.
- Beide Farbschemata ausschließlich unter Instrument: `src/styles/instrument.css`, importiert in `src/styles/app.css`. Ein Akzent, feste Sachfarben, lesbare Zustände, mobile Navigation. Einmalige Schnittfolge und Zählwerke; `src/components/CountUp.tsx` erhält dafür eine optionale Dauer, der Tagwerk-Standard bleibt gleich.
- Prüfung: `tests/unit/theme.test.ts` ergänzt Standard, Persistenz, ungültige Werte und gesperrten Speicher. `tools/check-source.mjs` prüft zusätzlich beide Instrument-Themes samt Sachfarben. Planung: `docs/tasks/2026-10-16-instrument-tasks.md`.

Die Übersicht zeigt vorhandene Personen mit Pflegegrad/Kasse/nächstem Termin, dringliche Aufgaben, Widerspruchs-Countdown, Dokumentstatus und Gespräche. Der Countdown nennt seine gespeicherte Quelle und kennzeichnet die notwendige Prüfung am Originalbescheid. Es wird keine Rechtsfrist aus erfundenen Daten berechnet. „Sachbearbeiter fragen“ nutzt die bestehende Gesprächsanbindung.

## Ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| `npm run typecheck` | Bestanden |
| `npm run lint` | Bestanden, keine Lintwarnungen |
| `npm run test` | 21 Dateien, 248 Tests bestanden |
| `npm run check:source` | 77 Quelldateien, 100 Kontrastpaare über Tagwerk/Instrument und hell/dunkel bestanden |
| `npm run build` | Bestanden |
| Browser: 1920×1080, 1280×800, 390×844 | 32 Prüfungen bestanden; kein waagerechter Überlauf, keine Laufzeitfehler |

Browserablauf: Anmeldung → Design wählen → Übersicht → Fristen/Dokumente/Gespräche → Frage absenden → fertige synthetische Antwort mit Quelle. Außerdem beide Themes, andere Seiten einschließlich Sachbearbeiter-Test, Handy-Menü, Escape, Hover-Tooltip, Scrollen, lange/leere Bestände, zweiter Akzent, Rückwechsel zu Tagwerk und gespeicherte Wahl nach Neuladen geprüft. Im ersten eingebauten Browserlauf auch Dokumentfilter und Statusänderung bedient.

Der eingebaute Hintergrundbrowser wurde zuerst benutzt. Nach dessen `BrowserTimeout`/`BrowserInputUnsupported` erfolgte die Schlussprüfung mit dem vorgesehenen `docs/mocks/tools/browser.mjs`: unsichtbarer Chrome for Testing **155.0.8059.40**, Nutzer-Chrome **155.0.8059.84**, Zeitlimit und Prozessbereinigung. Die 32 Ergebnisse stehen in [PRUEFRESULTAT.json](PRUEFRESULTAT.json). Vitest meldet vorhandene jsdom-Hinweise zu `scrollTo`; alle Tests bestehen.

## Beweisbilder – aufgenommen und geöffnet

Alle Pfade relativ zu diesem Bericht; PNGs verlustfrei komprimiert.

| Ansicht | Bilder |
| --- | --- |
| Desktop, 1920×1080 | [Dunkel](desktop-dunkel.png), [Hell](desktop-hell.png) |
| Frist im Detail | [Ausschnitt](ausschnitt-frist.png) |
| Laptop, 1280×800 | [Dunkel](laptop-dunkel.png) |
| Handy, 390×844 | [Dunkel](handy-dunkel.png), [Hell](handy-hell.png), [untere Karten](handy-hell-unten.png) |
| Handy, Randfälle | [Lange Inhalte](lang-handy.png), [leerer Bestand](leer-handy.png) |
| Handy, Designwahl | [Einstellungen](einstellungen-handy.png) |
| Abgeschlossener Frageablauf | [Gespräch mit Antwort](gespraech-antwort.png) |
| Tagwerk-Vergleich | [Bisherige Übersicht](tagwerk-dunkel.png) |

## Eigene Bewertung und Grenzen

Skala: 1 = unbrauchbar, 10 = hervorragend. Eigene Einschätzung, keine unabhängige Nutzerstudie.

| Fläche/Ablauf | Vor Nacharbeit → fertig | Grund |
| --- | --- | --- |
| Rahmen und Übersicht | 8 → **9/10** | Ruhige Hierarchie, dichte Karten, erkennbare Sachfarben, Frist und nächste Handlung unmittelbar sichtbar. |
| Handy und Einstellungen | 8 → **9/10** | Lange Modellnamen mit Metadaten darunter, lesbare Karten, durchgehend erreichbare Navigation. |
| Frage bis Antwort | 9 → **9/10** | Vorhandener Ablauf vollständig durchlaufen, Bezug zur Person und Grenzen der KI sichtbar. |

**Gesamtnote: 9/10.** Keine Bestnote ohne Prüfung durch pflegende Angehörige und auf echten Handys.

Geprüft ist die lokale Harness-App mit synthetischen Daten auf Port **5212**. Kein echter Supabase-/Providerlauf, keine Veröffentlichung, keine Backendänderung. Einmalige Bewegung wurde auch ohne Bewegungsreduktion geprüft; keine dauerlaufenden Animationen beobachtet. Es wurde kein CPU-Leistungsvergleich gemessen.

Alle eigenen Prüfbrowser samt Kindern und Wächter sind beendet. Der eigene Vite-Prüfserver ist beendet; Port 5212 ist frei. NoteTree und fremde Zweige wurden nicht verändert. Lieferung auf `modelltest/r1-sol`.
