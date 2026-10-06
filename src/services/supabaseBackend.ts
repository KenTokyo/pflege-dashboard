import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { BackendDatabase } from '../../types/rpc';
import type { PublicConfig } from '../lib/env';
import { AppError, fromDbError } from './errors';
import { createChatTransport, createSessionTransport } from './api';
import type { AuthChange, AuthSession, Backend, CareRecipient, DataPort, WorkspaceContext } from './types';

type Client = SupabaseClient<BackendDatabase>;

function toSession(session: Session | null): AuthSession | null {
  if (!session) return null;
  return { userId: session.user.id, email: session.user.email ?? null, accessToken: session.access_token };
}

function must<T>(result: { data: T; error: { code?: string; message?: string } | null }): NonNullable<T> {
  if (result.error) throw fromDbError(result.error);
  if (result.data === null || result.data === undefined) throw new AppError('RESOURCE_NOT_FOUND');
  return result.data;
}

/**
 * Seitengröße für Listen. Höchstens so groß wie PostgREST `max_rows` (lokal 500, gehostet Standard 1000),
 * sonst würde eine volle Seite für das Ende gehalten.
 */
export const PAGE_SIZE = 500;

type PageResult<T> = { data: T[] | null; error: { code?: string; message?: string } | null };
export type PageGuard = {
  /** false, sobald die Sitzung gewechselt hat (Abmeldung, Neuanmeldung): keine weitere Seite laden. */
  isCurrent: () => boolean;
  signal?: AbortSignal | undefined;
};

/** Abfrage beendet, weil abgebrochen oder die Sitzung inzwischen gewechselt hat. */
function stale(guard: PageGuard): AppError | null {
  if (guard.signal?.aborted) return new AppError('REQUEST_ABORTED');
  if (!guard.isCurrent()) return new AppError('AUTH_REQUIRED');
  return null;
}

/**
 * Lädt eine Liste vollständig in Seiten (`range`). Ohne künstliche Obergrenze: Es endet, sobald eine Seite
 * weniger Zeilen als PAGE_SIZE liefert. Die Abfrage muss eindeutig sortiert sein (zuletzt nach `id`),
 * sonst können Zeilen zwischen Seiten springen. Doppelte IDs (neue Zeilen während des Ladens) fallen weg.
 * Vor jeder Seite und vor dem Ergebnis wird die Sitzungsgeneration geprüft: Nach einer Abmeldung lädt
 * keine Folgeseite über einen neuen Client weiter, und kein Teilergebnis wird zurückgegeben.
 */
export async function fetchAll<T extends { id: string }>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  guard: PageGuard,
): Promise<T[]> {
  const out: T[] = [];
  const seen = new Set<string>();
  for (let from = 0; ; ) {
    const before = stale(guard);
    if (before) throw before;
    const result = await page(from, from + PAGE_SIZE - 1);
    const after = stale(guard);
    if (after) throw after;
    const rows = must(result);
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
    if (rows.length < PAGE_SIZE) return out;
    from += rows.length;
  }
}

/** Abbruchsignal bis zur PostgREST-Anfrage durchreichen (sonst läuft sie nach Abmeldung weiter). */
function withSignal<Q extends { abortSignal(signal: AbortSignal): Q }>(query: Q, signal?: AbortSignal): Q {
  return signal ? query.abortSignal(signal) : query;
}

