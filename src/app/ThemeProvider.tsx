import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, resolveTheme, storeTheme, systemTheme, type Theme } from '../lib/theme';
import { readDesign, storeDesign, type Design } from '../lib/design';

type ThemeContextValue = { theme: Theme; stored: boolean; setTheme: (theme: Theme) => void; toggle: () => void; design: Design; setDesign: (design: Design) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

const storage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const media = (q: string) => window.matchMedia(q);

/** Erster Besuch folgt dem System (auch bei Wechsel), nach eigener Wahl gilt die gespeicherte Wahl. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => resolveTheme(storage(), typeof window.matchMedia === 'function' ? media : undefined));
  const [design, setDesignState] = useState(() => readDesign(storage()));

  useLayoutEffect(() => {
    document.documentElement.dataset.design = design;
  }, [design]);

  const setDesign = useCallback((next: Design) => {
    storeDesign(storage(), next);
    setDesignState(next);
  }, []);

  useEffect(() => {
    applyTheme(document.documentElement, state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (state.stored || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setState({ theme: systemTheme(media), stored: false });
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [state.stored]);

  const setTheme = useCallback((theme: Theme) => {
    storeTheme(storage(), theme);
    setState({ theme, stored: true });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ ...state, setTheme, toggle: () => setTheme(state.theme === 'dunkel' ? 'hell' : 'dunkel'), design, setDesign }),
    [state, setTheme, design, setDesign],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeProvider fehlt');
  return ctx;
}
