import { CircleAlert, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { toAppError } from '../services/errors';
import { Spray } from './Brand';

/** Ruhiger Ladezustand: statische Platzhalter, keine Endlosanimation. */
export function Loading({ label = 'Wird geladen …', lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton" style={{ width: `${88 - i * 18}%` }} aria-hidden="true" />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Konnte nicht geladen werden' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const appError = toAppError(error);
  return (
    <div className="alert alert-danger" role="alert">
      <CircleAlert className="i" size={18} aria-hidden="true" />
      <div className="min-w-0">
        <strong>{title}</strong>
        <span>{appError.message}</span>
        {appError.requestId ? <span className="block muted">Vorgangsnummer: {appError.requestId}</span> : null}
        {onRetry ? (
          <div className="alert-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
              <RotateCcw className="i" size={15} aria-hidden="true" />
              Erneut laden
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Leerer Zustand mit Sprühpunkten als einzigem, statischem Graffiti. */
export function EmptyState({ title, children, spray = true, center = false }: { title: string; children?: ReactNode; spray?: boolean; center?: boolean }) {
  return (
    <div className={`state ${center ? 'state-center' : ''}`}>
      {spray ? <Spray w={180} h={120} n={70} seed={23} cx={0.75} cy={0.3} /> : null}
      <strong>{title}</strong>
      {children}
    </div>
  );
}
