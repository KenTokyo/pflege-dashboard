import { ArrowRight, ListFilter } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { baseName } from '../lib/format';
import type { CareRecipient } from '../services/types';
import { parseFilterRequest, type StaffFilter } from './model';

export function FilterWorkbench({ people, disabled, onApply }: { people: CareRecipient[]; disabled: boolean; onApply: (filter: StaffFilter) => void }) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const examples = ['Alle Fälle nach Priorität', 'Offene Aufgaben nach Frist', people[0] ? `Daten zu ${baseName(people[0].name)} nach Frist` : 'Alle Fälle nach Gesprächszahl'];
  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled) return;
    const result = parseFilterRequest(input, people);
    if (result.ok) onApply(result.filter);
    setFeedback({ ok: result.ok, text: result.ok ? result.summary : result.message });
  };
  return <section className="sf-workbench" aria-labelledby="staff-workbench-title">
    <div className="sf-wb-head"><h2 id="staff-workbench-title"><ListFilter className="i" size={14} aria-hidden="true" />Ihre Arbeitsansicht</h2><p>Person und Sortierung als Filteranfrage eingeben. Ohne KI-Aufruf.</p><span className="lt-chip">Vorhandene Daten</span></div>
    <form onSubmit={submit} className="sf-request"><label className="sr-only" htmlFor="staff-request">Filteranfrage</label><input id="staff-request" placeholder="Zum Beispiel: Alle Fälle nach Priorität" value={input} onChange={(e) => { setInput(e.target.value); setFeedback(null); }} maxLength={500} disabled={disabled} aria-describedby="staff-filter-help" /><button className="btn btn-primary" type="submit" disabled={disabled || !input.trim()}>Ansicht zeigen<ArrowRight className="i" size={14} aria-hidden="true" /></button></form>
    <div className="sf-examples">{examples.map((example) => <button type="button" key={example} onClick={() => { setInput(example); setFeedback(null); }} disabled={disabled}>{example}</button>)}</div>
    <p id="staff-filter-help" className="sf-help">Erkennt gespeicherte Namen, Aufgaben, Frist, Priorität und Gesprächszahl. Für freie Fragen nutzen Sie „KI fragen“.</p>
    {feedback ? <p className={`sf-feedback ${feedback.ok ? '' : 'is-error'}`} role={feedback.ok ? 'status' : 'alert'}>{feedback.text}</p> : null}
  </section>;
}
