import type { ChatEventV1 } from '../../types/phase1';
import { AppError, isAppErrorCode } from '../services/errors';
import { parseActivity } from './activity';

export type SseMessage = { event: string; data: string };

/**
 * Inkrementeller Parser für text/event-stream (WHATWG-Regeln, ohne Wiederverbindung).
 * Nimmt beliebig geschnittene Textstücke an und liefert vollständige Nachrichten.
 */
export class SseParser {
  private buffer = '';
  private event = '';
  private data: string[] = [];

  feed(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const out: SseMessage[] = [];
    for (;;) {
      const match = /\r\n|\r|\n/.exec(this.buffer);
      if (!match) break;
      // Ein einzelnes \r am Pufferende kann zu \r\n gehören: auf das nächste Stück warten.
      if (match[0] === '\r' && match.index === this.buffer.length - 1) break;
      const line = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      const message = this.line(line);
      if (message) out.push(message);
    }
    return out;
  }

  /** Am Streamende: unvollständige letzte Nachricht verwerfen (Spezifikation). */
  end(): void {
    this.buffer = '';
    this.event = '';
    this.data = [];
  }

  private line(line: string): SseMessage | null {
    if (line === '') {
      if (this.data.length === 0) {
        this.event = '';
        return null;
      }
      const message = { event: this.event || 'message', data: this.data.join('\n') };
      this.event = '';
      this.data = [];
      return message;
    }
    if (line.startsWith(':')) return null;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') this.event = value;
    else if (field === 'data') this.data.push(value);
    return null;
  }
}

const TYPES = new Set(['message.activity', 'message.started', 'message.delta', 'usage.final', 'message.completed', 'error']);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function validData(type: string, data: Record<string, unknown>): boolean {
  switch (type) {
    case 'message.activity':
      return parseActivity(data) !== null;
    case 'message.started': {
      const model = data.model;
      return (
        isString(data.messageId) &&
        isString(data.promptVersionId) &&
        typeof data.replayed === 'boolean' &&
        isObject(model) &&
        isString(model.displayName) &&
        isString(model.providerModelId) &&
        isString(model.provider) &&
        (model.region === 'eu' || model.region === 'us' || model.region === 'unverified')
      );
    }
    case 'message.delta':
      return isString(data.text);
    case 'usage.final':
      return isCount(data.inputTokens) && isCount(data.outputTokens) && isCount(data.costMicrousd);
    case 'message.completed':
      return isString(data.messageId) && typeof data.replayed === 'boolean';
    case 'error':
      return isString(data.code) && isString(data.requestId) && typeof data.retryable === 'boolean';
    default:
      return false;
  }
}

/**
 * Prüft eine SSE-Nachricht gegen ChatEventV1. Ungültige Daten werden nie angezeigt (Fehler PROTOCOL).
 */
export function parseChatEvent(message: SseMessage, conversationId: string): ChatEventV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.data);
  } catch {
    throw new AppError('PROTOCOL');
  }
  if (
    !isObject(parsed) ||
    parsed.version !== 1 ||
    !isString(parsed.type) ||
    !TYPES.has(parsed.type) ||
    (message.event !== 'message' && message.event !== parsed.type) ||
    !isString(parsed.requestId) ||
    typeof parsed.sequence !== 'number' ||
    !Number.isInteger(parsed.sequence) ||
    parsed.sequence < 1 ||
    parsed.conversationId !== conversationId ||
    !isObject(parsed.data) ||
    !validData(parsed.type, parsed.data)
  ) {
    throw new AppError('PROTOCOL');
  }
  if (parsed.type === 'message.activity') return { ...parsed, data: parseActivity(parsed.data) } as ChatEventV1;
  return parsed as ChatEventV1;
}

/** Übersetzt ein SSE-`error`-Ereignis in einen AppError. Unbekannte Codes werden INTERNAL_ERROR. */
export function errorFromEvent(data: { code: string; requestId: string; retryable: boolean }): AppError {
  const code = isAppErrorCode(data.code) ? data.code : 'INTERNAL_ERROR';
  return new AppError(code, { requestId: data.requestId, retryable: data.retryable });
}
