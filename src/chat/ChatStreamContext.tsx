import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useAuth, useSessionEpoch, useWorkspace } from '../auth/AuthProvider';
import { keys } from '../data/queries';
import { useBackend } from '../services/BackendContext';
import { AppError } from '../services/errors';
import { StreamStore, type PendingTurn } from './streamStore';

const StoreContext = createContext<StreamStore | null>(null);

/**
 * Lebt so lange wie die angemeldete Sitzung (AppGate setzt key = Arbeitsbereich + Generation).
 * Abmeldung bricht alle Streams zusätzlich über registerStream ab.
 */
export function ChatStreamProvider({ children }: { children: ReactNode }) {
  const { chat } = useBackend();
  const { registerStream, signOut } = useAuth();
  const { epoch, isCurrent } = useSessionEpoch();
  const workspaceId = useWorkspace().workspace.id;
  const qc = useQueryClient();
  const [store] = useState(
    () =>
      new StreamStore({
        chat,
        workspaceId,
        registerStream,
        isCurrent,
        onSettled: (conversationId) => {
          if (!isCurrent()) return;
          void qc.invalidateQueries({ queryKey: keys.messages(workspaceId, conversationId) });
          void qc.invalidateQueries({ queryKey: ['ws', workspaceId, 'conversations'] });
        },
        // Nur die eigene Generation abmelden, nie eine inzwischen neue Sitzung.
        onSessionLost: () => signOut('expired', epoch),
      }),
  );

  useEffect(() => {
    store.activate();
    return () => store.scheduleDispose();
  }, [store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStreamStore(): StreamStore {
  const store = useContext(StoreContext);
  if (!store) throw new AppError('INTERNAL_ERROR');
  return store;
}

export function usePendingTurn(conversationId: string): PendingTurn | null {
  const store = useStreamStore();
  return useSyncExternalStore(store.subscribe, () => store.get(conversationId));
}
