// Baut alle statischen Mock-Dateien: Offline-Fonts, Tokens, 12 HTML-Screens, 3 Bewegungsseiten,
// Galerie (index.html) und manifest.json. Handgeschriebene CSS-Dateien bleiben unberührt.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { directions, screens, themes, tokenCss } from './tokens.mjs';
import * as T from './templates.mjs';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const write = (rel, text) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
};

// ---------- Fonts (offline, OFL) ----------
const FONTS = [
  { key: 'inter', pkg: '@fontsource-variable/inter', family: 'Inter Variable', files: [['inter-latin-wght-normal.woff2', '100 900']] },
  {
    key: 'plex-sans', pkg: '@fontsource/ibm-plex-sans', family: 'IBM Plex Sans',
    files: [400, 500, 600, 700].map((w) => [`ibm-plex-sans-latin-${w}-normal.woff2`, String(w)]),
  },
  {
    key: 'plex-mono', pkg: '@fontsource/ibm-plex-mono', family: 'IBM Plex Mono',
    files: [400, 500, 600].map((w) => [`ibm-plex-mono-latin-${w}-normal.woff2`, String(w)]),
  },
  { key: 'bricolage', pkg: '@fontsource-variable/bricolage-grotesque', family: 'Bricolage Grotesque Variable', files: [['bricolage-grotesque-latin-wght-normal.woff2', '200 800']] },
  {
    key: 'atkinson', pkg: '@fontsource/atkinson-hyperlegible-next', family: 'Atkinson Hyperlegible Next',
    files: [400, 500, 600, 700, 800].map((w) => [`atkinson-hyperlegible-next-latin-${w}-normal.woff2`, String(w)]),
  },
];

let fontCss = '/* Generiert aus tools/build.mjs. Alle Schriften lokal, Lizenz: SIL Open Font License 1.1 (siehe OFL.txt je Ordner). */\n';
for (const f of FONTS) {
  const src = pkgDir(f.pkg);
  const outDir = join(root, 'assets/fonts', f.key);
  mkdirSync(outDir, { recursive: true });
  copyFileSync(join(src, 'LICENSE'), join(outDir, 'OFL.txt'));
  for (const [file, weight] of f.files) {
    copyFileSync(join(src, 'files', file), join(outDir, file));
    fontCss += `@font-face { font-family: '${f.family}'; font-style: normal; font-display: block; font-weight: ${weight}; src: url('./${f.key}/${file}') format('woff2'); }\n`;
  }
}
write('assets/fonts/fonts.css', fontCss);
copyFileSync(join(pkgDir('lucide-static'), 'LICENSE'), join(root, 'assets/LUCIDE-LICENSE.txt'));

// ---------- Richtungen ----------
const renderers = { login: T.login, dashboard: T.dashboard, chat: T.chat, einstellungen: T.einstellungen };
const manifest = {
  title: 'Pflege-Dashboard · Phase 0 · Designrichtungen',
  note: 'Statische HTML-Mocks mit fiktiven Daten. Keine App, keine Anmeldung, keine Netzwerkaufrufe.',
  viewport: { width: 1280, height: 720 },
  directions: [],
  screens: [],
  motion: [],
};

