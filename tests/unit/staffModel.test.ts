import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTER, parseFilterRequest, selectPeople, selectTasks } from '../../src/staff/model';
import { createSeed, MARTHA } from '../support/seed';

const now = new Date('2026-10-07T10:00:00Z');
const seed = createSeed();
const martha = seed.people[0];
const base = seed.tasks[0];
if (!martha || !base) throw new Error('Testbestand fehlt');
const people = [martha, { ...martha, id: 'person-2', name: 'Jonas Beispielwald · fiktiv' }, { ...martha, id: 'person-3', name: 'Martha Fichtenau · fiktiv' }];

describe('Sachbearbeitung: echte Datensätze filtern', () => {
  it('ordentliche Terminfolge, ohne Frist zuletzt, geschlossene Aufgaben nie offen', () => {
    const rows = [
      { ...base, id: 'no-date', due_at: null, priority: 'urgent' as const },
      { ...base, id: 'late', due_at: '2026-10-20T10:00:00Z' },
      { ...base, id: 'soon', due_at: '2026-10-08T10:00:00Z' },
      { ...base, id: 'closed', due_at: '2026-10-01T10:00:00Z', status: 'done' as const },
    ];
    expect(selectTasks(rows, DEFAULT_FILTER, now).map((t) => t.id)).toEqual(['soon', 'late', 'no-date']);
    expect(selectTasks(rows, { ...DEFAULT_FILTER, sort: 'priority' }, now).map((t) => t.id)).toEqual(['no-date', 'soon', 'late']);
    expect(selectTasks(rows, { ...DEFAULT_FILTER, urgentOnly: true }, now).map((t) => t.id)).toEqual(['soon', 'no-date']);
    expect(rows[0]?.id).toBe('no-date');
  });

  it('Person und Dringlichkeit gemeinsam; Gesprächsrang aus gelieferten Counts', () => {
    const tasks = [{ ...base, care_recipient_id: MARTHA, priority: 'urgent' as const }, { ...base, id: 'other', care_recipient_id: 'person-2', due_at: null }];
    expect(selectPeople(people, tasks, new Map([[MARTHA, 2], ['person-2', 7]]), { ...DEFAULT_FILTER, sort: 'conversations' }, now).map((p) => p.id)).toEqual(['person-2', MARTHA, 'person-3']);
    expect(selectPeople(people, tasks, new Map(), { ...DEFAULT_FILTER, urgentOnly: true }, now).map((p) => p.id)).toEqual([MARTHA]);
    expect(selectTasks(tasks, { ...DEFAULT_FILTER, personId: 'person-2' }, now)).toHaveLength(1);
  });

  it('vollständiger Name vor mehrdeutigem Vornamen, Umlaute und Sortierung', () => {
    expect(parseFilterRequest('Daten zu Martha Beispielwald nach Priorität', people)).toMatchObject({ ok: true, filter: { personId: MARTHA, sort: 'priority', view: 'cases' } });
    expect(parseFilterRequest('Offene Aufgaben nach Frist', people)).toMatchObject({ ok: true, filter: { sort: 'deadline', view: 'tasks' } });
    expect(parseFilterRequest('Alle Fälle nach Gesprächszahl', people)).toMatchObject({ ok: true, filter: { sort: 'conversations', view: 'cases' } });
    expect(parseFilterRequest('Martha nach Frist', people)).toMatchObject({ ok: false });
  });

  it('unbekannte Person, Schreibbefehle, freie Fragen und Code werden nicht ausgeführt', () => {
    for (const request of ['Daten zu Peter nach Frist', 'Lösche alle Aufgaben', 'Erstelle Aufgaben für Martha Beispielwald', '<script>alert(1)</script>', 'Wie hoch ist das Pflegegeld?', '']) {
      expect(parseFilterRequest(request, people)).toMatchObject({ ok: false });
    }
  });

  it('leere Daten ergeben leere Listen, keine synthetischen Fälle', () => {
    expect(selectPeople([], [], new Map(), DEFAULT_FILTER, now)).toEqual([]);
    expect(selectTasks([], DEFAULT_FILTER, now)).toEqual([]);
  });
});
