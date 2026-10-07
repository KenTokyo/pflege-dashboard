import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { MessageSquareText } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../auth/AuthProvider';
import { usePendingTurn, useStreamStore } from '../../chat/ChatStreamContext';
import { takeDraftHandoff } from '../../chat/draftHandoff';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { effectiveModel } from '../../data/model';
import { keys, useAgentSettings, useArchiveConversation, useConversation, useMessages, useModels, useSetConversationModel } from '../../data/queries';
import { messageFor } from '../../services/errors';
import type { CareRecipient, MessageRow } from '../../services/types';
import { Composer } from './Composer';
import { MessageView } from './MessageView';
import { PendingTurnView } from './PendingTurnView';
import { ThreadHead } from './ThreadHead';

const FINAL_STATUS = new Set<MessageRow['status']>(['completed', 'interrupted', 'failed']);

export function Thread({ conversationId, people }: { conversationId: string; people: CareRecipient[] }) {
  const ws = useWorkspace().workspace.id;
  const qc = useQueryClient();
  const store = useStreamStore();
  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const settings = useAgentSettings();
  const models = useModels();
  const restore = useArchiveConversation();
  const changeModel = useSetConversationModel();
  const turn = usePendingTurn(conversationId);
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  const conv = conversation.data ?? null;
  const model = conv && settings.data !== undefined && models.data ? effectiveModel(conv, settings.data, models.data) : null;
  const mode = conv ? (conv.mode_override ?? settings.data?.version.mode ?? null) : null;
  const live = turn?.phase === 'sending' || turn?.phase === 'streaming';
  const archived = conv?.archived_at != null;

  let blockedReason: string | null = null;
  if (archived) blockedReason = 'Dieses Gespräch ist archiviert. Zum Weiterschreiben bitte wiederherstellen.';
  else if (changeModel.isPending) blockedReason = 'Das Modell wird geändert. Bitte warten Sie einen Moment.';
  else if (model && !model.usable) blockedReason = `${messageFor('NO_MODEL')} Die Verwaltung muss ein geprüftes Modell freigeben.`;

  // Übergabe vom Dashboard: Frage nur im Speicher, einmalig senden.
  const modelKnown = model !== null;
  const modelUsable = model?.usable === true;
  useEffect(() => {
    if (!modelKnown) return;
    const text = takeDraftHandoff(conversationId);
    if (!text) return;
    if (modelUsable && !archived) store.send(conversationId, text);
    // Einmalige Übernahme aus einem externen Speicher (Dashboard-Übergabe), kein abgeleiteter Zustand.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else setDraft(text);
  }, [conversationId, modelKnown, modelUsable, archived, store]);

  // Gespeicherten Verlauf mit der lokalen Anfrage abgleichen.
  // Der Server legt die Antwortzeile schon beim Start an (Status „streaming“) und füllt sie später.
  // Solange sie nicht endgültig ist, zeigt der lokale Live-Stand den aktuellen Text; die halbfertige
  // gespeicherte Zeile derselben Anfrage wird so lange ausgeblendet (auch nach Weg- und Zurücknavigieren).
  const stored = messages.data ?? [];
  const requestId = turn?.clientRequestId ?? null;
  const userStored = requestId !== null && stored.some((m) => m.role === 'user' && m.client_request_id === requestId);
  const assistantFinal =
    requestId === null
      ? null
      : (stored.find((m) => m.role === 'assistant' && m.client_request_id === requestId && FINAL_STATUS.has(m.status)) ?? null);
  const history =
    requestId !== null && !assistantFinal ? stored.filter((m) => !(m.role === 'assistant' && m.client_request_id === requestId)) : stored;
  useEffect(() => {
    if (turn?.phase === 'completed' && assistantFinal && turn.activity.length === 0) store.dismiss(conversationId);
  }, [turn?.phase, turn?.activity.length, assistantFinal, store, conversationId]);

  // Am Ende des Verlaufs bleiben, solange der Nutzer nicht hochgescrollt hat.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [history.length, turn?.text, turn?.phase]);

  if (conversation.isPending) {
    return (
      <section className="thread p-6" aria-busy="true">
        <Loading label="Gespräch wird geladen …" lines={4} />
      </section>
    );
  }
  if (conversation.isError) {
    return (
      <section className="thread p-6">
        <ErrorState error={conversation.error} onRetry={() => void conversation.refetch()} />
      </section>
    );
  }
  if (!conv) {
    return (
      <section className="thread p-6">
        <EmptyState title="Gespräch nicht gefunden" center>
          <span>Es wurde gelöscht oder ist für Sie nicht sichtbar.</span>
          <Link to="/gespraeche" className="link">
            Zur Gesprächsliste
          </Link>
        </EmptyState>
      </section>
    );
  }

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    stickToBottom.current = true;
    store.send(conversationId, text);
    setDraft('');
  };

  return (
    <section className="thread" aria-label={`Gespräch: ${conv.title}`}>
      <ThreadHead
        conversation={conv}
        people={people}
        mode={mode}
        model={model}
        models={models.data ?? []}
        defaultModelId={settings.data?.version.default_model_id ?? null}
        busy={live || changeModel.isPending}
        changingModel={changeModel.isPending}
        modelError={changeModel.error}
        onModelChange={(modelId) => changeModel.mutate({ conversation: conv, modelId })}
      />
      <div
        ref={scroller}
        className="messages"
        aria-live="polite"
        aria-relevant="additions"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {messages.isPending ? (
          <Loading label="Verlauf wird geladen …" />
        ) : messages.isError ? (
          <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
        ) : history.length === 0 && !turn ? (
          <div className="chat-empty">
            <MessageSquareText className="i" size={28} aria-hidden="true" />
            <strong className="text-[18px]" style={{ fontFamily: 'var(--font-display)' }}>
              Was möchten Sie wissen?
            </strong>
            <span className="muted">
              Fragen Sie zum Beispiel nach Pflegegrad, Entlastungsbetrag oder einem Widerspruch. Der Sachbearbeiter nennt Unsicherheiten
              und ersetzt keine Rechts- oder Medizinberatung.
            </span>
          </div>
        ) : (
          history.map((m) => <MessageView key={m.id} message={m} />)
        )}
        {turn ? (
          <PendingTurnView
            turn={turn}
            actionsDisabled={changeModel.isPending}
            showUser={!userStored}
            showAssistant={!assistantFinal}
            onFetchAgain={() => store.fetchAgain(conversationId)}
            onSendNew={() => store.send(conversationId, turn.content)}
            onReload={() => void qc.invalidateQueries({ queryKey: keys.messages(ws, conversationId) })}
            onEdit={() => {
              setDraft(turn.content);
              store.dismiss(conversationId);
              inputRef.current?.focus();
            }}
            onDismiss={() => store.dismiss(conversationId)}
          />
        ) : null}
      </div>
      {archived ? (
        <div className="mx-auto mt-2 w-full max-w-[860px] px-[22px]">
          <button type="button" className="btn btn-secondary btn-sm" disabled={restore.isPending} onClick={() => restore.mutate({ conversation: conv, archived: false })}>
            Gespräch wiederherstellen
          </button>
        </div>
      ) : null}
      <Composer
        personName={people.find((person) => person.id === conv.care_recipient_id)?.name ?? null}
        value={draft}
        onChange={setDraft}
        onSend={send}
        onStop={() => store.abort(conversationId)}
        streaming={live}
        blockedReason={blockedReason}
        inputRef={inputRef}
      />
    </section>
  );
}
