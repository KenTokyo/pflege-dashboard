import { ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';
import { useDesign } from '../app/ThemeProvider';
import { Select } from '../components/Select';
import { Shell } from '../components/Shell';
import { ErrorState } from '../components/States';
import { DOC_KIND_LABEL, DOC_STATUS_LABEL } from '../data/model';
import { useCareRecipients, useDocuments, useMarkDocumentStatus } from '../data/queries';
import { InstrumentDocuments } from '../instrument/dokumente/InstrumentDocuments';
import { formatDate } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { CareRecipient, DocumentRow, Enums } from '../services/types';
import { Chip, EmptyRow, PanelHead, PersonDot, Seg, SkeletonRows, StatusIcon, docStatus, fall } from './dashboard/parts';

type Filter = 'all' | Enums['document_status'];
const FILTERS = [['all', 'Alle'], ['draft', 'Entwurf'], ['reviewed', 'Geprüft'], ['sent', 'Versendet']] as const;
const STATUSES: Enums['document_status'][] = ['draft', 'reviewed', 'sent'];

function DocItem({ doc, people, i }: { doc: DocumentRow; people: readonly CareRecipient[]; i: number }) {
  const mark = useMarkDocumentStatus();
  const [open, setOpen] = useState(false);
  return (
    <li className="lt-li dc-li" id={`dok-${doc.id}`} style={fall(i)}>
      <div className="lt-row dc-row">
        <StatusIcon status={docStatus(doc)} label={DOC_STATUS_LABEL[doc.status]} />
        <span className="lt-title" title={doc.title}>{doc.title}</span>
        <span className="lt-kind"><Chip>{DOC_KIND_LABEL[doc.kind]}</Chip></span>
        <PersonDot id={doc.care_recipient_id} people={people} full />
        <span className="lt-when">{formatDate(doc.created_at)}</span>
        <span className="dc-status">
          <label htmlFor={`st-${doc.id}`} className="sr-only">Status von {doc.title}</label>
          <Select id={`st-${doc.id}`} size="sm" nativeClassName="status-select" value={doc.status} disabled={mark.isPending}
            options={STATUSES.map((s) => ({ value: s, label: DOC_STATUS_LABEL[s] }))}
            onChange={(next) => { if (next !== doc.status) mark.mutate({ id: doc.id, status: next, revision: doc.revision }); }} />
        </span>
        <button type="button" className="dc-toggle" aria-expanded={open} aria-controls={`txt-${doc.id}`} onClick={() => setOpen((v) => !v)}>
          {open ? 'Text ausblenden' : 'Text anzeigen'}
          <ChevronDown className="i" size={14} aria-hidden="true" />
        </button>
      </div>
      {mark.error ? <div className="lt-pad"><ErrorState error={mark.error} title="Status nicht geändert" /></div> : null}
      {open ? <div id={`txt-${doc.id}`} className="dc-text fx-fall"><p style={fall(0)}>{doc.rendered_text || 'Kein Text gespeichert.'}</p></div> : null}
    </li>
  );
}

export function DocumentsPage() {
  useDocumentTitle('Dokumente');
  const { design } = useDesign();
  return design === 'instrument' ? <InstrumentDocuments /> : <TagwerkDocumentsPage />;
}

function TagwerkDocumentsPage() {
  useDocumentTitle('Dokumente');
  const docs = useDocuments();
  const people = useCareRecipients();
  const [filter, setFilter] = useState<Filter>('all');
  const list = (docs.data ?? []).filter((d) => filter === 'all' || d.status === filter);

  return (
    <Shell>
      <div className="pg fx-fall">
        <header className="pg-head" style={fall(0)}>
          <div className="min-w-0">
            <p className="pg-eyebrow">Arbeitsbereich</p>
            <h1>Dokumente</h1>
          </div>
        </header>
        <p className="pg-note" style={fall(1)}>
          <Info className="i" size={14} aria-hidden="true" />
          <span>Den Status setzen Sie selbst. „Versendet“ bedeutet: Sie haben das Schreiben selbst verschickt – die App versendet nichts.</span>
        </p>
        <section className="lt-panel" aria-label="Dokumentliste" style={fall(2)}>
          <PanelHead id="docs-page-title" title="Schreiben" count={docs.isPending || docs.isError ? null : list.length}>
            <Seg label="Nach Status filtern" value={filter} options={FILTERS} onChange={setFilter} />
          </PanelHead>
          {docs.isPending ? (
            <SkeletonRows label="Dokumente werden geladen …" />
          ) : docs.isError ? (
            <div className="lt-pad"><ErrorState error={docs.error} onRetry={() => void docs.refetch()} /></div>
          ) : list.length === 0 ? (
            <EmptyRow title={filter === 'all' ? 'Noch keine Dokumente' : 'Keine Dokumente mit diesem Status'}>
              {filter === 'all' ? 'Vom Sachbearbeiter erstellte Schreiben erscheinen hier mit Status.' : 'Wählen Sie „Alle“, um jedes Schreiben zu sehen.'}
            </EmptyRow>
          ) : (
            <>
              <div className="lt-cols dc-cols" aria-hidden="true">
                <span /><span>Titel</span><span>Art</span><span>Person</span><span>Erstellt</span><span>Status</span><span />
              </div>
              <ul key={filter} className="lt-list fx-fall">
                {list.map((d, i) => <DocItem key={d.id} doc={d} people={people.data ?? []} i={i} />)}
              </ul>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
