/** Vertrag v1.0. Phase-1-Typen exportiert; Vorschläge/Uploads/Tools bleiben PLANNED Phase 2. */
export type UUID = string;
export type AgentMode = "answer_only" | "create";
export type DocumentStatus = "draft" | "reviewed" | "sent";
export type {
  AssignConversationRecipientArgs,
  CreateConversationArgs,
} from "./phase1.js";
export type ProposalKind = "document" | "task" | "note" | "handover";
export type ModelSnapshot = {
  registryId: UUID;
  provider: "openai" | "anthropic" | "mistral";
  providerModelId: string;
  displayName: string;
  region: "eu" | "us" | "unverified";
};
export type {
  ChatEventV1 as StreamEvent,
  ChatRequestV1 as ChatRequest,
} from "./phase1.js";
export type DocumentPreview = {
  kind: "document";
  documentType: "letter" | "application" | "objection" | "respite" | "relief";
  title: string;
  careRecipientId: UUID | null;
  sender: { name: string; address: string };
  recipient: { name: string; address: string };
  subject: string;
  body: string;
};
export type TaskPreview = {
  kind: "task" | "handover";
  title: string;
  description: string;
  careRecipientId: UUID | null;
  dueAt: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  deadlineSource: string | null;
};
export type NotePreview = { kind: "note"; careRecipientId: UUID; body: string };
export type ProposalPreview = DocumentPreview | TaskPreview | NotePreview;
export type ProposalConfirmRequest = {
  workspaceId: UUID;
  conversationId: UUID;
  proposalId: UUID;
  proposalRevision: number;
  editedPreview: ProposalPreview;
  idempotencyKey: UUID;
};
export type ConfirmResult = {
  actionId: UUID;
  resultType: ProposalKind;
  resultId: UUID;
  replayed: boolean;
};
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "WORKSPACE_FORBIDDEN"
  | "MODE_FORBIDS_CREATE"
  | "ADMIN_REQUIRED"
  | "RESOURCE_NOT_FOUND"
  | "REVISION_CONFLICT"
  | "PROPOSAL_STALE"
  | "IDEMPOTENCY_CONFLICT"
  | "PROPOSAL_EXPIRED"
  | "UPLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "MODEL_UNAVAILABLE"
  | "CAPABILITY_UNSUPPORTED"
  | "UPLOAD_REJECTED"
  | "RATE_LIMITED"
  | "BUDGET_EXCEEDED"
  | "PROVIDER_FAILED"
  | "PRICING_UNVERIFIED"
  | "INTERNAL_ERROR";
export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: UUID;
    retryable: boolean;
  };
};
type EventData = {
  "message.started": {
    messageId: UUID;
    model: ModelSnapshot;
    promptVersionId: UUID;
  };
  "message.delta": { text: string };
  "source.added": {
    sourceId: string;
    title: string;
    url: string | null;
    excerpt: string;
  };
  "proposal.ready": {
    proposalId: UUID;
    revision: number;
    expiresAt: string;
    preview: ProposalPreview;
  };
  "usage.final": {
    inputTokens: number;
    outputTokens: number;
    costMicrousd: number;
  };
  "message.completed": { messageId: UUID };
  error: ApiError["error"];
};
export type PlannedPhase2StreamEvent = {
  [K in keyof EventData]: {
    version: 1;
    requestId: UUID;
    sequence: number;
    conversationId: UUID;
    type: K;
    data: EventData[K];
  };
}[keyof EventData];
