import type { Context, Provider } from "./provider.js";

const TITLE_INSTRUCTIONS =
  "Formuliere einen kurzen deutschen Titel (2 bis 6 Wörter) für ein Gespräch, das mit der folgenden Frage beginnt. " +
  "Antworte nur mit dem Titel: ohne Anführungszeichen, ohne Satzzeichen am Ende, ohne Erklärung. " +
  "Nenne keine Namen, Geburtsdaten oder Versichertennummern.";

/** Erste Zeile, ohne Anführungszeichen und Endzeichen, höchstens 60 Zeichen; sonst null. */
export function cleanTitle(raw: string): string | null {
  const line = raw.trim().split(/\r?\n/, 1)[0] ?? "";
  const clean = line
    .replace(/^(titel|title)\s*:\s*/i, "")
    .replace(/[*_#`]/g, "")
    .replace(/^["'„“”«»\s]+|["'„“”«»\s]+$/g, "")
    .replace(/[\s.,;:!–-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length < 2) return null;
  if (clean.length <= 60) return clean;
  const cut = clean.slice(0, 58);
  const space = cut.lastIndexOf(" ");
  return `${space > 30 ? cut.slice(0, space) : cut} …`;
}

/**
 * Kurzer Gesprächstitel aus der ersten Frage, mit demselben Modell wie die Antwort.
 * Fehler, Abbruch oder Zeitüberschreitung ergeben null; der Chat selbst ist davon nie betroffen.
 */
export async function suggestTitle(
  provider: Provider,
  context: Context,
  question: string,
  signal: AbortSignal,
  timeoutMs = 8000,
): Promise<string | null> {
  const titleContext: Context = {
    ...context,
    instructions: TITLE_INSTRUCTIONS,
    responseFormat: "text",
    input: [{ role: "user", content: question.slice(0, 1500) }],
    maxOutputTokens: 32,
  };
  const combined = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  let text = "";
  try {
    for await (const part of provider.stream(titleContext, combined)) {
      if ("text" in part) text += part.text;
      if (text.length > 400) break;
    }
  } catch {
    return null;
  }
  return cleanTitle(text);
}
