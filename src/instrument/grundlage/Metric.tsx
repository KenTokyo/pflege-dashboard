import { useEffect, useRef, type ReactNode } from 'react';
import type { Thing } from './Icon';
import './primitives.css';

export type MetricProps = {
  value: number; unit?: string; label: string; explanation?: ReactNode; decimals?: number;
  tone?: Thing | 'danger' | 'warning' | 'success' | 'accent'; className?: string;
};

/** Ein endliches Zählwerk ohne React-Render pro Bild. Stoppt bei Unsichtbarkeit und beim Aushängen. */
export function Metric({ value, unit, label, explanation, decimals = 0, tone, className = '' }: MetricProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const digits = Math.max(0, Math.min(20, decimals));
  const valid = Number.isFinite(value);
  const number = valid ? value : 0;
  const formatted = valid ? number.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '–';
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = previous.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let finished = false;
    let started = false;
    const finish = () => {
      finished = true;
      cancelAnimationFrame(frame);
      el.textContent = formatted;
      previous.current = number;
    };
    const start = () => {
      if (started || finished) return;
      started = true;
      const at = performance.now();
      const tick = () => {
        const p = Math.min(1, (performance.now() - at) / 760);
        const current = from + (number - from) * (1 - (1 - p) ** 4);
        previous.current = current;
        el.textContent = current.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
        if (p < 1) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => { if (document.hidden) finish(); };
    const onMotion = () => { if (media.matches) finish(); };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else if (started) finish();
    }) : null;
    if (!valid || media.matches || document.hidden) finish();
    else if (observer) observer.observe(el);
    else start();
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener('change', onMotion);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      media.removeEventListener('change', onMotion);
    };
  }, [number, digits, formatted, valid]);
  const color = tone ? `var(--${['danger', 'warning', 'success', 'accent'].includes(tone) ? tone : `thing-${tone}`})` : undefined;
  return <div className={`in-metric ${className}`}>
    <p className="in-metric-label">{label}</p>
    <p className="in-metric-line" aria-label={valid ? `${formatted}${unit ? ` ${unit}` : ''}` : 'Nicht verfügbar'}>
      <span ref={ref} className="in-metric-value" style={{ color }} aria-hidden="true">{formatted}</span>
      {unit ? <span className="in-metric-unit" aria-hidden="true">{unit}</span> : null}
    </p>
    {explanation ? <p className="in-metric-explanation">{explanation}</p> : null}
  </div>;
}
