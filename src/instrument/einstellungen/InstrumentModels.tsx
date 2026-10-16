import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState, Loading } from '../../components/States';
import { modelDisplayName, providerLabel, REGION_LABEL } from '../../data/model';
import type { ModelRow } from '../../services/types';
import { CardHead } from '../grundlage/CardHead';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';

export function InstrumentModels({ query, defaultId }: { query: UseQueryResult<ModelRow[]>; defaultId: string | null }) {
  const ready = query.data?.filter((model) => model.enabled && model.status === 'operational').length ?? 0;
  return <Reveal stage="frame" index={1} className="in-card in-settings-models">
    <CardHead icon="ai" title="Modelle" id="models-title" subtitle="Katalog des Arbeitsbereichs" />
    {query.isPending ? <div className="in-settings-body"><Loading lines={3} /></div> : query.isError ?
      <div className="in-settings-body"><ErrorState error={query.error} onRetry={() => void query.refetch()} /></div> : <>
        <Reveal stage="metric" className="in-settings-model-summary">
          <Metric value={ready} unit={`von ${query.data.length}`} label="Freigegeben" tone="ai" />
          <div className="in-model-matrix" aria-label={`${ready} von ${query.data.length} Modellen freigegeben`}>
            {query.data.map((model) => <span key={model.id} className={model.enabled && model.status === 'operational' ? 'is-ready' : ''}
              aria-hidden="true" />)}
          </div>
        </Reveal>
        {query.data.length ? <ul className="in-settings-model-list">{query.data.map((model) => {
          const operational = model.enabled && model.status === 'operational';
          return <li key={model.id}>
            <Icon name="ai" size={18} />
            <div className="in-settings-model-name"><strong>{modelDisplayName(model.display_name, model.provider)}</strong>
              <p>{providerLabel(model.provider)}{model.supports_tools === true ? ' · Werkzeuge' : ''}
                {model.supports_vision === true ? ' · Bilder' : ''}</p></div>
            <div className="in-settings-model-meta">
              {model.id === defaultId ? <span className="in-badge">Standard</span> : null}
              <span className="in-badge">{REGION_LABEL[model.hosting_region]}</span>
              <span className={`in-badge ${operational ? 'in-badge-good' : ''}`}>
                {operational ? 'Freigegeben' : model.status === 'retired' ? 'Außer Betrieb' : 'Nicht eingerichtet'}</span>
            </div>
          </li>;
        })}</ul> : <p className="in-settings-body in-hint">Im Katalog ist noch kein Modell eingetragen.</p>}
      </>}
    <div className="in-settings-body in-settings-model-note"><p className="in-hint"><Icon name="globe" size={16} />
      <span>Regionen stammen aus dem Modellkatalog. Vor echtem Einsatz vertraglich prüfen (AVV).
        Freigaben nimmt die Verwaltung vor.</span></p></div>
  </Reveal>;
}
