import { AppError, uuid } from "./errors.ts";
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
export const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];
export function platform(
  env: Environment,
  fetcher: typeof fetch = fetch,
  rpc: Rpc = async () => {
    throw new AppError("INTERNAL_ERROR");
  },
): Platform {
  const url = env("SUPABASE_URL")?.replace(/\/$/, "");
  const publicKey = env("SUPABASE_PUBLISHABLE_KEY") ?? env("SUPABASE_ANON_KEY");
  return {
    rpc,
    async authenticate(request) {
      const token = request.headers
        .get("authorization")
        ?.match(/^Bearer ([^\s]+)$/i)?.[1];
      if (!token) throw new AppError("AUTH_REQUIRED", 401);
      if (!url || !publicKey) throw new AppError("INTERNAL_ERROR");
      if (request.signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
      let user: any;
      let claims: any;
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(10000),
      ]);
      try {
        const response = await fetcher(`${url}/auth/v1/user`, {
          headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
          signal,
          redirect: "error",
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw response.status === 401 || response.status === 403
            ? new AppError("AUTH_REQUIRED", 401)
            : new AppError("INTERNAL_ERROR", 503, true);
        }
        user = await response.json();
        if (!user || typeof user !== "object" || !uuid(user.id))
          throw new AppError("INTERNAL_ERROR", 503, true);
      } catch (error) {
        if (request.signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
        if (error instanceof AppError) throw error;
        throw new AppError("INTERNAL_ERROR", 503, true);
      }
      try {
        claims = JSON.parse(
          Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
        );
      } catch {
        throw new AppError("SESSION_EXPIRED", 401);
      }
      // Only decode AFTER the real own-project Auth service has validated the access token.
      if (
        !claims ||
        typeof claims !== "object" ||
        claims.iss !== (env("AUTH_JWT_ISSUER") ?? `${url}/auth/v1`) ||
        !uuid(user.id) ||
        claims.sub !== user.id ||
        !uuid(claims.session_id) ||
        !(
          claims.aud === "authenticated" ||
          (Array.isArray(claims.aud) && claims.aud.includes("authenticated"))
        ) ||
        !Number.isFinite(claims.exp) ||
        claims.exp * 1000 <= Date.now()
      )
        throw new AppError("SESSION_EXPIRED", 401);
      return { userId: user.id, sessionId: claims.session_id };
    },
  };
}
export function cors(request: Request, env: Environment): Headers {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  const origin = request.headers.get("origin");
  const configured = env("ALLOWED_ORIGINS");
  const allowed =
    configured === undefined
      ? DEFAULT_ORIGINS
      : configured
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  if (origin !== null) {
    if (!allowed.includes(origin) || origin === "null" || allowed.includes("*"))
      throw new AppError("WORKSPACE_FORBIDDEN", 403);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization,content-type");
    headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    headers.set("Access-Control-Expose-Headers", "x-request-id");
  }
  return headers;
}
