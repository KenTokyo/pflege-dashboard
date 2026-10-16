import type { ReactNode } from 'react';

const drawings = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor" fillOpacity=".3" /><path d="M14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></>,
  person: <><circle cx="12" cy="7.5" r="3.5" fill="currentColor" fillOpacity=".25" /><path d="M4 21v-3a8 8 0 0 1 16 0v3M8 18h8" /></>,
  deadline: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18" /><path d="M8 14h3v3H8z" fill="currentColor" stroke="none" /></>,
  task: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m7 8 1.5 1.5L11 7m3 1h3M7 15l1.5 1.5L11 14m3 1h3" /></>,
  document: <><path d="M6 2h8l5 5v15H6zM14 2v6h5M9 12h7m-7 4h5" /><path d="M6 2h8v6H6z" fill="currentColor" fillOpacity=".22" stroke="none" /></>,
  conversation: <><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-9l-6 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M7 8h10M7 12h6" /></>,
  assistant: <><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z" fill="currentColor" fillOpacity=".18" /><path d="M12 8v8m-4-4h8" /></>,
  settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="var(--surface)" /><circle cx="15" cy="17" r="3" fill="currentColor" fillOpacity=".4" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" /><path d="m8 12 3 3 5-6" /></>,
  logout: <><path d="M10 3H4v18h6m2-9h10m-4-4 4 4-4 4" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};
export type InstrumentKind = keyof typeof drawings;

export function InstrumentIcon({ kind, size = 20 }: { kind: InstrumentKind; size?: number }) {
  return <svg className="in-icon" data-kind={kind} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[kind]}</svg>;
}

export function InstrumentHead({ kind, title, subtitle, children }: { kind: InstrumentKind; title: string; subtitle?: string; children?: ReactNode }) {
  return <div className="in-card-head"><span className="in-tile" data-kind={kind}><InstrumentIcon kind={kind} size={18} /></span><div className="in-head-text"><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>{children}</div>;
}

/** Linienbild: ein vorhandenes Schreiben wird in einen Gesprächsraum eingeordnet. */
export function CaseIllustration() {
  return <svg className="in-illustration" viewBox="0 0 320 160" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="m35 119 128-64 126 63-129 64Z" strokeDasharray="2 5" opacity=".45" />
    <path d="m70 104 93-47 91 46-92 47Z" /><path d="M70 104v9l92 46 92-47v-9m-92 47v9" />
    <path d="m107 91 53 26 56-28V35l-56 28-53-26Z" fill="var(--surface)" />
    <path d="m107 37 54-27 55 25-56 28Zm53 26v54M120 77l25 12m-25-3 25 12m29-13 28-14m-28 4 28-14" />
    <path d="m120 44 40 19 42-20-41-19Z" fill="var(--accent)" fillOpacity=".24" stroke="var(--accent)" />
    <path d="M44 68V48l39-19m156 66 36-18V58" strokeDasharray="3 4" /><circle cx="44" cy="70" r="3" fill="var(--surface)" /><circle cx="275" cy="56" r="3" fill="var(--surface)" />
  </svg>;
}
