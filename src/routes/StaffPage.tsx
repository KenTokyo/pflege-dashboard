import { AlarmClock, ArrowDownWideNarrow, ArrowUpRight, Check, MessageSquareText, RefreshCw, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useDesign } from '../app/ThemeProvider';
import { Select } from '../components/Select';
import { Shell } from '../components/Shell';
import { ErrorState } from '../components/States';
import { useCareRecipients, useOpenTasks } from '../data/queries';
import { InstrumentStaffPage } from '../instrument/sachbearbeitung/InstrumentStaffPage';
import { baseName, daysUntil, formatDate, formatTime, relativeDays } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { CaseDialog } from '../staff/CaseDialog';
import { FilterWorkbench } from '../staff/FilterWorkbench';
import { DEFAULT_FILTER, STAFF_SORTS, compareDeadline, needsAttention, selectPeople, selectTasks, type StaffFilter } from '../staff/model';
import { useStaffOverview } from '../staff/queries';
import '../styles/staff.css';
import { NewConversationDialog } from './chat/NewConversationDialog';
import { Due, EmptyRow, PersonAvatar, PersonDot, PrioIcon, Seg, SkeletonRows, fall } from './dashboard/parts';

const integer = new Intl.NumberFormat('de-DE');
const VIEWS = [['cases', 'Fälle'], ['tasks', 'Aufgaben']] as const;

export function StaffPage() {
  const { design } = useDesign();
  return design === 'instrument' ? <InstrumentStaffPage /> : <TagwerkStaffPage />;
}

function Stat({ icon, label, value, note, tone = '' }: { icon: ReactNode; label: string; value: string; note: string; tone?: string }) {
  return (
    <div className={`sf-stat ${tone}`}>
      <span className="sf-stat-k">{icon}{label}</span>
      <strong className="sf-stat-v">{value}</strong>
      <small className="sf-stat-d">{note}</small>
    </div>
  );
}

