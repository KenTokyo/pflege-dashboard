/**
 * Synthetischer Test-Transport für Unit-Tests und den Bild-Harness. Ersetzt NUR die Netzwerkgrenze
 * (Supabase und eigener /api-Server); Login-Formular, Routen, Sitzungslogik und Stream-Verarbeitung bleiben
 * Produktcode. Diese Datei liegt außerhalb von src/ und gelangt nie in den Produkt-Build.
 */
import type { ChatEventV1, ChatModel, ChatRequestV1, Phase1Code } from '../../types/phase1';
import { AppError } from '../../src/services/errors';
import type { AuthChange, AuthSession, Backend, ConversationRow, MessageRow } from '../../src/services/types';
import { createSeed, TEST_USER_ID, type SeedOptions, type SeedState } from './seed';

export const TEST_EMAIL = 'pruefung@beispiel.invalid';
export const TEST_PASSWORD = 'nur-synthetisch';

/** Ablauf einer synthetischen Antwort. */
export type ChatScript =
  | { kind: 'answer'; chunks: string[]; holdBeforeComplete?: boolean; sources?: { title: string; url: string }[] }
  | { kind: 'http_error'; code: Phase1Code }
  | { kind: 'stream_error'; afterChunks: string[]; code: Phase1Code }
  /** Server speichert die Antwort vollständig, die Verbindung zum Browser reißt aber vor `completed` ab. */
  | { kind: 'cut'; afterChunks: string[] };

export type FakeOptions = SeedOptions & {
  /** Verzögerung zwischen synthetischen Stream-Ereignissen (ms). */
  tickMs?: number;
  chat?: (request: ChatRequestV1) => ChatScript;
  /** Synthetischen Bestand vor dem Start erweitern (z. B. große Datenmengen, lange Texte). */
  extend?: (state: SeedState) => void;
};

/** Aufrufe, die ein Test gezielt anhalten kann (nie auflösende oder verspätete Netzantworten). */
export type HoldPoint = 'signIn' | 'loadWorkspace' | 'touch' | 'end' | 'revoke' | 'rename';

export type FakeBackend = Backend & {
  state: SeedState;
  calls: { touch: number; end: number; signOut: number; detach: number; endAborted: number; chat: ChatRequestV1[] };
  /** Nächste Aufrufe dieser Punkte anhalten, bis der Test sie freigibt. */
  hold: Set<HoldPoint>;
  /** Ältesten gehaltenen Aufruf eines Punkts freigeben (auflösen oder mit Code ablehnen). */
  settleHeld: (point: HoldPoint, outcome?: { reject?: Phase1Code }) => void;
  heldCount: (point: HoldPoint) => number;
  /** Gehaltenen Stream (holdBeforeComplete) abschließen. */
  release: () => void;
  failSessionEnd: boolean;
  touchError: Phase1Code | null;
};

