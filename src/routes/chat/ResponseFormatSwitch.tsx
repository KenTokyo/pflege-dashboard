import { useDesign } from '../../app/ThemeProvider';
import { Segments } from '../../instrument/grundlage/Segments';
import { LayoutList, Pilcrow } from '../../instrument/chat/ChatIcons';
import type { ResponseFormat } from '../../chat/responseFormat';
import { Segmented } from '../../components/Segmented';

export function ResponseFormatSwitch({ value, onChange, saved }: { value: ResponseFormat; onChange: (value: ResponseFormat) => void; saved: boolean | null }) {
  const { design } = useDesign();
  if (design === 'instrument') return <div className={`response-choice ${saved === false ? 'preference-unsaved' : ''}`}>
    <Segments label="Antwortdarstellung" value={value} onChange={onChange}
      options={[{ value: 'text', label: 'Text' }, { value: 'openui', label: 'OpenUI' }]} />
    <span className="response-choice-note">{saved === false ? 'Auswahl nur für diesen Seitenaufruf.' : 'Gilt für neue Antworten.'}</span>
  </div>;
  return (
    <div className={`response-choice ${saved === false ? 'preference-unsaved' : ''}`}>
      <Segmented className="response-switch" label="Antwortdarstellung" value={value} onChange={onChange}
        title="Die Auswahl gilt für neue Antworten. Gespeicherte Komponentenantworten wechseln auch die Ansicht."
        options={[
          { value: 'text', label: 'Text', icon: <Pilcrow className="i" size={15} aria-hidden="true" /> },
          { value: 'openui', label: 'OpenUI', icon: <LayoutList className="i" size={15} aria-hidden="true" /> },
        ]} />
      <span className="response-choice-note">{saved === false ? 'Auswahl gilt nur für diesen Seitenaufruf.' : 'Gilt für neue Antworten.'}</span>
    </div>
  );
}
