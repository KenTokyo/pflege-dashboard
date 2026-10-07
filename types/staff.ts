import type { Database } from "./database.types.js";
/** Read-only, membership-scoped aggregates from stored rows. Demo chats are never AI usage. */
export type StaffOverview = {
  generatedAt: string;
  totals: {
    careRecipients: number;
    openTasks: number;
    conversations: number;
    activeConversations: number;
    documents: number;
    requests: number;
    completedRequests: number;
    failedRequests: number;
    interruptedRequests: number;
    inputTokens: number;
    outputTokens: number;
    costMicrousd: number;
  };
  people: {
    id: string;
    name: string;
    careGrade: number;
    openTasks: number;
    conversations: number;
    completedAnswers: number;
    lastConversationAt: string | null;
  }[];
  usage: {
    modelId: string;
    provider: Database["public"]["Enums"]["ai_provider"];
    providerModelId: string;
    displayName: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costMicrousd: number;
    estimatedRequests: number;
  }[];
};