const now = () => new Date().toISOString();

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AppError('REQUEST_ABORTED'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AppError('REQUEST_ABORTED'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function createFakeBackend(options: FakeOptions = {}): FakeBackend {
  const state = createSeed(options);
  options.extend?.(state);
  const tick = options.tickMs ?? 0;
  const listeners = new Set<(s: AuthSession | null, c: AuthChange) => void>();
  let session: AuthSession | null = null;
  let releaseHold: (() => void) | null = null;
  let authGeneration = 0;
  let tokenSerial = 0;
  const replies = new Map<string, MessageRow>();

  const conversation = (id: string): ConversationRow => {
    const c = state.conversations.find((x) => x.id === id);
    if (!c) throw new AppError('RESOURCE_NOT_FOUND');
    return c;
  };
  const bump = (id: string, patch: Partial<ConversationRow>, expected: number): ConversationRow => {
    const c = conversation(id);
    if (c.revision !== expected) throw new AppError('REVISION_CONFLICT');
    const next = { ...c, ...patch, revision: c.revision + 1 };
    state.conversations = state.conversations.map((x) => (x.id === id ? next : x));
    return next;
  };
  const message = (conversationId: string, role: MessageRow['role'], content: string, extra: Partial<MessageRow> = {}): MessageRow => ({
    id: crypto.randomUUID(),
    workspace_id: state.workspace.workspace.id,
    created_by: state.workspace.profile.id,
    created_at: now(),
    conversation_id: conversationId,
    role,
    content,
    status: 'completed',
    model_id: null,
    model_snapshot: null,
    prompt_version_id: null,
    input_tokens: null,
    output_tokens: null,
    tool_calls: [],
    sources: [],
    client_request_id: null,
    provider_response_model: null,
    ...extra,
  });

  const held = new Map<HoldPoint, { resolve: () => void; reject: (e: unknown) => void }[]>();
  /** Wartet, falls der Punkt gehalten wird; sonst sofort weiter. */
  const gate = (point: HoldPoint): Promise<void> => {
    if (!fake.hold.has(point)) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const list = held.get(point) ?? [];
      list.push({ resolve, reject });
      held.set(point, list);
    });
  };

  const fake: FakeBackend = {
    state,
    calls: { touch: 0, end: 0, signOut: 0, detach: 0, endAborted: 0, chat: [] },
    hold: new Set(),
    settleHeld(point, outcome = {}) {
      const next = held.get(point)?.shift();
      if (!next) throw new Error(`Kein gehaltener Aufruf: ${point}`);
      if (outcome.reject) next.reject(new AppError(outcome.reject));
      else next.resolve();
    },
    heldCount: (point) => held.get(point)?.length ?? 0,
    failSessionEnd: false,
    touchError: null,
    release: () => releaseHold?.(),
    auth: {
      getSession: () => Promise.resolve(session),
      onChange(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async signIn(email, password) {
        const generation = authGeneration;
        await gate('signIn');
        if (email !== TEST_EMAIL || password !== TEST_PASSWORD) throw new AppError('INVALID_CREDENTIALS');
        // Wie supabaseBackend: während der Anmeldung abgetrennt → Ergebnis verwerfen.
        if (generation !== authGeneration) throw new AppError('AUTH_REQUIRED');
        tokenSerial += 1;
        session = { userId: TEST_USER_ID, email, accessToken: `synthetisch-${tokenSerial}` };
        return session;
      },
      detach() {
        fake.calls.detach += 1;
        authGeneration += 1;
        const previous = session;
        session = null;
        return {
          getToken: () => Promise.resolve(previous?.accessToken ?? null),
          revoke: async () => {
            fake.calls.signOut += 1;
            await gate('revoke');
          },
        };
      },
    },
    session: {
      async touch(workspaceId) {
        fake.calls.touch += 1;
        await gate('touch');
        if (fake.touchError) throw new AppError(fake.touchError);
        const t = Date.now();
        return {
          workspaceId,
          expiresAt: new Date(t + 28_800_000).toISOString(),
          idleExpiresAt: new Date(t + 900_000).toISOString(),
          inactivitySeconds: 900 as const,
          timeboxSeconds: 28800 as const,
        };
      },
      async end(_workspaceId, options = {}) {
        fake.calls.end += 1;
        options.signal?.addEventListener('abort', () => (fake.calls.endAborted += 1), { once: true });
        await gate('end');
        if (fake.failSessionEnd) throw new AppError('NETWORK');
      },
    },
    data: {
      loadWorkspace: async (userId) => {
        await gate('loadWorkspace');
        return userId === TEST_USER_ID ? state.workspace : null;
      },
      listCareRecipients: () => Promise.resolve(state.people),
      listOpenTasks: () => Promise.resolve(state.tasks.filter((t) => t.status === 'open' || t.status === 'in_progress')),
      listDocuments: () => Promise.resolve([...state.documents]),
      listConversations: (_ws, archived) =>
        Promise.resolve(state.conversations.filter((c) => (c.archived_at !== null) === archived)),
      getConversation: (id) => Promise.resolve(state.conversations.find((c) => c.id === id) ?? null),
      listMessages: (id) => Promise.resolve(state.messages.filter((m) => m.conversation_id === id)),
      listModels: () => Promise.resolve(state.models),
      getAgentSettings: () => Promise.resolve(state.settings),
      getDefaultPrompt: () => Promise.resolve(state.defaultPrompt),
      renameConversation: async (id, title, expected) => {
        await gate('rename');
        return bump(id, { title }, expected);
      },
      setConversationArchived: (c, archived) =>
        Promise.resolve().then(() => bump(c.id, { archived_at: archived ? now() : null }, c.revision)),
      createConversation(args) {
        const row: ConversationRow = {
          id: crypto.randomUUID(),
          workspace_id: args.p_workspace_id,
          created_by: state.workspace.profile.id,
          created_at: now(),
          title: args.p_title,
          care_recipient_id: args.p_care_recipient_id,
          archived_at: null,
          mode_override: null,
          model_override_id: null,
          revision: 1,
        };
        state.conversations = [row, ...state.conversations];
        return Promise.resolve(row);
      },
      assignConversationRecipient: (a) =>
        Promise.resolve().then(() => bump(a.p_conversation_id, { care_recipient_id: a.p_care_recipient_id }, a.p_expected_revision)),
      markDocumentStatus(id, status, expected) {
        const d = state.documents.find((x) => x.id === id);
        if (!d) return Promise.reject(new AppError('RESOURCE_NOT_FOUND'));
        if (d.revision !== expected) return Promise.reject(new AppError('REVISION_CONFLICT'));
        const next = { ...d, status, revision: d.revision + 1 };
        state.documents = state.documents.map((x) => (x.id === id ? next : x));
        return Promise.resolve(next);
      },
      updateAgentSettings: () => Promise.reject(new AppError('NOT_DEPLOYED')),
    },
    chat: {
      async stream(request, { signal, onEvent }) {
        fake.calls.chat.push(request);
        const script = options.chat?.(request) ?? { kind: 'http_error', code: 'PROVIDER_NOT_CONFIGURED' };
        if (script.kind === 'http_error') throw new AppError(script.code);
        const stored = replies.get(request.clientRequestId);
        const model = state.models.find((m) => m.id === state.settings.version.default_model_id);
        const chatModel: ChatModel = {
          registryId: model?.id ?? '',
          provider: 'openai',
          providerModelId: model?.provider_model_id ?? '',
          displayName: model?.display_name ?? '',
          region: model?.hosting_region ?? 'unverified',
        };
        let sequence = 0;
        const requestId = crypto.randomUUID();
        const emit = <T extends ChatEventV1['type']>(type: T, data: Extract<ChatEventV1, { type: T }>['data']) => {
          sequence += 1;
          onEvent({ version: 1, requestId, sequence, conversationId: request.conversationId, type, data } as ChatEventV1);
        };
        const messageId = stored?.id ?? crypto.randomUUID();
        // Wie der Node-Server: Frage und Antwortzeile entstehen beim Start mit demselben Zeitstempel,
        // die Antwortzeile zunächst leer mit Status „streaming“; sie wird am Ende gefüllt.
        const startedAt = now();
        const base = {
          id: messageId,
          created_at: startedAt,
          client_request_id: request.clientRequestId,
          model_id: chatModel.registryId,
          model_snapshot: { ...chatModel },
          prompt_version_id: state.defaultPrompt.id,
        };
        const putReply = (row: MessageRow) => {
          state.messages = [...state.messages.filter((m) => m.id !== row.id), row];
        };
        if (!stored) {
          state.messages.push(message(request.conversationId, 'user', request.content, { client_request_id: request.clientRequestId, created_at: startedAt }));
          putReply(message(request.conversationId, 'assistant', '', { ...base, status: 'streaming' }));
        }
        emit('message.started', { messageId, model: chatModel, promptVersionId: state.defaultPrompt.id, replayed: Boolean(stored) });
        const chunks = stored ? [stored.content] : script.kind === 'answer' ? script.chunks : script.afterChunks;
        let text = '';
        try {
          for (const chunk of chunks) {
            await wait(tick, signal);
            text += chunk;
            emit('message.delta', { text: chunk });
          }
          if (script.kind === 'stream_error' && !stored) {
            // Wie der echte Transport: ein SSE-`error`-Ereignis wird zum geworfenen Vertragsfehler.
            throw new AppError(script.code, { requestId, retryable: false });
          }
          if (script.kind === 'answer' && script.holdBeforeComplete && !stored) {
            await new Promise<void>((resolve, reject) => {
              releaseHold = resolve;
              signal.addEventListener('abort', () => reject(new AppError('REQUEST_ABORTED')), { once: true });
            });
          }
        } catch (error) {
          // Abbruch speichert den Teiltext als unterbrochen, andere Fehler als fehlgeschlagen.
          if (!stored) putReply(message(request.conversationId, 'assistant', text, { ...base, status: signal.aborted ? 'interrupted' : 'failed' }));
          throw error;
        }
        if (!stored) {
          const reply = message(request.conversationId, 'assistant', text, {
            ...base,
            provider_response_model: `${chatModel.providerModelId}-synthetisch`,
            input_tokens: 812,
            output_tokens: 164,
            sources: script.kind === 'answer' ? (script.sources ?? []) : [],
          });
          putReply(reply);
          replies.set(request.clientRequestId, reply);
          // Server hat vollständig gespeichert, aber die Verbindung zum Browser reißt ab.
          if (script.kind === 'cut') throw new AppError('NETWORK');
        }
        emit('usage.final', { inputTokens: 812, outputTokens: 164, costMicrousd: 0 });
        emit('message.completed', { messageId, replayed: Boolean(stored) });
      },
    },
  };
  return fake;
}
