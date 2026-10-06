// Statische HTML-Vorlagen für Login, Dashboard, Chat und Einstellungen.
// Eine gemeinsame Struktur, Unterschiede je Richtung über `d.id`, `d.nav` und das Richtungs-CSS.
import * as C from './content.mjs';
import { brandMark, check, circle, icon, spray, stamp, tagLine, underline } from './art.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const NAV = [
  { id: 'dashboard', label: 'Übersicht', icon: 'layout-dashboard', href: 'dashboard.html' },
  { id: 'chat', label: 'Sachbearbeiter', icon: 'message-square-text', href: 'chat.html' },
  { id: 'dokumente', label: 'Dokumente', icon: 'file-text', href: '#' },
  { id: 'aufgaben', label: 'Aufgaben', icon: 'list-checks', href: '#', count: 5 },
  { id: 'einstellungen', label: 'Einstellungen', icon: 'settings', href: 'einstellungen.html' },
];

// ---------- Rahmen ----------

export function page(d, screen, body, { title }) {
  return `<!doctype html>
<html lang="de" data-theme="dunkel">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${d.name} · Pflege-Dashboard Mock</title>
<meta name="description" content="Statischer Designmock (Phase 0), Richtung ${d.name}. Nur fiktive Daten.">
<script>
  // Theme per ?theme=hell|dunkel (Aufnahmen) oder gespeicherter Wahl; Standard ist dunkel.
  (function () {
    var q = new URLSearchParams(location.search).get('theme');
    var t = q;
    if (!t) { try { t = localStorage.getItem('pd-mock-theme'); } catch (e) {} }
    document.documentElement.setAttribute('data-theme', t === 'hell' ? 'hell' : 'dunkel');
  })();
</script>
<link rel="stylesheet" href="../assets/fonts/fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="../assets/base.css">
<link rel="stylesheet" href="style.css">
</head>
<body class="dir-${d.id} screen-${screen}">
<a class="skip" href="#main">Zum Inhalt springen</a>
${demoBanner()}
${body}
<script src="../assets/mock.js" defer></script>
</body>
</html>
`;
}

function demoBanner() {
  return `<div class="demo-banner" role="note" aria-label="Demo-Hinweis">${icon('triangle-alert', { size: 15 })}<strong>${C.banner.title}</strong><span class="demo-detail">${C.banner.detail}</span></div>`;
}

function themeToggle() {
  return `<button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-label="Farbschema wechseln">${icon('moon', { size: 17, cls: 'only-dark' })}${icon('sun', { size: 17, cls: 'only-light' })}</button>`;
}

function avatar(initials, cls = '') {
  return `<span class="avatar ${cls}" aria-hidden="true">${initials}</span>`;
}

function brand(d, { withWs = false } = {}) {
  return `<a class="brand" href="dashboard.html" aria-label="Pflege-Dashboard, zur Übersicht">${brandMark(d.id)}<span class="brand-text"><span class="brand-name">Pflege-Dashboard</span>${withWs ? `<span class="brand-ws">${C.workspace.name}</span>` : ''}</span></a>`;
}

function navItems(active, { labels = true } = {}) {
  return NAV.map(
    (n) =>
      `<li><a class="nav-item${n.id === active ? ' is-active' : ''}" href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}${labels ? '' : ` aria-label="${n.label}" title="${n.label}"`}>${icon(n.icon, { size: 18 })}<span class="nav-label">${n.label}</span>${n.count && labels ? `<span class="nav-count" aria-label="${n.count} offen">${n.count}</span>` : ''}</a></li>`,
  ).join('');
}

function mobileBar(d) {
  return `<div class="mobile-bar">${brand(d)}<div class="mobile-actions">${themeToggle()}<button class="icon-btn" type="button" aria-label="Menü öffnen">${icon('menu', { size: 20 })}</button></div></div>`;
}