export function createSupabaseBackend(config: PublicConfig): Backend {
  const listeners = new Set<(session: AuthSession | null, change: AuthChange) => void>();
  const emit = (session: AuthSession | null, change: AuthChange) => listeners.forEach((l) => l(session, change));

  // Sitzung nur im flüchtigen Speicher, kein automatischer Hintergrund-Refresh (kein Timer im Leerlauf).
  // getSession() erneuert ein ablaufendes Token bei der nächsten echten Anfrage.
  const make = (): Client => {
    const client = createClient<BackendDatabase>(config.supabaseUrl, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    client.auth.onAuthStateChange((event, session) => {
      if (client !== current) return;
      if (event === 'SIGNED_OUT') emit(null, 'signed_out');
      else if (event === 'TOKEN_REFRESHED') emit(toSession(session), 'refreshed');
    });
    return client;
  };
  let current: Client = make();
  const db = () => current;

  const getSession = async (): Promise<AuthSession | null> => {
    const { data, error } = await current.auth.getSession();
    if (error) return null;
    return toSession(data.session);
  };
  const token = async () => (await getSession())?.accessToken ?? null;

  /** Client einer Leseanfrage festhalten; Folgeseiten und Ergebnis nur, solange er noch gilt. */
  const reader = (signal?: AbortSignal) => {
    const client = current;
    return { c: client, guard: { isCurrent: () => client === current, signal } satisfies PageGuard };
  };
  const single = async <T>(guard: PageGuard, run: PromiseLike<T>): Promise<T> => {
    const result = await run;
    const gone = stale(guard);
    if (gone) throw gone;
    return result;
  };

  const data: DataPort = {
    async loadWorkspace(userId): Promise<WorkspaceContext | null> {
      const { c, guard } = reader();
      const profiles = must(await single(guard, c.from('profiles').select('id, workspace_id, display_name').eq('user_id', userId)));
      if (profiles.length === 0) return null;
      const memberships = must(
        await single(
          guard,
          c
            .from('workspace_memberships')
            .select('profile_id, workspace_id, role')
            .in('profile_id', profiles.map((p) => p.id))
            .eq('status', 'active'),
        ),
      );
      const membership = memberships[0];
      const profile = profiles.find((p) => p.id === membership?.profile_id);
      if (!membership || !profile) return null;
      const workspace = must(
        await single(guard, c.from('workspaces').select('id, name, demo_banner').eq('id', membership.workspace_id).maybeSingle()),
      );
      return {
        workspace: { id: workspace.id, name: workspace.name, demoBanner: workspace.demo_banner },
        profile: { id: profile.id, displayName: profile.display_name },
        role: membership.role,
      };
    },

    async listCareRecipients(workspaceId, options = {}): Promise<CareRecipient[]> {
      const { c, guard } = reader(options.signal);
      const [people, contacts] = await Promise.all([
        fetchAll(
          (from, to) =>
            withSignal(c.from('care_recipients').select('*').eq('workspace_id', workspaceId).order('name').order('id').range(from, to), options.signal),
          guard,
        ),
        fetchAll(
          (from, to) => withSignal(c.from('contacts').select('id, name').eq('workspace_id', workspaceId).order('id').range(from, to), options.signal),
          guard,
        ),
      ]);
      const names = new Map(contacts.map((x) => [x.id, x.name]));
      return people.map((p) => ({ ...p, insurerName: p.insurer_contact_id ? (names.get(p.insurer_contact_id) ?? null) : null }));
    },

    // Listen vollständig (seitenweise), damit Zählungen und Verläufe nie still abgeschnitten werden.
    async listOpenTasks(workspaceId, options = {}) {
      const { c, guard } = reader(options.signal);
      return fetchAll(
        (from, to) =>
          withSignal(
            c
              .from('tasks')
              .select('*')
              .eq('workspace_id', workspaceId)
              .in('status', ['open', 'in_progress'])
              .order('due_at', { ascending: true, nullsFirst: false })
              .order('id')
              .range(from, to),
            options.signal,
          ),
        guard,
      );
    },

    async listDocuments(workspaceId, options = {}) {
      const { c, guard } = reader(options.signal);
      return fetchAll(
        (from, to) =>
          withSignal(
            c.from('documents').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).order('id').range(from, to),
            options.signal,
          ),
        guard,
      );
    },

    async listConversations(workspaceId, archived, options = {}) {
      const { c, guard } = reader(options.signal);
      return fetchAll((from, to) => {
        const query = c.from('conversations').select('*').eq('workspace_id', workspaceId);
        const filtered = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
        return withSignal(filtered.order('created_at', { ascending: false }).order('id').range(from, to), options.signal);
      }, guard);
    },

    async getConversation(conversationId, options = {}) {
      const { c, guard } = reader(options.signal);
      const result = await single(guard, withSignal(c.from('conversations').select('*').eq('id', conversationId), options.signal).maybeSingle());
      if (result.error) throw fromDbError(result.error);
      return result.data;
    },

    // Ganzer Verlauf, älteste zuerst: Die neueste Antwort darf bei langen Gesprächen nie fehlen.
    async listMessages(conversationId, options = {}) {
      const { c, guard } = reader(options.signal);
      return fetchAll(
        (from, to) =>
          withSignal(
            c
              .from('messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .in('role', ['user', 'assistant', 'system'])
              .order('created_at', { ascending: true })
              .order('id')
              .range(from, to),
            options.signal,
          ),
        guard,
      );
    },

    async listModels(workspaceId, options = {}) {
      const { c, guard } = reader(options.signal);
      return fetchAll(
        (from, to) =>
          withSignal(c.from('ai_models').select('*').eq('workspace_id', workspaceId).order('display_name').order('id').range(from, to), options.signal),
        guard,
      );
    },

    async getAgentSettings(workspaceId, options = {}) {
      const { c, guard } = reader(options.signal);
      const settings = await single(guard, withSignal(c.from('agent_settings').select('*').eq('workspace_id', workspaceId), options.signal).maybeSingle());
      if (settings.error) throw fromDbError(settings.error);
      if (!settings.data) return null;
      const version = must(
        await single(
          guard,
          withSignal(c.from('agent_setting_versions').select('*').eq('id', settings.data.current_version_id), options.signal).maybeSingle(),
        ),
      );
      const prompt = must(
        await single(guard, withSignal(c.from('prompt_versions').select('*').eq('id', version.prompt_version_id), options.signal).maybeSingle()),
      );
      return { settings: settings.data, version, prompt };
    },

    async getDefaultPrompt(workspaceId, options = {}) {
      const { c, guard } = reader(options.signal);
      const result = await single(
        guard,
        withSignal(
          c.from('prompt_versions').select('*').eq('workspace_id', workspaceId).eq('is_default', true).order('version', { ascending: true }).limit(1),
          options.signal,
        ).maybeSingle(),
      );
      if (result.error) throw fromDbError(result.error);
      return result.data;
    },

    async renameConversation(conversationId, title, expectedRevision) {
      return must(
        await db().rpc('rename_conversation', {
          p_conversation_id: conversationId,
          p_title: title,
          p_expected_revision: expectedRevision,
        }),
      );
    },

    async setConversationArchived(conversation, archived) {
      return must(
        await db().rpc('set_conversation_preferences', {
          p_conversation_id: conversation.id,
          p_mode: conversation.mode_override,
          p_model_id: conversation.model_override_id,
          p_archived: archived,
          p_expected_revision: conversation.revision,
        }),
      );
    },

    async createConversation(args) {
      return must(await db().rpc('create_conversation', args));
    },

    async assignConversationRecipient(args) {
      return must(await db().rpc('assign_conversation_recipient', args));
    },

    async markDocumentStatus(documentId, status, expectedRevision) {
      return must(
        await db().rpc('mark_document_status', {
          p_document_id: documentId,
          p_status: status,
          p_expected_revision: expectedRevision,
        }),
      );
    },

    async updateAgentSettings(args) {
      return must(await db().rpc('update_agent_settings', args));
    },
  };

  return {
    auth: {
      getSession,
      onChange(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async signIn(email, password) {
        const client = current;
        let result: Awaited<ReturnType<Client['auth']['signInWithPassword']>>;
        try {
          result = await client.auth.signInWithPassword({ email, password });
        } catch {
          throw new AppError('NETWORK');
        }
        // Während der Anmeldung lokal abgemeldet (oder neu begonnen): Ergebnis nie übernehmen, Sitzung widerrufen.
        if (client !== current) {
          if (result.data.session) void client.auth.signOut({ scope: 'local' }).catch(() => undefined);
          throw new AppError('AUTH_REQUIRED');
        }
        const { data: auth, error } = result;
        if (error) {
          if (error.status === 429) throw new AppError('RATE_LIMITED');
          if (error.status === 400 || error.status === 401 || error.status === 422) throw new AppError('INVALID_CREDENTIALS');
          if (error.name === 'AuthRetryableFetchError' || !error.status) throw new AppError('NETWORK');
          throw new AppError('INTERNAL_ERROR');
        }
        const session = toSession(auth.session);
        if (!session) throw new AppError('INVALID_CREDENTIALS');
        emit(session, 'signed_in');
        return session;
      },
      detach() {
        // Sofort einen leeren Client einsetzen: Daten, Chat und Touch haben ab jetzt kein Token mehr.
        // Der alte Client lebt nur noch für den begrenzten Widerruf; seine Ereignisse werden ignoriert.
        const previous = current;
        current = make();
        return {
          getToken: async () => {
            const { data } = await previous.auth.getSession();
            return data.session?.access_token ?? null;
          },
          revoke: async () => {
            await previous.auth.signOut({ scope: 'local' });
          },
        };
      },
    },
    data,
    chat: createChatTransport(token),
    session: createSessionTransport(token),
  };
}
