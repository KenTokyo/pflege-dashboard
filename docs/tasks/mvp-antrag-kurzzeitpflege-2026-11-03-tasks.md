# MVP-Funktionen: Antrag Kurzzeitpflege, Status, KI-Pflegeassistent, Leistungen

## Initial goal

Aus einem Gesprächsmitschnitt (Projektvorstellung MVP-Funktionen 2–7) die echten Anforderungen herausfiltern und das
Pflege-Dashboard damit erweitern – Technik bleibt (Supabase/Postgres, Node-Server, Tagwerk). Dazu: Profile der
Pflegebedürftigen mit erzeugten Bildern, deutlich bessere Beispieldaten und -texte, Hilfe-Popups, die zeigen, wie die
KI arbeitet, und die KI-Funktionen aus dem NoteTree-Chat „KI-Chat: Harness-Fehler „Verbindung weg“ und „Datei erneut
lesen“ beheben“. Erst den Prompt verbessern und ausgeben, dann bauen.

Quelle: `.notedrill/chat-texte/2026-11-03/wir-verpassen-derzeit-auch-nachricht.md` (Mitschnitt + Wünsche des Nutzers).
Bauer: GPT-6 Luna (Codex), Denkstufe High – `treechat_create_thread`: provider `"codex"`, model `"gpt-6-luna"`,
options `{"reasoningEffort":"high"}`. Er erzeugt auch die Beispielbilder der Pflegepersonen und komprimiert sie.

## Improved prompt

# PFLEGE-DASHBOARD MVP — apply for short-term care from the sofa, track it like a parcel, ask the AI anything

Extend the existing **Pflege-Dashboard** (Tagwerk design, Supabase Postgres/Auth/Storage, Node server on Vercel —
**keep this stack, no rewrite, no Edge Functions**) with the MVP functions an insurer's customer workshop asked for. The
bar: a relative opens it on **Saturday evening on the sofa, files an application in under five minutes, and always
knows where it stands** — calm and trustworthy like Apple Wallet, as precise as Linear. **Fictional data only.** A few
functions finished and real beat many half done; nothing the UI claims may be faked.

## What the meeting actually asked for (filtered)

The source is a spoken transcript; meeting chatter, names and slide navigation are dropped. Function 1 is not in the
transcript — do not invent it. The functions are:
- **F2 – Less dependence on third-party programs** (e.g. "Atacama"): customers want everything in one place. Here this
  means: application, status, benefits and help live in this app, no hand-off to other tools.
- **F3 – Online application,** limited first to **Kurzzeitpflege** as the **blueprint** that later scales to other
  benefits. Ask only for information that is **strictly required**; **prefill everything already known** (the transcript
  says from the insurer's core system "21C"; here: from the stored care-recipient profile, contacts and Pflegegrad).
- **F4 – Status tracking "like DHL":** at least *übermittelt → in Bearbeitung → genehmigt / abgelehnt → Bescheid
  versandt*, each step with date and time.
- **F5 – AI care assistant** with two skills: (1) **chat-guided application** — the AI walks the person through the
  Kurzzeitpflege application by asking questions, step by step; (2) **knowledge on Kurzzeitpflege** at any moment, also
  without an application in progress.
- **F6/F7 – Status quo of the old dashboard:** which benefits the person **has used, how much, and the maximum
  entitlement** — ambulant benefits in status *genehmigt/freigegeben, nicht storniert*. Here from Supabase instead of
  the old REST services.

## The application (F3)

A short, warm form wizard: **at most 5 steps, one question group per screen**, progress line on top, every prefilled
field marked "aus Ihren Angaben" and editable. Required data only: who needs care, period (from/to, nights counted
live), facility (name, address — free text is fine), reason (e.g. after hospital, carer on holiday), who applies (self /
Bevollmächtigte*r) and consent. Summary screen before sending; sending writes a real `applications` row plus a first
status event. Drafts survive reload. Validation is friendly and specific ("Das Ende liegt vor dem Beginn"), never red
walls. Amounts and limits (e.g. the Kurzzeitpflege yearly amount) come **only from a dated, sourced table** (SGB XI
§ 42, current version) — **never invented**; shown with "Stand" and source link.

## Status tracking (F4)

A vertical **timeline like a parcel tracker**: done steps solid, current step pulsing once on arrival (then still), next
steps hollow, each with timestamp and one plain sentence ("Ihre Pflegekasse prüft den Antrag. Das dauert meist …" only
if sourced). The dashboard shows a compact status pill per open application. **Demo-able for real:** in the existing
*Sachbearbeiter-Test* view a caseworker moves an application to the next state (with an optional note / rejection
reason); the customer view updates. Every change is an `application_status_events` row and an audit-log entry — **no
timers that fake progress.**

## AI care assistant (F5)

- **Chat-guided application:** the assistant asks one thing at a time, reuses known data, shows a **live draft card**
  of the application filling up, and ends with a **confirmation card** (preview → confirm or edit). Only after
  confirmation is the application written — **through the same server path as the form**, no second logic.
- **Mode "Nur Auskunft" is enforced on the server:** the create tool is not sent to the model at all.
- **Knowledge:** Kurzzeitpflege questions answered with source and date; it says when it is unsure, points to the
  Pflegekasse / Pflegestützpunkt, never invents deadlines or amounts.
- **Robust like the NoteTree harness** (take these from the NoteTree chat named above, read its task file
  `/Users/kentoky/Documents/React Projects/notetree-tanstack/docs/ai-integration/tasks/ki-harness-abbrueche-2026-11-03-tasks.md`
  for **ideas only, no copied code**): if the provider stream breaks mid-answer, **retry after 5, 10, 15 s**; partial
  text is replaced, **a write action runs at most once** (idempotency key). Distinguish "provider dropped" from "your
  connection dropped". After repeated provider drops **offer "Mit Gemini weitermachen"** as a button (an automatic
  switch only behind a clearly labelled setting, default off — the project forbids silent provider fallback). Visible
  **plan** of the steps the assistant will take, a calm **thinking/writing indicator**, **copy** on every answer.

