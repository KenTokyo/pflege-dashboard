import { Loading, ErrorState } from '../../components/States';
import { formatDate, formatTime } from '../../lib/format';
import type { useStaffOverview } from '../../staff/queries';
import { CardHead } from '../grundlage/CardHead';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import './analysis.css';

const number = (value: number) => value.toLocaleString('de-DE');

export function UsageAnalysis({ query }: { query: ReturnType<typeof useStaffOverview> }) {
  const metrics = query.data;
  const statuses = metrics ? [
    { label: 'Abgeschlossen', value: metrics.totals.completedRequests, tone: 'conversation' },
    { label: 'Fehlgeschlagen', value: metrics.totals.failedRequests, tone: 'deadline' },
    { label: 'Unterbrochen', value: metrics.totals.interruptedRequests, tone: 'document' },
  ] : [];
  const classified = statuses.reduce((sum, item) => sum + item.value, 0);
  if (metrics && metrics.totals.requests > classified) {
    statuses.push({ label: 'Sonstige Zustände', value: metrics.totals.requests - classified, tone: 'ai' });
  }
  return <section className="in-card is-analysis" aria-labelledby="is-analysis-title">
    <CardHead icon="ai" title="Echte Modellnutzung" id="is-analysis-title" subtitle={metrics ?
      `Supabase · Stand ${formatDate(metrics.generatedAt)}, ${formatTime(metrics.generatedAt)} Uhr` : 'Supabase · gesamter Arbeitsbereich'} />
    {query.isPending ? <Loading lines={2} /> : query.isError ?
      <ErrorState title="Gesprächszahlen und Modellnutzung nicht verfügbar" error={query.error}
        onRetry={() => void query.refetch()} /> : metrics ? <div className="is-analysis-body">
        <div className="is-request-analysis"><Reveal stage="metric"><Metric value={metrics.totals.requests}
          label="Tatsächlich ausgeführt" unit={metrics.totals.requests === 1 ? 'Anfrage' : 'Anfragen'} tone="ai" /></Reveal>
          <Reveal stage="data"><div className="is-status-bar" aria-hidden="true">
            {statuses.filter((item) => item.value).map((item) => <span key={item.label}
              style={{ flex: item.value, background: `var(--thing-${item.tone})` }} />)}
          </div><dl className="is-status-legend">{statuses.map((item) => <div key={item.label}>
            <dt><i style={{ background: `var(--thing-${item.tone})` }} />{item.label}</dt><dd>{number(item.value)}</dd>
          </div>)}</dl></Reveal>
        </div>
        <div className="is-model-analysis">{metrics.usage.length ? <ul>{metrics.usage.map((model) =>
          <li key={model.modelId}><div><h3>{model.displayName}</h3><p>{model.provider} · {model.providerModelId}</p></div>
            <div><strong>{number(model.requests)}</strong><span>{model.requests === 1 ? 'Nutzung' : 'Nutzungen'}</span></div>
            <div><strong>{number(model.inputTokens + model.outputTokens)}</strong>
              <span>{model.inputTokens + model.outputTokens === 1 ? 'Token' : 'Tokens'}</span>
              <small>{number(model.inputTokens)} ein / {number(model.outputTokens)} aus</small></div></li>)}</ul> :
          <div className="is-usage-empty"><span className="is-empty-trace" aria-hidden="true" />
            <h3>Noch keine abgeschlossene Modellnutzung gespeichert.</h3>
            <p>Beispielgespräche zählen als gespeicherte Gespräche, nicht als echte KI-Aufrufe.</p></div>}
          <p className="is-analysis-note">Tokens sind Textbausteine des Modells. Abokosten lassen sich daraus nicht zuverlässig berechnen.</p>
        </div>
      </div> : null}
  </section>;
}
