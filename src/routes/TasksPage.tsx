import { Info } from 'lucide-react';
import { useState } from 'react';
import { Shell } from '../components/Shell';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { isUrgent, sortTasks } from '../data/model';
import { useCareRecipients, useOpenTasks } from '../data/queries';
import { daysUntil } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { TaskRowView } from './DashboardPage';

type Filter = 'all' | 'urgent' | 'week';

export function TasksPage() {
  useDocumentTitle('Aufgaben');
  const tasks = useOpenTasks();
  const people = useCareRecipients();
  const [filter, setFilter] = useState<Filter>('all');
  const now = new Date();
  const sorted = sortTasks(tasks.data ?? []).filter((t) => {
    if (filter === 'all') return true;
    const days = t.due_at ? daysUntil(t.due_at, now) : null;
    if (filter === 'urgent') return isUrgent(t, days);
    return days !== null && days <= 7;
  });

  return (
    <Shell>
      <div className="list-page">
        <header className="page-head">
          <div>
            <p className="eyebrow">Nach Dringlichkeit sortiert</p>
            <h1>Offene Aufgaben und Fristen</h1>
          </div>
        </header>
        <p className="note mb-3">
          <Info className="i" size={15} aria-hidden="true" />
          <span>Termine stammen aus den gespeicherten Aufgaben. Die App berechnet keine Rechtsfristen – bitte immer mit dem Bescheid abgleichen.</span>
        </p>
        <div className="filters" role="group" aria-label="Aufgaben filtern">
          {(
            [
              ['all', 'Alle'],
              ['urgent', 'Dringend'],
              ['week', 'Nächste 7 Tage'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className="filter" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <section className="card" aria-label="Aufgabenliste">
          {tasks.isPending ? (
            <Loading />
          ) : tasks.isError ? (
            <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
          ) : sorted.length === 0 ? (
            <EmptyState title={filter === 'all' ? 'Keine offenen Aufgaben' : 'Keine Aufgaben in diesem Filter'} />
          ) : (
            <ul className="rows">
              {sorted.map((t) => (
                <TaskRowView key={t.id} task={t} people={people.data ?? []} now={now} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}
