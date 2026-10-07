import { CircleAlert, Info, MessageSquareText, Quote } from 'lucide-react';
import { AnswerBody } from '../../chat/AnswerBody';
import type { ResponseFormat } from '../../chat/responseFormat';
import { messageModel, messageSources, REGION_LABEL, type MessageModel } from '../../data/model';
import { stampWhen } from '../../lib/format';
import type { MessageRow } from '../../services/types';

export function RegionBadge({ region }: { region: 'eu' | 'us' | 'unverified' }) {
  return (
    <span className={`region ${region === 'eu' ? 'region-eu' : ''}`} title={region === 'unverified' ? 'Hosting-Region nicht geprüft' : `Hosting-Region ${REGION_LABEL[region]}`}>
      {REGION_LABEL[region]}
    </span>
  );
}

export function AgentMeta({ model, time, note }: { model: MessageModel | null; time: string | null; note?: string }) {
  return (
    <p className="msg-meta">
      <MessageSquareText className="i" size={15} aria-hidden="true" />
      <strong>KI-Sachbearbeiter</strong>
      {model ? (
        <>
          <span title={model.responseModel ? `Vom Anbieter gemeldetes Modell: ${model.responseModel}` : undefined}>· {model.displayName}</span>
          <RegionBadge region={model.region} />
          {model.responseModel ? <span className="muted small">· {model.responseModel}</span> : null}
        </>
      ) : null}
      {time ? <span className="muted">· {time}</span> : null}
      {note ? <span className="muted">· {note}</span> : null}
    </p>
  );
}

const STATUS_NOTE: Partial<Record<MessageRow['status'], string>> = {
  interrupted: 'Antwort wurde unterbrochen. Der Text ist unvollständig.',
  failed: 'Antwort konnte nicht erzeugt werden.',
  streaming: 'Antwort wird noch erzeugt oder wurde nicht abgeschlossen.',
  pending: 'Antwort steht noch aus.',
};

export function MessageView({ message, responseFormat = 'text' }: { message: MessageRow; responseFormat?: ResponseFormat }) {
  if (message.role === 'user') {
    return (
      <div className="msg-user">
        <p className="bubble">
          <span className="sr-only">Sie schrieben: </span>
          {message.content}
        </p>
      </div>
    );
  }
  if (message.role === 'system') {
    return (
      <p className="msg-system" role="note">
        <Info className="i" size={15} aria-hidden="true" />
        <span>{message.content}</span>
      </p>
    );
  }
  const sources = messageSources(message);
  const note = message.status === 'failed' && message.content.trim().length > 0
    ? 'Antwort nicht vollständig abgeschlossen. Der Text kann unvollständig sein.'
    : STATUS_NOTE[message.status];
  return (
    <article className="msg-agent" aria-label="Antwort des KI-Sachbearbeiters">
      <AgentMeta model={messageModel(message)} time={stampWhen(message.created_at, new Date())} />
      <AnswerBody text={message.content} presentation={message.presentation} responseFormat={responseFormat} streaming={message.status === 'streaming'} />
      {note ? (
        <p className="msg-status is-warn">
          <CircleAlert className="i" size={15} aria-hidden="true" />
          {note}
        </p>
      ) : null}
      {sources.length ? (
        <p className="sources">
          <Quote className="i" size={14} aria-hidden="true" />
          <span>Quellen:</span>
          {sources.map((s, i) =>
            s.url ? (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer nofollow">
                {s.title}
              </a>
            ) : (
              <span key={i}>{s.title}</span>
            ),
          )}
        </p>
      ) : null}
    </article>
  );
}
