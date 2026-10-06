import { backend, localClient } from "./local-db.mjs";
import { fingerprint } from "./schema-fingerprint.mjs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
const db = await localClient("pflege_phase1_schema_baseline");
try {
  await writeFile(
    path.join(backend, ".local/schema-baseline.json"),
    JSON.stringify({
      phase0: await fingerprint(db, true),
      phase1: await fingerprint(db, false),
    }) + "\n",
    { mode: 0o600 },
  );
  console.log("Geprüfte Schema-Struktur sicher lokal gesichert.");
} finally {
  await db.end();
}
