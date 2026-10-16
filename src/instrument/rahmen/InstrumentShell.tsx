import { Link, useLocation } from '@tanstack/react-router';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useTheme } from '../../app/ThemeProvider';
import { useAuth, useWorkspace } from '../../auth/AuthProvider';
import { useConversations, useDocuments, useOpenTasks } from '../../data/queries';
import { baseName, initials } from '../../lib/format';
import { Icon, type IconName, type Thing } from '../grundlage/Icon';
import { Reveal } from '../grundlage/Reveal';
import './rahmen.css';
import './mobile.css';

const NAV = [
  { to: '/', label: 'Übersicht', icon: 'overview', thing: 'person', exact: true },
  { to: '/gespraeche', label: 'Gespräche', icon: 'conversation', thing: 'conversation', exact: false },
  { to: '/dokumente', label: 'Dokumente', icon: 'document', thing: 'document', exact: false },
  { to: '/aufgaben', label: 'Aufgaben', icon: 'task', thing: 'task', exact: false },
  { to: '/einstellungen', label: 'Einstellungen', icon: 'settings', thing: 'ai', exact: false },
] as const satisfies readonly { to: string; label: string; icon: IconName; thing: Thing; exact: boolean }[];

function Account() {
  const { profile, workspace, role } = useWorkspace();
  const { signOut } = useAuth();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent | KeyboardEvent) => {
      const el = ref.current;
      if (!el?.open) return;
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        el.open = false;
        el.querySelector('summary')?.focus();
      } else if (event instanceof PointerEvent && event.target instanceof Node && !el.contains(event.target)) el.open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  return <details className="in-account" ref={ref}>
    <summary aria-label={`Konto: ${baseName(profile.displayName)}`}>
      <span className="in-avatar" aria-hidden="true">{initials(profile.displayName)}</span>
      <span className="in-account-name">{baseName(profile.displayName)}<small>{role === 'admin' ? 'Verwaltung' : 'Mitglied'}</small></span>
      <Icon name="chevron" size={15} />
    </summary>
    <div className="in-account-panel">
      <p>{workspace.name}</p>
      <Link to="/einstellungen" onClick={() => { if (ref.current) ref.current.open = false; }}>
        <Icon name="settings" /><span>Einstellungen</span>
      </Link>
      <button type="button" onClick={() => signOut('manual')}><Icon name="logout" /><span>Abmelden</span></button>
    </div>
  </details>;
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  const label = `Zu ${theme === 'dunkel' ? 'hellem' : 'dunklem'} Design wechseln`;
  return <button type="button" className="in-icon-button" onClick={toggle} aria-label={label}>
    <Icon name={theme === 'dunkel' ? 'moon' : 'sun'} /><span className="in-control-tip" role="tooltip">{label}</span>
  </button>;
}

/** Rahmen nutzt dieselben Abfragen und denselben Query-Cache wie die Seiten. */
export function InstrumentShell({ children, mainClassName = '' }: { children: ReactNode; mainClassName?: string }) {
  const { workspace } = useWorkspace();
  const path = useLocation({ select: (location) => location.pathname });
  const conversations = useConversations();
  const documents = useDocuments();
  const tasks = useOpenTasks();
  const counts: Partial<Record<string, number>> = {
    '/gespraeche': conversations.data?.length,
    '/dokumente': documents.data?.length,
    '/aufgaben': tasks.data?.length,
  };
  const selected = NAV.findIndex((item) => item.exact ? path === item.to : path.startsWith(item.to));
  const staff = path === '/sachbearbeitung';
  return <div className="in-shell">
    <aside className="in-sidebar">
      <Reveal stage="frame">
        <Link to="/" className="in-brand" aria-label="Pflege-Dashboard, Übersicht">
          <span className="in-brand-mark"><Icon name="care" size={24} /></span>
          <span>Pflege-Dashboard<small>{workspace.name}</small></span>
        </Link>
      </Reveal>
      <div className="in-nav-label">Arbeitsbereich</div>
      <nav className="in-navigation" aria-label="Hauptnavigation" style={{ '--in-nav-index': selected } as CSSProperties}>
        {selected >= 0 ? <span className="in-nav-marker" aria-hidden="true" /> : null}
        {NAV.map(({ to, label, icon, thing, exact }, index) => <Link key={to} to={to} className="in-nav-item"
          activeOptions={{ exact }} activeProps={{ 'aria-current': 'page' }}>
          <Icon name={icon} thing={thing} size={18} /><span>{label}</span>
          {counts[to] !== undefined ? <span className="in-nav-count" aria-label={`${counts[to]} ${label}`}>
            {counts[to].toLocaleString('de-DE')}</span> : null}
          <span className="in-nav-order" aria-hidden="true">0{index + 1}</span>
        </Link>)}
      </nav>
      <div className="in-sidebar-foot"><Account /></div>
    </aside>

    <div className="in-workspace">
      <header className="in-topbar">
        <div className="in-context"><span>{workspace.name}</span><Icon name="chevron" size={13} />
          <strong>{staff ? 'Sachbearbeitung' : NAV[selected]?.label ?? 'Gespräch'}</strong></div>
        <div className="in-topbar-actions">
          <nav className="in-view-switch" aria-label="Demo-Ansicht wechseln">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }}>
              <Icon name="person" size={16} /><span>Kundenansicht</span>
            </Link>
            <Link to="/sachbearbeitung" activeProps={{ 'aria-current': 'page' }}>
              <Icon name="ai" size={16} /><span>Sachbearbeiter-Test</span>
            </Link>
          </nav>
          <ThemeButton />
          <Link className="in-icon-button in-mobile-settings" to="/einstellungen" aria-label="Einstellungen">
            <Icon name="settings" /><span className="in-control-tip" role="tooltip">Einstellungen</span>
          </Link>
          <div className="in-mobile-account"><Account /></div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={`in-main ${mainClassName}`}>{children}</main>
    </div>

    <nav className="in-bottomnav" aria-label="Hauptnavigation mobil">
      {NAV.filter((item) => item.to !== '/einstellungen').map(({ to, label, icon, thing, exact }) =>
        <Link key={to} to={to} activeOptions={{ exact }} activeProps={{ 'aria-current': 'page' }}>
          <Icon name={icon} thing={thing} size={19} /><span>{label}</span>
        </Link>)}
    </nav>
  </div>;
}
