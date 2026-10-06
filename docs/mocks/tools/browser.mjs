// Gemeinsamer, schonender Prüfbrowser für die Mock-Aufnahmen.
// Regeln (~/.claude/CLAUDE.md, shared-docs/SCREENSHOT-GUIDE.md):
// - nur Chrome for Testing in der Version des Nutzer-Chrome, nie persönlicher Chrome,
//   nie Playwrights mitgelieferter Browser
// - unsichtbar (headless), höchstens 1280×720, genau ein Browser gleichzeitig
// - keine Flags, die Bildrate oder Hintergrund-Drosselung aufheben
// - try/finally, externes Zeitlimit, Signalbereinigung, PID-Nachweis
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const DEFAULT_BIN = join(
  homedir(),
  'Library/Caches/chrome-for-testing/current/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);

// Playwright hängt diese Schalter standardmäßig an. Sie heben Drosselung auf und sind verboten.
const FORBIDDEN_FLAGS = [
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--disable-ipc-flooding-protection',
  '--disable-frame-rate-limit',
  '--disable-gpu-vsync',
];

export const MAX_W = 1280;
export const MAX_H = 720;

export function resolveTestBrowser() {
  const bin = process.env.TEST_BROWSER_BIN || DEFAULT_BIN;
  if (!existsSync(bin)) throw new Error(`Chrome for Testing fehlt: ${bin}`);
  const real = realpathSync(bin);
  if (!real.includes('Google Chrome for Testing.app')) {
    throw new Error(`Abgelehnt: ${real} ist kein Chrome for Testing.`);
  }
  if (real.includes('ms-playwright')) throw new Error('Abgelehnt: mitgelieferter Playwright-Browser.');
  const version = execFileSync(real, ['--version'], { encoding: 'utf8' }).trim();
  const userVersion = readUserChromeVersion();
  const major = (v) => (v.match(/(\d+)\./) || [])[1];
  if (userVersion && major(version) !== major(userVersion)) {
    throw new Error(`Versionskonflikt: ${version} gegen Nutzer-Chrome ${userVersion}`);
  }
  return { bin: real, version, userVersion };
}

function readUserChromeVersion() {
  try {
    return execFileSync(
      '/usr/libexec/PlistBuddy',
      ['-c', 'Print CFBundleShortVersionString', '/Applications/Google Chrome.app/Contents/Info.plist'],
      { encoding: 'utf8' },
    ).trim();
  } catch {
    return null;
  }
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function childPids(pid) {
  try {
    return execFileSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
}

/**
 * Startet genau einen unsichtbaren Prüfbrowser, führt `work(browser, info)` aus
 * und räumt in jedem Fall auf. Gibt das Ergebnis von `work` und einen Bereinigungsnachweis zurück.
 */
export async function withTestBrowser(work, { timeoutMs = 180_000, label = 'mocks' } = {}) {
  const info = resolveTestBrowser();
  let browser = null;
  let pid = null;
  let family = [];
  let flagCheck = null;

  const hardKill = () => {
    for (const p of [...family, pid].filter(Boolean)) {
      try {
        process.kill(p, 'SIGKILL');
      } catch {}
    }
  };
  const onSignal = (sig) => {
    console.error(`[${label}] Signal ${sig}: beende Prüfbrowser`);
    hardKill();
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  const watchdog = setTimeout(() => {
    console.error(`[${label}] Zeitlimit ${timeoutMs} ms überschritten: beende Prüfbrowser`);
    hardKill();
    process.exit(124);
  }, timeoutMs);

  try {
    browser = await chromium.launch({
      executablePath: info.bin,
      headless: true,
      ignoreDefaultArgs: FORBIDDEN_FLAGS,
      args: [`--window-size=${MAX_W},${MAX_H}`],
      timeout: 30_000,
    });
    pid = browser.process?.()?.pid ?? null;
    if (!pid) {
      // playwright-core gibt den Prozess nur über die interne Verbindung frei; per Profilsuche ermitteln.
      pid = findOwnBrowserPid();
    }
    family = pid ? collectFamily(pid) : [];
    flagCheck = verifyFlags(pid);
    console.log(`[${label}] Prüfbrowser ${info.version} (Nutzer-Chrome ${info.userVersion}) PID ${pid}`);
    const result = await work(browser, info);
    return { result, info, pid, flagCheck };
  } finally {
    family = pid ? [...new Set([...family, ...collectFamily(pid)])] : family;
    try {
      if (browser) await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 10_000))]);
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
    const left = [...family, pid].filter((p) => p && pidAlive(p));
    if (left.length) {
      console.error(`[${label}] Nachzügler ${left.join(',')}: SIGKILL`);
      hardKill();
      await new Promise((r) => setTimeout(r, 300));
    }
    const still = [...family, pid].filter((p) => p && pidAlive(p));
    clearTimeout(watchdog);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    console.log(
      `[${label}] Bereinigung: Browser-PID ${pid} + ${family.length} Kindprozesse beendet, noch aktiv: ${still.length ? still.join(',') : 'keine'}`,
    );
  }
}

function collectFamily(root) {
  const out = [];
  const queue = [root];
  const seen = new Set();
  while (queue.length && out.length < 200) {
    const p = queue.shift();
    if (seen.has(p)) continue;
    seen.add(p);
    for (const c of childPids(p)) {
      out.push(c);
      queue.push(c);
    }
  }
  return out;
}

function findOwnBrowserPid() {
  // Hauptprozess des Prüfbrowsers ist ein direktes Kind dieses Node-Prozesses.
  for (const c of childPids(process.pid)) {
    try {
      const cmd = execFileSync('ps', ['-o', 'command=', '-p', String(c)], { encoding: 'utf8' });
      if (cmd.includes('Google Chrome for Testing')) return c;
    } catch {}
  }
  return null;
}

function verifyFlags(pid) {
  if (!pid) return { ok: false, reason: 'PID unbekannt' };
  const cmd = execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' });
  const found = FORBIDDEN_FLAGS.filter((f) => cmd.includes(f));
  if (found.length) throw new Error(`Verbotene Flags im Prüfbrowser: ${found.join(', ')}`);
  return { ok: true, headless: cmd.includes('--headless'), forbidden: found };
}
