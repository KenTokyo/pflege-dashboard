import type { ChatActivity } from '../../../types/phase1';
import { parseActivity } from '../../chat/activity';
import { Icon } from '../grundlage/Icon';

const STAGES: Record<ChatActivity['stage'], string> = {
  auth_verified: 'Anmeldung geprüft',
  context_ready: 'Gesprächsdaten geladen',
  token_count: 'Eingabelänge geprüft',
  provider_request: 'Anbieter angefragt',
  awaiting_text: 'Anbieter verarbeitet die Anfrage',
  streaming: 'Antworttext wird empfangen',
  persisting: 'Antwort wird gespeichert',
};

/** Nur tatsächlich gemeldete Werte, keine geschätzte Dauer oder Prozent-Fortschritte. */
export function InstrumentProgress({ activity, characters, label }: {
  activity: readonly ChatActivity[]; characters: number; label: string;
}) {
  const last = activity.map(parseActivity).filter((item) => item !== null).at(-1);
  return <div className="in-chat-progress" role="status">
    <Icon name="ai" size={16} />
    <span>{label === 'Denkt nach …' ? 'Wartet auf Antwort …' : label}</span>
    <output aria-label={`${characters} Zeichen empfangen`}>{characters.toLocaleString('de-DE')} Zeichen</output>
    {last ? <small>{STAGES[last.stage]} · {(last.elapsedMs / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} s</small> : null}
  </div>;
}
