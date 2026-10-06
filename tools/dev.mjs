/**
 * `npm run dev`: eigener Node-App-Server (127.0.0.1:5174) und Vite (127.0.0.1:5173) gemeinsam.
 * Vite leitet /api an den Node-Server weiter. Der Node-Server liest .env selbst; dieses Skript
 * liest, kopiert und protokolliert keine Werte. Endet ein Dienst oder kommt Strg+C, enden beide.
 */
import { fileURLToPath } from 'node:url';
import { bindProcess, createSupervisor, portBusy, waitForHealth } from './lib/supervisor.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const API = { host: '127.0.0.1', port: 5174 };
const WEB = { host: '127.0.0.1', port: 5173 };

for (const [label, { host, port }] of [['App-Server', API], ['Vite', WEB]]) {
  if (await portBusy(port, host)) {
    console.error(`[tagwerk] Port ${port} (${label}) ist schon belegt. Bitte den anderen Prozess selbst beenden; dieses Skript beendet keine fremden Prozesse.`);
    process.exit(1);
  }
}

// Im Dev nur API; STATIC_DIR gilt ausschließlich für `npm start`.
const baseEnv = { ...process.env };
delete baseEnv.STATIC_DIR;
const supervisor = createSupervisor();
bindProcess(supervisor);

const api = supervisor.start('App-Server', 'npm', ['--prefix', 'backend', 'run', 'serve'], {
  cwd: root,
  env: { ...baseEnv, HOST: API.host, PORT: String(API.port) },
});
const healthy = await waitForHealth(`http://${API.host}:${API.port}/api/health`, { alive: () => supervisor.alive(api) && !supervisor.stopping });
if (!healthy) {
  if (!supervisor.stopping) void supervisor.stop('App-Server wurde nicht rechtzeitig bereit (/api/health)', 1);
} else if (!supervisor.stopping) {
  supervisor.start('Vite', process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))], {
    cwd: root,
    env: { ...baseEnv, API_PROXY_TARGET: `http://${API.host}:${API.port}` },
  });
  console.error(`[tagwerk] App-Server bereit, Vite startet: http://${WEB.host}:${WEB.port} (Strg+C beendet beide Dienste)`);
}
