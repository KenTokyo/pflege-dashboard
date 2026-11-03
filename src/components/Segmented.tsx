import { LayoutGroup, motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { SPRING } from '../motion/tokens';

/**
 * Tagwerk-Umschalter: die Markierung federt zur neuen Wahl (Vorlage `shardfall/src/ui/motion/MorphPick.tsx`).
 * Echte Knöpfe mit `aria-pressed`; die Tinte ist ein eigenes `motion`-Element, bewegt nur `transform`.
 */
export function Segmented<T extends string>({ label, value, options, onChange, className = '', title }: {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode; icon?: ReactNode }[];
  onChange: (next: T) => void;
  className?: string;
  title?: string;
}) {
  const group = useId();
  return (
    <LayoutGroup id={group}>
      <div className={`segmented ${className}`} role="group" aria-label={label} title={title}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => { if (o.value !== value) onChange(o.value); }}>
            {value === o.value ? <motion.span layoutId="seg-ink" className="seg-ink" transition={SPRING.elastic} aria-hidden="true" /> : null}
            {o.icon}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

/** Dieselbe Tinte für Link-Reihen (aktive Seite statt gedrücktem Knopf). */
export function SegInk({ id }: { id: string }) {
  return <motion.span layoutId={id} className="seg-ink" transition={SPRING.elastic} aria-hidden="true" />;
}
