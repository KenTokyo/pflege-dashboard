/** Theme: gespeicherte Nutzerwahl, sonst Systemeinstellung beim ersten Besuch. */
export type Theme = 'dunkel' | 'hell';
export const THEME_KEY = 'pflege-dashboard:theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'dunkel' || value === 'hell';
}

export function readStoredTheme(storage: Pick<Storage, 'getItem'> | null): Theme | null {
  try {
    const value = storage?.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function systemTheme(media: ((query: string) => { matches: boolean }) | undefined): Theme {
  return media?.('(prefers-color-scheme: light)').matches ? 'hell' : 'dunkel';
}

export function resolveTheme(
  storage: Pick<Storage, 'getItem'> | null,
  media: ((query: string) => { matches: boolean }) | undefined,
): { theme: Theme; stored: boolean } {
  const stored = readStoredTheme(storage);
  return stored ? { theme: stored, stored: true } : { theme: systemTheme(media), stored: false };
}

export function storeTheme(storage: Pick<Storage, 'setItem'> | null, theme: Theme): void {
  try {
    storage?.setItem(THEME_KEY, theme);
  } catch {
    // Privater Modus oder gesperrter Speicher: Wahl gilt dann nur für diese Sitzung.
  }
}

export function applyTheme(root: HTMLElement, theme: Theme): void {
  if (root.dataset.theme !== theme) root.dataset.theme = theme;
}
