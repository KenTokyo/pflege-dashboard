import type { Phase1Code } from '../../types/phase1';

/** Vertragsfehler v1.0 (docs/api-contract.md, types/phase1.ts), Phase-0-RPC-Codes und clientseitige Zustände. */
export type AppErrorCode =
  | Phase1Code
  | 'REVISION_CONFLICT'
  | 'ADMIN_REQUIRED'
  | 'NETWORK'
  | 'NOT_DEPLOYED'
  | 'INVALID_CREDENTIALS'
  | 'CONFIG_MISSING'
  | 'PROTOCOL'
  | 'ABORTED'
  | 'NO_MODEL';

const MESSAGES: Record<AppErrorCode, string> = {
  VALIDATION_FAILED: 'Die Eingabe wurde vom Server nicht angenommen. Bitte prüfen Sie den Text.',
  AUTH_REQUIRED: 'Bitte melden Sie sich an.',
  SESSION_EXPIRED: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
  WORKSPACE_FORBIDDEN: 'Sie haben keinen Zugang zu diesem Arbeitsbereich.',
  ADMIN_REQUIRED: 'Diese Änderung ist der Verwaltung des Arbeitsbereichs vorbehalten.',
  RESOURCE_NOT_FOUND: 'Der Eintrag wurde nicht gefunden oder ist für Sie nicht sichtbar.',
  REVISION_CONFLICT: 'Der Eintrag wurde inzwischen geändert. Die aktuelle Fassung ist geladen, bitte erneut versuchen.',
  IDEMPOTENCY_CONFLICT: 'Diese Anfrage wurde bereits mit anderem Inhalt gesendet. Bitte senden Sie die Nachricht neu.',
  REQUEST_IN_PROGRESS: 'Diese Anfrage wird noch bearbeitet. Bitte laden Sie den Verlauf gleich neu.',
  REQUEST_INTERRUPTED: 'Diese Anfrage wurde unterbrochen und wird nicht automatisch wiederholt.',
  REQUEST_ABORTED: 'Die Antwort wurde abgebrochen.',
  MODEL_UNAVAILABLE: 'Das KI-Modell ist derzeit nicht eingerichtet oder nicht verfügbar.',
  PROVIDER_NOT_CONFIGURED: 'Der KI-Anbieter ist auf dem Server noch nicht eingerichtet. Es wird keine Antwort erzeugt.',
  RATE_LIMITED: 'Zu viele Anfragen in kurzer Zeit. Bitte warten Sie einen Moment.',
  PARALLEL_LIMIT: 'Es laufen bereits zu viele Antworten gleichzeitig. Bitte warten Sie, bis eine fertig ist.',
  BUDGET_EXCEEDED: 'Das KI-Budget dieses Arbeitsbereichs ist ausgeschöpft oder noch nicht freigegeben.',
  PROVIDER_FAILED: 'Der KI-Anbieter hat nicht geantwortet. Bitte versuchen Sie es erneut.',
  PRICING_UNVERIFIED: 'Für dieses Modell sind keine geprüften Preise hinterlegt. Der Server lässt den Aufruf deshalb nicht zu.',
  INTERNAL_ERROR: 'Auf dem Server ist ein Fehler aufgetreten.',
  NETWORK: 'Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.',
  NOT_DEPLOYED: 'Diese Funktion ist auf dem Server noch nicht eingerichtet.',
  INVALID_CREDENTIALS: 'E-Mail-Adresse oder Passwort stimmen nicht.',
  CONFIG_MISSING: 'Die Verbindung zu Supabase ist nicht konfiguriert.',
  PROTOCOL: 'Die Antwort des Servers war unvollständig oder unerwartet.',
  ABORTED: 'Die Antwort wurde abgebrochen.',
  NO_MODEL: 'Für diesen Arbeitsbereich ist noch kein KI-Modell eingerichtet.',
};

const RETRYABLE = new Set<AppErrorCode>(['NETWORK', 'PROVIDER_FAILED', 'INTERNAL_ERROR', 'RATE_LIMITED', 'PARALLEL_LIMIT', 'PROTOCOL']);

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  readonly requestId: string | null;

  constructor(code: AppErrorCode, options: { retryable?: boolean; requestId?: string | null; message?: string } = {}) {
    super(options.message ?? MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE.has(code);
    this.requestId = options.requestId ?? null;
  }
}

export function messageFor(code: AppErrorCode): string {
  return MESSAGES[code];
}

const API_CODES = new Set<string>(Object.keys(MESSAGES));
export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && API_CODES.has(value);
}

/**
 * Datenbank-/PostgREST-Fehler in Vertragscodes übersetzen. Keine SQL-Details an die Oberfläche.
 * SQLSTATE laut Vertrag: 42501 Rechte, P0002 unsichtbar, 40001 Revision, 22023 Eingabe.
 */
export function fromDbError(error: { code?: string | undefined; message?: string | undefined } | null | undefined): AppError {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (message.includes('IDEMPOTENCY_CONFLICT')) return new AppError('IDEMPOTENCY_CONFLICT');
  switch (code) {
    case '42501':
      return new AppError('WORKSPACE_FORBIDDEN');
    case 'P0002':
      return new AppError('RESOURCE_NOT_FOUND');
    case '40001':
      return new AppError('REVISION_CONFLICT');
    case '23505':
      return new AppError('IDEMPOTENCY_CONFLICT');
    case '22023':
    case '23514':
      return new AppError('VALIDATION_FAILED');
    case 'PGRST202':
    case '42883':
      return new AppError('NOT_DEPLOYED');
    case 'PGRST301':
    case 'PGRST303':
      return new AppError('SESSION_EXPIRED');
    default:
      if (/fetch|network|Failed to fetch|Load failed/i.test(message)) return new AppError('NETWORK');
      return new AppError('INTERNAL_ERROR');
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') return new AppError('ABORTED', { retryable: true });
  if (error instanceof TypeError) return new AppError('NETWORK');
  return new AppError('INTERNAL_ERROR');
}
