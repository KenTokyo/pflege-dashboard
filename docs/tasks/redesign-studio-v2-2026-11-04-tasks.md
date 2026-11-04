# Redesign Studio V2: Chat zuerst, Grau + Beerenrot, leichte Tabelle

## Initial goal

Das Pflege-Dashboard komplett neu gestalten wie die aktuelle Kundenansicht von Service OALab: neutrales Grau,
Beerenrot statt Orange, dunkle Tonknöpfe, Hell- und Dunkelmodus, Chat als Startfläche mit Übersicht per Morph,
Tabelle statt Kalender, Pflege-Figur über dem Eingabefeld, nur Blur-Fade-Bewegung. Skill dazu als V2.

## Improved prompt

# PFLEGE-DASHBOARD V2 — chat-first care workspace, calm grey, berry red

Rebuild the whole look of the Pflege-Dashboard (Tagwerk surface) so it reads like the current **Service OALab
customer view** — `@"/Users/kentoky/Documents/React Projects/oalab/service-oalab"` (pulled 04.11.2026, see
`apps/web/app/styles/workspace/` and `apps/web/features/client-workspace/`) — at the level of Linear: quiet,
dense, precise. The rules live in skill **`studio-linear-ui-v2`**
(`/Users/kentoky/Documents/React Projects/notetree-tanstack/.treechat/skills-laden/studio-linear-ui-v2/`), built
from `/studio-linear-ui` and the pulled OALab code. Everything works as before; only form, layout and motion change.

## Colour
The user likes **the grey of OALab** (image 2) — take its neutral surfaces for dark and light. **No orange**: the
single accent is a **berry red** like the health-insurance site in image 4 (`#a3245a` light, `#ee7c9c` dark; blue
is the only allowed alternative). **Buttons are dark** like the „Anfrage senden“ button in image 3: in dark mode a
deep berry tone with light berry text, never a glowing block; in light mode solidly filled. **A real light mode**
next to dark, each designed on its own. The current colours (image 1) are out.

## Chat first
Like image 2, the app opens on **„Neues Gespräch“**: left sidebar with brand, „Neues Gespräch“, **directly under it
„Übersicht“** which opens the dashboard with a **morph** from that row, then search and the conversations in groups.
The separate conversation column and icon rail of image 5 disappear into this one sidebar. In the main area the new
conversation: a **care character** in a calm circle with a speech bubble greeting the user, the composer below.

## The care character
An original, stylised 3D-rendered carer (images from GPT-6 Luna in `docs/design/figur/`), three poses with the same
camera: greeting, **looking down at the input while the user types**, thinking while the answer streams. Switching
is a soft crossfade only; in an open conversation the character sits small beside the composer.

