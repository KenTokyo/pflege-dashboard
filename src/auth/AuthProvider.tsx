import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppError, toAppError } from '../services/errors';
import type { AuthSession, Backend, WorkspaceContext } from '../services/types';
import { useBackend } from '../services/BackendContext';
import { ActivityTracker, browserClock, type Clock } from './activity';
import { clearDraftHandoff } from '../chat/draftHandoff';

export const IDLE_MS = 15 * 60 * 1000;
export const TOUCH_INTERVAL_MS = 60 * 1000;
/** Obergrenzen für den Server-Widerruf nach der (bereits erfolgten) lokalen Abmeldung. */
export const END_TIMEOUT_MS = 4000;
export const REVOKE_TIMEOUT_MS = 4000;

export type SignOutReason = 'manual' | 'idle' | 'expired' | 'timebox' | 'forbidden';

export type ServerSession =
  | { state: 'pending' }
  | { state: 'active'; expiresAt: string; idleExpiresAt: string }
  | { state: 'unavailable'; error: AppError };

/**
 * `epoch` ist die Generation der angemeldeten Sitzung. Jede Abmeldung, Neuanmeldung und das Aushängen
 * erhöhen sie. Späte Ergebnisse älterer Generationen werden verworfen (siehe isCurrentSession).
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; reason: SignOutReason | null }
  | { status: 'noAccess'; session: AuthSession }
  | { status: 'error'; session: AuthSession; error: AppError }
  | { status: 'signedIn'; session: AuthSession; workspace: WorkspaceContext; epoch: number };

type AuthContextValue = {
  state: AuthState;
  serverSession: ServerSession;
  signIn: (email: string, password: string) => Promise<void>;
  /** Lokal sofort und vollständig. Mit `epoch` nur, wenn diese Generation noch aktuell ist. */
  signOut: (reason?: SignOutReason, epoch?: number) => void;
  retryWorkspace: () => void;
  /** Laufende Streams melden sich an, damit Abmeldung sie sicher abbricht. */
  registerStream: (controller: AbortController) => () => void;
  /** Gehört ein spätes Ergebnis noch zur aktuellen Sitzung? */
  isCurrentSession: (epoch: number) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const FATAL_SESSION = new Set(['SESSION_EXPIRED', 'AUTH_REQUIRED', 'WORKSPACE_FORBIDDEN']);
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** Wartet höchstens `ms`; bricht über `controller` die zugrunde liegende Anfrage ab. */
export function bounded(run: (signal: AbortSignal) => Promise<unknown>, ms: number): Promise<void> {
  const controller = new AbortController();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      controller.abort();
      resolve();
    }, ms);
    let pending: Promise<unknown>;
    try {
      pending = run(controller.signal);
    } catch {
      pending = Promise.resolve();
    }
    pending
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer);
        resolve();
      });
  });
}

