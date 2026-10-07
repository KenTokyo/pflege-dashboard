import { Navigate } from '@tanstack/react-router';

const RETURN_PAGES = ['/gespraeche', '/dokumente', '/aufgaben', '/einstellungen', '/sachbearbeitung'] as const;
type ReturnPage = (typeof RETURN_PAGES)[number];
const CONVERSATION_PATH = /^\/gespraeche\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Rücksprungziel nach der Anmeldung: nur bekannte interne Seiten, keine fremden oder freien Ziele. */
export function safeReturnPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return (RETURN_PAGES as readonly string[]).includes(value) || CONVERSATION_PATH.test(value) ? value : undefined;
}

export function ReturnTo({ path }: { path: string | undefined }) {
  const conversationId = path ? CONVERSATION_PATH.exec(path)?.[1] : undefined;
  if (conversationId) return <Navigate to="/gespraeche/$conversationId" params={{ conversationId }} replace />;
  const page = RETURN_PAGES.find((p): p is ReturnPage => p === path);
  return <Navigate to={page ?? '/'} replace />;
}
