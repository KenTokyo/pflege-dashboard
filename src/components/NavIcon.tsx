import type { ReactNode } from 'react';

/*
 * Eigene Symbole für den Tagwerk-Rahmen (statt Lucide): 20er-Raster, Strich 1,7, je eine leise Farbplatte
 * (currentColor 18 %), damit die Bereichsfarbe als Fläche im Symbol sitzt und nie als Kartenfläche.
 */
export type NavIconName = 'overview' | 'chat' | 'docs' | 'tasks' | 'settings' | 'sun' | 'moon' | 'collapse' | 'expand' | 'logout' | 'staff' | 'care';

const PLATE = { fill: 'currentColor', fillOpacity: 0.18, stroke: 'none' } as const;

const drawings: Record<NavIconName, ReactNode> = {
  overview: <>
    <rect x="11" y="2.8" width="6.2" height="6.2" rx="1.8" {...PLATE} />
    <rect x="2.8" y="2.8" width="6.2" height="6.2" rx="1.8" />
    <rect x="11" y="2.8" width="6.2" height="6.2" rx="1.8" />
    <rect x="2.8" y="11" width="6.2" height="6.2" rx="1.8" />
    <rect x="11" y="11" width="6.2" height="6.2" rx="1.8" />
  </>,
  chat: <>
    <path d="M3 5.2A2.2 2.2 0 0 1 5.2 3h9.6A2.2 2.2 0 0 1 17 5.2v6.6a2.2 2.2 0 0 1-2.2 2.2H9l-4 3.2V14h0a2 2 0 0 1-2-2z" {...PLATE} />
    <path d="M3 5.2A2.2 2.2 0 0 1 5.2 3h9.6A2.2 2.2 0 0 1 17 5.2v6.6a2.2 2.2 0 0 1-2.2 2.2H9l-4 3.2V14a2 2 0 0 1-2-2z" />
    <path d="M6.5 7.4h7M6.5 10.4h4.2" />
  </>,
  docs: <>
    <path d="M11.6 2.8v3.6a1.2 1.2 0 0 0 1.2 1.2h3.4" {...PLATE} />
    <path d="M5.2 2.8h6.4l4.6 4.6v8.6a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8V4.6a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M11.6 2.8v3.6a1.2 1.2 0 0 0 1.2 1.2h3.4M6.6 11h6.6M6.6 14h4.4" />
  </>,
  tasks: <>
    <rect x="2.8" y="2.8" width="14.4" height="14.4" rx="3.4" {...PLATE} />
    <rect x="2.8" y="2.8" width="14.4" height="14.4" rx="3.4" />
    <path d="m6.4 10.2 2.4 2.4 4.8-5.2" />
  </>,
  settings: <>
    <path d="M3 6h14M3 14h14" />
    <circle cx="7.4" cy="6" r="2.3" fill="var(--surface)" />
    <circle cx="7.4" cy="6" r="2.3" {...PLATE} />
    <circle cx="7.4" cy="6" r="2.3" />
    <circle cx="12.8" cy="14" r="2.3" fill="var(--surface)" />
    <circle cx="12.8" cy="14" r="2.3" />
  </>,
  sun: <>
    <circle cx="10" cy="10" r="3.4" {...PLATE} />
    <circle cx="10" cy="10" r="3.4" />
    <path d="M10 2.4v1.6M10 16v1.6M2.4 10H4M16 10h1.6M4.6 4.6l1.1 1.1M14.3 14.3l1.1 1.1M4.6 15.4l1.1-1.1M14.3 5.7l1.1-1.1" />
  </>,
  moon: <>
    <path d="M16.6 11.8A6.8 6.8 0 0 1 8.2 3.4a6.8 6.8 0 1 0 8.4 8.4Z" {...PLATE} />
    <path d="M16.6 11.8A6.8 6.8 0 0 1 8.2 3.4a6.8 6.8 0 1 0 8.4 8.4Z" />
  </>,
  collapse: <>
    <rect x="2.8" y="3.4" width="5" height="13.2" rx="1.4" {...PLATE} />
    <rect x="2.8" y="3.4" width="14.4" height="13.2" rx="2.6" />
    <path d="M7.8 3.4v13.2M13.6 8l-2 2 2 2" />
  </>,
  expand: <>
    <rect x="2.8" y="3.4" width="5" height="13.2" rx="1.4" {...PLATE} />
    <rect x="2.8" y="3.4" width="14.4" height="13.2" rx="2.6" />
    <path d="M7.8 3.4v13.2M11.6 8l2 2-2 2" />
  </>,
  logout: <path d="M8.4 3.4H5.2a1.8 1.8 0 0 0-1.8 1.8v9.6a1.8 1.8 0 0 0 1.8 1.8h3.2M12.6 6.6 16 10l-3.4 3.4M7.6 10H16" />,
  staff: <>
    <rect x="2.8" y="6" width="14.4" height="10.6" rx="2.2" {...PLATE} />
    <rect x="2.8" y="6" width="14.4" height="10.6" rx="2.2" />
    <path d="M7.4 6V4.6a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4V6M2.8 10.6h14.4" />
  </>,
  care: <>
    <path d="M10 16.6s-6.4-3.7-6.4-8.2A3.4 3.4 0 0 1 10 6.2a3.4 3.4 0 0 1 6.4 2.2c0 4.5-6.4 8.2-6.4 8.2Z" {...PLATE} />
    <path d="M10 16.6s-6.4-3.7-6.4-8.2A3.4 3.4 0 0 1 10 6.2a3.4 3.4 0 0 1 6.4 2.2c0 4.5-6.4 8.2-6.4 8.2Z" />
  </>,
};

export function NavIcon({ name, size = 20, className = '' }: { name: NavIconName; size?: number; className?: string }) {
  return (
    <svg className={`nav-icon ${className}`} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {drawings[name]}
    </svg>
  );
}
