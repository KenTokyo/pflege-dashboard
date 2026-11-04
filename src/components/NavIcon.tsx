import type { ReactNode } from 'react';

/*
 * Eigene Symbole für den Tagwerk-Rahmen: 20er-Raster, feiner Strich, keine Farbplatten (V2: Symbole leiser als Text).
 */
export type NavIconName =
  | 'overview' | 'chat' | 'docs' | 'tasks' | 'settings' | 'sun' | 'moon' | 'collapse' | 'expand' | 'logout' | 'staff'
  | 'care' | 'shield' | 'close' | 'compose' | 'search' | 'person' | 'people' | 'archive' | 'updown' | 'menu' | 'send'
  | 'lock' | 'mic' | 'mic-off' | 'examples' | 'stop' | 'check' | 'back';

const drawings: Record<NavIconName, ReactNode> = {
  overview: <>
    <rect x="3" y="3" width="5.8" height="5.8" rx="1.6" />
    <rect x="11.2" y="3" width="5.8" height="5.8" rx="1.6" />
    <rect x="3" y="11.2" width="5.8" height="5.8" rx="1.6" />
    <rect x="11.2" y="11.2" width="5.8" height="5.8" rx="1.6" />
  </>,
  chat: <>
    <path d="M3 5.2A2.2 2.2 0 0 1 5.2 3h9.6A2.2 2.2 0 0 1 17 5.2v6.6a2.2 2.2 0 0 1-2.2 2.2H9l-4 3.2V14a2 2 0 0 1-2-2z" />
    <path d="M6.5 7.4h7M6.5 10.4h4.2" />
  </>,
  docs: <>
    <path d="M5.2 2.8h6.4l4.6 4.6v8.6a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8V4.6a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M11.6 2.8v3.6a1.2 1.2 0 0 0 1.2 1.2h3.4M6.6 11h6.6M6.6 14h4.4" />
  </>,
  tasks: <>
    <rect x="3" y="3" width="14" height="14" rx="3.2" />
    <path d="m6.6 10.2 2.3 2.3 4.6-5" />
  </>,
  settings: <>
    <path d="M3 6h2.1M9.7 6H17M3 14h7.5M15.1 14H17" />
    <circle cx="7.4" cy="6" r="2.3" />
    <circle cx="12.8" cy="14" r="2.3" />
  </>,
  sun: <>
    <circle cx="10" cy="10" r="3.2" />
    <path d="M10 2.6v1.6M10 15.8v1.6M2.6 10h1.6M15.8 10h1.6M4.8 4.8l1.1 1.1M14.1 14.1l1.1 1.1M4.8 15.2l1.1-1.1M14.1 5.9l1.1-1.1" />
  </>,
  moon: <path d="M16.4 11.8A6.6 6.6 0 0 1 8.2 3.6a6.6 6.6 0 1 0 8.2 8.2Z" />,
  collapse: <>
    <rect x="3" y="3.6" width="14" height="12.8" rx="2.6" />
    <path d="M8 3.6v12.8" />
  </>,
  expand: <>
    <rect x="3" y="3.6" width="14" height="12.8" rx="2.6" />
    <path d="M8 3.6v12.8M11.4 8.2 13.2 10l-1.8 1.8" />
  </>,
  logout: <path d="M8.4 3.4H5.2a1.8 1.8 0 0 0-1.8 1.8v9.6a1.8 1.8 0 0 0 1.8 1.8h3.2M12.6 6.6 16 10l-3.4 3.4M7.6 10H16" />,
  staff: <>
    <rect x="3" y="6" width="14" height="10.6" rx="2.2" />
    <path d="M7.4 6V4.6a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4V6M3 10.6h14" />
  </>,
  care: <path d="M10 16.6s-6.4-3.7-6.4-8.2A3.4 3.4 0 0 1 10 6.2a3.4 3.4 0 0 1 6.4 2.2c0 4.5-6.4 8.2-6.4 8.2Z" />,
  shield: <>
    <path d="M10 2.8 16 5v4.6c0 3.8-2.6 6.4-6 7.6-3.4-1.2-6-3.8-6-7.6V5Z" />
    <path d="M10 7v3.4M10 13.2v.1" />
  </>,
  close: <path d="m5.4 5.4 9.2 9.2M14.6 5.4l-9.2 9.2" />,
  compose: <>
    <path d="M9.4 3.4H5.2a1.8 1.8 0 0 0-1.8 1.8v9.6a1.8 1.8 0 0 0 1.8 1.8h9.6a1.8 1.8 0 0 0 1.8-1.8v-4.2" />
    <path d="M14.6 2.9a1.6 1.6 0 0 1 2.3 2.3L10.6 11.5 7.8 12.2l.7-2.8Z" />
  </>,
  search: <>
    <circle cx="8.8" cy="8.8" r="5.2" />
    <path d="m12.6 12.6 4 4" />
  </>,
  person: <>
    <circle cx="10" cy="7" r="3.2" />
    <path d="M4 16.6c.8-3 3.2-4.6 6-4.6s5.2 1.6 6 4.6" />
  </>,
  people: <>
    <circle cx="7.6" cy="7.2" r="2.8" />
    <path d="M2.8 16.4c.6-2.6 2.6-4 4.8-4s4.2 1.4 4.8 4M12.6 4.6a2.8 2.8 0 0 1 0 5.2M14.4 12.6c1.4.5 2.4 1.7 2.8 3.8" />
  </>,
  archive: <>
    <rect x="2.8" y="3.6" width="14.4" height="3.8" rx="1.2" />
    <path d="M4 7.4v7.4a1.8 1.8 0 0 0 1.8 1.8h8.4a1.8 1.8 0 0 0 1.8-1.8V7.4M8.2 10.6h3.6" />
  </>,
  updown: <path d="m6.6 7.4 3.4-3.4 3.4 3.4M6.6 12.6l3.4 3.4 3.4-3.4" />,
  menu: <path d="M3.4 5.6h13.2M3.4 10h13.2M3.4 14.4h13.2" />,
  send: <>
    <path d="M17 3 8.6 11.4" />
    <path d="M17 3 11.8 17l-3.2-5.6L3 8.2Z" />
  </>,
  lock: <>
    <rect x="4" y="8.6" width="12" height="8.4" rx="2" />
    <path d="M6.8 8.6V6.4a3.2 3.2 0 0 1 6.4 0v2.2" />
  </>,
  mic: <>
    <rect x="7.2" y="2.8" width="5.6" height="9.2" rx="2.8" />
    <path d="M4.6 9.6a5.4 5.4 0 0 0 10.8 0M10 15v2.4" />
  </>,
  'mic-off': <>
    <path d="M12.8 8.8V5.6a2.8 2.8 0 0 0-5.4-1M7.2 7.2v2a2.8 2.8 0 0 0 4.6 2.2M4.6 9.6a5.4 5.4 0 0 0 9 4M15.4 9.6a5.3 5.3 0 0 1-.3 1.7M10 15v2.4M3 3l14 14" />
  </>,
  examples: <>
    <path d="M3 5.2A2.2 2.2 0 0 1 5.2 3h9.6A2.2 2.2 0 0 1 17 5.2v6.6a2.2 2.2 0 0 1-2.2 2.2H9l-4 3.2V14a2 2 0 0 1-2-2z" />
    <path d="M8.2 7.2a1.9 1.9 0 0 1 3.6.8c0 1.2-1.8 1.4-1.8 2.6M10 12.2v.1" />
  </>,
  stop: <rect x="5.6" y="5.6" width="8.8" height="8.8" rx="1.6" />,
  check: <path d="m4.6 10.4 3.4 3.4 7.4-7.6" />,
  back: <path d="M16 10H4.4M9 5.2 4.2 10 9 14.8" />,
};

export function NavIcon({ name, size = 16, className = '' }: { name: NavIconName; size?: number; className?: string }) {
  return (
    <svg className={`nav-icon ${className}`} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {drawings[name]}
    </svg>
  );
}
