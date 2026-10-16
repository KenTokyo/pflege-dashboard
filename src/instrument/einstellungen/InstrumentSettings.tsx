import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useDesign, useTheme } from '../../app/ThemeProvider';
import { useAuth, useWorkspace } from '../../auth/AuthProvider';
import { Shell } from '../../components/Shell';
import { ErrorState, Loading } from '../../components/States';
import { MODE_LABEL } from '../../data/model';
import { formatDate, formatTime } from '../../lib/format';
import type { AgentSettingsView, ModelRow } from '../../services/types';
import { CardHead } from '../grundlage/CardHead';
import { DesignSwitch } from '../grundlage/DesignSwitch';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Segments } from '../grundlage/Segments';
import { InstrumentModels } from './InstrumentModels';
import '../grundlage/controls.css';
import './einstellungen.css';

type Props = {
  settings: UseQueryResult<AgentSettingsView | null>; models: UseQueryResult<ModelRow[]>;
  persona: ReactNode; modeText: Readonly<Record<'answer_only' | 'create', string>>;
};

export function InstrumentSettings({ settings, models, persona, modeText }: Props) {
  const { workspace } = useWorkspace();
  const { serverSession, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { design, setDesign } = useDesign();
  const view = settings.data;
  const remembered = serverSession.state === 'active' && serverSession.sessionPolicy === 'remembered';
  return <Shell>
    <Reveal stage="head" className="in-settings-heading"><div><h1>Einstellungen</h1>
      <p>{workspace.name}</p></div></Reveal>
    <div className="in-settings-grid">
      <Reveal stage="frame" className="in-card in-settings-mode">
        <CardHead icon="shield" title="Modus des Sachbearbeiters" id="mode-title" subtitle="Standard des Arbeitsbereichs" />
        <div className="in-settings-body">
          {settings.isPending ? <Loading lines={2} /> : settings.isError ? <ErrorState error={settings.error}
            onRetry={() => void settings.refetch()} /> : view ? <>
              <h3 className="in-settings-mode-value">{MODE_LABEL[view.version.mode]}</h3>
              <p className="in-settings-description">{modeText[view.version.mode]}</p>
              <Reveal stage="data" className="in-settings-capabilities" aria-label="Aktuell: Textantworten. Erstellen noch nicht verfügbar.">
                <div><Icon name="conversation" /><span>Textantworten</span><span className="in-badge in-badge-good">Aktiv</span></div>
                <div><Icon name="document" /><span>Briefe, Aufgaben, Notizen anlegen</span><span className="in-badge">Noch nicht verfügbar</span></div>
              </Reveal>
              <p className="in-hint"><Icon name="shield" size={16} /><span>In dieser Ausbaustufe antwortet der Sachbearbeiter
                in jedem Modus nur mit Text.</span></p>
            </> : <p className="in-hint">Für diesen Arbeitsbereich sind noch keine Einstellungen hinterlegt.</p>}
        </div>
      </Reveal>
      <InstrumentModels query={models} defaultId={view?.version.default_model_id ?? null} />
      {persona}
      <Reveal stage="frame" index={3} className="in-card in-settings-look">
        <CardHead icon="settings" title="Darstellung und Sitzung" id="look-title" subtitle="Einstellungen auf diesem Gerät" />
        <div className="in-settings-device-grid">
          <div className="in-settings-display">
            <DesignSwitch value={design} onChange={setDesign} />
            <div className="in-settings-choice"><div><strong>Helligkeit</strong><p>Ihre Wahl wird auf diesem Gerät gespeichert.</p></div>
              <Segments label="Helligkeit wählen" value={theme} onChange={setTheme} options={[
                { value: 'dunkel', label: <><Icon name="moon" size={16} />Dunkel</> },
                { value: 'hell', label: <><Icon name="sun" size={16} />Hell</> },
              ]} /></div>
            <div className="in-settings-demo"><Icon name="shield" /><div><strong>Demo-Hinweis</strong><p>{workspace.demoBanner
              ? '„Demo – keine echten Daten eingeben“ ist sichtbar. Nur fiktive Daten verwenden.'
              : 'Der Demo-Hinweis ist für diesen Arbeitsbereich ausgeschaltet.'}</p></div></div>
          </div>
          <div className="in-settings-session">
            <Reveal stage="metric"><Metric value={remembered ? 30 : 15} unit={remembered ? 'Tage' : 'Minuten'}
              label={remembered ? 'Anmeldung gespeichert bis zu' : 'Automatische Abmeldung ohne Aktivität nach'} tone="deadline" /></Reveal>
            <p>{remembered ? 'Abmelden entfernt die gespeicherte Sitzung sofort.'
              : 'Ohne gespeicherte Anmeldung endet die Sitzung spätestens nach 8 Stunden.'}</p>
            <p className="in-hint"><Icon name="deadline" size={16} /><span>{serverSession.state === 'active'
              ? `Zugang gültig bis spätestens ${formatDate(serverSession.expiresAt)} um ${formatTime(serverSession.expiresAt)} Uhr.`
              : serverSession.state === 'unavailable' ? `Serverseitige Sitzungsprüfung nicht erreichbar: ${serverSession.error.message}`
              : 'Serverseitige Sitzung wird geprüft …'}</span></p>
            <Reveal stage="action"><button type="button" className="in-button" onClick={() => signOut('manual')}>
              <Icon name="logout" size={16} /><span>Abmelden</span></button></Reveal>
          </div>
        </div>
      </Reveal>
    </div>
  </Shell>;
}
