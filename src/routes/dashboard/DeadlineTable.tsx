import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { DOC_KIND_LABEL, DOC_STATUS_LABEL } from '../../data/model';
import { ErrorState } from '../../components/States';
import { dayKey, formatShortDate } from '../../lib/format';
import type { CareRecipient, DocumentRow, TaskRow } from '../../services/types';
import { Chip, EmptyRow, PanelHead, PersonDot, Seg, SkeletonRows, StatusIcon, TaskLine, docStatus, fall } from './parts';

/*
 * Leichte Tabelle statt Wochenplan: offene Aufgaben und Fristen nach Dringlichkeit.
 * Segment: Offen (alle offenen Aufgaben) · Diese Woche (fällig bis Sonntag, Überfälliges eingeschlossen)
 * · Alle (Aufgaben und Schreiben). Höchstens acht Zeilen, der Rest auf der Aufgabenseite.
 */

type View = 'open' | 'week' | 'all';
const VIEWS = [['open', 'Offen'], ['week', 'Diese Woche'], ['all', 'Alle']] as const;
const MAX_ROWS = 8;
const DOC_ROWS = 3;
const DAY_MS = 86_400_000;

/** Sonntag der laufenden Woche (Berlin) als YYYY-MM-DD. */
function sundayOf(now: Date): string {
  const today = dayKey(now);
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  return new Date(Date.parse(`${today}T12:00:00Z`) + (6 - weekday) * DAY_MS).toISOString().slice(0, 10);
}

function DocLine({ doc, people, now, i }: { doc: DocumentRow; people: readonly CareRecipient[]; now: Date; i: number }) {
  return (
    <li className="lt-li" style={fall(i)}>
      <Link to="/dokumente" hash={`dok-${doc.id}`} className="lt-row is-link">
        <StatusIcon status={docStatus(doc)} label={DOC_STATUS_LABEL[doc.status]} />
        <span className="lt-prio-gap" aria-hidden="true" />
        <span className="lt-title">{doc.title}</span>
        <PersonDot id={doc.care_recipient_id} people={people} />
        <span className="lt-kind"><Chip>{DOC_KIND_LABEL[doc.kind]}</Chip></span>
        <span className="lt-due is-none">
          <span className="lt-due-date">{formatShortDate(doc.created_at)}</span>
          <span className="lt-due-rel">{dayKey(new Date(doc.created_at)) === dayKey(now) ? 'heute erstellt' : 'erstellt'}</span>
        </span>
      </Link>
    </li>
  );
}

export function DeadlineTable({ tasks, docs, people, now, pending, error, onRetry }: {
  tasks: TaskRow[]; docs: DocumentRow[]; people: readonly CareRecipient[]; now: Date;
  pending: boolean; error: unknown; onRetry: () => void;
}) {
  const [view, setView] = useState<View>('open');
  const sunday = sundayOf(now);
  const shownTasks = view === 'week' ? tasks.filter((t) => t.due_at && dayKey(new Date(t.due_at)) <= sunday) : tasks;
  const shownDocs = view === 'all' ? docs : [];
  const total = shownTasks.length + shownDocs.length;
  // In „Alle“ bekommen Schreiben bis zu drei feste Zeilen, sonst verschwänden sie hinter den Aufgaben.
  const visibleDocs = shownDocs.slice(0, Math.max(DOC_ROWS, MAX_ROWS - shownTasks.length));
  const visibleTasks = shownTasks.slice(0, MAX_ROWS - visibleDocs.length);
  const rest = total - visibleTasks.length - visibleDocs.length;

  return (
    <section className="lt-panel ov-tasks" aria-labelledby="tasks-title">
      <PanelHead id="tasks-title" title="Offene Aufgaben und Fristen" count={pending || error ? null : tasks.length}>
        <Seg label="Ansicht der Aufgaben" value={view} options={VIEWS} onChange={setView} />
        <Link to="/aufgaben" className="lt-link">Alle anzeigen</Link>
      </PanelHead>
      {pending ? (
        <SkeletonRows label="Aufgaben werden geladen …" />
      ) : error ? (
        <div className="lt-pad"><ErrorState error={error} onRetry={onRetry} /></div>
      ) : (
        <>
          <div className="lt-cols" aria-hidden="true">
            <span /><span /><span>Was</span><span>Person</span><span>Art</span><span className="r">Fällig</span>
          </div>
          {total === 0 ? (
            <EmptyRow done title={view === 'week' ? 'Diese Woche ist nichts fällig.' : 'Nichts offen – gut so.'}>
              Neue Fristen erscheinen hier nach Dringlichkeit sortiert.
            </EmptyRow>
          ) : (
            <ul key={view} className="lt-list fx-fall" aria-label="Aufgaben und Fristen">
              {visibleTasks.map((t, i) => (
                <TaskLine key={t.id} task={t} people={people} now={now} link style={fall(i)} />
              ))}
              {visibleDocs.map((d, i) => (
                <DocLine key={d.id} doc={d} people={people} now={now} i={visibleTasks.length + i} />
              ))}
            </ul>
          )}
          {rest > 0 ? (
            <Link to={shownTasks.length > visibleTasks.length ? '/aufgaben' : '/dokumente'} className="lt-more">
              {rest} weitere anzeigen
              <ArrowRight className="i" size={14} aria-hidden="true" />
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}
