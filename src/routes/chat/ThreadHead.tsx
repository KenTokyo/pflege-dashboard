import { Link } from '@tanstack/react-router';
import { Archive, ArchiveRestore, ArrowLeft, Check, Cpu, Pencil, X } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { ErrorState } from '../../components/States';
import { MODE_LABEL, REGION_LABEL, modelDisplayName, type EffectiveModel } from '../../data/model';
import { useArchiveConversation, useAssignRecipient, useRenameConversation } from '../../data/queries';
import { baseName } from '../../lib/format';
import type { AppError, CareRecipient, ConversationRow, Enums, ModelRow } from '../../services/types';

type Props = {
  conversation: ConversationRow;
  people: CareRecipient[];
  mode: Enums['agent_mode'] | null;
  model: EffectiveModel | null;
  models: ModelRow[];
  defaultModelId: string | null;
  busy: boolean;
  changingModel: boolean;
  modelError: AppError | null;
  onModelChange: (modelId: string | null) => void;
};

export function ThreadHead({ conversation, people, mode, model, models, defaultModelId, busy, changingModel, modelError, onModelChange }: Props) {
  const rename = useRenameConversation();
  const archive = useArchiveConversation();
  const assign = useAssignRecipient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const error = rename.error ?? archive.error ?? assign.error ?? modelError;
  const archived = conversation.archived_at !== null;
  const availableModels = models.filter((m) => m.enabled && m.status === 'operational');
  const workspaceDefault = models.find((m) => m.id === defaultModelId);
  const overrideUnavailable = conversation.model_override_id !== null && !availableModels.some((m) => m.id === conversation.model_override_id);
  const unavailableOverride = overrideUnavailable ? models.find((m) => m.id === conversation.model_override_id) : null;

  const save = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = title.trim();
    if (!next || next.length > 120) return;
    if (next === conversation.title) {
      setEditing(false);
      return;
    }
    try {
      await rename.mutateAsync({ conversation, title: next });
      setEditing(false);
    } catch {
      setTitle(next);
    }
  };

  return (
    <header className="thread-head">
      <Link to="/gespraeche" className="icon-btn lg:hidden" aria-label="Zurück zur Gesprächsliste">
        <ArrowLeft className="i" size={18} aria-hidden="true" />
      </Link>
      <div className="thread-title">
        {editing ? (
          <form className="title-edit" onSubmit={(e) => void save(e)}>
            <label htmlFor="title-input" className="sr-only">
              Titel des Gesprächs
            </label>
            <input
              id="title-input"
              value={title}
              maxLength={120}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setTitle(conversation.title);
                  setEditing(false);
                }
              }}
            />
            <button type="submit" className="icon-btn" aria-label="Titel speichern" disabled={rename.isPending || !title.trim()}>
              <Check className="i" size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Umbenennen abbrechen"
              onClick={() => {
                setTitle(conversation.title);
                setEditing(false);
              }}
            >
              <X className="i" size={18} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <h1 title={conversation.title}>{conversation.title}</h1>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setTitle(conversation.title);
                rename.reset();
                setEditing(true);
              }}
              aria-label="Gespräch umbenennen"
              title="Umbenennen"
            >
              <Pencil className="i" size={15} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="thread-context">
          <div className="thread-person">
          <label htmlFor="assign-person" className="assign-label small muted">
            Bezug
          </label>
          <select
            id="assign-person"
            className="person-select"
            value={conversation.care_recipient_id ?? ''}
            disabled={assign.isPending || busy}
            title={busy ? 'Während einer laufenden Antwort nicht änderbar' : 'Person zuordnen'}
            onChange={(e) =>
              assign.mutate({
                p_conversation_id: conversation.id,
                p_care_recipient_id: e.target.value || null,
                p_expected_revision: conversation.revision,
              })
            }
          >
            <option value="">Allgemein</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {baseName(p.name)} · {p.care_grade === 0 ? 'Kein Pflegegrad' : `Pflegegrad ${p.care_grade}`}
              </option>
            ))}
          </select>
          </div>
        </div>
      </div>
      <div className="thread-tools">
        {mode ? (
          <span className="chip-static chip-mode" title="Modus laut Einstellungen">
            {MODE_LABEL[mode]}
          </span>
        ) : null}
        <label className="chip-static model-picker" title={busy ? 'Während einer laufenden Antwort oder Änderung nicht änderbar' : 'Modell für die nächste Antwort'}>
          <Cpu className="i" size={15} aria-hidden="true" />
          <span className="sr-only">Modell für die nächste Antwort</span>
          <select
            aria-label="Modell für die nächste Antwort"
            value={conversation.model_override_id ?? ''}
            disabled={busy || models.length === 0}
            onChange={(e) => {
              const id = e.target.value;
              if (id !== '' && !availableModels.some((m) => m.id === id)) return;
              if ((id || null) !== conversation.model_override_id) onModelChange(id || null);
            }}
          >
            <option value="">{workspaceDefault ? `Standard · ${modelDisplayName(workspaceDefault.display_name, workspaceDefault.provider)}` : 'Kein Modell freigegeben'}</option>
            {overrideUnavailable ? <option value={conversation.model_override_id ?? ''} disabled>{unavailableOverride ? modelDisplayName(unavailableOverride.display_name, unavailableOverride.provider) : 'Gespeichertes Modell'} · nicht verfügbar</option> : null}
            {availableModels.map((m) => <option key={m.id} value={m.id}>{modelDisplayName(m.display_name, m.provider)}</option>)}
          </select>
          {model?.model ? <span className={`region ${model.model.hosting_region === 'eu' ? 'region-eu' : ''}`}>{REGION_LABEL[model.model.hosting_region]}</span> : null}
        </label>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-label={archived ? 'Gespräch wiederherstellen' : 'Gespräch archivieren'}
          title={archived ? 'Wiederherstellen' : 'Archivieren'}
          disabled={archive.isPending || busy}
          onClick={() => archive.mutate({ conversation, archived: !archived })}
        >
          {archived ? <ArchiveRestore className="i" size={15} aria-hidden="true" /> : <Archive className="i" size={15} aria-hidden="true" />}
          <span className="btn-label">{archived ? 'Wiederherstellen' : 'Archivieren'}</span>
        </button>
      </div>
      {changingModel ? <p className="w-full small muted" role="status">Modell wird gespeichert …</p> : null}
      {error ? (
        <div className="w-full">
          <ErrorState error={error} title="Änderung nicht gespeichert" />
        </div>
      ) : null}
    </header>
  );
}
