import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { filterConversations, recipientName } from '../data/model';
import { useCareRecipients, useConversations } from '../data/queries';
import { baseName, daysUntil, listWhen } from '../lib/format';
import type { ConversationRow } from '../services/types';
import { NavIcon } from './NavIcon';
import { ErrorState } from './States';

const GROUPS = [
  { id: 'today', label: 'Heute' },
  { id: 'week', label: 'Letzte 7 Tage' },
  { id: 'older', label: 'Älter' },
] as const;
type GroupId = (typeof GROUPS)[number]['id'];

function groupOf(c: ConversationRow, now: Date): GroupId {
  const d = daysUntil(c.created_at, now);
  return d >= 0 ? 'today' : d >= -7 ? 'week' : 'older';
}

/**
 * Gespräche in der Seitenleiste wie in der OALab-Kundenansicht: Suche oben, ruhige Gruppen (Heute, Letzte
 * 7 Tage, Älter), Eintrag zweizeilig mit Bezugssymbol, Titel und „Person · Datum“. Das Archiv liegt am Ende.
 */
export function SideConversations({ activeId, collapsed }: { activeId: string | null; collapsed: boolean }) {
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState('');
  const list = useConversations(archived);
  const people = useCareRecipients().data ?? [];
  const now = new Date();
  const items = list.data ? filterConversations(list.data, query, people) : [];
  const groups = GROUPS.map((g) => ({ ...g, items: items.filter((c) => groupOf(c, now) === g.id) })).filter((g) => g.items.length > 0);
  if (collapsed) return null;

  return (
    <section className="side-convs" aria-label={archived ? 'Archivierte Gespräche' : 'Gespräche'}>
      <label className="side-search">
        <NavIcon name="search" size={14} />
        <span className="sr-only">Gespräche durchsuchen</span>
        <input type="search" autoComplete="off" placeholder={archived ? 'Archiv durchsuchen' : 'Gespräche suchen'} value={query}
          onChange={(e) => setQuery(e.target.value)} />
      </label>
      {list.isPending ? (
        <div className="side-conv-list" role="status" aria-label="Gespräche werden geladen">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="side-conv side-conv-sk" aria-hidden="true">
              <span className="sk side-sk-g" />
              <span className="side-conv-t"><span className="sk side-sk-t" /><span className="sk side-sk-s" /></span>
            </div>
          ))}
        </div>
      ) : list.isError ? (
        <div className="side-error"><ErrorState error={list.error} onRetry={() => void list.refetch()} /></div>
      ) : items.length === 0 ? (
        <p className="side-empty" role="status">
          {query ? `Kein Treffer für „${query.trim()}“.` : archived ? 'Archivierte Gespräche erscheinen hier.' : 'Noch keine Gespräche. Oben beginnen Sie das erste.'}
        </p>
      ) : (
        <div className="side-conv-list fx-fade">
          {groups.map((g) => (
            <div key={g.id} className="side-group">
              <h3 className="side-group-h" id={`side-g-${g.id}`}>
                {g.label}
                <span className="num">{g.items.length}</span>
              </h3>
              <ul aria-labelledby={`side-g-${g.id}`}>
                {g.items.map((c) => {
                  const person = recipientName(c.care_recipient_id, people);
                  return (
                    <li key={c.id}>
                      <Link to="/gespraeche/$conversationId" params={{ conversationId: c.id }} className="side-conv"
                        {...(c.id === activeId ? { 'aria-current': 'page' as const } : {})}>
                        <span className="side-conv-g"><NavIcon name={person ? 'person' : 'people'} size={14} /></span>
                        <span className="side-conv-t">
                          <span className="side-conv-title">{c.title}</span>
                          <span className="side-conv-sub">
                            <span>{person ? baseName(person) : 'Allgemein'}</span>
                            <span aria-hidden="true">·</span>
                            <time className="num" dateTime={c.created_at}>{listWhen(c.created_at, now)}</time>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="side-archive" aria-pressed={archived} onClick={() => { setArchived((a) => !a); setQuery(''); }}>
        <NavIcon name={archived ? 'back' : 'archive'} size={14} />
        {archived ? 'Zurück zu aktiven Gesprächen' : 'Archiv'}
      </button>
    </section>
  );
}