export function AuthProvider({ children, clock = browserClock }: { children: ReactNode; clock?: Clock }) {
  const backend: Backend = useBackend();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [serverSession, setServerSession] = useState<ServerSession>({ state: 'pending' });
  const streams = useRef(new Set<AbortController>());
  const epoch = useRef(0);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const isCurrentSession = useCallback((e: number) => e === epoch.current, []);

  /** Zustand nur setzen, wenn die Generation noch gilt (späte Ergebnisse verwerfen). */
  const commit = useCallback((e: number, next: AuthState) => {
    if (e !== epoch.current) return false;
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  const loadWorkspace = useCallback(
    async (session: AuthSession, e: number) => {
      try {
        const workspace = await backend.data.loadWorkspace(session.userId);
        commit(e, workspace ? { status: 'signedIn', session, workspace, epoch: e } : { status: 'noAccess', session });
      } catch (error) {
        commit(e, { status: 'error', session, error: toAppError(error) });
      }
    },
    [backend, commit],
  );

  /**
   * Abmeldung. Lokal synchron und garantiert: Generation ungültig, Streams abgebrochen, Token-Client
   * abgetrennt, Abfragen und Entwürfe gelöscht, Zustand abgemeldet. Erst danach ein zeitlich begrenzter
   * Server-Widerruf, der keinen App-Zustand mehr berührt.
   */
  const endSession = useCallback(
    (reason: SignOutReason, onlyEpoch?: number) => {
      if (onlyEpoch !== undefined && onlyEpoch !== epoch.current) return;
      const before = stateRef.current;
      epoch.current += 1;
      for (const controller of streams.current) controller.abort();
      streams.current.clear();
      const detached = backend.auth.detach();
      void queryClient.cancelQueries();
      queryClient.clear();
      clearDraftHandoff();
      const next: AuthState = { status: 'signedOut', reason: before.status === 'signedOut' ? before.reason : reason };
      stateRef.current = next;
      setState(next);
      setServerSession({ state: 'pending' });

      const workspaceId = before.status === 'signedIn' ? before.workspace.workspace.id : null;
      const endOnServer = workspaceId !== null && reason !== 'expired' && reason !== 'forbidden';
      void (async () => {
        if (endOnServer) await bounded((signal) => backend.session.end(workspaceId, { via: detached, signal }), END_TIMEOUT_MS);
        await bounded(() => detached.revoke(), REVOKE_TIMEOUT_MS);
      })();
    },
    [backend, queryClient],
  );

  // Start: Sitzung liegt nur im Speicher, nach einem Neuladen also normalerweise keine.
  useEffect(() => {
    const e = epoch.current;
    void backend.auth.getSession().then(
      (session) => {
        if (session) void loadWorkspace(session, e);
        else commit(e, { status: 'signedOut', reason: null });
      },
      () => commit(e, { status: 'signedOut', reason: null }),
    );
    const off = backend.auth.onChange((session, change) => {
      if (change === 'signed_out' && session === null) {
        const s = stateRef.current.status;
        if (s === 'signedIn' || s === 'noAccess' || s === 'error') endSession('expired');
      }
    });
    const live = streams.current;
    return () => {
      // Aushängen: alle offenen Ergebnisse ungültig machen und Streams beenden.
      epoch.current += 1;
      for (const controller of live) controller.abort();
      live.clear();
      off();
    };
  }, [backend, loadWorkspace, endSession, commit]);

  // Aktivität und Server-Sitzung nur im angemeldeten Zustand und nur für diese Generation.
  const signedInEpoch = state.status === 'signedIn' ? state.epoch : null;
  const workspaceId = state.status === 'signedIn' ? state.workspace.workspace.id : null;
  useEffect(() => {
    if (!workspaceId || signedInEpoch === null) return;
    const e = signedInEpoch;
    const tracker = new ActivityTracker({
      idleMs: IDLE_MS,
      touchIntervalMs: TOUCH_INTERVAL_MS,
      clock,
      touch: async () => {
        try {
          const result = await backend.session.touch(workspaceId);
          if (!isCurrentSession(e)) return null;
          setServerSession({ state: 'active', expiresAt: result.expiresAt, idleExpiresAt: result.idleExpiresAt });
          const timebox = Date.parse(result.expiresAt);
          return Number.isFinite(timebox) ? timebox : null;
        } catch (error) {
          if (!isCurrentSession(e)) return null;
          const appError = toAppError(error);
          if (FATAL_SESSION.has(appError.code)) endSession(appError.code === 'WORKSPACE_FORBIDDEN' ? 'forbidden' : 'expired', e);
          else setServerSession({ state: 'unavailable', error: appError });
          return null;
        }
      },
      onIdle: () => endSession('idle', e),
      onTimebox: () => endSession('timebox', e),
    });
    const onActivity = () => tracker.interaction();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tracker.checkNow();
    };
    for (const name of ACTIVITY_EVENTS) document.addEventListener(name, onActivity, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    tracker.start();
    return () => {
      tracker.stop();
      for (const name of ACTIVITY_EVENTS) document.removeEventListener(name, onActivity, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [workspaceId, signedInEpoch, backend, clock, endSession, isCurrentSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      // Neue Generation: ältere, noch laufende Anmelde-/Ladevorgänge zählen nicht mehr.
      const e = ++epoch.current;
      const session = await backend.auth.signIn(email, password);
      if (!isCurrentSession(e)) throw new AppError('AUTH_REQUIRED');
      await loadWorkspace(session, e);
    },
    [backend, loadWorkspace, isCurrentSession],
  );

  // Stabile Funktionen: Verbraucher (z. B. der Stream-Store) dürfen nicht bei jeder Zustandsänderung neu entstehen.
  const signOut = useCallback((reason: SignOutReason = 'manual', e?: number) => endSession(reason, e), [endSession]);
  const registerStream = useCallback((controller: AbortController) => {
    streams.current.add(controller);
    return () => {
      streams.current.delete(controller);
    };
  }, []);
  const retryWorkspace = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'error') return;
    const e = ++epoch.current;
    commit(e, { status: 'loading' });
    void loadWorkspace(s.session, e);
  }, [loadWorkspace, commit]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, serverSession, signIn, signOut, retryWorkspace, registerStream, isCurrentSession }),
    [state, serverSession, signIn, signOut, retryWorkspace, registerStream, isCurrentSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new AppError('AUTH_REQUIRED');
  return ctx;
}

/**
 * Generation der angemeldeten Sitzung für späte Ergebnisse (Schreibaktionen, Übergaben, Streams).
 * Nur innerhalb geschützter Routen verwenden.
 */
export function useSessionEpoch(): { epoch: number; isCurrent: () => boolean } {
  const { state, isCurrentSession } = useAuth();
  if (state.status !== 'signedIn') throw new AppError('AUTH_REQUIRED');
  const { epoch } = state;
  return { epoch, isCurrent: () => isCurrentSession(epoch) };
}

/** Nur innerhalb geschützter Routen verwenden. */
export function useWorkspace(): WorkspaceContext {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new AppError('AUTH_REQUIRED');
  return state.workspace;
}
