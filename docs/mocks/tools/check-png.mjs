// Prüft alle Aufnahmen aus manifest.json: vorhanden, echtes PNG, genau 1280×720, nicht leer.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const files = [...manifest.screens.map((s) => s.png), ...manifest.motion.flatMap((m) => m.frames.map((f) => f.png))];
const bad = [];
for (const f of files) {
  const p = join(root, f);
  if (!existsSync(p)) {
    bad.push(`${f}: fehlt`);
    continue;
  }
  const buf = readFileSync(p);
  const sig = buf.subarray(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') bad.push(`${f}: kein PNG`);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (w !== 1280 || h !== 720) bad.push(`${f}: ${w}×${h} statt 1280×720`);
  if (buf.length < 15_000) bad.push(`${f}: verdächtig klein (${buf.length} B)`);
}
console.log(`PNG: ${files.length - bad.length}/${files.length} in Ordnung (${manifest.screens.length} Screens, ${files.length - manifest.screens.length} Bewegungsbilder, je 1280×720)`);
for (const b of bad) console.log(`FEHLER ${b}`);
process.exitCode = bad.length ? 1 : 0;