/** App-Hülle mit der Navigation der Richtung. `compact` = Seitenleiste nur mit Icons (Chat in „Linie“). */
function shell(d, active, main, { compact = false } = {}) {
  let nav;
  if (d.nav === 'sidebar') {
    nav = `<nav class="nav nav-sidebar${compact ? ' is-compact' : ''}" aria-label="Hauptnavigation">
  <div class="nav-top">${brand(d, { withWs: !compact })}</div>
  ${compact ? '' : `<button class="nav-search" type="button">${icon('search', { size: 16 })}<span>Suchen</span><kbd>⌘K</kbd></button>`}
  <ul class="nav-list">${navItems(active, { labels: !compact })}</ul>
  ${
    compact
      ? ''
      : `<p class="nav-section">Pflegebedürftige</p><ul class="nav-list nav-people">${C.recipients
          .map((r) => `<li><a class="nav-item" href="#">${avatar(r.initials, 'avatar-xs')}<span class="nav-label">${r.name}</span><span class="nav-meta">${r.pgShort}</span></a></li>`)
          .join('')}</ul>`
  }
  <div class="nav-foot">${avatar(C.user.initials)}${compact ? '' : `<span class="nav-user"><span>${C.user.name}</span><span class="nav-meta">${C.user.role}</span></span>`}${themeToggle()}</div>
</nav>`;
  } else if (d.nav === 'top') {
    nav = `<header class="nav nav-top-bar" aria-label="Hauptnavigation">
  ${brand(d)}
  <span class="ws-pill">${icon('users', { size: 15 })}${C.workspace.name}</span>
  <nav aria-label="Bereiche"><ul class="nav-list">${navItems(active)}</ul></nav>
  <div class="nav-right"><button class="icon-btn" type="button" aria-label="Suchen">${icon('search', { size: 18 })}</button>${themeToggle()}<span class="nav-user">${avatar(C.user.initials)}<span class="nav-user-name">${C.user.name}</span></span></div>
</header>`;
  } else {
    nav = `<nav class="nav nav-rail" aria-label="Hauptnavigation">
  ${brand(d)}
  <ul class="nav-list">${navItems(active)}</ul>
  <div class="nav-foot">${themeToggle()}${avatar(C.user.initials)}</div>
</nav>`;
  }
  return `<div class="app app-${d.nav}${compact ? ' app-compact' : ''}">${mobileBar(d)}${nav}<main id="main" class="main" tabindex="-1">${main}</main></div>`;
}

function statusPill(status, label, d) {
  if (status === 'entwurf' && d.id !== 'linie') return `<span class="tape" aria-label="Status: Entwurf">Entwurf</span>`;
  const ic = { entwurf: 'pen-line', geprueft: 'circle-check', versendet: 'send' }[status];
  return `<span class="pill pill-${status}">${icon(ic, { size: 13 })}${label}</span>`;
}

// ---------- Login ----------

export function login(d) {
  const L = C.login;
  const form = `<form class="login-form" action="#" onsubmit="return false" aria-labelledby="login-title">
  <h1 id="login-title" class="login-title">${L.title}</h1>
  <p class="login-lead">${L.lead}</p>
  <div class="field">
    <label for="email">${L.email}</label>
    <div class="input is-focus">${icon('mail', { size: 17 })}<input id="email" name="email" type="email" autocomplete="username" placeholder="${L.emailPh}"></div>
  </div>
  <div class="field">
    <div class="field-row"><label for="pw">${L.password}</label><a class="link-sm" href="#">${L.forgot}</a></div>
    <div class="input">${icon('lock', { size: 17 })}<input id="pw" name="password" type="password" autocomplete="current-password"></div>
  </div>
  <button class="btn btn-primary btn-block" type="submit">${L.submit}${icon('arrow-right', { size: 17 })}</button>
  <p class="login-note">${icon('info', { size: 15 })}<span>${L.access}</span></p>
  <p class="login-note">${icon('clock', { size: 15 })}<span>${L.timeout}</span></p>
</form>`;

  const points = `<ul class="login-points">${L.points
    .map((p) => `<li>${icon(p.icon, { size: 18 })}<span><strong>${p.title}</strong><span>${p.text}</span></span></li>`)
    .join('')}</ul>`;

  let side;
  if (d.id === 'linie') {
    side = `<section class="login-side" aria-label="Über das Produkt">
  ${brand(d)}
  <p class="login-claim">Pflegeanträge, <span class="mark-wrap">Fristen${underline({ w: 112, cls: 'g-underline login-underline', width: 2.4 })}</span> und Schreiben an einem ruhigen Ort.</p>
  ${points}
  <p class="login-foot">${icon('shield-check', { size: 15 })}Demo-Umgebung · nur fiktive Daten</p>
</section>`;
  } else if (d.id === 'klartext') {
    side = `<section class="login-side" aria-label="Über das Produkt">
  ${brand(d)}
  <p class="login-claim">Anträge, Fristen und Schreiben – <span class="mark-wrap mark-hl">verständlich</span> und an einem Ort.</p>
  <p class="login-sub">Für pflegende Angehörige, Bevollmächtigte und Betreuerinnen und Betreuer.</p>
  ${points}
</section>`;
  } else {
    side = `<section class="login-side" aria-label="Über das Produkt">
  ${spray({ w: 520, h: 420, n: 340, seed: 23, cls: 'g-spray login-spray', cx: 0.78, cy: 0.3 })}
  ${brand(d)}
  <p class="login-claim">Pflege&shy;kram,<br>sauber erledigt.</p>
  ${tagLine({ w: 280, cls: 'g-tagline login-tag' })}
  <p class="login-sub">Ihr KI-Sachbearbeiter für Anträge, Fristen und Schreiben – rund um die Uhr, mit Bestätigung vor jedem Schritt.</p>
  ${points}
</section>`;
  }
  return `<div class="login-top">${brand(d)}${themeToggle()}</div>
<main id="main" class="login" tabindex="-1">
  ${side}
  <section class="login-panel" aria-label="Anmeldung">
    <div class="login-card">${form}</div>
    <div class="login-panel-foot">${themeToggle()}</div>
  </section>
</main>`;
}

