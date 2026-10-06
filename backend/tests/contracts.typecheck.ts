import type { BackendDatabase, UpdateAgentSettingsArgs } from '../../types/rpc.js';
import type { Database } from '../../types/database.types.js';

const reset: UpdateAgentSettingsArgs = {
  p_workspace_id: 'fixture', p_mode: 'answer_only', p_model_id: null,
  p_expected_revision: 1, p_reset_to_default: true, p_persona: null, p_system_prompt: null,
};
const preferences: BackendDatabase['public']['Functions']['set_conversation_preferences']['Args'] = {
  p_conversation_id: 'fixture', p_mode: null, p_model_id: null, p_archived: false, p_expected_revision: 1,
};
// Reset disabled requires editable, non-null prompt input.
// @ts-expect-error: custom prompt must not be null
const invalidCustom: UpdateAgentSettingsArgs = { ...reset, p_reset_to_default: false, p_persona: null };
// @ts-expect-error: planned metadata creation is not an implemented/generated RPC
const unimplemented: keyof Database['public']['Functions'] = 'create_conversation';
// @ts-expect-error: mode has exactly the server's two supported semantic choices
const invalidMode: typeof preferences = { ...preferences, p_mode: 'pretend_create' };
void [reset, preferences, invalidCustom, unimplemented, invalidMode];
