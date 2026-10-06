import { motion, useReducedMotion } from 'motion/react';

/*
 * Eigene Marken-Graffiti (übernommen aus den Tagwerk-Mocks, docs/mocks/tools/art.mjs).
 * Höchstens ein bewegter Graffiti-Moment je Ansicht; jede Bewegung läuft genau einmal.
 * Bei reduzierter Bewegung: nur eine kurze Einblendung des Endzustands.
 */

const DRAW = { duration: 0.6, ease: [0.25, 0.8, 0.25, 1] as const };
const FADE = { duration: 0.15 };

function DrawnPath({ d, width, delay = 0, animate }: { d: string; width: number; delay?: number; animate: boolean }) {
  const reduce = useReducedMotion();
  if (!animate) {
    return <path d={d} fill="none" stroke="var(--marker)" strokeWidth={width} strokeLinecap="round" />;
  }
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="var(--marker)"
      strokeWidth={width}
      strokeLinecap="round"
      initial={reduce ? { opacity: 0, pathLength: 1 } : { pathLength: 0 }}
      animate={reduce ? { opacity: 1, pathLength: 1 } : { pathLength: 1 }}
      transition={reduce ? FADE : { ...DRAW, delay }}
    />
  );
}

/** Handgezogener Unterstrich unter einer Frist. */
export function Underline({ animate = true }: { animate?: boolean }) {
  const w = 180;
  const h = 12;
  const d = `M2 ${h - 4} C ${w * 0.22} ${h - 7}, ${w * 0.45} ${h - 2.5}, ${w * 0.68} ${h - 5.5} S ${w * 0.93} ${h - 4.2}, ${w - 2} ${h - 6.5}`;
  return (
    <svg className="g-underline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <DrawnPath d={d} width={3} animate={animate} delay={0.25} />
    </svg>
  );
}

/** Offener Markerkreis um eine dringende Zahl. */
export function MarkerCircle({ animate = true }: { animate?: boolean }) {
  const w = 120;
  const h = 56;
  const d = `M${w * 0.12} ${h * 0.52} C ${w * 0.08} ${h * 0.2}, ${w * 0.42} ${h * 0.06}, ${w * 0.62} ${h * 0.09} C ${w * 0.9} ${h * 0.13}, ${w * 0.98} ${h * 0.38}, ${w * 0.93} ${h * 0.62} C ${w * 0.87} ${h * 0.9}, ${w * 0.45} ${h * 0.97}, ${w * 0.22} ${h * 0.86} C ${w * 0.06} ${h * 0.78}, ${w * 0.04} ${h * 0.5}, ${w * 0.2} ${h * 0.24}`;
  return (
    <svg className="g-circle" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <DrawnPath d={d} width={3} animate={animate} delay={0.3} />
    </svg>
  );
}
