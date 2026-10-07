import { ArrowRight, BookOpenText, Compass, ListTodo, MessageSquareText, MessagesSquare, PenLine, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { QUESTION_GROUPS } from './questionExamples';

type Props = {
  onClose: () => void;
  onChoose: (question: string) => void;
  hasDraft: boolean;
  personName: string | null;
};

const GROUP_ICONS = { overview: Compass, tasks: ListTodo, explain: BookOpenText, writing: PenLine, conversation: MessagesSquare };

/** Nur bei geöffnetem Dialog gemountet; die Auswahl startet bei jedem Öffnen neu. */
export function QuestionExamplesDialog({ onClose, onChoose, hasDraft, personName }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [groupId, setGroupId] = useState<string>(QUESTION_GROUPS[0].id);
  const [selected, setSelected] = useState<string | null>(null);
  const group = QUESTION_GROUPS.find((item) => item.id === groupId) ?? QUESTION_GROUPS[0];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog ref={ref} className="dialog question-dialog" aria-labelledby="question-title" aria-describedby="question-intro" onCancel={onClose}>
      <div className="dialog-inner">
        <div className="dialog-head">
          <div className="question-heading">
            <span className="question-heading-icon" aria-hidden="true"><MessageSquareText className="i" size={21} /></span>
            <div><p className="small muted">Ein guter Anfang für Ihr Anliegen</p><h2 id="question-title">Was kann ich fragen?</h2></div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Beispiele schließen" title="Schließen">
            <X className="i" size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="dialog-body question-body">
          <p id="question-intro">Wählen Sie ein Thema und eine Frage. Danach können Sie den Text anpassen und selbst senden.</p>
          <p className="note question-context">
            {personName ? <>Dieses Gespräch bezieht sich auf <strong>{personName}</strong>.</> : 'Für Fragen zu einer Person wählen Sie oben im Gespräch die passende Person aus.'}
          </p>
          <div className="question-categories" role="group" aria-label="Themen für Beispielfragen">
            {QUESTION_GROUPS.map((item) => {
              const Icon = GROUP_ICONS[item.id];
              return (
              <button
                key={item.id}
                type="button"
                className="question-category"
                aria-pressed={item.id === group.id}
                onClick={() => { setGroupId(item.id); setSelected(null); }}
              >
                <Icon className="i" size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
              );
            })}
          </div>
          <div className="question-section-head"><h3>{group.label}</h3><span className="small muted">{group.questions.length} Beispiele</span><p>{group.description}</p></div>
          <fieldset className="question-list">
            <legend className="sr-only">{group.label}: Frage auswählen</legend>
            {group.questions.map((question) => (
              <label key={question.title} className={`question-option ${selected === question.text ? 'is-selected' : ''}`}>
                <input type="radio" name="example-question" value={question.text} checked={selected === question.text} onChange={() => setSelected(question.text)} />
                <span>
                  <strong>{question.title}</strong>
                  <span>{question.text}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="note">Sie erhalten eine Antwort oder einen Textentwurf im Chat. Ihre Aufgaben und Unterlagen werden dadurch nicht geändert. Briefe werden nicht verschickt.</p>
        </div>
        <div className="dialog-foot question-foot">
          <p className="note">{hasDraft ? 'Ihr bisheriger Text bleibt erhalten. Die Frage kommt darunter.' : 'Es wird noch nichts gesendet.'}</p>
          <button type="button" className="btn btn-primary" disabled={!selected} onClick={() => { if (selected) { ref.current?.close(); onChoose(selected); } }}>
            {hasDraft ? 'An meinen Text anhängen' : 'Frage übernehmen'}
            <ArrowRight className="i" size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
