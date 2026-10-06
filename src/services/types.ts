import type { Database } from '../../types/database.types';
import type {
  AssignConversationRecipientArgs,
  ChatEventV1,
  ChatRequestV1,
  CreateConversationArgs,
  SessionResult,
} from '../../types/phase1';
import type { UpdateAgentSettingsArgs } from '../../types/rpc';
import type { AppError } from './errors';

type Tables = Database['public']['Tables'];
export type Row<K extends keyof Tables> = Tables[K]['Row'];
export type Enums = Database['public']['Enums'];

export type ConversationRow = Row<'conversations'>;
export type MessageRow = Row<'messages'>;
export type TaskRow = Row<'tasks'>;
export type DocumentRow = Row<'documents'>;
export type ModelRow = Row<'ai_models'>;
export type PromptVersionRow = Row<'prompt_versions'>;
export type AgentSettingsRow = Row<'agent_settings'>;
export type AgentSettingVersionRow = Row<'agent_setting_versions'>;
export type CareRecipientRow = Row<'care_recipients'>;

export type CareRecipient = CareRecipientRow & { insurerName: string | null };

export type WorkspaceContext = {
  workspace: { id: string; name: string; demoBanner: boolean };
  profile: { id: string; displayName: string };
  role: Enums['membership_role'];
};

export type AgentSettingsView = {
  settings: AgentSettingsRow;
  version: AgentSettingVersionRow;
  prompt: PromptVersionRow;
};

export type AuthSession = {
  userId: string;
  email: string | null;
  accessToken: string;
};

export type AuthChange = 'signed_in' | 'signed_out' | 'refreshed' | 'other';

/**
 * Abgetrennte Sitzung nach lokaler Abmeldung. Der App-Zustand kennt sie nicht mehr; sie dient nur dem
 * zeitlich begrenzten Widerruf beim Server und ist danach wertlos.
 */
export type DetachedSession = {
  /** Token der abgetrennten Sitzung (erneuert ihn bei Bedarf), nur für session end. */
  getToken(): Promise<string | null>;
  /** Refresh-Sitzung beim Auth-Server widerrufen. */
  revoke(): Promise<void>;
};

export interface AuthPort {
  /** Aktuelle Sitzung (nur im Speicher). Erneuert ein abgelaufenes Token bei Bedarf. */
  getSession(): Promise<AuthSession | null>;
  onChange(listener: (session: AuthSession | null, change: AuthChange) => void): () => void;
  /** Wirft AppError mit verständlichem Code. Eine während der Anmeldung abgetrennte Sitzung wird verworfen. */
  signIn(email: string, password: string): Promise<AuthSession>;
  /**
   * Lokale Abmeldung, synchron und ohne Netz: Ab sofort hat keine Anfrage mehr ein Token.
   * Gibt die abgetrennte Sitzung für einen optionalen, begrenzten Server-Widerruf zurück.
   */
  detach(): DetachedSession;
}

export interface DataPort {
  loadWorkspace(userId: string): Promise<WorkspaceContext | null>;
  listCareRecipients(workspaceId: string): Promise<CareRecipient[]>;
  listOpenTasks(workspaceId: string): Promise<TaskRow[]>;
  listDocuments(workspaceId: string, limit?: number): Promise<DocumentRow[]>;
  listConversations(workspaceId: string, archived: boolean): Promise<ConversationRow[]>;
  getConversation(conversationId: string): Promise<ConversationRow | null>;
  listMessages(conversationId: string): Promise<MessageRow[]>;
  listModels(workspaceId: string): Promise<ModelRow[]>;
  getAgentSettings(workspaceId: string): Promise<AgentSettingsView | null>;
  getDefaultPrompt(workspaceId: string): Promise<PromptVersionRow | null>;
  renameConversation(conversationId: string, title: string, expectedRevision: number): Promise<ConversationRow>;
  setConversationArchived(conversation: ConversationRow, archived: boolean): Promise<ConversationRow>;
  createConversation(args: CreateConversationArgs): Promise<ConversationRow>;
  assignConversationRecipient(args: AssignConversationRecipientArgs): Promise<ConversationRow>;
  markDocumentStatus(documentId: string, status: Enums['document_status'], expectedRevision: number): Promise<DocumentRow>;
  updateAgentSettings(args: UpdateAgentSettingsArgs): Promise<AgentSettingsRow>;
}

export type StreamHandlers = {
  signal: AbortSignal;
  onEvent: (event: ChatEventV1) => void;
};

export interface ChatPort {
  /** Startet eine Antwort per SSE. Löst nach `message.completed` auf, wirft AppError bei Fehlern/Abbruch. */
  stream(request: ChatRequestV1, handlers: StreamHandlers): Promise<void>;
}

/** Serverseitige App-Sitzung (POST /api/session, eigener Node-Server). Kein Heartbeat, nur bei echter Interaktion. */
export interface SessionPort {
  touch(workspaceId: string): Promise<SessionResult>;
  /** Mit `via` gegen eine bereits abgetrennte Sitzung (Abmeldung); `signal` begrenzt die Dauer. */
  end(workspaceId: string, options?: { via?: DetachedSession; signal?: AbortSignal }): Promise<void>;
}

export type Backend = { auth: AuthPort; data: DataPort; chat: ChatPort; session: SessionPort };

export type { AppError, ChatEventV1, ChatRequestV1, SessionResult };