// ---------- Dashboard ----------

function personCard(d, r, i) {
  const dl = r.deadline;
  let date = `<span class="dl-date">${dl.date}</span>`;
  let rem = `<span class="dl-left${dl.urgent ? ' is-urgent' : ''}">${dl.remaining}</span>`;
  if (dl.urgent && d.id === 'linie') {
    rem = `<span class="mark-wrap dl-left is-urgent">${dl.remaining}${underline({ w: 96, cls: 'g-underline dl-underline', width: 2.6 })}</span>`;
  }
  if (dl.urgent && d.id === 'tagwerk') {
    rem = `<span class="mark-wrap dl-left is-urgent">${dl.remaining}${circle({ w: 128, h: 46, cls: 'g-circle dl-circle', width: 2.8 })}</span>`;
  }
  return `<article class="card person" aria-labelledby="p-${r.id}">
  <header class="person-head">${avatar(r.initials, `avatar-lg tone-${i}`)}<div><h2 id="p-${r.id}" class="person-name">${r.name}</h2><p class="muted small">${r.meta}</p></div><button class="icon-btn ghost" type="button" aria-label="Mehr zu ${r.name}">${icon('ellipsis', { size: 18 })}</button></header>
  <dl class="facts">
    <div><dt>Pflegegrad</dt><dd><span class="pg">${r.pg}</span></dd></div>
    <div><dt>Pflegekasse</dt><dd>${r.kasse}</dd></div>
  </dl>
  <div class="deadline${dl.urgent ? ' is-urgent' : ''}">
    <p class="dl-label">${icon(dl.urgent ? 'alarm-clock' : 'calendar-clock', { size: 15 })}${dl.label}</p>
    <p class="dl-value">${date}${rem}</p>
    <p class="dl-source">${dl.source}</p>
  </div>
</article>`;
}

function askCard(d) {
  return `<section class="card ask" aria-labelledby="ask-title">
  <div class="ask-head">
    <span class="ask-icon">${icon('message-square-text', { size: 20 })}</span>
    <div><h2 id="ask-title" class="ask-title">KI-Sachbearbeiter fragen</h2><p class="muted small">Rund um die Uhr erreichbar · erstellt nur nach Ihrer Bestätigung</p></div>
  </div>
  <form class="ask-form" action="#" onsubmit="return false">
    <label class="sr-only" for="ask-input">Ihre Frage</label>
    <input id="ask-input" class="ask-input" type="text" placeholder="Zum Beispiel: Was muss in den Widerspruch?">
    <button class="btn btn-primary" type="submit">Fragen${icon('arrow-up', { size: 16 })}</button>
  </form>
  <div class="ask-prompts">${C.askPrompts.map((p) => `<button class="chip" type="button">${p}</button>`).join('')}</div>
  <p class="ask-meta"><span>${icon('pen-line', { size: 14 })}Modus: Auskunft + Erstellen</span><span>${icon('cpu', { size: 14 })}Claude Sonnet <span class="region">US</span></span></p>
</section>`;
}

