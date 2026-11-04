import { Link } from '@tanstack/react-router';
import { FileText, MessageSquareText, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ErrorState, Loading } from '../components/States';
import { DOC_STATUS_LABEL } from '../data/model';
import { useConversations, useDocuments } from '../data/queries';
import { baseName, formatDate, initials } from '../lib/format';
import { Chip } from '../routes/dashboard/parts';
import type { CareRecipient, TaskRow } from '../services/types';
import { compareDeadline, PRIORITY_LABEL } from './model';

export function CaseDialog({ person, tasks, tasksError, onClose, onAsk }: { person: CareRecipient; tasks: TaskRow[]; tasksError: unknown; onClose: () => void; onAsk: (personId: string) => void }) {
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
  const personalTasks = tasks.filter((t) => t.care_recipient_id === person.id).sort(compareDeadline);
  const chats = [...(conversations.data ?? []), ...(archived.data ?? [])].filter((c) => c.care_recipient_id === person.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const docs = (documents.data ?? []).filter((d) => d.care_recipient_id === person.id);
  return <dialog ref={ref} className="dialog sf-dialog" aria-labelledby="staff-case-title" onCancel={(e) => { e.preventDefault(); close(); }}>
    <div className="dialog-inner">
      <header className="dialog-head"><div className="sf-dlg-person"><span className="lt-av" aria-hidden="true">{initials(person.name)}</span><div><p className="sf-dlg-eyebrow">Fiktiver Pflegefall</p><h2 id="staff-case-title">{baseName(person.name)}</h2></div></div><button className="icon-btn" type="button" aria-label="Fall schließen" onClick={close}><X size={16} className="i" aria-hidden="true" /></button></header>
      <div className="dialog-body">
        <dl className="sf-facts"><div><dt>Pflegegrad</dt><dd>{person.care_grade || 'Nicht festgestellt'}</dd></div><div><dt>Pflegekasse</dt><dd>{person.insurerName ? baseName(person.insurerName) : 'Nicht hinterlegt'}</dd></div></dl>
        <p className="sf-summary">{person.summary || 'Noch keine Zusammenfassung hinterlegt.'}</p>
        <section aria-labelledby="staff-case-tasks"><h3 id="staff-case-tasks">Offene Aufgaben <span className="lt-count">{tasksError ? '' : personalTasks.length}</span></h3>
          {tasksError ? <ErrorState error={tasksError} title="Aufgaben nicht verfügbar" /> : personalTasks.length ? <ul className="sf-dlist">{personalTasks.map((t) => <li key={t.id}><div><strong>{t.title}</strong><span>{t.description}</span>{t.deadline_source ? <small>Quelle: {t.deadline_source}</small> : null}</div><div className="sf-dmeta"><Chip>{PRIORITY_LABEL[t.priority]}</Chip><span className="sf-ddate">{t.due_at ? formatDate(t.due_at) : 'Ohne Termin'}</span></div></li>)}</ul> : <p className="sf-dempty">Keine offenen Aufgaben gespeichert.</p>}
        </section>
        <section aria-labelledby="staff-case-chats"><h3 id="staff-case-chats">Gespeicherte Gespräche</h3>
          {conversations.isPending || archived.isPending ? <Loading lines={2} /> : conversations.isError || archived.isError ? <ErrorState error={conversations.error ?? archived.error} /> : chats.length ? <ul className="sf-dlist">{chats.map((c) => <li key={c.id}><Link to="/gespraeche/$conversationId" params={{ conversationId: c.id }} className="sf-dlink"><MessageSquareText size={14} className="i" aria-hidden="true" /><span>{c.title}<small>{formatDate(c.created_at)}{c.archived_at ? ' · archiviert' : ''}</small></span></Link></li>)}</ul> : <p className="sf-dempty">Noch keine Gespräche mit dieser Person verknüpft.</p>}
        </section>
        <section aria-labelledby="staff-case-docs"><h3 id="staff-case-docs">Dokumente</h3>
          {documents.isPending ? <Loading lines={2} /> : documents.isError ? <ErrorState error={documents.error} /> : docs.length ? <ul className="sf-dlist">{docs.map((d) => <li key={d.id}><Link to="/dokumente" hash={`dok-${d.id}`} className="sf-dlink"><FileText size={14} className="i" aria-hidden="true" /><span>{d.title}<small>{DOC_STATUS_LABEL[d.status]}</small></span></Link></li>)}</ul> : <p className="sf-dempty">Keine Dokumente gespeichert.</p>}
        </section>
      </div>
      <footer className="dialog-foot"><button className="btn btn-secondary" type="button" onClick={close}>Schließen</button><button className="btn btn-primary" type="button" onClick={ask}><MessageSquareText size={14} className="i" aria-hidden="true" />KI zu diesem Fall fragen</button></footer>
    </div>
  </dialog>;
}
