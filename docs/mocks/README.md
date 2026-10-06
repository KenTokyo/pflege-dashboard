# Pflege-Dashboard · Phase 0 · Designrichtungen

Statische HTML-Mocks für die Designwahl. Kein App-Code, keine Anmeldung, keine Netzwerkzugriffe, nur fiktive Daten.
Öffnen: `index.html` (Galerie mit allen 24 Bildern und den drei Bewegungsfolgen). Jeder Screen ist auch als HTML da, Theme per `?theme=hell` oder `?theme=dunkel`.

| Inhalt | Ort |
| --- | --- |
| 24 Aufnahmen 1280×720 | `<richtung>/<screen>-<dunkel\|hell>.png` |
| 12 HTML-Screens | `<richtung>/{login,dashboard,chat,einstellungen}.html` |
| Bewegung je Richtung (4 Bilder + Abspielseite) | `<richtung>/motion/` |
| Übersicht maschinenlesbar | `manifest.json` |
| Tokens (generiert), Richtungs-CSS (handgeschrieben) | `<richtung>/tokens.css`, `<richtung>/style.css` |
| Gemeinsame Basis, Schriften, Lizenzen | `assets/` |
| Generator, Renderer, Prüfungen | `tools/` |

## Referenz: echte Oberfläche statt Name

Aufgenommen am 06.10.2026 mit dem unsichtbaren Prüfbrowser (Chrome for Testing 154), 1280×720, Maße direkt aus dem DOM gelesen (`tools/reference.mjs`, Bilder nur lokal unter `.out/reference/`, nicht im Repo).

- **Linear, `https://linear.app/`** – die Startseite bettet eine echte, im DOM gerenderte Produktoberfläche ein. Gemessen: Seitenleiste ca. 240 px, Navigationszeilen 28 px hoch, Inter Variable 13 px mit Gewicht 510, Abschnittslabels 12 px gedämpft, Kopfzeile ca. 44 px mit 12-px-Brotkrumen, Dokumenttitel ca. 20 px halbfett, Aktivitätszeilen 12–13 px. Hierarchie: Seitenleiste → Kopfzeile → Inhalt in einer ruhigen Spalte, Nebenpanel rechts. Text rgb(208, 214, 224) auf fast Schwarz.
- **Stripe Docs, `https://docs.stripe.com/dashboard/basics`** (deutsch) – für die schmale Ansicht: bei 390 px Kopfleiste ca. 64 px mit Menüknopf, eine Spalte, 24 px Seitenrand, Fließtext 16 px, Navigationszeilen 40 px, Brotkrumen brechen um, Überschrift ca. 30 px. Lineares eingebettetes App-Bild skaliert bei 390 px nur als Grafik und taugt dort nicht als Vorbild.

**Übernommen (angepasst, nichts kopiert):** Seitenleiste 236 px (Linie), ruhige Kopfzeilen, gedämpfte 12-px-Labels, Listen statt Kartenstapel, Nebenpanel für das Dokument. **Bewusst größer als Linear:** Grundschrift 14–15 px statt 13 px und Zeilen 40–48 px statt 28 px, weil die Demo auf Laptop und Beamer läuft und Pflegeangehörige keine Profi-Nutzer sind. **Schmal:** Kopfleiste mit Marke, Theme und Menü, eine Spalte, 16 px Rand, alle Bedienelemente mindestens 44 px, Dialogkarten in voller Breite. NoteTree wurde nicht verwendet.

## Drei Richtungen

Gemeinsam: ein semantisches Tokensystem (`tools/tokens.mjs`: `bg, surface, surface2, sunken, border, borderStrong, text, textMuted, accent, onAccent, accentText, accentSoft, danger, warning, success` mit `…Soft`, `marker, focus, bannerBg, bannerText, shadow`), dunkel als Standard und gleichwertig hell, Lucide als einheitliches Standard-Icon-Set, eigene SVG-Marken und Graffiti-Elemente, fiktive Familie Brandt, Sie-Ansprache, Banner „Demo – keine echten Daten eingeben“ auf jedem Screen.

### Linie – Graffiti sehr dezent

Linie ist die leiseste Richtung: ein grafitgraues Werkzeug im Stil moderner Arbeitsoberflächen. Dichte, präzise Listen mit Inter, eine klare Seitenleiste und ein kühles Iris-Violett für Aktionen. Graffiti gibt es nur als einen einzigen handgezogenen Friststrich unter der nächsten Frist und einen kleinen Haken beim erstellten Dokument. Für ein Publikum, das vor allem Ruhe, Tempo und Seriosität sehen soll.

