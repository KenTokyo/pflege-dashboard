import type { ReactNode } from 'react';
import { toAppError } from '../../services/errors';
import { Icon } from '../grundlage/Icon';
import { Reveal } from '../grundlage/Reveal';
import { StateDrawing } from './StateDrawing';
import '../grundlage/controls.css';
import './zustaende.css';

export function InstrumentLoading({ label, lines }: { label: string; lines: number }) {
  return <div className="in-loading" role="status" aria-live="polite">
    <div className="in-loading-label"><Icon name="overview" size={18} /><span>{label}</span></div>
    <div className="in-loading-lines" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => <span key={index} style={{ width: `${88 - index * 18}%` }} />)}
    </div>
  </div>;
}

export function InstrumentError({ error, onRetry, title }: { error: unknown; onRetry?: (() => void) | undefined; title: string }) {
  const appError = toAppError(error);
  return <div className="in-state-error" role="alert">
    <span className="in-state-error-icon"><Icon name="warning" tone="danger" size={20} /></span>
    <div className="in-state-error-copy"><strong>{title}</strong><p>{appError.message}</p>
      {appError.requestId ? <p className="in-state-request">Vorgangsnummer: {appError.requestId}</p> : null}
      {onRetry ? <button type="button" className="in-button" onClick={onRetry}>
        <Icon name="reset" size={16} /><span>Erneut laden</span></button> : null}
    </div>
  </div>;
}

export function InstrumentEmpty({ title, children, center = false, illustration = true }: {
  title: string; children?: ReactNode; center?: boolean; illustration?: boolean;
}) {
  return <Reveal className={`in-empty ${center ? 'in-empty-center' : ''}`}>
    {illustration ? <StateDrawing kind="empty" /> : null}
    <div className="in-empty-copy"><strong>{title}</strong>{children}</div>
  </Reveal>;
}

export function InstrumentGateFrame({ children, kind }: { children: ReactNode; kind: 'loading' | 'access' | 'connection' }) {
  return <main id="main" tabIndex={-1} className="in-gate">
    <Reveal className="in-card in-gate-card">
      <header className="in-gate-brand"><Icon name="care" size={24} /><span>Pflege-Dashboard</span></header>
      <Reveal stage="data"><StateDrawing kind={kind} /></Reveal>
      <div className="in-gate-content">{children}</div>
    </Reveal>
  </main>;
}
