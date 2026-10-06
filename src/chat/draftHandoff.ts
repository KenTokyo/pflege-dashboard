/**
 * Übergabe einer Frage vom Dashboard an den Chat – nur im Arbeitsspeicher.
 * Bewusst nicht in URL, History-State oder Browser-Speicher (Gesundheitsdaten).
 */
let pending: { conversationId: string; text: string } | null = null;

export function setDraftHandoff(conversationId: string, text: string): void {
  pending = { conversationId, text };
}

export function takeDraftHandoff(conversationId: string): string | null {
  if (pending?.conversationId !== conversationId) return null;
  const { text } = pending;
  pending = null;
  return text;
}

export function clearDraftHandoff(): void {
  pending = null;
}
