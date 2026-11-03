import { useSyncExternalStore } from 'react';

/*
 * Offen/zu des Demo-Hinweises. Bewusst nur im Speicher: Nach jedem Neuladen erscheint der Hinweis wieder
 * (Pflicht aus den Anforderungen), geschlossen bleibt er nur bis dahin. Die Seitenleiste kann ihn erneut öffnen.
 */
let open = true;
const listeners = new Set<() => void>();

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const read = () => open;

export function setDemoNoticeOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((fn) => { fn(); });
}

export function useDemoNoticeOpen() {
  return useSyncExternalStore(subscribe, read, read);
}
