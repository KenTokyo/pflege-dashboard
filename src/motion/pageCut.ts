/**
 * Seitenwechsel in Tagwerk als Kamerafahrt (View Transitions, Werte aus `shardfall/src/ui/motion/transitions.tsx`).
 * Die Richtung kommt aus der Reihenfolge der Navigation: ein Ziel weiter unten kommt von rechts.
 * Innerhalb eines Bereichs (anderes Gespräch) und in Instrument gibt es keine Fahrt.
 */
const ORDER = ['/', '/sachbearbeitung', '/gespraeche', '/dokumente', '/aufgaben', '/einstellungen'] as const;

export function sectionIndex(pathname: string): number {
  if (pathname === '/' || pathname === '') return 0;
  return ORDER.findIndex((p, i) => i > 0 && (pathname === p || pathname.startsWith(`${p}/`)));
}

export function pageCutTypes({ fromLocation, toLocation, pathChanged }: {
  fromLocation?: { pathname: string };
  toLocation: { pathname: string };
  pathChanged: boolean;
}): string[] | false {
  if (!pathChanged || !fromLocation || typeof document === 'undefined') return false;
  if (document.documentElement.dataset.design === 'instrument') return false;
  const from = sectionIndex(fromLocation.pathname);
  const to = sectionIndex(toLocation.pathname);
  if (from < 0 || to < 0 || from === to) return false;
  return [to > from ? 'cut-forward' : 'cut-back'];
}
