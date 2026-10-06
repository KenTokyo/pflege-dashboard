import type { Json } from '../../types/database.types';
import type {
  AgentSettingsView,
  CareRecipient,
  ConversationRow,
  DocumentRow,
  Enums,
  MessageRow,
  ModelRow,
  TaskRow,
} from '../services/types';

const PRIORITY_RANK: Record<Enums['task_priority'], number> = { urgent: 0, high: 1, normal: 2, low: 3 };

/** Dringlichkeit: früheste Fälligkeit zuerst, ohne Termin zuletzt; bei gleichem Tag höhere Priorität zuerst. */
export function sortTasks(tasks: readonly TaskRow[]): TaskRow[] {
  return [...tasks].sort((a, b) => {
    const da = a.due_at ? Date.parse(a.due_at) : Number.POSITIVE_INFINITY;
    const db = b.due_at ? Date.parse(b.due_at) : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    const pa = PRIORITY_RANK[a.priority];
    const pb = PRIORITY_RANK[b.priority];
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title, 'de');
  });
}

export function nextTaskFor(recipientId: string, sorted: readonly TaskRow[]): TaskRow | null {
  return sorted.find((t) => t.care_recipient_id === recipientId && t.due_at !== null) ?? null;
}

export function isUrgent(task: TaskRow, daysLeft: number | null): boolean {
  return task.priority === 'urgent' || task.priority === 'high' || (daysLeft !== null && daysLeft <= 3);
}

export type EffectiveModel =
  | { usable: true; model: ModelRow }
  | { usable: false; model: ModelRow | null; reason: 'none' | 'disabled' | 'not_operational' };

/** Effektives Modell laut Vertrag: Gesprächs-Override, sonst Standard des Arbeitsbereichs. */
export function effectiveModel(
  conversation: Pick<ConversationRow, 'model_override_id'> | null,
  settings: AgentSettingsView | null,
  models: readonly ModelRow[],
): EffectiveModel {
  const id = conversation?.model_override_id ?? settings?.version.default_model_id ?? null;
  const model = id ? (models.find((m) => m.id === id) ?? null) : null;
  if (!model) return { usable: false, model: null, reason: 'none' };
  if (!model.enabled) return { usable: false, model, reason: 'disabled' };
  if (model.status !== 'operational') return { usable: false, model, reason: 'not_operational' };
  return { usable: true, model };
}

export type MessageModel = {
  displayName: string;
  region: 'eu' | 'us' | 'unverified';
  /** Vom Anbieter gemeldete Modell-ID der tatsächlichen Antwort (messages.provider_response_model). */
  responseModel?: string;
};

const isRecord = (v: Json | undefined): v is { [key: string]: Json | undefined } =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Unveränderlicher Modell-Snapshot einer Antwort (messages.model_snapshot). */
export function messageModel(message: Pick<MessageRow, 'model_snapshot' | 'provider_response_model'>): MessageModel | null {
  const snap = message.model_snapshot;
  if (!isRecord(snap)) return null;
  const name = snap.displayName ?? snap.display_name;
  const region = snap.region ?? snap.hosting_region;
  if (typeof name !== 'string' || !name) return null;
  const responseModel = message.provider_response_model?.trim();
  return {
    displayName: name,
    region: region === 'eu' || region === 'us' ? region : 'unverified',
    ...(responseModel ? { responseModel } : {}),
  };
}

export type Source = { title: string; url: string | null };

export function messageSources(message: Pick<MessageRow, 'sources'>): Source[] {
  const list = Array.isArray(message.sources) ? message.sources : [];
  const out: Source[] = [];
  for (const item of list) {
    if (!isRecord(item) || typeof item.title !== 'string' || !item.title) continue;
    const url = typeof item.url === 'string' && /^https:\/\//.test(item.url) ? item.url : null;
    out.push({ title: item.title, url });
  }
  return out;
}

