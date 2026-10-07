import { AlarmClock, ArrowDownWideNarrow, ArrowUpRight, BriefcaseBusiness, Check, MessageSquareText, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';
import { Shell } from '../components/Shell';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useCareRecipients, useOpenTasks } from '../data/queries';
import { baseName, daysUntil, formatDate, formatTime, initials, relativeDays } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { CaseDialog } from '../staff/CaseDialog';
import { FilterWorkbench } from '../staff/FilterWorkbench';
import { DEFAULT_FILTER, PRIORITY_LABEL, STAFF_SORTS, compareDeadline, needsAttention, selectPeople, selectTasks, type StaffFilter } from '../staff/model';
import { useStaffOverview } from '../staff/queries';
import { NewConversationDialog } from './chat/NewConversationDialog';

const integer = new Intl.NumberFormat('de-DE');

export function StaffPage() {
  useDocumentTitle('Sachbearbeiter-Test');
  const people = useCareRecipients();
  const tasks = useOpenTasks();
  const overview = useStaffOverview();
  const [filter, setFilter] = useState<StaffFilter>(DEFAULT_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [askId, setAskId] = useState<string | null>(null);
  const now = new Date();
  const peopleList = people.data ?? [];
  const taskList = tasks.data ?? [];
  const metrics = overview.isError ? undefined : overview.data;
  const counts = new Map(metrics?.people.map((p) => [p.id, p.conversations]));
  const personal = new Map(metrics?.people.map((p) => [p.id, p]));
  const filteredTasks = selectTasks(taskList, filter, now);
  const filteredPeople = selectPeople(peopleList, taskList, counts, filter, now);
  const selected = peopleList.find((p) => p.id === selectedId);
  const refreshing = people.isFetching || tasks.isFetching || overview.isFetching;
  const dataBlocked = people.isPending || tasks.isPending || people.isError || tasks.isError;
  const urgent = taskList.filter((t) => needsAttention(t, now)).length;
  const refresh = () => { void people.refetch(); void tasks.refetch(); void overview.refetch(); };
  const ask = (id: string) => { setSelectedId(null); setAskId(id); };
  const stat = (value: number | undefined) => value === undefined ? '—' : integer.format(value);

  return <Shell mainClassName="staff-main">
    <header className="page-head staff-page-head"><div><p className="eyebrow">Gemeinsamer Demo-Arbeitsbereich</p><h1>Die richtigen Fälle im Blick.</h1><p className="staff-intro">Sachbearbeiter-Test · Dieser Sichtwechsel ändert keine Zugriffsrechte.</p></div><button type="button" className="btn btn-secondary" onClick={refresh} disabled={refreshing}><RefreshCw className="i" size={16} aria-hidden="true" />{refreshing ? 'Wird aktualisiert …' : 'Aktualisieren'}</button></header>

    <section className="staff-metrics" aria-label="Überblick aus gespeicherten Daten" aria-busy={refreshing}>
      <div className="staff-metric"><span className="staff-metric-icon"><Users size={18} className="i" aria-hidden="true" /></span><div><span>Pflegefälle</span><strong>{stat(people.isError ? undefined : people.data?.length)}</strong><small>Fiktive Personen</small></div></div>
      <div className="staff-metric staff-metric-urgent"><span className="staff-metric-icon"><AlarmClock size={18} className="i" aria-hidden="true" /></span><div><span>Dringende Aufgaben</span><strong>{stat(tasks.isError || tasks.isPending ? undefined : urgent)}</strong><small>{tasks.isError || tasks.isPending ? 'Aufgaben noch unbekannt' : `von ${integer.format(taskList.length)} offenen Aufgaben`}</small></div></div>
      <div className="staff-metric"><span className="staff-metric-icon"><MessageSquareText size={18} className="i" aria-hidden="true" /></span><div><span>Gespeicherte Gespräche</span><strong>{stat(metrics?.totals.conversations)}</strong><small>Mit Beispielen und Archiv</small></div></div>
      <div className="staff-metric staff-metric-success"><span className="staff-metric-icon"><Check size={18} className="i" aria-hidden="true" /></span><div><span>Abgeschlossene KI-Aufrufe</span><strong>{stat(metrics?.totals.completedRequests)}</strong><small>Tatsächlich ausgeführt</small></div></div>
    </section>

    <details className="staff-workbench-slot"><summary>Arbeitsansicht per Anfrage<span>Person und Sortierung in eigenen Worten wählen</span></summary><FilterWorkbench people={peopleList} disabled={dataBlocked} onApply={setFilter} /></details>

    <section className="staff-board" aria-labelledby="staff-board-title">
      <header className="staff-section-head"><div><h2 id="staff-board-title">{filter.view === 'cases' ? 'Ihre Fälle' : 'Offene Aufgaben'}<span className="count">{dataBlocked ? '—' : filter.view === 'cases' ? filteredPeople.length : filteredTasks.length}</span></h2><p>Dringend: hohe Priorität oder Termin innerhalb von drei Tagen.</p></div><div className="staff-tabs" aria-label="Arbeitsansicht"><button type="button" aria-pressed={filter.view === 'cases'} onClick={() => setFilter({ ...filter, view: 'cases' })}><BriefcaseBusiness size={16} className="i" aria-hidden="true" />Fälle</button><button type="button" aria-pressed={filter.view === 'tasks'} onClick={() => setFilter({ ...filter, view: 'tasks', sort: filter.sort === 'conversations' || filter.sort === 'name' ? 'deadline' : filter.sort })}><AlarmClock size={16} className="i" aria-hidden="true" />Aufgaben</button></div></header>
      <div className="staff-toolbar"><label className="staff-select">Person<select value={filter.personId} onChange={(e) => { if (e.target.value === '' || peopleList.some((p) => p.id === e.target.value)) setFilter({ ...filter, personId: e.target.value }); }}><option value="">Alle Personen</option>{peopleList.map((p) => <option key={p.id} value={p.id}>{baseName(p.name)}</option>)}</select></label><label className="staff-select"><span><ArrowDownWideNarrow className="i" size={14} aria-hidden="true" />Sortieren nach</span><select value={filter.sort} onChange={(e) => { const sort = STAFF_SORTS.find((v) => v === e.target.value); if (sort) setFilter({ ...filter, sort }); }}><option value="deadline">Nächster Frist</option><option value="priority">Priorität</option>{filter.view === 'cases' ? <><option value="conversations" disabled={!metrics}>Gesprächszahl</option><option value="name">Name</option></> : null}</select></label><label className="staff-checkbox"><input type="checkbox" checked={filter.urgentOnly} onChange={(e) => setFilter({ ...filter, urgentOnly: e.target.checked })} />Nur dringend</label>{filter.personId || filter.urgentOnly || filter.sort !== 'deadline' ? <button type="button" className="btn btn-ghost" onClick={() => setFilter(DEFAULT_FILTER)}>Zurücksetzen</button> : null}</div>
      {people.isPending || tasks.isPending ? <Loading label="Fälle werden geladen …" lines={4} /> : people.isError ? <ErrorState error={people.error} onRetry={() => void people.refetch()} title="Pflegefälle nicht verfügbar" /> : tasks.isError ? <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} title="Aufgaben nicht verfügbar" /> : filter.view === 'cases' ? filteredPeople.length ? <div className="staff-cases" role="list" aria-label="Pflegefälle">
        <div className="staff-case-heading" aria-hidden="true"><span>Person / Pflegekasse</span><span>Nächster Termin</span><span>Gespräche</span><span>Aktionen</span></div>
        {filteredPeople.map((person, index) => {
          const personTasks = taskList.filter((t) => t.care_recipient_id === person.id).sort(compareDeadline);
          const next = personTasks[0];
          const summary = personal.get(person.id);
          return <article key={person.id} role="listitem" className="staff-case-row" aria-label={`Fall ${baseName(person.name)}`}><div className="staff-person"><span className={`staff-avatar staff-avatar-${index % 3}`} aria-hidden="true">{initials(person.name)}</span><div><h3>{baseName(person.name)}</h3><p>{person.care_grade ? `Pflegegrad ${person.care_grade}` : 'Kein Pflegegrad'} · {person.insurerName ? baseName(person.insurerName) : 'Kasse nicht hinterlegt'}</p></div></div><div className="staff-next">{next ? <><strong className={needsAttention(next, now) ? 'staff-text-urgent' : ''}>{next.due_at ? relativeDays(daysUntil(next.due_at, now)) : 'Ohne Termin'}</strong><span>{next.title}</span></> : <><strong>Keine offene Aufgabe</strong><span>Keine Frist gespeichert</span></>}</div><div className="staff-conversation-count"><strong>{summary ? integer.format(summary.conversations) : '—'}</strong><span>{summary ? `${summary.completedAnswers} echte KI-Antworten` : 'Zahl nicht verfügbar'}</span></div><div className="staff-row-actions"><button className="btn btn-secondary" type="button" onClick={() => setSelectedId(person.id)} aria-label={`Fall öffnen: ${baseName(person.name)}`}>Fall öffnen<ArrowUpRight className="i" size={15} aria-hidden="true" /></button><button className="btn btn-ghost" type="button" onClick={() => ask(person.id)} aria-label={`KI fragen zu ${baseName(person.name)}`}>KI fragen</button></div></article>;
        })}
      </div> : <EmptyState title={peopleList.length ? 'Keine Fälle für diese Auswahl' : 'Noch keine Pflegefälle gespeichert'}><span>{peopleList.length ? 'Ändern Sie die Person oder den Dringlichkeitsfilter.' : 'Fiktive Pflegefälle werden in Supabase ergänzt.'}</span></EmptyState> : filteredTasks.length ? <ul className="staff-task-list">{filteredTasks.map((task) => {
        const person = peopleList.find((p) => p.id === task.care_recipient_id);
        return <li key={task.id}><div className="staff-task-title"><span className={`staff-priority staff-priority-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span><h3>{task.title}</h3><p>{person ? baseName(person.name) : 'Allgemeine Aufgabe'}</p>{task.deadline_source ? <small>Quelle: {task.deadline_source}</small> : null}</div><div className="staff-task-due"><strong>{task.due_at ? formatDate(task.due_at) : 'Ohne Termin'}</strong><span className={needsAttention(task, now) ? 'staff-text-urgent' : ''}>{task.due_at ? relativeDays(daysUntil(task.due_at, now)) : 'Keine Frist gespeichert'}</span></div>{person ? <button className="btn btn-secondary" type="button" onClick={() => setSelectedId(person.id)} aria-label={`Fall öffnen: ${baseName(person.name)} – ${task.title}`}>Fall öffnen<ArrowUpRight size={15} className="i" aria-hidden="true" /></button> : null}</li>;
      })}</ul> : <EmptyState title="Keine offenen Aufgaben für diese Auswahl"><span>Ändern Sie die Filter oder öffnen Sie die Fallübersicht.</span></EmptyState>}
    </section>

    <section className="staff-usage" aria-labelledby="staff-usage-title"><header className="staff-section-head"><div><h2 id="staff-usage-title">Echte Modellnutzung</h2><p>Gesamter Arbeitsbereich · gespeicherter Stand{metrics ? ` ${formatDate(metrics.generatedAt)}, ${formatTime(metrics.generatedAt)} Uhr` : ''}</p></div><span className="staff-source">Supabase</span></header>
      {overview.isPending ? <Loading lines={2} /> : overview.isError ? <ErrorState title="Gesprächszahlen und Modellnutzung nicht verfügbar" error={overview.error} onRetry={() => void overview.refetch()} /> : metrics ? <>
        <p className="staff-usage-totals">{integer.format(metrics.totals.requests)} echte Anfragen <span>·</span> {integer.format(metrics.totals.completedRequests)} abgeschlossen <span>·</span> {integer.format(metrics.totals.failedRequests)} fehlgeschlagen <span>·</span> {integer.format(metrics.totals.interruptedRequests)} unterbrochen</p>
        {metrics.usage.length ? <ul className="staff-usage-list">{metrics.usage.map((model) => <li key={model.modelId}><div><strong>{model.displayName}</strong><span>{model.provider} · {model.providerModelId}</span></div><div><strong>{integer.format(model.requests)}</strong><span>erfasste Nutzungen</span></div><div><strong>{integer.format(model.inputTokens + model.outputTokens)}</strong><span>Tokens · {integer.format(model.inputTokens)} ein / {integer.format(model.outputTokens)} aus</span></div></li>)}</ul> : <p className="muted">Noch keine abgeschlossene Modellnutzung gespeichert.</p>}
        <p className="small muted staff-usage-note">Tokens sind Textbausteine des Modells. Beispielgespräche zählen als gespeicherte Gespräche, aber nicht als echte KI-Aufrufe. Abokosten lassen sich daraus nicht zuverlässig berechnen.</p>
      </> : null}
    </section>
    {selected ? <CaseDialog key={selected.id} person={selected} tasks={taskList} tasksError={tasks.error} onClose={() => setSelectedId(null)} onAsk={ask} /> : null}
    {askId ? <NewConversationDialog key={askId} open onClose={() => setAskId(null)} people={peopleList} initialRecipientId={askId} /> : null}
  </Shell>;
}
