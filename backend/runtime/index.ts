import { loadConfiguration } from "./config.js";
import { createDatabase } from "./database.js";
import { platform } from "./platform.js";
import { createAppServer } from "./server.js";
let close: (() => Promise<void>) | undefined;
let stopping = false;
let shutdownWork: Promise<void> | undefined;
const shutdown = () => {
  stopping = true;
  shutdownWork ??= (async () => {
    const deadline = setTimeout(() => process.exit(1), 4500);
    try {
      await close?.();
    } catch {
      process.exitCode = 1;
    } finally {
      clearTimeout(deadline);
    }
  })();
  return shutdownWork;
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
try {
  const config = await loadConfiguration();
  // A signal received while configuration was loading must not create a later pool/server.
  if (!stopping) {
    const database = createDatabase(config.database, [
      ...(config.env("OPENAI_API_KEY") ? ["openai"] : []),
      ...(config.env("GEMINI_API_KEY") ? ["gemini"] : []),
      ...((config.env("OPENCODE_API_KEY") ?? config.env("DEEPSEEK_API_KEY"))
        ? ["opencode"]
        : []),
    ]);
    close = database.close;
    await database.verify();
    // Verification may complete after shutdown has already closed the pool.
    if (stopping) await shutdown();
    else {
      const app = createAppServer(
        {
          env: config.env,
          platform: platform(config.env, fetch, database.rpc),
        },
        { ...config, closeDatabase: database.close },
      );
      close = app.close;
      await app.listen();
      if (stopping) await shutdown();
      else
        console.log(
          "Pflege-Backend bereit (lokal, keine Secrets in der Ausgabe).",
        );
    }
  }
} catch {
  if (!stopping) {
    console.error(
      "Pflege-Backend konnte nicht starten. Geschützte eigene Konfiguration, Port und Backend-Setup prüfen.",
    );
    process.exitCode = 1;
  }
  await shutdown();
}
