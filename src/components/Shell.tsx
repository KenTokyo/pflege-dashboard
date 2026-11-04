import { Link, useLocation } from '@tanstack/react-router';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { baseName, initials } from '../lib/format';
import { BrandMark } from './Brand';
import { NavIcon, type NavIconName } from './NavIcon';
import { setDemoNoticeOpen, useDemoNoticeOpen } from './demoNotice';
import { SideConversations } from './SideConversations';
import { StaffViewSwitch } from '../staff/StaffViewSwitch';
import { useDesign, useRail, useTheme } from '../app/ThemeProvider';
import { InstrumentShell } from '../instrument/rahmen/InstrumentShell';

/** Welche Fläche gerade offen ist; steuert Titel, aktive Zeile und den Übersicht-Morph (motion.css). */
type RouteKind = 'new' | 'uebersicht' | 'thread' | 'dokumente' | 'aufgaben' | 'einstellungen' | 'sachbearbeitung';
function routeOf(path: string): RouteKind {
  if (path.startsWith('/gespraeche/')) return 'thread';
  if (path === '/uebersicht') return 'uebersicht';
  if (path.startsWith('/dokumente')) return 'dokumente';
  if (path.startsWith('/aufgaben')) return 'aufgaben';
  if (path.startsWith('/einstellungen')) return 'einstellungen';
  if (path === '/sachbearbeitung') return 'sachbearbeitung';
  return 'new';
}
const TITLE: Record<RouteKind, string> = {
  new: 'Neues Gespräch', uebersicht: 'Übersicht', thread: 'Gespräch', dokumente: 'Dokumente', aufgaben: 'Aufgaben',
  einstellungen: 'Einstellungen', sachbearbeitung: 'Sachbearbeiter-Test',
};
const WORK: readonly { to: '/dokumente' | '/aufgaben'; kind: RouteKind; label: string; icon: NavIconName }[] = [
  { to: '/dokumente', kind: 'dokumente', label: 'Dokumente', icon: 'docs' },
  { to: '/aufgaben', kind: 'aufgaben', label: 'Aufgaben', icon: 'tasks' },
];

const MENU_EXIT_MS = 90;
/** Oberste Ebene nur, wo der Browser sie kann; sonst bleibt das Menü ein normales Element. */
const POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

type TipProps = { onPointerEnter: (e: { currentTarget: HTMLElement }) => void; onPointerLeave: () => void; onFocus: (e: { currentTarget: HTMLElement }) => void; onBlur: () => void };

