import { Link, useLocation } from '@tanstack/react-router';
import { LayoutGroup, motion } from 'motion/react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { baseName, initials } from '../lib/format';
import { BrandMark } from './Brand';
import { NavIcon, type NavIconName } from './NavIcon';
import { StaffViewSwitch } from '../staff/StaffViewSwitch';
import { useDesign, useRail, useTheme } from '../app/ThemeProvider';
import { InstrumentShell } from '../instrument/rahmen/InstrumentShell';
import { springCss, SPRING } from '../motion/tokens';

type NavItem = { to: string; label: string; icon: NavIconName; hue: string; match: (path: string) => boolean };

const NAV: readonly NavItem[] = [
  { to: '/', label: 'Übersicht', icon: 'overview', hue: 'overview', match: (p) => p === '/' || p === '/sachbearbeitung' },
  { to: '/gespraeche', label: 'Gespräche', icon: 'chat', hue: 'chat', match: (p) => p.startsWith('/gespraeche') },
  { to: '/dokumente', label: 'Dokumente', icon: 'docs', hue: 'docs', match: (p) => p.startsWith('/dokumente') },
  { to: '/aufgaben', label: 'Aufgaben', icon: 'tasks', hue: 'tasks', match: (p) => p.startsWith('/aufgaben') },
  { to: '/einstellungen', label: 'Einstellungen', icon: 'settings', hue: 'settings', match: (p) => p.startsWith('/einstellungen') },
];

const MENU_EXIT_MS = 160;
/** Oberste Ebene nur, wo der Browser sie kann; sonst bleibt das Menü ein normales Element. */
const POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const RAIL_SHIFT = 232 - 64;

