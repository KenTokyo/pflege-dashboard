// WCAG-Kontrast für die Token-Paare, die als Text oder Bedienelement vorkommen.
import { pathToFileURL } from 'node:url';
import { directions } from './tokens.mjs';

function parse(c) {
  const h = c.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function lum(c) {
  const [r, g, b] = parse(c).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function mixWhite(hex, p) {
  return '#' + parse(hex).map((v) => Math.round((v * p + (1 - p)) * 255).toString(16).padStart(2, '0')).join('');
}
export function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// [Vordergrund, Hintergrund, Mindestwert, Zweck]
export const PAIRS = [
  ['text', 'bg', 4.5, 'Text auf Fläche'],
  ['text', 'surface', 4.5, 'Text auf Karte'],
  ['text', 'surface2', 4.5, 'Text auf Hover/Zeile'],
  ['textMuted', 'bg', 4.5, 'Nebentext auf Fläche'],
  ['textMuted', 'surface', 4.5, 'Nebentext auf Karte'],
  ['textMuted', 'surface2', 4.5, 'Nebentext auf Zeile'],
  ['accentText', 'surface', 4.5, 'Link/Akzenttext'],
  ['accentText', 'bg', 4.5, 'Link auf Fläche'],
  ['onAccent', 'accent', 4.5, 'Primärknopf'],
  ['danger', 'surface', 4.5, 'Dringend-Text'],
  ['warning', 'surface', 4.5, 'Warn-Text'],
  ['success', 'surface', 4.5, 'Erfolg-Text'],
  ['bannerText', 'bannerBg', 4.5, 'Demo-Banner'],
  ['borderStrong', 'surface', 3, 'Eingabefeldrand'],
  ['focus', 'bg', 3, 'Fokusring auf Fläche'],
  ['focus', 'surface', 3, 'Fokusring auf Karte'],
  ['accent', 'surface', 3, 'Aktiver Schalter/Knopf als Fläche'],
  ['marker', 'surface', 2.2, 'Graffiti-Strich (dekorativ, mit Textbezug)'],
];

export function contrastReport() {
  const rows = [];
  for (const d of directions) {
    for (const [theme, t] of Object.entries(d.themes)) {
      for (const [fg, bg, min, why] of PAIRS) {
        const r = ratio(t[fg], t[bg]);
        rows.push({ dir: d.id, theme, fg, bg, ratio: Math.round(r * 100) / 100, min, ok: r >= min, why });
      }
      // Klebeband „Entwurf“: fester dunkler Text auf Markerfarbe, 80 % mit Weiß gemischt (assets/base.css .tape)
      const tape = mixWhite(t.marker, 0.8);
      const rt = ratio('#1A1712', tape);
      rows.push({ dir: d.id, theme, fg: 'tapeText', bg: 'tape', ratio: Math.round(rt * 100) / 100, min: 4.5, ok: rt >= 4.5, why: 'Klebeband-Text' });
    }
  }
  return rows;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = contrastReport();
  const bad = rows.filter((r) => !r.ok);
  for (const r of rows) {
    if (!r.ok || process.argv.includes('--all')) console.log(`${r.ok ? 'ok ' : 'FEHLER'} ${r.dir}/${r.theme} ${r.fg} auf ${r.bg}: ${r.ratio} (min ${r.min})`);
  }
  console.log(`Kontrast: ${rows.length - bad.length}/${rows.length} Paare bestanden`);
  process.exitCode = bad.length ? 1 : 0;
}
