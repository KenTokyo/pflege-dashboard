import { CircleAlert, PencilLine, RefreshCw, RotateCcw, Send, X } from 'lucide-react';
import { AnswerBody } from '../../chat/AnswerBody';
import type { ResponseFormat } from '../../chat/responseFormat';
import { parseOpenUi } from '../../../types/openui';
import { recoveryFor, type PendingTurn } from '../../chat/streamStore';
import { modelDisplayName } from '../../data/model';
import { AgentMeta } from './MessageView';
import { ActivityView } from './ActivityView';

type Props = {
  turn: PendingTurn;
  showUser: boolean;
  showAssistant: boolean;
  onFetchAgain: () => void;
  onSendNew: () => void;
  onReload: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  actionsDisabled?: boolean;
  responseFormat?: ResponseFormat;
};

const FAILED_TITLE: Record<string, string> = {
  aborted: 'Antwort abgebrochen',
  failed: 'Keine Antwort erhalten',
};

/** Laufende oder gerade beendete Anfrage, bis der gespeicherte Verlauf sie enthält. */
export function PendingTurnView({ turn, showUser, showAssistant, onFetchAgain, onSendNew, onReload, onEdit, onDismiss, actionsDisabled = false, responseFormat = 'text' }: Props) {
  const live = turn.phase === 'sending' || turn.phase === 'streaming';
  const recovery = recoveryFor(turn);
  const preview = turn.text || (turn.presentation ? parseOpenUi(turn.presentation.source, live).text : '');
  const visibleText = preview.trim().length > 0;
  const incompleteAnswer = turn.phase === 'failed' && visibleText;
  const progress = turn.phase === 'sending' ? 'Anfrage wird gesendet …' : visibleText ? 'Antwort wird geschrieben …' : 'Denkt nach …';
  const model = turn.model ? { displayName: modelDisplayName(turn.model.displayName, turn.model.provider), region: turn.model.region } : null;

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

      {showAssistant && (live || preview || turn.presentation) ? (
        <article className="msg-agent" aria-label="Antwort des KI-Sachbearbeiters" aria-busy={live}>
          <AgentMeta
            model={model}
            time={null}
            {...(turn.replayed ? { note: 'gespeicherte Antwort' } : {})}
          />
          {live ? <p className="msg-status" role="status">{progress}</p> : null}
          {visibleText || (!live && turn.presentation) ? (
            <div className="relative">
              <AnswerBody text={preview} presentation={turn.presentation} responseFormat={responseFormat} streaming={live} />
              {turn.phase === 'streaming' && visibleText ? <span className="caret" aria-hidden="true" /> : null}
            </div>
          ) : null}
        </article>
      ) : null}

      {turn.phase === 'failed' || turn.phase === 'aborted' ? (
        <div className={`alert ${turn.phase === 'failed' ? 'alert-danger' : ''}`} role="alert">
          <CircleAlert className="i" size={18} aria-hidden="true" />
          <div className="min-w-0">
            <strong>{incompleteAnswer ? 'Antwort nicht vollständig abgeschlossen' : FAILED_TITLE[turn.phase]}</strong>
            <span>{incompleteAnswer && turn.error?.code === 'PROVIDER_FAILED' ? 'Die Antwort wurde unterbrochen. Sie können die Anfrage erneut senden.' : turn.error?.message}</span>
            {recovery === 'fetch_again' ? (
              <span className="block muted">Falls die Antwort bereits gespeichert wurde, wird sie ohne neuen KI-Aufruf übernommen.</span>
            ) : null}
            {recovery === 'send_new' ? <span className="block muted">Erneutes Senden startet eine neue Anfrage an das Modell.</span> : null}
            {turn.error?.requestId ? <span className="block muted">Vorgangsnummer: {turn.error.requestId}</span> : null}
            <div className="alert-actions">
              {recovery === 'fetch_again' ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={onFetchAgain} disabled={actionsDisabled}>
                  <RefreshCw className="i" size={15} aria-hidden="true" />
                  Antwort erneut abrufen
                </button>
              ) : null}
              {recovery === 'send_new' ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={onSendNew} disabled={actionsDisabled}>
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
      <ActivityView activity={turn.activity} />
    </>
  );
}
