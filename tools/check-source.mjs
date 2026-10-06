// Quelltext-Prüfung ohne Browser: AA-Kontrast beider Themes, ruhiger Leerlauf, Schriftgrößen,
// Demo-Banner, Dateilängen und verbotene Muster. Läuft rein in Node.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const problems = [];
const read = (p) => readFileSync(join(root, p), 'utf8');

function files(dir, re) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const p = join(dir, name);
    return statSync(join(root, p)).isDirectory() ? files(p, re) : re.test(p) ? [p] : [];
  });
}

// ---------- Kontrast ----------
const tokensCss = read('src/styles/tokens.css');
function block(selector) {
  const start = tokensCss.indexOf(selector);
  const body = tokensCss.slice(tokensCss.indexOf('{', start) + 1, tokensCss.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const dark = block(':root {');
const themes = { dunkel: dark, hell: { ...dark, ...block(":root[data-theme='hell']") } };

function rgba(c) {
  if (c.startsWith('#')) {
    const h = c.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1);
  }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (!m) throw new Error(`Farbe nicht lesbar: ${c}`);
  const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}
/** Halbtransparente Farbe über eine deckende Fläche legen. */
function over(top, base) {
  const [r, g, b, a] = rgba(top);
  const [R, G, B] = rgba(base);
  return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
}
function lum([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [Vordergrund, Hintergrund (optional halbtransparent über Basis), Basis, Minimum, Zweck]
const PAIRS = [
  ['text', 'bg', null, 4.5, 'Text auf Fläche'],
  ['text', 'surface', null, 4.5, 'Text auf Karte'],
  ['text', 'surface2', null, 4.5, 'Text auf Zeile/Hover'],
  ['text-muted', 'bg', null, 4.5, 'Nebentext auf Fläche'],
  ['text-muted', 'surface', null, 4.5, 'Nebentext auf Karte'],
  ['text-muted', 'surface2', null, 4.5, 'Nebentext auf Zeile'],
  ['text-muted', 'sunken', null, 4.5, 'Nebentext auf Vorschau'],
  ['accent-text', 'surface', null, 4.5, 'Link/Akzenttext auf Karte'],
  ['accent-text', 'bg', null, 4.5, 'Link auf Fläche'],
  ['accent-text', 'accent-soft', 'surface', 4.5, 'Akzenttext auf Akzentfläche'],
  ['on-accent', 'accent', null, 4.5, 'Primärknopf'],
  ['danger', 'surface', null, 4.5, 'Dringend-Text'],
  ['danger', 'danger-soft', 'surface', 4.5, 'Fehlermeldung'],
  ['warning', 'surface', null, 4.5, 'Warn-Text'],
  ['warning', 'warning-soft', 'surface', 4.5, 'Warnhinweis'],
  ['success', 'surface', null, 4.5, 'Erfolg-Text'],
  ['success', 'success-soft', 'surface', 4.5, 'Erfolgshinweis'],
  ['banner-text', 'banner-bg', null, 4.5, 'Demo-Banner'],
  ['border-strong', 'surface', null, 3, 'Eingabefeldrand'],
  ['focus', 'bg', null, 3, 'Fokusring auf Fläche'],
  ['focus', 'surface', null, 3, 'Fokusring auf Karte'],
  ['accent', 'surface', null, 3, 'Aktive Fläche'],
];
let pairs = 0;
for (const [name, t] of Object.entries(themes)) {
  for (const [fg, bg, base, min, why] of PAIRS) {
    const back = base ? over(t[bg], t[base]) : rgba(t[bg]).slice(0, 3);
    const r = ratio(rgba(t[fg]).slice(0, 3), back);
    pairs += 1;
    if (r < min) problems.push(`Kontrast ${name}: ${fg} auf ${bg}${base ? `/${base}` : ''} = ${r.toFixed(2)} < ${min} (${why})`);
  }
  // Klebeband: fester dunkler Text auf Marker 80 % mit Weiß gemischt (app.css .tape).
  const tape = rgba(t.marker).slice(0, 3).map((v) => v * 0.8 + 255 * 0.2);
  const rt = ratio([0x1a, 0x17, 0x12], tape);
  pairs += 1;
  if (rt < 4.5) problems.push(`Kontrast ${name}: Klebeband-Text = ${rt.toFixed(2)} < 4.5`);
}

// ---------- Ruhiger Leerlauf und verbotene Muster ----------
const src = files('src', /\.(tsx?|css)$/);
const RULES = [
  [/\binfinite\b/, 'Endlos-Animation (CSS infinite)'],
  [/repeat:\s*Infinity|repeatType/, 'Endlos-Animation (Motion)'],
  [/setInterval\s*\(/, 'Intervall-Timer (Polling)'],
  [/refetchInterval/, 'Abfrage-Polling'],
  [/new\s+EventSource/, 'EventSource (Token in URL)'],
  [/dangerouslySetInnerHTML/, 'ungefiltertes HTML'],
  [/sessionStorage|indexedDB/, 'dauerhafter Speicher außer Theme'],
  [/console\.(log|debug|info)\(/, 'Konsolenausgabe'],
  [/from ['"][./]*tests\//, 'Import aus tests/'],
  [/service_role|sb_secret_|OPENAI_API_KEY|SUPABASE_DB_PASSWORD|DATABASE_URL/, 'Server-Geheimnisname'],
  [/persistSession:\s*true|autoRefreshToken:\s*true/, 'dauerhafte Sitzung/Hintergrund-Refresh'],
  [/functions\/v1|\.functions\b/, 'Edge-Function-Aufruf (Nutzerkorrektur: nur eigener /api-Server)'],
];
for (const f of src) {
  const s = read(f);
  for (const [re, label] of RULES) if (re.test(s)) problems.push(`${label} in ${f}`);
  if (/localStorage/.test(s) && !/ThemeProvider\.tsx$/.test(f)) problems.push(`localStorage außerhalb des Themes in ${f}`);
  const lines = s.split('\n').length;
  if (lines > 1200) problems.push(`${f} hat ${lines} Zeilen (> 1200)`);
  // Vertrag: Abfragen nie bei Fokus/Wiederverbindung im Hintergrund nachladen.
}
if (!/refetchOnWindowFocus:\s*false/.test(read('src/data/queries.ts'))) problems.push('refetchOnWindowFocus nicht abgeschaltet');
if (!/persistSession:\s*false/.test(read('src/services/supabaseBackend.ts'))) problems.push('persistSession:false fehlt');
// App-Server nur gleicher Ursprung: kein fester Host, kein Port im Client.
if (!/export const API_BASE = '\/api';/.test(read('src/services/api.ts'))) problems.push("API_BASE ist nicht '/api'");
for (const f of src) if (/127\.0\.0\.1|localhost:\d+/.test(read(f))) problems.push(`fester lokaler Host in ${f}`);

// ---------- Schriftgrößen ----------
for (const f of files('src/styles', /\.css$/)) {
  for (const m of read(f).matchAll(/font-size:\s*([\d.]+)px/g)) if (Number(m[1]) < 12) problems.push(`Schrift ${m[1]}px < 12px in ${f}`);
}
for (const f of src.filter((x) => x.endsWith('.tsx'))) {
  for (const m of read(f).matchAll(/text-\[([\d.]+)px\]/g)) if (Number(m[1]) < 12) problems.push(`Schrift ${m[1]}px < 12px in ${f}`);
}

// ---------- Demo-Banner und Sprache ----------
if (!read('src/components/DemoBanner.tsx').includes('Demo – keine echten Daten eingeben')) problems.push('Demo-Banner-Text fehlt oder weicht ab');
for (const f of src.filter((x) => x.endsWith('.tsx'))) {
  // Du-Form in sichtbaren Texten vermeiden (Sie-Form).
  for (const m of read(f).matchAll(/>[^<{]*\b(du|dein|deine|dich|dir)\b[^<{]*</gi)) problems.push(`Du-Form „${m[1]}“ in ${f}`);
}

console.log(`Quelltext: ${src.length} Dateien geprüft, ${pairs} Kontrastpaare (dunkel + hell).`);
if (problems.length) {
  for (const p of problems) console.error(`FEHLER ${p}`);
  process.exit(1);
}
console.log('Quelltext-Prüfung bestanden: AA-Kontrast, kein Polling, keine Endlos-Animation, Schrift ≥ 12px, Demo-Banner, Sie-Form.');
