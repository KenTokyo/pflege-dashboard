import { Navigate, Outlet, useLocation } from '@tanstack/react-router';
import { LogOut, ShieldOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { safeReturnPath } from '../app/returnPath';
import { useAuth } from '../auth/AuthProvider';
import { ChatStreamProvider } from '../chat/ChatStreamContext';
import { DemoBanner } from '../components/DemoBanner';
import { BrandMark } from '../components/Brand';
import { ErrorState, Loading } from '../components/States';

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card w-full max-w-[460px]" style={{ padding: 24 }}>
        <div className="mb-4 flex items-center gap-2.5">
          <BrandMark size={32} />
          <span className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Pflege-Dashboard
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Umleitung zur Anmeldung. Das Rücksprungziel wird beim Einhängen festgehalten,
 *  denn während der Umleitung zeigt der Ort bereits /anmelden. */
function ToLogin({ from }: { from: string }) {
  const [weiter] = useState(() => safeReturnPath(from));
  return <Navigate to="/anmelden" search={weiter ? { weiter } : {}} replace />;
}

/** Geschützter Bereich: nur mit Anmeldung und aktiver Mitgliedschaft im Arbeitsbereich. */
export function AppGate() {
  const { state, signOut, retryWorkspace } = useAuth();
  const pathname = useLocation({ select: (l) => l.pathname });

  if (state.status === 'signedOut') return <ToLogin from={pathname} />;

  if (state.status === 'loading') {
    return (
      <>
        <DemoBanner />
        <Centered>
          <Loading label="Arbeitsbereich wird geladen …" />
        </Centered>
      </>
    );
  }

  if (state.status === 'noAccess' || state.status === 'error') {
    return (
      <>
        <DemoBanner />
        <Centered>
          {state.status === 'noAccess' ? (
            <div className="alert alert-warn" role="alert">
              <ShieldOff className="i" size={18} aria-hidden="true" />
              <div>
                <strong>Kein Zugang zu einem Arbeitsbereich</strong>
                <span>
                  Ihre Anmeldung ist gültig, aber für dieses Konto ist keine aktive Mitgliedschaft eingetragen. Bitte wenden Sie sich an
                  die Verwaltung.
                </span>
              </div>
            </div>
          ) : (
            <ErrorState error={state.error} title="Arbeitsbereich konnte nicht geladen werden" onRetry={retryWorkspace} />
          )}
          <button type="button" className="btn btn-secondary mt-4" onClick={() => signOut('manual')}>
            <LogOut className="i" size={17} aria-hidden="true" />
            Abmelden
          </button>
        </Centered>
      </>
    );
  }

  return (
    <>
      {state.workspace.workspace.demoBanner ? <DemoBanner /> : null}
      <ChatStreamProvider key={`${state.workspace.workspace.id}:${state.epoch}`}>
        <Outlet />
      </ChatStreamProvider>
    </>
  );
}
