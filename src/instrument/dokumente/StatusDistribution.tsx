import { documentStatusCounts, DOC_STATUS_LABEL } from '../../data/model';
import type { DocumentRow, Enums } from '../../services/types';
import { Reveal } from '../grundlage/Reveal';
import './dokumente.css';

export const DOCUMENT_STATUSES: Enums['document_status'][] = ['draft', 'reviewed', 'sent'];

export function StatusDistribution({ documents }: { documents: readonly DocumentRow[] }) {
  const counts = documentStatusCounts(documents);
  return <Reveal stage="data" className="ib-distribution" aria-label="Verteilung nach Dokumentstatus">
    <div className="ib-status-track" aria-hidden="true">
      {DOCUMENT_STATUSES.map(status => <span key={status} data-status={status}
        style={{ flex: counts[status], display: counts[status] ? undefined : 'none' }} />)}
    </div>
    <dl className="ib-status-legend">
      {DOCUMENT_STATUSES.map(status => <div key={status} data-status={status}>
        <dt><i aria-hidden="true" />{DOC_STATUS_LABEL[status]}</dt><dd>{counts[status]}</dd>
      </div>)}
    </dl>
  </Reveal>;
}
