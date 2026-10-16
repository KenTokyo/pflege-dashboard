import { Icon } from '../grundlage/Icon';
import './banner.css';

export function InstrumentDemoBanner() {
  return <div className="in-demo-banner" role="note" aria-label="Demo-Hinweis">
    <Icon name="warning" size={15} /><strong>Demo – keine echten Daten eingeben</strong>
    <span>Alle Personen und Vorgänge sind fiktiv.</span>
  </div>;
}
