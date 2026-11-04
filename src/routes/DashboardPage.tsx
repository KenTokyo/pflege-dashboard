import { Link } from '@tanstack/react-router';
import { MessageSquareText } from 'lucide-react';
import { useDesign } from '../app/ThemeProvider';
import { useWorkspace } from '../auth/AuthProvider';
import { Shell } from '../components/Shell';
import { sortTasks } from '../data/model';
import { useCareRecipients, useDocuments, useOpenTasks } from '../data/queries';
import { InstrumentDashboard } from '../instrument/uebersicht/InstrumentDashboard';
import { baseName, daysUntil, formatLongDate, greeting } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { DeadlineTable } from './dashboard/DeadlineTable';
import { AskPanel, DocsPanel, PeopleTable } from './dashboard/OverviewPanels';
import { fall } from './dashboard/parts';

export function DashboardPage() {
  useDocumentTitle('Übersicht');
  const { design } = useDesign();
  return design === 'instrument' ? <InstrumentDashboard /> : <TagwerkDashboardPage />;
}

/** Ein Satz unter der Begrüßung: was heute Aufmerksamkeit braucht. */
function summary(tasks: readonly { due_at: string | null; priority: 'urgent' | 'high' | 'normal' | 'low' }[], now: Date): string | null {
  const over = tasks.filter((t) => t.due_at && daysUntil(t.due_at, now) < 0).length;
  const soon = tasks.filter((t) => t.due_at && daysUntil(t.due_at, now) >= 0 && daysUntil(t.due_at, now) <= 3).length;
  const parts = [over ? `${over} ${over === 1 ? 'Frist' : 'Fristen'} überfällig` : null, soon ? `${soon} in den nächsten drei Tagen` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : tasks.length ? 'Keine Frist überfällig' : null;
}

function TagwerkDashboardPage() {
  const { profile } = useWorkspace();
  useDocumentTitle('Übersicht');
  const people = useCareRecipients();
  const tasks = useOpenTasks();
  const docs = useDocuments();
  const now = new Date();
  const sorted = sortTasks(tasks.data ?? []);
  const peopleList = people.data ?? [];
  const firstName = baseName(profile.displayName);
  const line = tasks.data ? summary(sorted, now) : null;
  const overdue = sorted.some((t) => t.due_at && daysUntil(t.due_at, now) < 0);

  return (
    <Shell>
      <div className="ov fx-fall">
        <header className="pg-head ov-head" style={fall(0)}>
          <div className="min-w-0">
            <p className="pg-eyebrow">{formatLongDate(now)}</p>
            <h1>
              {greeting(now)}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            {line ? <p className={`pg-sub ${overdue ? 'has-over' : ''}`}>{line}</p> : null}
          </div>
          <div className="pg-acts">
            <Link to="/gespraeche" className="btn btn-secondary">
              <MessageSquareText className="i" size={14} aria-hidden="true" />
              Sachbearbeiter fragen
            </Link>
          </div>
        </header>

        <div className="ov-a" style={fall(1)}>
          <DeadlineTable tasks={sorted} docs={docs.data ?? []} people={peopleList} now={now}
            pending={tasks.isPending} error={tasks.isError ? tasks.error : null} onRetry={() => void tasks.refetch()} />
        </div>
        <div className="ov-b" style={fall(2)}>
          <AskPanel />
        </div>
        <div className="ov-c" style={fall(3)}>
          <DocsPanel docs={docs.data ?? []} now={now}
            pending={docs.isPending} error={docs.isError ? docs.error : null} onRetry={() => void docs.refetch()} />
        </div>
        <div className="ov-d" style={fall(4)}>
          <PeopleTable people={peopleList} sorted={sorted} tasksFailed={tasks.isError} now={now}
            pending={people.isPending || tasks.isPending} error={people.isError ? people.error : null} onRetry={() => void people.refetch()} />
        </div>
      </div>
    </Shell>
  );
}
