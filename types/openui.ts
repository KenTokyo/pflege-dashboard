/** One bounded, read-only catalogue shared by the trusted server and React renderer. */
import { createLibrary, createParser, defineComponent } from '@openuidev/lang-core';
import { z } from 'zod/v4';

export const OPENUI_CATALOG_VERSION = 'pflege-openui-v1' as const;
export const OPENUI_SOURCE_LIMIT = 100000;
export type ResponseFormat = 'text' | 'openui';
export type ChatPresentation = {
  format: 'openui';
  catalogVersion: typeof OPENUI_CATALOG_VERSION;
  source: string;
  state: 'streaming' | 'valid' | 'invalid' | 'interrupted';
};
const markdown = z.string().max(OPENUI_SOURCE_LIMIT);
const items = z.array(markdown).max(40);
export const OPENUI_SCHEMAS = {
  Text: z.object({ markdown }),
  Facts: z.object({ title: markdown, items }),
  Steps: z.object({ title: markdown, items }),
  Notice: z.object({ title: markdown, markdown }),
};
const definitions = Object.entries(OPENUI_SCHEMAS).map(([name, props]) => defineComponent({
  name, props, component: null, description: name === 'Facts'
    ? 'Sachliche Stichpunkte aus dem bereitgestellten Kontext; keine Behauptung einer unabhängigen Prüfung.'
    : name === 'Steps' ? 'Geordnete nächste Schritte ohne ausgeführte Aktionen.'
    : name === 'Notice' ? 'Einordnung, Unsicherheit oder wichtiger Hinweis.'
    : 'Lesbarer Antwortabschnitt mit sicherem Markdown.',
}));
export const OPENUI_ANSWER_SCHEMA = z.object({
  sections: z.array(z.union(definitions.map(d => d.ref) as [typeof definitions[number]['ref'], typeof definitions[number]['ref'], ...typeof definitions[number]['ref'][]])).max(24),
});
export const OPENUI_LIBRARY = createLibrary({ root: 'Answer', components: [
  defineComponent({ name: 'Answer', props: OPENUI_ANSWER_SCHEMA, component: null,
    description: 'Die vollständige Antwort. Alle Tatsachen, Schritte und Hinweise stehen in den Abschnitten.' }),
  ...definitions,
] });
const parser = createParser(OPENUI_LIBRARY.toJSONSchema(), 'Answer');

type Section = { typeName: keyof typeof OPENUI_SCHEMAS; props: Record<string, unknown> };
export type OpenUiResult = {
  state: 'streaming' | 'valid' | 'invalid';
  source: string;
  text: string;
  sections: Section[];
  reason?: 'incomplete' | 'syntax' | 'schema' | 'limit';
};

/** A model that ignored the requested format can still leave a readable answer.
 * Preserve clear prose as plain Markdown on the failed record; never expose DSL as prose. */
