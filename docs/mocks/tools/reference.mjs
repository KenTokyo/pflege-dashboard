// Nimmt öffentliche Produktbeispiele als Gestaltungsreferenz auf (nur lokal in .out/, nicht im Repo).
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withTestBrowser } from './browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.out/reference');
mkdirSync(out, { recursive: true });

const targets = (process.argv.slice(2).length ? process.argv.slice(2) : ['https://linear.app/']).map((u, i) => ({
  url: u,
  file: `ref-${i + 1}.png`,
}));

await withTestBrowser(
  async (browser) => {
    const ctx = await browser.newContext({ viewport: { width: Math.min(1280, Math.max(320, Number(process.env.VW) || 1280)), height: 720 }, deviceScaleFactor: 1 });
    try {
      const page = await ctx.newPage();
      for (const t of targets) {
        await page.goto(t.url, { waitUntil: 'load', timeout: 30_000 });
        await page.waitForTimeout(1500);
        const y = Number(process.env.SCROLL_Y || 0);
        if (y) await page.evaluate((v) => window.scrollTo(0, v), y);
        await page.waitForTimeout(600);
        await page.screenshot({ path: join(out, t.file) });
        const texts = (process.env.MEASURE || '').split('|').filter(Boolean);
        if (texts.length) {
          const m = await page.evaluate((list) => {
            const res = [];
            const all = [...document.querySelectorAll('body *')];
            for (const txt of list) {
              const el = all.find((e) => e.childElementCount === 0 && e.textContent.trim() === txt);
              if (!el) { res.push({ txt, missing: true }); continue; }
              let row = el;
              for (let i = 0; i < 4 && row.parentElement; i++) {
                const r = row.getBoundingClientRect();
                if (r.height >= 24) break;
                row = row.parentElement;
              }
              const cs = getComputedStyle(el);
              const r = row.getBoundingClientRect();
              res.push({ txt, font: cs.fontFamily.split(',')[0], size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight, color: cs.color, rowH: Math.round(r.height), rowW: Math.round(r.width), x: Math.round(r.x), y: Math.round(r.y) });
            }
            return res;
          }, texts);
          console.log(JSON.stringify(m, null, 1));
        }
        console.log(`Referenz ${t.url} -> .out/reference/${t.file}`);
      }
    } finally {
      await ctx.close();
    }
  },
  { timeoutMs: 120_000, label: 'referenz' },
);
