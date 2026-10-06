# Pflege-Dashboard: KI-Sachbearbeiter rund um die Uhr

Build me the most polished, trustworthy **care dashboard** you can create, working title **Pflege-Dashboard**.

The idea: the person who manages care for a relative (Bevollmächtigte*r, Betreuer*in, pflegende Angehörige) chats with an **AI caseworker (KI-Sachbearbeiter)** that is reachable 24/7.
- It answers questions about care: Pflegegrad, Pflegekasse, Entlastungsbetrag, Verhinderungspflege, Fristen and Widersprüche.
- It can **create things**: letters, applications, objections, tasks and notes.
- A setting can restrict it so it **only answers** and never creates anything.

I want to present this in my company as a demo. It has to look and feel like a serious, modern product, not a hackathon toy.

This is a **complete new build**: its own repo and its own Supabase database. NoteTree is inspiration only. Do not copy or reuse its code.

---

## 1. Users and access

- **For now, anyone with the login data may use it.**
  - Use Supabase Auth with email + password and turn public sign-up **off**.
  - I create the login(s) myself in the Supabase dashboard. Agents never create accounts and never enter credentials.
- All logged-in users see the same workspace (demo phase). The data model must still carry `workspace_id` and `created_by` on every row, so we can add real roles and separate workspaces later without a rewrite.
- Logout, session timeout after inactivity, no "remember me" by default.

## 2. Features

### 2.1 Dashboard (home)
- **Care recipients (Pflegebedürftige).** A card per person showing name, Pflegegrad, Pflegekasse and the next deadline.
- **Open tasks and deadlines,** sorted by urgency. Widerspruchsfrist countdowns are visually prominent.
- **Recent documents** created by the agent, with status: Entwurf, geprüft, versendet (marked manually).
- **Recent conversations,** plus a big "Frag den Sachbearbeiter" entry point.

### 2.2 Chat with the KI-Sachbearbeiter (the core)
- Streaming answers, markdown, a conversation list, rename, archive and search.
- Every chat can be linked to a care recipient. The agent then knows that person's facts: Pflegegrad, Kasse, open tasks, documents.
- Uploads: PDF and image (e.g. a letter from the Pflegekasse). The agent reads them and can refer to them.
- **Creating things works through tool calls with a confirmation card:**
  - The agent proposes, for example: "Widerspruch gegen Bescheid vom 12.09. – Entwurf erstellen?"
  - The card shows the preview, and I confirm or edit.
  - Only then is a record written.
- What it can create:
  - letter or application (Antrag auf Höherstufung, Widerspruch, Antrag Verhinderungspflege, Abrechnung Entlastungsbetrag, free-form letter)
  - task with deadline
  - note on a care recipient
- Documents open in an editor view. Export to **PDF and DOCX**, with sender and recipient blocks filled from the stored data.
- **Hand over to a human.** A button (and an agent tool) creates an escalation task with a summary of the conversation. The agent offers it on its own whenever something is legally binding, medical, urgent or unclear.
- **The agent's honesty rules** (in the system prompt and visible in the UI):
  - no binding legal or medical advice
  - it says when it is unsure
  - it points to the official source (SGB XI, Pflegekasse, Pflegestützpunkt)
  - it never invents deadlines or amounts

### 2.3 Agent settings
- **Mode:** "Nur Auskunft" or "Auskunft + Erstellen". It can be set per workspace (default) and overridden per chat.
  - Enforce it **on the server**: in answer-only mode the create tools are never sent to the model at all. A prompt instruction alone is not enough.
- **Persona and system prompt:** editable, versioned, with a "reset to default" button. The default is a polite, precise German caseworker who uses "Sie".
- **Knowledge (phase 2):** upload reference documents (e.g. internal guidelines, Merkblätter), chunked into pgvector, retrieved with source citations in the answer.

