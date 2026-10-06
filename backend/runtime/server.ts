import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { AppError, errorPayload } from "./errors.ts";
import { chatHandler, sessionHandler, type Dependencies } from "./handler.ts";
import { cors } from "./platform.ts";
export type ServerOptions = {
  host: string;
  port: number;
  staticDir?: string;
  closeDatabase?: () => Promise<void>;
};
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
function sendError(
  res: ServerResponse,
  error: unknown,
  endpointMissing = false,
) {
  if (res.destroyed || res.headersSent) {
    res.destroy();
    return;
  }
  const safe =
    error instanceof AppError ? error : new AppError("INTERNAL_ERROR");
  res.writeHead(safe.status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "close",
  });
  const payload = errorPayload(safe, crypto.randomUUID());
  if (endpointMissing && safe.code === "RESOURCE_NOT_FOUND") {
    payload.error.message = "Endpunkt nicht vorhanden.";
  }
  res.end(JSON.stringify(payload));
}
async function body(
  req: IncomingMessage,
  signal: AbortSignal,
): Promise<Uint8Array> {
  if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
  const length = req.headers["content-length"];
  if (length && (!/^\d+$/.test(length) || Number(length) > 40000))
    throw new AppError("VALIDATION_FAILED", 400);
  const chunks: Buffer[] = [];
  let bytes = 0;
  const timer = setTimeout(() => req.destroy(), 10000);
  const abort = () => req.destroy();
  signal.addEventListener("abort", abort, { once: true });
  try {
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      const data = Buffer.from(chunk);
      bytes += data.byteLength;
      if (bytes > 40000) throw new AppError("VALIDATION_FAILED", 400);
      chunks.push(data);
    }
    if (signal.aborted) throw new AppError("REQUEST_ABORTED", 409);
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
async function staticResponse(
  req: IncomingMessage,
  res: ServerResponse,
  rawPath: string,
  dir?: string,
) {
  if (
    !dir ||
    !["GET", "HEAD"].includes(req.method ?? "") ||
    !rawPath.startsWith("/")
  )
    throw new AppError("RESOURCE_NOT_FOUND", 404);
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    throw new AppError("VALIDATION_FAILED", 400);
  }
  if (
    decoded.includes("\\") ||
    decoded.includes("\0") ||
    decoded.split("/").some((p) => p.startsWith("."))
  )
    throw new AppError("WORKSPACE_FORBIDDEN", 403);
  const root = await realpath(dir);
  let target = path.resolve(
    root,
    `.${decoded === "/" ? "/index.html" : decoded}`,
  );
  const inside = (value: string) => value.startsWith(root + path.sep);
  if (!inside(target)) throw new AppError("WORKSPACE_FORBIDDEN", 403);
  try {
    target = await realpath(target);
  } catch {
    if (
      req.method !== "GET" ||
      path.extname(decoded) ||
      decoded.startsWith("/assets/") ||
      !req.headers.accept?.includes("text/html")
    )
      throw new AppError("RESOURCE_NOT_FOUND", 404);
    target = await realpath(path.join(root, "index.html"));
  }
  if (!inside(target)) throw new AppError("WORKSPACE_FORBIDDEN", 403);
  const info = await stat(target);
  if (!info.isFile() || !MIME[path.extname(target)])
    throw new AppError("RESOURCE_NOT_FOUND", 404);
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(target)],
    "Content-Length": info.size,
    "Cache-Control": decoded.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  if (req.method === "HEAD") res.end();
  else await pipeline(createReadStream(target), res);
}
export function createAppServer(deps: Dependencies, options: ServerOptions) {
  const sessions = sessionHandler(deps);
  const chats = chatHandler(deps);
  const active = new Set<AbortController>();
  const pending = new Set<Promise<void>>();
  let stopping = false;
  const server = http.createServer(
    {
      maxHeaderSize: 16384,
      requestTimeout: 15000,
      headersTimeout: 10000,
      keepAliveTimeout: 1000,
    },
    (req, res) => {
      const controller = new AbortController();
      active.add(controller);
      const abort = () => controller.abort();
      const requestClose = () => {
        if (!req.complete) abort();
      };
      const responseClose = () => {
        if (!res.writableFinished) abort();
      };
      req.once("aborted", abort);
      req.once("close", requestClose);
      res.once("close", responseClose);
      const work = (async () => {
        try {
          if (stopping) throw new AppError("INTERNAL_ERROR", 503);
          // Validate the raw authority and path; no trust in forwarded/proxy headers.
          if (
            ![
              `127.0.0.1:${options.port}`,
              `localhost:${options.port}`,
            ].includes(req.headers.host ?? "")
          )
            throw new AppError("WORKSPACE_FORBIDDEN", 403);
          if (!req.url?.startsWith("/") || req.url.startsWith("//"))
            throw new AppError("VALIDATION_FAILED", 400);
          const rawPath = req.url.split("?")[0];
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value !== undefined)
              headers.set(key, Array.isArray(value) ? value.join(",") : value);
          }
          const url = `http://127.0.0.1:${options.port}${req.url}`;
          const probe = new Request(url, { headers });
          cors(probe, deps.env); // Reject before reading body or Auth/SQL.
          if (rawPath === "/api/health" && req.method === "GET") {
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            });
            res.end('{"ok":true}');
            return;
          }
          let decodedPath: string;
          try {
            decodedPath = decodeURIComponent(rawPath);
          } catch {
            throw new AppError("VALIDATION_FAILED", 400);
          }
          if (decodedPath === "/api" || decodedPath.startsWith("/api/")) {
            if (rawPath !== "/api/session" && rawPath !== "/api/chat-stream") {
              sendError(res, new AppError("RESOURCE_NOT_FOUND", 404), true);
              return;
            }
            const payload =
              req.method === "POST"
                ? await body(req, controller.signal)
                : undefined;
            const request = new Request(url, {
              method: req.method,
              headers,
              body: payload as BodyInit | undefined,
              signal: controller.signal,
            });
            const response = await (
              rawPath === "/api/session" ? sessions : chats
            )(request);
            if (controller.signal.aborted) {
              await response.body?.cancel();
              return;
            }
            res.writeHead(
              response.status,
              Object.fromEntries(response.headers),
            );
            res.flushHeaders();
            if (!response.body) {
              res.end();
              return;
            }
            const reader = response.body.getReader();
            const cancel = () => {
              void reader.cancel().catch(() => {});
            };
            controller.signal.addEventListener("abort", cancel, { once: true });
            try {
              while (!controller.signal.aborted) {
                const part = await reader.read();
                if (part.done) break;
                if (!res.write(part.value))
                  await once(res, "drain", { signal: controller.signal });
              }
              if (!controller.signal.aborted) res.end();
            } finally {
              controller.signal.removeEventListener("abort", cancel);
              await reader.cancel().catch(() => {});
              reader.releaseLock();
            }
            return;
          }
          await staticResponse(req, res, rawPath, options.staticDir);
        } catch (error) {
          sendError(res, error);
        } finally {
          active.delete(controller);
          req.off("aborted", abort);
          req.off("close", requestClose);
          res.off("close", responseClose);
        }
      })();
      pending.add(work);
      void work.finally(() => pending.delete(work));
    },
  );
  server.on("clientError", (_error, socket) => {
    socket.end(
      "HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n",
    );
  });
  let closing: Promise<void> | undefined;
  return {
    server,
    async listen() {
      server.listen(options.port, options.host);
      await once(server, "listening");
    },
    close() {
      closing ??= (async () => {
        stopping = true;
        const stopped = new Promise<void>((resolve) =>
          server.close(() => resolve()),
        );
        server.closeIdleConnections();
        for (const controller of active) controller.abort();
        const hard = setTimeout(() => server.closeAllConnections(), 3000);
        try {
          await Promise.race([
            Promise.allSettled([...pending]),
            new Promise<void>((resolve) => {
              const t = setTimeout(resolve, 2800);
              t.unref();
            }),
          ]);
          server.closeAllConnections();
          await stopped;
          await options.closeDatabase?.();
        } finally {
          clearTimeout(hard);
        }
      })();
      return closing;
    },
  };
}
