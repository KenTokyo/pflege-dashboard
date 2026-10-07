import type { ChatActivity, ChatModel, ChatRequestV1 } from '../../types/phase1';
import { newId } from '../lib/ids';
import { AppError, toAppError, type AppErrorCode } from '../services/errors';
import type { ChatPort } from '../services/types';

export type StreamPhase = 'sending' | 'streaming' | 'completed' | 'failed' | 'aborted';

export type PendingTurn = {
  conversationId: string;
  clientRequestId: string;
  content: string;
  phase: StreamPhase;
  text: string;
  model: ChatModel | null;
  messageId: string | null;
  replayed: boolean;
  usage: { inputTokens: number; outputTokens: number } | null;
  error: AppError | null;
  activity: ChatActivity[];
};

/** Was der Nutzer nach einem Fehler sinnvoll tun kann (Vertrag v1.0: keine automatische bezahlte Wiederholung). */
export type Recovery = 'fetch_again' | 'send_new' | 'reload' | 'none';

const SEND_NEW = new Set<AppErrorCode>([
  'REQUEST_INTERRUPTED',
  'REQUEST_ABORTED',
  'IDEMPOTENCY_CONFLICT',
  'PROVIDER_FAILED',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_UNAVAILABLE',
  'RATE_LIMITED',
  'PARALLEL_LIMIT',
  'INTERNAL_ERROR',
]);

export function recoveryFor(turn: Pick<PendingTurn, 'phase' | 'error'>): Recovery {
  if (turn.phase === 'aborted') return 'send_new';
  if (turn.phase !== 'failed' || !turn.error) return 'none';
  const { code } = turn.error;
  // Verbindung abgerissen oder Antwort unvollständig: gleicher Request liefert eine gespeicherte Antwort
  // als Replay (ohne neuen Provideraufruf) oder meldet den tatsächlichen Zustand.
  if (code === 'NETWORK' || code === 'PROTOCOL') return 'fetch_again';
  if (code === 'REQUEST_IN_PROGRESS') return 'reload';
  if (SEND_NEW.has(code)) return 'send_new';
  return 'none';
}

type Scheduler = (fn: () => void) => void;
const defaultScheduler: Scheduler = (fn) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => fn());
  else setTimeout(fn, 16);
};

export type StreamStoreOptions = {
  chat: ChatPort;
  workspaceId: string;
  registerStream: (controller: AbortController) => () => void;
  /** Gehört der Store noch zur aktuellen Sitzungsgeneration? Sonst werden späte Ereignisse verworfen. */
  isCurrent?: () => boolean;
  /** Nach Abschluss/Fehler: Verlauf neu laden (Server ist die Wahrheit). */
  onSettled: (conversationId: string) => void;
  onSessionLost: (code: AppErrorCode) => void;
  schedule?: Scheduler;
};

/**
 * Hält höchstens einen laufenden Request je Gespräch. Deltas werden pro Bild zusammengefasst,
 * damit lange Antworten nicht für jedes Token neu rendern. Keine Arbeit ohne aktiven Stream.
 */
