import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

// Produkt-Build: nur index.html. Der Prüf-Harness unter tests/harness hat eine eigene Konfiguration
// und gelangt nie in dist/. Nur VITE_-Werte erreichen den Browser (Vite-Standard, hier ausdrücklich).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: 'VITE_',
  server: { port: 5173, strictPort: true },
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
