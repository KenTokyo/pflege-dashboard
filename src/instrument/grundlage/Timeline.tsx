import type { CSSProperties, ReactNode } from 'react';
import type { Thing } from './Icon';
import { Reveal } from './Reveal';
import './timeline.css';

export type TimelineItem = { id: string; date: string | Date; label: string; description?: ReactNode; thing?: Thing };
export type TimelineProps = { items: readonly TimelineItem[]; today?: string | Date; label?: string; className?: string };

/** Kalendertage statt Millisekunden: Sommerzeit verschiebt die Spur nicht. */
function calendarDate(value: string | Date): Date {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
}

export function calendarDay(value: string | Date): number {
  const date = calendarDate(value);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

/** Feste Skala −14 bis +42 Tage. Außerhalb liegende Termine bleiben als Randpunkt erkennbar. */
export function timelinePosition(days: number): number {
  return Math.max(2, Math.min(98, ((days + 14) / 56) * 100));
}

export function Timeline({ items, today = new Date(), label = 'Termine im Zeitverlauf', className = '' }: TimelineProps) {
  const now = calendarDay(today);
  const rows = items.map((item) => ({ ...item, days: calendarDay(item.date) - now })).sort((a, b) => a.days - b.days);
  return <div className={`in-timeline ${className}`} role="group" aria-label={label}>
    <div className="in-timeline-axis" aria-hidden="true"><span>−14 Tage</span><b>Heute</b><span>+42 Tage</span></div>
    <ol>
      {rows.map((item, index) => {
        const valid = Number.isFinite(item.days);
        const position = valid ? timelinePosition(item.days) : 25;
        const status = !valid ? 'Datum nicht verfügbar' : item.days < 0 ? `Seit ${Math.abs(item.days)} Tagen überfällig`
          : item.days === 0 ? 'Heute fällig' : `In ${item.days} Tagen`;
        const date = calendarDate(item.date);
        const textDate = valid ? date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
        return <li key={item.id} data-position={!valid ? 'unknown' : item.days < 0 ? 'past' : item.days === 0 ? 'today' : 'future'}>
          <div className="in-timeline-caption"><strong>{item.label}</strong><time>{textDate}</time></div>
          <Reveal stage="data" index={index}>
            <div className="in-timeline-track" aria-hidden="true" style={{
              '--in-point': `${position}%`, '--in-from': `${Math.min(25, position)}%`,
              '--in-length': `${Math.abs(position - 25)}%`,
              '--in-tone': item.days < 0 ? 'var(--danger)' : `var(--thing-${item.thing ?? 'deadline'})`,
            } as CSSProperties}>
              <span className="in-timeline-distance" /><span className="in-timeline-point">{valid && (item.days < -14 ? '‹' : item.days > 42 ? '›' : '')}</span>
            </div>
          </Reveal>
          <p className="in-timeline-detail"><span className={item.days < 0 ? 'in-overdue' : undefined}>{status}</span>
            {item.description ? <span>{item.description}</span> : null}</p>
        </li>;
      })}
    </ol>
  </div>;
}
