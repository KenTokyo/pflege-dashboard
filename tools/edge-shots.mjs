/* global window, document, getComputedStyle */
// Randfall-Aufnahmen der Phase-1-App über den Prüf-Harness (synthetischer Test-Transport, kein Konto).
// Lange und leere Bestände, langsame und abgebrochene Antworten, Login-Fehler, Tastaturweg.
// Regeln wie tools/shots.mjs: genau ein unsichtbarer Chrome for Testing (Version des Nutzer-Chrome),
// höchstens 1280×720, keine Drosselungs-Flags, try/finally, Zeitlimit, Wächter, Vite-Server beendet.
//
// APP_ROOT: Ordner mit vite.harness.config.ts (Standard: dieses Projekt; für Vorher-Bilder eine Kopie
// des Referenzstands). OUT: Zielordner der Bilder. LABEL: Präfix im Bericht.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { withTestBrowser } from '../docs/mocks/tools/browser.mjs';

const appRoot = resolve(process.env.APP_ROOT ?? process.cwd());
const out = resolve(process.env.OUT ?? join(process.cwd(), 'docs/mocks/tagwerk/phase1-randfaelle/nachher'));
mkdirSync(out, { recursive: true });
const EMAIL = 'pruefung@beispiel.invalid';
const PASSWORD = 'nur-synthetisch';
const report = { appRoot, browser: null, shots: [], audits: [], keyboard: [], focus: [], problems: [], console: [] };
const problem = (where, what) => report.problems.push(`${where}: ${what}`);

const server = await createServer({
  configFile: join(appRoot, 'vite.harness.config.ts'),
  logLevel: 'warn',
  // Die Vorher-Kopie nutzt die node_modules dieses Projekts (Verknüpfung): Schriften von dort zulassen.
  server: { fs: { allow: [appRoot, process.cwd()] } },
});
let base = null;
try {
  await server.listen();
  base = `http://127.0.0.1:${server.config.server.port}`;
  const run = await withTestBrowser(
    async (browser, info) => {
      report.browser = info.version;
      await longRun(browser);
      await emptyRun(browser);
      await slowRun(browser);
      await loginRun(browser);
      await keyboardRun(browser);
    },
    { timeoutMs: 360_000, label: 'randfall-shots' },
  );
  report.cleanup = { browserPid: run.pid, watcherPid: run.watcherPid };
} finally {
  await server.close();
  console.log('[randfall-shots] Vite-Harness-Server beendet');
}
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Bilder: ${report.shots.length}, Probleme: ${report.problems.length}`);
for (const p of report.problems) console.log(`PROBLEM ${p}`);
for (const f of report.focus) console.log(`Fokus ${f.where}: ${f.active}`);
process.exitCode = report.problems.length ? 1 : 0;

// ---------------------------------------------------------------------------

async function newPage(browser, theme, { width = 1280, height = 720 } = {}) {
  const context = await browser.newContext({
    viewport: { width: Math.min(width, 1280), height: Math.min(height, 720) },
    deviceScaleFactor: 1,
    colorScheme: theme === 'hell' ? 'light' : 'dark',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith('data:')) return route.continue();
    problem('Netz', `fremde Anfrage blockiert: ${url}`);
    return route.abort();
  });
  await context.addInitScript(([t]) => {
    try {
      localStorage.setItem('pflege-dashboard:theme', t);
    } catch {
      // gesperrter Speicher: Systemtheme gilt
    }
  }, [theme]);
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') report.console.push(`${m.type()}: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => problem('Seite', e.message));
  return { context, page };
}

async function settle(page, ms = 1100) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  await page.screenshot({ path: join(out, `${name}.png`), animations: 'disabled', caret: 'hide' });
  report.shots.push(join(out, `${name}.png`));
  await audit(page, name);
}

