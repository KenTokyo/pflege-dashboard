import { LayoutList, Pilcrow } from 'lucide-react';
import type { ResponseFormat } from '../../chat/responseFormat';

export function ResponseFormatSwitch({ value, onChange, saved }: { value: ResponseFormat; onChange: (value: ResponseFormat) => void; saved: boolean | null }) {
  return (
    <div className={`response-choice ${saved === false ? 'preference-unsaved' : ''}`}>
      <div className="segmented response-switch" role="group" aria-label="Antwortdarstellung" title="Die Auswahl gilt für neue Antworten. Gespeicherte Komponentenantworten wechseln auch die Ansicht.">
        <button type="button" aria-pressed={value === 'text'} onClick={() => onChange('text')}>
          <Pilcrow className="i" size={15} aria-hidden="true" />
          Text
        </button>
        <button type="button" aria-pressed={value === 'openui'} onClick={() => onChange('openui')}>
          <LayoutList className="i" size={15} aria-hidden="true" />
          OpenUI
        </button>
      </div>
      <span className="response-choice-note">{saved === false ? 'Auswahl gilt nur für diesen Seitenaufruf.' : 'Gilt für neue Antworten.'}</span>
    </div>
  );
}