/** Kontomenü: Person, Darstellung, Einstellungen, Sichtwechsel, Abmelden. Liegt in der obersten Ebene (Popover). */
function UserMenu({ tipProps, onNavigate }: { tipProps: TipProps; onNavigate: () => void }) {
  const { signOut } = useAuth();
  const { profile, workspace, role } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = phase === 'open';
  const close = useCallback(() => setPhase((p) => (p === 'open' ? 'closing' : p)), []);
  const go = () => { close(); onNavigate(); };

  useEffect(() => {
    if (phase !== 'closing') return;
    const t = window.setTimeout(() => setPhase((p) => (p === 'closing' ? 'closed' : p)), MENU_EXIT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (phase === 'open' && el && POPOVER && !el.matches(':popover-open')) el.showPopover();
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target instanceof Node ? e.target : null;
      if (t && !ref.current?.contains(t) && !menuRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const name = baseName(profile.displayName);
  const roleLabel = role === 'admin' ? 'Verwaltung' : 'Mitglied';
  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="sitem side-me" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        aria-label={`Konto: ${name}`} data-tip={name} {...tipProps}
        onClick={() => setPhase((p) => (p === 'open' ? 'closing' : 'open'))}>
        <span className="avatar avatar-xs" aria-hidden="true">{initials(profile.displayName)}</span>
        <span className="side-label side-me-name">{name}</span>
        <span className="side-label side-me-chev"><NavIcon name="updown" size={13} /></span>
      </button>
      {phase !== 'closed' ? (
        <div ref={menuRef} popover={POPOVER ? 'manual' : undefined} className="menu fx-pop" data-state={phase} role="menu" id={menuId}>
          <div className="menu-head">
            <span className="avatar" aria-hidden="true">{initials(profile.displayName)}</span>
            <span className="menu-head-t">
              <strong>{name}</strong>
              <span>{workspace.name} · {roleLabel}</span>
            </span>
          </div>
          <div className="menu-sep" role="separator" />
          <p className="menu-h" aria-hidden="true">Darstellung</p>
          {(['hell', 'dunkel'] as const).map((t) => (
            <button key={t} type="button" role="menuitemradio" aria-checked={theme === t} className="menu-item" onClick={() => { setTheme(t); close(); }}>
              <NavIcon name={t === 'hell' ? 'sun' : 'moon'} />
              {t === 'hell' ? 'Hell' : 'Dunkel'}
              {theme === t ? <span className="menu-tick"><NavIcon name="check" size={14} /></span> : null}
            </button>
          ))}
          <div className="menu-sep" role="separator" />
          <Link to="/einstellungen" role="menuitem" className="menu-item" onClick={go}>
            <NavIcon name="settings" />
            Einstellungen
          </Link>
          <Link to="/uebersicht" role="menuitem" className="menu-item" onClick={go}>
            <NavIcon name="care" />
            Kundenansicht
          </Link>
          <Link to="/sachbearbeitung" role="menuitem" className="menu-item" onClick={go}>
            <NavIcon name="staff" />
            Sachbearbeiter-Test
          </Link>
          <div className="menu-sep" role="separator" />
          <button type="button" role="menuitem" className="menu-item" onClick={() => signOut('manual')}>
            <NavIcon name="logout" />
            Abmelden
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Telefon (≤ 640 px, wie app.css): der Sichtwechsel steht dann im Inhalt statt in der schmalen Topbar. */
const PHONE = '(max-width: 640px)';
const subscribePhone = (cb: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(PHONE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const isPhone = () => typeof window.matchMedia === 'function' && window.matchMedia(PHONE).matches;
const usePhone = () => useSyncExternalStore(subscribePhone, isPhone, () => false);

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Tagwerk-Rahmen V2 (wie die OALab-Kundenansicht): EINE Seitenleiste mit Marke, „Neues Gespräch“, direkt darunter
 * „Übersicht“ (öffnet per Morph), Suche und Gesprächsgruppen; unten Dokumente, Aufgaben, Konto und Thema.
 * Einklappbar (Knopf oder „[“), auf dem Handy eine Schublade. Bleibt beim Seitenwechsel stehen (hängt in AppGate).
 */
export function TagwerkFrame({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace();
  const { theme, toggle } = useTheme();
  const { railOpen, toggleRail } = useRail();
  const demoOpen = useDemoNoticeOpen();
  const pathname = useLocation({ select: (location) => location.pathname });
  const route = routeOf(pathname);
  const switchable = route === 'uebersicht' || route === 'sachbearbeitung';
  const phone = usePhone();
  const activeId = route === 'thread' ? decodeURIComponent(pathname.split('/')[2] ?? '') : null;
  const [drawer, setDrawer] = useState(false);
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);
  const collapsed = !railOpen && !drawer;
  const closeDrawer = useCallback(() => setDrawer(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
      if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      e.preventDefault();
      setTip(null);
      toggleRail();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleRail]);

  // Schublade schließt beim Seitenwechsel (Klick auf ein Gespräch, eine Zeile).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawer(false);
  }

  const showTip = (e: { currentTarget: HTMLElement }) => {
    if (!collapsed) return;
    const el = e.currentTarget;
    const label = el.dataset.tip ?? el.getAttribute('aria-label') ?? el.textContent;
    const r = el.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2 });
  };
  const hideTip = () => setTip(null);
  const tipProps: TipProps = { onPointerEnter: showTip, onPointerLeave: hideTip, onFocus: showTip, onBlur: hideTip };
  const current = (kind: RouteKind) => (route === kind ? { 'aria-current': 'page' as const } : {});
  const nextTheme = theme === 'dunkel' ? 'helles' : 'dunkles';

  return (
    <div className="shell" data-side={railOpen ? 'auf' : 'zu'} data-drawer={drawer ? 'auf' : undefined} data-route={route}>
      <nav className="side" aria-label="Hauptnavigation">
        <div className="side-top">
          <div className="side-head">
            <Link to="/" className="side-brand" aria-label="Pflege-Dashboard – neues Gespräch" data-tip="Pflege-Dashboard" {...tipProps}>
              <BrandMark size={22} />
              <span className="side-label side-brand-t">
                <strong>Pflege-Dashboard</strong>
                <small>{workspace.name}</small>
              </span>
            </Link>
            <button type="button" className="ibtn ibtn-sm side-fold" onClick={() => { setTip(null); if (drawer) setDrawer(false); else toggleRail(); }}
              aria-label={drawer ? 'Navigation schließen' : 'Seitenleiste einklappen'} title={drawer ? 'Schließen' : 'Einklappen  ['}>
              <NavIcon name={drawer ? 'close' : 'collapse'} />
            </button>
          </div>
          {collapsed ? (
            <button type="button" className="sitem" onClick={() => { setTip(null); toggleRail(); }} aria-label="Seitenleiste aufklappen" data-tip="Aufklappen  [" {...tipProps}>
              <NavIcon name="expand" className="i" />
            </button>
          ) : null}
          <Link to="/" className="sitem side-new" {...current('new')} data-tip="Neues Gespräch" {...tipProps}
            {...(route === 'uebersicht' ? { viewTransition: { types: ['morph-back'] } } : {})}>
            <NavIcon name="compose" className="i" />
            <span className="side-label">Neues Gespräch</span>
          </Link>
          <Link to="/uebersicht" preload="intent" className="sitem side-overview" {...current('uebersicht')} data-tip="Übersicht" {...tipProps}
            {...(route === 'uebersicht' ? {} : { viewTransition: { types: ['morph-to'] } })}>
            <NavIcon name="overview" className="i" />
            <span className="side-label">Übersicht</span>
          </Link>
          {collapsed ? (
            <button type="button" className="sitem" onClick={() => { setTip(null); toggleRail(); }} aria-label="Gespräche suchen" data-tip="Gespräche suchen" {...tipProps}>
              <NavIcon name="search" className="i" />
            </button>
          ) : null}
        </div>
        <div className="side-scroll">
          <SideConversations activeId={activeId} collapsed={collapsed} />
        </div>
        <div className="side-bot">
          {WORK.map((w) => (
            <Link key={w.to} to={w.to} className="sitem" {...current(w.kind)} data-tip={w.label} {...tipProps}>
              <NavIcon name={w.icon} className="i" />
              <span className="side-label">{w.label}</span>
            </Link>
          ))}
          {workspace.demoBanner && !demoOpen ? (
            <button type="button" id="demo-reopen" className="sitem" onClick={() => setDemoNoticeOpen(true)}
              aria-label="Demo-Hinweis zeigen" data-tip="Demo-Hinweis" {...tipProps}>
              <NavIcon name="shield" className="i" />
              <span className="side-label">Demo-Hinweis</span>
            </button>
          ) : null}
          <div className="side-foot">
            <UserMenu tipProps={tipProps} onNavigate={closeDrawer} />
            <button type="button" className="ibtn ibtn-sm side-theme" onClick={toggle} aria-label={`Zu ${nextTheme} Design wechseln`}
              data-tip={`Zu ${nextTheme} Design`} {...tipProps}>
              <NavIcon name={theme === 'dunkel' ? 'moon' : 'sun'} />
            </button>
          </div>
        </div>
      </nav>
      {drawer ? <div className="side-scrim" aria-hidden="true" onClick={() => setDrawer(false)} /> : null}
      {tip ? (
        <div className="side-tip" role="tooltip" style={{ '--tip-top': `${tip.top}px` } as CSSProperties}>
          {tip.label}
        </div>
      ) : null}

      <div className="main">
        <header className="topbar">
          <button type="button" className="ibtn topbar-menu" onClick={() => setDrawer(true)} aria-label="Navigation öffnen" aria-expanded={drawer}>
            <NavIcon name="menu" size={17} />
          </button>
          <span className="topbar-title">{TITLE[route]}</span>
          {switchable && !phone ? <div className="topbar-switch"><StaffViewSwitch /></div> : null}
          {route !== 'new' ? (
            <Link to="/" className="ibtn topbar-new" aria-label="Neues Gespräch">
              <NavIcon name="compose" size={17} />
            </Link>
          ) : null}
        </header>
        <main id="main" tabIndex={-1} className={`content content-${route}`}>
          {switchable && phone ? <div className="content-switch"><StaffViewSwitch /></div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Seitenhülle. Tagwerk: der Rahmen steht schon (AppGate → TagwerkFrame), die Seite liefert nur ihren Inhalt.
 * Instrument: eigener Rahmen je Seite wie bisher.
 */
export function Shell({ children, mainClassName = '' }: { children: ReactNode; mainClassName?: string }) {
  const { design } = useDesign();
  if (design === 'instrument') return <InstrumentShell mainClassName={mainClassName}>{children}</InstrumentShell>;
  return <>{children}</>;
}