- Schrift: Inter Variable. Farbe: Grafit, Iris-Violett, Amber nur für den Friststrich.
- Raster: Seitenleiste mit Personen, im Chat Icon-Leiste + Gesprächsliste + Dokument als Nebenpanel.
- Bewegung: **Friststrich**, 420 ms, Strich zieht sich unter „noch 9 Tage“.

### Klartext – Graffiti ausgewogen

Klartext wirkt wie ein sehr gutes Amtsportal, nur freundlicher: IBM Plex Sans mit Plex Mono für Daten und Fristen, Petrol als Vertrauensfarbe und eine waagerechte Navigation mit großzügigem Raster. Graffiti setzt gezielte Akzente: ein gelber Markerkreis um die dringendste Zahl, ein Klebestreifen auf „Entwurf“ und ein Haken, der sich beim Erstellen eines Dokuments selbst zeichnet. Für eine Präsentation, die Fachlichkeit und Wärme zugleich zeigen soll.

- Schrift: IBM Plex Sans, Plex Mono für Daten. Farbe: Petrol, Textmarker-Gelb.
- Raster: obere Navigation, Sachbearbeiter-Einstieg als breites Band, darunter Personen · Fristen · Dokumente.
- Bewegung: **Haken beim Erstellen**, 600 ms, Vorschlag kippt in „Bestätigt · Dokument erstellt“.

### Tagwerk – Graffiti etwas mutiger

Tagwerk ist die mutigste der drei Richtungen und trotzdem ein Arbeitswerkzeug: warmes Papier und Tinte, Bricolage Grotesque für markante Überschriften und Atkinson Hyperlegible Next für sehr gut lesbaren Text. Kobaltblau führt die Aktionen, ein Signalorange gehört allein dem Graffiti. Sprühpunkte und ein eigener Tag am Login, ein Stempel „Erstellt“ beim bestätigten Dokument und ein Markerkreis um die Frist. Für einen Auftritt, an den man sich nach der Vorführung erinnert.

- Schrift: Bricolage Grotesque (Überschriften), Atkinson Hyperlegible Next (Text). Farbe: Papier/Tinte, Kobalt, Signalorange.
- Raster: schmale beschriftete Leiste, großer Einstieg mit den letzten Gesprächen.
- Bewegung: **Stempel „Erstellt“**, 560 ms, ein Überschwingen.

Alle Bewegungen laufen genau einmal, haben keine Leerlaufschleife und werden bei „Bewegung reduzieren“ zu einer 150-ms-Einblendung. Je Ansicht höchstens ein Graffiti-Moment.

## Inhalte je Screen

- **Login:** E-Mail, Passwort, Anmelden (nur Mock), kein „angemeldet bleiben“, keine Selbstregistrierung, Abmeldung nach 15 Minuten ohne Aktivität (abgestimmt auf die Backend-Konfiguration).
- **Dashboard:** Personenkarten mit Pflegegrad, Pflegekasse, nächster Frist; Aufgaben nach Fälligkeit sortiert (09.10. → 15.10. → …), Widerspruchsfrist zusätzlich hervorgehoben; Dokumente mit Status Entwurf/geprüft/versendet; letzte Gespräche; großer Einstieg „KI-Sachbearbeiter fragen“.
- **Chat:** Gesprächsliste mit Suche und Archiv, Personenbezug, Modus, Modellwahl mit Region, „An Menschen übergeben“, Antwort mit Modellangabe und Quellen, bereits erstelltes Dokument, Bestätigungskarte mit lesbarer Entwurfsvorschau und Verwerfen/Bearbeiten/Entwurf erstellen, Ehrlichkeitshinweis.
- **Einstellungen:** Modus „Nur Auskunft“ / „Auskunft + Erstellen“ mit Hinweis auf serverseitige Durchsetzung und Abweichung je Gespräch, Persona/Systemprompt mit Versionen und „Auf Standard zurücksetzen“, Modelle mit Standard, Werkzeug/Bild-Fähigkeit, EU/US-Region (als Planungsangabe der Demo gekennzeichnet, Mistral „Einrichtung offen“), Demo-Hinweis-Schalter und Verweis auf die Datenschutz-Checkliste.

Keine Rechtsaussagen: Fristen stehen als „laut Bescheid“ oder „eigene Planung“, keine Beträge, Kasse und Praxis sind erfunden.

## Prüfung

Alle Befehle im Ordner `docs/mocks/`. Abhängigkeiten nur hier (`package.json`, `package-lock.json`): `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci`.

