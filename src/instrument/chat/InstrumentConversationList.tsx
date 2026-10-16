import { Link } from '@tanstack/react-router';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { recipientName } from '../../data/model';
import { baseName, listWhen } from '../../lib/format';
import type { CareRecipient, ConversationRow } from '../../services/types';
import { CardHead } from '../grundlage/CardHead';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Segments } from '../grundlage/Segments';
import './list.css';

type Props = {
  activeId: string | null; people: CareRecipient[]; onNew: () => void;
  archived: boolean; setArchived: (value: boolean) => void; query: string; setQuery: (value: string) => void;
  items: ConversationRow[]; pending: boolean; error: unknown; onRetry: () => void;
};

export function InstrumentConversationList(props: Props) {
  const { activeId, people, onNew, archived, setArchived, query, setQuery, items, pending, error, onRetry } = props;
  return <aside className="in-conversations in-card" aria-labelledby="conv-title">
    <Reveal stage="head"><CardHead icon="conversation" title="Gespräche" subtitle={archived ? 'Archiv' : 'Aktueller Bestand'}
      id="conv-title" end={<button className="in-chat-icon-button" type="button" onClick={onNew} aria-label="Neues Gespräch">
        <Icon name="plus" /><span className="in-chat-tooltip" role="tooltip">Neues Gespräch</span>
      </button>} /></Reveal>
    <Reveal stage="metric" className="in-conversation-count">
      {pending || error ? <p className="muted">{pending ? 'Bestand wird geladen …' : 'Bestand nicht verfügbar'}</p>
        : <Metric value={items.length} label={query ? 'Suchergebnis' : archived ? 'Archiviert' : 'Aktiv'}
          unit={items.length === 1 ? 'Gespräch' : 'Gespräche'} tone="conversation" />}
    </Reveal>
    <div className="in-conversation-search">
      <Icon name="search" thing="conversation" size={16} />
      <label htmlFor="conv-search" className="sr-only">Gespräche durchsuchen</label>
      <input id="conv-search" type="search" placeholder="Titel oder Person suchen" value={query}
        onChange={(event) => setQuery(event.target.value)} />
    </div>
    <div className="in-conversation-scroll">
      {pending ? <Loading lines={4} /> : error ? <ErrorState error={error} onRetry={onRetry} />
        : items.length === 0 ? <EmptyState title={query ? 'Keine Treffer' : archived ? 'Archiv ist leer' : 'Noch keine Gespräche'}>
          {query ? 'Versuchen Sie einen anderen Titel oder Namen.' : archived ? 'Archivierte Gespräche erscheinen hier.'
            : 'Legen Sie ein Gespräch zu Ihrem Anliegen an.'}</EmptyState>
          : <ul aria-label={archived ? 'Archivierte Gespräche' : 'Gespräche'}>
            {items.map((conversation, index) => {
              const person = recipientName(conversation.care_recipient_id, people);
              return <li key={conversation.id}><Reveal stage="data" index={Math.min(index, 5)}>
                <Link to="/gespraeche/$conversationId" params={{ conversationId: conversation.id }}
                  className="in-conversation-row" {...(activeId === conversation.id ? { 'aria-current': 'page' as const } : {})}>
                  <Icon name="conversation" size={16} />
                  <span className="in-conversation-name">{conversation.title}</span>
                  <time dateTime={conversation.created_at}>{listWhen(conversation.created_at, new Date())}</time>
                  <span className="in-conversation-person"><Icon name={person ? 'person' : 'care'} size={13} />
                    {person ? baseName(person) : 'Allgemein'}</span>
                </Link>
              </Reveal></li>;
            })}
          </ul>}
    </div>
    <div className="in-conversation-foot"><Segments label="Gesprächsbestand" value={archived ? 'archiv' : 'aktiv'}
      onChange={(value) => setArchived(value === 'archiv')}
      options={[{ value: 'aktiv', label: 'Aktiv' }, { value: 'archiv', label: 'Archiv' }]} /></div>
  </aside>;
}
