/** One bounded real-Supabase run. Always stops and verifies the owned stack. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const backend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const startedAt = new Date().toISOString();
const migrations = [];
for (
  const file of (await readdir(path.resolve(backend, "../supabase/migrations")))
    .filter((f) => f.endsWith(".sql")).sort()
) {
  migrations.push({
    file,
    sha256: createHash("sha256").update(
      await readFile(path.resolve(backend, "../supabase/migrations", file)),
    ).digest("hex"),
  });
}
const seedSha256 = createHash("sha256").update(
  await readFile(path.resolve(backend, "../supabase/seed.sql")),
).digest("hex");
const results = [];
let active;
let interrupted = false;
const killTimers = new Set();
function stopActive() {
  const child = active;
  if (!child) return;
  child.kill("SIGTERM");
  const timer = setTimeout(() => {
    killTimers.delete(timer);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
  }, 5000);
  killTimers.add(timer);
}
const abort = () => {
  interrupted = true;
  stopActive();
};
process.once("SIGINT", abort);
process.once("SIGTERM", abort);
const total = setTimeout(abort, 900_000);
async function step(
  file,
  args = [],
  limit = 180_000,
  binary = process.execPath,
) {
  if (
    interrupted &&
    !((file === "scripts/supabase-safe.mjs" && args[0] === "stop") ||
      file === "scripts/runtime-cleanup.mjs")
  ) throw new Error("Abgebrochen");
  console.log(`Prüfschritt: ${file} ${args.join(" ")}`);
  const timer = setTimeout(stopActive, limit);
  try {
    await new Promise((resolve, reject) => {
      active = spawn(binary, [file, ...args], {
        cwd: backend,
        stdio: ["ignore", "inherit", "inherit"],
      });
      active.once("error", reject);
      active.once(
        "close",
        (code, signal) =>
          code === 0 ? resolve() : reject(
            new Error(`Prüfschritt fehlgeschlagen: ${code ?? signal}`),
          ),
      );
    });
    results.push({ file, args, passed: true });
  } catch (error) {
    results.push({ file, args, passed: false });
    throw error;
  } finally {
    clearTimeout(timer);
    active = null;
  }
}
let failure;
try {
  await step("scripts/supabase-safe.mjs", ["start"], 600_000);
  await step("scripts/supabase-safe.mjs", ["reset"], 300_000);
  await step("scripts/runtime-probe.mjs");
  if (!process.argv.includes("--schema-only")) {
    await step("scripts/supabase-safe.mjs", ["test"]);
    await step("scripts/context-historical-repro.mjs");
    await step("scripts/concurrency.mjs");
    await step("scripts/phase1-concurrency.mjs");
    await step("node_modules/typescript/bin/tsc", ["-p", "tsconfig.build.json"]);
    await step("scripts/node-smoke.mjs");
    await step("scripts/node-database-check.mjs");
    await step("scripts/supabase-safe.mjs", ["types"]);
    await step("scripts/schema-baseline.mjs");
    await step("node_modules/typescript/bin/tsc", ["--noEmit"]);
    await step("node_modules/vitest/vitest.mjs", [
      "run",
      "--reporter=default",
      "--reporter=json",
      "--outputFile=.local/vitest-result.json",
    ]);
  }
} catch (error) {
  failure = error;
} finally {
  try {
    await step("scripts/supabase-safe.mjs", ["stop"]);
  } catch (error) {
    failure ??= error;
  }
  try {
    await step("scripts/runtime-cleanup.mjs");
  } catch (error) {
    failure ??= error;
  }
  clearTimeout(total);
  for (const timer of killTimers) clearTimeout(timer);
  process.removeListener("SIGINT", abort);
  process.removeListener("SIGTERM", abort);
}
const evidence = {
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: !failure,
  scope: process.argv.includes("--schema-only") ? "schema-only" : "phase1",
  results,
  migrations,
  seedSha256,
};
if (!failure && evidence.scope === "phase1") {
  const tap = await readFile(
    path.join(backend, ".local/supabase-test.log"),
    "utf8",
  );
  evidence.schemaBaselineSha256 = createHash("sha256").update(
    await readFile(path.join(backend, ".local/schema-baseline.json")),
  ).digest("hex");
  evidence.sqlAssertions = Number(tap.match(/Files=\d+, Tests=(\d+)/)?.[1]);
  const unit = JSON.parse(
    await readFile(path.join(backend, ".local/vitest-result.json"), "utf8"),
  );
  evidence.unitTestsPassed = unit.numPassedTests;
  evidence.phase1Parallel = JSON.parse(
    await readFile(
      path.join(backend, ".local/phase1-concurrency.json"),
      "utf8",
    ),
  );
  evidence.nodeHttp = JSON.parse(
    await readFile(path.join(backend, ".local/node-smoke-local.json"), "utf8"),
  );
  evidence.parallel = JSON.parse(
    await readFile(
      path.join(backend, ".local/concurrency-result.json"),
      "utf8",
    ),
  );
}
await writeFile(
  path.join(backend, ".local/phase1-result.json"),
  JSON.stringify(evidence, null, 2) + "\n",
  { mode: 0o600 },
);
if (failure) {
  console.error(failure.message);
  process.exitCode = 1;
} else {console.log(
    "Phase-1-Prüflauf erfolgreich; eigener Stack gestoppt und geprüft.",
  );}
