import { Clock, Globe, Info, LogOut, Moon, Pencil, RotateCcw, ShieldCheck, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../app/ThemeProvider';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { Underline } from '../components/Graffiti';
import { Shell } from '../components/Shell';
import { ErrorState, Loading } from '../components/States';
import { MODE_LABEL, REGION_LABEL, modelDisplayName, providerLabel } from '../data/model';
import { useAgentSettings, useDefaultPrompt, useModels, useUpdateAgentSettings } from '../data/queries';
import { formatDate, formatTime } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { AgentSettingsView, ModelRow } from '../services/types';

const MODE_TEXT = {
  answer_only: 'Beantwortet Fragen. Erstellt keine Briefe, Aufgaben oder Notizen.',
  create: 'Erstellen ist eingestellt. Vorschläge für Briefe, Aufgaben und Notizen erscheinen erst, wenn der Server diese Werkzeuge bereitstellt – und werden nur nach Ihrer Bestätigung gespeichert.',
} as const;

function PersonaCard({ view, isAdmin }: { view: AgentSettingsView; isAdmin: boolean }) {
  const { workspace } = useWorkspace();
  const update = useUpdateAgentSettings();
  const defaults = useDefaultPrompt();
  const [editing, setEditing] = useState(false);
  const [persona, setPersona] = useState(view.prompt.persona);
  const [prompt, setPrompt] = useState(view.prompt.system_prompt);
  const isDefault = view.prompt.is_default || defaults.data?.id === view.prompt.id;
  const base = {
    p_workspace_id: workspace.id,
    p_mode: view.version.mode,
    p_model_id: view.version.default_model_id,
    p_expected_revision: view.settings.revision,
  };

  const save = () =>
    update.mutate(
      { ...base, p_reset_to_default: false, p_persona: persona.trim(), p_system_prompt: prompt.trim() },
      { onSuccess: () => setEditing(false) },
    );
  const reset = () => update.mutate({ ...base, p_reset_to_default: true, p_persona: null, p_system_prompt: null }, { onSuccess: () => setEditing(false) });

  return (
    <section className="card" aria-labelledby="persona-title">
      <div className="card-head">
        <h2 id="persona-title">Persona und Systemprompt</h2>
        <span className="head-end small muted num">
          Version {view.prompt.version}
          {isDefault ? ' · Standard' : ''}
        </span>
      </div>
      <p className="small muted">Gespeichert am {formatDate(view.prompt.created_at)}. Jede Änderung wird als neue Version abgelegt.</p>
      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="field">
            <label htmlFor="persona">Persona</label>
            <textarea id="persona" className="textarea" style={{ minHeight: 70 }} value={persona} maxLength={2000} onChange={(e) => setPersona(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="prompt">Systemprompt</label>
            <textarea id="prompt" className="textarea" style={{ minHeight: 160 }} value={prompt} maxLength={12000} onChange={(e) => setPrompt(e.target.value)} />
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 font-bold">{view.prompt.persona}</p>
          <p className="prompt">{view.prompt.system_prompt}</p>
        </>
      )}
      {update.error ? <ErrorState error={update.error} title="Nicht gespeichert" /> : null}
      {isAdmin ? (
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {!isDefault && !editing ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={update.isPending}>
              <RotateCcw className="i" size={15} aria-hidden="true" />
              Auf Standard zurücksetzen
            </button>
          ) : null}
          {editing ? (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setPersona(view.prompt.persona);
                  setPrompt(view.prompt.system_prompt);
                  update.reset();
                  setEditing(false);
                }}
              >
                Abbrechen
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={update.isPending || !persona.trim() || !prompt.trim()}>
                {update.isPending ? 'Wird gespeichert …' : 'Als neue Version speichern'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setPersona(view.prompt.persona);
                setPrompt(view.prompt.system_prompt);
                setEditing(true);
              }}
            >
              <Pencil className="i" size={15} aria-hidden="true" />
              Bearbeiten
            </button>
          )}
        </div>
      ) : (
        <p className="note mt-2">
          <Info className="i" size={15} aria-hidden="true" />
          <span>Änderungen nimmt die Verwaltung des Arbeitsbereichs vor.</span>
        </p>
      )}
    </section>
  );
}

