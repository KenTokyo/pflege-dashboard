// Node-Prüfung ohne Browser: Vollständigkeit, lokale Verweise, Offline-Fonts, deutsche Texte,
// Sie-Ansprache, Demo-Banner, Pflichtinhalte je Screen, Bewegungsregeln, Kontraste, Dateigrößen.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastReport } from './contrast.mjs';
import { tasks } from './content.mjs';
import { directions, screens, themes } from './tokens.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const problems = [];
const ok = [];
const fail = (msg) => problems.push(msg);
const pass = (msg) => ok.push(msg);

// 1. Vollständigkeit laut Manifest
const manifest = JSON.parse(read('manifest.json'));
const expected = directions.length * screens.length * themes.length;
if (manifest.screens.length !== expected) fail(`Manifest: ${manifest.screens.length} statt ${expected} Screens`);
for (const d of directions) {
  for (const s of screens) for (const t of themes) {
    if (!manifest.screens.some((m) => m.direction === d.id && m.screen === s.id && m.theme === t.id)) fail(`Manifest fehlt ${d.id}/${s.id}/${t.id}`);
  }
  const mo = manifest.motion.find((m) => m.direction === d.id);
  if (!mo || mo.frames.length < 3 || mo.frames.length > 4) fail(`Bewegung ${d.id}: 3–4 Bilder erwartet`);
  if (mo && (mo.durationMs < 150 || mo.durationMs > 900)) fail(`Bewegung ${d.id}: ${mo.durationMs} ms außerhalb 150–900`);
  if (mo && mo.loops !== false) fail(`Bewegung ${d.id}: darf nicht schleifen`);
}
pass(`Manifest: ${manifest.screens.length} Screens, ${manifest.motion.length} Bewegungsfolgen`);

// 2. HTML-Dateien
const REQUIRED = {
  login: ['Anmelden', 'E-Mail-Adresse', 'Passwort', 'Selbstregistrierung', '15 Minuten'],
  dashboard: ['Pflegegrad 3', 'Pflegekasse Weserland', 'Widerspruchsfrist', 'Offene Aufgaben und Fristen', 'Zuletzt erstellte Dokumente', 'Letzte Gespräche', 'KI-Sachbearbeiter fragen'],
  chat: ['Gespräche', 'Ingrid Brandt', 'Claude Sonnet', 'Dokument erstellt', 'wartet auf Ihre Bestätigung', 'Entwurf erstellen', 'Bearbeiten', 'An Menschen übergeben', 'Keine Rechts- oder Medizinberatung', 'Quellen'],
  einstellungen: ['Nur Auskunft', 'Auskunft + Erstellen', 'Serverseitig durchgesetzt', 'Persona und Systemprompt', 'Version 3', 'Auf Standard zurücksetzen', 'Mistral Large', '>EU<', '>US<', 'Demo-Hinweis anzeigen', 'AVV'],
};
const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&shy;/g, ' ')
    .replace(/\s+/g, ' ');