function taskList(d) {
  const rows = C.tasks
    .map((t, i) => {
      let left = t.left ? `<span class="t-left${t.urgent ? ' is-urgent' : ''}">${t.left}</span>` : '<span class="t-left muted">–</span>';
      if (t.urgent && d.id === 'klartext') {
        left = `<span class="mark-wrap t-left is-urgent"><span class="num">9</span> Tage${circle({ w: 92, h: 40, cls: 'g-circle t-circle', width: 2.6 })}</span>`;
      }
      return `<li class="row task${t.urgent ? ' is-urgent' : ''}">
  <span class="prio prio-${t.level}" aria-label="Priorität ${t.level}"></span>
  <span class="row-main"><span class="row-title">${t.title}</span><span class="row-sub">${t.who} · ${t.kind}</span></span>
  <span class="t-due"><span class="t-date">${t.due}</span>${left}</span>
</li>`;
    })
    .join('');
  return `<section class="card list-card tasks" aria-labelledby="tasks-title">
  <header class="card-head"><h2 id="tasks-title">Offene Aufgaben und Fristen</h2><span class="count">5</span><a class="link-sm" href="#">Alle anzeigen</a></header>
  <ul class="rows">${rows}</ul>
</section>`;
}

function docList(d) {
  const rows = C.documents
    .slice(0, d.id === 'linie' ? 4 : 3)
    .map(
      (x) => `<li class="row doc">${icon('file-text', { size: 17, cls: 'row-icon' })}<span class="row-main"><span class="row-title">${x.title}</span><span class="row-sub">${x.who} · ${x.when}</span></span>${statusPill(x.status, x.statusLabel, d)}</li>`,
    )
    .join('');
  return `<section class="card list-card docs" aria-labelledby="docs-title">
  <header class="card-head"><h2 id="docs-title">Zuletzt erstellte Dokumente</h2><a class="link-sm" href="#">Alle</a></header>
  <ul class="rows">${rows}</ul>
</section>`;
}

function convList(d, n = 3) {
  const rows = C.conversations
    .slice(0, n)
    .map(
      (c) => `<li class="row conv">${icon('message-square', { size: 17, cls: 'row-icon' })}<span class="row-main"><span class="row-title">${c.title}</span><span class="row-sub">${c.who} · ${c.snippet}</span></span><span class="row-when">${c.when}</span></li>`,
    )
    .join('');
  return `<section class="card list-card convs" aria-labelledby="convs-title">
  <header class="card-head"><h2 id="convs-title">Letzte Gespräche</h2><a class="link-sm" href="chat.html">Alle</a></header>
  <ul class="rows">${rows}</ul>
</section>`;
}

export function dashboard(d) {
  const head = `<header class="page-head">
  <div><p class="eyebrow">${C.today.long}</p><h1>Guten Morgen, ${C.user.salutation}</h1></div>
  <div class="head-actions"><button class="btn btn-secondary" type="button">${icon('plus', { size: 16 })}Aufgabe</button><a class="btn btn-primary" href="chat.html">${icon('message-square-text', { size: 16 })}Sachbearbeiter fragen</a></div>
</header>`;
  const main = `${head}
<div class="dash">
  <div class="persons">${C.recipients.map((r, i) => personCard(d, r, i)).join('')}</div>
  ${askCard(d)}
  ${taskList(d)}
  ${docList(d)}
  ${convList(d, d.id === 'linie' ? 3 : 2)}
</div>`;
  return shell(d, 'dashboard', main);
}

// ---------- Chat ----------

