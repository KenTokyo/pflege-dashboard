import { baseName, daysUntil } from '../lib/format';
import type { CareRecipient, TaskRow } from '../services/types';

export const STAFF_SORTS = ['deadline', 'priority', 'conversations', 'name'] as const;
export type StaffSort = (typeof STAFF_SORTS)[number];
export const STAFF_VIEWS = ['cases', 'tasks'] as const;
export type StaffView = (typeof STAFF_VIEWS)[number];
export type StaffFilter = { personId: string; urgentOnly: boolean; sort: StaffSort; view: StaffView };
export const DEFAULT_FILTER: StaffFilter = { personId: '', urgentOnly: false, sort: 'deadline', view: 'cases' };
export const PRIORITY: Record<TaskRow['priority'], number> = { urgent: 0, high: 1, normal: 2, low: 3 };
export const PRIORITY_LABEL: Record<TaskRow['priority'], string> = { urgent: 'Dringend', high: 'Hoch', normal: 'Normal', low: 'Niedrig' };

export function needsAttention(task: TaskRow, now: Date): boolean {
  return task.priority === 'urgent' || task.priority === 'high' || (task.due_at !== null && daysUntil(task.due_at, now) <= 3);
}

export function compareDeadline(a: TaskRow, b: TaskRow): number {
  const aa = a.due_at ? Date.parse(a.due_at) : Infinity;
  const bb = b.due_at ? Date.parse(b.due_at) : Infinity;
  return (aa === bb ? 0 : aa - bb) || PRIORITY[a.priority] - PRIORITY[b.priority] || a.title.localeCompare(b.title, 'de');
}

export function selectTasks(tasks: readonly TaskRow[], filter: StaffFilter, now: Date): TaskRow[] {
  return tasks.filter((t) => (t.status === 'open' || t.status === 'in_progress') && (!filter.personId || t.care_recipient_id === filter.personId)
    && (!filter.urgentOnly || needsAttention(t, now))).sort((a, b) =>
    (filter.sort === 'priority' ? PRIORITY[a.priority] - PRIORITY[b.priority] : 0) || compareDeadline(a, b));
}

export function selectPeople(people: readonly CareRecipient[], tasks: readonly TaskRow[], counts: ReadonlyMap<string, number>, filter: StaffFilter, now: Date): CareRecipient[] {
  const open = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const byPerson = new Map<string, TaskRow[]>();
  for (const task of open) {
    if (!task.care_recipient_id) continue;
    const list = byPerson.get(task.care_recipient_id) ?? [];
    list.push(task);
    byPerson.set(task.care_recipient_id, list);
  }
  for (const list of byPerson.values()) list.sort(compareDeadline);
  const deadline = (id: string) => { const t = byPerson.get(id)?.[0]; return t?.due_at ? Date.parse(t.due_at) : Infinity; };
  const priority = (id: string) => Math.min(...(byPerson.get(id) ?? []).map((t) => PRIORITY[t.priority]), Infinity);
  return people.filter((p) => (!filter.personId || p.id === filter.personId) && (!filter.urgentOnly || byPerson.get(p.id)?.some((t) => needsAttention(t, now))))
    .sort((a, b) => {
      if (filter.sort === 'conversations') return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'de');
      const av = filter.sort === 'priority' ? priority(a.id) : deadline(a.id);
      const bv = filter.sort === 'priority' ? priority(b.id) : deadline(b.id);
      return (filter.sort !== 'name' && av !== bv ? av - bv : 0) || a.name.localeCompare(b.name, 'de');
    });
}

const normalize = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ß/g, 'ss');

/** Ausschließlich lokale Filtergrammatik. Kein Modell, kein HTML und keine Codeausführung. */
export function parseFilterRequest(input: string, people: readonly CareRecipient[]): { ok: true; filter: StaffFilter; summary: string } | { ok: false; message: string } {
  const q = normalize(input.trim());
  if (!q) return { ok: false, message: 'Geben Sie eine Person, offene Aufgaben oder alle Fälle an.' };
  const words: string[] = q.match(/[\p{L}\p{N}]+/gu) ?? [];
  const exact = people.filter((p) => q.includes(normalize(baseName(p.name))));
  const matches = exact.length ? exact : people.filter((p) => normalize(baseName(p.name)).split(/\s+/).some((word) => word.length > 2 && words.includes(word)));
  if (matches.length > 1) return { ok: false, message: 'Mehrere Personen passen. Wählen Sie die Person bitte im Feld „Person“ aus.' };
  const person = matches[0];
  if (!person && /\b(person|daten zu|daten von|fur|zu|von)\b/.test(q)) return { ok: false, message: 'Diese Person wurde nicht eindeutig erkannt. Wählen Sie eine gespeicherte Person oder „Alle Fälle“.' };
  const known = person || /\b(aufgaben|falle|fristen|gesprache|prioritat)\b/.test(q);
  if (!known) return { ok: false, message: 'Hier können Sie Fälle oder offene Aufgaben nach Frist, Priorität, Name oder Gesprächszahl ordnen. Freie Fragen beantwortet „KI fragen“.' };
  if (/\b(losch|erstell|versend|schick|ander|schreib|export|berechn|abschlie|erledig)/.test(q)) return { ok: false, message: 'Die Filteranfrage ordnet vorhandene Daten. Sie erstellt, ändert und versendet nichts.' };
  const sort: StaffSort = /prioritat/.test(q) ? 'priority' : /gesprach|chat/.test(q) ? 'conversations' : /name|alphabet/.test(q) ? 'name' : 'deadline';
  const view: StaffView = /aufgaben|fristen/.test(q) && sort !== 'conversations' ? 'tasks' : 'cases';
  const filter: StaffFilter = { personId: person?.id ?? '', urgentOnly: /dringend|eilig/.test(q), sort, view };
  const order = { deadline: 'Frist', priority: 'Priorität', conversations: 'Gesprächszahl', name: 'Name' }[sort];
  return { ok: true, filter, summary: `${view === 'tasks' ? 'Offene Aufgaben' : 'Fälle'} · ${person ? baseName(person.name) : 'alle Personen'} · nach ${order}${filter.urgentOnly ? ' · nur dringend' : ''}` };
}
