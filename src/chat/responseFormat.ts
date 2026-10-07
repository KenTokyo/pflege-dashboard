import { useEffect, useState } from 'react';
import type { ResponseFormat } from '../../types/openui';

export type { ResponseFormat } from '../../types/openui';
export const RESPONSE_FORMAT_KEY = 'tagwerk.response-format';

export const isResponseFormat = (value: unknown): value is ResponseFormat => value === 'text' || value === 'openui';

function deviceStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

export function readResponseFormat(storage: Pick<Storage, 'getItem'> | null): ResponseFormat {
  try {
    const value = storage?.getItem(RESPONSE_FORMAT_KEY);
    return isResponseFormat(value) ? value : 'text';
  } catch { return 'text'; }
}

export function storeResponseFormat(storage: Pick<Storage, 'setItem'> | null, value: ResponseFormat): boolean {
  if (!storage) return false;
  try { storage.setItem(RESPONSE_FORMAT_KEY, value); return true; } catch { return false; }
}

/** Only a validated device preference is saved, never chat text or drafts. */
export function useResponseFormat() {
  const [value, setValue] = useState(() => readResponseFormat(deviceStorage()));
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === RESPONSE_FORMAT_KEY || event.key === null) setValue(readResponseFormat(deviceStorage()));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return {
    value, saved,
    setValue: (next: ResponseFormat) => {
      if (!isResponseFormat(next) || next === value) return;
      setSaved(storeResponseFormat(deviceStorage(), next));
      setValue(next);
    },
  };
}
