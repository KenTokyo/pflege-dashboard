import { Link } from '@tanstack/react-router';
import { Shell } from '../../components/Shell';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { DOC_KIND_LABEL, documentStatusCounts, sortTasks } from '../../data/model';
import { useCareRecipients, useDocuments, useOpenTasks } from '../../data/queries';
import { daysUntil, formatLongDate } from '../../lib/format';
import { StatusDistribution } from '../dokumente/StatusDistribution';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Timeline } from '../grundlage/Timeline';
import { ConversationsPanel } from './ConversationsPanel';
import { PageHeading, Panel } from './Panel';
import { PeoplePanel } from './PeoplePanel';

export function InstrumentDashboard() {
  const people = useCareRecipients();
  const tasks = useOpenTasks();
  const docs = useDocuments();
  const now = new Date();
  const sorted = sortTasks(tasks.data ?? []);
  const overdue = tasks.data?.filter(t => t.due_at && daysUntil(t.due_at, now) < 0).length;
  return <Shell><div className="ib-page ib-overview">
    <PageHeading title="Übersicht" subtitle={formatLongDate(now)} />
    <Reveal stage="metric" className="in-card ib-metrics" aria-label="Bestand im Arbeitsbereich">
      <Metric label="Pflege organisieren" value={people.data?.length ?? NaN} unit={people.data?.length === 1 ? 'Person' : 'Personen'} tone="person" />
      <Metric label="Zu erledigen" value={tasks.data?.length ?? NaN} unit={tasks.data?.length === 1 ? 'Aufgabe' : 'Aufgaben'} tone="task" />
      <Metric label="Gespeichert" value={docs.data?.length ?? NaN} unit={docs.data?.length === 1 ? 'Dokument' : 'Dokumente'} tone="document" />
    </Reveal>
    <div className="ib-dashboard-grid">
      {people.isPending ? <Panel icon="person" title="Personen"><Loading /></Panel> : people.isError ?
        <Panel icon="person" title="Personen"><ErrorState error={people.error} onRetry={() => void people.refetch()} /></Panel> :
        people.data.length ? <PeoplePanel people={people.data} /> :
          <Panel icon="person" title="Personen"><EmptyState title="Noch keine Pflegebedürftigen hinterlegt" spray={false}>
            Personen werden von der Verwaltung angelegt.</EmptyState></Panel>}
      <Panel index={1} icon="deadline" title="Was ist als Nächstes fällig?" subtitle="Gespeicherte Termine · nach Fälligkeit"
        footer={<><span>Mit dem Bescheid abgleichen</span><Link to="/aufgaben" className="ib-button ib-primary">
          <span>Aufgaben öffnen</span><Icon name="arrow" size={16} /></Link></>}>
        <Reveal stage="metric"><Metric label="Überfällig" value={overdue ?? NaN}
          unit={overdue === 1 ? 'Aufgabe' : 'Aufgaben'} tone={overdue ? 'danger' : 'deadline'} /></Reveal>
        {tasks.isPending ? <Loading /> : tasks.isError ? <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} /> :
          sorted.some(t => t.due_at) ? <Timeline items={sorted.filter(t => t.due_at).slice(0, 3).map(t => ({
            id: t.id, date: t.due_at ?? '', label: t.title, thing: 'deadline',
          }))} today={now} /> : <EmptyState title={sorted.length ? 'Keine Aufgaben mit Termin' : 'Keine offenen Aufgaben'} spray={false} />}
        {tasks.data?.some(t => !t.due_at) ? <p className="ib-note">Weitere Aufgaben ohne Termin stehen in der Aufgabenliste.</p> : null}
      </Panel>
      <Panel index={2} icon="document" title="Welche Schreiben warten auf Prüfung?" subtitle="Dokumente · manuell gesetzter Status"
        footer={<><span>Die App versendet keine Schreiben</span><Link to="/dokumente" className="ib-button ib-primary">
          <span>Dokumente öffnen</span><Icon name="arrow" size={16} /></Link></>}>
        <Reveal stage="metric"><Metric label="Noch im Entwurf" value={docs.data ? documentStatusCounts(docs.data).draft : NaN}
          unit={docs.data && documentStatusCounts(docs.data).draft === 1 ? 'Dokument' : 'Dokumente'} tone="document" /></Reveal>
        {docs.isPending ? <Loading /> : docs.isError ? <ErrorState error={docs.error} onRetry={() => void docs.refetch()} /> :
          docs.data.length ? <><StatusDistribution documents={docs.data} /><ul className="ib-list">
            {docs.data.slice(0, 3).map(d => <li key={d.id}><Link to="/dokumente" hash={`dok-${d.id}`} className="ib-list-link">
              <Icon name="document" /><span><strong>{d.title}</strong><small>{DOC_KIND_LABEL[d.kind]}</small></span>
              <Icon name="chevron" thing="document" size={14} /></Link></li>)}
          </ul></> : <EmptyState title="Noch keine Dokumente" spray={false} />}
      </Panel>
      <ConversationsPanel />
    </div>
  </div></Shell>;
}
