import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/** Zahl rollt einmal hoch (≤ 400 ms). Bei reduzierter Bewegung sofort der Endwert. */
export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, value, {
      duration: Math.min(0.4, 0.08 + Math.abs(value) * 0.03),
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{reduce ? value : shown}</>;
}
