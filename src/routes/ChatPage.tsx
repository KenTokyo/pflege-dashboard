import { MessagesSquare, SquarePen } from 'lucide-react';
import { useState } from 'react';
import { Shell } from '../components/Shell';
import { EmptyState } from '../components/States';
import { useCareRecipients } from '../data/queries';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { ConversationList } from './chat/ConversationList';
import { NewConversationDialog } from './chat/NewConversationDialog';
import { Thread } from './chat/Thread';

export function ChatPage({ conversationId }: { conversationId: string | null }) {
  useDocumentTitle('Gespräche');
  const people = useCareRecipients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const list = people.data ?? [];

  return (
    <Shell mainClassName="is-chat">
      <div className={`chat-layout ${conversationId ? 'has-thread' : ''}`}>
        <ConversationList activeId={conversationId} people={list} onNew={() => setDialogOpen(true)} />
        {conversationId ? (
          <Thread conversationId={conversationId} people={list} />
        ) : (
          <section className="thread">
            <EmptyState title="Wählen Sie ein Gespräch" center>
              <MessagesSquare className="i" size={26} aria-hidden="true" />
              <span>Oder beginnen Sie ein neues – mit oder ohne Bezug zu einer Person.</span>
              <button type="button" className="btn btn-primary mt-2" onClick={() => setDialogOpen(true)}>
                <SquarePen className="i" size={17} aria-hidden="true" />
                Neues Gespräch
              </button>
            </EmptyState>
          </section>
        )}
      </div>
      <NewConversationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} people={list} />
    </Shell>
  );
}
