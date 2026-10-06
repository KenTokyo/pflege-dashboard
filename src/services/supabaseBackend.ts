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

  const data: DataPort = {
    async loadWorkspace(userId): Promise<WorkspaceContext | null> {
      const profiles = must(await db().from('profiles').select('id, workspace_id, display_name').eq('user_id', userId));
      if (profiles.length === 0) return null;
      const memberships = must(
        await db()
          .from('workspace_memberships')
          .select('profile_id, workspace_id, role')
          .in('profile_id', profiles.map((p) => p.id))
          .eq('status', 'active'),
      );
      const membership = memberships[0];
      const profile = profiles.find((p) => p.id === membership?.profile_id);
      if (!membership || !profile) return null;
      const workspace = must(
        await db().from('workspaces').select('id, name, demo_banner').eq('id', membership.workspace_id).maybeSingle(),
      );
      return {
        workspace: { id: workspace.id, name: workspace.name, demoBanner: workspace.demo_banner },
        profile: { id: profile.id, displayName: profile.display_name },
        role: membership.role,
      };
    },

    async listCareRecipients(workspaceId): Promise<CareRecipient[]> {
      const [people, contacts] = await Promise.all([
        db().from('care_recipients').select('*').eq('workspace_id', workspaceId).order('name'),
        db().from('contacts').select('id, name').eq('workspace_id', workspaceId),
      ]);
      const names = new Map(must(contacts).map((c) => [c.id, c.name]));
      return must(people).map((p) => ({ ...p, insurerName: p.insurer_contact_id ? (names.get(p.insurer_contact_id) ?? null) : null }));
    },

    async listOpenTasks(workspaceId) {
      return must(
        await db()
          .from('tasks')
          .select('*')
          .eq('workspace_id', workspaceId)
          .in('status', ['open', 'in_progress'])
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(100),
      );
    },

    async listDocuments(workspaceId, limit = 50) {
      return must(
        await db().from('documents').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(limit),
      );
    },

    async listConversations(workspaceId, archived) {
      const base = db().from('conversations').select('*').eq('workspace_id', workspaceId);
      const filtered = archived ? base.not('archived_at', 'is', null) : base.is('archived_at', null);
      return must(await filtered.order('created_at', { ascending: false }).limit(200));
    },

    async getConversation(conversationId) {
      const result = await db().from('conversations').select('*').eq('id', conversationId).maybeSingle();
      if (result.error) throw fromDbError(result.error);
      return result.data;
    },

    async listMessages(conversationId) {
      return must(
        await db()
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .in('role', ['user', 'assistant', 'system'])
          .order('created_at', { ascending: true })
          .limit(400),
      );
    },

    async listModels(workspaceId) {
      return must(await db().from('ai_models').select('*').eq('workspace_id', workspaceId).order('display_name'));
    },

    async getAgentSettings(workspaceId) {
      const settings = await db().from('agent_settings').select('*').eq('workspace_id', workspaceId).maybeSingle();
      if (settings.error) throw fromDbError(settings.error);
      if (!settings.data) return null;
      const version = must(
        await db().from('agent_setting_versions').select('*').eq('id', settings.data.current_version_id).maybeSingle(),
      );
      const prompt = must(await db().from('prompt_versions').select('*').eq('id', version.prompt_version_id).maybeSingle());
      return { settings: settings.data, version, prompt };
    },

    async getDefaultPrompt(workspaceId) {
      const result = await db()
        .from('prompt_versions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_default', true)
        .order('version', { ascending: true })
        .limit(1)
        .maybeSingle();
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