### 2.4 Model picker
- The AI model is selectable: a workspace default, plus a per-chat switch in the chat header.
- Keep it **simple**. A `ai_models` table or config lists the models: provider, model id, display name, hosting region badge (EU/US), whether it supports tools and vision, and enabled yes/no.
- Providers: Anthropic and OpenAI first. Add an EU-hosted option if feasible (e.g. Mistral, or a provider's EU endpoint), because for care data the hosting region matters.
- Build a thin provider adapter in the backend: one interface, one adapter per provider, with streaming and tool calls normalised.
- The UI shows which model answered each message.
- Look at NoteTree business (`/Users/kentoky/Documents/React Projects/notetree-tanstack`) for **inspiration only**, e.g. how a model picker can feel. Do not copy files, do not import from it, do not mirror its complexity.

### 2.5 Audit log
- Every agent action is logged: who, when, which chat, which model, which tool, what was created or changed.
- An admin view lists it with filters. Token usage and cost per model go there too, as a simple sum per day.

## 3. Backend and data (Supabase)

- **Region:** EU (Frankfurt). I create the hosted project myself. Prepare the step-by-step instructions for me.
- **Local development:** Supabase CLI (`supabase start`) with migrations in `supabase/migrations`, seed in `supabase/seed.sql`, and generated TypeScript types.
- **Tables (a starting point; refine it):**
  - `workspaces`, `profiles`
  - `care_recipients`, `contacts` (Pflegekasse, Arzt, Pflegedienst)
  - `conversations`, `messages` (role, content, model, tokens, tool calls)
  - `documents` (type, status, content JSON + rendered text), `document_versions`
  - `tasks` (due date, priority, source chat), `notes`
  - `attachments` (Storage bucket, private)
  - `ai_models`, `agent_settings` (mode, prompt versions)
  - `audit_log`
  - later: `knowledge_chunks` (pgvector)
- **RLS on every table.** Rows are visible only to authenticated members of the workspace. Write tests for the policies.
- **AI calls only in Supabase Edge Functions:**
  - The function streams to the client.
  - Provider keys live only in function secrets and never reach the browser.
  - The function loads chat context, filters the tools by mode, executes confirmed tool calls in a transaction and writes the audit log.
- **Rate limits** per user, and a hard monthly cost cap per workspace (configurable).
- **Keys:** I put provider keys and the Supabase access token into a local env file that is git-ignored. Never print, log or commit them.

## 4. Data protection: be honest, not decorative

Care data is health data (Art. 9 GDPR). For the demo:
- Use **fictional data only**. The seed has a believable fictional family (e.g. Mutter mit Pflegegrad 3, Widerspruch läuft, Verhinderungspflege geplant). A visible "Demo – keine echten Daten eingeben" banner stays on until I turn it off.
- Write `docs/datenschutz-vor-echtbetrieb.md`, a checklist for before real data is used:
  - AVV/DPA with Supabase and every AI provider
  - EU hosting / no training on data
  - DSFA (DPIA)
  - personal logins instead of a shared login
  - deletion concept and access log
- The shared login is acceptable for the demo only. Say so clearly in the doc.

## 5. Design

- **Highly modern and serious:** think a premium SaaS dashboard (Linear, Stripe, Vercel level).
  - calm grid, strong typography, generous whitespace
  - precise data tables and cards
  - no clutter, no stock illustrations, no emoji
- **Dark mode by default, plus a polished light mode.** A toggle stores the choice and respects the system setting on first visit. Both themes come from one token set, and neither is an afterthought.
- **Light graffiti motion design as an accent, never as noise:**
  - hand-drawn SVG marker strokes that draw themselves: underlining a deadline, circling an urgent number, a check mark when a document is created
  - a spray-dot texture or tag on the login and on empty states
  - a stamp-like slam when a document is confirmed
  - a tape-strip label on "Entwurf"
  - at most one graffiti moment per view at a time; content always wins
- **Motion quality:**
  - purposeful and fast (150–400 ms for UI, up to ~900 ms for the hero moments)
  - one overshoot spring, staggered list entrances, numbers rolling up, a smooth streaming text reveal
  - no endless idle loops
  - `prefers-reduced-motion` turns it all down to simple fades
- **No Three.js,** no WebGL. Use SVG + CSS + one motion library (e.g. Motion).
- Draw our own SVG strokes, tags and icons where they carry the brand. A clean, consistent icon set is fine for standard UI icons.
- Responsive: desktop first (presentation on a laptop/beamer), fully usable on tablet and phone.
- UI language German, and accessible: contrast AA in both themes, keyboard navigation, focus states and screen-reader labels.

## 6. Tech

- Vite + React + TypeScript (strict), TanStack Router + Query, Tailwind with CSS variables as design tokens, Motion, Supabase JS.
- Supabase: Postgres, Auth, Storage, Edge Functions (Deno), pgvector later.
- PDF/DOCX export: a well-supported library and a clean letter layout (DIN 5008 style).
- Tests:
  - Vitest for logic
  - RLS policy tests
  - Edge Function tests with a mocked provider (streaming, tool calls, mode filter, audit log)
  - a Node smoke test of the whole chat → confirm → document flow against local Supabase
- Project folder: `/Users/kentoky/Documents/React Projects/pflege-dashboard`. Run `git init` there and copy this file to `docs/anforderungen.md`. Commit per verified milestone. Push and deploy verified changes within the authorized project scope; the user removed the previous push restriction on 2026-10-06.
- Deployment (phase 3): a static frontend on Vercel or Netlify plus hosted Supabase. Prepare everything. I do the account and project steps.

## 7. Order and gates

- **Phase 0 – Mock designs first. Nothing gets built before I pick one.**
  - The frontend agent creates **3 design directions**. All three are serious and modern. They differ in how strong the graffiti accent is and in typography and colour.
  - Each direction covers 4 screens: Login, Dashboard, Chat with a confirmation card and a created document, and Settings with the mode switch and model picker.
  - Each screen comes in **dark and light**. That makes 3 × 4 × 2 = 24 images.
  - Build them as static HTML mocks with real-looking German demo content, then render them to PNG at max 1280×720 (test-browser rules below). Add one short motion clip or frame strip per direction for the hero graffiti moment.
  - Save them to `docs/mocks/<richtung>/`. **Send them to me in the chat** with a one-paragraph pitch per direction. Then **stop and wait for my choice.**
  - In parallel, the backend agent may build the schema, RLS, local Supabase and the API contract (`docs/api-contract.md` + generated types). It builds no UI.
- **Phase 1 – Foundation:** login, app shell, theme toggle, dashboard with seed data, chat with streaming on one model, audit log writing. Gate: I can log in and have a real conversation in both themes.
- **Phase 2 – Agent:** tools with confirmation cards, both modes enforced on the server, model picker with several providers, uploads, document editor + PDF/DOCX export, handover to a human, then knowledge/RAG.
- **Phase 3 – Demo package:**
  - a fictional demo family as seed
  - a 5-minute demo script for my presentation
  - presentation polish
  - deployment prep and setup instructions for me
  - `docs/datenschutz-vor-echtbetrieb.md`
- **Phase 4 – Final fine-tune pass:** both agents polish their side until every screen and flow is above 9/10. Then you check again yourself.

## 8. How you work: you are the orchestrator

You plan, brief, dispatch, verify, grade and send work back. You do not build the app yourself. At most you make tiny glue fixes.

- **Two agents, never more than 2 at once:**
  - **Frontend agent: Claude Opus 5.5, effort high.** It owns `src/`, the design tokens, motion, the mocks and the UI tests.
  - **Backend agent: Sol 6.1** (the newest Sol in NoteTree/TreeChat, effort high). It owns `supabase/` (migrations, RLS, seed, Edge Functions, provider adapters), the generated types, `docs/api-contract.md` and the backend tests.
  - Start both as TreeChat sub-chats (`treechat_create_thread` with `environment "local"`, `runtimeMode "full-access"`, `notifyCreatorOnComplete true`). **Check the provider, model ids and effort values against `treechat_capabilities`, never guess.** If a value does not exist, take the closest one and tell me.
- **The contract comes first:** the backend publishes the API contract and the types before the frontend wires data. Contract changes go through you.
- Every agent gets **one big, self-contained job per phase**. The brief covers role, absolute paths, this file, file ownership, order of work, hard rules and report format. Never send small errands.
- **Fine-tuners, not reviewers.** Each agent fixes what it finds immediately. It grades itself honestly per screen and flow before it reports. No "found but not fixed" lists.
- **You check everything yourself** after each report: typecheck, lint, all tests, the RLS tests, the Node smoke flow, then a few gentle screenshots in both themes, and you really look at them.
  - Anything below 9 goes back to **the same agent** (`treechat_send_message`), not a new one, as concrete findings: screenshot, what's wrong, what you expect.
- **Test browser:** follow `~/.claude/CLAUDE.md` strictly.
  - Node checks first.
  - For screenshots: Chrome for Testing in my Chrome's version, max 1280×720, one browser at a time, closed right after.
  - Never Playwright's bundled browser, never my personal Chrome.
- **Never** create accounts (Supabase, Vercel, AI providers), never enter credentials, and never print or commit keys. Prepare it all and hand the steps to me.

**Report to me in German at every gate:**
- what was built
- what you checked and how
- honest grades per area (before/after)
- screenshots (max 12)
- open risks
- the decision you need from me

Make it so good that people in the room forget it's a demo and ask when they can use it. Calm, precise, trustworthy, with just enough graffiti to make it unforgettable. Do it right bro, I believe in you!


## Vorrangige Nutzerkorrektur vom 06.10.2026

Original: „iregndwie muss das gehei hc kann das nicht machen ich möchte auch keine edge functions“.

Die ältere Pflicht zu Supabase Edge Functions entfällt. Stattdessen übernimmt ein normaler lokaler Node-Server Sitzung und KI-Streaming mit den bestehenden Sicherheits-, Bestätigungs-, Audit- und Budgetregeln. Supabase bleibt für Auth, Daten und Storage. Beide ursprünglichen Agenten verbinden die aktuelle Phase-1-App mit dem Server; ein gemeinsamer lokaler Start vermeidet zusätzliche Einrichtungsschritte. Keine Edge-Bereitstellung, keine eigenmächtige Kontoanlage und keine Budgeterhöhung. Das echte Nutzer-/KI-Gate bleibt erforderlich.

## Zusätzlicher Prüfauftrag vom 06.10.2026

Der Nutzer beauftragt nach dem technischen Node-Abschluss einen vollständigen Anforderungsabgleich, Randfallprüfungen und bei Bedarf Oberflächentests. Aktuelle Grenze: höchstens zwei GPT-6.1 Sol mit `reasoningEffort: xhigh` gleichzeitig und zusätzlich bei Bedarf Claude Opus 5.5 mit `effort: high` für die Oberfläche. Die ursprünglichen Bereichsinhaber beheben belegte Fehler selbst; ein zusätzlicher unabhängiger Sol prüft die Querverbindungen. Dieser Prüfauftrag hebt keine Phase-Gates, Konto- oder Kostengrenzen auf. Der vollständige Originaltext und die laufenden Prüfschritte stehen im bestehenden Aufgabenpaar unter `docs/tasks/`.

## Fortsetzung: Vercel und DeepSeek, 06.10.2026

Der Nutzer verlangt für die Vorführung am 07.10.2026 Login und echten Chat auf seiner bereits veröffentlichten Vercel-Anwendung. Normale Vercel Node Functions übernehmen den bisherigen Node-Weg; Supabase bleibt Auth/DB/Storage, keine Edge Functions. Standardmodell: DeepSeek V4.1 Flash (`deepseek-flash`). Die zunächst gewählten 5 USD sind ausdrücklich durch „ersmtal keine limits bei deepseek“ ersetzt: kein App-Ausgabenlimit. Der Nutzer hat den Demo-Zugang selbst angelegt und den DeepSeek-Key geschützt bei Vercel hinterlegt. Technischer Stand und verbleibendes Online-Gate: `docs/gates/2026-10-06-vercel-demo.md`. Keine vorgezogene Behauptung der Erstellungs-/Export-/Upload-Funktionen aus Phase 2.

## Vorrangige Fortsetzung: gespeicherte Anmeldung und Alltagshilfen

Der Nutzer verlangt am 06.10.2026 autonomes Beheben aller Fehler des Vorführablaufs und die abschließende Prüfung auf dem Live-System mit seinem bestehenden Konto. Höchstens drei Arbeitsagenten gleichzeitig; der Orchestrator führt die Lieferungen zusammen.

Die bisherige Vorgabe ohne Remember-me wird ausdrücklich ersetzt: Anmeldung auf dem eigenen Gerät bewusst speichern und nach Neuladen/erneutem Öffnen wiederaufnehmen, ohne Passwortspeicherung. Normale Sitzung bleibt kurz; die gespeicherte Sitzung wird serverseitig auf höchstens 30 Tage begrenzt und bei Wiederaufnahme geprüft. Abmelden beendet auch diese Sitzung. Ein klarer Demo-Einstieg verwendet den bestehenden Zugang; kein Auth-Bypass und keine neue Kontoanlage.

Im Chat einen Dialog mit nach Alltagsthemen sortierten, natürlich formulierten Beispielanfragen bereitstellen. Auswahl wird als bearbeitbarer Entwurf übernommen, vorhandener Entwurf bleibt erhalten, nichts automatisch senden. Beispiele sollen die tatsächlich vorhandenen Fähigkeiten erklären: vorhandene Personendaten und Aufgaben verstehen/ordnen, Fragen vorbereiten und Texte im Chat formulieren. Keine automatischen Datenänderungen, Exporte oder Versendungen behaupten, solange diese Funktionen nicht implementiert sind.
