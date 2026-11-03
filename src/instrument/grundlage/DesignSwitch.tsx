import type { Design } from '../../lib/design';
import { Segments } from './Segments';
import { Segmented } from '../../components/Segmented';

export function DesignSwitch({ value, onChange }: { value: Design; onChange: (value: Design) => void }) {
  return <div className="set-row">
    <div><strong>Oberfläche</strong><span className="small muted">Ihre Wahl wird auf diesem Gerät gespeichert.</span></div>
    {value === 'instrument' ? <Segments label="Oberfläche wählen" value={value} onChange={onChange}
      options={[{ value: 'tagwerk', label: 'Tagwerk' }, { value: 'instrument', label: 'Instrument' }]} />
      : <Segmented label="Oberfläche wählen" value={value} onChange={onChange}
        options={[{ value: 'tagwerk', label: 'Tagwerk' }, { value: 'instrument', label: 'Instrument' }]} />}
  </div>;
}