| Befehl | Was | Browser |
| --- | --- | --- |
| `node tools/build.mjs` | Fonts, Tokens, 12 HTML, 3 Bewegungsseiten, Galerie, Manifest erzeugen | nein |
| `node tools/check-source.mjs` | Vollständigkeit, lokale Verweise, Offline-Fonts + Lizenzen, Sprache `de`, Demo-Banner, Pflichtinhalte je Screen, keine Du-Ansprache, kein Emoji, keine Endlosanimation, reduzierte Bewegung, keine Schrift unter 12 px, Aufgaben-Sortierung, 114 Kontrastpaare (AA) | nein |
| `node tools/contrast.mjs --all` | Kontrasttabelle aller Token-Paare | nein |
| `node tools/render.mjs` | 24 Aufnahmen + 12 Bewegungsbilder; prüft dabei Höhe ≤ 720 px, kein Überlauf bei 1280/768/390, keine verdeckten Inhalte oder Knöpfe, Hauptspalten schmal voll breit, Text ≥ 12 px, Bediengrößen ≥ 44 px bei 390, Fonts geladen, keine Netzwerkanfragen, keine Konsolenfehler, Animationen endlich und ≤ 900 ms, reduzierte Bewegung schlicht | ja, genau einer |
| `node tools/check-png.mjs` | 36 PNG vorhanden, echte PNG, genau 1280×720 | nein |
| `sh tools/abort-test.sh` | Abbruchnachweis: blockierte Event-Loop, externer Wächter beendet Browsergruppe und Node | ja, kurz |
| `NARROW=1 node tools/render.mjs` | zusätzlich Schmalbilder 390 px nach `.out/narrow/` (nur lokal) | ja |

Prüfbrowser (`tools/browser.mjs`): nur Chrome for Testing aus `~/Library/Caches/chrome-for-testing/current/…` (`TEST_BROWSER_BIN` geht vor, persönlicher Chrome und Playwright-Browser werden abgelehnt), Hauptversion muss zum Nutzer-Chrome passen, `headless`, höchstens 1280×720, Playwrights Drosselungs-Flags (`--disable-background-timer-throttling`, `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows`, `--disable-ipc-flooding-protection`) werden entfernt und an der echten Prozesszeile geprüft. Der Lauf scheitert bei unbekannter PID, negativer Flagprüfung oder übrig gebliebenem eigenen Prozess. Abbruchschutz: interner Timer, Signal-Handler und ein externer Wächterprozess in eigener Prozessgruppe, der die Browsergruppe auch bei blockierter Event-Loop beendet.

## Noten (eigene Bewertung, 1–10)

Vorher = erster vollständiger Renderlauf, nachher = aktueller Stand. Gleiche Note für dunkel und hell, beide Themes einzeln angesehen.

| Screen | Linie | Klartext | Tagwerk |
| --- | --- | --- | --- |
| Login | 8 → 9 | 8 → 9 | 8 → 9 |
| Dashboard | 6 → 9 | 6 → 9 | 6 → 9 |
| Chat | 5 → 9 | 5 → 9 | 4 → 9 |
| Einstellungen | 6 → 9 | 6 → 9 | 7 → 9 |
| Bewegung | 9 → 9 | 9 → 9 | 7 → 9 |
| Schmal (768/390) | 4 → 9 | 4 → 9 | 4 → 9 |

Was die Vorher-Noten drückte: Seiten 30–100 px zu hoch, Bestätigungskarte samt Aktionen abgeschnitten, Tagwerk-Dokumentkarte zu einem Streifen gequetscht, Wortbrüche in der Tagwerk-Leiste, gekürzte Dokumenttitel, Aufgaben nicht nach Fälligkeit sortiert, in schmalen Ansichten überschrieben Desktop-Raster die Basis (Chat und Tagwerk-Login zerbrochen), Stempel verdeckte Text.

## Grenzen

- Mocks sind statisch. Theme-Schalter und „Einmal abspielen“ funktionieren, sonst keine Interaktion.
- Telefon/Tablet sind gemessen und für 390 px per Bild angesehen, aber nicht auf echten Geräten geprüft. Schmale Ansichten zeigen keine eingeklappte Gesprächsliste und keinen geöffneten Menü-Zustand.
- Screenreader nicht mit echter Sprachausgabe getestet; geprüft sind Struktur, Beschriftungen, Fokusringe und Kontraste.
- Modellnamen und Regionen sind Demo-Planungsangaben, keine Zusagen.
- Fokuszustand ist sichtbar nur im Login-Mock (E-Mail-Feld) gezeigt; `:focus-visible` gilt überall.

## Lizenzen

Schriften unter SIL Open Font License 1.1 (`assets/fonts/*/OFL.txt`): Inter, IBM Plex Sans/Mono, Bricolage Grotesque, Atkinson Hyperlegible Next. Icons: Lucide, ISC (`assets/LUCIDE-LICENSE.txt`). Marken, Striche, Stempel, Sprühpunkte und Tags sind eigene SVGs (`tools/art.mjs`).
