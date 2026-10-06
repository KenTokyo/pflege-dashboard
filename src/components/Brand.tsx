import { useMemo } from 'react';

/*
 * Eigene Marke und statische Graffiti (aus den Tagwerk-Mocks, docs/mocks/tools/art.mjs).
 * Ohne Bewegungsbibliothek, damit die Anmeldeseite klein bleibt.
 */

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false" className="flex-none">
      <rect x="1" y="1" width="30" height="30" rx="10" fill="var(--text)" />
      <path
        d="M10.5 25 C 10.8 18, 10.2 12.5, 11 7.8 C 15.5 6.6, 21.8 7.4, 21.6 12.2 C 21.4 16.6, 15.6 17.4, 11.6 16.6"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.6" cy="23.4" r="2.6" fill="var(--marker)" />
    </svg>
  );
}

/** Tag-Strich mit Pfeilspitze (Login). Reines CSS: zeichnet sich einmal, reduzierte Bewegung blendet nur ein. */
export function TagLine({ className = 'g-tagline login-tag' }: { className?: string }) {
  const w = 300;
  return (
    <svg className={`${className} draw-once`} viewBox={`0 0 ${w} 30`} aria-hidden="true" focusable="false">
      <path
        className="draw-path"
        pathLength={1}
        d={`M4 20 C 50 10, 110 26, 160 15 S 250 9, ${w - 6} 18`}
        fill="none"
        stroke="var(--marker)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity={0.92}
      />
      <path
        className="draw-tip"
        d={`M${w - 30} 11 l 18 7 l -16 7`}
        fill="none"
        stroke="var(--marker)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Deterministische Sprühpunkte als ruhige, statische Textur. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function Spray({
  className = 'g-spray',
  w = 420,
  h = 300,
  n = 260,
  seed = 11,
  cx = 0.7,
  cy = 0.35,
}: {
  className?: string;
  w?: number;
  h?: number;
  n?: number;
  seed?: number;
  cx?: number;
  cy?: number;
}) {
  const dots = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; y: number; s: number; o: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(-2 * Math.log(r() + 1e-6)) * (i % 9 === 0 ? 0.32 : 0.16);
      const x = (cx + Math.cos(a) * rad) * w;
      const y = (cy + Math.sin(a) * rad * 1.1) * h;
      const s = 0.5 + r() * 1.6;
      const o = 0.25 + r() * 0.6;
      if (x < 0 || y < 0 || x > w || y > h) continue;
      out.push({ x, y, s, o });
    }
    return out;
  }, [w, h, n, seed, cx, cy]);
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      <g fill="var(--marker)">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.s.toFixed(2)} opacity={d.o.toFixed(2)} />
        ))}
      </g>
    </svg>
  );
}