function TagwerkStaffPage() {
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
  const stat = (value: number | undefined) => (value === undefined ? '—' : integer.format(value));
  const tasksKnown = !(tasks.isError || tasks.isPending);
  const setView = (view: StaffFilter['view']) =>
    setFilter(view === 'cases' ? { ...filter, view } : { ...filter, view, sort: filter.sort === 'conversations' || filter.sort === 'name' ? 'deadline' : filter.sort });

  let board: ReactNode;
  if (people.isPending || tasks.isPending) board = <SkeletonRows rows={4} label="Fälle werden geladen …" />;
  else if (people.isError) board = <div className="lt-pad"><ErrorState error={people.error} onRetry={() => void people.refetch()} title="Pflegefälle nicht verfügbar" /></div>;
  else if (tasks.isError) board = <div className="lt-pad"><ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} title="Aufgaben nicht verfügbar" /></div>;
  else if (filter.view === 'cases') {
    board = filteredPeople.length ? (
      <div className="sf-cases">
        <div className="lt-cols sf-case-cols" aria-hidden="true">
          <span>Person</span><span>Pflegegrad</span><span>Pflegekasse</span><span>Nächster Termin</span><span>Gespräche</span><span />
        </div>
        <div className="lt-list fx-fall" role="list" aria-label="Pflegefälle">
          {filteredPeople.map((person, i) => {
            const next = taskList.filter((t) => t.care_recipient_id === person.id).sort(compareDeadline)[0];
            const summary = personal.get(person.id);
            const name = baseName(person.name);
            return (
              <article key={person.id} role="listitem" className="lt-li" aria-label={`Fall ${name}`} style={fall(i)}>
                <div className="lt-row sf-case-row">
                  <span className="pp-name">
                    <PersonAvatar id={person.id} people={peopleList} />
                    <h3 className="lt-title">{name}</h3>
                  </span>
                  <span className="pp-grade">{person.care_grade ? `Pflegegrad ${person.care_grade}` : 'Kein Pflegegrad'}</span>
                  <span className="pp-meta">{person.insurerName ? baseName(person.insurerName) : 'Kasse nicht hinterlegt'}</span>
                  <span className="sf-next">
                    {next ? (
                      <>
                        <strong className={next.due_at && daysUntil(next.due_at, now) < 0 ? 'is-over' : needsAttention(next, now) ? 'is-urgent' : ''}>{next.due_at ? relativeDays(daysUntil(next.due_at, now)) : 'Ohne Termin'}</strong>
                        <span>{next.title}</span>
                      </>
                    ) : (
                      <>
                        <strong>Keine offene Aufgabe</strong>
                        <span>Keine Frist gespeichert</span>
                      </>
                    )}
                  </span>
                  <span className="sf-convs">
                    <strong>{summary ? integer.format(summary.conversations) : '—'}</strong>
                    <span>{summary ? `${summary.completedAnswers} echte KI-Antworten` : 'Zahl nicht verfügbar'}</span>
                  </span>
                  <span className="sf-acts">
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => ask(person.id)} aria-label={`KI fragen zu ${name}`}>KI fragen</button>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setSelectedId(person.id)} aria-label={`Fall öffnen: ${name}`}>
                      Fall öffnen
                      <ArrowUpRight className="i" size={14} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    ) : (
      <EmptyRow title={peopleList.length ? 'Keine Fälle für diese Auswahl' : 'Noch keine Pflegefälle gespeichert'}>
        {peopleList.length ? 'Ändern Sie die Person oder den Dringlichkeitsfilter.' : 'Fiktive Pflegefälle werden in Supabase ergänzt.'}
      </EmptyRow>
    );
  } else {
    board = filteredTasks.length ? (
      <>
        <div className="lt-cols sf-task-cols" aria-hidden="true">
          <span /><span>Aufgabe</span><span>Person</span><span>Quelle</span><span className="r">Fällig</span><span />
        </div>
        <ul className="lt-list fx-fall">
          {filteredTasks.map((task, i) => {
            const person = peopleList.find((p) => p.id === task.care_recipient_id);
            return (
              <li key={task.id} className="lt-li" style={fall(i)}>
                <div className="lt-row sf-task-row">
                  <PrioIcon priority={task.priority} />
                  <h3 className="lt-title">{task.title}</h3>
                  {person ? <PersonDot id={person.id} people={peopleList} full /> : <span className="pp-meta">Allgemeine Aufgabe</span>}
                  <span className="lt-src" title={task.deadline_source ?? undefined}>{task.deadline_source ? `Quelle: ${task.deadline_source}` : '—'}</span>
                  <Due task={task} now={now} />
                  <span className="sf-acts">
                    {person ? (
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => setSelectedId(person.id)} aria-label={`Fall öffnen: ${baseName(person.name)} – ${task.title}`}>
                        Fall öffnen
                        <ArrowUpRight size={14} className="i" aria-hidden="true" />
                      </button>
                    ) : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    ) : (
      <EmptyRow title="Keine offenen Aufgaben für diese Auswahl">Ändern Sie die Filter oder öffnen Sie die Fallübersicht.</EmptyRow>
    );
  }

  return (
    <Shell mainClassName="staff-main">
      <div className="pg fx-fall">
        <header className="pg-head" style={fall(0)}>
          <div className="min-w-0">
            <p className="pg-eyebrow">Gemeinsamer Demo-Arbeitsbereich</p>
            <h1>Die richtigen Fälle im Blick.</h1>
            <p className="pg-sub">Sachbearbeiter-Test · Dieser Sichtwechsel ändert keine Zugriffsrechte.</p>
          </div>
          <div className="pg-acts">
            <button type="button" className="btn btn-secondary" onClick={refresh} disabled={refreshing}>
              <RefreshCw className="i" size={14} aria-hidden="true" />
              {refreshing ? 'Wird aktualisiert …' : 'Aktualisieren'}
            </button>
          </div>
        </header>

        <section className="sf-stats" aria-label="Überblick aus gespeicherten Daten" aria-busy={refreshing} style={fall(1)}>
          <Stat icon={<Users size={14} className="i" aria-hidden="true" />} label="Pflegefälle" value={stat(people.isError ? undefined : people.data?.length)} note="Fiktive Personen" />
          <Stat icon={<AlarmClock size={14} className="i" aria-hidden="true" />} label="Dringende Aufgaben" value={stat(tasksKnown ? urgent : undefined)}
            note={tasksKnown ? `von ${integer.format(taskList.length)} offenen Aufgaben` : 'Aufgaben noch unbekannt'} tone={tasksKnown && urgent ? 'is-bad' : ''} />
          <Stat icon={<MessageSquareText size={14} className="i" aria-hidden="true" />} label="Gespeicherte Gespräche" value={stat(metrics?.totals.conversations)} note="Mit Beispielen und Archiv" />
          <Stat icon={<Check size={14} className="i" aria-hidden="true" />} label="Abgeschlossene KI-Aufrufe" value={stat(metrics?.totals.completedRequests)} note="Tatsächlich ausgeführt" />
        </section>

        <details className="lt-panel sf-workbench-slot" style={fall(2)}>
          <summary>
            <span className="sf-sum-t">Arbeitsansicht per Anfrage</span>
            <span className="sf-sum-d">Person und Sortierung in eigenen Worten wählen</span>
          </summary>
          <FilterWorkbench people={peopleList} disabled={dataBlocked} onApply={setFilter} />
        </details>

        <section className="lt-panel sf-board" aria-labelledby="staff-board-title" style={fall(3)}>
          <header className="lt-head">
            <h2 id="staff-board-title">
              {filter.view === 'cases' ? 'Ihre Fälle' : 'Offene Aufgaben'}
              <span className="lt-count">{dataBlocked ? '—' : filter.view === 'cases' ? filteredPeople.length : filteredTasks.length}</span>
            </h2>
            <p className="lt-head-note">Dringend: hohe Priorität oder Termin innerhalb von drei Tagen.</p>
            <div className="lt-acts">
              <Seg label="Arbeitsansicht" value={filter.view} options={VIEWS} onChange={setView} />
            </div>
          </header>
          <div className="sf-toolbar">
            <div className="sf-select">
              <span id="staff-person-label">Person</span>
              <Select aria-labelledby="staff-person-label" size="sm" className="sel-field" value={filter.personId}
                onChange={(personId) => { if (personId === '' || peopleList.some((p) => p.id === personId)) setFilter({ ...filter, personId }); }}
                options={[{ value: '', label: 'Alle Personen' }, ...peopleList.map((p) => ({ value: p.id, label: baseName(p.name) }))]} />
            </div>
            <div className="sf-select">
              <span id="staff-sort-label"><ArrowDownWideNarrow className="i" size={14} aria-hidden="true" />Sortieren nach</span>
              <Select aria-labelledby="staff-sort-label" size="sm" className="sel-field" value={filter.sort}
                onChange={(sort) => { if (STAFF_SORTS.includes(sort)) setFilter({ ...filter, sort }); }}
                options={[{ value: 'deadline', label: 'Nächster Frist' }, { value: 'priority', label: 'Priorität' },
                  ...(filter.view === 'cases' ? [{ value: 'conversations' as const, label: 'Gesprächszahl', disabled: !metrics }, { value: 'name' as const, label: 'Name' }] : [])]} />
            </div>
            <label className="sf-check">
              <input type="checkbox" checked={filter.urgentOnly} onChange={(e) => setFilter({ ...filter, urgentOnly: e.target.checked })} />
              Nur dringend
            </label>
            {filter.personId || filter.urgentOnly || filter.sort !== 'deadline' ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilter(DEFAULT_FILTER)}>Zurücksetzen</button>
            ) : null}
          </div>
          {board}
        </section>

        <section className="lt-panel sf-usage" aria-labelledby="staff-usage-title" style={fall(4)}>
          <header className="lt-head">
            <h2 id="staff-usage-title">Echte Modellnutzung</h2>
            <p className="lt-head-note">Gesamter Arbeitsbereich · gespeicherter Stand{metrics ? ` ${formatDate(metrics.generatedAt)}, ${formatTime(metrics.generatedAt)} Uhr` : ''}</p>
            <div className="lt-acts"><span className="lt-chip">Supabase</span></div>
          </header>
          {overview.isPending ? (
            <SkeletonRows rows={2} label="Modellnutzung wird geladen …" />
          ) : overview.isError ? (
            <div className="lt-pad"><ErrorState title="Gesprächszahlen und Modellnutzung nicht verfügbar" error={overview.error} onRetry={() => void overview.refetch()} /></div>
          ) : metrics ? (
            <>
              <p className="sf-totals">
                {integer.format(metrics.totals.requests)} echte Anfragen <span>·</span> {integer.format(metrics.totals.completedRequests)} abgeschlossen <span>·</span>{' '}
                {integer.format(metrics.totals.failedRequests)} fehlgeschlagen <span>·</span> {integer.format(metrics.totals.interruptedRequests)} unterbrochen
              </p>
              {metrics.usage.length ? (
                <>
                  <div className="lt-cols sf-use-cols" aria-hidden="true"><span>Modell</span><span className="r">Nutzungen</span><span className="r">Tokens</span></div>
                  <ul className="lt-list">
                    {metrics.usage.map((model) => (
                      <li key={model.modelId} className="lt-li">
                        <div className="lt-row sf-use-row">
                          <span className="sf-use-name"><strong>{model.displayName}</strong><span>{model.provider} · {model.providerModelId}</span></span>
                          <span className="sf-num"><strong>{integer.format(model.requests)}</strong><span>erfasste Nutzungen</span></span>
                          <span className="sf-num"><strong>{integer.format(model.inputTokens + model.outputTokens)}</strong><span>Tokens · {integer.format(model.inputTokens)} ein / {integer.format(model.outputTokens)} aus</span></span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyRow title="Noch keine abgeschlossene Modellnutzung gespeichert." />
              )}
              <p className="sf-usage-note">Tokens sind Textbausteine des Modells. Beispielgespräche zählen als gespeicherte Gespräche, aber nicht als echte KI-Aufrufe. Abokosten lassen sich daraus nicht zuverlässig berechnen.</p>
            </>
          ) : null}
        </section>
      </div>
      {selected ? <CaseDialog key={selected.id} person={selected} tasks={taskList} tasksError={tasks.error} onClose={() => setSelectedId(null)} onAsk={ask} /> : null}
      {askId ? <NewConversationDialog key={askId} open onClose={() => setAskId(null)} people={peopleList} initialRecipientId={askId} /> : null}
    </Shell>
  );
}
