/** Zufällige UUID v4 für Idempotenz- und Request-Schlüssel. */
export function newId(): string {
  return crypto.randomUUID();
}
