/**
 * Prüft den Prozess-Abbau von `npm run dev`/`npm start` (tools/lib/supervisor.mjs) mit synthetischen
 * Diensten, ohne Browser und ohne echten App-Server:
 * Enkelprozesse enden mit, Ausfall eines Dienstes beendet den anderen, hängende Dienste werden
 * nach Frist erzwungen beendet, SIGINT räumt alles auf. Nur selbst gestartete PIDs werden geprüft.
 */
import { execFileSync, spawn } from 'node:child_process';
import { createSupervisor } from './lib/supervisor.mjs';

const failures = [];
let passed = 0;
const check = (name, ok, detail = '') => (ok ? (passed += 1) : failures.push(`${name}${detail ? `: ${detail}` : ''}`));
setTimeout(() => {
  console.error('Dev-Prozessprüfung: Gesamtzeit überschritten (40 s).');
  reap();
  process.exit(1);
}, 40_000).unref();

// Notaufräumen: nur PIDs, die diese Prüfung selbst gestartet hat und deren Befehl noch der
// eigene Testdienst ist (Schutz gegen wiederverwendete PIDs fremder Prozesse).
const pidLog = [];
const MARKER = 'setInterval(() => {}, 1000)';
function reap() {
  for (const p of pidLog) {
    try {
      const cmd = execFileSync('ps', ['-o', 'command=', '-p', String(p)], { encoding: 'utf8' });
      if (cmd.includes(MARKER) || cmd.includes('createSupervisor')) process.kill(p, 'SIGKILL');
    } catch {
      // schon beendet
    }
  }
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function allGone(pids, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end && pids.some(alive)) await sleep(50);
  return !pids.some(alive);
}

// Dienst: startet einen Enkel in derselben Prozessgruppe und läuft dann weiter.
const SERVICE = (opts = '') => `
  const { spawn } = require('node:child_process');
  spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  ${opts}
  setInterval(() => {}, 1000);
`;

function groupPids(pgid) {
  try {
    return execFileSync('ps', ['-o', 'pid=', '-g', String(pgid)], { encoding: 'utf8' })
      .split('\n')
      .map((x) => Number(x.trim()))
      .filter(Boolean);
  } catch {
    return [];
  }
}
async function collect(sup, name, opts) {
  const entry = sup.start(name, process.execPath, ['-e', SERVICE(opts)]);
  await sleep(300);
  const pids = groupPids(entry.child.pid);
  pidLog.push(...pids);
  return { entry, pids };
}

const quiet = { log: () => undefined };

// A) Normales Beenden: beide Dienste samt Enkeln weg.
{
  const sup = createSupervisor(quiet);
  const a = await collect(sup, 'A1');
  const b = await collect(sup, 'A2');
  check('A: je Dienst Prozess + Enkel in eigener Gruppe', a.pids.length === 2 && b.pids.length === 2, `${a.pids.length}/${b.pids.length}`);
  const r = await sup.stop('Test', 0);
  check('A: Exitcode 0', r.exitCode === 0);
  check('A: alle Prozesse und Enkel beendet', await allGone([...a.pids, ...b.pids]));
}

// B) Ein Dienst fällt aus → der andere wird beendet, Exitcode 1.
{
  const sup = createSupervisor(quiet);
  const a = await collect(sup, 'B1', "setTimeout(() => process.exit(3), 1200);");
  const b = await collect(sup, 'B2');
  check('B: beide Dienste liefen', a.pids.length === 2 && b.pids.length === 2, `${a.pids.length}/${b.pids.length}`);
  const r = await Promise.race([sup.done, sleep(5000).then(() => null)]);
  check('B: Ausfall eines Dienstes stoppt alles', r?.exitCode === 1, JSON.stringify(r));
  check('B: auch der gesunde Dienst und alle Enkel beendet', await allGone([...a.pids, ...b.pids]));
}

// C) Hängender Dienst ignoriert SIGTERM → SIGKILL nach Frist.
{
  const sup = createSupervisor({ ...quiet, killAfterMs: 800 });
  const a = await collect(sup, 'C1', "process.on('SIGTERM', () => {});");
  const t0 = Date.now();
  await sup.stop('Test', 0);
  const took = Date.now() - t0;
  check('C: SIGKILL nach Frist', await allGone(a.pids, 2000), `${took} ms`);
  check('C: Frist eingehalten (< 2 s)', took < 2000, `${took} ms`);
}

// D) Startfehler (Befehl fehlt) → sauberer Abbruch ohne Hänger.
{
  const sup = createSupervisor(quiet);
  const ok = await collect(sup, 'D1');
  sup.start('D2', '/nonexistent/tagwerk-cmd', []);
  const r = await Promise.race([sup.done, sleep(5000).then(() => null)]);
  check('D: Startfehler beendet alles', r?.exitCode === 1, JSON.stringify(r));
  check('D: laufender Dienst beendet', await allGone(ok.pids));
}

// E) Ganzes Skript wie `npm run dev`: SIGINT an den Supervisor-Prozess räumt alles auf.
{
  const fixture = `
    import { bindProcess, createSupervisor } from ${JSON.stringify(new URL('./lib/supervisor.mjs', import.meta.url).href)};
    const sup = createSupervisor({ log: () => undefined });
    bindProcess(sup);
    for (const n of ['E1', 'E2']) sup.start(n, process.execPath, ['-e', ${JSON.stringify(SERVICE())}]);
    process.stdout.write('started\\n');
  `;
  const proc = spawn(process.execPath, ['--input-type=module', '-e', fixture], { stdio: ['ignore', 'pipe', 'inherit'], detached: true });
  await new Promise((r) => proc.stdout.once('data', r));
  await sleep(400);
  // Kinder des Supervisors (eigene Gruppen) und deren Enkel.
  const children = execFileSync('pgrep', ['-P', String(proc.pid)], { encoding: 'utf8' }).split('\n').map(Number).filter(Boolean);
  const grand = children.flatMap((c) => {
    try {
      return execFileSync('pgrep', ['-P', String(c)], { encoding: 'utf8' }).split('\n').map(Number).filter(Boolean);
    } catch {
      return [];
    }
  });
  check('E: zwei Dienste mit Enkeln gestartet', children.length === 2 && grand.length === 2, `${children.length}/${grand.length}`);
  const exit = new Promise((r) => proc.once('exit', (code, signal) => r({ code, signal })));
  process.kill(proc.pid, 'SIGINT');
  const res = await Promise.race([exit, sleep(8000).then(() => null)]);
  check('E: Supervisor endet nach SIGINT mit 130', res?.code === 130, JSON.stringify(res));
  check('E: alle Dienste und Enkel beendet', await allGone([...children, ...grand]));
  if (alive(proc.pid)) process.kill(proc.pid, 'SIGKILL');
  pidLog.push(proc.pid, ...children, ...grand);
}

const leftovers = pidLog.filter(alive);
check('keine eigenen Restprozesse', leftovers.length === 0, leftovers.join(','));
reap(); // auch bei Fehlern nichts zurücklassen
if (failures.length) {
  console.error(`Dev-Prozessprüfung: ${failures.length} Fehler`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`Dev-Prozessprüfung: ${passed} Prüfungen bestanden (eigene Prozessgruppen, keine Restprozesse).`);
}