export function openUiPlainTextFallback(source: string): string {
  if (typeof source !== 'string' || source.length > OPENUI_SOURCE_LIMIT ||
    /```|(?:^|\n)\s*[\w$]+\s*=|\b(?:Answer|Text|Facts|Steps|Notice|Query|Mutation|Action)\s*\(/.test(source)) return '';
  return source;
}

/** The SDK deliberately tolerates missing/unknown nodes. This stricter lexical gate
 * permits exactly one literal root call, no expressions, references, tools or state.
 * It consumes every character, so SDK recovery cannot silently discard trailing code. */
function literalGate(source: string): boolean {
  let p = 0, sectionCount = 0;
  const space = () => { while (/\s/.test(source[p] ?? '') && p < source.length) p++; };
  const fail = (): never => { throw p >= source.length ? 'incomplete' : 'syntax'; };
  const symbol = (wanted: string) => {
    space();
    for (const c of wanted) { if (source[p] !== c) fail(); p++; }
  };
  const string = () => {
    space(); const start = p; symbol('"');
    while (p < source.length) {
      const c = source[p++] ?? '';
      if (c === '"') {
        try { JSON.parse(source.slice(start, p)); } catch { throw 'syntax'; }
        return;
      }
      if (c.charCodeAt(0) < 32) throw 'syntax';
      if (c === '\\') {
        if (p >= source.length) fail();
        const escaped = source[p++] ?? '';
        if (escaped === 'u') for (let i = 0; i < 4; i++) {
          if (p >= source.length) fail();
          if (!/[0-9a-f]/i.test(source[p++] ?? '')) throw 'syntax';
        }
        else if (!'"\\/bfnrt'.includes(escaped)) throw 'syntax';
      }
    }
    fail();
  };
  const array = (read: () => void, max: number) => {
    symbol('['); space(); if (source[p] === ']') { p++; return; }
    let count = 0;
    while (true) {
      if (++count > max) throw 'limit';
      read(); space(); if (source[p] === ']') { p++; return; }
      symbol(',');
    }
  };
  const section = () => {
    if (++sectionCount > 24) throw 'limit';
    space(); const start = p;
    while (/[A-Za-z]/.test(source[p] ?? '') && p < source.length) p++;
    const name = source.slice(start, p);
    if (!Object.hasOwn(OPENUI_SCHEMAS, name)) {
      if (p === source.length && Object.keys(OPENUI_SCHEMAS).some(n => n.startsWith(name))) throw 'incomplete';
      throw 'syntax';
    }
    symbol('('); string();
    if (name !== 'Text') { symbol(','); if (name === 'Notice') string(); else array(string, 40); }
    symbol(')');
  };
  symbol('root'); symbol('='); symbol('Answer'); symbol('('); array(section, 24); symbol(')'); space();
  if (p !== source.length) throw 'syntax';
  return true;
}

function project(sections: Section[]): string {
  return sections.map(s => {
    if (s.typeName === 'Text') return s.props.markdown as string;
    const title = s.props.title as string;
    if (s.typeName === 'Notice') return [title, s.props.markdown].filter(Boolean).join('\n\n');
    const list = (s.props.items as string[]).map((item, i) =>
      `${s.typeName === 'Steps' ? `${i + 1}.` : '-'} ${item.replace(/\n/g, '\n  ')}`);
    return [title, list.join('\n')].filter(Boolean).join('\n\n');
  }).filter(Boolean).join('\n\n');
}

export function parseOpenUi(source: string, isStreaming = false): OpenUiResult {
  if (typeof source !== 'string' || source.length > OPENUI_SOURCE_LIMIT)
    return { state: 'invalid', source: '', text: '', sections: [], reason: 'limit' };
  // Allow a single model fence around the entire program, never mixed prose/code.
  let cleaned = source.trim();
  let fenceIncomplete = false;
  const fence = /^```(?:openui-lang|openui)?[^\S\n]*\n/.exec(cleaned);
  if (fence) {
    cleaned = cleaned.slice(fence[0].length);
    if (/\n```\s*$/.test(cleaned)) cleaned = cleaned.replace(/\n```\s*$/, '');
    else fenceIncomplete = true;
  }
  let incomplete = false;
  try { literalGate(cleaned); } catch (reason) {
    if (reason !== 'incomplete') return { state: 'invalid', source: '', text: openUiPlainTextFallback(source), sections: [], reason: reason === 'limit' ? 'limit' : 'syntax' };
    incomplete = true;
  }
  try {
    const result = parser.parse(cleaned);
    const root = result.root;
    const sections: Section[] = [];
    const prefixIncomplete = incomplete || fenceIncomplete || result.meta.incomplete;
    // The literal gate already proves this is a prefix of our sole allowed grammar.
    // The tolerant SDK can temporarily call an unfinished component name unknown.
    const terminalErrors = isStreaming && prefixIncomplete ? [] : result.meta.errors;
    let invalid = !!terminalErrors.length || (!(isStreaming && prefixIncomplete) &&
      (!!result.meta.unresolved.length || !!result.meta.orphaned.length)) ||
      !!result.queryStatements.length || !!result.mutationStatements.length || !!Object.keys(result.stateDeclarations).length;
    const unsafeRoot = !!root && (root.typeName !== 'Answer' || !!root.hasDynamicProps);
    if (unsafeRoot && !(isStreaming && prefixIncomplete)) invalid = true;
    for (const child of (root?.props.sections ?? []) as unknown[]) {
      if (!child || typeof child !== 'object') { invalid = true; continue; }
      const node = child as Section & { hasDynamicProps?: boolean };
      if (!Object.hasOwn(OPENUI_SCHEMAS, node.typeName) || node.hasDynamicProps) {
        if (!(isStreaming && prefixIncomplete)) invalid = true;
        continue;
      }
      const safe = OPENUI_SCHEMAS[node.typeName].safeParse(node.props);
      if (!safe.success) { if (!(isStreaming && prefixIncomplete)) invalid = true; continue; }
      sections.push({ typeName: node.typeName, props: safe.data });
    }
    const text = project(sections);
    const partial = incomplete || fenceIncomplete || result.meta.incomplete;
    const valid = !!root && sections.length > 0 && text.trim().length > 0 && !invalid && !partial;
    return { state: valid ? 'valid' : isStreaming && !invalid ? 'streaming' : 'invalid',
      source: invalid || !root || unsafeRoot ? '' : cleaned, text, sections,
      ...(!valid ? { reason: partial ? 'incomplete' as const : 'schema' as const } : {}) };
  } catch { return { state: isStreaming && incomplete ? 'streaming' : 'invalid', source: '', text: '', sections: [], reason: incomplete ? 'incomplete' : 'syntax' }; }
}

export const TEXT_STYLE_INSTRUCTIONS = '\nDarstellung: Kurze Schlüsselbegriffe oder Feldnamen bei Bedarf sparsam **fett** hervorheben. Kurze Einordnungen können *kursiv* sein. Listen nur, wenn sie helfen; keine ganzen Antworten hervorheben. Fakten-, Sicherheitsregeln und die gewählte Persona haben Vorrang.';
// The SDK's general-purpose prompt recommends references and hoisting, whereas
// this deliberately static catalogue accepts only one literal inline statement.
// Use the exact bounded wire grammar, never contradictory general SDK advice.
export const OPENUI_INSTRUCTIONS = [
  'Behalte die gewählte Persona, Sprache sowie alle vorhandenen Fakten- und Sicherheitsregeln bei. Die folgende Anweisung ändert ausschließlich die Antwortdarstellung in OpenUI Lang.',
  'Antwortformat OpenUI, Katalog pflege-openui-v1: Gib ausschließlich ein vollständiges Programm root = Answer([...]) aus. Verwende die Komponenten inline; keine zusätzlichen Statements, Referenzen, Aktionen, Queries, Mutationen, Variablen oder Ausdrücke.',
  'Exakte positionsbasierte Signaturen:',
  'Answer(sections: (Text | Facts | Steps | Notice)[]) — vollständige Antwort aus den Abschnitten in ihrer Reihenfolge.',
  'Text(markdown: string) — lesbarer Textabschnitt.',
  'Facts(title: string, items: string[]) — sachliche Stichpunkte aus dem vorhandenen Kontext; keine unabhängige Prüfung.',
  'Steps(title: string, items: string[]) — geordnete nächste Schritte; keine Behauptung ausgeführter Aktionen.',
  'Notice(title: string, markdown: string) — Einordnung, notwendiger Hinweis oder Unsicherheit.',
  'Jeder Textwert ist ein JSON-Stringliteral. Höchstens 24 Abschnitte, höchstens 40 Einträge je Liste. Keine freie Prosa oder Markdown-Codeblöcke außerhalb der Stringliterale.',
  'Alle Informationen und Unsicherheiten gehören in die Abschnitte. Die Textansicht wird vollständig aus denselben Abschnitten abgeleitet. Keine zweite Antwort oder erfundenen Daten, Fristen oder erfolgten Aktionen.',
  'Markdown mit **fett** und *kursiv* ist ausschließlich innerhalb der Stringliterale erlaubt.',
  'Nur Syntaxbeispiel, kein vorgegebener Sachinhalt: root = Answer([Text("**Antrag** prüfen."), Facts("Bekannt", ["Pflegegrad aus dem Kontext"]), Steps("Nächste Schritte", ["Unterlagen prüfen"]), Notice("Einordnung", "*Eine Frist ist noch nicht bestätigt.*")])',
].join('\n') + TEXT_STYLE_INSTRUCTIONS;
