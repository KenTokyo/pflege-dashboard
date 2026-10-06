import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { ProxyOptions } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * /api gehört dem eigenen Node-Server (Standard 127.0.0.1:5174), nicht Vite. Im Dev leitet Vite nur
 * weiter: gleicher Ursprung für den Browser, keine Edge Functions. Produktion/Vorschau: `npm start`,
 * dort liefert der Node-Server dist/ und /api selbst.
 * Ist der Server nicht erreichbar, antwortet der Proxy im Vertragsformat (502 NETWORK).
 * Es werden weder Header noch Bodys protokolliert, also auch kein Bearer-Token.
 */
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5174';
const apiProxy: Record<string, ProxyOptions> = {
  '^/api/': {
    target: apiTarget,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('error', (_err, _req, res) => {
        if (!('req' in res)) return; // WebSocket: nicht genutzt
        const response = res;
        if (response.headersSent || response.writableEnded) return;
        response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(
          JSON.stringify({
            error: { code: 'NETWORK', message: 'App-Server nicht erreichbar.', requestId: '', retryable: true },
          }),
        );
      });
    },
  },
};

// Produkt-Build: nur index.html. Der Prüf-Harness unter tests/harness hat eine eigene Konfiguration
// und gelangt nie in dist/. Nur VITE_-Werte erreichen den Browser (Vite-Standard, hier ausdrücklich).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: 'VITE_',
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: apiProxy },
  build: {
    sourcemap: false,
    target: 'es2022',
    rolldownOptions: {
      output: {
        // Fremdbibliotheken getrennt cachen; Seiten werden zusätzlich nach Bedarf geladen.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'tanstack', test: /node_modules[\\/]@tanstack[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    restoreMocks: true,
  },
});
