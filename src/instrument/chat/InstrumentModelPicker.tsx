import { useRef } from 'react';
import { modelDisplayName, REGION_LABEL } from '../../data/model';
import type { ModelRow } from '../../services/types';
import { Icon } from '../grundlage/Icon';
import './model-picker.css';

type Props = {
  available: ModelRow[];
  current: ModelRow | null;
  workspaceDefault: ModelRow | undefined;
  overrideId: string | null;
  unavailableLabel: string | null;
  disabled: boolean;
  onChange: (id: string | null) => void;
};

/** Natives Aufklappen statt abgeschnittener Modellnamen in einer schmalen Select-Zeile. */
export function InstrumentModelPicker({ available, current, workspaceDefault, overrideId, unavailableLabel, disabled, onChange }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const label = current ? modelDisplayName(current.display_name, current.provider) : 'Kein Modell freigegeben';
  const choose = (id: string | null) => {
    if (ref.current) {
      ref.current.open = false;
      ref.current.querySelector('summary')?.focus();
    }
    if (id !== overrideId) onChange(id);
  };
  return <details ref={ref} className="in-chat-model-picker" onKeyDown={(event) => {
    if (event.key === 'Escape' && ref.current?.open) {
      ref.current.open = false;
      ref.current.querySelector('summary')?.focus();
    }
  }}>
    <summary aria-label={`Modell für die nächste Antwort: ${label}`} aria-disabled={disabled}
      onClick={(event) => { if (disabled) event.preventDefault(); }}>
      <Icon name="ai" size={16} /><span>{label}<small>{overrideId ? 'Für dieses Gespräch' : 'Standard aus Einstellungen'}
        {current ? ` · ${REGION_LABEL[current.hosting_region]}` : ''}</small></span><Icon name="chevron" size={14} />
    </summary>
    <fieldset className="in-chat-model-options" disabled={disabled}>
      <legend className="sr-only">Modell für die nächste Antwort</legend>
      <label><input type="radio" name="instrument-chat-model" checked={overrideId === null} onChange={() => choose(null)} />
        <span>Standard aus Einstellungen<small>{workspaceDefault
          ? modelDisplayName(workspaceDefault.display_name, workspaceDefault.provider) : 'Kein Modell freigegeben'}</small></span></label>
      {unavailableLabel ? <label><input type="radio" name="instrument-chat-model" checked readOnly disabled />
        <span>{unavailableLabel}<small>Gespeichertes Modell · nicht verfügbar</small></span></label> : null}
      {available.map((model) => <label key={model.id}>
        <input type="radio" name="instrument-chat-model" checked={overrideId === model.id} onChange={() => choose(model.id)} />
        <span>{modelDisplayName(model.display_name, model.provider)}<small>{REGION_LABEL[model.hosting_region]}</small></span>
      </label>)}
    </fieldset>
  </details>;
}
