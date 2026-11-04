import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useWorkspace } from '../../auth/AuthProvider';
import { useSpeechInput } from '../../chat/useSpeechInput';
import { useStartConversation } from '../../chat/useStartConversation';
import { CareFigure, FIGURE, figurePose, useTypingPulse } from '../../components/CareFigure';
import { NavIcon } from '../../components/NavIcon';
import { Select } from '../../components/Select';
import { ErrorState } from '../../components/States';
import { effectiveModel, UNTITLED_CONVERSATION } from '../../data/model';
import { useAgentSettings, useCareRecipients, useModels } from '../../data/queries';
import { baseName } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { messageFor } from '../../services/errors';
import { MAX_MESSAGE } from './Composer';
import { QuestionExamplesDialog } from './QuestionExamplesDialog';
import { appendQuestion, QUESTION_GROUPS } from './questionExamples';

const QUICK: readonly { title: string; text: string }[] = QUESTION_GROUPS.slice(0, 3).flatMap((g): { title: string; text: string }[] => g.questions.slice(0, 1));
const step = (i: number) => ({ '--i': i }) as CSSProperties;

/**
 * Startfläche (Chat zuerst, wie OALab „Neues Gespräch“): die Pflege-Figur grüßt im ruhigen Kreis mit Sprechblase,
 * darunter die Eingabekarte. Beim Tippen schaut sie aufs Feld, beim Anlegen denkt sie nach. Senden legt ein
 * Gespräch an (Titel entsteht aus der Frage) und übergibt die Frage an das Gespräch, das sie sofort stellt.
 */
