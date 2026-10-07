import type { ChatActivity, ChatActivityDetails } from '../../types/phase1';

const STAGES = new Set(['auth_verified', 'context_ready', 'token_count', 'provider_request', 'awaiting_text', 'streaming', 'persisting']);
const SOURCES = new Set(['supabase_auth', 'supabase_sql_rpc', 'provider_http', 'provider_stream']);
const PROVIDERS = new Set(['openai', 'deepseek', 'opencode', 'gemini']);
const OPERATIONS = new Set(['edge_chat_replay', 'edge_chat_prepare', 'edge_chat_finish', 'gemini.countTokens', 'gemini.streamGenerateContent', 'openai.input_tokens', 'openai.responses', 'opencode.chat_completions', 'deepseek.chat_completions']);
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Only fixed stages and counted metadata enter the technical view. Text and extra keys are discarded. */
export function parseActivity(value: unknown): ChatActivity | null {
  if (!object(value) || typeof value.stage !== 'string' || !STAGES.has(value.stage) || typeof value.source !== 'string' || !SOURCES.has(value.source) || typeof value.at !== 'string' || !Number.isFinite(Date.parse(value.at)) || typeof value.elapsedMs !== 'number' || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0) return null;
  const details: ChatActivityDetails = {};
  if (object(value.details)) {
    if (typeof value.details.operation === 'string' && OPERATIONS.has(value.details.operation)) details.operation = value.details.operation;
    for (const key of ['inputMessages', 'requestChars', 'maxOutputTokens', 'reasoningChunks', 'outputChars'] as const) {
      const count = value.details[key];
      if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) details[key] = count;
    }
    if (value.details.thinking === 'disabled' || value.details.thinking === 'low' || value.details.thinking === 'provider_default') details.thinking = value.details.thinking;
    if (typeof value.details.replayed === 'boolean') details.replayed = value.details.replayed;
  }
  return {
    stage: value.stage as ChatActivity['stage'],
    source: value.source as ChatActivity['source'],
    at: new Date(value.at).toISOString(),
    elapsedMs: value.elapsedMs,
    ...(typeof value.provider === 'string' && PROVIDERS.has(value.provider) ? { provider: value.provider as NonNullable<ChatActivity['provider']> } : {}),
    ...(typeof value.modelId === 'string' && /^[\w./:-]{1,160}$/.test(value.modelId) ? { modelId: value.modelId } : {}),
    details,
  };
}
