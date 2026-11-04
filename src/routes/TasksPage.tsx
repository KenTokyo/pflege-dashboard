import { Info } from 'lucide-react';
import { useState } from 'react';
import { useDesign } from '../app/ThemeProvider';
import { Shell } from '../components/Shell';
import { ErrorState } from '../components/States';
import { isUrgent, sortTasks } from '../data/model';
import { useCareRecipients, useOpenTasks } from '../data/queries';
import { InstrumentTasks } from '../instrument/aufgaben/InstrumentTasks';
import { daysUntil } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { EmptyRow, PanelHead, Seg, SkeletonRows, TaskLine, fall } from './dashboard/parts';

type Filter = 'all' | 'urgent' | 'week';
const FILTERS = [['all', 'Alle'], ['urgent', 'Dringend'], ['week', 'Nächste 7 Tage']] as const;

export function TasksPage() {
  useDocumentTitle('Aufgaben');
  const { design } = useDesign();
  return design === 'instrument' ? <InstrumentTasks /> : <TagwerkTasksPage />;
}

function TagwerkTasksPage() {
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
      <div className="pg fx-fall">
        <header className="pg-head" style={fall(0)}>
          <div className="min-w-0">
            <p className="pg-eyebrow">Nach Dringlichkeit sortiert</p>
            <h1>Offene Aufgaben und Fristen</h1>
          </div>
        </header>
        <p className="pg-note" style={fall(1)}>
          <Info className="i" size={14} aria-hidden="true" />
          <span>Termine stammen aus den gespeicherten Aufgaben. Die App berechnet keine Rechtsfristen – bitte immer mit dem Bescheid abgleichen.</span>
        </p>
        <section className="lt-panel" aria-label="Aufgabenliste" style={fall(2)}>
          <PanelHead id="tasks-page-title" title="Aufgaben" count={tasks.isPending || tasks.isError ? null : sorted.length}>
            <Seg label="Aufgaben filtern" value={filter} options={FILTERS} onChange={setFilter} />
          </PanelHead>
          {tasks.isPending ? (
            <SkeletonRows label="Aufgaben werden geladen …" />
          ) : tasks.isError ? (
            <div className="lt-pad"><ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} /></div>
          ) : sorted.length === 0 ? (
            <EmptyRow done={filter === 'all'} title={filter === 'all' ? 'Keine offenen Aufgaben' : 'Keine Aufgaben in diesem Filter'}>
              {filter === 'all' ? 'Alles erledigt. Neue Fristen erscheinen hier nach Dringlichkeit sortiert.' : 'Wählen Sie „Alle“, um jede offene Aufgabe zu sehen.'}
            </EmptyRow>
          ) : (
            <>
              <div className="lt-cols has-src" aria-hidden="true">
                <span /><span /><span>Was</span><span>Person</span><span>Art</span><span>Quelle</span><span className="r">Fällig</span>
              </div>
              <ul key={filter} className="lt-list fx-fall">
                {sorted.map((t, i) => (
                  <TaskLine key={t.id} task={t} people={people.data ?? []} now={now} source style={fall(i)} />
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
