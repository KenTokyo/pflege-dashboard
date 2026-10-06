import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Nur für Bildprüfungen: echte App-Komponenten mit synthetischem Testtransport (kein Supabase, kein Login).
// Lädt bewusst keine .env (envDir zeigt auf den Harness-Ordner ohne Env-Dateien).
const root = fileURLToPath(new URL('./tests/harness', import.meta.url));
export default defineConfig({
  root,
  envDir: root,
  plugins: [react(), tailwindcss()],
  server: { port: 5199, strictPort: true, host: '127.0.0.1', hmr: false, watch: null },
  logLevel: 'warn',
});
