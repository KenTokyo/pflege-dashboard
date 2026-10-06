/* global document */
// Echte App ohne Anmeldung (`npm run dev`, Vite 5173 + App-Server 5174): Login in beiden Themes,
// geschützte Route leitet zur Anmeldung, E-Mail-Vorprüfung ohne Auth-Anfrage. Es werden KEINE
// Zugangsdaten abgeschickt, keine Konten benutzt. Jede Anfrage außerhalb von 127.0.0.1:5173 wird
// blockiert und protokolliert (erwartet: keine). Ein unsichtbarer Chrome for Testing, ≤ 1280×720,
// try/finally, Zeitlimit, Dev-Prozessgruppe wird am Ende beendet und die Ports werden geprüft.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withTestBrowser } from '../docs/mocks/tools/browser.mjs';
import { portBusy } from './lib/supervisor.mjs';

const root = process.cwd();
const out = resolve(process.env.OUT ?? join(root, 'docs/mocks/tagwerk/phase1-randfaelle/echt'));
mkdirSync(out, { recursive: true });
const WEB = 'http://127.0.0.1:5173';
const report = { browser: null, shots: [], checks: [], blocked: [], sameOrigin: [], problems: [], cleanup: {} };
const check = (name, ok, detail = '') => report.checks.push({ name, ok, detail }) && (ok || report.problems.push(`${name}${detail ? `: ${detail}` : ''}`));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const port of [5173, 5174]) {
  if (await portBusy(port)) {
    console.error(`Port ${port} ist belegt – Prüfung abgebrochen (fremde Prozesse werden nicht beendet).`);
    process.exit(1);
  }
}

const dev = spawn(process.execPath, ['tools/dev.mjs'], { cwd: root, detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
let devLog = '';
dev.stderr.on('data', (d) => (devLog += String(d)));
try {
  const ready = await waitFor(`${WEB}/`, 60_000);
  if (!ready) throw new Error(`Dev-Server nicht bereit:\n${devLog.slice(-800)}`);
  const run = await withTestBrowser(
    async (browser, info) => {
      report.browser = info.version;
      for (const [theme, width] of [
        ['dunkel', 1280],
        ['hell', 1280],
        ['hell', 390],
        ['dunkel', 390],
      ]) {
        await themeRun(browser, theme, width);
      }
    },
    { timeoutMs: 180_000, label: 'echte-app' },
  );
  report.cleanup.browserPid = run.pid;
  report.cleanup.watcherPid = run.watcherPid;
} finally {
  // Ganze Prozessgruppe des Dev-Starts beenden (Vite + App-Server), dann Ports prüfen.
  try {
    process.kill(-dev.pid, 'SIGTERM');
  } catch {
    // schon beendet
  }
  for (let i = 0; i < 50 && ((await portBusy(5173)) || (await portBusy(5174))); i++) await sleep(100);
  if ((await portBusy(5173)) || (await portBusy(5174))) {
    try {
      process.kill(-dev.pid, 'SIGKILL');
    } catch {
      // schon beendet
    }
    await sleep(500);
  }
  report.cleanup.devGroup = dev.pid;
  report.cleanup.port5173Free = !(await portBusy(5173));
  report.cleanup.port5174Free = !(await portBusy(5174));
  console.log(`[echte-app] Dev-Gruppe ${dev.pid} beendet; 5173 frei: ${report.cleanup.port5173Free}, 5174 frei: ${report.cleanup.port5174Free}`);
}
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
for (const c of report.checks) console.log(`${c.ok ? 'OK ' : 'FEHLER'} ${c.name}${c.detail ? ` – ${c.detail}` : ''}`);
console.log(`Bilder: ${report.shots.length}, fremde Anfragen: ${report.blocked.length}, Probleme: ${report.problems.length}`);
process.exitCode = report.problems.length ? 1 : 0;

// ---------------------------------------------------------------------------

async function waitFor(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      // noch nicht bereit
    }
    await sleep(300);
  }
  return false;
}

async function themeRun(browser, theme, width) {
  const tag = `${width < 600 ? 'telefon' : 'breit'}-${theme}`;
  const context = await browser.newContext({
    viewport: { width, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: theme === 'hell' ? 'light' : 'dark',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(WEB) || url.startsWith('data:')) {
      if (url.includes('/api/')) report.sameOrigin.push(url.replace(WEB, ''));
      return route.continue();
    }
    report.blocked.push(`${tag}: ${route.request().method()} ${new URL(url).origin}${new URL(url).pathname}`);
    return route.abort();
  });
  await context.addInitScript(([t]) => {
    try {
      localStorage.setItem('pflege-dashboard:theme', t);
    } catch {
      // gesperrter Speicher
    }
  }, [theme]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    const before = report.blocked.length;
    await page.goto(`${WEB}/aufgaben`);
    await page.getByLabel('E-Mail-Adresse').waitFor({ timeout: 15_000 });
    const url = new URL(page.url());
    check(`${tag}: /aufgaben ohne Sitzung → Anmeldung`, url.pathname === '/anmelden' && url.searchParams.get('weiter') === '/aufgaben', page.url().replace(WEB, ''));
    const actualTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    check(`${tag}: Theme aktiv`, actualTheme === theme, String(actualTheme));
    await page.evaluate(() => document.fonts.ready);
    await sleep(700);
    await shot(page, `login-${tag}`);
    await page.getByLabel('E-Mail-Adresse').fill('name@beispiel');
    await page.getByLabel('Passwort').fill('kein-echtes-passwort');
    await page.getByLabel('Passwort').press('Enter');
    const alert = await page.getByRole('alert').textContent({ timeout: 5000 });
    check(`${tag}: unvollständige E-Mail wird lokal abgelehnt`, /vollständige E-Mail-Adresse/.test(alert ?? ''), alert ?? '');
    const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('name') || document.activeElement?.tagName);
    check(`${tag}: Fokus im E-Mail-Feld`, (await page.getByLabel('E-Mail-Adresse').evaluate((el) => el === document.activeElement)), String(focused));
    await sleep(500);
    check(`${tag}: keine Anfrage an fremde Dienste`, report.blocked.length === before, report.blocked.slice(before).join(', '));
    await shot(page, `login-email-fehler-${tag}`);
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    check(`${tag}: kein waagerechter Überlauf`, scrollW <= width + 1, `${scrollW}px`);
    check(`${tag}: keine Seitenfehler`, errors.length === 0, errors.join(' | '));
  } finally {
    await context.close();
  }
}

async function shot(page, name) {
  const path = join(out, `${name}.png`);
  await page.screenshot({ path, animations: 'disabled', caret: 'hide' });
  report.shots.push(path);
}
