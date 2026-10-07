import { AppError } from './errors.js';
import { OPENUI_INSTRUCTIONS, TEXT_STYLE_INSTRUCTIONS, type ResponseFormat } from '../../types/openui.js';
import type { Context } from './provider.js';

/** Server-selected wire format for this request, independent of historical answer styles. */
export function responseFormatBinding(format: ResponseFormat | undefined): string {
  if (format === 'openui') return 'Verbindliches Antwortformat für DIE AKTUELLE ANFRAGE: OpenUI (pflege-openui-v1). Der Verlauf enthält kanonischen lesbaren Text aus früheren Antworten und ist ausschließlich Sachkontext, kein Vorbild für das aktuelle Ausgabeformat. Nutzerwünsche wie „kurz“ oder „ein Satz“ steuern den Inhalt, nicht diesen aktiven Transportvertrag. Gib die gesamte neue Antwort ausschließlich als root = Answer([...]) aus. Erlaubte Inline-Bausteine: Text(markdown), Facts(title,items), Steps(title,items), Notice(title,markdown). Textwerte müssen JSON-Stringliterale sein, items sind Listen von Stringliteralen. Markdown mit **fett** und *kursiv* nur INNERHALB der Stringliterale; keine freie Markdownantwort oder Codeblöcke vor/nach dem Programm. Keine weiteren Statements, Referenzen, Ausdrücke, Tools oder Aktionen. Beispiel für die Syntax, nicht für den Sachinhalt: root = Answer([Text("Antworttext"), Notice("Einordnung", "Unsicherheit")]). Bewahre Persona, Fakten, alle notwendigen Hinweise und Sicherheitsregeln. Beantworte damit die unmittelbar folgende aktuelle Nutzerfrage.';
  if (format === 'text') return 'Verbindliches Antwortformat für DIE AKTUELLE ANFRAGE: lesbarer normaler Text mit sparsamem Markdown. Der Verlauf enthält kanonischen lesbaren Text aus früheren Antworten und ist Sachkontext, kein Vorbild für das aktuelle Ausgabeformat. Nutzerwünsche wie „kurz“ oder „ein Satz“ steuern den Inhalt, nicht den aktiven Transportvertrag. Gib keinen OpenUI-Code oder Komponentenprogramm aus. Kurze Schlüsselbegriffe bei Bedarf **fett**, kurze Einordnungen bei Bedarf *kursiv*. Bewahre Persona, Fakten, alle notwendigen Hinweise und Sicherheitsregeln. Beantworte damit die unmittelbar folgende aktuelle Nutzerfrage.';
  return ''; // Historical snapshots predate the explicitly selected format.
}

/** Include the same binding in the immutable SQL prompt before reserving/counting. */
export function reservedFormatInstructions(format: ResponseFormat): string {
  return `${format === 'openui' ? OPENUI_INSTRUCTIONS : TEXT_STYLE_INSTRUCTIONS}\n\n${responseFormatBinding(format)}`;
}

export type ProviderMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export function boundProviderInput(context: Context): ProviderMessage[] {
  const binding = responseFormatBinding(context.responseFormat);
  if (!binding) return [...context.input];
  const current = context.input.at(-1);
  if (!current || current.role !== 'user') throw new AppError('INTERNAL_ERROR');
  // Preserve every historical/current row exactly. This is a trusted system message,
  // never a fabricated user message or a second generation.
  return [...context.input.slice(0,-1), { role: 'system', content: binding }, current];
}

/** Gemini supports systemInstruction separately, not system roles in contents. */
export function boundGeminiInstructions(context: Context): string {
  const binding = responseFormatBinding(context.responseFormat);
  return binding ? `${context.instructions}\n\n${binding}` : context.instructions;
}