## Overview
**No calendar** (image 1's week board is out): a **light table** of open items and deadlines — status symbol, what,
person, kind, due date with overdue in red — plus quiet person rows and the ask-the-assistant entry. Readable at a
glance, hairline rows, nothing colourful without meaning.

## Motion
The current motion is **too strong**. **Only blur-fade waterfall**: content sharpens in from a slight blur, top to
bottom, 40 ms apart; loading as shimmer or fade. No camera moves, springs, pops, sliding ink. Also written into
the V2 skill.

## Hit these bars
Dark and light at 1920×1080 and 390 px phone, side by side with OALab image 2: same grey, same edge, same row
heights, dark berry buttons. New conversation in one click, overview in one click. AA contrast everywhere.
Existing checks green. Quality: every part gets the highest level, nothing quick on the side; worse than the
OALab reference means not done.

## What would look cheap — avoid it
Bright neon buttons on dark; orange; a week grid with coloured tiles; cards with drop shadows; bouncing or flying
transitions; a stock-photo or clip-art nurse; a character that wobbles in idle; two navigations side by side.

Think OALab's customer view meeting a calm care app — make it the version every later screen is measured against.

Bilder des Nutzers: Bild 1 `.notedrill/chat-bilder/2026-11-04/clipboard-134118.png` (altes Dashboard),
Bild 2 `…/clipboard-134125.png` (OALab Neues Gespräch), Bild 3 `…/clipboard-134137.png` (dunkler Knopf),
Bild 4 `…/clipboard-134144.png` (BITMARCK, Farbe/Hellmodus), Bild 5 `…/clipboard-134321.png` (alte Gesprächsseite).
Bauer: Claude Opus 5.5, Denkstufe High. Bilder: GPT-6 Luna (Codex), Denkstufe High, höchstens fünf gleichzeitig.

## Gemeinsames (Besitz und Schnittstellen)

- **Bauer A (Shell + Chat):** `src/styles/tokens.css`, `src/styles/app.css`, `src/styles/controls.css`,
  `src/motion/`, `src/components/` (außer neue Dateien von B), `src/app/`, `src/routes/chat/`, `ChatPage.tsx`,
  `ChatRoute.tsx`, `LoginPage.tsx`, `SettingsPage.tsx`, `public/figur/`.
- **Bauer B (Übersicht + Seiten):** `src/routes/DashboardPage.tsx`, `src/routes/dashboard/`, `DocumentsPage.tsx`,
  `TasksPage.tsx`, `StaffPage.tsx`, `src/staff/`, `src/styles/week.css`, `src/styles/staff.css`, neue eigene
  CSS-Dateien `src/styles/overview.css` u. a. (nicht `app.css`/`tokens.css` ändern; Bedarf an A melden).
- Routen: `/` = Neues Gespräch (A), `/uebersicht` = Übersicht (A legt Route an, B füllt `DashboardPage`).
- Bewegung: Container mit Klasse `fx-fall`, Kinder mit `style={{ '--i': n }}` (A baut die Klasse in
  `src/motion/motion.css`). Keine `motion`-Varianten/Federn mehr.
- Nur bestehende Token-Namen nutzen; A ändert Werte, nicht Namen (neue Namen nur ergänzen).
- `src/instrument/` bleibt unangetastet. Keine Commits durch Bauer; Leiter committet.

## Phasen

- [x] 1 Doku: Service OALab gepullt, Skill V1 geprüft, Skill `studio-linear-ui-v2` angelegt und synchronisiert.
  Ergebnis: V1-Tokens stimmen mit OALab; neu in OALab seit V1: Begrüßungsfigur (Omed) über neuem Gespräch,
  „denkt mit“ neben dem Eingabefeld, Gesprächsgruppen in der Seitenleiste.
- [x] 2 Bilder (GPT-6 Luna ×2): Figur A Pflegefachfrau, Figur B Pfleger, je 3 Posen → `docs/design/figur/`.
  Stand: alle vier Chats durch App-Ende unterbrochen; je 01 lag vor. **Gewählt: A** (stilisierter, näher an
  OALab-Omed, ruhiger Ausschnitt); B nicht fortgesetzt. A erzeugt 02/03 nach; Bauer A/B neu angestoßen.
- [x] 3 Bauer A: Tokens, Shell, Chat zuerst, Figur, Bewegung, Login/Einstellungen.
  Ergebnis: `/` = Neues Gespräch mit Figur (3 Posen, Überblendung), eine Seitenleiste, Grau + Beerenrot, Blur-Fade.
  `src/components/Shell.tsx`, `src/routes/chat/NewChat.tsx`, `src/components/CareFigure.tsx`
- [x] 4 Bauer B: Übersicht mit leichter Tabelle, Dokumente, Aufgaben, Sachbearbeiter-Test.
  Ergebnis: Wochenkalender entfernt, Fristen-Tabelle mit Segment, Personen-Tabelle.
  `src/routes/dashboard/DeadlineTable.tsx`, `src/routes/dashboard/OverviewPanels.tsx`, `src/styles/overview.css`
- [x] 5 Leiter: Abnahme (Checks, je Fläche ein Bild hell/dunkel), Commit, Push.
  Ergebnis: `npm run check` grün (nach Auslagerung `src/instrument/rahmen/tips.css`, Schrift 12 px; Instrument-Links
  „Übersicht“ → `/uebersicht`). Harness lädt jetzt `public/` (Figur fehlte in Prüfbildern). Offen: `npm run shots`
  erwartet noch Dashboard nach Login und alte Hauptnavigation.
