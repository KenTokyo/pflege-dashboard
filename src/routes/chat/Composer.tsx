import { ArrowUp, ShieldCheck, Square } from 'lucide-react';
import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';

export const MAX_MESSAGE = 8000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  /** Grund, warum gerade nicht gesendet werden kann (wird angezeigt). */
  blockedReason: string | null;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
};

export function Composer({ value, onChange, onSend, onStop, streaming, blockedReason, inputRef }: Props) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? localRef;
  const tooLong = value.length > MAX_MESSAGE;
  const canSend = !streaming && !blockedReason && value.trim().length > 0 && !tooLong;

  // Höhe an den Inhalt anpassen (bis max-height), nur bei Eingabe.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value, ref]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="composer">
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
          <button type="button" className="btn btn-secondary composer-send" onClick={onStop} aria-label="Antwort abbrechen" title="Antwort abbrechen">
            <Square className="i" size={16} aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" className="btn btn-primary composer-send" disabled={!canSend} aria-label="Nachricht senden" title="Senden (Enter)">
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