function convSidebar(d) {
  return `<aside class="conv-list" aria-label="Gespräche">
  <div class="conv-head"><h2>Gespräche</h2><button class="icon-btn" type="button" aria-label="Neues Gespräch">${icon('square-pen', { size: 18 })}</button></div>
  <div class="input input-sm">${icon('search', { size: 16 })}<label class="sr-only" for="conv-search">Gespräche durchsuchen</label><input id="conv-search" type="search" placeholder="Gespräche durchsuchen"></div>
  <ul class="conv-items">${C.conversations
    .map(
      (c) => `<li><a class="conv-item${c.active ? ' is-active' : ''}" href="#"${c.active ? ' aria-current="true"' : ''}><span class="conv-title">${c.title}</span><span class="conv-when">${c.when}</span><span class="conv-who">${icon(c.who === 'Allgemein' ? 'messages-square' : 'user-round', { size: 13 })}${c.who}</span></a></li>`,
    )
    .join('')}</ul>
  <a class="conv-archive" href="#">${icon('archive', { size: 15 })}Archiv</a>
</aside>`;
}

function letterPreview(x, { cls = '' } = {}) {
  return `<div class="letter ${cls}">
  <p class="letter-meta"><span>Ingrid Brandt · vertreten durch Sabine Keller</span><span>${C.today.short}</span></p>
  <p class="letter-to">An: ${x.to}</p>
  ${x.subject ? `<p class="letter-subject">${x.subject}</p>` : ''}
  ${x.lines.map((l) => `<p>${l}</p>`).join('')}
</div>`;
}

function createdDoc(d) {
  const x = C.chat.created;
  let mark = '';
  if (d.id === 'klartext') mark = check({ size: 26, cls: 'g-check created-check' });
  if (d.id === 'linie') mark = `<span class="created-ok">${icon('check', { size: 15 })}</span>`;
  const preview = d.id === 'tagwerk' ? letterPreview(x, { cls: 'letter-mini' }) : '';
  return `<div class="tool-result created" role="group" aria-label="Erstelltes Dokument">
  <div class="created-head">${mark}<span class="created-kicker">Dokument erstellt · ${x.when}</span></div>
  <div class="created-body">
    ${icon('file-text', { size: 18, cls: 'created-icon' })}
    <span class="row-main"><span class="row-title">${x.title}</span><span class="row-sub">${x.kind} an ${x.to} · Entwurf</span></span>
    <a class="btn btn-secondary btn-sm" href="#">Öffnen</a>
  </div>
  ${preview}
  ${d.id === 'tagwerk' ? stamp({ id: 'chat-stamp', cls: 'g-stamp created-stamp' }) : ''}
</div>`;
}

function confirmCard(d) {
  const x = C.chat.confirm;
  return `<section class="confirm" aria-labelledby="confirm-q">
  <header class="confirm-head">
    <span class="confirm-icon">${icon('file-pen-line', { size: 18 })}</span>
    <div><p class="confirm-kicker">Vorschlag · wartet auf Ihre Bestätigung</p><h3 id="confirm-q" class="confirm-q">${x.question}</h3></div>
    ${d.id === 'linie' ? '<span class="pill pill-entwurf">Entwurf</span>' : '<span class="tape">Entwurf</span>'}
  </header>
  <div class="confirm-grid">
    <dl class="confirm-facts">
      <div><dt>Art</dt><dd>${x.type}</dd></div>
      <div><dt>Für</dt><dd>${x.for}</dd></div>
      <div><dt>An</dt><dd>${x.to}</dd></div>
    </dl>
    ${letterPreview(x, { cls: 'letter-preview' })}
  </div>
  <footer class="confirm-foot">
    <p class="confirm-note">${icon('info', { size: 14 })}${x.note}</p>
    <div class="confirm-actions"><button class="btn btn-ghost" type="button">Verwerfen</button><button class="btn btn-secondary" type="button">${icon('pencil', { size: 15 })}Bearbeiten</button><button class="btn btn-primary" type="button">${icon('check', { size: 16 })}Entwurf erstellen</button></div>
  </footer>
</section>`;
}

