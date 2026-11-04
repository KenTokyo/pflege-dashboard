import { useDesign } from '../../app/ThemeProvider';
import { InstrumentConversationList } from '../../instrument/chat/InstrumentConversationList';
import { useState } from 'react';
import { filterConversations } from '../../data/model';
import { useConversations } from '../../data/queries';
import type { CareRecipient } from '../../services/types';

/** Instrument: eigene Gesprächsspalte. Tagwerk zeigt die Gespräche in der Seitenleiste (components/SideConversations.tsx). */
export function ConversationList({ activeId, people, onNew }: { activeId: string | null; people: CareRecipient[]; onNew: () => void }) {
  const { design } = useDesign();
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState('');
  const list = useConversations(archived);
  const items = list.data ? filterConversations(list.data, query, people) : [];

  if (design === 'instrument') return <InstrumentConversationList activeId={activeId} people={people} onNew={onNew}
    archived={archived} setArchived={setArchived} query={query} setQuery={setQuery} items={items}
    pending={list.isPending} error={list.error} onRetry={() => void list.refetch()} />;

  return null;
}
