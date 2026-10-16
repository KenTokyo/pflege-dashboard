import { useState } from 'react';
import { Shell } from '../../components/Shell';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { useCareRecipients, useOpenTasks } from '../../data/queries';
import { baseName, dayKey, daysUntil } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { DEFAULT_FILTER, selectPeople, selectTasks, type StaffFilter } from '../../staff/model';
import { useStaffOverview } from '../../staff/queries';
import { NewConversationDialog } from '../../routes/chat/NewConversationDialog';
import { CardHead } from '../grundlage/CardHead';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Segments } from '../grundlage/Segments';
import { CaseList, TaskList } from './Lists';
import { InstrumentCaseDialog } from './InstrumentCaseDialog';
import { InstrumentWorkbench } from './InstrumentWorkbench';
import { UsageAnalysis } from './UsageAnalysis';
import './staff.css';
import './lists.css';

export function InstrumentStaffPage() {
  useDocumentTitle('Sachbearbeitung');
  const people = useCareRecipients();
  const tasks = useOpenTasks();
  const overview = useStaffOverview();
  const [filter, setFilter] = useState<StaffFilter>(DEFAULT_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [askId, setAskId] = useState<string | null>(null);
  const peopleList = people.data ?? [];
  const taskList = tasks.data ?? [];
  const metrics = overview.isError ? undefined : overview.data;
  const counts = new Map(metrics?.people.map((person) => [person.id, person.conversations]));
  const now = new Date();
  const filteredPeople = selectPeople(peopleList, taskList, counts, filter, now);
  const filteredTasks = selectTasks(taskList, filter, now);
  const selected = peopleList.find((person) => person.id === selectedId);
  const blocked = people.isPending || tasks.isPending || people.isError || tasks.isError;
  const refreshing = people.isFetching || tasks.isFetching || overview.isFetching;
  const overdue = taskList.filter((task) => task.due_at && daysUntil(task.due_at, now) < 0).length;
  const weekday = (new Date(`${dayKey(now)}T12:00:00Z`).getUTCDay() + 6) % 7;
  const thisWeek = taskList.filter((task) => {
    if (!task.due_at) return false;
    const distance = daysUntil(task.due_at, now);
    return distance >= -weekday && distance < 7 - weekday;
  }).length;
  const refresh = () => { void people.refetch(); void tasks.refetch(); void overview.refetch(); };
  const ask = (id: string) => { setSelectedId(null); setAskId(id); };
  const unavailableTasks = tasks.isPending || tasks.isError;
  const sortLabel = { deadline: 'Frist', priority: 'Priorität', conversations: 'Gesprächszahl', name: 'Name' }[filter.sort];

  return <Shell mainClassName="is-main">
    <Reveal stage="head"><header className="is-page-head">
      <div><p className="is-kicker">Gemeinsamer Demo-Arbeitsbereich</p><h1>Sachbearbeitung</h1>
        <p>Ansicht für die Fallarbeit · unveränderte Zugriffsrechte</p></div>
      <button type="button" className="is-button" onClick={refresh} disabled={refreshing}>
        <Icon name="arrow" /><span>{refreshing ? 'Wird aktualisiert …' : 'Aktualisieren'}</span>
      </button>
    </header></Reveal>
    <Reveal stage="metric"><section className="in-card is-metrics" aria-label="Arbeitsbestand" aria-busy={refreshing}>
      <Metric value={people.isPending || people.isError ? NaN : peopleList.length} label="Pflegefälle"
        unit={peopleList.length === 1 ? 'Fall' : 'Fälle'}
        explanation="Gespeicherte fiktive Personen" tone="person" />
      <Metric value={unavailableTasks ? NaN : overdue} label="Überfällig" unit={overdue === 1 ? 'Aufgabe' : 'Aufgaben'}
        explanation="Offene Aufgaben vor heute" tone="deadline" />
      <Metric value={unavailableTasks ? NaN : thisWeek} label="Diese Woche" unit={thisWeek === 1 ? 'Aufgabe' : 'Aufgaben'}
        explanation="Fälligkeit Montag bis Sonntag" tone="task" />
    </section></Reveal>

    <Reveal stage="frame" index={1}><section className="in-card is-board" aria-labelledby="is-board-title">
      <CardHead icon={filter.view === 'cases' ? 'person' : 'task'}
        title={filter.view === 'cases' ? 'Fallübersicht' : 'Offene Aufgaben'} id="is-board-title"
        subtitle={`Gespeicherte Daten · sortiert nach ${sortLabel}`}
        end={<Segments label="Arbeitsansicht" value={filter.view} options={[
          { value: 'cases', label: 'Fälle' }, { value: 'tasks', label: 'Aufgaben' },
        ]} onChange={(view) => setFilter({ ...filter, view,
          sort: view === 'tasks' && (filter.sort === 'name' || filter.sort === 'conversations') ? 'deadline' : filter.sort,
        })} />} />
      <div className="is-toolbar">
        <label className="is-select">Person<select value={filter.personId} onChange={(event) => {
          if (!event.target.value || peopleList.some((person) => person.id === event.target.value)) {
            setFilter({ ...filter, personId: event.target.value });
          }
        }}><option value="">Alle Personen</option>{peopleList.map((person) =>
          <option key={person.id} value={person.id}>{baseName(person.name)}</option>)}</select></label>
        <Segments label="Sortieren nach" value={filter.sort} onChange={(sort) => setFilter({ ...filter, sort })}
          options={[
            { value: 'deadline', label: 'Frist' }, { value: 'priority', label: 'Priorität' },
            ...(filter.view === 'cases' ? [
              { value: 'conversations' as const, label: 'Gespräche', disabled: !metrics },
              { value: 'name' as const, label: 'Name' },
            ] : []),
          ]} />
        <Segments label="Dringlichkeit" value={filter.urgentOnly ? 'urgent' : 'all'}
          options={[{ value: 'all', label: 'Alle' }, { value: 'urgent', label: 'Nur dringend' }]}
          onChange={(value) => setFilter({ ...filter, urgentOnly: value === 'urgent' })} />
        {filter.personId || filter.urgentOnly || filter.sort !== 'deadline' ?
          <button className="is-button" type="button" onClick={() => setFilter(DEFAULT_FILTER)}>Zurücksetzen</button> : null}
      </div>
      <details className="is-workbench-slot"><summary><Icon name="settings" />
        <span>Arbeitsansicht per Anfrage</span><Icon name="chevron" size={14} /></summary>
        <InstrumentWorkbench people={peopleList} disabled={blocked} onApply={setFilter} />
      </details>
      {people.isPending || tasks.isPending ? <Loading label="Fälle werden geladen …" lines={4} /> :
        people.isError ? <ErrorState error={people.error} onRetry={() => void people.refetch()} title="Pflegefälle nicht verfügbar" /> :
          tasks.isError ? <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} title="Aufgaben nicht verfügbar" /> :
            filter.view === 'cases' ? filteredPeople.length ?
              <CaseList people={filteredPeople} tasks={taskList} summaries={metrics?.people} onOpen={setSelectedId} /> :
              <EmptyState title={peopleList.length ? 'Keine Fälle für diese Auswahl' : 'Noch keine Pflegefälle gespeichert'}>
                Ändern Sie die Filter oder ergänzen Sie fiktive Pflegefälle in Supabase.
              </EmptyState> : filteredTasks.length ?
              <TaskList people={peopleList} tasks={filteredTasks} onOpen={setSelectedId} /> :
              <EmptyState title="Keine offenen Aufgaben für diese Auswahl">Ändern Sie die Filter oder öffnen Sie die Fallübersicht.</EmptyState>}
      <footer className="is-board-foot"><Icon name="shield" size={15} />
        <span>Dringend = hohe Priorität oder Termin innerhalb von drei Tagen.</span></footer>
    </section></Reveal>

    <Reveal stage="frame" index={2}><UsageAnalysis query={overview} /></Reveal>
    {selected ? <InstrumentCaseDialog key={selected.id} person={selected} tasks={taskList}
      tasksError={tasks.error} onClose={() => setSelectedId(null)} onAsk={ask} /> : null}
    {askId ? <NewConversationDialog key={askId} open onClose={() => setAskId(null)} people={peopleList}
      initialRecipientId={askId} /> : null}
  </Shell>;
}
