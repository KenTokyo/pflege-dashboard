/**
 * Startet mehrere eigene Dienste und räumt sie gemeinsam wieder ab.
 * Jeder Dienst läuft in einer eigenen Prozessgruppe (detached). Signale gehen nur an diese
 * eigenen Gruppen, nie an fremde Prozesse. Endet ein Dienst unerwartet, endet alles.
 * Abbau: SIGTERM an jede eigene Gruppe, nach `killAfterMs` SIGKILL an die noch lebenden.
 */
import { spawn } from 'node:child_process';
import { connect } from 'node:net';

/** true, wenn auf host:port schon jemand lauscht (dann nicht starten, nichts beenden). */
export function portBusy(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = connect({ port, host });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

/** Wartet auf HTTP 200 mit `{ok:true}`; bricht ab, wenn `alive()` false wird. */
export async function waitForHealth(url, { timeoutMs = 60_000, alive = () => true } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!alive()) return false;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.ok === true) return true;
    } catch {
      // noch nicht bereit
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function groupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch {
    // Gruppe schon leer
  }
}

/**
 * @param {{ killAfterMs?: number, log?: (line: string) => void }} [options]
 */
export function createSupervisor({ killAfterMs = 5000, log = (l) => console.error(l) } = {}) {
  /** @type {{ name: string, child: import('node:child_process').ChildProcess, exited: boolean }[]} */
  const services = [];
  let stopping = null;
  let reason = null;
  const done = Promise.withResolvers();

  function start(name, command, args, { env = process.env, cwd } = {}) {
    if (stopping) throw new Error('Supervisor beendet bereits.');
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'inherit', 'inherit'] });
    const entry = { name, child, exited: false };
    services.push(entry);
    child.once('error', (error) => {
      entry.exited = true;
      void stop(`${name} konnte nicht starten (${error.code ?? error.message})`, 1);
    });
    child.once('exit', (code, signal) => {
      entry.exited = true;
      if (!stopping) void stop(`${name} wurde beendet (${signal ?? `Code ${code}`})`, 1);
    });
    return entry;
  }

  async function stop(why, exitCode = 0) {
    if (stopping) return stopping;
    reason = { why, exitCode };
    stopping = (async () => {
      if (why) log(`[tagwerk] ${why} – beende eigene Dienste …`);
      const own = services.filter((s) => s.child.pid);
      for (const s of own) signalGroup(s.child.pid, 'SIGTERM');
      const deadline = Date.now() + killAfterMs;
      while (Date.now() < deadline && own.some((s) => groupAlive(s.child.pid))) {
        await new Promise((r) => setTimeout(r, 100));
      }
      const stubborn = own.filter((s) => groupAlive(s.child.pid));
      for (const s of stubborn) {
        log(`[tagwerk] ${s.name} reagiert nicht, erzwinge Ende.`);
        signalGroup(s.child.pid, 'SIGKILL');
      }
      done.resolve(reason);
      return reason;
    })();
    return stopping;
  }

  /** Letzte Absicherung bei hartem Prozessende: synchron SIGTERM an die eigenen Gruppen. */
  function emergency() {
    for (const s of services) if (s.child.pid && groupAlive(s.child.pid)) signalGroup(s.child.pid, 'SIGTERM');
  }

  return {
    start,
    stop,
    emergency,
    done: done.promise,
    get stopping() {
      return stopping !== null;
    },
    alive: (entry) => !entry.exited,
    pids: () => services.map((s) => s.child.pid).filter(Boolean),
  };
}

/** Signale und Fehler des eigenen Prozesses auf den Supervisor umleiten. */
export function bindProcess(supervisor) {
  const codes = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };
  for (const signal of Object.keys(codes)) {
    process.on(signal, () => void supervisor.stop(`${signal} empfangen`, codes[signal]));
  }
  process.on('uncaughtException', (error) => {
    console.error(error);
    void supervisor.stop('Interner Fehler', 1);
  });
  process.on('exit', () => supervisor.emergency());
  void supervisor.done.then(({ exitCode }) => {
    process.exitCode = exitCode;
    // Alle eigenen Handles sind zu; Prozess endet von selbst. Fallback nach kurzer Zeit.
    setTimeout(() => process.exit(exitCode), 500).unref();
  });
}
