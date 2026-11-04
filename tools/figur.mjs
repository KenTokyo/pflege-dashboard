// Pflege-Figur für die App: PNG-Posen aus docs/design/figur/a-pflegefachfrau/ (Satz A, Nutzerwahl 04.11.2026)
// → feste, kleine WebP unter public/figur/. Aufruf: node tools/figur.mjs. Fehlt eine Pose noch, steht vorerst die Begrüßung an ihrer Stelle,
// damit Pfade und Größen schon stimmen (nichts springt). Braucht cwebp (Homebrew: webp).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const POSES = [['01', 'begruessen'], ['02', 'liest-mit'], ['03', 'denkt-nach']];
const SIZE = 352;

const dir = 'docs/design/figur/a-pflegefachfrau';
const files = existsSync(dir) ? readdirSync(dir) : [];
const pick = (nr) => files.find((f) => f.startsWith(`${nr}-`) && f.endsWith('.png'));
const first = pick('01');
if (!first) throw new Error(`${dir}/01-*.png fehlt`);
mkdirSync('public/figur', { recursive: true });
for (const [nr, name] of POSES) {
  const src = join(dir, pick(nr) ?? first);
  const out = join('public/figur', `${name}.webp`);
  execFileSync('cwebp', ['-quiet', '-q', '80', '-alpha_q', '85', '-m', '6', '-resize', String(SIZE), String(SIZE), src, '-o', out]);
  console.log(`${out} ← ${src}${pick(nr) ? '' : ' (Ersatz bis die Pose da ist)'}`);
}