function docPanel(d) {
  const x = C.chat.created;
  return `<aside class="doc-panel" aria-label="Erstelltes Dokument">
  <header class="doc-panel-head"><span class="muted small">In diesem Gespräch erstellt</span><button class="icon-btn ghost" type="button" aria-label="Seitenleiste schließen">${icon('x', { size: 17 })}</button></header>
  <h2 class="doc-panel-title">${x.title}</h2>
  <p class="doc-panel-meta"><span class="pill pill-entwurf">${icon('pen-line', { size: 13 })}Entwurf</span><span class="muted small">Brief · heute ${x.when}</span></p>
  <div class="paper">
    <p class="paper-from">Sabine Keller · Lindenweg 4 · 28195 Bremen</p>
    <p class="paper-to">Pflegekasse Weserland<br>Leistungsabteilung Pflege</p>
    <p class="paper-date">Bremen, ${C.today.short}</p>
    <p class="paper-subject">Bitte um Zusendung des Gutachtens<br><span>Versicherte: Ingrid Brandt</span></p>
    ${x.lines.map((l) => `<p>${l}</p>`).join('')}
  </div>
  <div class="doc-panel-actions"><a class="btn btn-secondary btn-sm" href="#">${icon('file-text', { size: 15 })}PDF</a><a class="btn btn-secondary btn-sm" href="#">${icon('file-text', { size: 15 })}DOCX</a><a class="btn btn-secondary btn-sm" href="#">Im Editor öffnen</a></div>
</aside>`;
}

export function chat(d) {
  const ch = C.chat;
  const head = `<header class="thread-head">
  <div class="thread-title"><h1>${ch.title}</h1>
    <a class="person-chip" href="#">${avatar('IB', 'avatar-xs tone-0')}${ch.person}<span class="muted">· ${ch.personMeta}</span></a>
  </div>
  <div class="thread-tools">
    <span class="mode-chip" title="Modus ${ch.modeNote}">${icon('pen-line', { size: 14 })}${ch.mode}</span>
    <button class="model-btn" type="button" aria-haspopup="listbox" aria-label="Modell wählen, aktuell ${ch.model}, Region ${ch.modelRegion}">${icon('cpu', { size: 15 })}${ch.model}<span class="region">${ch.modelRegion}</span>${icon('chevron-down', { size: 15 })}</button>
    <button class="btn btn-secondary btn-sm" type="button">${icon('headset', { size: 15 })}An Menschen übergeben</button>
  </div>
</header>`;
  const msgs = `<div class="messages" role="log" aria-label="Verlauf">
  <div class="msg msg-user"><div class="bubble"><p>${esc(ch.userMessage)}</p><span class="attach">${icon('paperclip', { size: 14 })}${ch.attachment.name}<span class="muted">${ch.attachment.meta}</span></span></div></div>
  <div class="msg msg-agent">
    <div class="msg-meta">${icon('message-square-text', { size: 14 })}<strong>KI-Sachbearbeiter</strong><span class="muted">· ${ch.model} · 09:38</span></div>
    ${ch.agentMessage.map((p) => `<p>${md(p)}</p>`).join('')}
    <p class="sources">${icon('quote', { size: 13 })}Quellen: ${ch.sources.map((s) => `<a href="#">${s}</a>`).join(' · ')}</p>
  </div>
  ${createdDoc(d)}
  ${confirmCard(d)}
</div>`;
  const composer = `<form class="composer" action="#" onsubmit="return false">
  <div class="composer-box">
    <button class="icon-btn" type="button" aria-label="Datei anhängen (PDF oder Bild)">${icon('paperclip', { size: 18 })}</button>
    <label class="sr-only" for="msg">Nachricht</label>
    <input id="msg" class="composer-input" type="text" placeholder="${ch.composer}">
    <button class="btn btn-primary btn-icon" type="submit" aria-label="Senden">${icon('arrow-up', { size: 18 })}</button>
  </div>
  <p class="honesty">${icon('shield-check', { size: 13 })}${ch.honesty}</p>
</form>`;
  const thread = `<section class="thread" aria-label="Gespräch">${head}${msgs}${composer}</section>`;
  const main = `<div class="chat-layout${d.id === 'linie' ? ' has-panel' : ''}">${convSidebar(d)}${thread}${d.id === 'linie' ? docPanel(d) : ''}</div>`;
  return shell(d, 'chat', main, { compact: d.id === 'linie' });
}

// ---------- Einstellungen ----------