/** Kontomenü: liegt in der obersten Ebene (Popover), damit die eingeklappte Leiste es nicht abschneidet. */
function UserMenu({ placement }: { placement: 'rail' | 'down' }) {
  const { signOut } = useAuth();
  const { profile, workspace, role } = useWorkspace();
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = phase === 'open';
  const close = useCallback(() => setPhase((p) => (p === 'open' ? 'closing' : p)), []);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const name = baseName(profile.displayName);
  return (
    <div className={`user-menu user-menu-${placement}`} ref={ref}>
      <button
        type="button"
        className={placement === 'rail' ? 'rail-item user-btn' : 'icon-btn user-btn'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Konto: ${name}`}
        title="Konto und Abmelden"
        onClick={() => setPhase((p) => (p === 'open' ? 'closing' : 'open'))}
      >
        <span className="avatar" aria-hidden="true">{initials(profile.displayName)}</span>
        {placement === 'rail' ? (
          <span className="rail-label rail-user">
            <strong>{name}</strong>
            <small>{role === 'admin' ? 'Verwaltung' : 'Mitglied'}</small>
          </span>
        ) : null}
      </button>
      {phase !== 'closed' ? (
        <div ref={menuRef} popover={POPOVER ? 'manual' : undefined} className={`menu menu-${placement}`} data-state={phase} role="menu" id={menuId}>
          <div className="menu-head">
            <strong>{name}</strong>
            <span className="muted">
              {workspace.name} · {role === 'admin' ? 'Verwaltung' : 'Mitglied'}
            </span>
          </div>
          <Link to="/sachbearbeitung" role="menuitem" className="menu-item" onClick={close}>
            <NavIcon name="staff" size={18} />
            Sachbearbeiter-Test
          </Link>
          <Link to="/" role="menuitem" className="menu-item" onClick={close}>
            <NavIcon name="care" size={18} />
            Kundenansicht
          </Link>
          <div className="menu-sep" role="separator" />
          <button type="button" role="menuitem" className="menu-item" onClick={() => signOut('manual')}>
            <NavIcon name="logout" size={18} />
            Abmelden
          </button>
        </div>
      ) : null}
    </div>
  );
}

type TipProps = { onPointerEnter: (e: { currentTarget: HTMLElement }) => void; onPointerLeave: () => void; onFocus: (e: { currentTarget: HTMLElement }) => void; onBlur: () => void };

function ThemeRow(tipProps: TipProps) {
  const { theme, toggle } = useTheme();
  const next = theme === 'dunkel' ? 'helles' : 'dunkles';
  return (
    <button type="button" className="rail-item" onClick={toggle} aria-label={`Zu ${next} Design wechseln`} data-tip={`Zu ${next} Design`} {...tipProps}>
      <NavIcon name={theme === 'dunkel' ? 'moon' : 'sun'} className="rail-icon" />
      <span className="rail-label">{theme === 'dunkel' ? 'Dunkel' : 'Hell'}</span>
    </button>
  );
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dunkel' ? 'helles' : 'dunkles';
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Zu ${next} Design wechseln`} title={`Zu ${next} Design wechseln`}>
      <NavIcon name={theme === 'dunkel' ? 'moon' : 'sun'} size={19} />
    </button>
  );
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Tagwerk-Rahmen: bleibt beim Seitenwechsel stehen (hängt in AppGate), nur der Inhalt fährt
 * (View Transition `tg-page`, src/motion/motion.css). Seitenleiste auf/zu per Knopf oder Taste „[“.
 */
export function TagwerkFrame({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace();
  const { railOpen, toggleRail } = useRail();
  const pathname = useLocation({ select: (location) => location.pathname });
  const mainRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      e.preventDefault();
      toggleRail();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleRail]);

  // Die Spalte springt sofort um; der Inhalt fährt per transform nach (FLIP), damit nichts ruckt.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setTip(null);
    const main = mainRef.current;
    if (!main || typeof main.animate !== 'function' || !railRef.current?.offsetParent) return;
    const { easing, ms } = springCss(SPRING.soft);
    const supports = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('transition-timing-function', 'linear(0, 1)');
    main.animate([{ translate: `${railOpen ? -RAIL_SHIFT : RAIL_SHIFT}px 0` }, { translate: '0 0' }], {
      duration: supports ? ms : 520,
      easing: supports ? easing : 'cubic-bezier(0.16, 1, 0.3, 1)',
    });
  }, [railOpen]);

  const showTip = (e: { currentTarget: HTMLElement }) => {
    if (railOpen) return;
    const el = e.currentTarget;
    const label = el.dataset.tip ?? el.getAttribute('aria-label') ?? el.textContent;
    const r = el.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2 });
  };
  const hideTip = () => setTip(null);
  const tipProps: TipProps = { onPointerEnter: showTip, onPointerLeave: hideTip, onFocus: showTip, onBlur: hideTip };

  const mainClassName = pathname.startsWith('/gespraeche') ? 'is-chat' : pathname === '/sachbearbeitung' ? 'staff-main' : '';

  return (
    <div className="shell" data-rail={railOpen ? 'auf' : 'zu'}>
      <nav className="rail" aria-label="Hauptnavigation" ref={railRef}>
        <div className="rail-inner">
          <Link to="/" className="rail-brand" aria-label="Pflege-Dashboard, Übersicht" data-mo-press="none">
            <BrandMark size={28} />
            <span className="rail-label rail-brand-text">
              <strong>Pflege-Dashboard</strong>
              <small>{workspace.name}</small>
            </span>
          </Link>

          <span className="rail-group rail-label" aria-hidden="true">Arbeitsbereich</span>
          <LayoutGroup id="tg-rail">
            <div className="rail-nav">
              {NAV.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link key={item.to} to={item.to} className="rail-item" data-hue={item.hue} data-tip={item.label}
                    aria-current={active ? 'page' : undefined} {...tipProps}>
                    {active ? <motion.span layoutId="tg-rail-ink" className="rail-ink" transition={SPRING.elastic} aria-hidden="true" /> : null}
                    <NavIcon name={item.icon} className="rail-icon" />
                    <span className="rail-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="rail-foot">
            <ThemeRow {...tipProps} />
            <button type="button" className="rail-item" onClick={toggleRail} aria-expanded={railOpen}
              aria-label={railOpen ? 'Seitenleiste einklappen' : 'Seitenleiste aufklappen'} data-tip="Aufklappen [" {...tipProps}>
              <NavIcon name={railOpen ? 'collapse' : 'expand'} className="rail-icon" />
              <span className="rail-label">Einklappen</span>
              <kbd className="rail-label rail-kbd">[</kbd>
            </button>
            <UserMenu placement="rail" />
          </div>
        </div>
      </nav>
      {tip ? (
        <div className="rail-tip" role="tooltip" style={{ '--tip-top': `${tip.top}px` } as CSSProperties}>
          {tip.label}
        </div>
      ) : null}

      <header className="topbar">
        <Link to="/" className="topbar-brand" aria-label="Pflege-Dashboard, Übersicht">
          <BrandMark size={28} />
          <span className="min-w-0">
            <span className="block leading-tight">Pflege-Dashboard</span>
            <span className="block text-[13px] font-normal muted leading-tight truncate">{workspace.name}</span>
          </span>
        </Link>
        <div className="topbar-actions">
          <Link to="/einstellungen" className="icon-btn" aria-label="Einstellungen" title="Einstellungen" activeProps={{ 'aria-current': 'page' }}>
            <NavIcon name="settings" size={19} />
          </Link>
          <ThemeButton />
          <UserMenu placement="down" />
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className={`main ${mainClassName}`}>
        {pathname === '/' || pathname === '/sachbearbeitung' ? <StaffViewSwitch /> : null}
        {children}
      </main>

      <LayoutGroup id="tg-bottom">
        <nav className="bottomnav" aria-label="Hauptnavigation mobil">
          {NAV.filter((n) => n.to !== '/einstellungen').map((item) => {
            const active = item.match(pathname);
            return (
              <Link key={item.to} to={item.to} data-hue={item.hue} aria-current={active ? 'page' : undefined}>
                {active ? <motion.span layoutId="tg-bottom-ink" className="bottom-ink" transition={SPRING.elastic} aria-hidden="true" /> : null}
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>
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
