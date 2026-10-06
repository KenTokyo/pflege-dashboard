/* global window, document, getComputedStyle */
// Bildaufnahmen der Phase-1-App über den Prüf-Harness (synthetischer Test-Transport, echtes Login-Formular).
// Genau ein unsichtbarer Chrome for Testing (Version des Nutzer-Chrome), höchstens 1280×720, keine
// Drosselungs-Flags, try/finally, Zeitlimit, Wächterprozess, vollständige Bereinigung inkl. Vite-Server.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { withTestBrowser } from '../docs/mocks/tools/browser.mjs';

const root = process.cwd();
const out = join(root, 'docs/mocks/tagwerk/phase1');
mkdirSync(out, { recursive: true });
const CONV = '10000000-0000-4000-8000-000000000050';
const EMAIL = 'pruefung@beispiel.invalid';
const PASSWORD = 'nur-synthetisch';
const THEMES = (process.env.THEMES ?? 'dunkel,hell').split(',');
const report = { browser: null, shots: [], audits: [], idle: [], problems: [], console: [] };
const problem = (where, what) => report.problems.push(`${where}: ${what}`);

const server = await createServer({ configFile: join(root, 'vite.harness.config.ts'), logLevel: 'warn' });
let base = null;
try {
  await server.listen();
  base = `http://127.0.0.1:${server.config.server.port}`;
  const run = await withTestBrowser(
    async (browser, info) => {
      report.browser = info.version;
      for (const theme of THEMES) await themeRun(browser, theme);
      await narrowRun(browser);
    },
    { timeoutMs: 420_000, label: 'phase1-shots' },
  );
  report.cleanup = { browserPid: run.pid, watcherPid: run.watcherPid };
} finally {
  await server.close();
  console.log('[phase1-shots] Vite-Harness-Server beendet');
}
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Bilder: ${report.shots.length}, Probleme: ${report.problems.length}`);
for (const p of report.problems) console.log(`PROBLEM ${p}`);
for (const i of report.idle) console.log(`Leerlauf ${i.where}: ${JSON.stringify(i)}`);
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
  // Nur der lokale Harness; jede andere Anfrage wäre ein Fehler (keine Netzaufrufe, keine Fremdressourcen).
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
    // Zähler für die Leerlaufprüfung: Bilder (rAF) und Timer.
    const w = window;
    w.__idle = { raf: 0, timeouts: 0 };
    const raf = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = (cb) => {
      w.__idle.raf += 1;
      return raf(cb);
    };
    const st = w.setTimeout.bind(w);
    w.setTimeout = (fn, ms, ...a) => {
      w.__idle.timeouts += 1;
      return st(fn, ms, ...a);
    };
  }, [theme]);
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') report.console.push(`${m.type()}: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => problem('Seite', e.message));
  return { context, page };
}

async function settle(page, ms = 1300) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  const path = join(out, `${name}.png`);
  await page.screenshot({ path, animations: 'disabled', caret: 'hide' });
  report.shots.push(`${name}.png`);
  await audit(page, name);
}

async function audit(page, name) {
  const width = page.viewportSize().width;
  const r = await page.evaluate((width) => {
    const out = { scrollW: document.documentElement.scrollWidth, tiny: [], small: [], overflow: [] };
    const phone = width < 600;
    for (const el of document.body.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (el.closest('.sr-only')) continue;
      if (!el.closest('svg') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
        if (parseFloat(cs.fontSize) < 12) out.tiny.push(`${el.tagName} ${cs.fontSize} "${el.textContent.trim().slice(0, 24)}"`);
      }
      if (phone && el.matches('a[href], button, input, select, textarea') && !el.closest('.skip') && !el.matches('.skip')) {
        if (rect.height < 40 || rect.width < 40) out.small.push(`${el.tagName} ${Math.round(rect.width)}×${Math.round(rect.height)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`);
      }
    }
    return out;
  }, width);
  if (r.scrollW > width + 1) problem(name, `waagerechter Überlauf ${r.scrollW} > ${width}`);
  if (r.tiny.length) problem(name, `Schrift < 12px: ${r.tiny.slice(0, 4).join(' | ')}`);
  if (r.small.length) problem(name, `Bedienziel < 40px: ${r.small.slice(0, 6).join(' | ')}`);
  report.audits.push({ name, ...r, tiny: r.tiny.length, small: r.small.length });
}

