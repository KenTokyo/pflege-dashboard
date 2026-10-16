import type { CSSProperties, ReactNode } from 'react';
import './primitives.css';

export type SegmentOption<T extends string> = { value: T; label: ReactNode; disabled?: boolean };
export type SegmentsProps<T extends string> = {
  label: string; value: T; options: readonly SegmentOption<T>[]; onChange: (value: T) => void; className?: string;
};

/** Kontrollierte Auswahl; echte Buttons, Pfeiltasten, Home/End. Kein zusätzlicher Auswahl-State. */
export function Segments<T extends string>({ label, value, options, onChange, className = '' }: SegmentsProps<T>) {
  const index = options.findIndex((option) => option.value === value);
  return <div className={`in-segments ${className}`} role="group" aria-label={label}
    style={{ '--in-segments': options.length, '--in-selected': index } as CSSProperties}>
    {index >= 0 ? <span className="in-segment-thumb" aria-hidden="true" /> : null}
    {options.map((option) => <button type="button" key={option.value} aria-pressed={value === option.value}
      disabled={option.disabled} onClick={() => { if (option.value !== value) onChange(option.value); }}
      onKeyDown={(event) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        const enabled = options.filter((item) => !item.disabled);
        const current = enabled.findIndex((item) => item.value === option.value);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length;
        const target = enabled[next];
        if (!target) return;
        event.preventDefault();
        const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        buttons?.[next]?.focus();
        onChange(target.value);
      }}><span>{option.label}</span></button>)}
  </div>;
}
