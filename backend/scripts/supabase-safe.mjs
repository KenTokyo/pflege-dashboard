import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, cp, rm, chmod, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { redact } from './redact.mjs';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(backend, '..');
const local = path.join(backend, '.local');
const mirror = path.join(local, 'supabase-project');
// The experimental native runtime currently misquotes paths with spaces during TLS startup.
// This dedicated task directory is outside other Supabase homes; never use ~/.supabase.
const runtimeHome = path.join(tmpdir(), 'pflege-dashboard-supabase-57aea064-phase0');
const cli = path.join(backend, 'node_modules', '.bin', 'supabase');
const action = process.argv[2];
const runtimeOnly = process.argv.includes('--runtime-only');
const phase1Base = process.argv.includes('--phase1-base');
if (phase1Base && !['start','reset'].includes(action)) throw new Error('--phase1-base gilt nur für den gezielten Acht-zu-zehn-Upgradeprüflauf.');
const actions = {
  start: ['start', '--runtime', 'native', '--exclude', 'realtime,studio,mail,analytics,pooler,functions'],
  status: ['status', '--output-format', 'json'],
  reset: ['db', 'reset', '--local', '--yes'],
  test: ['test', 'db', '--local'],
  types: ['gen', 'types', '--local', '--lang', 'typescript', '--schema', 'public'],
  stop: ['stop'],
};
if (!Object.hasOwn(actions, action)) throw new Error('Erlaubt: start, status, reset, test, types, stop.');
if (runtimeOnly && action !== 'start') throw new Error('--runtime-only gilt nur für die Bereitschaftsprüfung.');
await mkdir(local, { recursive: true, mode: 0o700 });
await chmod(local, 0o700);
await mkdir(mirror, { recursive: true, mode: 0o700 });
await mkdir(runtimeHome, { recursive: true, mode: 0o700 });
// Supabase executes in an owned mirror with NO root .env. Only our SQL/config/test files are copied.
await mkdir(path.join(mirror, 'supabase'), { recursive: true });
for (const entry of ['config.toml', 'seed.sql', 'migrations', 'tests']) {
  await rm(path.join(mirror, 'supabase', entry), { recursive: true, force: true });
  await cp(path.join(root, 'supabase', entry), path.join(mirror, 'supabase', entry), { recursive: true });
}
// Preserve all real source files; only the isolated test mirror uses the historical eight.
if (phase1Base) for (const name of await readdir(path.join(mirror,'supabase/migrations'))) {
  if (['20261006160000_deepseek_provider.sql','20261006161000_deepseek_demo_cap.sql'].includes(name))
    await rm(path.join(mirror,'supabase/migrations',name));
}
// Retire only the owned old mirror; no Edge runtime participates in the Node product.
await rm(path.join(mirror,'supabase/functions'),{recursive:true,force:true});
const config = await readFile(path.join(mirror, 'supabase', 'config.toml'), 'utf8');
if (!config.includes('project_id = "pflege-dashboard-phase0"')) throw new Error('Falsche lokale Projektidentität.');
if (runtimeOnly) {
  // Proves the real Supabase services only; NEVER an application schema/seed/RLS gate.
  await rm(path.join(mirror, 'supabase', 'migrations'), { recursive: true, force: true });
  await mkdir(path.join(mirror, 'supabase', 'migrations'));
  await writeFile(path.join(mirror, 'supabase', 'seed.sql'), '-- Availability probe only; no application seed.\n');
}
const safeEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR ?? '/tmp',
  LANG: 'en_US.UTF-8',
  SUPABASE_HOME: runtimeHome,
  SUPABASE_EXPERIMENTAL_STACK: '1',
};
let stdout = '';
let stderr = '';
let child;
let forceStop;
const abort = () => {
  if(!child||forceStop)return;
  try{process.kill(-child.pid,'SIGTERM');}catch{child.kill('SIGTERM');}
  forceStop=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},5000);
};
process.once('SIGINT', abort);
process.once('SIGTERM', abort);
const timeout = setTimeout(abort, action === 'start' ? 600_000 : 180_000);
try {
  const result = await new Promise((resolve, reject) => {
    child = spawn(cli, actions[action], { detached:true, cwd: mirror, env: safeEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  const logPath = path.join(local, `supabase-${action}.log`);
  await writeFile(logPath, redact(stdout + '\n' + stderr), { mode: 0o600 });
  if (result.code !== 0) {
    console.error(`Supabase ${action}: fehlgeschlagen (${result.code ?? result.signal}). Redigiertes Log: ${logPath}`);
    // Only known non-secret failure categories, never raw CLI/status output.
    for (const code of ['invalid keys', 'failed to load config', 'connection refused', 'Unknown subcommand',
      'unsupported', 'download', 'migration', 'permission denied', 'timeout']) {
      if ((stdout + stderr).toLowerCase().includes(code.toLowerCase())) console.error(`Hinweis: ${code}`);
    }
    process.exitCode = 1;
  } else if (action === 'types') {
    if (!stdout.includes('export type Database') || /(?:sb_secret_|eyJ\w+\.\w+\.)/.test(stdout)) {
      throw new Error('Typausgabe konnte nicht sicher bestätigt werden.');
    }
    await writeFile(path.join(root, 'types', 'database.types.ts'),
      '// Generated by Supabase CLI 2.119.0 from the actual local Supabase database.\n' + stdout);
    console.log('Supabase-Typen erzeugt: types/database.types.ts');
  } else {
    console.log(`Supabase ${action}: erfolgreich. Redigiertes Log: ${logPath}`);
    if (action === 'test') {
      const summary = (stdout + stderr).split('\n').filter(line =>
        /^(All tests successful|Files=\d+, Tests=\d+|Result: PASS|Result: FAIL)/.test(line));
      summary.forEach(line => console.log(redact(line)));
    }
  }
} finally {
  clearTimeout(timeout);
  clearTimeout(forceStop);
  process.removeListener('SIGINT', abort);
  process.removeListener('SIGTERM', abort);
}
