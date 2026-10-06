/** Verbindlicher Anschluss v1.4; Implementierungs-/Prüfstatus steht in docs/api-contract.md. */
import type { Database } from "./database.types.js";
export const PHASE1_API = {
  session: "/api/session",
  chatStream: "/api/chat-stream",
  health: "/api/health",
} as const;
export type HealthResult = { ok: true };
export type ConversationRow =
  Database["public"]["Tables"]["conversations"]["Row"];
export type CreateConversationArgs = {
  p_workspace_id: string;
  p_title: string;
  p_care_recipient_id: string | null;
  p_idempotency_key: string;
};
export type AssignConversationRecipientArgs = {
  p_conversation_id: string;
  p_care_recipient_id: string | null;
  p_expected_revision: number;
};
export type SessionResult = {
  workspaceId: string;
  expiresAt: string;
  idleExpiresAt: string;
} & (
  | { sessionPolicy: "standard"; inactivitySeconds: 900; timeboxSeconds: 28800 }
  | {
      sessionPolicy: "remembered";
      inactivitySeconds: 2592000;
      timeboxSeconds: 2592000;
    }
);
export type SessionEndResult = { ended: true };
export type SessionRequest =
  | { workspaceId: string; action: "touch"; rememberSession?: boolean }
  | { workspaceId: string; action: "end"; rememberSession?: never };
export type ChatRequestV1 = {
  workspaceId: string;
  conversationId: string;
  clientRequestId: string;
  content: string;
  attachmentIds: [];
};
export type Phase1Code =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "WORKSPACE_FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "VALIDATION_FAILED"
  | "IDEMPOTENCY_CONFLICT"
  | "REQUEST_IN_PROGRESS"
  | "REQUEST_INTERRUPTED"
  | "MODEL_UNAVAILABLE"
  | "PROVIDER_NOT_CONFIGURED"
  | "PRICING_UNVERIFIED"
  | "RATE_LIMITED"
  | "PARALLEL_LIMIT"
  | "BUDGET_EXCEEDED"
  | "PROVIDER_FAILED"
  | "INTERNAL_ERROR"
  | "REQUEST_ABORTED";
export type Phase1Error = {
  code: Phase1Code;
  message: string;
  requestId: string;
  retryable: boolean;
};
export type ChatModel = {
  registryId: string;
  provider: "openai" | "deepseek";
  providerModelId: string;
  displayName: string;
  region: "eu" | "us" | "unverified";
};
type Data = {
  "message.started": {
    messageId: string;
    model: ChatModel;
    promptVersionId: string;
    replayed: boolean;
  };
  "message.delta": { text: string };
  "usage.final": {
    inputTokens: number;
    outputTokens: number;
    costMicrousd: number;
  };
  "message.completed": { messageId: string; replayed: boolean };
  error: Phase1Error;
};
export type ChatEventV1 = {
  [K in keyof Data]: {
    version: 1;
    requestId: string;
    sequence: number;
    conversationId: string;
    type: K;
    data: Data[K];
  };
}[keyof Data];
