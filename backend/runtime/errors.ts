export class AppError extends Error {
  constructor(
    public code: string,
    public status = 500,
    public retryable = false,
  ) {
    super(code);
  }
}
const messages: Record<string, string> = {
  AUTH_REQUIRED: "Bitte melden Sie sich an.",
  SESSION_EXPIRED:
    "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
  WORKSPACE_FORBIDDEN:
    "Für diesen Arbeitsbereich fehlt die freigegebene Mitgliedschaft.",
  VALIDATION_FAILED:
    "Die Anfrage ist ungültig. Anhänge sind erst in Phase 2 verfügbar.",
  RESOURCE_NOT_FOUND: "Das Gespräch ist nicht verfügbar.",
  IDEMPOTENCY_CONFLICT:
    "Diese Anfrage-ID wurde bereits für einen anderen Inhalt verwendet.",
  REQUEST_IN_PROGRESS:
    "Diese Anfrage oder dieses Gespräch wird noch verarbeitet.",
  REQUEST_INTERRUPTED:
    "Die frühere Anfrage wurde unterbrochen. Laden Sie den Verlauf neu; ein neuer Versuch braucht eine neue Anfrage-ID.",
  MODEL_UNAVAILABLE:
    "Für diesen Arbeitsbereich ist noch kein geprüftes Modell freigegeben.",
  PROVIDER_NOT_CONFIGURED:
    "Der KI-Anbieter ist noch nicht serverseitig eingerichtet. Es wurde kein Modell aufgerufen.",
  PRICING_UNVERIFIED:
    "Für das Modell fehlt eine gültige geprüfte Preisversion.",
  RATE_LIMITED: "Zu viele Anfragen. Bitte warten Sie eine Minute.",
  PARALLEL_LIMIT: "Es laufen bereits zwei Anfragen für Ihr Konto.",
  BUDGET_EXCEEDED:
    "Das KI-Budget ist ausgeschöpft oder noch nicht freigegeben. Es wurde kein Modell aufgerufen.",
  PROVIDER_AUTH_FAILED:
    "Der KI-Anbieter hat den hinterlegten Schlüssel abgelehnt. Bitte die Servereinrichtung prüfen.",
  PROVIDER_RATE_LIMITED:
    "Die verfügbare Quote beim KI-Anbieter ist erreicht. Bitte versuchen Sie es später erneut.",
  PROVIDER_UNAVAILABLE:
    "Der KI-Anbieter ist gerade nicht erreichbar. Bitte versuchen Sie es später erneut.",
  PROVIDER_CONTENT_BLOCKED:
    "Der KI-Anbieter konnte diese Anfrage aus Sicherheitsgründen nicht beantworten. Bitte formulieren Sie sie anders.",
  PROVIDER_FAILED:
    "Die Modellantwort konnte nicht vollständig verarbeitet werden. Bitte laden Sie den Verlauf neu.",
  PRESENTATION_INVALID:
    "Die OpenUI-Antwort ist unvollständig oder hat ein ungültiges Format. Die lesbaren Teile bleiben im Verlauf.",
  REQUEST_ABORTED: "Die Antwort wurde abgebrochen.",
  INTERNAL_ERROR: "Die Anfrage konnte nicht sicher abgeschlossen werden.",
};
export function errorPayload(error: unknown, requestId: string) {
  const e = error instanceof AppError ? error : new AppError("INTERNAL_ERROR");
  return {
    error: {
      code: e.code,
      message: messages[e.code] ?? messages.INTERNAL_ERROR,
      requestId,
      retryable: e.retryable,
    },
  };
}
export function databaseError(message: unknown): AppError {
  const map: Record<string, number> = {
    SESSION_EXPIRED: 401,
    WORKSPACE_FORBIDDEN: 403,
    RESOURCE_NOT_FOUND: 404,
    VALIDATION_FAILED: 400,
    IDEMPOTENCY_CONFLICT: 409,
    REQUEST_IN_PROGRESS: 409,
    REQUEST_INTERRUPTED: 409,
    MODEL_UNAVAILABLE: 422,
    PRICING_UNVERIFIED: 503,
    PROVIDER_NOT_CONFIGURED: 503,
    RATE_LIMITED: 429,
    PARALLEL_LIMIT: 429,
    BUDGET_EXCEEDED: 429,
  };
  if (typeof message === "string" && Object.hasOwn(map, message)) {
    return new AppError(
      message,
      map[message],
      message === "RATE_LIMITED" || message === "PARALLEL_LIMIT",
    );
  }
  return new AppError("INTERNAL_ERROR");
}
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export async function readJson(
  request: Request,
): Promise<Record<string, unknown>> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new AppError("VALIDATION_FAILED", 400);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("VALIDATION_FAILED", 400);
  let bytes = 0;
  let text = "";
  const decoder = new TextDecoder();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel().catch(() => {});
  }, 10000);
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 40000) throw new AppError("VALIDATION_FAILED", 400);
      text += decoder.decode(part.value, { stream: true });
    }
    if (expired) throw new AppError("VALIDATION_FAILED", 400);
    text += decoder.decode();
  } finally {
    clearTimeout(timer);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error();
    }
    return data as Record<string, unknown>;
  } catch {
    throw new AppError("VALIDATION_FAILED", 400);
  }
}
