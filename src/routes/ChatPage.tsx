import { useDesign } from '../app/ThemeProvider';
import { InstrumentEmpty } from '../instrument/chat/InstrumentEmpty';
import { useState } from 'react';
import { Shell } from '../components/Shell';
import { useCareRecipients } from '../data/queries';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { ConversationList } from './chat/ConversationList';
import { NewConversationDialog } from './chat/NewConversationDialog';
import { Thread } from './chat/Thread';
import { NewChat } from './chat/NewChat';

/** Ein Gespräch. Tagwerk: die Gesprächsliste steht in der Seitenleiste (Shell), hier nur der Verlauf. */
export function ChatPage({ conversationId }: { conversationId: string | null }) {
  useDocumentTitle('Gespräche');
  const { design } = useDesign();
  const people = useCareRecipients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const list = people.data ?? [];

  if (design === 'instrument') return (
    <Shell mainClassName="is-chat">
      <div className={`in-chat-layout ${conversationId ? 'has-thread' : ''}`}>
        <ConversationList activeId={conversationId} people={list} onNew={() => setDialogOpen(true)} />
        {conversationId ? <Thread conversationId={conversationId} people={list} />
          : <InstrumentEmpty onNew={() => setDialogOpen(true)} />}
      </div>
      <NewConversationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} people={list} />
    </Shell>
  );

  return conversationId ? <Thread conversationId={conversationId} people={list} /> : <NewChat />;
}
