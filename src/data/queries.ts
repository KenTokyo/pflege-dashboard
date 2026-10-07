import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AssignConversationRecipientArgs, CreateConversationArgs } from '../../types/phase1';
import type { UpdateAgentSettingsArgs } from '../../types/rpc';
import { useSessionEpoch, useWorkspace } from '../auth/AuthProvider';
import { useBackend } from '../services/BackendContext';
import { AppError, toAppError } from '../services/errors';
import type { ConversationRow, Enums } from '../services/types';
import { orderMessages } from './model';

/** Kein Polling, kein Neuladen beim Fokuswechsel: Daten laden bei Navigation und nach eigenen Änderungen. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: (count, error) => count < 1 && toAppError(error).retryable,
      },
      mutations: { retry: false },
    },
  });
}

export const keys = {
  all: (ws: string) => ['ws', ws] as const,
  people: (ws: string) => ['ws', ws, 'people'] as const,
  tasks: (ws: string) => ['ws', ws, 'tasks'] as const,
  documents: (ws: string) => ['ws', ws, 'documents'] as const,
  conversations: (ws: string, archived: boolean) => ['ws', ws, 'conversations', archived] as const,
  conversation: (ws: string, id: string) => ['ws', ws, 'conversation', id] as const,
  messages: (ws: string, id: string) => ['ws', ws, 'messages', id] as const,
  models: (ws: string) => ['ws', ws, 'models'] as const,
  settings: (ws: string) => ['ws', ws, 'settings'] as const,
  defaultPrompt: (ws: string) => ['ws', ws, 'default-prompt'] as const,
};

function useWs() {
  return useWorkspace().workspace.id;
}

/**
 * Schreibaufruf an die Sitzungsgeneration binden: Kommt das Ergebnis erst nach Abmeldung oder
 * Neuanmeldung zurück, wird es nicht in den (geleerten) Cache übernommen.
 */
function useSessionWrite<A, R>(fn: (args: A) => Promise<R>) {
  const { isCurrent } = useSessionEpoch();
  const run = async (args: A): Promise<R> => {
    let result: R;
    try {
      result = await fn(args);
    } catch (error) {
      if (!isCurrent()) throw new AppError('AUTH_REQUIRED');
      throw toAppError(error);
    }
    if (!isCurrent()) throw new AppError('AUTH_REQUIRED');
    return result;
  };
  return { run, isCurrent };
}

export function useCareRecipients() {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.people(ws), queryFn: ({ signal }) => data.listCareRecipients(ws, { signal }) });
}

export function useOpenTasks() {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.tasks(ws), queryFn: ({ signal }) => data.listOpenTasks(ws, { signal }) });
}

export function useDocuments() {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.documents(ws), queryFn: ({ signal }) => data.listDocuments(ws, { signal }) });
}

export function useConversations(archived = false) {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.conversations(ws, archived), queryFn: ({ signal }) => data.listConversations(ws, archived, { signal }) });
}

export function useConversation(id: string) {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.conversation(ws, id), queryFn: ({ signal }) => data.getConversation(id, { signal }) });
}

export function useMessages(id: string) {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.messages(ws, id), queryFn: ({ signal }) => data.listMessages(id, { signal }),
    select: orderMessages });
}

export function useModels() {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.models(ws), queryFn: ({ signal }) => data.listModels(ws, { signal }), staleTime: 5 * 60_000 });
}

export function useAgentSettings() {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.settings(ws), queryFn: ({ signal }) => data.getAgentSettings(ws, { signal }) });
}

export function useDefaultPrompt() {
  const ws = useWs();
  const { data } = useBackend();
  return useQuery({ queryKey: keys.defaultPrompt(ws), queryFn: ({ signal }) => data.getDefaultPrompt(ws, { signal }), staleTime: 5 * 60_000 });
}

/** Gesprächsänderungen: Ergebnis in Liste und Einzelansicht übernehmen; bei Revisionskonflikt neu laden. */
function useConversationWrite<A>(fn: (args: A) => Promise<ConversationRow>) {
  const ws = useWs();
  const qc = useQueryClient();
  const { run, isCurrent } = useSessionWrite(fn);
  return useMutation<ConversationRow, AppError, A>({
    mutationFn: run,
    onSuccess: (row) => {
      qc.setQueryData(keys.conversation(ws, row.id), row);
      void qc.invalidateQueries({ queryKey: ['ws', ws, 'conversations'] });
    },
    onError: (error) => {
      if (!isCurrent()) return;
      if (error.code === 'REVISION_CONFLICT' || error.code === 'RESOURCE_NOT_FOUND') {
        void qc.invalidateQueries({ queryKey: ['ws', ws, 'conversations'] });
        void qc.invalidateQueries({ queryKey: ['ws', ws, 'conversation'] });
      }
    },
  });
}

export function useRenameConversation() {
  const { data } = useBackend();
  return useConversationWrite((a: { conversation: ConversationRow; title: string }) =>
    data.renameConversation(a.conversation.id, a.title, a.conversation.revision),
  );
}

export function useArchiveConversation() {
  const { data } = useBackend();
  return useConversationWrite((a: { conversation: ConversationRow; archived: boolean }) =>
    data.setConversationArchived(a.conversation, a.archived),
  );
}

export function useSetConversationModel() {
  const { data } = useBackend();
  return useConversationWrite((a: { conversation: ConversationRow; modelId: string | null }) =>
    data.setConversationModel(a.conversation, a.modelId),
  );
}

export function useCreateConversation() {
  const { data } = useBackend();
  return useConversationWrite((a: CreateConversationArgs) => data.createConversation(a));
}

export function useAssignRecipient() {
  const { data } = useBackend();
  return useConversationWrite((a: AssignConversationRecipientArgs) => data.assignConversationRecipient(a));
}

export function useMarkDocumentStatus() {
  const ws = useWs();
  const qc = useQueryClient();
  const { data } = useBackend();
  const { run, isCurrent } = useSessionWrite((a: { id: string; status: Enums['document_status']; revision: number }) =>
    data.markDocumentStatus(a.id, a.status, a.revision),
  );
  return useMutation<unknown, AppError, { id: string; status: Enums['document_status']; revision: number }>({
    mutationFn: run,
    onSettled: () => (isCurrent() ? qc.invalidateQueries({ queryKey: keys.documents(ws) }) : undefined),
  });
}

export function useUpdateAgentSettings() {
  const ws = useWs();
  const qc = useQueryClient();
  const { data } = useBackend();
  const { run, isCurrent } = useSessionWrite((a: UpdateAgentSettingsArgs) => data.updateAgentSettings(a));
  return useMutation<unknown, AppError, UpdateAgentSettingsArgs>({
    mutationFn: run,
    onSettled: () => (isCurrent() ? qc.invalidateQueries({ queryKey: keys.settings(ws) }) : undefined),
  });
}
