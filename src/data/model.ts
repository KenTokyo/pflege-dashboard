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
