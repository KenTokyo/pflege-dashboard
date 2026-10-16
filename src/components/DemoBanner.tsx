import { TriangleAlert } from 'lucide-react';
import { useDesign } from '../app/ThemeProvider';
import { InstrumentDemoBanner } from '../instrument/rahmen/InstrumentDemoBanner';

/** Pflichtbanner der Demo. Bleibt sichtbar, solange der Arbeitsbereich ihn nicht ausschaltet. */
export function DemoBanner() {
  const { design } = useDesign();
  if (design === 'instrument') return <InstrumentDemoBanner />;
  return (
    <div className="demo-banner" role="note" aria-label="Demo-Hinweis">
      <TriangleAlert className="i" size={15} aria-hidden="true" />
      <strong>Demo – keine echten Daten eingeben</strong>
      <span className="demo-detail">Alle Personen und Vorgänge sind fiktiv.</span>
    </div>
  );
}
