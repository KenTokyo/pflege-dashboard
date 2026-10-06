import { attachDatabasePool, waitUntil } from "@vercel/functions";
import { cloudConfiguration } from "./config.ts";
import { createDatabase } from "./database.ts";
import { AppError, errorPayload } from "./errors.ts";
import { chatHandler, sessionHandler, type Dependencies } from "./handler.ts";
import { cors, platform, type Environment } from "./platform.ts";
export const DEMO_ORIGIN = "https://pflege-dashboard-puce.vercel.app";
export function cloudEnvironment(
  source: Record<string, string | undefined>,
): Environment {
  const origins = [DEMO_ORIGIN];
  // Trusted deployment configuration, never reflection of Host/Origin/Forwarded headers.
  if (source.VERCEL_URL) {
    const url = new URL(`https://${source.VERCEL_URL}`);
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new AppError("INTERNAL_ERROR", 503);
    origins.push(url.origin);
  }
  const values: Record<string, string | undefined> = {
    ...source,
    ALLOWED_ORIGINS: source.ALLOWED_ORIGINS ?? origins.join(","),
  };
  return (name) => values[name];
}
function validateHost(
  request: Request,
  source: Record<string, string | undefined>,
) {
  const allowed = new Set([new URL(DEMO_ORIGIN).host]);
  if (source.VERCEL_URL)
    allowed.add(new URL(`https://${source.VERCEL_URL}`).host);
  const url = new URL(request.url);
  if (
    url.protocol !== "https:" ||
    !allowed.has(url.host) ||
    (request.headers.has("host") && request.headers.get("host") !== url.host)
  )
    throw new AppError("WORKSPACE_FORBIDDEN", 403);
}
/** No listen(), local env files, service key, browser-selected SQL or background polling. */
export function createCloudHandler(
  source: Record<string, string | undefined>,
  initialize: () => Promise<Dependencies>,
) {
  const env = cloudEnvironment(source);
  return async (request: Request): Promise<Response> => {
    const id = crypto.randomUUID();
    let headers = new Headers({ "Cache-Control": "no-store" });
    try {
      validateHost(request, source);
      headers = cors(request, env);
      const pathname = new URL(request.url).pathname;
      if (pathname === "/api/health" && request.method === "GET")
        return Response.json({ ok: true }, { headers }); // Route liveness; not a login/provider readiness claim.
      if (!["/api/session", "/api/chat-stream"].includes(pathname)) {
        const payload = errorPayload(
          new AppError("RESOURCE_NOT_FOUND", 404),
          id,
        );
        payload.error.message = "Endpunkt nicht vorhanden.";
        return Response.json(payload, { status: 404, headers });
      }
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers });
      if (request.method !== "POST")
        throw new AppError("VALIDATION_FAILED", 400);
      if (!/^Bearer [^\s]+$/i.test(request.headers.get("authorization") ?? ""))
        throw new AppError("AUTH_REQUIRED", 401);
      if (request.signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      const deps = await initialize();
      return await (
        pathname === "/api/session" ? sessionHandler(deps) : chatHandler(deps)
      )(request);
    } catch (error) {
      const safe =
        error instanceof AppError ? error : new AppError("INTERNAL_ERROR", 503);
      return Response.json(errorPayload(safe, id), {
        status: safe.status,
        headers,
      });
    }
  };
}
let ready: Promise<Dependencies> | undefined;
async function initialize(): Promise<Dependencies> {
  const config = cloudConfiguration(process.env);
  const env = cloudEnvironment({
    ...process.env,
    SUPABASE_URL: config.env("SUPABASE_URL"),
    SUPABASE_PUBLISHABLE_KEY: config.env("SUPABASE_PUBLISHABLE_KEY"),
  });
  const database = createDatabase(config.database, [
    ...(env("OPENAI_API_KEY") ? ["openai"] : []),
    ...(env("DEEPSEEK_API_KEY") ? ["deepseek"] : []),
  ]);
  try {
    attachDatabasePool(database.pool);
    await database.verify();
    return {
      env,
      platform: platform(env, fetch, database.rpc),
      onStreamCompletion: waitUntil,
    };
  } catch {
    await database.close();
    throw new AppError("INTERNAL_ERROR", 503);
  }
}
export async function cloudFetch(request: Request) {
  const handler = createCloudHandler(process.env, () => {
    ready ??= initialize().catch((error) => {
      ready = undefined;
      throw error;
    });
    return ready;
  });
  return handler(request);
}
