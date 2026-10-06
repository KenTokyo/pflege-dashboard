// Rendert alle 24 Screens (1280×720) und 12 Bewegungsbilder aus statischem HTML und prüft dabei:
// passende Höhe bei 1280×720, kein waagerechter Überlauf bei 1280/768/390, Mindest-Schriftgröße,
// Bediengrößen auf dem Telefon, lokal geladene Schriften, keine Netzwerkzugriffe, keine Konsolenfehler,
// reduzierte Bewegung. Genau ein unsichtbarer Prüfbrowser, danach vollständige Bereinigung.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withTestBrowser } from './browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const only = process.env.ONLY; // z. B. ONLY=linie oder ONLY=linie/chat
const skipShots = process.env.NO_SHOTS === '1';
const url = (rel) => {
  const [p, q] = rel.split('?');
  return pathToFileURL(join(root, p)).href + (q ? `?${q}` : '');
};

const report = { browser: null, screens: [], motion: [], problems: [] };
const problem = (where, what) => report.problems.push(`${where}: ${what}`);

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(60);
}

// Prüft im Browser: Überlauf, Schriftgrößen, Bediengrößen.
async function audit(page, { width, phone }) {
  return page.evaluate(
    ({ width, phone }) => {
      const out = { scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, overflowRight: [], tinyText: [], smallTargets: [] };
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const cs = getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
      };
      const clippedBy = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (/(hidden|clip|auto|scroll)/.test(cs.overflowX)) {
            const pr = p.getBoundingClientRect();
            if (pr.right <= width + 1) return true;
          }
        }
        return false;
      };
      const name = (el) => (el.id ? `#${el.id}` : '') + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).trim().split(/\s+/).slice(0, 2).join('.') + `<${el.tagName.toLowerCase()}>`;
      for (const el of document.body.querySelectorAll('*')) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.right > width + 1 && !clippedBy(el)) out.overflowRight.push(`${name(el)} right=${Math.round(r.right)}`);
        // Text kleiner als 12px (nur echte Textknoten, ohne dekorative SVGs)
        if (!el.closest('svg') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 12) out.tinyText.push(`${name(el)} ${fs}px "${el.textContent.trim().slice(0, 30)}"`);
        }
        if (phone && el.matches('a[href], button, input, [role="switch"], [role="radio"]')) {
          const t = el.closest('label, .input, .composer-box, .ask-form') || el;
          const tr = el.matches('input') ? t.getBoundingClientRect() : r;
          if (el.matches('input[type="radio"]')) continue;
          if (tr.height < 43.5 && !el.classList.contains('skip')) out.smallTargets.push(`${name(el)} ${Math.round(tr.width)}×${Math.round(tr.height)}`);
        }
      }
      // Versteckt abgeschnittene Inhalte und Bedienelemente (nur Desktop-Aufnahme).
      out.cut = [];
      out.scrollNeeded = [];
      if (!phone && width === 1280) {
        for (const el of document.body.querySelectorAll('*')) {
          if (!visible(el) || el.closest('svg') || el.closest('.sr-only') || el.getBoundingClientRect().width <= 1) continue;
          const cs = getComputedStyle(el);
          const over = el.scrollHeight > el.clientHeight + 1;
          if (over && /(hidden|clip)/.test(cs.overflowY) && !el.matches('.row-title, .row-sub, .conv-title, .nav-label, .chip, .doc-sub > span, .login-side')) out.cut.push(`${name(el)} ${el.scrollHeight}>${el.clientHeight}`);
          if (over && /(auto|scroll)/.test(cs.overflowY)) out.scrollNeeded.push(`${name(el)} ${el.scrollHeight}>${el.clientHeight}`);
        }
        for (const el of document.body.querySelectorAll('.btn, .link-sm, .icon-btn, .toggle, .model-btn, input, .tape, .pill')) {
          if (!visible(el)) continue;
          const r = el.getBoundingClientRect();
          let bad = r.bottom > window.innerHeight + 0.5 || r.top < 0;
          for (let p = el.parentElement; p && !bad && p !== document.body; p = p.parentElement) {
            if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(p).overflowY)) {
              const pr = p.getBoundingClientRect();
              if (r.bottom > pr.bottom + 0.5 || r.top < pr.top - 0.5) bad = true;
            }
          }
          if (bad) out.cut.push(`Bedienelement abgeschnitten: ${name(el)} "${el.textContent.trim().slice(0, 24)}"`);
        }
      }
      // Schmale Ansichten: Hauptinhalt muss fast die ganze Breite nutzen (keine verbliebenen Desktop-Spalten).
      out.narrowCols = [];
      if (width < 1024) {
        for (const sel of ['.thread', '.dash', '.settings', '.login-panel', '.login-side', '.doc-panel', '.messages']) {
          const el = document.querySelector(sel);
          if (!el || !visible(el)) continue;
          const rr = el.getBoundingClientRect();
          if (rr.width < width - 64) out.narrowCols.push(`${sel} nur ${Math.round(rr.width)}px breit`);
          if (rr.left > 32) out.narrowCols.push(`${sel} beginnt erst bei ${Math.round(rr.left)}px`);
        }
      }
      out.overflowRight = out.overflowRight.slice(0, 8);
      out.tinyText = out.tinyText.slice(0, 8);
      out.smallTargets = out.smallTargets.slice(0, 12);
      out.fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`);
      out.fontErrors = [...document.fonts].filter((f) => f.status === 'error').map((f) => `${f.family} ${f.weight}`);
      return out;
    },
    { width, phone },
  );
}

const result = await withTestBrowser(
  async (browser, info) => {
    report.browser = `${info.version} (Nutzer-Chrome ${info.userVersion})`;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    try {
      const page = await ctx.newPage();
      const net = [];
      const consoleErrors = [];
      page.on('request', (r) => {
        if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) net.push(r.url());
      });
      page.on('requestfailed', (r) => consoleErrors.push(`Laden fehlgeschlagen: ${r.url()}`));
      page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
      page.on('pageerror', (e) => consoleErrors.push(String(e)));
      await page.route(/^https?:/, (route) => route.abort());

      for (const s of manifest.screens) {
        if (only && !`${s.direction}/${s.screen}`.startsWith(only)) continue;
        const where = `${s.direction}/${s.screen}/${s.theme}`;
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(url(s.html), { waitUntil: 'load' });
        await settle(page);
        const theme = await page.evaluate(() => document.documentElement.dataset.theme);
        if (theme !== s.theme) problem(where, `Theme ${theme} statt ${s.theme}`);
        const desk = await audit(page, { width: 1280, phone: false });
        if (desk.scrollH > 720) problem(where, `zu hoch bei 1280×720: ${desk.scrollH}px`);
        if (desk.scrollW > 1280) problem(where, `waagerechter Überlauf 1280: ${desk.scrollW}px`);
        if (desk.overflowRight.length) problem(where, `ragt rechts heraus (1280): ${desk.overflowRight.join('; ')}`);
        if (desk.tinyText.length) problem(where, `Text unter 12px: ${desk.tinyText.join('; ')}`);
        if (desk.fontErrors.length) problem(where, `Schrift nicht geladen: ${desk.fontErrors.join(', ')}`);
        if (desk.cut.length) problem(where, `abgeschnitten: ${desk.cut.slice(0, 6).join('; ')}`);
        if (desk.scrollNeeded.length) problem(where, `Inhalt nur per Scrollen sichtbar: ${desk.scrollNeeded.join('; ')}`);
        if (!skipShots) await page.screenshot({ path: join(root, s.png), clip: { x: 0, y: 0, width: 1280, height: 720 } });

        const entry = { where, png: s.png, desktopHeight: desk.scrollH, fonts: desk.fonts };
        // Schmale Breiten nur einmal je Screen (Theme ändert das Layout nicht), aber beide Themes laden ist billig.
        if (s.theme === 'dunkel') {
          for (const w of [768, 390]) {
            await page.setViewportSize({ width: w, height: 720 });
            await page.waitForTimeout(40);
            const a = await audit(page, { width: w, phone: w === 390 });
            entry[`w${w}`] = { scrollW: a.scrollW, height: a.scrollH, overflow: a.overflowRight.length, smallTargets: a.smallTargets.length };
            if (a.scrollW > w) problem(`${where}@${w}`, `waagerechter Überlauf: ${a.scrollW}px`);
            if (a.overflowRight.length) problem(`${where}@${w}`, `ragt rechts heraus: ${a.overflowRight.join('; ')}`);
            if (a.tinyText.length) problem(`${where}@${w}`, `Text unter 12px: ${a.tinyText.join('; ')}`);
            if (a.smallTargets.length) problem(`${where}@${w}`, `Bedienelemente unter 44px: ${a.smallTargets.join('; ')}`);
            if (a.narrowCols.length) problem(`${where}@${w}`, `zu schmale Spalte: ${a.narrowCols.join('; ')}`);
            if (process.env.NARROW === '1' && w === 390) {
              mkdirSync(join(root, '.out/narrow'), { recursive: true });
              await page.screenshot({ path: join(root, `.out/narrow/${s.direction}-${s.screen}-390.png`) });
            }
          }
        }
        report.screens.push(entry);
      }

      for (const m of manifest.motion) {
        if (only && !m.direction.startsWith(only.split('/')[0])) continue;
        await page.setViewportSize({ width: 1280, height: 720 });
        for (const f of m.frames) {
          await page.goto(url(`${m.html}?t=${f.t}`), { waitUntil: 'load' });
          await settle(page);
          const fit = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
          if (fit[0] > 1280 || fit[1] > 720) problem(`${m.direction}/motion@${f.t}`, `Bild passt nicht: ${fit.join('×')}`);
          if (!skipShots) await page.screenshot({ path: join(root, f.png), clip: { x: 0, y: 0, width: 1280, height: 720 } });
        }
        // Keine Endlosschleifen: alle Animationen enden.
        await page.goto(url(m.html), { waitUntil: 'load' });
        await settle(page);
        const anims = await page.evaluate(() => document.getAnimations().map((a) => ({ name: a.animationName, it: a.effect.getComputedTiming().iterations, dur: a.effect.getComputedTiming().endTime })));
        const infinite = anims.filter((a) => !Number.isFinite(a.it));
        const longest = Math.max(0, ...anims.map((a) => a.dur));
        if (infinite.length) problem(`${m.direction}/motion`, 'Endlosanimation gefunden');
        if (longest > 900) problem(`${m.direction}/motion`, `länger als 900 ms: ${longest}`);
        // Reduzierte Bewegung: nur kurze Einblendung.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(url(m.html), { waitUntil: 'load' });
        await settle(page);
        const red = await page.evaluate(() => document.getAnimations().map((a) => ({ name: a.animationName, dur: a.effect.getComputedTiming().endTime })));
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const redOk = red.every((a) => a.dur <= 160 && /fade|success/.test(a.name));
        if (!redOk) problem(`${m.direction}/motion`, `reduzierte Bewegung nicht schlicht: ${JSON.stringify(red)}`);
        report.motion.push({ direction: m.direction, animations: anims.length, longestMs: longest, reduced: red.map((a) => `${a.name} ${a.dur}ms`) });
      }
      if (net.length) problem('Netzwerk', `externe Anfragen: ${[...new Set(net)].join(', ')}`);
      if (consoleErrors.length) problem('Konsole', [...new Set(consoleErrors)].slice(0, 8).join(' | '));
    } finally {
      await ctx.close();
    }
  },
  { timeoutMs: 300_000, label: 'render' },
);

report.cleanup = { pid: result.pid, flags: result.flagCheck };
mkdirSync(join(root, '.out'), { recursive: true });
writeFileSync(join(root, '.out/render-report.json'), JSON.stringify(report, null, 2));
console.log(`Screens: ${report.screens.length}, Bewegungsseiten: ${report.motion.length}, Browser: ${report.browser}, Flags ok: ${result.flagCheck?.ok}, headless: ${result.flagCheck?.headless}`);
if (report.problems.length) {
  console.log(`Probleme (${report.problems.length}):`);
  for (const p of report.problems) console.log(` - ${p}`);
  process.exitCode = 1;
} else console.log('Keine Probleme gefunden.');
