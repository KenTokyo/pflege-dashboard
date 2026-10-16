import { Link } from '@tanstack/react-router';
import { useWorkspace } from '../../auth/AuthProvider';
import { DOC_KIND_LABEL, DOC_STATUS_LABEL, isUrgent, nextTaskFor, recipientName, sortTasks } from '../../data/model';
import { useCareRecipients, useConversations, useDocuments, useOpenTasks } from '../../data/queries';
import { ageFrom, baseName, daysUntil, formatDate, formatLongDate, formatShortDate, greeting, initials, listWhen, relativeDays } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import type { CareRecipient, TaskRow } from '../../services/types';
import { CountUp } from '../CountUp';
import { Shell } from '../Shell';
import { ErrorState, Loading } from '../States';
import { InstrumentAsk } from './InstrumentAsk';
import { InstrumentHead, InstrumentIcon, type InstrumentKind } from './InstrumentIcon';

function Metric({ label, value, kind }: { label: string; value: number | undefined; kind: InstrumentKind }) {
  return <div className="in-metric" tabIndex={0} aria-describedby={`metric-${kind}`}><InstrumentIcon kind={kind} size={17} /><span>{label}</span><strong className="in-number" aria-label={value === undefined ? 'Noch nicht geladen' : String(value)}>{value === undefined ? '–' : <span aria-hidden="true"><CountUp value={value} duration={0.7} /></span>}</strong><span className="in-tooltip" role="tooltip" id={`metric-${kind}`}>{value === undefined ? 'Bestand noch nicht geladen' : `${label}: ${value} im Arbeitsbereich`}</span></div>;
}