const htmlFiles = [...new Set(manifest.screens.map((s) => s.html.split('?')[0])), ...manifest.motion.map((m) => m.html), 'index.html'];
for (const f of htmlFiles) {
  const html = read(f);
  const text = visibleText(html);
  const screen = f.split('/').pop().replace('.html', '');
  if (!html.includes('<html lang="de"')) fail(`${f}: lang="de" fehlt`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${f}: Titel fehlt`);
  if (!html.includes('name="viewport"')) fail(`${f}: viewport fehlt`);
  if (REQUIRED[screen]) {
    if (!html.includes('Demo – keine echten Daten eingeben')) fail(`${f}: Demo-Banner fehlt`);
    if (!html.includes('fiktiv')) fail(`${f}: Hinweis „fiktiv“ fehlt`);
    for (const need of REQUIRED[screen]) if (!html.includes(need)) fail(`${f}: Pflichtinhalt fehlt: ${need}`);
  }
  if (/https?:\/\//.test(html.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, ''))) fail(`${f}: externe URL gefunden`);
  if (/\p{Extended_Pictographic}/u.test(text.replace(/[⌘·–—„“…→]/g, ''))) fail(`${f}: Emoji gefunden`);
  const du = text.match(/\b(du|dich|dir|dein|deine|deinen|deinem|deiner|euch|euer)\b/gi);
  if (du) fail(`${f}: Du-Ansprache gefunden: ${[...new Set(du)].join(', ')}`);
  if (/notetree/i.test(html)) fail(`${f}: NoteTree-Bezug im Mock`);
  if (/<img\b/.test(html) && f !== 'index.html') fail(`${f}: Bitmap-Bild im Mock`);
  for (const m of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    const ref = m[1].split('?')[0];
    if (!ref || ref.startsWith('data:')) continue;
    if (!existsSync(join(root, dirname(f), ref))) fail(`${f}: Verweis fehlt: ${m[1]}`);
  }
}
pass(`HTML: ${htmlFiles.length} Dateien geprüft (Sprache, Banner, Pflichtinhalte, Verweise, Sie-Ansprache, kein Emoji)`);

// 3. Offline-Fonts und Lizenzen
const fontCss = read('assets/fonts/fonts.css');
const fontRefs = [...fontCss.matchAll(/url\('\.\/([^']+)'\)/g)].map((m) => m[1]);
for (const r of fontRefs) if (!existsSync(join(root, 'assets/fonts', r))) fail(`Font fehlt: ${r}`);
for (const dir of new Set(fontRefs.map((r) => r.split('/')[0]))) if (!existsSync(join(root, 'assets/fonts', dir, 'OFL.txt'))) fail(`Lizenz fehlt: ${dir}`);
if (!existsSync(join(root, 'assets/LUCIDE-LICENSE.txt'))) fail('Lucide-Lizenz fehlt');
pass(`Fonts: ${fontRefs.length} lokale WOFF2-Dateien, Lizenzen vorhanden`);

// 4. CSS/JS: keine Endlosschleifen, reduzierte Bewegung, keine Schrift unter 12px
const cssFiles = ['assets/base.css', 'assets/motion.css', ...directions.map((d) => `${d.id}/style.css`)];
for (const f of cssFiles) {
  const css = read(f);
  if (/infinite/.test(css)) fail(`${f}: Endlosanimation`);
  if (/https?:\/\//.test(css)) fail(`${f}: externe URL`);
  for (const m of css.matchAll(/font-size:\s*([\d.]+)px/g)) if (Number(m[1]) < 12) fail(`${f}: Schriftgröße ${m[1]}px unter 12px`);
}
if (!/@media \(prefers-reduced-motion: reduce\)/.test(read('assets/motion.css'))) fail('motion.css: reduzierte Bewegung fehlt');
for (const f of ['assets/mock.js', 'assets/motion.js']) {
  const js = read(f);
  if (/fetch\(|XMLHttpRequest|WebSocket|setInterval|requestAnimationFrame/.test(js)) fail(`${f}: Netzwerk oder Dauerschleife`);
}
pass('CSS/JS: keine Endlosanimation, reduzierte Bewegung vorhanden, keine Schrift unter 12px, keine Netzwerkzugriffe');

// 5. Inhalt: Aufgaben nach Dringlichkeit sortiert
const key = (t) => (t.due === 'laufend' ? 9999 : Number(t.due.slice(3, 5)) * 100 + Number(t.due.slice(0, 2)));
const sorted = tasks.every((t, i) => i === 0 || key(tasks[i - 1]) <= key(t));
if (!sorted) fail('Aufgaben sind nicht nach Fälligkeit sortiert');
pass(`Aufgaben nach Fälligkeit sortiert: ${tasks.map((t) => t.due).join(' → ')}`);

// 6. Kontraste
const rows = contrastReport();
const bad = rows.filter((r) => !r.ok);
for (const r of bad) fail(`Kontrast ${r.dir}/${r.theme} ${r.fg}/${r.bg}: ${r.ratio} < ${r.min}`);
pass(`Kontrast: ${rows.length - bad.length}/${rows.length} Paare bestehen AA (Text 4,5:1, Bedienelemente 3:1)`);

// 7. Handgeschriebene Dateien unter 1200 Zeilen
const walk = (dir) =>
  readdirSync(join(root, dir)).flatMap((n) => {
    const rel = join(dir, n);
    if (['node_modules', '.out', 'fonts'].includes(n)) return [];
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
for (const f of walk('.').filter((f) => /\.(mjs|js|css)$/.test(f))) {
  const lines = read(f).split('\n').length;
  if (lines > 1200) fail(`${f}: ${lines} Zeilen`);
}
pass('Dateigrößen: alle handgeschriebenen Dateien unter 1200 Zeilen');

for (const m of ok) console.log(`ok  ${m}`);
for (const m of problems) console.log(`FEHLER ${m}`);
console.log(problems.length ? `${problems.length} Fehler` : 'Quellprüfung bestanden.');
process.exitCode = problems.length ? 1 : 0;
