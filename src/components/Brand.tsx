/*
 * Eigene Marke: P-Bogen auf ruhiger dunkler Kachel (Radius wie OALabs Logo-Kachel), Punkt im Beerenrot.
 */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false" className="brand-mark flex-none">
      <rect x="0" y="0" width="32" height="32" rx="9" className="brand-tile" />
      <path
        d="M11 25 C 11.2 18.5, 10.8 13, 11.4 8.2 C 15.8 7, 21.6 7.8, 21.4 12.4 C 21.2 16.6, 15.8 17.4, 12 16.6"
        fill="none"
        className="brand-ink"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.4" cy="23.2" r="2.6" className="brand-dot" />
    </svg>
  );
}
