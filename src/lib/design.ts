/** Geräteweite Designwahl. Der einzige Speicherzugriff liegt im ThemeProvider. */
export type Design = 'tagwerk' | 'instrument';
export const DESIGN_KEY = 'pflege-dashboard:design';

export function isDesign(value: unknown): value is Design {
  return value === 'tagwerk' || value === 'instrument';
}

export function resolveDesign(value: unknown): Design {
  return isDesign(value) ? value : 'tagwerk';
}
