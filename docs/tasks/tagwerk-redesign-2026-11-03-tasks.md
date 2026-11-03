# Tagwerk-Redesign: kühle Farben, aufklappbare Seitenleiste, Bewegung

## Initial goal

Tagwerk wirkt zu warm. Bessere, kühlere Farben und ein moderneres Layout (Seitenleiste aufklappbar, Feinschliff),
dazu Animationen für Reiter- und Seitenwechsel – alles im Tagwerk-Design abändern. Orientierung: `studio-graffiti`
und `studio-linear-ui`.

## Improved prompt

# TAGWERK — cool studio palette, collapsible sidebar, cinematic motion

Redesign the **Tagwerk** surface of the Pflege-Dashboard (`src/styles/`, `src/components/Shell.tsx`, Tagwerk pages under
`src/routes/`) so it reads like a top-tier work app — **Linear-level calm, Studio-Graffiti colour with meaning**. The
current palette is **too warm** (brown-beige neutrals, orange banner); replace it. Instrument stays untouched.

## Colour

Cool graphite neutrals instead of brown: dark is its own design (surfaces only 3–8 % apart, hairline borders), light is
a cool off-white, not inverted. One accent (indigo/violet) for primary action, focus, selection; **lime** as the single
graffiti marker colour (tape, hand marks). Status colours stay semantic. All text pairs keep **AA contrast**
(`check:source`).

## Layout

**Collapsible sidebar** (Linear-style): expanded with icon + label rows, collapsed to an icon rail, toggle button and
keyboard shortcut, choice remembered on the device, tooltips when collapsed. Shell persists across pages (no remount
on navigation). Tighter, calmer page heads, hairline cards, consistent gutter.

## Motion

Follow skill `animation` (Shardfall springs): page/tab switch as a camera move with direction from nav order; active
nav marker and segmented controls glide (shared layout ink); hover lift / press squash on every control; cards fly in
staggered on page enter; dialogs dolly in and out. Exit shorter than enter, transform/opacity only, rest after ≤ 800 ms,
no replay on re-render.

## Hit these bars

- Dark and light at 1920×1080: no warm brown left; ≥ AA contrast; nothing overflows.
- Sidebar collapses/expands smoothly, remembered after reload, works by keyboard.
- Ten fast nav clicks → exactly one page in the DOM, no leftover transform; idle afterwards.
- Quality (always, also for side parts): highest quality, compare with the previous state side by side.

## What would look cheap — avoid it

Grey-in-grey with no meaning, warm beige leftovers, stock `ease` fades, everything popping at once, width-jumping
sidebar without motion, Lucide-default look in an otherwise custom UI.

Think Linear's sidebar with Studio-Graffiti's lime ink — calm, fast, unmistakably crafted.

## Phase 1 – Farben (Frontend) [x]
Lesen: `src/styles/tokens.css`, `tools/check-source.mjs`. Skills: studio-linear-ui, studio-graffiti.
Ergebnis: Graphit statt Braun, Indigo-Akzent, Lime-Marker, Bereichsfarben `--hue-*`, Schrift Geist + Geist Mono (Atkinson/Bricolage entfernt), Gewichte 600 statt 700. AA-Kontrast beider Themes bestanden. `src/styles/tokens.css`

## Phase 2 – Rahmen: Seitenleiste aufklappbar, Shell bleibt stehen (Frontend) [x]
Lesen: `src/components/Shell.tsx`, `src/routes/AppGate.tsx`, Seiten mit `<Shell>`.
Ergebnis: `TagwerkFrame` hängt in AppGate (kein Neuaufbau je Seite); Leiste 232/64 px, Knopf + Taste `[`, Wahl im ThemeProvider gespeichert, Tooltips eingeklappt, Kontomenü als Popover mit Anker; eigene Symbole `NavIcon`. Instrument unverändert. `src/components/Shell.tsx`, `src/components/NavIcon.tsx`

## Phase 3 – Bewegung: Seitenwechsel, Tinte, Mikro, Einflug, Dialoge (Frontend) [x]
Skill: animation. Vorlage `shardfall/src/ui/motion/`.
Ergebnis: View Transition `tg-page` mit Richtung aus Navigationsreihenfolge (Router `defaultViewTransition`), Tinte per `layoutId` (Leiste, Handy-Leiste, Umschalter), Hover/Druck-Hörer, `.mo-fly`-Einflug, Dialog-Dolly per `@starting-style`, Seitenleiste per FLIP. Offen: CaseDialog und Frage-Dialog aus der Sachbearbeitung werden beim Schließen ausgehängt (keine Ausfahrt). `src/motion/`

## Phase 4 – Prüfen (Node, Bilder 1920×1080 dunkel/hell), Commit + Push [x]
Typecheck, Lint, 248 Tests, Build, Bundle grün. `check:source`: Tagwerk grün; zwei alte Instrument-Fehler aus 3d58325 (`rahmen.css` 429 Zeilen, 10,5 px) unverändert. Bewegungsprüfung (Chrome for Testing 156, 1920×1080): 10 schnelle Klicks → 1 `main`, keine Rest-Verschiebung, Leerlauf 0 Animationen; Menü, Tooltip, Taste `[`, Dialog auf/zu geprüft.

## Folgeauftrag: Übersicht als Tagesplan mit Einzeichnungen

Vorschlag umsetzen: Fristen der Woche als Wochenband (Tage, Farbe je Person), Überfälliges mit rotem Handkreis,
Erledigtes mit Lime-Haken (Studio Graffiti), Leerraum rechts nutzen.

## Phase 5 – Wochenplan in der Übersicht (Frontend) [x]
Lesen: `src/routes/DashboardPage.tsx`, Skill studio-graffiti (Stundenplan-Regeln).
Ergebnis: Karte „Diese Woche“ über volle Breite: Noch offen · Mo–Fr · Wochenende · Später; Fristen, Dokumente und
Gespräche der Woche als Einträge in Personenfarbe; ein Handkreis um die älteste offene Frist, Haken hinter
versendeten Schreiben (≤ 3), Marker-Strich unter heute, ein Tag „KW“. Einmaliger Auftritt, danach 0 Animationen.
Handy: Tage untereinander, leere Tage außer heute ausgeblendet, kein Überlauf (390 px). „Heute“-Spalte rechts
entfällt: die Wochenkarte füllt die Breite und markiert heute selbst. Monoschrift-Fehler behoben (Theme-Variable
zeigte auf sich selbst). `src/routes/dashboard/WeekBand.tsx`, `src/styles/week.css`
