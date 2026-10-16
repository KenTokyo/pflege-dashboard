import type { CSSProperties, ReactNode } from 'react';
import { Icon, iconThing, type IconName, type Thing } from './Icon';
import './primitives.css';

export type CardHeadProps = {
  icon: IconName; thing?: Thing; title: string; subtitle?: ReactNode; end?: ReactNode;
  count?: number; id?: string; className?: string;
};

export function CardHead({ icon, thing, title, subtitle, end, count, id, className = '' }: CardHeadProps) {
  const color = `var(--thing-${thing ?? iconThing(icon) ?? 'ai'})`;
  return <div className={`in-card-head ${className}`}>
    <span className="in-icon-tile" style={{ '--in-thing': color } as CSSProperties}><Icon name={icon} thing={thing} /></span>
    <div className="in-card-titles"><h2 id={id}>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
    {count !== undefined ? <span className="in-count">{count.toLocaleString('de-DE')}</span> : null}
    {end ? <div className="in-card-end">{end}</div> : null}
  </div>;
}
