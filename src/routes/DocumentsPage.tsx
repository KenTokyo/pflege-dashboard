import { FileText, Info } from 'lucide-react';
import { useState } from 'react';
import { Shell } from '../components/Shell';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { DOC_KIND_LABEL, DOC_STATUS_LABEL, recipientName } from '../data/model';
import { useCareRecipients, useDocuments, useMarkDocumentStatus } from '../data/queries';
import { baseName, formatDate } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { DocumentRow, Enums } from '../services/types';
import { DocStatus } from './DashboardPage';

type Filter = 'all' | Enums['document_status'];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'draft', label: 'Entwurf' },
  { id: 'reviewed', label: 'Geprüft' },
  { id: 'sent', label: 'Versendet' },
];
const STATUSES: Enums['document_status'][] = ['draft', 'reviewed', 'sent'];

function DocItem({ doc, person }: { doc: DocumentRow; person: string }) {
  const mark = useMarkDocumentStatus();
  return (
    <li className="doc-row" id={`dok-${doc.id}`}>
      <FileText className="i" size={18} aria-hidden="true" />
      <div className="min-w-0">
        <p className="row-title" style={{ whiteSpace: 'normal' }}>
          {doc.title}
        </p>
        <p className="row-meta">
          <DocStatus status={doc.status} />
          <span>
            {DOC_KIND_LABEL[doc.kind]} · {person} · {formatDate(doc.created_at)}
          </span>
        </p>
        {mark.error ? (
          <div className="mt-2">
            <ErrorState error={mark.error} title="Status nicht geändert" />
          </div>
        ) : null}
      </div>
      <div className="doc-status flex items-center gap-2">
        <label htmlFor={`st-${doc.id}`} className="sr-only">
          Status von {doc.title}
        </label>
        <select
          id={`st-${doc.id}`}
          className="status-select"
          value={doc.status}
          disabled={mark.isPending}
          onChange={(e) => {
            const next = STATUSES.find((s) => s === e.target.value);
            if (next && next !== doc.status) mark.mutate({ id: doc.id, status: next, revision: doc.revision });
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {DOC_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <details className="doc-preview">
        <summary className="cursor-pointer font-bold">Text anzeigen</summary>
        <div className="mt-2">{doc.rendered_text || 'Kein Text gespeichert.'}</div>
      </details>
    </li>
  );
}

export function DocumentsPage() {
  useDocumentTitle('Dokumente');
  const docs = useDocuments();
  const people = useCareRecipients();
  const [filter, setFilter] = useState<Filter>('all');
  const list = (docs.data ?? []).filter((d) => filter === 'all' || d.status === filter);

  return (
    <Shell>
      <div className="list-page">
        <header className="page-head">
          <div>
            <p className="eyebrow">Arbeitsbereich</p>
            <h1>Dokumente</h1>
          </div>
        </header>
        <p className="note mb-3">
          <Info className="i" size={15} aria-hidden="true" />
          <span>Den Status setzen Sie selbst. „Versendet“ bedeutet: Sie haben das Schreiben selbst verschickt – die App versendet nichts.</span>
        </p>
        <div className="filters" role="group" aria-label="Nach Status filtern">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="filter" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <section className="card" aria-label="Dokumentliste">
          {docs.isPending ? (
            <Loading />
          ) : docs.isError ? (
            <ErrorState error={docs.error} onRetry={() => void docs.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState title={filter === 'all' ? 'Noch keine Dokumente' : 'Keine Dokumente mit diesem Status'} />
          ) : (
            <ul className="rows">
              {list.map((d) => (
                <DocItem key={d.id} doc={d} person={baseName(recipientName(d.care_recipient_id, people.data ?? []) ?? 'Allgemein')} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}
