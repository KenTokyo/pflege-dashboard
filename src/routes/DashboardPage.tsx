import { Link } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'motion/react';
import { AlarmClock, ArrowUp, CalendarDays, CircleAlert, FileText, MessageSquare, MessageSquareText, User } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useWorkspace } from '../auth/AuthProvider';
import { useStartConversation } from '../chat/useStartConversation';
import { CountUp } from '../components/CountUp';
import { MarkerCircle } from '../components/Graffiti';
import { Shell } from '../components/Shell';
import { EmptyState, ErrorState, Loading } from '../components/States';
import {
  DOC_KIND_LABEL,
  DOC_STATUS_LABEL,
  effectiveModel,
  isUrgent,
  nextTaskFor,
  recipientName,
  sortTasks,
  titleFromQuestion,
} from '../data/model';
import { useAgentSettings, useCareRecipients, useConversations, useDocuments, useModels, useOpenTasks } from '../data/queries';
import { ageFrom, baseName, daysUntil, formatDate, formatLongDate, formatShortDate, greeting, initials, listWhen, relativeDays } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { CareRecipient, DocumentRow, TaskRow } from '../services/types';

const listIn = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemIn = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0.7, 0.3, 1] as const } } };

export function DocStatus({ status }: { status: DocumentRow['status'] }) {
  if (status === 'draft') return <span className="tape">{DOC_STATUS_LABEL.draft}</span>;
  return <span className={`pill ${status === 'sent' ? 'pill-sent' : 'pill-reviewed'}`}>{DOC_STATUS_LABEL[status]}</span>;
}

