import { Link } from '@tanstack/react-router';
import { ArrowUp, CircleAlert, MessageSquare, User } from 'lucide-react';
import { ErrorState } from '../../components/States';
import { Select } from '../../components/Select';
import { DOC_KIND_LABEL, nextTaskFor, recipientName } from '../../data/model';
import { useConversations } from '../../data/queries';
import { useOverviewQuestion } from '../../instrument/uebersicht/useOverviewQuestion';
import { ageFrom, baseName, listWhen } from '../../lib/format';
import type { CareRecipient, DocumentRow, TaskRow } from '../../services/types';
import { Chip, Due, DocStatus, EmptyRow, PanelHead, PersonAvatar, PersonDot, SkeletonRows, fall } from './parts';

/** Pflegebedürftige als kompakte Tabelle: Kernangaben und nächste Frist je Person. */
export function PeopleTable({ people, sorted, tasksFailed, now, pending, error, onRetry }: {
  people: CareRecipient[]; sorted: TaskRow[]; tasksFailed: boolean; now: Date;
  pending: boolean; error: unknown; onRetry: () => void;
}) {
  return (
    <section className="lt-panel ov-people" aria-labelledby="people-title">
      <PanelHead id="people-title" title="Pflegebedürftige" count={pending || error ? null : people.length} />
      {pending ? (
        <SkeletonRows rows={3} label="Personen werden geladen …" />
      ) : error ? (
        <div className="lt-pad"><ErrorState error={error} onRetry={onRetry} /></div>
      ) : people.length === 0 ? (
        <EmptyRow title="Noch keine Pflegebedürftigen hinterlegt">Personen werden von der Verwaltung angelegt.</EmptyRow>
      ) : (
        <>
          {tasksFailed ? (
            <p className="lt-notice" role="status">
              <CircleAlert className="i" size={14} aria-hidden="true" />
              <span>Fristen konnten nicht geladen werden</span>
            </p>
          ) : null}
          <div className="lt-cols pp-cols" aria-hidden="true">
            <span>Person</span><span>Pflegegrad</span><span>Pflegekasse</span><span>Nächste Frist</span><span className="r">Fällig</span>
          </div>
          <ul className="lt-list fx-fall" aria-label="Personen">
            {people.map((p, i) => {
              const task = tasksFailed ? null : nextTaskFor(p.id, sorted);
              const age = ageFrom(p.birth_date, now);
              return (
                <li key={p.id} className="lt-li" style={fall(i)}>
                  <div className="lt-row pp-row">
                    <span className="pp-name">
                      <PersonAvatar id={p.id} people={people} />
                      <span className="lt-title">{baseName(p.name)}</span>
                      {age !== null ? <span className="pp-age">{age} J.</span> : null}
                    </span>
                    <span className="pp-grade">{p.care_grade > 0 ? `Pflegegrad ${p.care_grade}` : 'Kein Pflegegrad'}</span>
                    <span className="pp-meta">{p.insurerName ? baseName(p.insurerName) : 'Nicht hinterlegt'}</span>
                    <span className="pp-next">{tasksFailed ? '—' : task ? task.title : 'Keine offene Frist'}</span>
                    {task ? <Due task={task} now={now} /> : <span className="lt-due is-none">—</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

/** Frage-Einstieg im selben System: ein Eingabefeld, Bezug, die letzten drei Gespräche. */
export function AskPanel() {
  const { question, setQuestion, personId, setPersonId, list, chosen, pending, error, blocked, onSubmit } = useOverviewQuestion();
  const conversations = useConversations(false);
  const now = new Date();

  return (
    <section className="lt-panel ov-ask" aria-labelledby="ask-title">
      <PanelHead id="ask-title" title="KI-Sachbearbeiter fragen" />
      <div className="ask-body">
        <p className="ask-sub">Rund um die Uhr erreichbar · keine Rechts- oder Medizinberatung</p>
        <form className="ask-form" onSubmit={(e) => void onSubmit(e)}>
          <label htmlFor="ask-input" className="sr-only">Ihre Frage an den Sachbearbeiter</label>
          <input id="ask-input" className="ask-input" placeholder="Was muss in einen Widerspruch?" value={question} maxLength={8000}
            onChange={(e) => setQuestion(e.target.value)} disabled={pending} aria-describedby={blocked ? 'ask-blocked' : undefined} />
          <button type="submit" className="btn btn-primary ask-send" disabled={pending || blocked || !question.trim()}>
            {pending ? 'Wird geöffnet …' : 'Fragen'}
            {pending ? null : <ArrowUp className="i" size={14} aria-hidden="true" />}
          </button>
        </form>
        {list.length > 1 ? (
          <div className="ask-ref">
            <User className="i" size={14} aria-hidden="true" />
            <label htmlFor="ask-person">Bezug</label>
            <Select id="ask-person" size="sm" nativeClassName="person-select" value={personId} onChange={setPersonId}
              options={[{ value: 'auto', label: 'Allgemein' }, ...list.map((p) => ({ value: p.id, label: baseName(p.name) }))]} />
          </div>
        ) : chosen ? (
          <p className="ask-ref">
            <User className="i" size={14} aria-hidden="true" />
            Bezug: {baseName(recipientName(chosen, list) ?? '')}
          </p>
        ) : null}
        {blocked ? (
          <p id="ask-blocked" className="lt-notice is-warn" role="status">
            <CircleAlert className="i" size={14} aria-hidden="true" />
            <span>Noch kein KI-Modell freigegeben. Fragen sind möglich, sobald die Verwaltung ein Modell eingerichtet hat.</span>
          </p>
        ) : null}
        {error ? <ErrorState error={error} title="Gespräch konnte nicht angelegt werden" /> : null}
      </div>

      <div className="lt-sub-head">
        <h3>Letzte Gespräche</h3>
        <Link to="/gespraeche" className="lt-link">Alle</Link>
      </div>
      {conversations.isPending ? (
        <SkeletonRows rows={3} label="Gespräche werden geladen …" />
      ) : conversations.isError ? (
        <div className="lt-pad"><ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} /></div>
      ) : conversations.data.length === 0 ? (
        <EmptyRow title="Noch keine Gespräche">Stellen Sie oben Ihre erste Frage.</EmptyRow>
      ) : (
        <ul className="lt-list">
          {conversations.data.slice(0, 3).map((c) => (
            <li key={c.id} className="lt-li">
              <Link to="/gespraeche/$conversationId" params={{ conversationId: c.id }} className="lt-row is-link cv-row">
                <MessageSquare className="i lt-ico" size={14} aria-hidden="true" />
                <span className="lt-title">{c.title}</span>
                <PersonDot id={c.care_recipient_id} people={list} />
                <span className="lt-when">{listWhen(c.created_at, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DocsPanel({ docs, now, pending, error, onRetry }: {
  docs: DocumentRow[]; now: Date; pending: boolean; error: unknown; onRetry: () => void;
}) {
  return (
    <section className="lt-panel ov-docs" aria-labelledby="docs-title">
      <PanelHead id="docs-title" title="Zuletzt erstellte Dokumente">
        <Link to="/dokumente" className="lt-link">Alle</Link>
      </PanelHead>
      {pending ? (
        <SkeletonRows rows={3} label="Dokumente werden geladen …" />
      ) : error ? (
        <div className="lt-pad"><ErrorState error={error} onRetry={onRetry} /></div>
      ) : docs.length === 0 ? (
        <EmptyRow title="Noch keine Dokumente">Vom Sachbearbeiter erstellte Schreiben erscheinen hier mit Status.</EmptyRow>
      ) : (
        <ul className="lt-list">
          {docs.slice(0, 4).map((d) => (
            <li key={d.id} className="lt-li">
              <Link to="/dokumente" hash={`dok-${d.id}`} className="lt-row is-link dc-mini">
                <DocStatus status={d.status} />
                <span className="lt-title">{d.title}</span>
                <span className="lt-kind"><Chip>{DOC_KIND_LABEL[d.kind]}</Chip></span>
                <span className="lt-when">{listWhen(d.created_at, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
