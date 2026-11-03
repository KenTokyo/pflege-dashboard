import { LayoutGroup, motion } from 'motion/react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useDesign } from '../app/ThemeProvider';
import { SPRING } from '../motion/tokens';

/*
 * Tagwerk-Auswahl statt nativem <select>: Knopf (role combobox) + Glas-Liste in der obersten Ebene (Popover).
 * Tastatur wie beim nativen Feld: Pfeile, Pos1/Ende, Enter/Leertaste, Esc, Tippen springt zum Eintrag.
 * Der Knopf trägt `value`, damit Formulare und Prüfungen den Wert lesen können. Instrument behält das native Feld.
 */
export type SelectOption<T extends string = string> = { value: T; label: string; hint?: string; disabled?: boolean };

type Props<T extends string> = {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  id?: string;
  'aria-label'?: string;
  /** Sichtbare Beschriftung außerhalb (nie ein umschließendes <label>: Klicks in der Liste würden den Knopf erneut auslösen). */
  'aria-labelledby'?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
  size?: 'md' | 'sm';
  icon?: ReactNode;
  /** Kurzform im Knopf, z. B. ohne Pflegegrad. */
  display?: (option: SelectOption<T> | undefined) => ReactNode;
  /** Klasse des nativen Felds im Instrument-Design. */
  nativeClassName?: string;
};

const EXIT_MS = 140;
const POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const optionName = (o: SelectOption) => (o.hint ? `${o.label} · ${o.hint}` : o.label);

export function Select<T extends string>(props: Props<T>) {
  const { design } = useDesign();
  return design === 'instrument' ? <NativeSelect {...props} /> : <ListSelect {...props} />;
}

function NativeSelect<T extends string>({ value, options, onChange, id, disabled, title, nativeClassName, ...rest }: Props<T>) {
  return (
    <select id={id} aria-label={rest['aria-label']} className={nativeClassName} value={value} disabled={disabled} title={title}
      onChange={(e) => { const next = options.find((o) => o.value === e.target.value); if (next && !next.disabled) onChange(next.value); }}>
      {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{optionName(o)}</option>)}
    </select>
  );
}

function Chevron() {
  return (
    <svg className="sel-chev" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />
    </svg>
  );
}

function Tick() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m3.6 8.4 2.9 2.8 5.9-6.4" />
    </svg>
  );
}

function ListSelect<T extends string>({ value, options, onChange, id, disabled = false, title, className = '', size = 'md', icon, display, ...rest }: Props<T>) {
  const autoId = useId();
  const triggerId = id ?? `sel${autoId.replace(/:/g, '')}`;
  const listId = `${triggerId}-liste`;
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const open = phase === 'open';
  const current = options.find((o) => o.value === value);

  const close = useCallback((refocus: boolean) => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i]?.disabled) return i;
    return from;
  };
  const first = () => step(-1, 1);
  const last = () => step(options.length, -1);

  const openList = () => {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === value && !o.disabled);
    setActive(i >= 0 ? i : first());
    setPhase('open');
  };
  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    close(true);
    if (o.value !== value) onChange(o.value);
  };

  useEffect(() => {
    if (phase !== 'closing') return;
    const t = window.setTimeout(() => setPhase((p) => (p === 'closing' ? 'closed' : p)), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Wird das Feld gesperrt (z. B. laufende Antwort), schließt die Liste sofort.
  const [wasDisabled, setWasDisabled] = useState(disabled);
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled);
    if (disabled && phase !== 'closed') setPhase('closed');
  }

  // Lage unter (oder über) dem Knopf, nie aus dem Fenster.
  useLayoutEffect(() => {
    if (!open) return;
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      const width = Math.min(Math.max(r.width, 220), window.innerWidth - 16, 440);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const below = window.innerHeight - r.bottom;
      const want = Math.min(320, options.length * 44 + 12);
      const up = below < want + 12 && r.top > below;
      setPos(up
        ? { left, width, bottom: window.innerHeight - r.top + 6, maxHeight: Math.min(320, r.top - 12), transformOrigin: 'bottom left' }
        : { left, width, top: r.bottom + 6, maxHeight: Math.min(320, below - 12), transformOrigin: 'top left' });
    }
    const el = listRef.current;
    if (el && POPOVER && !el.matches(':popover-open')) el.showPopover();
    el?.focus({ preventScroll: true });
  }, [open, options.length]);

  useEffect(() => {
    if (!open || active < 0) return;
    const el = document.getElementById(`${listId}-${active}`);
    const scroll: unknown = el ? Reflect.get(el, 'scrollIntoView') : undefined; // fehlt in jsdom
    if (typeof scroll === 'function') el?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  useEffect(() => {
    if (!open) return;
    const inside = (t: EventTarget | null) => t instanceof Node && (triggerRef.current?.contains(t) || listRef.current?.contains(t));
    const onDown = (e: PointerEvent) => { if (!inside(e.target)) close(false); };
    const onScroll = (e: Event) => { if (!inside(e.target)) close(false); };
    const onResize = () => close(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((a) => step(a, 1)),
      ArrowUp: () => setActive((a) => step(a, -1)),
      Home: () => setActive(first()),
      End: () => setActive(last()),
      Enter: () => choose(active),
      ' ': () => choose(active),
      Escape: () => close(true),
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      e.stopPropagation();
      run();
      return;
    }
    if (e.key === 'Tab') {
      close(false);
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = performance.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <>
      <button ref={triggerRef} id={triggerId} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open}
        aria-controls={listId} aria-label={rest['aria-label']} aria-labelledby={rest['aria-labelledby']} value={value} disabled={disabled} title={title}
        className={`sel sel-${size} ${className}`} data-open={open || undefined}
        onClick={() => { if (open) close(false); else openList(); }} onKeyDown={onTriggerKey}>
        {icon ? <span className="sel-icon" aria-hidden="true">{icon}</span> : null}
        <span className="sel-value">{display ? display(current) : current?.label ?? ''}</span>
        <Chevron />
      </button>
      {phase !== 'closed' ? (
        <div ref={listRef} id={listId} role="listbox" tabIndex={-1} popover={POPOVER ? 'manual' : undefined}
          aria-label={rest['aria-label']} aria-labelledby={rest['aria-label'] ? undefined : rest['aria-labelledby'] ?? triggerId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="sel-list" data-state={phase} style={pos} onKeyDown={onListKey}>
          <LayoutGroup id={listId}>
            {options.map((o, i) => {
              const selected = o.value === value;
              return (
                <div key={o.value} id={`${listId}-${i}`} role="option" aria-selected={selected} aria-disabled={o.disabled || undefined}
                  aria-label={optionName(o)} data-value={o.value} className="sel-opt" data-active={i === active || undefined}
                  onPointerMove={() => { if (!o.disabled && i !== active) setActive(i); }}
                  onClick={() => choose(i)}>
                  {i === active ? <motion.span layoutId="sel-ink" className="sel-ink" transition={SPRING.snap} aria-hidden="true" /> : null}
                  <span className="sel-tick">{selected ? <Tick /> : null}</span>
                  <span className="sel-opt-text">
                    <span className="sel-opt-label">{o.label}</span>
                    {o.hint ? <span className="sel-opt-hint">{o.hint}</span> : null}
                  </span>
                </div>
              );
            })}
          </LayoutGroup>
        </div>
      ) : null}
    </>
  );
}