function PersonCard({
  person,
  task,
  tasksFailed,
  now,
  tone,
  graffiti,
}: {
  person: CareRecipient;
  task: TaskRow | null;
  /** Aufgaben unbekannt (Ladefehler): keine Aussage über Fristen machen. */
  tasksFailed: boolean;
  now: Date;
  tone: number;
  graffiti: boolean;
}) {
  const age = ageFrom(person.birth_date, now);
  const days = task?.due_at ? daysUntil(task.due_at, now) : null;
  const urgent = task ? isUrgent(task, days) : false;
  const fictional = person.name.includes('fiktiv');
  return (
    <motion.article variants={itemIn} className="card person" aria-labelledby={`p-${person.id}`}>
      <div className="person-head">
        <span className={`avatar avatar-lg tone-${tone % 2}`} aria-hidden="true">
          {initials(person.name)}
        </span>
        <div className="min-w-0">
          <h2 id={`p-${person.id}`} className="person-name">
            {baseName(person.name)}
          </h2>
          <p className="small muted">{[age !== null ? `${age} Jahre` : null, fictional ? 'fiktive Person' : null].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <dl className="facts">
        <div>
          <dt>Pflegegrad</dt>
          <dd>{person.care_grade > 0 ? `Pflegegrad ${person.care_grade}` : 'Kein Pflegegrad'}</dd>
        </div>
        <div>
          <dt>Pflegekasse</dt>
          <dd>{person.insurerName ? baseName(person.insurerName) : 'Nicht hinterlegt'}</dd>
        </div>
      </dl>
      {tasksFailed ? (
        <div className="deadline">
          <p className="dl-label">
            <CircleAlert className="i" size={15} aria-hidden="true" />
            <span>Fristen konnten nicht geladen werden</span>
          </p>
        </div>
      ) : task?.due_at && days !== null ? (
        <div className={`deadline ${urgent ? 'is-urgent' : ''}`}>
          <div className="dl-label">
            {urgent ? <AlarmClock className="i" size={15} aria-hidden="true" /> : <CalendarDays className="i" size={15} aria-hidden="true" />}
            <span className="line-clamp-2">{task.title}</span>
          </div>
          <div className="dl-value">
            <span className="dl-date">{formatDate(task.due_at)}</span>
            <span className={`dl-left ${urgent ? 'is-urgent' : ''}`}>
              {graffiti && urgent && days > 1 ? (
                <span className="mark-wrap">
                  <span aria-hidden="true">
                    noch <CountUp value={days} /> Tage
                  </span>
                  <span className="sr-only">{relativeDays(days)}</span>
                  <MarkerCircle />
                </span>
              ) : (
                relativeDays(days)
              )}
            </span>
          </div>
          {task.deadline_source ? <p className="dl-source">Quelle: {task.deadline_source}</p> : null}
        </div>
      ) : (
        <div className="deadline">
          <p className="dl-label">Keine offene Frist</p>
        </div>
      )}
    </motion.article>
  );
}

function AskCard() {
  const people = useCareRecipients();
  const settings = useAgentSettings();
  const models = useModels();
  const conversations = useConversations(false);
  const { start, pending, error } = useStartConversation();
  const [question, setQuestion] = useState('');
  const [personId, setPersonId] = useState<string>('auto');
  const now = new Date();

  const list = people.data ?? [];
  const chosen = personId === 'auto' ? (list.length === 1 ? (list[0]?.id ?? null) : null) : personId || null;
  const model = settings.data !== undefined && models.data ? effectiveModel(null, settings.data, models.data) : null;
  const blocked = model !== null && !model.usable;

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = question.trim();
    if (!text || pending || blocked) return;
    try {
      await start({ title: titleFromQuestion(text), careRecipientId: chosen, firstMessage: text });
    } catch {
      // Fehler wird unten angezeigt; Eingabe bleibt erhalten.
    }
  };

  return (
    <section className="card ask" aria-labelledby="ask-title">
      <div className="ask-head">
        <span className="ask-icon" aria-hidden="true">
          <MessageSquareText className="i" size={20} />
        </span>
        <div className="min-w-0">
          <h2 id="ask-title" className="ask-title">
            KI-Sachbearbeiter fragen
          </h2>
          <p className="small muted">Rund um die Uhr erreichbar · keine Rechts- oder Medizinberatung</p>
        </div>
      </div>
      <form className="ask-form" onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="ask-input" className="sr-only">
          Ihre Frage an den Sachbearbeiter
        </label>
        <input
          id="ask-input"
          className="ask-input"
          placeholder="Was muss in einen Widerspruch?"
          value={question}
          maxLength={8000}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={pending}
          aria-describedby={blocked ? 'ask-blocked' : undefined}
        />
        <button type="submit" className="btn btn-primary" disabled={pending || blocked || !question.trim()}>
          {pending ? 'Wird geöffnet …' : 'Fragen'}
          {pending ? null : <ArrowUp className="i" size={17} aria-hidden="true" />}
        </button>
      </form>
      {list.length > 1 ? (
        <div className="flex items-center gap-2 small muted">
          <User className="i" size={15} aria-hidden="true" />
          <label htmlFor="ask-person">Bezug:</label>
          <select id="ask-person" className="person-select" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="auto">Allgemein</option>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {baseName(p.name)}
              </option>
            ))}
          </select>
        </div>
      ) : chosen ? (
        <p className="flex items-center gap-1.5 small muted">
          <User className="i" size={15} aria-hidden="true" />
          Bezug: {baseName(recipientName(chosen, list) ?? '')}
        </p>
      ) : null}
      {blocked ? (
        <p id="ask-blocked" className="note mt-2" role="status">
          <AlarmClock className="i" size={15} aria-hidden="true" />
          <span>Noch kein KI-Modell freigegeben. Fragen sind möglich, sobald die Verwaltung ein Modell eingerichtet hat.</span>
        </p>
      ) : null}
      {error ? (
        <div className="mt-2">
          <ErrorState error={error} title="Gespräch konnte nicht angelegt werden" />
        </div>
      ) : null}

      <div className="ask-convs">
        <div className="card-head">
          <h3 className="text-[16px] font-bold">Letzte Gespräche</h3>
          <Link to="/gespraeche" className="link-sm">
            Alle
          </Link>
        </div>
        {conversations.isPending ? (
          <Loading lines={2} />
        ) : conversations.isError ? (
          <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />
        ) : conversations.data.length === 0 ? (
          <EmptyState title="Noch keine Gespräche" spray={false}>
            <span>Stellen Sie oben Ihre erste Frage.</span>
          </EmptyState>
        ) : (
          <ul className="rows">
            {conversations.data.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link to="/gespraeche/$conversationId" params={{ conversationId: c.id }} className="row">
                  <MessageSquare className="i row-icon" size={17} aria-hidden="true" />
                  <span className="row-main">
                    <span className="row-title">{c.title}</span>
                    <span className="row-sub">{baseName(recipientName(c.care_recipient_id, list) ?? 'Allgemein')}</span>
                  </span>
                  <span className="row-when">{listWhen(c.created_at, now)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function TaskRowView({ task, people, now }: { task: TaskRow; people: CareRecipient[]; now: Date }) {
  const days = task.due_at ? daysUntil(task.due_at, now) : null;
  const urgent = isUrgent(task, days);
  const person = recipientName(task.care_recipient_id, people);
  return (
    <motion.li variants={itemIn} className="row">
      <span className={`prio prio-${task.priority}`} aria-hidden="true" />
      <span className="row-main">
        <span className="row-title">{task.title}</span>
        <span className="row-sub">
          {[person ? baseName(person) : 'Allgemein', task.kind === 'handover' ? 'Übergabe' : null, task.deadline_source].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="t-due">
        <span className="t-date">{task.due_at ? formatShortDate(task.due_at) : 'offen'}</span>
        <span className={`t-left ${urgent ? 'is-urgent' : ''}`}>{days !== null ? relativeDays(days) : 'ohne Termin'}</span>
        {urgent ? <span className="sr-only">dringend</span> : null}
      </span>
    </motion.li>
  );
}

export function DashboardPage() {
  const { profile } = useWorkspace();
  useDocumentTitle('Übersicht');
  const reduce = useReducedMotion();
  const people = useCareRecipients();
  const tasks = useOpenTasks();
  const docs = useDocuments();
  const now = new Date();
  const sorted = sortTasks(tasks.data ?? []);
  const peopleList = people.data ?? [];
  // Ein Graffiti-Moment je Ansicht: Markerkreis nur bei der dringendsten Personenfrist.
  const graffitiPerson = peopleList.find((p) => {
    const t = nextTaskFor(p.id, sorted);
    return t?.due_at ? isUrgent(t, daysUntil(t.due_at, now)) : false;
  })?.id;
  const firstName = baseName(profile.displayName);

  return (
    <Shell>
      <header className="page-head">
        <div className="min-w-0">
          <p className="eyebrow">{formatLongDate(now)}</p>
          <h1>
            {greeting(now)}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <div className="head-actions">
          <Link to="/gespraeche" className="btn btn-primary">
            <MessageSquareText className="i" size={18} aria-hidden="true" />
            Sachbearbeiter fragen
          </Link>
        </div>
      </header>

      <div className="dash">
        <section className="persons" aria-label="Pflegebedürftige">
          {people.isPending || tasks.isPending ? (
            <div className="card">
              <Loading />
            </div>
          ) : people.isError ? (
            <div className="card">
              <ErrorState error={people.error} onRetry={() => void people.refetch()} />
            </div>
          ) : peopleList.length === 0 ? (
            <div className="card">
              <EmptyState title="Noch keine Pflegebedürftigen hinterlegt">
                <span>Personen werden von der Verwaltung angelegt.</span>
              </EmptyState>
            </div>
          ) : (
            <motion.div className="contents" variants={listIn} initial={reduce ? false : 'hidden'} animate="show">
              {peopleList.map((p, i) => (
                <PersonCard key={p.id} person={p} task={nextTaskFor(p.id, sorted)} tasksFailed={tasks.isError} now={now} tone={i} graffiti={p.id === graffitiPerson} />
              ))}
            </motion.div>
          )}
        </section>

        <AskCard />

        <section className="card tasks" aria-labelledby="tasks-title">
          <div className="card-head">
            <h2 id="tasks-title">Offene Aufgaben und Fristen</h2>
            {tasks.data ? <span className="count">{tasks.data.length}</span> : null}
            <Link to="/aufgaben" className="link-sm">
              Alle anzeigen
            </Link>
          </div>
          {tasks.isPending ? (
            <Loading />
          ) : tasks.isError ? (
            <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
          ) : sorted.length === 0 ? (
            <EmptyState title="Keine offenen Aufgaben">
              <span>Alles erledigt. Neue Fristen erscheinen hier nach Dringlichkeit sortiert.</span>
            </EmptyState>
          ) : (
            <motion.ul className="rows" variants={listIn} initial={reduce ? false : 'hidden'} animate="show">
              {sorted.slice(0, 6).map((t) => (
                <TaskRowView key={t.id} task={t} people={peopleList} now={now} />
              ))}
            </motion.ul>
          )}
        </section>

        <section className="card docs" aria-labelledby="docs-title">
          <div className="card-head">
            <h2 id="docs-title">Zuletzt erstellte Dokumente</h2>
            <Link to="/dokumente" className="link-sm">
              Alle
            </Link>
          </div>
          {docs.isPending ? (
            <Loading />
          ) : docs.isError ? (
            <ErrorState error={docs.error} onRetry={() => void docs.refetch()} />
          ) : docs.data.length === 0 ? (
            <EmptyState title="Noch keine Dokumente">
              <span>Vom Sachbearbeiter erstellte Schreiben erscheinen hier mit Status.</span>
            </EmptyState>
          ) : (
            <ul className="rows">
              {docs.data.slice(0, 4).map((d) => (
                <li key={d.id}>
                  <Link to="/dokumente" className="row" hash={`dok-${d.id}`}>
                    <FileText className="i row-icon" size={18} aria-hidden="true" />
                    <span className="row-main">
                      <span className="row-title">{d.title}</span>
                      <span className="row-meta">
                        <DocStatus status={d.status} />
                        <span>
                          {DOC_KIND_LABEL[d.kind]} · {baseName(recipientName(d.care_recipient_id, peopleList) ?? 'Allgemein')} · {listWhen(d.created_at, now)}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}
