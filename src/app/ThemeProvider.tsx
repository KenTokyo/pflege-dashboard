import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, resolveTheme, storeTheme, systemTheme, type Theme } from '../lib/theme';
import { DESIGN_KEY, resolveDesign, type Design } from '../lib/design';
import '../instrument/grundlage/tokens.css';

type ThemeContextValue = { theme: Theme; stored: boolean; setTheme: (theme: Theme) => void; toggle: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
type DesignContextValue = { design: Design; setDesign: (design: Design) => void };
const DesignContext = createContext<DesignContextValue | null>(null);

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
  const [design, updateDesign] = useState<Design>(() => {
    try {
      return resolveDesign(storage()?.getItem(DESIGN_KEY));
    } catch {
      return 'tagwerk';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.design = design;
  }, [design]);

  const setDesign = useCallback((next: Design) => {
    const choice = resolveDesign(next);
    try {
      storage()?.setItem(DESIGN_KEY, choice);
    } catch {
      // Gesperrter Speicher: Auswahl bleibt für diese Sitzung erhalten.
    }
    document.documentElement.dataset.design = choice;
    updateDesign(choice);
  }, []);
  const designValue = useMemo(() => ({ design, setDesign }), [design, setDesign]);

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
    () => ({ ...state, setTheme, toggle: () => setTheme(state.theme === 'dunkel' ? 'hell' : 'dunkel') }),
    [state, setTheme],
  );
  return <ThemeContext.Provider value={value}>
    <DesignContext.Provider value={designValue}>{children}</DesignContext.Provider>
  </ThemeContext.Provider>;
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error('ThemeProvider fehlt');
  return ctx;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeProvider fehlt');
  return ctx;
}
