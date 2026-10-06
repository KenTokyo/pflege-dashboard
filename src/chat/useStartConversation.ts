import { useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';
import { useSessionEpoch, useWorkspace } from '../auth/AuthProvider';
import { useCreateConversation } from '../data/queries';
import { newId } from '../lib/ids';
import { setDraftHandoff } from './draftHandoff';

/**
 * Neues Gespräch über create_conversation (Vertrag v1.0). Der Idempotenzschlüssel bleibt für denselben
 * Inhalt erhalten, damit ein erneuter Klick nach Netzfehler keine zweite Zeile erzeugt.
 */
export function useStartConversation() {
  const { workspace } = useWorkspace();
  const create = useCreateConversation();
  const navigate = useNavigate();
  const { isCurrent } = useSessionEpoch();
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const start = async (input: { title: string; careRecipientId: string | null; firstMessage?: string }) => {
    const fingerprint = JSON.stringify([input.title, input.careRecipientId]);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: newId() };
    const row = await create.mutateAsync({
      p_workspace_id: workspace.id,
      p_title: input.title,
      p_care_recipient_id: input.careRecipientId,
      p_idempotency_key: attempt.current.key,
    });
    attempt.current = null;
    // Nach Abmeldung keine Übergabe und keine Navigation (der Entwurf würde sonst die Sitzung überdauern).
    if (!isCurrent()) return row;
    if (input.firstMessage) setDraftHandoff(row.id, input.firstMessage);
    await navigate({ to: '/gespraeche/$conversationId', params: { conversationId: row.id } });
    return row;
  };

  return { start, pending: create.isPending, error: create.error, reset: create.reset };
}
