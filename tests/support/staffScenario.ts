/** Mehrere fiktive Fälle für reine Layoutprüfungen. Kein Import aus Produktcode, keine KI-Nutzung. */
import type { SeedState } from './seed';

export function staffScenario(state: SeedState, now = Date.now()) {
  const person = state.people[0];
  const task = state.tasks[0];
  const conversation = state.conversations[0];
  if (!person || !task || !conversation) throw new Error('Prüfbestand fehlt');
  const day = 86_400_000;
  const names = ['Martha Beispielwald', 'Hildegard Friederike von Sonnenberg-Wiesenthal-Hohenstein', 'Jo Li', 'Rashid Fichtenau', 'Elena Berggarten', 'Paul Lindenhof'];
  const titles = ['Widerspruch mit Beratungsstelle prüfen', 'Hilfsmittelversorgung mit Pflegekasse und zuständigem Sanitätshaus abstimmen', 'Erstgespräch vorbereiten', 'Vertretung für November planen', 'Pflegetagebuch gemeinsam durchsehen', 'Rückruf der Pflegeberatung vorbereiten'];
  const prior = ['urgent', 'high', 'normal', 'normal', 'low', 'normal'] as const;
  state.people = names.map((name, i) => ({ ...person, id: i === 0 ? person.id : `61000000-0000-4000-8000-00000000000${i}`, name: `${name} · fiktiv`, care_grade: i === 2 ? 0 : i % 5 + 1, insurerName: i === 2 ? null : `Pflegekasse ${['Beispielwald', 'Lindenhöhe', 'Fichtenhain'][i % 3]} · fiktiv`, summary: 'Fiktiver Fall für die Ansicht des Sachbearbeiters. Angehörige organisieren Termine und sammeln Unterlagen. Keine echte Rechtsfrist und keine medizinische Empfehlung.' }));
  state.tasks = state.people.flatMap((p, i) => [
    { ...task, id: `62000000-0000-4000-8000-0000000000${i}0`, care_recipient_id: p.id, title: titles[i] ?? 'Gespräch vorbereiten', due_at: i === 2 ? null : new Date(now + (i - 1) * day).toISOString(), priority: prior[i] ?? 'normal' },
    { ...task, id: `62000000-0000-4000-8000-0000000000${i}1`, care_recipient_id: p.id, title: 'Unterlagen und nächste Schritte ordnen', due_at: new Date(now + (i + 8) * day).toISOString(), priority: 'normal' },
  ]);
  state.conversations = state.people.flatMap((p, i) => Array.from({ length: (i % 3) + 1 }, (_, j) => ({ ...conversation, id: `63000000-0000-4000-8000-0000000000${i}${j}`, care_recipient_id: p.id, title: `${j ? 'Fragen für die Beratung sammeln' : 'Nächste Schritte besprechen'} · fiktives Beispiel`, created_at: new Date(now - (i + j) * day).toISOString(), archived_at: j === 2 ? new Date(now - day).toISOString() : null })));
  state.messages = [];
}
