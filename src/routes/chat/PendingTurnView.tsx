import { CircleAlert, PencilLine, RefreshCw, RotateCcw, Send, X } from 'lucide-react';
import { SafeMarkdown } from '../../chat/Markdown';
import { recoveryFor, type PendingTurn } from '../../chat/streamStore';
import { AgentMeta } from './MessageView';

type Props = {
  turn: PendingTurn;
  showUser: boolean;
  showAssistant: boolean;
  onFetchAgain: () => void;
  onSendNew: () => void;
  onReload: () => void;
  onEdit: () => void;
  onDismiss: () => void;
};

const FAILED_TITLE: Record<string, string> = {
  aborted: 'Antwort abgebrochen',
  failed: 'Keine Antwort erhalten',
};

/** Laufende oder gerade beendete Anfrage, bis der gespeicherte Verlauf sie enthält. */
export function PendingTurnView({ turn, showUser, showAssistant, onFetchAgain, onSendNew, onReload, onEdit, onDismiss }: Props) {
  const live = turn.phase === 'sending' || turn.phase === 'streaming';
  const recovery = recoveryFor(turn);
  const model = turn.model ? { displayName: turn.model.displayName, region: turn.model.region } : null;

  return (
    <>
      {showUser ? (
        <div className="msg-user">
          <p className={`bubble ${live ? 'is-pending' : ''}`}>
            <span className="sr-only">Sie schrieben: </span>
            {turn.content}
          </p>
        </div>
      ) : null}

      {showAssistant && (live || turn.text) ? (
        <article className="msg-agent" aria-label="Antwort des KI-Sachbearbeiters" aria-busy={live}>
          <AgentMeta
            model={model}
            time={null}
            {...(turn.phase === 'sending'
              ? { note: 'Anfrage wird gesendet …' }
              : turn.phase === 'streaming' && !turn.text
                ? { note: 'Antwort wird erstellt …' }
                : turn.replayed
                  ? { note: 'gespeicherte Antwort' }
                  : {})}
          />
          {turn.text ? (
            <div className="relative">
              <SafeMarkdown text={turn.text} />
              {turn.phase === 'streaming' ? <span className="caret" aria-hidden="true" /> : null}
            </div>
          ) : turn.phase === 'streaming' ? (
            <span className="caret" aria-hidden="true" />
          ) : null}
        </article>
      ) : null}

      {turn.phase === 'failed' || turn.phase === 'aborted' ? (
        <div className={`alert ${turn.phase === 'failed' ? 'alert-danger' : ''}`} role="alert">
          <CircleAlert className="i" size={18} aria-hidden="true" />
          <div className="min-w-0">
            <strong>{FAILED_TITLE[turn.phase]}</strong>
            <span>{turn.error?.message}</span>
            {recovery === 'fetch_again' ? (
              <span className="block muted">Falls die Antwort bereits gespeichert wurde, wird sie ohne neuen KI-Aufruf übernommen.</span>
            ) : null}
            {recovery === 'send_new' ? <span className="block muted">Erneutes Senden startet eine neue Anfrage an das Modell.</span> : null}
            {turn.error?.requestId ? <span className="block muted">Vorgangsnummer: {turn.error.requestId}</span> : null}
            <div className="alert-actions">
              {recovery === 'fetch_again' ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={onFetchAgain}>
                  <RefreshCw className="i" size={15} aria-hidden="true" />
                  Antwort erneut abrufen
                </button>
              ) : null}
              {recovery === 'send_new' ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={onSendNew}>
                  <Send className="i" size={15} aria-hidden="true" />
                  Neu senden
                </button>
              ) : null}
              {recovery === 'reload' ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={onReload}>
                  <RotateCcw className="i" size={15} aria-hidden="true" />
                  Verlauf neu laden
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
                <PencilLine className="i" size={15} aria-hidden="true" />
                Text bearbeiten
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>
                <X className="i" size={15} aria-hidden="true" />
                Schließen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
