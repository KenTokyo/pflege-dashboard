import type { ReactNode } from 'react';
import { CardHead, type CardHeadProps } from '../grundlage/CardHead';
import { Reveal } from '../grundlage/Reveal';
import './workspace.css';

export function Panel({ children, footer, index = 0, ...head }: CardHeadProps & {
  children: ReactNode; footer?: ReactNode; index?: number;
}) {
  return <Reveal index={index} className="ib-panel in-card">
    <Reveal stage="head"><CardHead {...head} /></Reveal>
    <div className="ib-body">{children}</div>
    {footer ? <Reveal stage="action" className="ib-foot">{footer}</Reveal> : null}
  </Reveal>;
}

export function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <Reveal stage="head" className="ib-page-heading">
    <div><p className="ib-eyebrow">PFLEGE / ARBEITSBEREICH</p><h1>{title}</h1></div>
    <p>{subtitle}</p>
  </Reveal>;
}
