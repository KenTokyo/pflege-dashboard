import { Link } from '@tanstack/react-router';
import { ErrorState, Loading, EmptyState } from '../../components/States';
import { recipientName } from '../../data/model';
import { useConversations } from '../../data/queries';
import { baseName, listWhen } from '../../lib/format';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { Panel } from './Panel';
import { useOverviewQuestion } from './useOverviewQuestion';

export function ConversationsPanel() {
  const q = useOverviewQuestion();
  const conversations = useConversations(false);
  return <Panel index={3} icon="conversation" title="Wobei brauchen Sie Unterstützung?"
    subtitle="Gespräche mit dem KI-Sachbearbeiter">
    <div className="ib-conversation-top">
      <Reveal stage="metric"><Metric value={conversations.data?.length ?? NaN}
        unit={conversations.data?.length === 1 ? 'Gespräch' : 'Gespräche'} label="Aktiv" tone="conversation" /></Reveal>
      <svg className="ib-conversation-drawing" viewBox="0 0 150 90" fill="none" aria-hidden="true">
        <path d="m22 38 48-25 57 29-48 25zM22 38v20l57 29 48-25V42M79 67v20M47 25l57 29M47 38l32 16 25-13"
          stroke="var(--border-strong)" strokeWidth="1" />
        <path d="m56 22 21-11 25 13-21 11z" fill="var(--accent-soft)" stroke="var(--thing-conversation)" />
        <path d="M77 11V3m0 0-4 4m4-4 4 4" stroke="var(--thing-conversation)" />
      </svg>
    </div>
    <Reveal stage="data">
      {conversations.isPending ? <Loading lines={2} /> : conversations.isError ?
        <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} /> :
        conversations.data.length === 0 ? <EmptyState title="Noch keine Gespräche" spray={false} /> :
          <ul className="ib-list">{conversations.data.slice(0, 3).map(c => <li key={c.id}>
            <Link className="ib-list-link" to="/gespraeche/$conversationId" params={{ conversationId: c.id }}>
              <Icon name="conversation" /><span><strong>{c.title}</strong>
                <small>{baseName(recipientName(c.care_recipient_id, q.list) ?? 'Allgemein')}</small></span>
              <time>{listWhen(c.created_at, new Date())}</time><Icon name="chevron" thing="conversation" size={14} />
            </Link>
          </li>)}</ul>}
    </Reveal>
    <Reveal stage="action" className="ib-question">
      <form onSubmit={e => void q.onSubmit(e)}>
        <label htmlFor="ib-question">Ihre Frage</label>
        <textarea id="ib-question" placeholder="Was muss in einen Widerspruch?" value={q.question}
          maxLength={8000} rows={2} disabled={q.pending} onChange={e => q.setQuestion(e.target.value)} />
        <div className="ib-question-actions">
          {q.list.length > 1 ? <label>Bezug<select aria-describedby={q.chosen ? 'ib-chosen-person' : undefined}
            value={q.personId} onChange={e => q.setPersonId(e.target.value)}>
            <option value="auto">Allgemein</option>{q.list.map(p => <option key={p.id} value={p.id}>{baseName(p.name)}</option>)}
          </select></label> : <span className="ib-muted">Keine Rechts- oder Medizinberatung</span>}
          <button type="submit" className="ib-button ib-primary" disabled={q.pending || q.blocked || !q.question.trim()}>
            <span>{q.pending ? 'Wird geöffnet …' : 'Fragen'}</span><Icon name="arrow" size={16} />
          </button>
        </div>
      </form>
      {q.list.length > 1 && q.chosen ? <p id="ib-chosen-person" className="ib-note">
        Bezug: {baseName(recipientName(q.chosen, q.list) ?? '')}</p> : null}
      {q.blocked ? <p className="ib-note" role="status">Noch kein KI-Modell freigegeben.</p> : null}
      {q.error ? <ErrorState error={q.error} title="Gespräch konnte nicht angelegt werden" /> : null}
    </Reveal>
  </Panel>;
}
