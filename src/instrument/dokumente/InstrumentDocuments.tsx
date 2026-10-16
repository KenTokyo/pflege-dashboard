import { useLocation } from '@tanstack/react-router';
import { useState } from 'react';
import { Shell } from '../../components/Shell';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { documentStatusCounts, DOC_KIND_LABEL, DOC_STATUS_LABEL, recipientName } from '../../data/model';
import { useCareRecipients, useDocuments, useMarkDocumentStatus } from '../../data/queries';
import { baseName, formatDate } from '../../lib/format';
import type { DocumentRow, Enums } from '../../services/types';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Segments } from '../grundlage/Segments';
import { PageHeading, Panel } from '../uebersicht/Panel';
import { DOCUMENT_STATUSES, StatusDistribution } from './StatusDistribution';

type Filter = 'all' | Enums['document_status'];

function DocumentEntry({ doc, person }: { doc: DocumentRow; person: string }) {
  const mark = useMarkDocumentStatus();
  return <section className="ib-document" id={`dok-${doc.id}`} aria-label="Ausgewähltes Schreiben">
    <Reveal stage="data">
      <div className="ib-document-row">
        <span className="ib-document-icon"><Icon name="document" size={22} /></span>
        <div className="ib-document-main"><span className="ib-document-kind">{DOC_KIND_LABEL[doc.kind]}</span>
          <h3>{doc.title}</h3><p>{person} · <time dateTime={doc.created_at}>{formatDate(doc.created_at)}</time></p></div>
        <div className="ib-document-status"><label htmlFor={`ib-status-${doc.id}`}>Status manuell setzen</label>
          <select id={`ib-status-${doc.id}`} value={doc.status} disabled={mark.isPending}
            aria-label={`Status von ${doc.title}`} onChange={e => {
              const next = DOCUMENT_STATUSES.find(status => status === e.target.value);
              if (next && next !== doc.status) mark.mutate({ id: doc.id, status: next, revision: doc.revision });
            }}>
            {DOCUMENT_STATUSES.map(status => <option key={status} value={status}>{DOC_STATUS_LABEL[status]}</option>)}
          </select>
        </div>
      </div>
      {mark.error ? <ErrorState error={mark.error} title="Status nicht geändert" /> : null}
      <details className="ib-document-preview" open><summary><span>Dokumenttext</span><Icon name="chevron" thing="document" size={16} /></summary>
        <div>{doc.rendered_text || 'Kein Text gespeichert.'}</div></details>
    </Reveal>
  </section>;
}

export function InstrumentDocuments() {
  const docs = useDocuments();
  const people = useCareRecipients();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hash = useLocation({ select: location => location.hash });
  const counts = documentStatusCounts(docs.data ?? []);
  const list = (docs.data ?? []).filter(doc => filter === 'all' || doc.status === filter);
  const selected = list.find(doc => doc.id === (selectedId ?? hash.replace(/^dok-/, ''))) ?? list[0];
  return <Shell><div className="ib-page">
    <PageHeading title="Dokumente" subtitle="Gespeicherte Schreiben · Status von Ihnen gesetzt" />
    <Reveal stage="metric" className="in-card ib-metrics" aria-label="Dokumente nach Bearbeitungsstand">
      <Metric value={docs.data ? counts.draft : NaN} unit={counts.draft === 1 ? 'Dokument' : 'Dokumente'} label="Noch im Entwurf" tone="document" />
      <Metric value={docs.data ? counts.reviewed : NaN} unit={counts.reviewed === 1 ? 'Dokument' : 'Dokumente'} label="Von Ihnen geprüft" tone="success" />
      <Metric value={docs.data ? counts.sent : NaN} unit={counts.sent === 1 ? 'Dokument' : 'Dokumente'} label="Von Ihnen verschickt" tone="conversation" />
    </Reveal>
    <p className="ib-advice"><Icon name="shield" /><span>Den Status setzen Sie selbst.
      „Versendet“ heißt: Sie haben das Schreiben verschickt. Die App versendet nichts.</span></p>
    <div className="ib-toolbar"><Segments label="Nach Status filtern" value={filter} onChange={setFilter} options={[
      { value: 'all', label: 'Alle' }, { value: 'draft', label: 'Entwurf' },
      { value: 'reviewed', label: 'Geprüft' }, { value: 'sent', label: 'Versendet' },
    ]} /><span className="ib-muted">{docs.data ? `${list.length} / ${docs.data.length} Dokumente`
        : docs.isError ? 'Bestand nicht geladen' : 'Bestand wird geladen'}</span></div>
    <Panel icon="document" title="Welches Schreiben möchten Sie prüfen?" subtitle="Text ansehen und Bearbeitungsstand festhalten"
      end={<span className="ib-register-label">DOKUMENTREGISTER</span>}>
      {docs.isPending ? <Loading />
        : docs.isError ? <ErrorState error={docs.error} onRetry={() => void docs.refetch()} /> :
        !list.length ? <EmptyState title={filter === 'all' ? 'Noch keine Dokumente' : 'Keine Dokumente mit diesem Status'} spray={false} /> :
          <><div className="ib-document-summary"><Reveal stage="metric"><Metric value={list.length} unit={list.length === 1 ? 'Dokument' : 'Dokumente'}
            label="In dieser Ansicht" tone="document" /></Reveal><StatusDistribution documents={list} /></div>
          <div className="ib-documents-workspace">
            <nav aria-label="Dokument auswählen" className="ib-document-index">
              <ul>{list.map(doc => <li key={doc.id}><button type="button" aria-pressed={selected?.id === doc.id}
                onClick={() => setSelectedId(doc.id)}>
                <Icon name="document" size={20} /><span><small>{DOC_KIND_LABEL[doc.kind]} · {DOC_STATUS_LABEL[doc.status]}</small>
                  <strong>{doc.title}</strong><time>{formatDate(doc.created_at)}</time></span>
                <Icon name="chevron" thing="document" size={14} />
              </button></li>)}</ul>
            </nav>
            {selected ? <DocumentEntry doc={selected} key={selected.id}
              person={baseName(recipientName(selected.care_recipient_id, people.data ?? []) ??
                (people.isError ? 'Person nicht geladen' : people.isPending ? 'Person wird geladen' : 'Allgemein'))} /> : null}
          </div></>}

    </Panel>
  </div></Shell>;
}
