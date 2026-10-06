// Gemeinsamer, schonender Prüfbrowser für die Mock-Aufnahmen.
// Regeln (~/.claude/CLAUDE.md, shared-docs/SCREENSHOT-GUIDE.md):
// - nur Chrome for Testing in der Version des Nutzer-Chrome, nie persönlicher Chrome,
//   nie Playwrights mitgelieferter Browser
// - unsichtbar (headless), höchstens 1280×720, genau ein Browser gleichzeitig
// - keine Flags, die Bildrate oder Hintergrund-Drosselung aufheben
// - try/finally, externes Zeitlimit, Signalbereinigung, PID-Nachweis
import { execFileSync, spawn } from 'node:child_process';
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
 * und räumt in jedem Fall auf. Scheitert, wenn PID oder Flags nicht nachweisbar sind
 * oder nach dem Aufräumen noch ein eigener Prozess lebt.
 * Zwei Abbruchsicherungen: ein interner Timer und ein externer Wächterprozess
 * (eigene Prozessgruppe), der Browsergruppe und Node-Prozess auch bei blockierter Event-Loop beendet.
 */
export async function withTestBrowser(work, { timeoutMs = 180_000, label = 'mocks' } = {}) {
  const info = resolveTestBrowser();
  const before = new Set(listTestBrowserPids());
  let browser = null;
  let pid = null;
  let family = [];
  let flagCheck = null;
  let watcher = null;

  const hardKill = () => {
    if (pid) {
      try {
        process.kill(-pid, 'SIGKILL'); // ganze Prozessgruppe des Browsers
      } catch {}
    }
    for (const p of [...family, pid].filter(Boolean)) {
      try {
        process.kill(p, 'SIGKILL');
      } catch {}
    }
  };
  const onSignal = (sig) => {
    console.error(`[${label}] Signal ${sig}: beende Prüfbrowser`);
    hardKill();
    try { process.kill(-watcher.pid, 'SIGKILL'); } catch {}
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  const timer = setTimeout(() => {
    console.error(`[${label}] Zeitlimit ${timeoutMs} ms überschritten: beende Prüfbrowser`);
    hardKill();
    try { process.kill(-watcher.pid, 'SIGKILL'); } catch {}
    process.exit(124);
  }, timeoutMs);

  let failure = null;
  try {
    browser = await chromium.launch({
      executablePath: info.bin,
      headless: true,
      ignoreDefaultArgs: FORBIDDEN_FLAGS,
      args: [`--window-size=${MAX_W},${MAX_H}`],
      timeout: 30_000,
    });
    pid = findOwnBrowserPid();
    if (!pid) throw new Error('Browser-PID nicht nachweisbar – Lauf abgebrochen.');
    const pgid = Number(execFileSync('ps', ['-o', 'pgid=', '-p', String(pid)], { encoding: 'utf8' }).trim());
    // Externer Wächter: eigene Prozessgruppe, unabhängig von der Event-Loop dieses Prozesses.
    watcher = startWatcher({ browserPid: pid, browserGroup: pgid === pid, nodePid: process.pid, seconds: Math.ceil(timeoutMs / 1000) + 5 });
    family = collectFamily(pid);
    flagCheck = verifyFlags(pid);
    if (!flagCheck.ok || !flagCheck.headless) throw new Error(`Flagprüfung negativ: ${JSON.stringify(flagCheck)}`);
    console.log(`[${label}] Prüfbrowser ${info.version} (Nutzer-Chrome ${info.userVersion}) PID ${pid}, Gruppe ${pgid}, Wächter ${watcher.pid}`);
    if (process.env.HANG_TEST_MS) {
      // Nur für den Abbruchnachweis: Event-Loop absichtlich blockieren.
      const until = Date.now() + Number(process.env.HANG_TEST_MS);
      console.log(`[${label}] HANG_TEST: blockiere Event-Loop ${process.env.HANG_TEST_MS} ms`);
      while (Date.now() < until) {}
    }
    const result = await work(browser, info);
    return { result, info, pid, flagCheck, watcherPid: watcher.pid };
  } catch (err) {
    failure = err;
    throw err;
  } finally {
    family = pid ? [...new Set([...family, ...collectFamily(pid)])] : family;
    try {
      if (browser) await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 10_000))]);
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
    let left = [...family, pid].filter((p) => p && pidAlive(p));
    if (left.length) {
      console.error(`[${label}] Nachzügler ${left.join(',')}: SIGKILL`);
      hardKill();
      await new Promise((r) => setTimeout(r, 400));
    }
    // Auch neue, nicht zugeordnete Chrome-for-Testing-Prozesse dieses Laufs zählen als Rest.
    const strays = listTestBrowserPids().filter((p) => !before.has(p) && isDescendantOf(p, process.pid));
    const still = [...new Set([...family, pid, ...strays].filter((p) => p && pidAlive(p)))];
    await stopWatcher(watcher);
    clearTimeout(timer);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    const watcherGone = watcher ? (watcher.exitCode !== null || watcher.signalCode !== null) && !pidAlive(watcher.pid) : true;
    console.log(
      `[${label}] Bereinigung: Browser-PID ${pid} + ${family.length} Kindprozesse beendet, noch aktiv: ${still.length ? still.join(',') : 'keine'}, Wächter beendet: ${watcherGone ? 'ja' : 'nein'}`,
    );
    if ((still.length || !watcherGone) && !failure) {
      throw new Error(`Bereinigung unvollständig: ${still.join(',')} ${watcherGone ? '' : `Wächter ${watcher.pid}`}`);
    }
  }
}

function startWatcher({ browserPid, browserGroup, nodePid, seconds }) {
  const killBrowser = browserGroup ? `kill -KILL -- -${browserPid} 2>/dev/null; kill -KILL ${browserPid} 2>/dev/null` : `pkill -KILL -P ${browserPid} 2>/dev/null; kill -KILL ${browserPid} 2>/dev/null`;
  const script = `sleep ${seconds}; echo "[wächter] Zeitlimit: beende Browser ${browserPid} und Node ${nodePid}" >&2; ${killBrowser}; kill -TERM ${nodePid} 2>/dev/null; sleep 2; kill -KILL ${nodePid} 2>/dev/null`;
  const child = spawn('/bin/sh', ['-c', script], { detached: true, stdio: ['ignore', 'ignore', 'inherit'] });
  child.unref();
  return child;
}

async function stopWatcher(w) {
  if (!w || !w.pid) return;
  if (w.exitCode !== null || w.signalCode !== null) return;
  const exited = new Promise((r) => w.once('exit', r));
  try {
    process.kill(-w.pid, 'SIGKILL'); // sh und sein sleep (eigene Prozessgruppe)
  } catch {}
  try {
    process.kill(w.pid, 'SIGKILL');
  } catch {}
  await Promise.race([exited, new Promise((r) => setTimeout(r, 2000))]);
}

function listTestBrowserPids() {
  try {
    return execFileSync('pgrep', ['-f', 'Google Chrome for Testing'], { encoding: 'utf8' }).split('\n').filter(Boolean).map(Number);
  } catch {
    return [];
  }
}

function isDescendantOf(p, ancestor) {
  let cur = p;
  for (let i = 0; i < 12 && cur > 1; i++) {
    try {
      cur = Number(execFileSync('ps', ['-o', 'ppid=', '-p', String(cur)], { encoding: 'utf8' }).trim());
    } catch {
      return false;
    }
    if (cur === ancestor) return true;
  }
  return false;
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
