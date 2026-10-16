import type { Design } from '../../lib/design';
import { Segments } from './Segments';

export function DesignSwitch({ value, onChange }: { value: Design; onChange: (value: Design) => void }) {
  return <div className="set-row">
    <div><strong>Oberfläche</strong><span className="small muted">Ihre Wahl wird auf diesem Gerät gespeichert.</span></div>
    {value === 'instrument' ? <Segments label="Oberfläche wählen" value={value} onChange={onChange}
      options={[{ value: 'tagwerk', label: 'Tagwerk' }, { value: 'instrument', label: 'Instrument' }]} />
      : <div className="segmented" role="group" aria-label="Oberfläche wählen">
        <button type="button" aria-pressed={true} onClick={() => onChange('tagwerk')}>Tagwerk</button>
        <button type="button" aria-pressed={false} onClick={() => onChange('instrument')}>Instrument</button>
      </div>}
  </div>;
}
