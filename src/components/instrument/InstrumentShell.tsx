import { Link, useLocation } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useAuth, useWorkspace } from '../../auth/AuthProvider';
import { baseName, initials } from '../../lib/format';
import { ThemeToggle } from '../ThemeToggle';
import { InstrumentIcon, type InstrumentKind } from './InstrumentIcon';

const NAV: { to: '/' | '/gespraeche' | '/dokumente' | '/aufgaben' | '/einstellungen' | '/sachbearbeitung'; label: string; kind: InstrumentKind }[] = [
  { to: '/', label: 'Übersicht', kind: 'overview' },
  { to: '/gespraeche', label: 'Gespräche', kind: 'conversation' },
  { to: '/dokumente', label: 'Dokumente', kind: 'document' },
  { to: '/aufgaben', label: 'Aufgaben', kind: 'task' },
];
const SECONDARY: typeof NAV = [
  { to: '/sachbearbeitung', label: 'Sachbearbeiter-Test', kind: 'assistant' },
  { to: '/einstellungen', label: 'Einstellungen', kind: 'settings' },
];

export function InstrumentShell({ children, mainClassName = '' }: { children: ReactNode; mainClassName?: string }) {
  const { workspace, profile } = useWorkspace();
  const { signOut } = useAuth();
  const path = useLocation({ select: (l) => l.pathname });
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = [...NAV, ...SECONDARY].find((n) => n.to === '/' ? path === '/' : path.startsWith(n.to));
  const links = (list: typeof NAV) => list.map((n) => {
    const active = current?.to === n.to;
    return <Link key={n.to} to={n.to} className="in-nav-item" aria-current={active ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
      {active ? <motion.span className="in-nav-active" layoutId="instrument-nav" transition={{ duration: reduce ? 0 : .24, ease: [.16, 1, .3, 1] }} /> : null}
      <InstrumentIcon kind={n.kind} size={18} /><span>{n.label}</span>{active ? <InstrumentIcon kind="chevron" size={13} /> : null}
    </Link>;
  });
  return <div className={`in-shell ${menuOpen ? 'in-menu-open' : ''}`} onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(false); }}>
    <aside className="in-sidebar" id="instrument-navigation" aria-label="Seitenleiste">
      <Link to="/" className="in-brand"><span className="in-brand-mark"><InstrumentIcon kind="overview" size={21} /></span><span>Pflege<span className="in-brand-light">Dashboard</span><small>Einfach gut organisiert.</small></span></Link>
      <div className="in-workspace"><InstrumentIcon kind="shield" size={18} /><div><strong>{workspace.name}</strong><span>Ihr gemeinsamer Arbeitsbereich</span></div></div>
      <nav aria-label="Hauptnavigation"><p className="in-nav-label">Ihr Pflegealltag</p>{links(NAV)}<p className="in-nav-label in-nav-label-second">Arbeitsbereich</p>{links(SECONDARY)}</nav>
      <div className="in-sidebar-bottom">
        <div className="in-trust"><InstrumentIcon kind="shield" size={20} /><p>Ein klarer Blick.<br /><span>Ein nächster Schritt.</span></p></div>
        <div className="in-account"><span className="in-avatar">{initials(profile.displayName)}</span><span><strong>{baseName(profile.displayName)}</strong><small>Angemeldet</small></span><button className="icon-btn in-logout" type="button" onClick={() => signOut('manual')} aria-label="Abmelden"><InstrumentIcon kind="logout" size={18} /></button></div>
        <div className="in-sidebar-caption"><span>Instrument</span><span>Pflege-Dashboard</span></div>
      </div>
    </aside>
    <div className="in-workarea">
      <header className="in-topbar">
        <button type="button" className="icon-btn in-menu-button" aria-label={menuOpen ? 'Navigation schließen' : 'Navigation öffnen'} aria-expanded={menuOpen} aria-controls="instrument-navigation" onClick={() => setMenuOpen(!menuOpen)}><InstrumentIcon kind="menu" /></button>
        <div className="in-breadcrumb"><span>Ihr Arbeitsbereich</span><span aria-hidden="true">/</span><strong>{current?.label ?? 'Gespräch'}</strong></div>
        <div className="in-top-actions"><span className="in-demo-tag">Demo</span><ThemeToggle /><Link to="/einstellungen" className="icon-btn" aria-label="Einstellungen"><InstrumentIcon kind="settings" size={18} /></Link></div>
      </header>
      {menuOpen ? <button className="in-menu-backdrop" aria-label="Navigation schließen" onClick={() => setMenuOpen(false)} /> : null}
      <main id="main" tabIndex={-1} className={`main in-main ${mainClassName}`}>{children}</main>
    </div>
    <nav className="in-mobile-nav" aria-label="Hauptnavigation mobil">{NAV.map((n) => <Link key={n.to} to={n.to} aria-current={current?.to === n.to ? 'page' : undefined}><InstrumentIcon kind={n.kind} size={19} /><span>{n.label}</span></Link>)}</nav>
  </div>;
}
