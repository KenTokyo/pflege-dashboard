import { useState, type SubmitEvent } from 'react';
import { useStartConversation } from '../../chat/useStartConversation';
import { effectiveModel, titleFromQuestion } from '../../data/model';
import { useAgentSettings, useCareRecipients, useModels } from '../../data/queries';
import { baseName } from '../../lib/format';
import { ErrorState } from '../States';
import { CaseIllustration, InstrumentHead, InstrumentIcon } from './InstrumentIcon';

export function InstrumentAsk() {
  const people = useCareRecipients();
  const settings = useAgentSettings();
  const models = useModels();
  const { start, pending, error } = useStartConversation();
  const [question, setQuestion] = useState('');
  const [personId, setPersonId] = useState('');
  const list = people.data ?? [];
  const model = settings.data !== undefined && models.data ? effectiveModel(null, settings.data, models.data) : null;
  const blocked = model !== null && !model.usable;
  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim() || pending || blocked) return;
    try {
      await start({ title: titleFromQuestion(question), careRecipientId: personId || (list.length === 1 ? list[0]?.id ?? null : null), firstMessage: question.trim() });
    } catch {
      // Die vorhandene Gesprächsanbindung liefert den Fehler; der Entwurf bleibt erhalten.
    }
  };
  return <section className="in-card in-ask" aria-label="Sachbearbeiter fragen">
    <InstrumentHead kind="assistant" title="Ihr KI-Sachbearbeiter" subtitle="Fragen klären. Den nächsten Schritt finden." />
    <div className="in-ask-body">
      <CaseIllustration />
      <h2>Sie müssen nicht<br />an alles allein denken.</h2>
      <p>Ob Pflegegrad, Schreiben oder nächste Schritte: Stellen Sie Ihre Frage in Ihren eigenen Worten.</p>
      <form onSubmit={(e) => void submit(e)} className="in-composer">
        <label htmlFor="instrument-question" className="sr-only">Ihre Frage an den Sachbearbeiter</label>
        <textarea id="instrument-question" placeholder="Was möchten Sie zur Pflege klären?" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={8000} disabled={pending} rows={2} />
        <div className="in-composer-foot"><InstrumentIcon kind="conversation" size={17} /><span>Ihre Frage</span><button className="in-send" type="submit" aria-label="Frage senden" disabled={pending || blocked || !question.trim()}><InstrumentIcon kind="arrow" size={18} /></button></div>
      </form>
      {list.length > 1 ? <label className="in-person-select">Bezug<select aria-label="Bezug Ihrer Frage" value={personId} onChange={(e) => setPersonId(e.target.value)}><option value="">Allgemein</option>{list.map((p) => <option key={p.id} value={p.id}>{baseName(p.name)}</option>)}</select></label> : list[0] ? <p className="in-ask-context"><InstrumentIcon kind="person" size={15} />Bezug: {baseName(list[0].name)}</p> : null}
      {blocked ? <p className="in-info" role="status">Noch kein KI-Modell freigegeben. Sobald ein Modell eingerichtet ist, können Sie hier fragen.</p> : null}
      {settings.isError || models.isError ? <p className="in-info">Die Modellfreigabe konnte nicht geladen werden.</p> : null}
      {pending ? <p role="status">Gespräch wird geöffnet …</p> : null}
      {error ? <ErrorState error={error} title="Gespräch konnte nicht angelegt werden" /> : null}
    </div>
    <footer className="in-ask-footer"><InstrumentIcon kind="shield" size={17} /><span>KI kann sich irren. Keine verbindliche Rechts- oder Medizinberatung.</span></footer>
  </section>;
}
