import { useState, type SubmitEvent } from 'react';
import { Archive, ArchiveRestore, Check, Cpu, Pencil, X } from '../../instrument/chat/ChatIcons';
import { NavIcon } from '../../components/NavIcon';
import { Select, type SelectOption } from '../../components/Select';
import { ErrorState } from '../../components/States';
import { MODE_LABEL, REGION_LABEL, modelDisplayName } from '../../data/model';
import { useArchiveConversation, useAssignRecipient, useRenameConversation } from '../../data/queries';
import { baseName } from '../../lib/format';
import type { ThreadHeadProps } from './ThreadHead';

/*
 * Tagwerk-Gesprächskopf (V2: eine 46-px-Leiste wie OALab): Titel und eine Zeile mit dem Wichtigsten (Person, Modell, Modus, Region) als
 * Aufklapp-Knopf. Aufgeklappt eine Leiste mit den eigentlichen Auswahlfeldern. Die Wahl auf/zu gilt bis zum
 * Neuladen für alle Gespräche (kein Speicher außerhalb des ThemeProviders).
 */
let detailsOpen = false;

const careGrade = (grade: number) => (grade === 0 ? 'Kein Pflegegrad' : `Pflegegrad ${grade}`);

export function TagwerkThreadHead({ conversation, people, mode, model, models, defaultModelId, busy, changingModel, modelError, onModelChange }: ThreadHeadProps) {
  const rename = useRenameConversation();
  const archive = useArchiveConversation();
  const assign = useAssignRecipient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [open, setOpenState] = useState(detailsOpen);
  const setOpen = (next: boolean) => { detailsOpen = next; setOpenState(next); };
  const error = rename.error ?? archive.error ?? assign.error ?? modelError;
  const archived = conversation.archived_at !== null;
  const availableModels = models.filter((m) => m.enabled && m.status === 'operational');
  const workspaceDefault = models.find((m) => m.id === defaultModelId);
  const overrideUnavailable = conversation.model_override_id !== null && !availableModels.some((m) => m.id === conversation.model_override_id);
  const unavailableOverride = overrideUnavailable ? models.find((m) => m.id === conversation.model_override_id) : null;
  const person = people.find((p) => p.id === conversation.care_recipient_id);
  const modelBusy = busy || models.length === 0;

  const personOptions: SelectOption[] = [
    { value: '', label: 'Allgemein', hint: 'ohne Person' },
    ...people.map((p) => ({ value: p.id, label: baseName(p.name), hint: careGrade(p.care_grade) })),
  ];
  const modelOptions: SelectOption[] = [
    { value: '', label: workspaceDefault ? `Standard · ${modelDisplayName(workspaceDefault.display_name, workspaceDefault.provider)}` : 'Kein Modell freigegeben' },
    ...(overrideUnavailable ? [{
      value: conversation.model_override_id ?? '', disabled: true, hint: 'nicht verfügbar',
      label: unavailableOverride ? modelDisplayName(unavailableOverride.display_name, unavailableOverride.provider) : 'Gespeichertes Modell',
    }] : []),
    ...availableModels.map((m) => ({ value: m.id, label: modelDisplayName(m.display_name, m.provider) })),
  ];

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

  const region = model?.model ? model.model.hosting_region : null;

  return (
    <header className="th" data-open={open || undefined}>
      <div className="th-bar">
        <div className="th-main">
          {editing ? (
            <form className="title-edit th-edit" onSubmit={(e) => void save(e)}>
              <label htmlFor="title-input" className="sr-only">Titel des Gesprächs</label>
              <input id="title-input" value={title} maxLength={120} autoFocus onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setTitle(conversation.title);
                    setEditing(false);
                  }
                }} />
              <button type="submit" className="icon-btn" aria-label="Titel speichern" disabled={rename.isPending || !title.trim()}>
                <Check className="i" size={18} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" aria-label="Umbenennen abbrechen"
                onClick={() => { setTitle(conversation.title); setEditing(false); }}>
                <X className="i" size={18} aria-hidden="true" />
              </button>
            </form>
          ) : (
            <div className="th-title">
              <h1 title={conversation.title}>{conversation.title}</h1>
              <button type="button" className="icon-btn th-rename" aria-label="Gespräch umbenennen" title="Umbenennen"
                onClick={() => { setTitle(conversation.title); rename.reset(); setEditing(true); }}>
                <Pencil className="i" size={15} aria-hidden="true" />
              </button>
            </div>
          )}
          <button type="button" className="th-summary" aria-expanded={open} aria-controls="th-details"
            aria-label={open ? 'Gesprächsdetails ausblenden' : 'Gesprächsdetails zeigen'} onClick={() => setOpen(!open)}>
            <span className={`th-pill ${person ? '' : 'is-general'}`}>
              <NavIcon name={person ? 'person' : 'people'} size={13} />
              {person ? baseName(person.name) : 'Allgemein'}
            </span>
            <span className="th-pill">
              <Cpu className="i" size={14} aria-hidden="true" />
              {model?.model ? model.model.display_name : 'Kein Modell'}
            </span>
            {mode ? <span className="th-pill th-pill-mode">{MODE_LABEL[mode]}</span> : null}
            {region ? <span className={`th-pill th-pill-region ${region === 'eu' ? 'is-eu' : ''}`}>{REGION_LABEL[region]}</span> : null}
            <span className="th-more">
              <span>{open ? 'Weniger' : 'Details'}</span>
              <svg className="th-chev" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m4.5 6.5 3.5 3.5 3.5-3.5" /></svg>
            </span>
          </button>
        </div>
        <button type="button" className="btn btn-secondary btn-sm th-archive"
          aria-label={archived ? 'Gespräch wiederherstellen' : 'Gespräch archivieren'} title={archived ? 'Wiederherstellen' : 'Archivieren'}
          disabled={archive.isPending || busy} onClick={() => archive.mutate({ conversation, archived: !archived })}>
          {archived ? <ArchiveRestore className="i" size={15} aria-hidden="true" /> : <Archive className="i" size={15} aria-hidden="true" />}
          <span className="btn-label">{archived ? 'Wiederherstellen' : 'Archivieren'}</span>
        </button>
      </div>

      <div id="th-details" className="th-details" inert={!open} aria-hidden={!open || undefined}>
        <div className="th-details-clip">
          <div className="th-details-inner">
            <div className="th-field">
              <label htmlFor="assign-person">Bezug</label>
              <Select id="assign-person" value={conversation.care_recipient_id ?? ''} options={personOptions}
                disabled={assign.isPending || busy} title={busy ? 'Während einer laufenden Antwort nicht änderbar' : 'Person zuordnen'}
                display={(o) => (o ? <>{o.label}{o.hint && o.value ? <span className="th-soft">{o.hint}</span> : null}</> : 'Allgemein')}
                onChange={(id) => assign.mutate({ p_conversation_id: conversation.id, p_care_recipient_id: id || null, p_expected_revision: conversation.revision })} />
            </div>
            <div className="th-field th-field-wide">
              <span className="th-label" aria-hidden="true">Modell für die nächste Antwort</span>
              <Select aria-label="Modell für die nächste Antwort" value={conversation.model_override_id ?? ''} options={modelOptions}
                disabled={modelBusy} icon={<Cpu className="i" size={15} aria-hidden="true" />}
                title={busy ? 'Während einer laufenden Antwort oder Änderung nicht änderbar' : 'Modell für die nächste Antwort'}
                onChange={(id) => {
                  if (id !== '' && !availableModels.some((m) => m.id === id)) return;
                  if ((id || null) !== conversation.model_override_id) onModelChange(id || null);
                }} />
            </div>
            <div className="th-field">
              <span className="th-label">Modus</span>
              <span className="th-fact">
                {mode ? MODE_LABEL[mode] : '–'}
                {region ? <span className={`region ${region === 'eu' ? 'region-eu' : ''}`}>{REGION_LABEL[region]}</span> : null}
              </span>
            </div>
          </div>
        </div>
      </div>

      {changingModel ? <p className="th-status small muted" role="status">Modell wird gespeichert …</p> : null}
      {error ? <div className="th-status"><ErrorState error={error} title="Änderung nicht gespeichert" /></div> : null}
    </header>
  );
}
