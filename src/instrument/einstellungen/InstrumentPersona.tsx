import { formatDate } from '../../lib/format';
import type { AgentSettingsView } from '../../services/types';
import { ErrorState } from '../../components/States';
import { CardHead } from '../grundlage/CardHead';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import './einstellungen.css';
import '../grundlage/controls.css';

type Props = {
  view: AgentSettingsView; isAdmin: boolean; isDefault: boolean; editing: boolean; persona: string; prompt: string;
  pending: boolean; error: unknown; setPersona: (value: string) => void; setPrompt: (value: string) => void;
  save: () => void; reset: () => void; cancel: () => void; edit: () => void;
};

export function InstrumentPersona({ view, isAdmin, isDefault, editing, persona, prompt, pending, error,
  setPersona, setPrompt, save, reset, cancel, edit }: Props) {
  return <Reveal stage="frame" index={2} className="in-card in-settings-persona">
    <CardHead icon="document" title="Persona und Systemprompt" id="persona-title"
      subtitle={`Gespeichert am ${formatDate(view.prompt.created_at)}`} end={isDefault ? <span className="in-badge">Standard</span> : null} />
    <div className="in-settings-persona-grid">
      <Reveal stage="metric" className="in-settings-version">
        <Metric value={view.prompt.version} unit="Version" label="Gespeicherte Anweisung" tone="document" />
        <p>Jede Änderung wird als neue Version abgelegt.</p>
      </Reveal>
      <div className="in-settings-prompt-body">
        {editing ? <div className="in-settings-editor">
          <label className="in-field" htmlFor="persona"><span className="in-field-label">Persona</span>
            <textarea id="persona" className="in-textarea" value={persona} maxLength={2000}
              onChange={(event) => setPersona(event.target.value)} /></label>
          <label className="in-field" htmlFor="prompt"><span className="in-field-label">Systemprompt</span>
            <textarea id="prompt" className="in-textarea in-settings-prompt-input" value={prompt} maxLength={12000}
              onChange={(event) => setPrompt(event.target.value)} /></label>
        </div> : <>
          <h3>{view.prompt.persona}</h3><p className="in-settings-prompt">{view.prompt.system_prompt}</p>
        </>}
        {error ? <ErrorState error={error} title="Nicht gespeichert" /> : null}
      </div>
    </div>
    <Reveal stage="action" className="in-settings-footer">
      {isAdmin ? <>
        {!isDefault && !editing ? <button type="button" className="in-button" disabled={pending} onClick={reset}>
          <Icon name="reset" size={16} /><span>Auf Standard zurücksetzen</span></button> : null}
        {editing ? <>
          <button type="button" className="in-button" onClick={cancel}>Abbrechen</button>
          <button type="button" className="in-button in-button-primary" onClick={save} disabled={pending || !persona.trim() || !prompt.trim()}>
            {pending ? 'Wird gespeichert …' : 'Als neue Version speichern'}</button>
        </> : <button type="button" className="in-button" onClick={edit}>
          <Icon name="edit" size={16} /><span>Bearbeiten</span></button>}
      </> : <p className="in-hint"><Icon name="shield" size={16} />Änderungen nimmt die Verwaltung des Arbeitsbereichs vor.</p>}
    </Reveal>
  </Reveal>;
}
