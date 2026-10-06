/**
 * `npm start`: der eigene Node-Server liefert das gebaute dist/ und /api auf demselben Ursprung
 * (http://127.0.0.1:5174). Vorher `npm run build`. Kein Vite, keine Edge Functions.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bindProcess, createSupervisor, portBusy, waitForHealth } from './lib/supervisor.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = fileURLToPath(new URL('../dist', import.meta.url));
const API = { host: '127.0.0.1', port: 5174 };

if (!existsSync(`${dist}/index.html`)) {
  console.error('[tagwerk] dist/index.html fehlt. Bitte zuerst `npm run build` ausführen.');
  process.exit(1);
}
if (await portBusy(API.port, API.host)) {
  console.error(`[tagwerk] Port ${API.port} ist schon belegt. Bitte den anderen Prozess selbst beenden; dieses Skript beendet keine fremden Prozesse.`);
  process.exit(1);
}

const supervisor = createSupervisor();
bindProcess(supervisor);
const api = supervisor.start('App-Server', 'npm', ['--prefix', 'backend', 'run', 'serve'], {
  cwd: root,
  env: { ...process.env, HOST: API.host, PORT: String(API.port), STATIC_DIR: dist },
});
if (await waitForHealth(`http://${API.host}:${API.port}/api/health`, { alive: () => supervisor.alive(api) && !supervisor.stopping })) {
  console.error(`[tagwerk] Bereit: http://${API.host}:${API.port} (Strg+C beendet den Server)`);
} else if (!supervisor.stopping) {
  void supervisor.stop('App-Server wurde nicht rechtzeitig bereit (/api/health)', 1);
}
