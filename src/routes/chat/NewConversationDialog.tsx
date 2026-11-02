import { useDesign } from '../../app/ThemeProvider';
import { Icon } from '../../instrument/grundlage/Icon';
import '../../instrument/chat/dialogs.css';
import { X } from '../../instrument/chat/ChatIcons';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useStartConversation } from '../../chat/useStartConversation';
import { ErrorState } from '../../components/States';
import { UNTITLED_CONVERSATION } from '../../data/model';
import { baseName } from '../../lib/format';
import type { CareRecipient } from '../../services/types';

/** Natives <dialog>: Fokus bleibt im Dialog, Escape schließt. Unter 760 px Vollbild. */
export function NewConversationDialog({ open, onClose, people, initialRecipientId = null }: { open: boolean; onClose: () => void; people: CareRecipient[]; initialRecipientId?: string | null }) {
  const { design } = useDesign();
  const ref = useRef<HTMLDialogElement>(null);
  const { start, pending, error, reset } = useStartConversation();
  const [title, setTitle] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const preferredPersonId = personId ?? initialRecipientId ?? '';
  const selectedPersonId = people.some((p) => p.id === preferredPersonId) ? preferredPersonId : '';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    reset();
    setTitle('');
    setPersonId(null);
    onClose();
  };

  const trimmed = title.trim();
  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (trimmed.length > 120 || pending) return;
    try {
      // Ohne Titel benennt die erste Frage das Gespräch automatisch (siehe Thread).
      await start({ title: trimmed || UNTITLED_CONVERSATION, careRecipientId: selectedPersonId || null });
      close();
    } catch {
      // Fehler wird im Dialog angezeigt.
    }
  };

  return (
    <dialog ref={ref} className={`dialog ${design === 'instrument' ? 'in-chat-dialog' : ''}`} aria-labelledby="new-conv-title" onClose={close} onCancel={close}>
      <form className="dialog-inner" onSubmit={(e) => void onSubmit(e)}>
        <div className="dialog-head">
          {design === 'instrument' ? <div className="in-chat-dialog-heading">
            <span className="in-chat-dialog-symbol"><Icon name="conversation" size={18} /></span>
            <h2 id="new-conv-title">Neues Gespräch</h2>
          </div> : <h2 id="new-conv-title">Neues Gespräch</h2>}
          <button type="button" className="icon-btn" onClick={close} aria-label="Dialog schließen">
            <X className="i" size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="dialog-body">
          <div className="field">
            <label htmlFor="new-conv-name">Titel <span className="label-optional">(optional)</span></label>
            <div className="input">
              <input
                id="new-conv-name"
                value={title}
                maxLength={120}
                aria-describedby="new-conv-name-note"
                autoFocus
                placeholder="Leer lassen – entsteht aus der ersten Frage"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <p className="note" id="new-conv-name-note">Ohne Titel benennt der Sachbearbeiter das Gespräch nach Ihrer ersten Frage.</p>
          </div>
          <div className="field">
            <label htmlFor="new-conv-person">Bezug zu einer Person</label>
            <div className="input">
              <select id="new-conv-person" value={selectedPersonId} onChange={(e) => setPersonId(e.target.value)}>
                <option value="">Allgemein (ohne Person)</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {baseName(p.name)} · {p.care_grade === 0 ? 'Kein Pflegegrad' : `Pflegegrad ${p.care_grade}`}
                  </option>
                ))}
              </select>
            </div>
            <p className="note">Der Sachbearbeiter berücksichtigt dann Pflegegrad, Kasse und offene Aufgaben dieser Person.</p>
          </div>
          {error ? <ErrorState error={error} title="Gespräch konnte nicht angelegt werden" /> : null}
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={close}>
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Wird angelegt …' : 'Gespräch anlegen'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
