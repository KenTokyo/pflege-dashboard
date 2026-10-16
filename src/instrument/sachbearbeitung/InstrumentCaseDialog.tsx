import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { ErrorState, Loading } from '../../components/States';
import { DOC_STATUS_LABEL } from '../../data/model';
import { useConversations, useDocuments } from '../../data/queries';
import { baseName, formatDate, initials } from '../../lib/format';
import type { CareRecipient, TaskRow } from '../../services/types';
import { compareDeadline } from '../../staff/model';
import { CardHead } from '../grundlage/CardHead';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Timeline } from '../grundlage/Timeline';
import { Priority } from './Lists';
import './dialog.css';

export function InstrumentCaseDialog({ person, tasks, tasksError, onClose, onAsk }: {
  person: CareRecipient; tasks: TaskRow[]; tasksError: unknown; onClose: () => void; onAsk: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const conversations = useConversations();
  const archived = useConversations(true);
  const documents = useDocuments();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  const close = () => { ref.current?.close(); onClose(); };
  const ask = () => { ref.current?.close(); onAsk(person.id); };
  const personalTasks = tasks.filter((task) => task.care_recipient_id === person.id).sort(compareDeadline);
  const chats = [...(conversations.data ?? []), ...(archived.data ?? [])]
    .filter((chat) => chat.care_recipient_id === person.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const docs = (documents.data ?? []).filter((doc) => doc.care_recipient_id === person.id);
  return <dialog className="is-dialog" ref={ref} aria-labelledby="is-case-title"
    onCancel={(event) => { event.preventDefault(); close(); }}>
    <div className="is-dialog-layout">
      <header className="is-dialog-head"><div className="is-person"><span className="is-avatar" aria-hidden="true">
        {initials(person.name)}</span><div><p className="is-kicker">Fiktiver Pflegefall</p><h2 id="is-case-title">
        {baseName(person.name)}</h2></div></div><button className="is-button is-close" type="button"
        aria-label="Fall schließen" onClick={close}><Icon name="close" /></button></header>
      <div className="is-dialog-body">
        <Reveal stage="head"><section className="is-case-facts" aria-label="Falldaten">
          <Metric value={person.care_grade || NaN} label="Pflegegrad" unit={person.care_grade ? 'von 5' : ''} tone="person" />
          <div><span className="is-muted">Pflegekasse</span><strong>{person.insurerName ? baseName(person.insurerName) :
            'Nicht hinterlegt'}</strong>{!person.care_grade ? <p>Pflegegrad nicht festgestellt</p> : null}</div>
          <p>{person.summary || 'Noch keine Zusammenfassung hinterlegt.'}</p>
        </section></Reveal>
        <section className="is-dialog-section" aria-labelledby="is-case-tasks">
          <CardHead icon="task" title={personalTasks.length === 1 && !tasksError ? 'Offene Aufgabe' : 'Offene Aufgaben'}
            id="is-case-tasks" {...(!tasksError ? { count: personalTasks.length } : {})} />
          {tasksError ? <ErrorState error={tasksError} title="Aufgaben nicht verfügbar" /> : personalTasks.length ?
            <ul className="is-case-task-details">{personalTasks.map((task) => <li key={task.id}>
              <Priority value={task.priority} />
              {task.due_at ? <Timeline items={[{ id: task.id, date: task.due_at, label: task.title }]} /> :
                <div><h3>{task.title}</h3><p className="is-muted">Ohne Termin</p></div>}
              {task.description ? <p>{task.description}</p> : null}
              {task.deadline_source ? <small>Quelle: {task.deadline_source}</small> : null}
            </li>)}</ul> : <p className="is-detail-empty">Keine offenen Aufgaben gespeichert.</p>}
        </section>
        <div className="is-linked-grid">
          <section className="is-dialog-section" aria-labelledby="is-case-chats">
            <CardHead icon="conversation" title={chats.length === 1 ? 'Gespeichertes Gespräch' : 'Gespeicherte Gespräche'} id="is-case-chats"
              {...(!conversations.isPending && !archived.isPending && !conversations.isError && !archived.isError ? { count: chats.length } : {})} />
            {conversations.isPending || archived.isPending ? <Loading lines={2} /> : conversations.isError || archived.isError ?
              <ErrorState error={conversations.error ?? archived.error} /> : chats.length ?
              <ul className="is-linked-list">{chats.map((chat) => <li key={chat.id}>
                <Link to="/gespraeche/$conversationId" params={{ conversationId: chat.id }}>
                  <Icon name="conversation" /><span>{chat.title}<small>{formatDate(chat.created_at)}{chat.archived_at ? ' · archiviert' : ''}</small></span>
                  <Icon name="arrow" size={15} /></Link></li>)}</ul> :
              <p className="is-detail-empty">Keine Gespräche mit dieser Person verknüpft.</p>}
          </section>
          <section className="is-dialog-section" aria-labelledby="is-case-docs">
            <CardHead icon="document" title={docs.length === 1 ? 'Dokument' : 'Dokumente'} id="is-case-docs"
              {...(!documents.isPending && !documents.isError ? { count: docs.length } : {})} />
            {documents.isPending ? <Loading lines={2} /> : documents.isError ? <ErrorState error={documents.error} /> :
              docs.length ? <ul className="is-linked-list">{docs.map((doc) => <li key={doc.id}>
                <Link to="/dokumente" hash={`dok-${doc.id}`}><Icon name="document" /><span>{doc.title}
                  <small>{DOC_STATUS_LABEL[doc.status]}</small></span><Icon name="arrow" size={15} /></Link></li>)}</ul> :
                <p className="is-detail-empty">Keine Dokumente gespeichert.</p>}
          </section>
        </div>
      </div>
      <footer className="is-dialog-foot"><button className="is-button" type="button" onClick={close}>Schließen</button>
        <button className="is-button is-primary" type="button" onClick={ask}><Icon name="arrow" size={17} />
          <span>KI zu diesem Fall fragen</span></button></footer>
    </div>
  </dialog>;
}