export function NewChat() {
  useDocumentTitle('Neues Gespräch');
  const { profile } = useWorkspace();
  const people = useCareRecipients().data ?? [];
  const settings = useAgentSettings();
  const models = useModels();
  const { start, pending, error } = useStartConversation();
  const [text, setText] = useState('');
  const [personId, setPersonId] = useState('');
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [typing, pulse] = useTypingPulse();
  const input = useRef<HTMLTextAreaElement>(null);
  const change = (value: string) => {
    setText(value);
    pulse();
  };
  const speech = useSpeechInput(text, change, pending || examplesOpen);

  const model = settings.data !== undefined && models.data ? effectiveModel(null, settings.data, models.data) : null;
  const blocked = model && !model.usable ? `${messageFor('NO_MODEL')} Die Verwaltung muss ein geprüftes Modell freigeben.` : null;
  const tooLong = text.length > MAX_MESSAGE;
  const canSend = !pending && !blocked && !speech.active && text.trim().length > 0 && !tooLong;
  const first = baseName(profile.displayName).split(/\s+/)[0] ?? '';
  const person = people.find((p) => p.id === personId) ?? null;

  const send = async () => {
    if (!canSend) return;
    try {
      await start({ title: UNTITLED_CONVERSATION, careRecipientId: personId || null, firstMessage: text.trim() });
    } catch {
      // Fehler steht unter der Karte; der Text bleibt erhalten.
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="newchat">
      <div className="newchat-col fx-fall">
        <header className="host-h" style={step(0)}>
          <CareFigure pose={figurePose({ thinking: pending, typing: typing || speech.active })} />
          <div className="host-bubble">
            <p className="host-from">{FIGURE.from}</p>
            <p className="host-hello">{first ? `Hallo ${first}!` : 'Hallo!'}</p>
            <h1 id="newchat-title">Wobei kann ich helfen?</h1>
            <p className="host-sub">Fragen Sie zu Pflegegrad, Fristen, Anträgen oder einem Schreiben. Ich nenne Unsicherheiten und ersetze keine Rechts- oder Medizinberatung.</p>
          </div>
        </header>

        <form className="newreq-card" style={step(1)} aria-labelledby="newchat-title" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <label htmlFor="newchat-input" className="sr-only">Ihre Frage an den Sachbearbeiter</label>
          <textarea id="newchat-input" ref={input} value={text} onChange={(e) => change(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Beschreiben Sie Ihre Frage … zum Beispiel: Welche Frist gilt für einen Widerspruch?"
            aria-invalid={tooLong} aria-describedby="newchat-note" disabled={pending} />
          {speech.status || speech.error || speech.interim ? (
            <div className={`speech-status ${speech.error ? 'is-error' : ''}`} role={speech.error ? 'alert' : 'status'}>
              <span>{speech.error ?? speech.status}</span>
              {speech.interim ? <span className="speech-interim">{speech.interim}</span> : null}
            </div>
          ) : null}
          <div className="newreq-bar">
            <Select aria-label="Bezug zu einer Person" size="sm" className="newreq-person" value={personId} onChange={setPersonId}
              icon={<NavIcon name={personId ? 'person' : 'people'} size={14} />}
              display={(o) => (o?.value ? o.label : 'Allgemein')}
              options={[{ value: '', label: 'Allgemein (ohne Person)' },
                ...people.map((p) => ({ value: p.id, label: baseName(p.name), hint: p.care_grade === 0 ? 'Kein Pflegegrad' : `Pflegegrad ${p.care_grade}` }))]} />
            <button type="button" className={`ibtn ${speech.active ? 'is-recording' : ''}`} onClick={() => (speech.active ? speech.stop() : speech.start())}
              disabled={!speech.supported || pending} aria-pressed={speech.active}
              aria-label={speech.active ? 'Spracheingabe beenden' : 'Spracheingabe starten'}
              title={!speech.supported ? 'Dieser Browser bietet keine Spracheingabe an.' : speech.active ? 'Aufnahme beenden und Text prüfen' : 'Frage diktieren, vor dem Senden prüfen'}>
              <NavIcon name={speech.active ? 'mic-off' : 'mic'} />
            </button>
            <button type="button" className="ibtn" onClick={() => setExamplesOpen(true)} aria-label="Was kann ich fragen?" title="Beispielfragen">
              <NavIcon name="examples" />
            </button>
            <span className="newreq-hint"><NavIcon name="lock" size={13} />Nur in Ihrem Arbeitsbereich gespeichert</span>
            <span className="grow" />
            <button type="submit" className={`btn btn-primary newreq-send ${pending ? 'is-loading' : ''}`} disabled={!canSend} aria-label="Frage senden">
              <NavIcon name="send" size={14} />
              <span className="btn-label">Frage senden</span>
            </button>
          </div>
        </form>

        <p className="newreq-note" id="newchat-note" style={step(2)}>
          {tooLong ? <span className="text-danger">Höchstens {MAX_MESSAGE.toLocaleString('de-DE')} Zeichen je Nachricht.</span>
            : blocked ?? (person ? `Der Sachbearbeiter berücksichtigt Pflegegrad, Kasse und offene Aufgaben von ${baseName(person.name)}.`
              : 'Enter sendet, Umschalt + Enter macht eine neue Zeile. Fristen und Beträge bitte immer anhand Ihrer Unterlagen prüfen.')}
        </p>
        {error ? <div style={step(3)}><ErrorState error={error} title="Gespräch konnte nicht angelegt werden" /></div> : null}

        <section className="newchat-quick" aria-labelledby="quick-title" style={step(3)}>
          <h2 id="quick-title" className="eyebrow">Zum Beispiel</h2>
          <ul>
            {QUICK.map((q) => (
              <li key={q.title}>
                <button type="button" className="quick-row" onClick={() => { change(appendQuestion(text, q.text)); input.current?.focus(); }}>
                  <NavIcon name="chat" size={14} />
                  <span>{q.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {examplesOpen ? (
        <QuestionExamplesDialog personName={person ? baseName(person.name) : null} hasDraft={Boolean(text.trim())}
          onClose={() => setExamplesOpen(false)}
          onChoose={(q) => { change(appendQuestion(text, q)); setExamplesOpen(false); input.current?.focus(); }} />
      ) : null}
    </div>
  );
}
