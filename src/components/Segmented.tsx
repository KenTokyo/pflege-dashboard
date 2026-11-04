import type { ReactNode } from 'react';

/**
 * Segment wie OALab (`.seg`): graue Mulde, die Wahl liegt als ruhige Fläche darin. Kein Gleiten (V2).
 * Echte Knöpfe mit `aria-pressed`.
 */
export function Segmented<T extends string>({ label, value, options, onChange, className = '', title }: {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode; icon?: ReactNode }[];
  onChange: (next: T) => void;
  className?: string;
  title?: string;
}) {
  return (
    <div className={`segmented ${className}`} role="group" aria-label={label} title={title}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => { if (o.value !== value) onChange(o.value); }}>
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