function Person({ person, task, tasksKnown, now }: { person: CareRecipient; task: TaskRow | null; tasksKnown: boolean; now: Date }) {
  const age = ageFrom(person.birth_date, now);
  return <article className="in-person">
    <div className="in-person-name"><span className="in-avatar in-person-avatar">{initials(person.name)}</span><div><h3>{baseName(person.name)}</h3><p>{[age === null ? null : `${age} Jahre`, person.name.includes('fiktiv') ? 'fiktive Person' : null].filter(Boolean).join(' · ')}</p></div></div>
    <div className="in-person-facts"><div><span>Pflegegrad</span><strong className="in-number">{person.care_grade === 0 ? 'Keiner' : String(person.care_grade).padStart(2, '0')}</strong><div className="in-grade" aria-label={`Pflegegrad ${person.care_grade} von 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} data-filled={n <= person.care_grade} />)}</div></div><div><span>Pflegekasse</span><strong>{person.insurerName ? baseName(person.insurerName) : 'Nicht hinterlegt'}</strong></div></div>
    <div className="in-person-next"><InstrumentIcon kind="deadline" size={16} /><div><span>Nächster offener Termin</span><strong>{!tasksKnown ? 'Termine noch nicht verfügbar' : task?.due_at ? formatDate(task.due_at) : 'Kein Termin hinterlegt'}</strong></div>{task?.due_at && tasksKnown ? <span className={`in-small-badge ${isUrgent(task, daysUntil(task.due_at, now)) ? 'in-badge-danger' : ''}`}>{relativeDays(daysUntil(task.due_at, now))}</span> : null}</div>
  </article>;
}

function Deadline({ task, people, now }: { task: TaskRow; people: CareRecipient[]; now: Date }) {
  const due = task.due_at;
  if (!due) return null;
  const days = daysUntil(due, now);
  const overdue = days < 0;
  const urgent = isUrgent(task, days);
  return <div className={`in-deadline-body ${urgent ? 'in-is-urgent' : ''}`}>
    <div className="in-deadline-value"><strong className="in-number" aria-label={relativeDays(days)}><span aria-hidden="true"><CountUp value={Math.abs(days)} duration={0.7} /></span></strong><div><span>{days === 0 ? 'Heute fällig' : days === 1 ? 'Tag verbleibend' : overdue ? Math.abs(days) === 1 ? 'Tag überfällig' : 'Tage überfällig' : 'Tage verbleibend'}</span><small>{formatDate(due)}</small></div><span className={`in-small-badge ${urgent ? 'in-badge-danger' : ''}`}>{overdue ? 'Bitte prüfen' : urgent ? 'Dringend' : 'Geplant'}</span></div>
    <h3>{task.title}</h3><p className="in-subtitle">{baseName(recipientName(task.care_recipient_id, people) ?? 'Allgemein')}</p>
    <div className="in-deadline-line" aria-hidden="true"><span className="in-line-point" /><div className="in-line-hatch" /><span className="in-line-today" /></div>
    <div className="in-axis"><span>{overdue ? `Termin · ${formatShortDate(due)}` : 'Heute'}</span><span>{overdue ? 'Heute' : `Termin · ${formatShortDate(due)}`}</span></div>
    <div className="in-deadline-source"><InstrumentIcon kind="shield" size={14} /><span>{task.deadline_source ? `Quelle: ${task.deadline_source}` : 'Keine Fristquelle hinterlegt.'}</span></div>
    <p className="in-source-note">Gespeicherter Termin. Rechtsfrist bitte im Originalbescheid prüfen.</p>
  </div>;
}

export function InstrumentDashboard() {
  useDocumentTitle('Übersicht');
  const { profile } = useWorkspace();
  const people = useCareRecipients();
  const tasks = useOpenTasks();
  const docs = useDocuments();
  const conversations = useConversations(false);
  const now = new Date();
  const peopleList = people.data ?? [];
  const sorted = sortTasks(tasks.data ?? []);
  const focus = sorted.find((t) => t.due_at && /widerspruch/i.test(t.title)) ?? sorted.find((t) => t.due_at);
  const urgentCount = sorted.filter((t) => isUrgent(t, t.due_at ? daysUntil(t.due_at, now) : null)).length;
  const draftCount = docs.data?.filter((d) => d.status === 'draft').length ?? 0;
  return <Shell><div className="in-dashboard">
    <header className="in-page-head"><div><p className="in-eyebrow">{greeting(now)}, {baseName(profile.displayName)}</p><h1>Ihr Pflegealltag. Im Blick.</h1><p>Was ansteht, was wichtig ist und wie es weitergeht.</p></div><time className="in-date" dateTime={now.toISOString()}><InstrumentIcon kind="deadline" size={16} />{formatLongDate(now)}</time></header>
    <div className="in-metrics" aria-label="Überblick über Ihren Arbeitsbereich"><Metric kind="person" label="Pflegebedürftige" value={people.data?.length} /><Metric kind="task" label="Offene Aufgaben" value={tasks.data?.length} /><Metric kind="document" label="Dokumente" value={docs.data?.length} /><Metric kind="conversation" label="Gespräche" value={conversations.data?.length} /></div>
    <div className="in-grid">
      <section className="in-card in-deadline" aria-label="Wichtiger Termin"><InstrumentHead kind="deadline" title={focus && /widerspruch/i.test(focus.title) ? 'Widerspruch im Blick' : 'Nächste Frist im Blick'} subtitle="Ihr nächster wichtiger Schritt"><Link to="/aufgaben" className="in-head-link" aria-label="Alle Fristen ansehen"><InstrumentIcon kind="arrow" size={17} /></Link></InstrumentHead>{tasks.isPending ? <div className="in-pad"><Loading /></div> : tasks.isError ? <div className="in-pad"><ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} /></div> : focus ? <Deadline task={focus} people={peopleList} now={now} /> : <p className="in-empty">Keine offene Frist hinterlegt. Neue Termine erscheinen hier.</p>}</section>
      <section className="in-card in-people" aria-label="Pflegebedürftige"><InstrumentHead kind="person" title="Für wen Sie da sind" subtitle="Pflegebedürftige in Ihrem Arbeitsbereich"><span className="in-small-badge">{people.data?.length ?? '–'}</span></InstrumentHead>{people.isPending ? <div className="in-pad"><Loading /></div> : people.isError ? <div className="in-pad"><ErrorState error={people.error} onRetry={() => void people.refetch()} /></div> : peopleList.length === 0 ? <p className="in-empty">Noch keine Pflegebedürftigen hinterlegt. Personen werden von der Verwaltung angelegt.</p> : peopleList.map((person) => <Person key={person.id} person={person} task={nextTaskFor(person.id, sorted)} tasksKnown={tasks.isSuccess} now={now} />)}</section>
      <InstrumentAsk />
      <section className="in-card in-tasks" aria-label="Offene Aufgaben und Fristen"><InstrumentHead kind="task" title="Was jetzt ansteht" subtitle="Offene Aufgaben · nach Dringlichkeit"><span className={`in-small-badge ${tasks.isSuccess && urgentCount ? 'in-badge-danger' : ''}`}>{tasks.isSuccess ? `${urgentCount} dringend` : '–'}</span></InstrumentHead>
        {tasks.isPending ? <div className="in-pad"><Loading /></div> : tasks.isError ? <div className="in-pad"><ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} /></div> : sorted.length === 0 ? <p className="in-empty">Alles erledigt. Es gibt keine offenen Aufgaben.</p> : <ul className="in-list">{sorted.slice(0, 5).map((task) => { const days = task.due_at ? daysUntil(task.due_at, now) : null; const urgent = isUrgent(task, days); return <li key={task.id}><Link to="/aufgaben" className="in-task-row"><span className={`in-task-indicator ${urgent ? 'in-is-urgent' : ''}`} /><div className="in-row-main"><strong>{task.title}</strong><span>{baseName(recipientName(task.care_recipient_id, peopleList) ?? 'Allgemein')}{task.deadline_source ? ` · ${task.deadline_source}` : ''}</span></div><div className="in-task-date"><time className="in-number">{task.due_at ? formatShortDate(task.due_at) : '–'}</time><span className={urgent ? 'in-danger' : ''}>{days === null ? 'Ohne Termin' : relativeDays(days)}</span></div><InstrumentIcon kind="chevron" size={15} /></Link></li>; })}</ul>}
        <footer className="in-card-foot"><span>Fristen beruhen auf Ihren gespeicherten Angaben.</span><Link to="/aufgaben">Alle Aufgaben<InstrumentIcon kind="arrow" size={15} /></Link></footer>
      </section>
      <section className="in-card in-documents" aria-label="Zuletzt erstellte Dokumente"><InstrumentHead kind="document" title="Ihre letzten Dokumente" subtitle="Gespeicherte Schreiben und ihr Status"><Link to="/dokumente" className="in-head-link">Alle ansehen<InstrumentIcon kind="arrow" size={15} /></Link></InstrumentHead>{docs.isPending ? <div className="in-pad"><Loading /></div> : docs.isError ? <div className="in-pad"><ErrorState error={docs.error} onRetry={() => void docs.refetch()} /></div> : docs.data.length === 0 ? <p className="in-empty">Noch keine Dokumente. Gespeicherte Schreiben erscheinen hier mit Status.</p> : <ul className="in-list">{docs.data.slice(0, 4).map((doc) => <li key={doc.id}><Link to="/dokumente" hash={`dok-${doc.id}`} className="in-document-row"><span className="in-document-symbol"><InstrumentIcon kind="document" size={22} /></span><div className="in-row-main"><strong>{doc.title}</strong><span>{DOC_KIND_LABEL[doc.kind]} · {baseName(recipientName(doc.care_recipient_id, peopleList) ?? 'Allgemein')}</span></div><span className={`in-small-badge in-status-${doc.status}`}>{DOC_STATUS_LABEL[doc.status]}</span><time className="in-number in-list-date">{listWhen(doc.created_at, now)}</time><InstrumentIcon kind="chevron" size={15} /></Link></li>)}</ul>}
        <div className="in-document-summary">{docs.isSuccess ? <><span><i className="in-status-dot" />{draftCount} {draftCount === 1 ? 'Entwurf' : 'Entwürfe'}</span><span>{docs.data.filter((d) => d.status === 'reviewed').length} geprüft</span><span>{docs.data.filter((d) => d.status === 'sent').length} versendet</span></> : <span>Dokumentstatus wird geladen.</span>}</div>
      </section>
      <section className="in-card in-conversations" aria-label="Letzte Gespräche"><InstrumentHead kind="conversation" title="Zuletzt besprochen" subtitle="Ihre letzten Gespräche"><Link to="/gespraeche" className="in-head-link" aria-label="Alle Gespräche ansehen"><InstrumentIcon kind="arrow" size={17} /></Link></InstrumentHead>{conversations.isPending ? <div className="in-pad"><Loading /></div> : conversations.isError ? <div className="in-pad"><ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} /></div> : conversations.data.length === 0 ? <p className="in-empty">Noch keine Gespräche. Stellen Sie dem Sachbearbeiter Ihre erste Frage.</p> : <ul className="in-list">{conversations.data.slice(0, 3).map((conv) => <li key={conv.id}><Link to="/gespraeche/$conversationId" params={{ conversationId: conv.id }} className="in-conversation-row"><InstrumentIcon kind="conversation" size={18} /><div className="in-row-main"><strong>{conv.title}</strong><span>{baseName(recipientName(conv.care_recipient_id, peopleList) ?? 'Allgemein')} · {listWhen(conv.created_at, now)}</span></div><InstrumentIcon kind="chevron" size={15} /></Link></li>)}</ul>}</section>
    </div>
    <footer className="in-page-foot"><InstrumentIcon kind="shield" size={14} /><span>In Ruhe organisiert. Schritt für Schritt.</span><span>Nur fiktive Demodaten</span></footer>
  </div></Shell>;
}
