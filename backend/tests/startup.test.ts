import { describe, it, expect, vi } from "vitest";
// Actual entrypoint under controlled startup waits; no secrets, sockets or accounts.
const fixtures = vi.hoisted(() => ({
  load: vi.fn(),
  database: vi.fn(),
  server: vi.fn(),
  platform: vi.fn(),
}));
vi.mock("../runtime/config.ts", () => ({ loadConfiguration: fixtures.load }));
vi.mock("../runtime/database.ts", () => ({
  createDatabase: fixtures.database,
}));
vi.mock("../runtime/server.ts", () => ({ createAppServer: fixtures.server }));
vi.mock("../runtime/platform.ts", () => ({ platform: fixtures.platform }));
const configuration = {
  env: () => undefined,
  database: {},
  host: "127.0.0.1",
  port: 5174,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function harness(
  run: (hooks: Map<string, () => Promise<void>>) => Promise<void>,
) {
  vi.resetModules();
  fixtures.load.mockReset();
  fixtures.database.mockReset();
  fixtures.server.mockReset();
  fixtures.platform.mockReset();
  const hooks = new Map<string, () => Promise<void>>();
  const original = process.once.bind(process);
  const once = vi.spyOn(process, "once").mockImplementation(((
    name: string,
    callback: () => Promise<void>,
  ) => {
    if (name === "SIGINT" || name === "SIGTERM") {
      hooks.set(name, callback);
      return process;
    }
    return original(name as never, callback);
  }) as typeof process.once);
  const output = vi.spyOn(console, "log").mockImplementation(() => {});
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const exitCode = process.exitCode;
  try {
    await run(hooks);
  } finally {
    once.mockRestore();
    output.mockRestore();
    errors.mockRestore();
    process.exitCode = exitCode;
  }
}
describe("entrypoint shutdown while startup is pending", () => {
  it.each(["SIGINT", "SIGTERM"])(
    "%s during configuration never creates a later pool or listener",
    async (signal) =>
      harness(async (hooks) => {
        const waiting = deferred<typeof configuration>();
        fixtures.load.mockReturnValue(waiting.promise);
        const loaded = import("../runtime/index.ts");
        await vi.waitFor(() => expect(fixtures.load).toHaveBeenCalledOnce());
        await hooks.get(signal)!();
        waiting.resolve(configuration);
        await loaded;
        expect(fixtures.database).not.toHaveBeenCalled();
        expect(fixtures.server).not.toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
      }),
  );
  it.each(["SIGINT", "SIGTERM"])(
    "%s during verification closes its pool once and never listens afterward",
    async (signal) =>
      harness(async (hooks) => {
        const verified = deferred<void>();
        const close = vi.fn(async () => {});
        const verify = vi.fn(() => verified.promise);
        fixtures.load.mockResolvedValue(configuration);
        fixtures.database.mockReturnValue({ rpc: vi.fn(), close, verify });
        const loaded = import("../runtime/index.ts");
        await vi.waitFor(() => expect(verify).toHaveBeenCalledOnce());
        await hooks.get(signal)!();
        verified.resolve();
        await loaded;
        expect(close).toHaveBeenCalledOnce();
        expect(fixtures.server).not.toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
      }),
  );
  it("verification rejected after requested stop stays silent and closes once", async () =>
    harness(async (hooks) => {
      const verified = deferred<void>();
      const close = vi.fn(async () => {});
      const verify = vi.fn(() => verified.promise);
      fixtures.load.mockResolvedValue(configuration);
      fixtures.database.mockReturnValue({ rpc: vi.fn(), close, verify });
      const loaded = import("../runtime/index.ts");
      await vi.waitFor(() => expect(verify).toHaveBeenCalledOnce());
      await hooks.get("SIGTERM")!();
      verified.reject(new Error("fixture-only private failure"));
      await loaded;
      expect(close).toHaveBeenCalledOnce();
      expect(fixtures.server).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    }));
});
