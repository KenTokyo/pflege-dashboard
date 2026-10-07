/**
 * react-lang 0.3.1 mounts its own floating developer widget when the web entry loads.
 * Its only opt-out is the shared initialization guard in devtoolsBootstrap.ts.
 * Load this module before that entry so Tagwerk keeps its own technical disclosure.
 */
const flags = globalThis as typeof globalThis & { [key: symbol]: boolean | undefined };
flags[Symbol.for('openui.devtools.autoMount')] = true;
