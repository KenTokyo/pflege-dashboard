import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/** Zahl rollt einmal hoch (standardmäßig ≤ 400 ms). Reduzierte Bewegung zeigt sofort den Endwert. */
export function CountUp({ value, duration }: { value: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, value, {
      duration: duration ?? Math.min(0.4, 0.08 + Math.abs(value) * 0.03),
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce, duration]);
  return <>{reduce ? value : shown}</>;
}
