import { useState, type SubmitEvent } from 'react';
import { baseName } from '../../lib/format';
import type { CareRecipient } from '../../services/types';
import { parseFilterRequest, type StaffFilter } from '../../staff/model';
import { Icon } from '../grundlage/Icon';

export function InstrumentWorkbench({ people, disabled, onApply }: {
  people: CareRecipient[]; disabled: boolean; onApply: (filter: StaffFilter) => void;
}) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const examples = ['Alle Fälle nach Priorität', 'Offene Aufgaben nach Frist', people[0] ?
    `Daten zu ${baseName(people[0].name)} nach Frist` : 'Alle Fälle nach Gesprächszahl'];
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const result = parseFilterRequest(input, people);
    if (result.ok) onApply(result.filter);
    setFeedback({ ok: result.ok, text: result.ok ? result.summary : result.message });
  };
  return <section className="is-workbench" aria-label="Filter-Werkbank">
    <p className="is-muted">Erkennt gespeicherte Namen, Aufgaben, Fristen und Priorität. Lokaler Filter · ohne KI-Aufruf.</p>
    <form onSubmit={submit}>
      <label className="sr-only" htmlFor="is-filter-request">Filteranfrage</label>
      <input id="is-filter-request" value={input} maxLength={500} disabled={disabled}
        placeholder="Zum Beispiel: Alle Fälle nach Priorität" aria-describedby="is-filter-help"
        onChange={(event) => { setInput(event.target.value); setFeedback(null); }} />
      <button className="is-button is-primary" type="submit" disabled={disabled || !input.trim()}>
        <span>Ansicht zeigen</span><Icon name="arrow" size={16} /></button>
    </form>
    <div className="is-examples">{examples.map((example) => <button key={example} type="button" disabled={disabled}
      onClick={() => { setInput(example); setFeedback(null); }}>{example}</button>)}</div>
    <p className="is-muted" id="is-filter-help">Für freie Fragen öffnen Sie einen Fall und wählen „KI zu diesem Fall fragen“.</p>
    {feedback ? <p className="is-filter-feedback" data-error={!feedback.ok} role={feedback.ok ? 'status' : 'alert'}>
      <Icon name={feedback.ok ? 'check' : 'warning'} /><span>{feedback.text}</span></p> : null}
  </section>;
}
