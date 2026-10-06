import { Link } from '@tanstack/react-router';
import { Archive, MessagesSquare, Search, SquarePen, User, Users } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { filterConversations, recipientName } from '../../data/model';
import { useConversations } from '../../data/queries';
import { baseName, listWhen } from '../../lib/format';
import type { CareRecipient } from '../../services/types';

export function ConversationList({ activeId, people, onNew }: { activeId: string | null; people: CareRecipient[]; onNew: () => void }) {
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState('');
  const list = useConversations(archived);
  const now = new Date();
  const items = list.data ? filterConversations(list.data, query, people) : [];

  return (
    <aside className="conv-list" aria-labelledby="conv-title">
      <div className="conv-head">
        <h2 id="conv-title">{archived ? 'Archiv' : 'Gespräche'}</h2>
        <button type="button" className="icon-btn" onClick={onNew} aria-label="Neues Gespräch" title="Neues Gespräch">
          <SquarePen className="i" size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="input">
        <Search className="i" size={17} aria-hidden="true" />
        <label htmlFor="conv-search" className="sr-only">
          Gespräche durchsuchen
        </label>
        <input id="conv-search" type="search" placeholder="Titel oder Person suchen" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="conv-scroll">
        {list.isPending ? (
          <Loading lines={4} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={query ? 'Keine Treffer' : archived ? 'Archiv ist leer' : 'Noch keine Gespräche'} spray={!query}>
            <span>{query ? 'Andere Suchbegriffe versuchen.' : archived ? 'Archivierte Gespräche erscheinen hier.' : 'Beginnen Sie ein neues Gespräch.'}</span>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-0.5" aria-label={archived ? 'Archivierte Gespräche' : 'Gespräche'}>
            {items.map((c) => {
              const person = recipientName(c.care_recipient_id, people);
              return (
                <li key={c.id}>
                  <Link
                    to="/gespraeche/$conversationId"
                    params={{ conversationId: c.id }}
                    className="conv-item"
                    {...(c.id === activeId ? { 'aria-current': 'page' as const } : {})}
                  >
                    <span className="conv-title">{c.title}</span>
                    <span className="conv-when">{listWhen(c.created_at, now)}</span>
                    <span className="conv-who">
                      {person ? <User className="i" size={13} aria-hidden="true" /> : <Users className="i" size={13} aria-hidden="true" />}
                      <span>{person ? baseName(person) : 'Allgemein'}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="conv-foot">
        <button type="button" className="btn btn-ghost btn-sm" aria-pressed={!archived} onClick={() => setArchived(false)}>
          <MessagesSquare className="i" size={15} aria-hidden="true" />
          Aktiv
        </button>
        <button type="button" className="btn btn-ghost btn-sm" aria-pressed={archived} onClick={() => setArchived(true)}>
          <Archive className="i" size={15} aria-hidden="true" />
          Archiv
        </button>
      </div>
    </aside>
  );
}
