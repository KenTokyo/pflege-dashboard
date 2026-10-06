import { createContext, useContext, type ReactNode } from 'react';
import { AppError } from './errors';
import type { Backend } from './types';

const BackendContext = createContext<Backend | null>(null);

/** Produkt: Supabase-Backend. Tests/Harness: synthetischer Testtransport. */
export function BackendProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}

export function useBackend(): Backend {
  const backend = useContext(BackendContext);
  if (!backend) throw new AppError('CONFIG_MISSING');
  return backend;
}
