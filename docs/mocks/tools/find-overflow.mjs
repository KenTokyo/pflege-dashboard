// Hilfsprüfung: nennt Elemente, die bei einer Breite rechts herausragen, samt Elternkette.
// Aufruf: node tools/find-overflow.mjs klartext/dashboard.html 390
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withTestBrowser } from './browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [file = 'linie/dashboard.html', w = '390'] = process.argv.slice(2);
const width = Math.min(1280, Number(w));
await withTestBrowser(async (browser) => {
  const ctx = await browser.newContext({ viewport: { width, height: 720 } });
  try {
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(join(root, file)).href);
    const res = await page.evaluate((W) => {
      const out = [];
      for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.right > W + 0.5 && r.width > 0) {
          const chain = [];
          for (let p = el; p && p !== document.body && chain.length < 6; p = p.parentElement) chain.push(`${p.tagName.toLowerCase()}.${String(p.className.baseVal ?? p.className).split(' ').join('.')}`);
          out.push(`${Math.round(r.left)}–${Math.round(r.right)}: ${chain.join(' < ')}`);
        }
      }
      return out.slice(0, 10);
    }, width);
    console.log(res.join('\n') || 'kein Überstand');
  } finally {
    await ctx.close();
  }
}, { timeoutMs: 60_000, label: 'überstand' });
