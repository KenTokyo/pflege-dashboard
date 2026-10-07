import { X } from 'lucide-react';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useStartConversation } from '../../chat/useStartConversation';
import { ErrorState } from '../../components/States';
import { baseName } from '../../lib/format';
import type { CareRecipient } from '../../services/types';

/** Natives <dialog>: Fokus bleibt im Dialog, Escape schließt. Unter 760 px Vollbild. */
export function NewConversationDialog({ open, onClose, people, initialRecipientId = null }: { open: boolean; onClose: () => void; people: CareRecipient[]; initialRecipientId?: string | null }) {
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
    if (!trimmed || trimmed.length > 120 || pending) return;
    try {
      await start({ title: trimmed, careRecipientId: selectedPersonId || null });
      close();
    } catch {
      // Fehler wird im Dialog angezeigt.
    }
  };

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="new-conv-title" onClose={close} onCancel={close}>
      <form className="dialog-inner" onSubmit={(e) => void onSubmit(e)}>
        <div className="dialog-head">
          <h2 id="new-conv-title">Neues Gespräch</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Dialog schließen">
            <X className="i" size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="dialog-body">
          <div className="field">
            <label htmlFor="new-conv-name">Titel</label>
            <div className="input">
              <input
                id="new-conv-name"
                value={title}
                maxLength={120}
                required
                autoFocus
                placeholder="z. B. Widerspruch vorbereiten"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="new-conv-person">Bezug zu einer Person</label>
            <div className="input">
              <select id="new-conv-person" value={selectedPersonId} onChange={(e) => setPersonId(e.target.value)}>
                <option value="">Allgemein (ohne Person)</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {baseName(p.name)} · Pflegegrad {p.care_grade}
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
          <button type="submit" className="btn btn-primary" disabled={!trimmed || pending}>
            {pending ? 'Wird angelegt …' : 'Gespräch anlegen'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
