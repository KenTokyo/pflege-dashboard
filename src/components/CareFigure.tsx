import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pflege-Figur des KI-Sachbearbeiters (gezeichnet, Satz A „Pflegefachfrau“, Quelle docs/design/figur/, Kopien
 * unter public/figur/ per tools/figur.mjs). Drei Posen mit derselben Kamera: begrüßt, liest mit (schaut aufs
 * Eingabefeld), denkt nach. Wechsel nur als Überblendung (360 ms), im Leerlauf bewegt sich nichts.
 * Alle drei Bilder liegen übereinander mit fester Größe, damit nichts springt.
 */
export type FigurePose = 'greet' | 'read' | 'think';

export const FIGURE = {
  alt: 'Gezeichnete Pflegefachfrau mit Brille, Begleitfigur des KI-Sachbearbeiters',
  from: 'KI-Sachbearbeiterin · Pflege-Dashboard',
  src: { greet: '/figur/begruessen.webp', read: '/figur/liest-mit.webp', think: '/figur/denkt-nach.webp' },
} as const;

const POSES: readonly FigurePose[] = ['greet', 'read', 'think'];

export function CareFigure({ pose, size = 'lg' }: { pose: FigurePose; size?: 'lg' | 'sm' }) {
  return (
    <div className={`figure figure-${size}`} data-pose={pose} role="img" aria-label={FIGURE.alt}>
      {POSES.map((p) => (
        <img key={p} src={FIGURE.src[p]} alt="" width={352} height={352} decoding="async" draggable={false}
          loading={p === 'greet' ? 'eager' : 'lazy'} data-on={p === pose ? '' : undefined} />
      ))}
    </div>
  );
}

/** „Liest mit“, solange getippt wird; 1,2 s nach dem letzten Tastendruck schaut die Figur wieder her. */
export function useTypingPulse(ms = 1200): [boolean, () => void] {
  const [typing, setTyping] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const pulse = useCallback(() => {
    setTyping(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTyping(false), ms);
  }, [ms]);
  return [typing, pulse];
}

export function figurePose({ thinking, typing }: { thinking: boolean; typing: boolean }): FigurePose {
  return thinking ? 'think' : typing ? 'read' : 'greet';
}