export const DOC_STATUS_LABEL: Record<Enums['document_status'], string> = {
  draft: 'Entwurf',
  reviewed: 'Geprüft',
  sent: 'Versendet',
};

export const DOC_KIND_LABEL: Record<Enums['document_kind'], string> = {
  letter: 'Brief',
  application: 'Antrag',
  objection: 'Widerspruch',
  respite: 'Verhinderungspflege',
  relief: 'Entlastungsbetrag',
};

export const MODE_LABEL: Record<Enums['agent_mode'], string> = {
  answer_only: 'Nur Auskunft',
  create: 'Auskunft + Erstellen',
};

export const REGION_LABEL: Record<'eu' | 'us' | 'unverified', string> = {
  eu: 'EU',
  us: 'US',
  unverified: 'Region ungeprüft',
};

export function recipientName(id: string | null, people: readonly CareRecipient[]): string | null {
  if (!id) return null;
  return people.find((p) => p.id === id)?.name ?? null;
}

export function filterConversations(list: readonly ConversationRow[], query: string, people: readonly CareRecipient[]) {
  const q = query.trim().toLocaleLowerCase('de');
  if (!q) return [...list];
  return list.filter((c) => {
    const person = recipientName(c.care_recipient_id, people) ?? '';
    return c.title.toLocaleLowerCase('de').includes(q) || person.toLocaleLowerCase('de').includes(q);
  });
}

export function documentStatusCounts(docs: readonly DocumentRow[]) {
  return docs.reduce<Record<Enums['document_status'], number>>(
    (acc, d) => ({ ...acc, [d.status]: acc[d.status] + 1 }),
    { draft: 0, reviewed: 0, sent: 0 },
  );
}

/** Titel für ein neues Gespräch aus der ersten Frage: gekürzt, 1–120 Zeichen. */
export function titleFromQuestion(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Neues Gespräch';
  return clean.length <= 60 ? clean : `${clean.slice(0, 57).trimEnd()} …`;
}

const ROLE_RANK: Record<string, number> = { system: 0, user: 1, assistant: 2 };

/**
 * Verlauf in Lesereihenfolge. Der Server legt Frage und Antwort einer Anfrage mit demselben Zeitstempel an;
 * die zufällige UUID darf dann nicht entscheiden. Deshalb wie im Backend (Migration phase1_context_order):
 * Zeit, dann Anfrage (`client_request_id`, sonst eigene ID), dann Rolle (Frage vor Antwort), dann ID.
 * So bleiben bei gleichem Zeitstempel ganze Paare zusammen.
 * Zusätzlich steht eine Antwort immer direkt hinter der Frage mit derselben client_request_id,
 * auch wenn ihr Zeitstempel (Uhrabweichung) davor liegt.
 */
export function orderMessages(list: readonly MessageRow[]): MessageRow[] {
  const sorted = [...list].sort((a, b) => {
    const t = Date.parse(a.created_at) - Date.parse(b.created_at);
    if (t) return t;
    const ka = a.client_request_id ?? a.id;
    const kb = b.client_request_id ?? b.id;
    if (ka !== kb) return ka < kb ? -1 : 1;
    const r = (ROLE_RANK[a.role] ?? 3) - (ROLE_RANK[b.role] ?? 3);
    if (r) return r;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const questions = new Set(sorted.filter((m) => m.role === 'user' && m.client_request_id).map((m) => m.client_request_id));
  const deferred = new Map<string, MessageRow[]>();
  const out: MessageRow[] = [];
  const emitted = new Set<string>();
  for (const m of sorted) {
    const rid = m.client_request_id;
    if (m.role === 'assistant' && rid && questions.has(rid) && !emitted.has(rid)) {
      deferred.set(rid, [...(deferred.get(rid) ?? []), m]);
      continue;
    }
    out.push(m);
    if (m.role === 'user' && rid) {
      emitted.add(rid);
      out.push(...(deferred.get(rid) ?? []));
      deferred.delete(rid);
    }
  }
  return out;
}
