import type { CSSProperties, ReactNode } from 'react';
import './primitives.css';

export type Thing = 'person' | 'deadline' | 'task' | 'document' | 'conversation' | 'ai';
export type IconName = Thing | 'overview' | 'settings' | 'sun' | 'moon' | 'logout' | 'chevron' | 'check'
  | 'plus' | 'close' | 'search' | 'arrow' | 'shield' | 'warning' | 'mail' | 'menu' | 'care';

const drawings: Record<IconName, ReactNode> = {
  person: <><circle cx="12" cy="7" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3M9 20h6" /></>,
  deadline: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18" />
    <circle cx="16" cy="16" r="2" fill="currentColor" /></>,
  task: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="m7 9 2 2 4-4M14 10h3M7 16h10" /></>,
  document: <><path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8m-8 4h6" /></>,
  conversation: <><path d="M4 4h16v13H10l-6 4z" /><path d="M8 9h8m-8 4h5" /></>,
  ai: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" /></>,
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity=".2" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" fill="var(--surface)" />
    <circle cx="16" cy="12" r="2" fill="var(--surface)" /><circle cx="10" cy="18" r="2" fill="var(--surface)" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />,
  logout: <path d="M10 4H4v16h6m4-12 4 4-4 4M8 12h12" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  check: <path d="m4 12 5 5L20 6" />,
  plus: <path d="M12 4v16M4 12h16" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  shield: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z" /><path d="m8 12 3 3 5-6" /></>,
  warning: <><path d="m12 3 10 18H2zM12 9v5" /><circle cx="12" cy="17" r=".7" fill="currentColor" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  care: <><path d="M4 12V6h6m4 0h6v6m0 2v6h-6m-4 0H4v-6M8 12h8m-4-4v8" /></>,
};

const roles: Partial<Record<IconName, Thing>> = {
  person: 'person', deadline: 'deadline', task: 'task', document: 'document', conversation: 'conversation', ai: 'ai',
  overview: 'task', settings: 'ai', care: 'person', shield: 'person', warning: 'deadline', mail: 'conversation',
};

export function iconThing(name: IconName): Thing | undefined {
  return roles[name];
}

export type IconProps = { name: IconName; thing?: Thing | undefined; size?: number; label?: string; className?: string };

/** Eigene 24er-Zeichnungen, Strich 1,5. Die Sache bestimmt die volle Symbolfarbe. */
export function Icon({ name, thing = roles[name], size = 18, label, className = '' }: IconProps) {
  const style: CSSProperties = { color: thing ? `var(--thing-${thing})` : 'currentColor' };
  return <svg className={`in-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    {drawings[name]}
  </svg>;
}
