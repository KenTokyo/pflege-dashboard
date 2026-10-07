import { Link, useLocation } from '@tanstack/react-router';
import { FileText, LayoutGrid, ListChecks, LogOut, MessagesSquare, Settings } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { baseName, initials } from '../lib/format';
import { BrandMark } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { StaffViewSwitch } from '../staff/StaffViewSwitch';

const NAV = [
  { to: '/', label: 'Übersicht', icon: LayoutGrid, exact: true },
  { to: '/gespraeche', label: 'Gespräche', icon: MessagesSquare, exact: false },
  { to: '/dokumente', label: 'Dokumente', icon: FileText, exact: false },
  { to: '/aufgaben', label: 'Aufgaben', icon: ListChecks, exact: false },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings, exact: false },
] as const;

function UserMenu({ placement }: { placement: 'up' | 'down' }) {
  const { signOut } = useAuth();
  const { profile, workspace, role } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        style={{ width: 44, height: 44 }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Konto: ${baseName(profile.displayName)}`}
        title="Konto und Abmelden"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="avatar" aria-hidden="true">
          {initials(profile.displayName)}
        </span>
      </button>
      {open ? (
        <div className={`menu ${placement === 'up' ? 'menu-up' : 'menu-down'}`} role="menu" id={menuId}>
          <div className="menu-head">
            <strong>{baseName(profile.displayName)}</strong>
            <span className="muted">
              {workspace.name} · {role === 'admin' ? 'Verwaltung' : 'Mitglied'}
            </span>
          </div>
          <Link to="/sachbearbeitung" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <LayoutGrid className="i" size={17} aria-hidden="true" />
            Sachbearbeiter-Test
          </Link>
          <Link to="/" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            Kundenansicht
          </Link>
          <button type="button" role="menuitem" className="menu-item" onClick={() => signOut('manual')}>
            <LogOut className="i" size={17} aria-hidden="true" />
            Abmelden
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Shell({ children, mainClassName = '' }: { children: ReactNode; mainClassName?: string }) {
  const { workspace } = useWorkspace();
  const pathname = useLocation({ select: (location) => location.pathname });
  return (
    <div className="shell">
      <nav className="rail" aria-label="Hauptnavigation">
        <Link to="/" className="rail-brand" aria-label="Pflege-Dashboard, Übersicht">
          <BrandMark size={32} />
        </Link>
        <div className="rail-nav">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link key={to} to={to} className="rail-item" activeOptions={{ exact }} activeProps={{ 'aria-current': 'page' }}>
              <Icon className="i" size={20} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
        <div className="rail-foot">
          <ThemeToggle />
          <UserMenu placement="up" />
        </div>
      </nav>

      <header className="topbar">
        <Link to="/" className="topbar-brand" aria-label="Pflege-Dashboard, Übersicht">
          <BrandMark size={30} />
          <span className="min-w-0">
            <span className="block leading-tight">Pflege-Dashboard</span>
            <span className="block text-[13px] font-normal muted leading-tight truncate" style={{ fontFamily: 'var(--font-body)' }}>
              {workspace.name}
            </span>
          </span>
        </Link>
        <div className="topbar-actions">
          <Link to="/einstellungen" className="icon-btn" aria-label="Einstellungen" title="Einstellungen" activeProps={{ 'aria-current': 'page' }}>
            <Settings className="i" size={18} aria-hidden="true" />
          </Link>
          <ThemeToggle />
          <UserMenu placement="down" />
        </div>
      </header>

      <main id="main" tabIndex={-1} className={`main ${mainClassName}`}>
        {pathname === '/' || pathname === '/sachbearbeitung' ? <StaffViewSwitch /> : null}
        {children}
      </main>

      <nav className="bottomnav" aria-label="Hauptnavigation mobil">
        {NAV.filter((n) => n.to !== '/einstellungen').map(({ to, label, icon: Icon, exact }) => (
          <Link key={to} to={to} activeOptions={{ exact }} activeProps={{ 'aria-current': 'page' }}>
            <Icon className="i" size={20} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
