// Prüft den Produkt-Build (dist/) auf Geheimnisse und Testcode. Gibt nie Werte aus, nur Namen/Fundstellen.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadEnv } from 'vite';

const root = process.cwd();
const dist = join(root, 'dist');

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

let all;
try {
  all = files(dist);
} catch {
  console.error('dist/ fehlt – bitte zuerst `npm run build`.');
  process.exit(1);
}
const text = all.filter((f) => /\.(js|css|html|json|txt|svg|map)$/.test(f)).map((f) => ({ f: relative(root, f), s: readFileSync(f, 'utf8') }));
const problems = [];

// 1) Keine Sourcemaps im Auslieferungsstand.
for (const f of all) if (f.endsWith('.map')) problems.push(`Sourcemap ausgeliefert: ${relative(root, f)}`);

// 2) Werte aller NICHT öffentlichen Variablen aus .env dürfen nicht im Build stehen (Werte bleiben im Speicher).
const env = loadEnv('production', root, '');
const publicNames = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']);
const publicValues = [...publicNames].map((n) => env[n] ?? '').filter(Boolean);
let checkedSecrets = 0;
for (const [name, value] of Object.entries(env)) {
  if (publicNames.has(name) || !value || value.length < 8) continue;
  // Projekt-Ref/URL sind Teil der öffentlichen Projekt-URL und damit selbst öffentlich.
  if (publicValues.some((v) => v.includes(value))) continue;
  if (!(name in process.env) || process.env[name] !== value || existsInDotEnv(name)) {
    checkedSecrets += 1;
    for (const { f, s } of text) if (s.includes(value)) problems.push(`Wert von ${name} steht in ${f}`);
  }
}
function existsInDotEnv(name) {
  try {
    return readFileSync(join(root, '.env'), 'utf8').split('\n').some((l) => l.startsWith(`${name}=`));
  } catch {
    return false;
  }
}

// 3) Bekannte Geheimnis-Muster und Server-Namen.
const PATTERNS = [
  [/sb_secret_[A-Za-z0-9_-]{8,}/, 'Supabase Secret Key'],
  [/service_role/, 'service_role'],
  [/postgres(ql)?:\/\/[^\s"'`]+/, 'Datenbank-URL'],
  [/\bsk-(proj-|ant-)?[A-Za-z0-9_-]{20,}/, 'Provider-API-Key'],
  [/OPENAI_API_KEY|ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE|SUPABASE_DB_PASSWORD|DATABASE_URL/, 'Server-Variablenname'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'privater Schlüssel'],
];
for (const { f, s } of text) for (const [re, label] of PATTERNS) if (re.test(s)) problems.push(`${label} in ${f}`);

// 4) JWTs im Build: nur ein öffentlicher anon-Key wäre erlaubt, nie service_role.
for (const { f, s } of text) {
  for (const m of s.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const payload = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString('utf8'));
      if (payload.role !== 'anon') problems.push(`JWT mit Rolle „${payload.role}“ in ${f}`);
    } catch {
      problems.push(`unlesbares JWT in ${f}`);
    }
  }
}

// 5) Testtransport/Harness nie im Produkt-Build.
const TEST_MARKERS = ['createFakeBackend', 'pruefung@beispiel.invalid', 'nur-synthetisch', 'Testmodell (synthetisch)', 'Testnutzerin (synthetisch)', 'tests/harness'];
for (const { f, s } of text) for (const m of TEST_MARKERS) if (s.includes(m)) problems.push(`Testcode „${m}“ in ${f}`);

// 6) Keine Edge Functions mehr (Nutzerkorrektur 06.10.2026); App-Server nur gleicher Ursprung /api.
// Ausnahme: der Supabase-Bibliotheks-Chunk enthält seinen eigenen, ungenutzten Functions-Client
// (Standard-URL `functions/v1`). Eigener Code ruft ihn nie auf (check-source: kein `.functions`).
for (const { f, s } of text) {
  if (/[\\/]supabase-[\w-]+\.js$/.test(f)) continue;
  if (/functions\/v1/.test(s)) problems.push(`Edge-Function-Pfad in ${f}`);
  if (/127\.0\.0\.1:\d+|localhost:\d+/.test(s)) problems.push(`fester lokaler Server in ${f}`);
}
if (!text.some(({ s }) => s.includes('"/api"') || s.includes("'/api'") || s.includes('`/api`'))) problems.push('Client-Pfad /api fehlt im Build');

// 7) Nur die zwei öffentlichen VITE-Namen dürfen als Konfiguration auftauchen.
for (const { f, s } of text) for (const m of s.matchAll(/VITE_[A-Z0-9_]+/g)) if (!publicNames.has(m[0])) problems.push(`unerwartete Variable ${m[0]} in ${f}`);

const size = all.reduce((n, f) => n + statSync(f).size, 0);
console.log(`Bundle: ${all.length} Dateien, ${(size / 1024).toFixed(0)} KiB; ${checkedSecrets} nicht öffentliche .env-Werte gegengeprüft (Werte nicht ausgegeben).`);
if (problems.length) {
  for (const p of problems) console.error(`FEHLER ${p}`);
  process.exit(1);
}
console.log('Bundle-Prüfung bestanden: keine Geheimnisse, keine Sourcemaps, kein Testcode, kein Edge-Pfad, /api gleicher Ursprung.');
