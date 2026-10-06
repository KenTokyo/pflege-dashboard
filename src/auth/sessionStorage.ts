/** Session-Tokens werden gespeichert, niemals das Passwort. Jeder Client hat einen eigenen
 * Schreibzugang; nach detach kann ein spätes Ergebnis keine neue Anmeldung überschreiben. */
export function createSessionStorage(projectUrl: string) {
  const base = `pflege-auth-${new URL(projectUrl).hostname}`;
  const memory = new Map<string, string>();
  let attached = true;
  let remembered = false;
  const browser = (persistent: boolean): Storage | null => {
    try { return typeof window === 'undefined' ? null : persistent ? window.localStorage : window.sessionStorage; }
    catch { return null; }
  };
  const read = (persistent: boolean, key: string) => {
    try { const target = browser(persistent); return target ? target.getItem(key) : undefined; } catch { return undefined; }
  };
  const remove = (persistent: boolean, key: string) => {
    try { browser(persistent)?.removeItem(key); } catch { /* Gesperrter Browser-Speicher. */ }
  };
  remembered = read(true, `${base}:remember`) === 'true';
  // Derselbe Schlüssel synchronisiert den SDK-Refresh-Lock über mehrere Tabs.
  const storageKey = `${base}:session`;
  const keys = new Set([`${base}:session`, `${base}:session-user`, `${base}:session-code-verifier`]);
  const storage = {
    getItem(key: string): string | null {
      const target = key;
      keys.add(target);
      if (!attached) return memory.get(target) ?? null;
      const stored = read(remembered, target);
      // null bedeutet echtes Löschen (z.B. Abmeldung im anderen Tab), kein Speicherfehler.
      const value = stored === undefined ? memory.get(target) ?? null : stored;
      if (value !== null) memory.set(target, value);
      else memory.delete(target);
      return value;
    },
    setItem(key: string, value: string): void {
      const target = key;
      keys.add(target);
      memory.set(target, value);
      if (!attached) return;
      try { browser(remembered)?.setItem(target, value); } catch { /* Sitzung bleibt für diesen Tab nutzbar. */ }
    },
    removeItem(key: string): void {
      const target = key;
      memory.delete(target);
      if (!attached) return;
      remove(false, target);
      remove(true, target);
    },
  };
  return {
    storage,
    storageKey,
    isRemembered: () => remembered,
    preferredRemember: () => read(true, `${base}:remember`) !== 'false',
    remember(value: boolean) {
      if (!attached) return;
      for (const key of keys) {
        const stored = read(remembered, key);
        const current = stored === undefined ? memory.get(key) : stored;
        if (current !== undefined && current !== null) memory.set(key, current);
        else memory.delete(key);
        remove(false, key);
        remove(true, key);
      }
      remembered = value;
      try { browser(true)?.setItem(`${base}:remember`, String(value)); } catch { /* Kein Passwort und keine zusätzlichen Daten. */ }
      for (const [key, data] of memory) {
        try { browser(remembered)?.setItem(key, data); } catch { /* Flüchtiger Fallback. */ }
      }
    },
    detach() {
      for (const key of keys) {
        const value = read(remembered, key);
        if (value !== undefined && value !== null) memory.set(key, value);
        remove(false, key);
        remove(true, key);
      }
      attached = false;
    },
  };
}
