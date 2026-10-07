import { ChevronDown, Code2 } from 'lucide-react';
import type { ChatActivity } from '../../../types/phase1';
import { providerLabel } from '../../data/model';
import { parseActivity } from '../../chat/activity';

const STAGE: Record<ChatActivity['stage'], string> = {
  auth_verified: 'Anmeldung geprüft',
  context_ready: 'Gespräch und Personendaten geladen',
  token_count: 'Eingabelänge geprüft',
  provider_request: 'Anfrage an den KI-Anbieter',
  awaiting_text: 'Auf den ersten Antworttext warten',
  streaming: 'Antworttext empfangen',
  persisting: 'Antwort und Nutzung speichern',
};
const SOURCE: Record<ChatActivity['source'], string> = {
  supabase_auth: 'Supabase Auth', supabase_sql_rpc: 'Supabase-Datenbank', provider_http: 'Anbieter-API', provider_stream: 'Antwortstream',
};
const THINKING = { disabled: 'deaktiviert', low: 'niedrig', provider_default: 'Vorgabe des Anbieters' };

export function ActivityView({ activity }: { activity: readonly ChatActivity[] }) {
  const safe = activity.map(parseActivity).filter((item): item is ChatActivity => item !== null);
  if (safe.length === 0) return null;
  const thinking = safe.findLast((item) => item.details?.thinking)?.details?.thinking;
  return (
    <details className="activity-view">
      <summary><Code2 className="i" size={16} aria-hidden="true" /><span>Ablauf und Technik</span><span className="small muted">{safe.length} Schritte</span><ChevronDown className="i activity-chevron" size={16} aria-hidden="true" /></summary>
      <div className="activity-body">
        <p className="small muted">Vom Server gemeldete Schritte dieses Seitenaufrufs. Gedankeninhalte werden nicht angezeigt.</p>
        {thinking ? <p className="small">Thinking-Konfiguration: <strong>{THINKING[thinking]}</strong></p> : null}
        <ol className="activity-steps">
          {safe.map((item, index) => <li key={`${item.stage}-${item.at}-${index}`}>
            <span className="activity-step-dot" aria-hidden="true" />
            <span><strong>{STAGE[item.stage]}</strong><span className="small muted">{SOURCE[item.source]}{item.provider ? ` · ${providerLabel(item.provider)}` : ''}{item.details?.operation ? ` · ${item.details.operation}` : ''}</span></span>
            <time className="small muted num" dateTime={item.at}>{(item.elapsedMs / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} s</time>
          </li>)}
        </ol>
        <details className="activity-json"><summary>Bereinigtes JSON</summary><pre>{JSON.stringify(safe, null, 2)}</pre></details>
      </div>
    </details>
  );
}