export class StreamStore {
  private readonly o: StreamStoreOptions;
  private readonly turns = new Map<string, PendingTurn>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly listeners = new Set<() => void>();
  private flushQueued = false;
  private disposed = false;
  private disposeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: StreamStoreOptions) {
    this.o = options;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get(conversationId: string): PendingTurn | null {
    return this.turns.get(conversationId) ?? null;
  }

  isActive(conversationId: string): boolean {
    const phase = this.turns.get(conversationId)?.phase;
    return phase === 'sending' || phase === 'streaming';
  }

  /** Neuer Request mit neuer ID. */
  send(conversationId: string, content: string): void {
    this.start(conversationId, content, newId());
  }

  /** Gleicher Request erneut (gleiche ID): Replay oder echter Serverzustand. */
  fetchAgain(conversationId: string): void {
    const turn = this.turns.get(conversationId);
    if (turn) this.start(conversationId, turn.content, turn.clientRequestId);
  }

  abort(conversationId: string): void {
    this.controllers.get(conversationId)?.abort();
  }

  /** Lokalen Zwischenstand verwerfen, sobald der Verlauf ihn enthält oder der Nutzer ihn schließt. */
  dismiss(conversationId: string): void {
    if (this.isActive(conversationId)) return;
    if (this.turns.delete(conversationId)) this.emit();
  }

  /** Nach dem Einhängen (auch erneut, z. B. im React-StrictMode). */
  activate(): void {
    if (this.disposeTimer !== null) clearTimeout(this.disposeTimer);
    this.disposeTimer = null;
    this.disposed = false;
  }

  /** Abbau nach dem Aushängen; ein sofortiges Wiedereinhängen (StrictMode) hebt ihn auf. */
  scheduleDispose(): void {
    if (this.disposeTimer !== null) return;
    this.disposeTimer = setTimeout(() => {
      this.disposeTimer = null;
      this.dispose();
    }, 0);
  }

  /** Bricht laufende Streams ab und verwirft lokale Zwischenstände. Abonnenten bleiben erhalten. */
  dispose(): void {
    this.disposed = true;
    for (const c of this.controllers.values()) c.abort();
    this.controllers.clear();
    this.turns.clear();
    this.emit();
  }

  private stale(): boolean {
    return this.disposed || (this.o.isCurrent ? !this.o.isCurrent() : false);
  }

  private start(conversationId: string, content: string, clientRequestId: string): void {
    if (this.stale() || this.isActive(conversationId)) return;
    const controller = new AbortController();
    const unregister = this.o.registerStream(controller);
    this.controllers.set(conversationId, controller);
    let turn: PendingTurn = {
      conversationId,
      clientRequestId,
      content,
      phase: 'sending',
      text: '',
      model: null,
      messageId: null,
      replayed: false,
      usage: null,
      error: null,
      activity: [],
    };
    this.turns.set(conversationId, turn);
    this.emit();

    const update = (patch: Partial<PendingTurn>, immediate = true) => {
      turn = { ...turn, ...patch };
      this.turns.set(conversationId, turn);
      if (immediate) this.emit();
      else this.queueFlush();
    };

    const request: ChatRequestV1 = {
      workspaceId: this.o.workspaceId,
      conversationId,
      clientRequestId,
      content,
      attachmentIds: [],
    };

    this.o.chat
      .stream(request, {
        signal: controller.signal,
        onEvent: (event) => {
          if (this.stale()) return;
          switch (event.type) {
            case 'message.activity':
              update({ activity: [...turn.activity.slice(-63), event.data] }, false);
              break;
            case 'message.started':
              update({ phase: 'streaming', model: event.data.model, messageId: event.data.messageId, replayed: event.data.replayed });
              break;
            case 'message.delta':
              update({ text: turn.text + event.data.text }, false);
              break;
            case 'usage.final':
              update({ usage: { inputTokens: event.data.inputTokens, outputTokens: event.data.outputTokens } }, false);
              break;
            case 'message.completed':
              update({ phase: 'completed', messageId: event.data.messageId, replayed: turn.replayed || event.data.replayed });
              break;
            case 'error':
              break;
          }
        },
      })
      .then(
        () => {
          if (this.stale()) return;
          if (turn.phase !== 'completed') update({ phase: 'completed' });
        },
        (error: unknown) => {
          if (this.stale()) return;
          const appError = controller.signal.aborted ? new AppError('REQUEST_ABORTED') : toAppError(error);
          if (appError.code === 'SESSION_EXPIRED' || appError.code === 'AUTH_REQUIRED') this.o.onSessionLost(appError.code);
          update({ phase: appError.code === 'REQUEST_ABORTED' ? 'aborted' : 'failed', error: appError });
        },
      )
      .finally(() => {
        unregister();
        if (this.controllers.get(conversationId) === controller) this.controllers.delete(conversationId);
        if (!this.stale()) this.o.onSettled(conversationId);
      });
  }

  private queueFlush(): void {
    if (this.flushQueued) return;
    this.flushQueued = true;
    (this.o.schedule ?? defaultScheduler)(() => {
      this.flushQueued = false;
      if (!this.disposed) this.emit();
    });
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}
