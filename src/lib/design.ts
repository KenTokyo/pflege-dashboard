export type Design = 'tagwerk' | 'instrument';
export const DESIGN_KEY = 'pflege-dashboard:design';

export function readDesign(storage: Pick<Storage, 'getItem'> | null): Design {
  try {
    return storage?.getItem(DESIGN_KEY) === 'instrument' ? 'instrument' : 'tagwerk';
  } catch {
    return 'tagwerk';
  }
}

export function storeDesign(storage: Pick<Storage, 'setItem'> | null, design: Design): void {
  try {
    storage?.setItem(DESIGN_KEY, design);
  } catch {
    // Die Wahl bleibt bei gesperrtem Speicher für die laufende Sitzung erhalten.
  }
}