export function einstellungen(d) {
  const S = C.settings;
  const tabs = ['Arbeitsweise', 'Modelle', 'Datenschutz & Demo', 'Protokoll'];
  const modeCards = S.modes
    .map((m) => {
      const on = m.id === S.activeMode;
      const mark = on && d.id === 'tagwerk' ? underline({ w: 150, cls: 'g-underline mode-underline', width: 2.6 }) : '';
      return `<label class="mode-card${on ? ' is-on' : ''}"><input type="radio" name="mode" value="${m.id}"${on ? ' checked' : ''}><span class="radio" aria-hidden="true"></span><span class="mode-text"><span class="mode-title mark-wrap">${m.title}${mark}</span><span class="mode-desc">${m.text}</span></span></label>`;
    })
    .join('');
  const modus = `<section class="card set-card" aria-labelledby="s-mode">
  <header class="card-head"><h2 id="s-mode">Modus des Sachbearbeiters</h2><span class="scope">Standard für den Arbeitsbereich</span></header>
  <fieldset class="modes"><legend class="sr-only">Modus wählen</legend>${modeCards}</fieldset>
  <p class="note">${icon('shield-check', { size: 15 })}<span>${S.serverNote}</span></p>
  <div class="switch-row"><span><strong>${S.chatOverride}</strong><span class="muted small">Umschalten im Kopf des Gesprächs</span></span>${toggle(true, 'Einzelne Gespräche dürfen abweichen')}</div>
</section>`;
  const P = S.persona;
  const persona = `<section class="card set-card" aria-labelledby="s-persona">
  <header class="card-head"><h2 id="s-persona">Persona und Systemprompt</h2><span class="ver">${P.version}</span></header>
  <p class="persona-name">${P.name}<span class="muted small"> · ${P.changed}</span></p>
  <blockquote class="prompt">${P.excerpt}</blockquote>
  <div class="persona-foot">
    <div class="versions" role="list" aria-label="Versionen">${P.versions.map((v) => `<span role="listitem" class="ver-chip${v.active ? ' is-on' : ''}">${v.v}<span class="muted"> · ${v.note}</span></span>`).join('')}</div>
    <div class="persona-actions"><button class="btn btn-ghost btn-sm" type="button">${icon('rotate-ccw', { size: 15 })}Auf Standard zurücksetzen</button><button class="btn btn-secondary btn-sm" type="button">${icon('pencil', { size: 15 })}Bearbeiten</button></div>
  </div>
</section>`;
  const models = `<section class="card set-card models" aria-labelledby="s-models">
  <header class="card-head"><h2 id="s-models">Modelle</h2><span class="scope">Standard und Auswahl im Gespräch</span></header>
  <ul class="model-rows">${S.models
    .map(
      (m) => `<li class="model-row${m.enabled ? '' : ' is-off'}">
    <span class="model-radio${m.default ? ' is-on' : ''}" role="radio" aria-checked="${m.default ? 'true' : 'false'}" aria-label="${m.name} als Standard"></span>
    <span class="model-main"><span class="model-name">${m.name}${m.default ? '<span class="std">Standard</span>' : ''}</span><span class="model-sub">${m.provider} · ${m.tools ? 'Werkzeuge' : ''}${m.vision ? ' · Bilder' : ' · ohne Bilder'}${m.pending ? ` · ${m.pending}` : ''}</span></span>
    <span class="region region-${m.region.toLowerCase()}" title="Hosting-Region (Planung)">${m.region}</span>
    ${toggle(m.enabled, `${m.name} aktiv`)}
  </li>`,
    )
    .join('')}</ul>
  <p class="note small">${icon('globe', { size: 14 })}<span>${S.regionNote}</span></p>
</section>`;
  const demo = `<section class="card set-card demo-set" aria-labelledby="s-demo">
  <header class="card-head"><h2 id="s-demo">Demo und Daten</h2></header>
  <div class="switch-row"><span><strong>${S.demo.title}</strong><span class="muted small">${S.demo.text}</span></span>${toggle(true, S.demo.title)}</div>
  <p class="note">${icon('file-check', { size: 15 })}<span>${S.demo.checklist} <a href="#">Checkliste öffnen</a></span></p>
</section>`;
  const head = `<header class="page-head">
  <div><p class="eyebrow">Arbeitsbereich ${C.workspace.name}</p><h1>Einstellungen</h1></div>
  <div class="head-actions"><span class="saved">${icon('circle-check', { size: 15 })}Alle Änderungen gespeichert</span></div>
</header>
<nav class="tabs" aria-label="Einstellungsbereiche">${tabs.map((t, i) => `<a class="tab${i === 0 ? ' is-active' : ''}" href="#"${i === 0 ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
  const main = `${head}<div class="settings"><div class="set-col">${modus}${persona}</div><div class="set-col">${models}${demo}</div></div>`;
  return shell(d, 'einstellungen', main);
}

function toggle(on, label) {
  return `<button class="toggle${on ? ' is-on' : ''}" type="button" role="switch" aria-checked="${on}" aria-label="${label}"><span class="knob"></span></button>`;
}

// ---------- Bewegungsvorschau ----------

export function motion(d) {
  const m = d.motion;
  let stage;
  if (d.id === 'linie') {
    stage = `<div class="m-card card person">
  <header class="person-head">${avatar('IB', 'avatar-lg tone-0')}<div><h2 class="person-name">Ingrid Brandt</h2><p class="muted small">Mutter · 81 Jahre</p></div></header>
  <div class="deadline is-urgent"><p class="dl-label">${icon('alarm-clock', { size: 15 })}Widerspruchsfrist</p>
  <p class="dl-value"><span class="dl-date">15.10.2026</span><span class="mark-wrap dl-left is-urgent">noch 9 Tage${underline({ w: 96, cls: 'g-underline dl-underline anim-draw', width: 2.6 })}</span></p>
  <p class="dl-source">laut Bescheid vom 12.09.2026</p></div>
</div>`;
  } else if (d.id === 'klartext') {
    stage = `<div class="m-card confirm is-done-anim">
  <header class="confirm-head"><span class="confirm-icon anim-swap">${icon('file-pen-line', { size: 18 })}</span>
  <div><p class="confirm-kicker"><span class="anim-out">Vorschlag · wartet auf Ihre Bestätigung</span><span class="anim-in">Bestätigt · Dokument erstellt</span></p><h3 class="confirm-q">Widerspruch gegen Bescheid vom 12.09.2026</h3></div>
  ${check({ size: 44, cls: 'g-check anim-draw m-check' })}</header>
  ${letterPreview(C.chat.confirm, { cls: 'letter-preview' })}
</div>`;
  } else {
    stage = `<div class="m-card tool-result created">
  <div class="created-head"><span class="created-kicker">Dokument erstellt · 09:41</span></div>
  <div class="created-body">${icon('file-text', { size: 18, cls: 'created-icon' })}<span class="row-main"><span class="row-title">Widerspruch gegen Bescheid vom 12.09.2026</span><span class="row-sub">Brief an Pflegekasse Weserland · Entwurf</span></span></div>
  ${letterPreview(C.chat.confirm, { cls: 'letter-mini' })}
  ${stamp({ id: 'm-stamp', cls: 'g-stamp created-stamp anim-stamp', sub: '06.10.2026 · 09:41' })}
</div>`;
  }
  return `<!doctype html>
<html lang="de" data-theme="dunkel">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bewegung · ${d.name} · Pflege-Dashboard Mock</title>
<script>
  (function () {
    var p = new URLSearchParams(location.search);
    document.documentElement.setAttribute('data-theme', p.get('theme') === 'hell' ? 'hell' : 'dunkel');
    var t = p.get('t');
    if (t !== null) { document.documentElement.classList.add('frozen'); document.documentElement.style.setProperty('--t', String(Number(t) || 0)); }
  })();
</script>
<link rel="stylesheet" href="../../assets/fonts/fonts.css">
<link rel="stylesheet" href="../tokens.css">
<link rel="stylesheet" href="../../assets/base.css">
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../../assets/motion.css">
</head>
<body class="dir-${d.id} motion-page" style="--dur:${m.ms}">
<main id="main" class="motion-stage">
  <header class="motion-head"><p class="eyebrow">${d.name} · Graffiti-Moment</p><h1>${m.name}</h1><p class="muted">${m.what} Dauer ${m.ms} ms, läuft einmal, keine Schleife.</p></header>
  <div class="motion-box" id="box">${stage}</div>
  <footer class="motion-foot"><span class="t-label" id="t-label"></span><button class="btn btn-secondary btn-sm" type="button" id="replay">${icon('play', { size: 15 })}Einmal abspielen</button><span class="muted small">Bei „Bewegung reduzieren“ nur eine kurze Einblendung.</span></footer>
</main>
<script src="../../assets/motion.js" defer></script>
</body>
</html>
`;
}