/** Ruhiger Leerlauf: nach dem Einschwingen 3 s lang keine Bilder, keine Animationen, keine Timer. */
async function idleCheck(page, where) {
  await page.waitForTimeout(1500);
  const a = await page.evaluate(() => ({ ...window.__idle, anim: document.getAnimations().filter((x) => x.playState === 'running').length }));
  await page.waitForTimeout(3000);
  const b = await page.evaluate(() => ({ ...window.__idle, anim: document.getAnimations().filter((x) => x.playState === 'running').length }));
  const res = { where, raf: b.raf - a.raf, timeouts: b.timeouts - a.timeouts, runningAnimations: b.anim };
  report.idle.push(res);
  if (res.raf > 0 || res.timeouts > 0 || res.runningAnimations > 0) problem(where, `Leerlauf nicht ruhig: ${JSON.stringify(res)}`);
}

async function login(page, path, szenario = 'seed') {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${base}${path}${sep}szenario=${szenario}`);
  await page.getByLabel('E-Mail-Adresse').fill(EMAIL);
  await page.getByLabel('Passwort').fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.getByLabel('E-Mail-Adresse').waitFor({ state: 'detached' });
}

async function sendInThread(page, text) {
  const box = page.getByLabel('Nachricht an den Sachbearbeiter');
  await box.fill(text);
  await box.press('Enter');
}

async function themeRun(browser, t) {
  // 1) Anmeldung, falsche Daten, Dashboard, Seiten, Leerlauf, 15-Minuten-Abmeldung
  {
    const { context, page } = await newPage(browser, t);
    try {
      await page.goto(`${base}/?szenario=seed`);
      await page.getByLabel('E-Mail-Adresse').waitFor();
      await settle(page, 600);
      await shot(page, `login-${t}`);
      await page.getByLabel('E-Mail-Adresse').fill(EMAIL);
      await page.getByLabel('Passwort').fill('falsch');
      await page.getByRole('button', { name: 'Anmelden' }).click();
      await page.getByRole('alert').waitFor();
      await settle(page, 300);
      await shot(page, `login-fehler-${t}`);
      await page.getByLabel('Passwort').fill(PASSWORD);
      await page.getByRole('button', { name: 'Anmelden' }).click();
      await page.getByRole('heading', { name: 'Offene Aufgaben und Fristen' }).waitFor();
      await settle(page);
      await shot(page, `dashboard-${t}`);
      await idleCheck(page, `dashboard-${t}`);
      for (const [label, name, heading] of [
        ['Gespräche', 'gespraeche', null],
        ['Dokumente', 'dokumente', 'Dokumente'],
        ['Aufgaben', 'aufgaben', 'Aufgaben'],
      ]) {
        await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: label }).click();
        if (heading) await page.getByRole('heading', { name: heading, level: 1 }).waitFor();
        await settle(page, 900);
        await shot(page, `${name}-${t}`);
      }
      await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Gespräche' }).click();
      await page.getByRole('link', { name: /Widerspruch vorbereiten/ }).first().click();
      await page.getByLabel('Nachricht an den Sachbearbeiter').waitFor();
      await settle(page, 900);
      await shot(page, `chat-ohne-modell-${t}`);
      await idleCheck(page, `chat-ohne-modell-${t}`);
      await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Einstellungen' }).click();
      await page.getByRole('heading', { name: 'Einstellungen', level: 1 }).waitFor();
      await settle(page, 900);
      await shot(page, `einstellungen-${t}`);
      // 15 Minuten ohne Aktivität (Uhr vorgespult, keine echte Wartezeit).
      await page.evaluate(() => window.__harness.advance(15 * 60 * 1000));
      await page.getByText('Sie wurden nach 15 Minuten ohne Aktivität abgemeldet.').waitFor();
      // Server-Ende und Widerruf laufen nach der lokalen Abmeldung begrenzt im Hintergrund.
      const ended = await page
        .waitForFunction(() => window.__harness.calls.end === 1 && window.__harness.calls.signOut === 1, null, { timeout: 9000 })
        .then(() => true, () => false);
      if (!ended) problem(`abmeldung-${t}`, `Sitzungsende nicht vollständig: ${JSON.stringify(await page.evaluate(() => window.__harness.calls.end))}`);
      await settle(page, 400);
      await shot(page, `abgemeldet-${t}`);
    } finally {
      await context.close();
    }
  }
  // 2) Synthetisch freigegebenes Modell: Frage im Dashboard → gestreamte Antwort (angehalten) → Abschluss
  {
    const { context, page } = await newPage(browser, t);
    try {
      await page.goto(`${base}/?szenario=modell&halten=1`);
      await page.getByLabel('E-Mail-Adresse').fill(EMAIL);
      await page.getByLabel('Passwort').fill(PASSWORD);
      await page.getByRole('button', { name: 'Anmelden' }).click();
      await page.getByLabel('Ihre Frage an den Sachbearbeiter').fill('Was muss in einen Widerspruch gegen den Pflegegrad?');
      await page.getByRole('button', { name: /^Fragen/ }).click();
      await page.getByText(/eine Pflegeberatung klären/).waitFor({ timeout: 15_000 });
      await settle(page, 400);
      await shot(page, `chat-stream-${t}`);
      await page.evaluate(() => window.__harness.release());
      await page.getByRole('link', { name: 'BMG: Pflegegrade' }).waitFor();
      await settle(page, 600);
      await shot(page, `chat-antwort-${t}`);
      await idleCheck(page, `chat-antwort-${t}`);
    } finally {
      await context.close();
    }
  }
  // 3) Fehlerwege: Anbieter nicht eingerichtet, Verbindungsabriss
  for (const [szenario, name, wait] of [
    ['anbieter', 'chat-anbieter', /noch nicht eingerichtet/],
    ['abriss', 'chat-abriss', /Antwort erneut abrufen/],
  ]) {
    const { context, page } = await newPage(browser, t);
    try {
      await login(page, `/gespraeche/${CONV}`, szenario);
      await page.getByLabel('Nachricht an den Sachbearbeiter').waitFor();
      await sendInThread(page, 'Welche Unterlagen brauche ich für den Widerspruch?');
      await page.getByText(wait).first().waitFor({ timeout: 15_000 });
      await settle(page, 500);
      await shot(page, `${name}-${t}`);
    } finally {
      await context.close();
    }
  }
}

async function narrowRun(browser) {
  for (const [width, label] of [
    [390, 'telefon'],
    [768, 'tablet'],
  ]) {
    for (const t of THEMES) {
      if (width === 768 && t === 'hell') continue;
      const { context, page } = await newPage(browser, t, { width, height: 720 });
      try {
        await page.goto(`${base}/?szenario=modell`);
        await settle(page, 500);
        await shot(page, `${label}-login-${t}`);
        await page.getByLabel('E-Mail-Adresse').fill(EMAIL);
        await page.getByLabel('Passwort').fill(PASSWORD);
        await page.getByRole('button', { name: 'Anmelden' }).click();
        await page.getByRole('heading', { name: 'Offene Aufgaben und Fristen' }).waitFor();
        await settle(page);
        await shot(page, `${label}-dashboard-${t}`);
        await page.evaluate(() => window.scrollTo(0, 640));
        await settle(page, 700);
        await shot(page, `${label}-dashboard-unten-${t}`);
        await page.getByRole('navigation', { name: /Hauptnavigation/ }).getByRole('link', { name: 'Gespräche' }).click();
        await page.getByRole('link', { name: /Widerspruch vorbereiten/ }).first().waitFor();
        await settle(page, 700);
        await shot(page, `${label}-gespraeche-${t}`);
        await page.getByRole('link', { name: /Widerspruch vorbereiten/ }).first().click();
        await sendInThread(page, 'Was muss in einen Widerspruch?');
        await page.getByRole('link', { name: 'BMG: Pflegegrade' }).waitFor({ timeout: 15_000 });
        await settle(page, 700);
        await shot(page, `${label}-chat-${t}`);
        await page.getByRole('link', { name: 'Einstellungen' }).first().click();
        await page.getByRole('heading', { name: 'Einstellungen', level: 1 }).waitFor();
        await settle(page, 700);
        await shot(page, `${label}-einstellungen-${t}`);
      } finally {
        await context.close();
      }
    }
  }
}
