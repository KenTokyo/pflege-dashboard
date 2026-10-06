// Standardicons (Lucide, ISC) werden beim Bauen eingebettet.
// Marken-Graffiti (Striche, Kreise, Stempel, Sprühpunkte, Zeichen) ist hier selbst gezeichnet.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const lucideDir = join(dirname(require.resolve('lucide-static/package.json')), 'icons');
const cache = new Map();

export function icon(name, { size = 16, cls = '', label = '' } = {}) {
  if (!cache.has(name)) {
    const raw = readFileSync(join(lucideDir, `${name}.svg`), 'utf8');
    const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
    cache.set(name, inner.replace(/\n\s*/g, ''));
  }
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${cache.get(name)}</svg>`;
}

// Deterministischer Zufall für Sprühpunkte (gleiche Bilder bei jedem Bau).
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Handgezogener Unterstrich. pathLength=1 erlaubt das Zeichnen per stroke-dashoffset. */
export function underline({ w = 180, cls = 'g-underline', width = 3 } = {}) {
  const h = 12;
  const d = `M2 ${h - 4} C ${w * 0.22} ${h - 7}, ${w * 0.45} ${h - 2.5}, ${w * 0.68} ${h - 5.5} S ${w * 0.93} ${h - 4.2}, ${w - 2} ${h - 6.5}`;
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false" preserveAspectRatio="none"><path d="${d}" pathLength="1" fill="none" stroke="var(--marker)" stroke-width="${width}" stroke-linecap="round"/></svg>`;
}

/** Offener, handgezogener Markerkreis um eine Zahl. */
export function circle({ w = 120, h = 56, cls = 'g-circle', width = 3 } = {}) {
  const d = `M${w * 0.12} ${h * 0.52} C ${w * 0.08} ${h * 0.2}, ${w * 0.42} ${h * 0.06}, ${w * 0.62} ${h * 0.09} C ${w * 0.9} ${h * 0.13}, ${w * 0.98} ${h * 0.38}, ${w * 0.93} ${h * 0.62} C ${w * 0.87} ${h * 0.9}, ${w * 0.45} ${h * 0.97}, ${w * 0.22} ${h * 0.86} C ${w * 0.06} ${h * 0.78}, ${w * 0.04} ${h * 0.5}, ${w * 0.2} ${h * 0.24}`;
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false" preserveAspectRatio="none"><path d="${d}" pathLength="1" fill="none" stroke="var(--marker)" stroke-width="${width}" stroke-linecap="round"/></svg>`;
}

/** Handgezogener Haken. */
export function check({ size = 28, cls = 'g-check', width = 3.2, color = 'var(--marker)' } = {}) {
  return `<svg class="${cls}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false"><path d="M5 17.5 C 7.5 19.2, 10 21.6, 12.6 25 C 16.5 17.5, 21 11.2, 27.5 5.5" pathLength="1" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** Stempel mit rauem Rand (SVG-Filter), Text bleibt echter Text. */
export function stamp({ text = 'Erstellt', sub = '06.10.2026 · 09:38', cls = 'g-stamp', id = 'st' } = {}) {
  return `<svg class="${cls}" viewBox="0 0 168 74" width="168" height="74" role="img" aria-label="Stempel: ${text}${sub ? `, ${sub}` : ''}">
<defs><filter id="${id}-rough" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></defs>
<g filter="url(#${id}-rough)" fill="none" stroke="var(--marker)">
<rect x="3" y="3" width="162" height="68" rx="9" stroke-width="3"/>
<rect x="9" y="9" width="150" height="56" rx="5" stroke-width="1.4"/>
<text x="84" y="${sub ? 40 : 46}" text-anchor="middle" fill="var(--marker)" stroke="none" font-family="var(--font-display)" font-size="23" font-weight="800" letter-spacing="2.5">${text.toUpperCase()}</text>
${sub ? `<text x="84" y="56" text-anchor="middle" fill="var(--marker)" stroke="none" font-family="var(--font-body)" font-size="10.5" font-weight="700" letter-spacing="0.6">${sub}</text>` : ''}
</g></svg>`;
}

/** Sprühpunkte als ruhige Textur (statisch, deterministisch). */
export function spray({ w = 420, h = 300, n = 260, seed = 11, cls = 'g-spray', cx = 0.7, cy = 0.35 } = {}) {
  const r = rng(seed);
  let dots = '';
  for (let i = 0; i < n; i++) {
    // Normalverteilung um einen Sprühkern, dazu wenige Ausreißer.
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(-2 * Math.log(r() + 1e-6)) * (i % 9 === 0 ? 0.32 : 0.16);
    const x = (cx + Math.cos(a) * rad) * w;
    const y = (cy + Math.sin(a) * rad * 1.1) * h;
    if (x < 0 || y < 0 || x > w || y > h) continue;
    const s = (0.5 + r() * 1.6).toFixed(2);
    const o = (0.25 + r() * 0.6).toFixed(2);
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s}" opacity="${o}"/>`;
  }
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false"><g fill="var(--marker)">${dots}</g></svg>`;
}

/** Eigene Bildmarken je Richtung. */
export function brandMark(dir, size = 28) {
  if (dir === 'linie') {
    return `<svg class="brand-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false"><rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)"/><path d="M8.5 20.5 C 12 19, 15.5 21.5, 19 19.8 S 23 18.5, 24 18.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M10 11.5 h12" stroke="#fff" stroke-opacity=".65" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  }
  if (dir === 'klartext') {
    return `<svg class="brand-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false"><rect x="1" y="1" width="30" height="30" rx="5" fill="var(--accent)"/><path d="M9 9.5h14M9 15h9" stroke="var(--on-accent)" stroke-width="2.2" stroke-linecap="round"/><path d="M14.5 22 C 15.8 22.8, 16.8 23.8, 17.8 25 C 19.6 21.5, 21.5 19, 24.5 16.6" fill="none" stroke="var(--marker)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  // tagwerk: Tag-artiges P mit Sprühpunkt
  return `<svg class="brand-mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false"><rect x="1" y="1" width="30" height="30" rx="10" fill="var(--text)"/><path d="M10.5 25 C 10.8 18, 10.2 12.5, 11 7.8 C 15.5 6.6, 21.8 7.4, 21.6 12.2 C 21.4 16.6, 15.6 17.4, 11.6 16.6" fill="none" stroke="var(--bg)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23.6" cy="23.4" r="2.6" fill="var(--marker)"/></svg>`;
}

/** Großer Tag (Schriftzug) für Login-Fläche in Tagwerk: echte Schrift + eigener Strich. */
export function tagLine({ w = 300, cls = 'g-tagline' } = {}) {
  return `<svg class="${cls}" viewBox="0 0 ${w} 30" width="${w}" height="30" aria-hidden="true" focusable="false"><path d="M4 20 C 50 10, 110 26, 160 15 S 250 9, ${w - 6} 18" pathLength="1" fill="none" stroke="var(--marker)" stroke-width="6" stroke-linecap="round" opacity=".92"/><path d="M${w - 30} 11 l 18 7 l -16 7" fill="none" stroke="var(--marker)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
