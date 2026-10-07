import { ArrowUp, MessageSquareText, Mic, MicOff, ShieldCheck, Square } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

import { QuestionExamplesDialog } from './QuestionExamplesDialog';
import { appendQuestion } from './questionExamples';
import { useSpeechInput } from '../../chat/useSpeechInput';
import type { ResponseFormat } from '../../chat/responseFormat';
import { ResponseFormatSwitch } from './ResponseFormatSwitch';

export const MAX_MESSAGE = 8000;

type Props = {
  value: string;
  personName?: string | null;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  /** Grund, warum gerade nicht gesendet werden kann (wird angezeigt). */
  blockedReason: string | null;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  responseFormat: ResponseFormat;
  onResponseFormatChange: (value: ResponseFormat) => void;
  responseFormatSaved: boolean | null;
};

export function Composer({ value, onChange, onSend, onStop, streaming, blockedReason, inputRef, personName = null, responseFormat, onResponseFormatChange, responseFormatSaved }: Props) {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? localRef;
  const tooLong = value.length > MAX_MESSAGE;
  const speech = useSpeechInput(value, onChange, streaming || Boolean(blockedReason) || examplesOpen);
  const canSend = !streaming && !blockedReason && !speech.active && value.trim().length > 0 && !tooLong;

  // Höhe an den Inhalt anpassen (bis max-height), nur bei Eingabe.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value, ref]);

  // Der Abbruch-Knopf verschwindet, sobald die Antwort endet. Lag der Fokus auf ihm (Tastatur),
  // geht er ins Eingabefeld statt auf die Seite verloren.
  const stopFocused = useRef(false);
  useEffect(() => {
    if (streaming || !stopFocused.current) return;
    stopFocused.current = false;
    const active = document.activeElement;
    if (!active || active === document.body) ref.current?.focus();
  }, [streaming, ref]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="composer">
      <div className="composer-examples">
        <button type="button" className="btn btn-ghost btn-sm question-button" aria-label="Was kann ich fragen?" onClick={() => setExamplesOpen(true)}>
          <MessageSquareText className="i" size={16} aria-hidden="true" />
          <span className="question-button-label">Was kann ich fragen?</span>
          <span className="question-button-label-short" aria-hidden="true">Beispiele</span>
        </button>
        <ResponseFormatSwitch value={responseFormat} onChange={onResponseFormatChange} saved={responseFormatSaved} />
        <button
          type="button"
          className={`icon-btn speech-button ${speech.active ? 'is-recording' : ''}`}
          onClick={() => speech.active ? speech.stop() : speech.start()}
          disabled={!speech.supported || streaming || Boolean(blockedReason) || examplesOpen}
          aria-label={speech.active ? 'Spracheingabe beenden' : 'Spracheingabe starten'}
          aria-pressed={speech.active}
          title={!speech.supported ? 'Dieser Browser bietet keine Spracheingabe an. Bitte Frage eintippen.' : speech.active ? 'Aufnahme beenden und Text prüfen' : 'Frage diktieren, vor dem Senden prüfen'}
        >
          {speech.active ? <MicOff className="i" size={17} aria-hidden="true" /> : <Mic className="i" size={17} aria-hidden="true" />}
        </button>
      </div>
      {speech.status || speech.error || speech.interim ? (
        <div className={`speech-status ${speech.error ? 'is-error' : ''}`} role={speech.error ? 'alert' : 'status'}>
          <span>{speech.error ?? speech.status}</span>
          {speech.interim ? <span className="speech-interim">{speech.interim}</span> : null}
          {speech.active ? <span className="small muted">Spracherkennung über Ihren Browser. Prüfen Sie den Text vor dem Senden.</span> : null}
        </div>
      ) : null}
      {examplesOpen ? (
        <QuestionExamplesDialog
          personName={personName}
          hasDraft={Boolean(value.trim())}
          onClose={() => setExamplesOpen(false)}
          onChoose={(question) => {
            onChange(appendQuestion(value, question));
            setExamplesOpen(false);
            ref.current?.focus();
          }}
        />
      ) : null}
      {blockedReason ? (
        <p className="note mx-auto mb-2 max-w-[860px]" role="status">
          <ShieldCheck className="i" size={15} aria-hidden="true" />
          <span>{blockedReason}</span>
        </p>
      ) : null}
      <form
        className="composer-box"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSend();
        }}
      >
        <label htmlFor="composer" className="sr-only">
          Nachricht an den Sachbearbeiter
        </label>
        <textarea
          id="composer"
          ref={ref}
          className="composer-input"
          rows={1}
          placeholder={blockedReason ? 'Senden derzeit nicht möglich' : 'Nachricht an den Sachbearbeiter …'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby="composer-hint"
          aria-invalid={tooLong}
        />
        {streaming ? (
          <button
            key="stop"
            type="button"
            className="btn btn-secondary composer-send"
            onClick={onStop}
            onFocus={() => (stopFocused.current = true)}
            onBlur={(e) => {
              if (e.target.isConnected) stopFocused.current = false;
            }}
            aria-label="Antwort abbrechen"
            title="Antwort abbrechen"
          >
            <Square className="i" size={16} aria-hidden="true" />
          </button>
        ) : (
          <button key="send" type="submit" className="btn btn-primary composer-send" disabled={!canSend} aria-label="Nachricht senden" title="Senden (Enter)">
            <ArrowUp className="i" size={18} aria-hidden="true" />
          </button>
        )}
      </form>
      <p id="composer-hint" className="honesty">
        <ShieldCheck className="i" size={14} aria-hidden="true" />
        {tooLong ? (
          <span className="text-danger">Höchstens {MAX_MESSAGE.toLocaleString('de-DE')} Zeichen je Nachricht.</span>
        ) : (
          <span>Keine Rechts- oder Medizinberatung. Fristen und Beträge bitte immer anhand Ihrer Unterlagen prüfen.</span>
        )}
      </p>
    </div>
  );
}
