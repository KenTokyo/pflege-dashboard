import type { ReactNode } from 'react';
import { DemoBanner } from '../../components/DemoBanner';
import { ErrorState, Loading } from '../../components/States';
import { Icon } from '../grundlage/Icon';
import { InstrumentGateFrame } from './InstrumentStates';

export function InstrumentGate({ status, error, retry, signOut }: {
  status: 'loading' | 'noAccess' | 'error'; error?: unknown; retry: () => void; signOut: () => void;
}) {
  let content: ReactNode;
  if (status === 'loading') content = <Loading label="Arbeitsbereich wird geladen …" />;
  else content = <>
    {status === 'noAccess' ? <div className="in-gate-no-access" role="alert">
      <h1>Kein Zugang zu einem Arbeitsbereich</h1>
      <p>Ihre Anmeldung ist gültig, aber für dieses Konto ist keine aktive Mitgliedschaft eingetragen.
        Bitte wenden Sie sich an die Verwaltung.</p>
    </div> : <ErrorState error={error} title="Arbeitsbereich konnte nicht geladen werden" onRetry={retry} />}
    <div className="in-gate-actions"><button type="button" className="in-button" onClick={signOut}>
      <Icon name="logout" size={16} /><span>Abmelden</span></button></div>
  </>;
  return <><DemoBanner /><InstrumentGateFrame kind={status === 'loading' ? 'loading' : 'access'}>{content}</InstrumentGateFrame></>;
}

export function InstrumentConfigMissing({ missing }: { missing: string[] }) {
  return <><DemoBanner /><InstrumentGateFrame kind="connection">
    <div className="in-gate-no-access" role="alert"><h1>Verbindung zu Supabase fehlt</h1>
      <p>Diese Ausgabe wurde ohne öffentliche Projektwerte gebaut.</p>
      <ul className="in-config-list" aria-label="Fehlende Projektwerte">{missing.map((name) => <li key={name}>
        <Icon name="warning" size={16} /><code>{name}</code><span className="in-badge">Fehlt</span></li>)}</ul>
      <p>Bitte die Werte in der lokalen Umgebung setzen und neu bauen.</p>
    </div>
  </InstrumentGateFrame></>;
}