/** Überlauf (Seite und einzelne Elemente), Schrift < 12px, Bedienziele < 40px am Telefon. */
async function audit(page, name) {
  const width = page.viewportSize().width;
  const r = await page.evaluate((width) => {
    const res = { scrollW: document.documentElement.scrollWidth, tiny: [], small: [], beyond: [], overlap: [], outside: [] };
    const controls = [];
    // Sichtbarer Teil: auf alle Vorfahren mit eigenem Scroll- oder Abschneidebereich begrenzt.
    const clipped = (el, rect) => {
      let { left, top, right, bottom } = rect;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const b = p.getBoundingClientRect();
        left = Math.max(left, b.left);
        top = Math.max(top, b.top);
        right = Math.min(right, b.right);
        bottom = Math.min(bottom, b.bottom);
      }
      return { left, top, right, bottom };
    };
    // Feste und mitlaufende Leisten (Navigation, Kopf, Eingabe) liegen absichtlich über gescrolltem Inhalt.
    const pinned = (el) => {
      for (let p = el; p; p = p.parentElement) {
        const pos = getComputedStyle(p).position;
        if (pos === 'fixed' || pos === 'sticky') return true;
      }
      return false;
    };
    const phone = width < 600;
    const scrolls = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
      }
      return false;
    };
    for (const el of document.body.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (el.closest('.sr-only')) continue;
      const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (text && !el.closest('svg') && parseFloat(cs.fontSize) < 12) res.tiny.push(`${el.tagName} ${cs.fontSize} "${el.textContent.trim().slice(0, 24)}"`);
      if (text && (rect.right > width + 1 || rect.left < -1) && !scrolls(el)) res.beyond.push(`${el.tagName}.${el.className} "${el.textContent.trim().slice(0, 30)}"`);
      if (el.matches('a[href], button, input, select, textarea, summary')) {
        controls.push({ el, rect: clipped(el, rect), pinned: pinned(el) });
        const card = el.parentElement?.closest('.card, .ask, .person, .alert, .dialog');
        const box = card?.getBoundingClientRect();
        if (box && (rect.right > box.right + 1 || rect.left < box.left - 1)) res.outside.push(`${el.tagName} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}" ragt ${Math.round(Math.max(rect.right - box.right, box.left - rect.left))}px aus .${card.className.split(' ')[0]}`);
      }
      if (phone && el.matches('a[href], button, input, select, textarea') && !el.closest('.skip') && !el.matches('.skip')) {
        if (rect.height < 40 || rect.width < 40) res.small.push(`${el.tagName} ${Math.round(rect.width)}×${Math.round(rect.height)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`);
      }
    }
    // Bedienelemente, die sich überdecken (nicht ineinander verschachtelt).
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i];
        const b = controls[j];
        if (a.el.contains(b.el) || b.el.contains(a.el) || a.pinned !== b.pinned) continue;
        const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (w > 2 && h > 2) res.overlap.push(`${a.el.tagName} "${(a.el.getAttribute('aria-label') || a.el.textContent || '').trim().slice(0, 18)}" × ${b.el.tagName} "${(b.el.getAttribute('aria-label') || b.el.textContent || '').trim().slice(0, 18)}"`);
      }
    }
    return res;
  }, width);
  if (r.overlap.length) problem(name, `Bedienelemente überdecken sich: ${r.overlap.slice(0, 4).join(' | ')}`);
  if (r.outside.length) problem(name, `Bedienelement ragt aus der Karte: ${r.outside.slice(0, 4).join(' | ')}`);
  if (r.scrollW > width + 1) problem(name, `waagerechter Überlauf ${r.scrollW} > ${width}`);
  if (r.beyond.length) problem(name, `Text ragt aus dem Bild: ${r.beyond.slice(0, 4).join(' | ')}`);
  if (r.tiny.length) problem(name, `Schrift < 12px: ${r.tiny.slice(0, 4).join(' | ')}`);
  if (r.small.length) problem(name, `Bedienziel < 40px: ${r.small.slice(0, 6).join(' | ')}`);
  report.audits.push({ name, scrollW: r.scrollW, beyond: r.beyond.length, overlap: r.overlap.length, outside: r.outside.length, tiny: r.tiny.length, small: r.small.length });
}

