import { AppError, databaseError, uuid } from "./errors.ts";
export type Identity = { userId: string; sessionId: string };
export type Rpc = (
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
) => Promise<any>;
export type Platform = {
  authenticate: (request: Request) => Promise<Identity>;
  rpc: Rpc;
};
export type Environment = (name: string) => string | undefined;
function builtInKey(
  env: Environment,
  legacy: string,
  modern: string,
): string | undefined {
  const value = env(legacy);
  if (value) return value;
  try {
    const keys = JSON.parse(env(modern) ?? "{}");
    return typeof keys.default === "string" ? keys.default : undefined;
  } catch {
    return undefined;
  }
}
export function platform(
  env: Environment,
  fetcher: typeof fetch = fetch,
): Platform {
  const url = env("SUPABASE_URL");
  const publicKey = builtInKey(
    env,
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEYS",
  );
  const serviceKey = builtInKey(
    env,
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEYS",
  );
  return {
    async authenticate(request) {
      const token = request.headers.get("authorization")?.match(
        /^Bearer ([^\s]+)$/i,
      )?.[1];
      if (!token) throw new AppError("AUTH_REQUIRED", 401);
      if (!url || !publicKey) throw new AppError("INTERNAL_ERROR");
      let response: Response;
      try {
        response = await fetcher(`${url}/auth/v1/user`, {
          headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        });
      } catch {
        throw new AppError("AUTH_REQUIRED", 401);
      }
      if (!response.ok) throw new AppError("AUTH_REQUIRED", 401);
      let user: any;
      let claims: any;
      try {
        user = await response.json();
        const part = token.split(".")[1];
        claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
      } catch {
        throw new AppError("AUTH_REQUIRED", 401);
      }
      // getUser above verifies the signature through THIS Supabase Auth service, never only decode JWT.
      const issuer = env("AUTH_JWT_ISSUER") ??
        `${url.replace(/\/$/, "")}/auth/v1`;
      if (
        claims.iss !== issuer || !uuid(user.id) || claims.sub !== user.id ||
        !uuid(claims.session_id) ||
        !(claims.aud === "authenticated" ||
          Array.isArray(claims.aud) && claims.aud.includes("authenticated")) ||
        !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()
      ) throw new AppError("SESSION_EXPIRED", 401);
      return { userId: user.id, sessionId: claims.session_id };
    },
    async rpc(name, args, signal) {
      if (!url || !serviceKey) throw new AppError("INTERNAL_ERROR");
      let response: Response;
      try {
        response = await fetcher(`${url}/rest/v1/rpc/${name}`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(args),
          signal: signal ?? AbortSignal.timeout(15000),
          redirect: "error",
        });
      } catch {
        throw new AppError("INTERNAL_ERROR");
      }
      let body: any;
      try {
        body = await response.json();
      } catch {
        throw new AppError("INTERNAL_ERROR");
      }
      if (!response.ok) throw databaseError(body?.message);
      return body;
    },
  };
}
export function cors(request: Request, env: Environment): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  const origin = request.headers.get("origin");
  const allowed = (env("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim())
    .filter(Boolean);
  if (origin) {
    if (
      !allowed.includes(origin) || origin === "null" || allowed.includes("*")
    ) throw new AppError("WORKSPACE_FORBIDDEN", 403);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set(
      "Access-Control-Allow-Headers",
      "authorization,apikey,content-type,x-client-info",
    );
    headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    headers.set("Access-Control-Expose-Headers", "x-request-id");
  }
  return headers;
}
