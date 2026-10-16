import { useState, type SubmitEvent } from 'react';
import { useStartConversation } from '../../chat/useStartConversation';
import { effectiveModel, titleFromQuestion } from '../../data/model';
import { useAgentSettings, useCareRecipients, useModels } from '../../data/queries';

/** Gemeinsamer Frage-Einstieg: Tagwerk und Instrument verwenden denselben Schreibweg. */
export function useOverviewQuestion() {
  const people = useCareRecipients();
  const settings = useAgentSettings();
  const models = useModels();
  const { start, pending, error } = useStartConversation();
  const [question, setQuestion] = useState('');
  const [personId, setPersonId] = useState<string>('auto');
  const list = people.data ?? [];
  const chosen = personId === 'auto' ? (list.length === 1 ? (list[0]?.id ?? null) : null) : personId || null;
  const model = settings.data !== undefined && models.data ? effectiveModel(null, settings.data, models.data) : null;
  const blocked = model !== null && !model.usable;
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || pending || blocked) return;
    try {
      await start({ title: titleFromQuestion(text), careRecipientId: chosen, firstMessage: text });
    } catch {
      // Der Hook zeigt den Fehler an; der Entwurf bleibt erhalten.
    }
  };
  return { question, setQuestion, personId, setPersonId, list, chosen, pending, error, blocked, onSubmit };
}