for (const d of directions) {
  if (!existsSync(join(root, d.id, 'style.css'))) throw new Error(`${d.id}/style.css fehlt`);
  write(`${d.id}/tokens.css`, tokenCss(d));
  for (const s of screens) {
    const body = renderers[s.id](d);
    write(`${d.id}/${s.id}.html`, T.page(d, s.id, body, { title: s.title }));
    for (const th of themes) {
      manifest.screens.push({
        direction: d.id, screen: s.id, screenTitle: s.title, theme: th.id,
        html: `${d.id}/${s.id}.html?theme=${th.id}`,
        png: `${d.id}/${s.id}-${th.id}.png`,
      });
    }
  }
  write(`${d.id}/motion/index.html`, T.motion(d));
  const ms = d.motion.ms;
  const times = [0, Math.round(ms / 3), Math.round((2 * ms) / 3), ms];
  manifest.motion.push({
    direction: d.id, name: d.motion.name, what: d.motion.what, durationMs: ms, loops: false,
    reducedMotion: 'kurze Einblendung (150 ms) des Endzustands',
    html: `${d.id}/motion/index.html`,
    frames: times.map((t, i) => ({ t, png: `${d.id}/motion/frame-${i + 1}-${t}ms.png` })),
  });
  manifest.directions.push({ id: d.id, name: d.name, graffiti: d.graffiti, nav: d.nav, fonts: d.fonts, pitch: d.pitch });
}
write('manifest.json', JSON.stringify(manifest, null, 2) + '\n');

// ---------- Galerie ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const gallery = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Designrichtungen · Pflege-Dashboard</title>
<style>
  :root { --bg: #0E0F12; --surface: #17191E; --border: #2A2D35; --text: #ECEEF2; --muted: #A2A8B4; --link: #A9B4FF; color-scheme: dark; }
  @media (prefers-color-scheme: light) { :root { --bg: #F6F7F9; --surface: #FFFFFF; --border: #E0E3E8; --text: #16181D; --muted: #575E6B; --link: #3F4BC9; color-scheme: light; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  main { max-width: 1240px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 26px; margin: 0 0 6px; } h2 { font-size: 21px; margin: 0; } h3 { font-size: 15px; margin: 18px 0 8px; }
  p { margin: 0; } a { color: var(--link); }
  .lead { color: var(--muted); max-width: 760px; }
  .dir { margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--border); }
  .dir-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
  .tag { font-size: 13px; color: var(--muted); }
  .pitch { margin-top: 8px; max-width: 900px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 14px; }
  figure { margin: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  figure img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; }
  figcaption { display: flex; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 13px; }
  .frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 10px; }
</style>
</head>
<body>
<main>
  <h1>Pflege-Dashboard · drei Designrichtungen</h1>
  <p class="lead">Phase 0: statische HTML-Mocks, gerendert mit 1280×720. Je Richtung vier Screens in dunkel und hell sowie eine kurze Bildfolge für den Graffiti-Moment. Alle Daten sind fiktiv.</p>
${directions
  .map((d) => {
    const shots = manifest.screens.filter((s) => s.direction === d.id);
    const mo = manifest.motion.find((m) => m.direction === d.id);
    return `  <section class="dir" id="${d.id}">
    <div class="dir-head"><h2>${d.name}</h2><span class="tag">Graffiti ${d.graffiti}</span></div>
    <p class="pitch">${esc(d.pitch)}</p>
    <h3>Screens</h3>
    <div class="grid">${shots
      .map((s) => `<figure><a href="${s.png}"><img src="${s.png}" alt="${d.name}: ${s.screenTitle}, ${s.theme}" width="1280" height="720" loading="lazy"></a><figcaption><span>${s.screenTitle} · ${s.theme}</span><a href="${s.html}">HTML</a></figcaption></figure>`)
      .join('')}</div>
    <h3>Bewegung: ${esc(mo.name)} · ${mo.durationMs} ms · <a href="${mo.html}">abspielen</a></h3>
    <div class="frames">${mo.frames
      .map((f) => `<figure><a href="${f.png}"><img src="${f.png}" alt="${d.name}, Bewegung bei ${f.t} ms" width="1280" height="720" loading="lazy"></a><figcaption><span>t = ${f.t} ms</span></figcaption></figure>`)
      .join('')}</div>
  </section>`;
  })
  .join('\n')}
</main>
</body>
</html>
`;
write('index.html', gallery);

console.log(`Gebaut: ${manifest.screens.length / 2} HTML-Screens (${manifest.screens.length} Aufnahmen geplant), ${manifest.motion.length} Bewegungsseiten, Galerie, Manifest.`);
