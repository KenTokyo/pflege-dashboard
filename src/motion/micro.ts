/**
 * Mikrointeraktionen für jeden Knopf, Link und jede Karte in Tagwerk – ein Hörer am Dokument
 * (Vorlage `shardfall/src/ui/motion/micro.ts`, ohne Klang):
 *   Hover hebt um 2 px an (Feder soft), Drücken staucht (große Flächen weniger), Loslassen federt über (pop).
 * Web Animations auf `translate`/`scale` legen sich über vorhandene `transform`s. Kein Layout, keine Schleife.
 * Abmelden: `data-mo-press="none"` am Element, `data-mo-micro="off"` am Bereich. Instrument bleibt unberührt.
 */
import { springCss, SPRING } from './tokens';

const INTERACTIVE = 'button, [role="button"], [role="tab"], [role="menuitem"], a[href], summary, .mo-hover';
const LIFT = 'button, [role="button"], [role="tab"], a[href], summary, .mo-hover';

type Live = { hover?: Animation; press?: Animation };
const live = new WeakMap<HTMLElement, Live>();
let current: HTMLElement | null = null;
let pressed: HTMLElement | null = null;
let popEasing = 'cubic-bezier(0.2, 1.4, 0.4, 1)';
let popMs = 420;
let softEasing = 'cubic-bezier(0.16, 1, 0.3, 1)';
let softMs = 320;

const active = () => document.documentElement.dataset.design !== 'instrument';

function targetOf(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  const el = node.closest(INTERACTIVE);
  if (!(el instanceof HTMLElement) || el.closest('[data-mo-micro="off"]') || el.dataset.moPress === 'none') return null;
  return el;
}

const disabled = (el: HTMLElement) => (el instanceof HTMLButtonElement && el.disabled) || el.getAttribute('aria-disabled') === 'true';

function lift(el: HTMLElement, on: boolean): void {
  if (typeof el.animate !== 'function' || !el.matches(LIFT)) return;
  const m = live.get(el) ?? {};
  const from = getComputedStyle(el).translate;
  m.hover?.cancel();
  m.hover = el.animate([{ translate: from === 'none' ? '0 0' : from }, { translate: on ? '0 -2px' : '0 0' }], {
    duration: on ? softMs : popMs,
    easing: on ? softEasing : popEasing,
    fill: 'forwards',
  });
  if (!on) m.hover.onfinish = () => m.hover?.cancel();
  live.set(el, m);
}

function press(el: HTMLElement, down: boolean): void {
  if (typeof el.animate !== 'function') return;
  const r = el.getBoundingClientRect();
  const depth = 1 - Math.min(0.06, 7 / Math.max(48, r.width, r.height));
  const m = live.get(el) ?? {};
  m.press?.cancel();
  m.press = down
    ? el.animate([{ scale: '1' }, { scale: `${depth}` }], { duration: 90, easing: 'cubic-bezier(0.3, 0, 0.6, 1)', fill: 'forwards' })
    : el.animate([{ scale: `${depth}` }, { scale: '1' }], { duration: popMs, easing: popEasing, fill: 'forwards' });
  if (!down) m.press.onfinish = () => m.press?.cancel();
  live.set(el, m);
}

function onOver(e: PointerEvent): void {
  if ((e.pointerType && e.pointerType !== 'mouse') || !active()) return;
  const el = targetOf(e.target);
  if (el === current) return;
  if (current) lift(current, false);
  current = el;
  if (el && !disabled(el)) lift(el, true);
}

function onOut(e: PointerEvent): void {
  if (!current) return;
  const to = e.relatedTarget instanceof Node ? e.relatedTarget : null;
  if (to && current.contains(to)) return;
  lift(current, false);
  current = null;
}

function onDown(e: PointerEvent): void {
  if (e.button !== 0 || !active()) return;
  const el = targetOf(e.target);
  if (!el || disabled(el)) return;
  pressed = el;
  press(el, true);
}

function onUp(): void {
  if (!pressed) return;
  press(pressed, false);
  pressed = null;
}

/** Hängt die Mikrointeraktionen an das Dokument; die Rückgabe nimmt sie wieder ab. */
export function attachMicroInteractions(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('transition-timing-function', 'linear(0, 1)')) {
    const pop = springCss(SPRING.pop);
    const soft = springCss(SPRING.soft);
    popEasing = pop.easing;
    popMs = pop.ms;
    softEasing = soft.easing;
    softMs = Math.min(420, soft.ms);
  }
  document.addEventListener('pointerover', onOver, true);
  document.addEventListener('pointerout', onOut, true);
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('pointerup', onUp, true);
  document.addEventListener('pointercancel', onUp, true);
  return () => {
    document.removeEventListener('pointerover', onOver, true);
    document.removeEventListener('pointerout', onOut, true);
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('pointerup', onUp, true);
    document.removeEventListener('pointercancel', onUp, true);
    current = null;
    pressed = null;
  };
}
