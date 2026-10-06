import { describe, expect, it, vi } from "vitest";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { sessionHandler } from "../runtime/handler.ts";
import { createAppServer } from "../runtime/server.ts";
import { rpcQuery } from "../runtime/database.ts";
import { AppError } from "../runtime/errors.ts";
const id = "10000000-0000-4000-8000-000000000001";
const user = "60000000-0000-4000-8000-000000000002";
const sid = "60000000-0000-4000-8000-000000000003";
function setup() {
  const rpc = vi.fn(async () => ({
    workspaceId: id,
    sessionPolicy: "remembered",
    inactivitySeconds: 2592000,
    timeboxSeconds: 2592000,
    expiresAt: "2026-11-05T12:00:00Z",
    idleExpiresAt: "2026-11-05T12:00:00Z",
  }));
  const deps = {
    env: () => undefined,
    platform: {
      rpc,
      authenticate: vi.fn(async () => ({ userId: user, sessionId: sid })),
    },
  };
  return { rpc, deps };
}
const request = (body: unknown) =>
  new Request("https://example.invalid/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
describe("remember session HTTP and strict fixed SQL interface", () => {
  it.each([true, false, undefined])(
    "touch accepts explicit/omitted boolean %s, binds verified actor",
    async (remember) => {
      const { rpc, deps } = setup();
      const response = await sessionHandler(deps)(
        request({
          workspaceId: id,
          action: "touch",
          ...(remember === undefined ? {} : { rememberSession: remember }),
        }),
      );
      expect(response.status).toBe(200);
      expect(rpc).toHaveBeenCalledWith(
        "edge_session",
        {
          p_workspace_id: id,
          p_user_id: user,
          p_session_id: sid,
          p_action: "touch",
          p_remember_session: remember ?? false,
        },
        expect.any(AbortSignal),
      );
      expect((await response.json()).sessionPolicy).toBe("remembered");
    },
  );
  it.each([null, "true", 1, {}, []])(
    "invalid remember value %s is denied before RPC",
    async (value) => {
      const { rpc, deps } = setup();
      const response = await sessionHandler(deps)(
        request({ workspaceId: id, action: "touch", rememberSession: value }),
      );
      expect(response.status).toBe(400);
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it.each([false, true])("end rejects any remember flag %s", async (value) => {
    const { rpc, deps } = setup();
    expect(
      (
        await sessionHandler(deps)(
          request({ workspaceId: id, action: "end", rememberSession: value }),
        )
      ).status,
    ).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("untrusted Auth error prevents enrollment", async () => {
    const { rpc, deps } = setup();
    deps.platform.authenticate.mockRejectedValue(
      new AppError("AUTH_REQUIRED", 401),
    );
    expect(
      (
        await sessionHandler(deps)(
          request({ workspaceId: id, action: "touch", rememberSession: true }),
        )
      ).status,
    ).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("uses only fixed boolean overload and preserves legacy four arguments", () => {
    const args = {
      p_workspace_id: id,
      p_user_id: user,
      p_session_id: sid,
      p_action: "touch",
    };
    expect(
      rpcQuery("edge_session", { ...args, p_remember_session: true }),
    ).toEqual({
      text: "SELECT public.edge_session($1::uuid,$2::uuid,$3::uuid,$4::text,$5::boolean) AS result",
      values: [id, user, sid, "touch", true],
    });
    expect(rpcQuery("edge_session", args).values).toHaveLength(4);
    expect(() =>
      rpcQuery("edge_session", { ...args, p_remember_session: "true" }),
    ).toThrow(AppError);
    expect(() =>
      rpcQuery("edge_chat_check", {
        p_workspace_id: id,
        p_user_id: user,
        p_session_id: sid,
        p_remember_session: true,
      }),
    ).toThrow(AppError);
    expect(() =>
      rpcQuery("edge_session", {
        ...args,
        p_remember_session: true,
        p_started: "1999-01-01",
      }),
    ).toThrow(AppError);
  });
  it("real separate-port HTTP forwards opt-in and rejects end policy change", async () => {
    const { rpc, deps } = setup();
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1");
    await once(probe, "listening");
    const port = (probe.address() as AddressInfo).port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const app = createAppServer(deps, { host: "127.0.0.1", port });
    try {
      await app.listen();
      const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
      // Host protected against rebinding: allowed config must match the ephemeral listener.
      const post = async (body: unknown) =>
        fetch(base + "/api/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:5173",
          },
          body: JSON.stringify(body),
        });
      const response = await post({
        workspaceId: id,
        action: "touch",
        rememberSession: true,
      });
      expect(response.status).toBe(200);
      expect((await response.json()).sessionPolicy).toBe("remembered");
      expect(rpc).toHaveBeenCalledOnce();
      expect(
        (await post({ workspaceId: id, action: "end", rememberSession: true }))
          .status,
      ).toBe(400);
    } finally {
      await app.close();
    }
  });
});