function ModelList({ models, defaultId }: { models: ModelRow[]; defaultId: string | null }) {
  if (models.length === 0) return <p className="small muted">Im Katalog ist noch kein Modell eingetragen.</p>;
  return (
    <ul className="rows">
      {models.map((m) => {
        const ready = m.enabled && m.status === 'operational';
        return (
          <li key={m.id} className="model-row">
            <div className="min-w-0">
              <p className="model-name">
                {modelDisplayName(m.display_name, m.provider)}
                {m.id === defaultId ? <span className="std">Standard</span> : null}
              </p>
              <p className="small muted">
                {providerLabel(m.provider)}
                {m.supports_tools === true ? ' · Werkzeuge' : ''}
                {m.supports_vision === true ? ' · Bilder' : ''}
              </p>
            </div>
            <div className="model-badges">
              <span className={`region ${m.hosting_region === 'eu' ? 'region-eu' : ''}`}>{REGION_LABEL[m.hosting_region]}</span>
              <span className={`pill ${ready ? 'pill-sent' : 'pill-neutral'}`}>{ready ? 'Freigegeben' : m.status === 'retired' ? 'Außer Betrieb' : 'Nicht eingerichtet'}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SettingsPage() {
  useDocumentTitle('Einstellungen');
  const { theme, setTheme } = useTheme();
  const { serverSession, signOut } = useAuth();
  const { role, workspace } = useWorkspace();
  const settings = useAgentSettings();
  const models = useModels();
  const view = settings.data ?? null;

  return (
    <Shell>
      <header className="page-head">
        <div>
          <p className="eyebrow">{workspace.name}</p>
          <h1>Einstellungen</h1>
        </div>
      </header>
      <div className="settings">
        <div className="set-col">
          <section className="card" aria-labelledby="mode-title">
            <div className="card-head">
              <h2 id="mode-title">Modus des Sachbearbeiters</h2>
              <span className="head-end small muted">Standard des Arbeitsbereichs</span>
            </div>
            {settings.isPending ? (
              <Loading lines={2} />
            ) : settings.isError ? (
              <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
            ) : view ? (
              <>
                <div className="mode-current mt-2">
                  <ShieldCheck className="i mt-0.5" size={18} aria-hidden="true" />
                  <div>
                    <span className="mode-title">
                      {MODE_LABEL[view.version.mode]}
                      <Underline />
                    </span>
                    <p className="small muted mt-1.5">{MODE_TEXT[view.version.mode]}</p>
                  </div>
                </div>
                <p className="note mt-3">
                  <Info className="i" size={15} aria-hidden="true" />
                  <span>In dieser Ausbaustufe antwortet der Sachbearbeiter in jedem Modus nur mit Text. Briefe, Aufgaben oder Notizen legt er noch nicht an.</span>
                </p>
              </>
            ) : (
              <p className="small muted">Für diesen Arbeitsbereich sind noch keine Einstellungen hinterlegt.</p>
            )}
          </section>
          {view ? <PersonaCard key={view.settings.revision} view={view} isAdmin={role === 'admin'} /> : null}
        </div>

        <div className="set-col">
          <section className="card" aria-labelledby="models-title">
            <div className="card-head">
              <h2 id="models-title">Modelle</h2>
              <span className="head-end small muted">Katalog des Arbeitsbereichs</span>
            </div>
            {models.isPending ? (
              <Loading lines={3} />
            ) : models.isError ? (
              <ErrorState error={models.error} onRetry={() => void models.refetch()} />
            ) : (
              <ModelList models={models.data} defaultId={view?.version.default_model_id ?? null} />
            )}
            <p className="note mt-2">
              <Globe className="i" size={15} aria-hidden="true" />
              <span>Regionen stammen aus dem Modellkatalog. Vor echtem Einsatz vertraglich prüfen (AVV). Freigaben nimmt die Verwaltung vor.</span>
            </p>
          </section>

          <section className="card" aria-labelledby="look-title">
            <div className="card-head">
              <h2 id="look-title">Darstellung und Sitzung</h2>
            </div>
            <div className="set-row">
              <div>
                <strong>Design</strong>
                <span className="small muted">Ihre Wahl wird auf diesem Gerät gespeichert.</span>
              </div>
              <div className="segmented" role="group" aria-label="Design wählen">
                <button type="button" aria-pressed={theme === 'dunkel'} onClick={() => setTheme('dunkel')}>
                  <Moon className="i" size={15} aria-hidden="true" />
                  Dunkel
                </button>
                <button type="button" aria-pressed={theme === 'hell'} onClick={() => setTheme('hell')}>
                  <Sun className="i" size={15} aria-hidden="true" />
                  Hell
                </button>
              </div>
            </div>
            <div className="set-row">
              <div>
                <strong>Automatische Abmeldung</strong>
                <span className="small muted">{serverSession.state === 'active' && serverSession.sessionPolicy === 'remembered' ? 'Auf diesem Gerät bleibt die Anmeldung bis zu 30 Tage gespeichert. Abmelden entfernt sie sofort.' : 'Ohne gespeicherte Anmeldung: nach 15 Minuten ohne Aktivität, spätestens nach 8 Stunden.'}</span>
                <span className="mt-1 flex items-center gap-1.5 small muted">
                  <Clock className="i" size={14} aria-hidden="true" />
                  {serverSession.state === 'active'
                    ? `Zugang gültig bis spätestens ${formatDate(serverSession.expiresAt)} um ${formatTime(serverSession.expiresAt)} Uhr.`
                    : serverSession.state === 'unavailable'
                      ? `Serverseitige Sitzungsprüfung nicht erreichbar: ${serverSession.error.message}`
                      : 'Serverseitige Sitzung wird geprüft …'}
                </span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => signOut('manual')}>
                <LogOut className="i" size={15} aria-hidden="true" />
                Abmelden
              </button>
            </div>
            <div className="set-row">
              <div>
                <strong>Demo-Hinweis</strong>
                <span className="small muted">
                  {workspace.demoBanner
                    ? '„Demo – keine echten Daten eingeben“ ist sichtbar. Nur fiktive Daten verwenden.'
                    : 'Der Demo-Hinweis ist für diesen Arbeitsbereich ausgeschaltet.'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
