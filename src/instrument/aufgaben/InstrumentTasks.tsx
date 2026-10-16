import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Shell } from '../../components/Shell';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { isUrgent, recipientName, sortTasks } from '../../data/model';
import { useCareRecipients, useOpenTasks } from '../../data/queries';
import { baseName, daysUntil } from '../../lib/format';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Segments } from '../grundlage/Segments';
import { Timeline } from '../grundlage/Timeline';
import { PageHeading, Panel } from '../uebersicht/Panel';
import './aufgaben.css';

type Filter = 'all' | 'urgent' | 'week';
const priorityLabels = { urgent: 'Dringend', high: 'Hoch', normal: 'Normal', low: 'Niedrig' };
const priorityLevels = { urgent: 4, high: 3, normal: 2, low: 1 };

export function InstrumentTasks() {
  const tasks = useOpenTasks();
  const people = useCareRecipients();
  const [filter, setFilter] = useState<Filter>('all');
  const now = new Date();
  const all = sortTasks(tasks.data ?? []);
  const list = all.filter(t => {
    const days = t.due_at ? daysUntil(t.due_at, now) : null;
    if (filter === 'urgent') return isUrgent(t, days);
    if (filter === 'week') return days !== null && days <= 7;
    return true;
  });
  const overdue = all.filter(t => t.due_at && daysUntil(t.due_at, now) < 0).length;
  const week = all.filter(t => t.due_at && daysUntil(t.due_at, now) >= 0 && daysUntil(t.due_at, now) <= 7).length;
  const undated = all.filter(t => !t.due_at).length;
  return <Shell><div className="ib-page">
    <PageHeading title="Aufgaben" subtitle="Offene Aufgaben · nach Dringlichkeit sortiert" />
    <Reveal stage="metric" className="in-card ib-metrics" aria-label="Fälligkeit offener Aufgaben">
      <Metric value={tasks.data ? overdue : NaN} label="Überfällig · vor heute" unit={overdue === 1 ? 'Aufgabe' : 'Aufgaben'}
        tone={overdue ? 'danger' : 'deadline'} />
      <Metric value={tasks.data ? week : NaN} label="Heute bis in 7 Tagen" unit={week === 1 ? 'Aufgabe' : 'Aufgaben'} tone="deadline" />
      <Metric value={tasks.data ? undated : NaN} label="Ohne Datum" unit={undated === 1 ? 'Aufgabe' : 'Aufgaben'} tone="task" />
    </Reveal>
    <p className="ib-advice"><Icon name="shield" /><span>Termine stammen aus gespeicherten Aufgaben.
      Bitte mit dem Bescheid abgleichen; die App berechnet keine Rechtsfristen.</span></p>
    <div className="ib-toolbar"><Segments label="Aufgaben filtern" value={filter} onChange={setFilter}
      options={[{ value: 'all', label: 'Alle' }, { value: 'urgent', label: 'Dringend' }, { value: 'week', label: 'Nächste 7 Tage' }]} />
      <span className="ib-muted">{tasks.data ? `${list.length} von ${all.length} Aufgaben`
        : tasks.isError ? 'Bestand nicht geladen' : 'Bestand wird geladen'}</span>
    </div>
    <Panel icon="task" title="Was ist zu erledigen?" subtitle="Aufgabe, Priorität und gespeicherte Quelle"
      end={<span className="ib-register-label">OFFENE AUFGABEN</span>}>
      {tasks.isPending ? <Loading />
        : tasks.isError ? <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} /> :
        !list.length ? <EmptyState title={filter === 'all' ? 'Keine offenen Aufgaben' : 'Keine Aufgaben in diesem Filter'} spray={false} /> :
          <><Reveal stage="metric" className="ib-task-lead"><Metric value={list.length}
            unit={list.length === 1 ? 'Aufgabe' : 'Aufgaben'} label="In dieser Ansicht" tone="task" />
            <span className="ib-muted">Termine im Zeitverlauf</span></Reveal>
          <div className="ib-task-layout">
            <ul className="ib-task-list">{list.map((t, index) => <li key={t.id} id={`aufgabe-${t.id}`}>
              <Reveal stage="data" index={Math.min(index, 5)}>
                <div className="ib-task-title"><span className="ib-row-number">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{t.title}</h3></div>
                <div className="ib-task-meta"><span className="ib-priority" data-priority={t.priority}>
                  <span aria-hidden="true">{[1, 2, 3, 4].map(level => <i key={level} data-filled={level <= priorityLevels[t.priority]} />)}</span>
                  {priorityLabels[t.priority]}</span>
                  <span>{baseName(recipientName(t.care_recipient_id, people.data ?? []) ??
                    (people.isError ? 'Person nicht geladen' : people.isPending ? 'Person wird geladen' : 'Allgemein'))}</span>
                  {t.kind === 'handover' ? <span className="ib-tag">Übergabe</span> : null}</div>
                {t.description ? <p className="ib-task-description">{t.description}</p> : null}
                <p className="ib-source">Quelle: {t.deadline_source || 'Nicht hinterlegt'}{!t.due_at ? ' · Ohne Termin' : ''}</p>
                {t.conversation_id ? <Link to="/gespraeche/$conversationId" params={{ conversationId: t.conversation_id }}
                  className="ib-button ib-task-action"><Icon name="conversation" size={16} /><span>Quellgespräch öffnen</span></Link> : null}
              </Reveal>
            </li>)}</ul>
            <section className="ib-task-timeline" aria-label="Fälligkeiten im Zeitverlauf">
              <div className="ib-task-timeline-heading"><Icon name="deadline" /><h3>Wann ist es fällig?</h3></div>
              {list.some(t => t.due_at) ? <Timeline today={now} items={list.filter(t => t.due_at).map(t => ({
                id: t.id, date: t.due_at ?? '', label: t.title, thing: 'deadline',
              }))} /> : <p className="ib-note">Für diese Aufgaben ist kein Termin hinterlegt.</p>}
            </section>
          </div></>}
    </Panel>
  </div></Shell>;
}