## Benefits overview (F6/F7)

Per care recipient: each ambulant benefit (Pflegesachleistung, Entlastungsbetrag, Verhinderungs-/Kurzzeitpflege …)
as a row with **used / maximum / remaining** for the current period, a bar that fills on entry, and the list of the
underlying approved, non-cancelled measures on click. Counted from data, never hard-coded. Empty and loading states.

## Care-recipient profiles with portraits

Several believable fictional care recipients (different Pflegegrade, living situations, insurers, open applications in
different states), each with a **generated portrait**: warm, natural, documentary photo look, different ages and
backgrounds, **visibly marked "KI-Bild · fiktiv"**. Compressed to WebP (≤ 60 KB at 512 px, plus a small thumbnail).
The profile is **editable and visible**: name, Pflegegrad, address, contacts, notes, portrait replaceable by upload
(private Storage bucket, signed URLs, size/type checked).

## Much better sample data and texts

Rewrite seed data and example prompts so each one shows **what happens in the background**: e.g. an example card says
"Liest Pflegegrad und Kasse aus dem Profil → füllt den Antrag vor → fragt nur Zeitraum und Einrichtung". Seed is
additive and idempotent; the existing account and data stay. Plain, warm German with "Sie".

## Help popups: how the AI works

A glass-style **"So arbeitet die KI"** popup reachable from chat and application: the real pipeline as an animated
step diagram — sign-in check → load profile from the database → model (name, region) → tool proposal → your
confirmation → saved → audit log — each step linked to what really happened in the current conversation (existing
technical activity data). Small **ⓘ popovers** on every term (Kurzzeitpflege, Pflegegrad, Bescheid, Nur Auskunft) and on
every status. A **developer layer** (toggle) shows the sanitised JSON per step so team members learn how it works.
**No raw chain-of-thought, no secrets.**

## Hit these bars

- Kurzzeitpflege application end to end via form **and** via chat, both producing the same row; status moved by the
  caseworker view appears for the customer; benefits sum correctly from seed data.
- Retry tested with a simulated provider break (5 cases), write action never doubled.
- Every new screen at 1920×1080 in dark and light, AA contrast, keyboard usable, mobile usable; motion staggered, then
  still. Typecheck (`tsc-rs`), tests and the live Vercel flow with the existing demo account green.
- Quality (always, also for side parts): highest level; compare with the current best Tagwerk screens side by side —
  worse is not done.

## What would look cheap — avoid it

A 20-field government form; a status bar that advances on a timer; amounts typed into the code; stock avatars or
cartoon faces; help text as a grey wall; a "thinking…" spinner that hides what happens; a chat that silently switches
model; lorem-ipsum seed ("Test Person 1").

Think DHL tracking meets Apple Wallet, filed from the sofa in five minutes — make it the demo the insurer wants to ship.

## Phase 0 – Prompt verbessern und ausgeben (Planung) [x]
Ergebnis: dieser Prompt; Mitschnitt gefiltert, F1 fehlt im Mitschnitt.

## Phase 1 – Daten und Schema (Backend) [ ]
Lesen: `supabase/migrations/`, `supabase/seed.sql`, `docs/api-contract.md`. Tabellen `applications`,
`application_status_events`, Leistungs-/Anspruchstabelle mit Quelle und Stand, Profilfelder + Porträt; RLS; Seed.

## Phase 2 – Porträts erzeugen und komprimieren (Bild, Bauer Luna) [ ]
Mehrere fiktive Pflegepersonen, WebP ≤ 60 KB, Kennzeichnung „KI-Bild · fiktiv“; Profil bearbeiten + Upload.

## Phase 3 – Antrag Kurzzeitpflege + Statusverfolgung (Frontend + Backend) [ ]
Skills: app-ui-graffiti, animation, leise-ui. Formular-Assistent, Zeitleiste, Sachbearbeiter schaltet Status.

## Phase 4 – KI-Pflegeassistent (Backend + Frontend) [ ]
Lesen: `api/chat-stream.ts`, NoteTree-Aufgabendatei oben. Geführter Antrag mit Bestätigungskarte, Wissen, Retry,
Gemini-Knopf, Plan, Denk-Anzeige, Kopieren.

## Phase 5 – Leistungsübersicht F6/F7 + Beispieltexte + Hilfe-Popups (Frontend) [ ]
Skills: app-ui-graffiti, animation, layout-lens. `src/routes/chat/questionExamples.ts`.

## Phase 6 – Prüfung, Live-Abnahme, Commit und Push [ ]
