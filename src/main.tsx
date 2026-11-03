import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import './styles/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ConfigMissing } from './routes/ConfigMissing';
import { createQueryClient } from './data/queries';
import { readPublicConfig } from './lib/env';
import { createSupabaseBackend } from './services/supabaseBackend';

const root = document.getElementById('root');
if (!root) throw new Error('Wurzelelement fehlt');

const config = readPublicConfig();
createRoot(root).render(
  <StrictMode>
    {config.ok ? (
      <App backend={createSupabaseBackend(config.config)} queryClient={createQueryClient()} />
    ) : (
      <ConfigMissing missing={config.missing} />
    )}
  </StrictMode>,
);