async function focusOf(page, where) {
  const active = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    return `${el.tagName.toLowerCase()} "${el.getAttribute('aria-label') || el.labels?.[0]?.textContent?.trim() || el.textContent?.trim().slice(0, 30)}"`;
  });
  report.focus.push({ where, active });
  return active;
}

async function login(page, path, szenario) {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${base}${path}${sep}szenario=${szenario}`);
  await page.getByLabel('E-Mail-Adresse').fill(EMAIL);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.getByLabel('E-Mail-Adresse').waitFor({ state: 'detached' });
}

function nav(page, name) {
  return page.getByRole('navigation', { name: /Hauptnavigation/ }).getByRole('link', { name }).first().click();
}

// Lange Namen, Titel, Fristen rund um heute, langer Verlauf mit Tabelle, Code und langer URL.
async function longRun(browser) {
  for (const [width, theme, tag] of [
    [1280, 'dunkel', 'breit'],
    [1280, 'hell', 'breit'],
    [390, 'dunkel', 'telefon'],
    [768, 'hell', 'tablet'],
  ]) {
    const { context, page } = await newPage(browser, theme, { width });
    try {
      await login(page, '/', 'lang');
      await page.getByRole('heading', { name: 'Offene Aufgaben und Fristen' }).waitFor();
      await settle(page);
      await shot(page, `lang-dashboard-${tag}-${theme}`);
      if (width === 390) {
        await page.getByRole('region', { name: 'Pflegebedürftige' }).scrollIntoViewIfNeeded();
        await settle(page, 600);
        await shot(page, `lang-dashboard-personen-${tag}-${theme}`);
      }
      if (width !== 1280 || theme === 'dunkel') {
        await nav(page, 'Aufgaben');
        await page.getByRole('heading', { name: 'Aufgaben', level: 1 }).waitFor();
        await settle(page, 800);
        await shot(page, `lang-aufgaben-${tag}-${theme}`);
        await nav(page, 'Dokumente');
        await page.getByRole('heading', { name: 'Dokumente', level: 1 }).waitFor();
        await settle(page, 800);
        await shot(page, `lang-dokumente-${tag}-${theme}`);
        await nav(page, 'Gespräche');
        await page.getByRole('link', { name: /Widerspruch gegen den Bescheid/ }).first().waitFor();
        await settle(page, 800);
        await shot(page, `lang-gespraeche-${tag}-${theme}`);
      }
      // Ohne Neuladen (die Harness-Sitzung lebt nur im Speicher): über die Liste ins lange Gespräch.
      await nav(page, 'Gespräche');
      await page.getByRole('link', { name: /Widerspruch gegen den Bescheid/ }).first().click();
      await page.getByText(/Antwort wurde hier unterbrochen/).waitFor({ timeout: 15_000 });
      await settle(page, 900);
      await shot(page, `lang-chat-${tag}-${theme}`);
      await page.getByRole('table').first().scrollIntoViewIfNeeded();
      await settle(page, 500);
      await shot(page, `lang-chat-tabelle-${tag}-${theme}`);
    } finally {
      await context.close();
    }
  }
}

async function emptyRun(browser) {
  for (const [width, theme, tag] of [
    [1280, 'hell', 'breit'],
    [390, 'dunkel', 'telefon'],
  ]) {
    const { context, page } = await newPage(browser, theme, { width });
    try {
      await login(page, '/', 'leer');
      await page.getByRole('heading', { name: 'Offene Aufgaben und Fristen' }).waitFor();
      await settle(page);
      await shot(page, `leer-dashboard-${tag}-${theme}`);
      await nav(page, 'Gespräche');
      await settle(page, 900);
      await shot(page, `leer-gespraeche-${tag}-${theme}`);
    } finally {
      await context.close();
    }
  }
}

// Sehr langsame Antwort (4 s je Teilstück): Warten sichtbar, Abbruch per Tastatur, Teiltext bleibt.
async function slowRun(browser) {
  for (const [width, theme, tag] of [
    [390, 'hell', 'telefon'],
    [1280, 'dunkel', 'breit'],
  ]) {
    const { context, page } = await newPage(browser, theme, { width });
    try {
      await login(page, '/gespraeche', 'langsam');
      await page.getByRole('link', { name: /Widerspruch vorbereiten/ }).first().click();
      const box = page.getByLabel('Nachricht an den Sachbearbeiter');
      await box.fill('Was muss in einen Widerspruch?');
      await box.press('Enter');
      await page.getByRole('button', { name: 'Antwort abbrechen' }).waitFor();
      await settle(page, 700);
      await shot(page, `langsam-wartet-${tag}-${theme}`);
      await page.getByText(/drei Punkte wichtig/).waitFor({ timeout: 12_000 });
      await settle(page, 300);
      await shot(page, `langsam-teiltext-${tag}-${theme}`);
      await page.getByRole('button', { name: 'Antwort abbrechen' }).focus();
      await page.keyboard.press('Enter');
      await page.getByText('Antwort abgebrochen').first().waitFor({ timeout: 8000 });
      await settle(page, 900);
      await shot(page, `langsam-abgebrochen-${tag}-${theme}`);
      const parts = await page.getByText(/drei Punkte wichtig/).count();
      if (parts !== 1) problem(`langsam-${tag}`, `Teiltext ${parts}-mal sichtbar`);
      await focusOf(page, `nach Abbruch ${tag}`);
    } finally {
      await context.close();
    }
  }
}

async function loginRun(browser) {
  for (const [width, theme, tag] of [
    [390, 'hell', 'telefon'],
    [1280, 'dunkel', 'breit'],
  ]) {
    const { context, page } = await newPage(browser, theme, { width });
    try {
      await page.goto(`${base}/?szenario=seed`);
      await page.getByLabel('E-Mail-Adresse').fill('name@beispiel');
      await page.getByLabel('Passwort').fill('irgendwas');
      await page.keyboard.press('Enter');
      await page.getByRole('alert').waitFor();
      await settle(page, 400);
      await shot(page, `login-email-unvollstaendig-${tag}-${theme}`);
      await focusOf(page, `E-Mail unvollständig ${tag}`);
      await page.getByLabel('E-Mail-Adresse').fill(EMAIL);
      await page.getByLabel('Passwort').fill('falsch');
      await page.keyboard.press('Enter');
      await page.getByText(/stimmen nicht/).waitFor();
      await settle(page, 400);
      await shot(page, `login-passwort-falsch-${tag}-${theme}`);
      await focusOf(page, `Passwort falsch ${tag}`);
    } finally {
      await context.close();
    }
  }
}

// Tastatur: Tab-Reihenfolge im Dashboard (lange Inhalte), jedes Ziel mit sichtbarem Fokus und im Bild.
async function keyboardRun(browser) {
  for (const [width, theme, tag] of [
    [1280, 'hell', 'breit'],
    [390, 'dunkel', 'telefon'],
  ]) {
    const { context, page } = await newPage(browser, theme, { width });
    try {
      await login(page, '/', 'lang');
      await page.getByRole('heading', { name: 'Offene Aufgaben und Fristen' }).waitFor();
      await settle(page, 800);
      await page.evaluate(() => document.activeElement?.blur());
      const steps = [];
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        const s = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return { name: 'body' };
          const cs = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
          return {
            name: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`,
            visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.left >= -1 && rect.right <= window.innerWidth + 1,
            ring,
            focusVisible: el.matches(':focus-visible'),
          };
        });
        steps.push(s);
        if (s.name !== 'body' && (!s.visible || !s.ring)) problem(`tastatur-${tag}`, `Schritt ${i + 1} ${s.name}: ${!s.visible ? 'nicht im Bild' : 'kein sichtbarer Fokus'}`);
        if (i === 5) {
          await settle(page, 200);
          await shot(page, `tastatur-fokus-${tag}-${theme}`);
        }
      }
      report.keyboard.push({ tag, steps });
    } finally {
      await context.close();
    }
  }
}
