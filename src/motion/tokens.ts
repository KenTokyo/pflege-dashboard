/**
 * Federn und Kurven für Tagwerk – übernommen aus dem Shardfall-Motion-System (`shardfall/src/ui/motion/tokens.ts`).
 * Dieselben Federn gibt es zweimal: für `motion` (`SPRING.*`) und als CSS-Kurve `linear(…)` (`--mo-spring-*`),
 * damit ein CSS-Übergang genauso federt wie eine `motion`-Markierung.
 */
export interface SpringSpec {
  readonly type: 'spring';
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

const spring = (stiffness: number, damping: number, mass = 1): SpringSpec => Object.freeze({ type: 'spring', stiffness, damping, mass });

export const SPRING = Object.freeze({
  /** Flächen, Listen, Rückweg. */
  soft: spring(170, 24, 1),
  /** Karten, Zeilen, Tafeln. */
  base: spring(260, 26, 0.9),
  /** Knöpfe, Marker. */
  snap: spring(420, 30, 0.8),
  /** Stempel, Zahlen-Pop, Loslassen. */
  pop: spring(520, 18, 0.7),
  /** Auswahl-Tinte, die nachfedert. */
  elastic: spring(300, 14, 0.9),
  /** Kamerafahrt, Dialog-Dolly. */
  camera: spring(120, 24, 1.1),
});

/** Die Feder als Bahn 0 → 1 und die Zeit bis zur Ruhe (fester Schritt: gleiche Feder, gleiche Kurve). */
export function springPath(s: SpringSpec, samples = 48): { points: number[]; ms: number } {
  const dt = 1 / 1000;
  let x = 0;
  let v = 0;
  let t = 0;
  const trace: number[] = [];
  while (t < 4) {
    const a = (-s.stiffness * (x - 1) - s.damping * v) / s.mass;
    v += a * dt;
    x += v * dt;
    t += dt;
    trace.push(x);
    if (t > 0.05 && Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) break;
  }
  const points: number[] = [0];
  for (let i = 1; i < samples; i++) points.push(trace[Math.min(trace.length - 1, Math.round((i / samples) * (trace.length - 1)))] ?? 1);
  points.push(1);
  return { points, ms: Math.round(t * 1000) };
}

export function springCss(s: SpringSpec): { easing: string; ms: number } {
  const { points, ms } = springPath(s);
  return { easing: `linear(${points.map((p) => +p.toFixed(4)).join(', ')})`, ms };
}

let installed = false;

/** Schreibt die Federn einmal als `--mo-spring-<name>` und `--mo-spring-<name>-ms` auf `:root`. */
export function installSpringCss(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('transition-timing-function', 'linear(0, 1)')) return;
  const root = document.documentElement.style;
  for (const [name, spec] of Object.entries(SPRING)) {
    const { easing, ms } = springCss(spec);
    root.setProperty(`--mo-spring-${name}`, easing);
    root.setProperty(`--mo-spring-${name}-ms`, `${ms}ms`);
  }
}
