import { useStartConversation } from '../../chat/useStartConversation';
import { ErrorState } from '../../components/States';
import { ageFrom, baseName } from '../../lib/format';
import type { CareRecipient } from '../../services/types';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Panel } from './Panel';
import './uebersicht.css';

export function PeoplePanel({ people }: { people: CareRecipient[] }) {
  const { start, pending, error } = useStartConversation();
  return <Panel icon="person" title="Für wen organisieren Sie Pflege?" subtitle="Hinterlegte Personen und Einstufung">
    <ul className="ib-people">
      {people.map(person => {
        const age = ageFrom(person.birth_date, new Date());
        return <li key={person.id}>
          <div className="ib-person-heading">
            <h3>{baseName(person.name)}</h3>
            <span className="ib-muted">{[age !== null ? `${age} Jahre` : null,
              person.name.includes('fiktiv') ? 'fiktiv' : null].filter(Boolean).join(' · ')}</span>
          </div>
          <Reveal stage="metric"><Metric value={person.care_grade} unit="von 5" label="Pflegegrad" tone="person" /></Reveal>
          <Reveal stage="data">
            <div className="ib-grade" aria-label={`Pflegegrad ${person.care_grade} auf der Skala von 0 bis 5`}>
              {[0, 1, 2, 3, 4, 5].map(grade => <span key={grade} data-active={grade <= person.care_grade}
                data-current={grade === person.care_grade}><i /><b>{grade}</b></span>)}
            </div>
          </Reveal>
          <dl className="ib-person-facts"><div><dt>Pflegekasse</dt>
            <dd>{person.insurerName ? baseName(person.insurerName) : 'Nicht hinterlegt'}</dd></div></dl>
          {person.summary ? <p className="ib-person-summary">{person.summary}</p> : null}
          <Reveal stage="action"><button type="button" className="ib-button" disabled={pending}
            onClick={() => void start({ title: `Pflege für ${baseName(person.name)}`, careRecipientId: person.id }).catch(() => {})}>
            <Icon name="conversation" /><span>{pending ? 'Wird geöffnet …' : 'Zur Person fragen'}</span>
          </button></Reveal>
        </li>;
      })}
    </ul>
    {error ? <ErrorState error={error} title="Gespräch konnte nicht angelegt werden" /> : null}
  </Panel>;
}
