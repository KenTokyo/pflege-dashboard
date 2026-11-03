import { Link } from '@tanstack/react-router';
import type { CSSProperties, ReactNode } from 'react';
import { NavIcon } from '../../components/NavIcon';
import { DOC_STATUS_LABEL, isUrgent, sortTasks } from '../../data/model';
import { useCareRecipients, useConversations, useDocuments, useOpenTasks } from '../../data/queries';
import { baseName, dayKey, daysUntil } from '../../lib/format';
import type { CareRecipient } from '../../services/types';

/*
 * Wochenplan der Übersicht (Studio Graffiti: Zeit wird ein echter Plan). Spalten: davor Offenes, Mo–Fr, Wochenende,
 * später. Je Eintrag Farbe der Person (nie als Kartenfläche, nur leise getönt), Art als Mono-Chip.
 * Einzeichnungen nur mit Bedeutung: EIN Handkreis um die älteste offene Frist, Lime-Haken hinter versendeten
 * Schreiben (≤ 3), Marker-Strich unter „heute“, ein Tag „KW“. Alles zeichnet sich einmal beim Laden.
 */

const PERSON_HUES = ['--hue-chat', '--hue-tasks', '--hue-settings', '--hue-docs', '--hue-overview', '--hue-rose'] as const;
const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const;
const DAY_MS = 86_400_000;

type Kind = 'task' | 'doc' | 'conv';
type Entry = {
  id: string; kind: Kind; title: string; personId: string | null; day: string;
  overdue: boolean; urgent: boolean; sent: boolean; chip: string; wrap: (children: ReactNode) => ReactNode;
};
type Column = { key: string; label: string; date: string; today: boolean; wide?: boolean; entries: Entry[] };

const addDays = (key: string, n: number) => new Date(Date.parse(`${key}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const shortDay = (key: string) => `${key.slice(8, 10)}.${key.slice(5, 7)}.`;

/** ISO-Kalenderwoche eines Berliner Kalendertags. */
export function isoWeek(key: string): number {
  const thursday = Date.parse(`${addDays(key, 3 - ((new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7))}T12:00:00Z`);
  const year = new Date(thursday).getUTCFullYear();
  return 1 + Math.floor((thursday - Date.UTC(year, 0, 1, 12)) / DAY_MS / 7);
}

/** Handgezogenes Rund-Rechteck: schließt nicht sauber, Linie läuft über den Anfang hinaus. */
function HandRing() {
  return (
    <svg className="wk-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className="wk-ring-path" pathLength={1} vectorEffect="non-scaling-stroke"
        d="M14 6 C 40 3, 72 2, 91 6 C 98 10, 98 30, 97 52 C 97 78, 98 92, 88 96 C 62 99, 32 98, 10 95 C 2 90, 2 70, 3 46 C 3 24, 2 10, 12 5 L 30 3.5" />
    </svg>
  );
}

function Check() {
  return (
    <svg className="wk-check" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M3.5 10.8 L 8 15 L 17 4.6" />
    </svg>
  );
}

function TodayStroke() {
  return (
    <svg className="wk-today-stroke" viewBox="0 0 60 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path pathLength={1} d="M2 5.4 C 14 3.6, 30 6.4, 44 4.2 S 56 3.8, 58 4.6" />
    </svg>
  );
}

function EntryCard({ entry, hue, ring, check }: { entry: Entry; hue: string; ring: boolean; check: boolean }) {
  const icon = entry.kind === 'task' ? 'tasks' : entry.kind === 'doc' ? 'docs' : 'chat';
  return (
    <li className={`wk-entry ${entry.overdue ? 'is-overdue' : ''}`} style={{ '--pc': `var(${hue})` } as CSSProperties}>
      {entry.wrap(<>
        <span className="wk-chip">
          <NavIcon name={icon} size={14} />
          <span className="wk-chip-text">{entry.chip}</span>
        </span>
        <span className="wk-title">
          {entry.title}
          {check ? <><Check /><span className="sr-only">, versendet</span></> : null}
        </span>
      </>)}
      {ring ? <HandRing /> : null}
    </li>
  );
}

export function WeekBand({ now }: { now: Date }) {
  const people = useCareRecipients();
  const tasks = useOpenTasks();
  const docs = useDocuments();
  const conversations = useConversations(false);
  const peopleList: CareRecipient[] = people.data ?? [];

  const today = dayKey(now);
  const monday = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const sunday = addDays(monday, 6);
  const hueOf = (id: string | null) => {
    const i = id ? peopleList.findIndex((p) => p.id === id) : -1;
    return i < 0 ? '--text-muted' : PERSON_HUES[i % PERSON_HUES.length] ?? '--text-muted';
  };
  const who = (id: string | null) => {
    const p = id ? peopleList.find((x) => x.id === id) : undefined;
    return p ? baseName(p.name).split(' ')[0] ?? '' : 'Allgemein';
  };

  const entries: Entry[] = [];
  for (const t of sortTasks(tasks.data ?? [])) {
    if (!t.due_at) continue;
    const days = daysUntil(t.due_at, now);
    entries.push({
      id: t.id, kind: 'task', title: t.title, personId: t.care_recipient_id, day: dayKey(new Date(t.due_at)),
      overdue: days < 0, urgent: isUrgent(t, days), sent: false,
      chip: `${days < 0 ? 'Überfällig' : 'Frist'} · ${who(t.care_recipient_id)}`,
      wrap: (c) => <Link to="/aufgaben" className="wk-card">{c}</Link>,
    });
  }
  for (const d of docs.data ?? []) {
    const day = dayKey(new Date(d.created_at));
    if (day < monday || day > sunday) continue;
    entries.push({
      id: d.id, kind: 'doc', title: d.title, personId: d.care_recipient_id, day, overdue: false, urgent: false,
      sent: d.status === 'sent', chip: `${DOC_STATUS_LABEL[d.status]} · ${who(d.care_recipient_id)}`,
      wrap: (c) => <Link to="/dokumente" hash={`dok-${d.id}`} className="wk-card">{c}</Link>,
    });
  }
  for (const c of conversations.data ?? []) {
    const day = dayKey(new Date(c.created_at));
    if (day < monday || day > sunday) continue;
    entries.push({
      id: c.id, kind: 'conv', title: c.title, personId: c.care_recipient_id, day, overdue: false, urgent: false, sent: false,
      chip: `Gespräch · ${who(c.care_recipient_id)}`,
      wrap: (k) => <Link to="/gespraeche/$conversationId" params={{ conversationId: c.id }} className="wk-card">{k}</Link>,
    });
  }

  const columns: Column[] = [
    { key: 'davor', label: 'Noch offen', date: `vor ${shortDay(monday)}`, today: false, entries: entries.filter((e) => e.day < monday) },
    ...DAY_NAMES.map((label, i) => {
      const key = addDays(monday, i);
      return { key, label, date: shortDay(key), today: key === today, entries: entries.filter((e) => e.day === key) };
    }),
    { key: 'we', label: 'Wochenende', date: `${addDays(monday, 5).slice(8, 10)}.–${sunday.slice(8, 10)}.`, today: today > addDays(monday, 4),
      entries: entries.filter((e) => e.day > addDays(monday, 4) && e.day <= sunday) },
    { key: 'spaeter', label: 'Später', date: `ab ${shortDay(addDays(sunday, 1))}`, today: false, entries: entries.filter((e) => e.day > sunday) },
  ];

  // Genau ein Handkreis: die älteste offene Frist. Höchstens drei Haken: versendete Schreiben.
  const ringId = entries.find((e) => e.kind === 'task' && e.overdue)?.id ?? null;
  const checks = new Set(entries.filter((e) => e.sent).slice(0, 3).map((e) => e.id));
  const overdueCount = entries.filter((e) => e.overdue).length;
  const weekCount = entries.filter((e) => e.day >= monday && e.day <= sunday).length;
  const loading = tasks.isPending || people.isPending;
  const failed = tasks.isError;
  const activePeople = peopleList.filter((p) => entries.some((e) => e.personId === p.id));

  return (
    <section className="card week" aria-labelledby="week-title">
      <header className="wk-head">
        <div className="min-w-0">
          <h2 id="week-title">Diese Woche</h2>
          <p className="small muted">
            {shortDay(monday)}–{shortDay(sunday)} · {weekCount} {weekCount === 1 ? 'Eintrag' : 'Einträge'}
            {overdueCount ? <> · <span className="wk-overdue-count">{overdueCount} noch offen</span></> : null}
          </p>
        </div>
        <ul className="wk-legend" aria-label="Personen">
          {activePeople.map((p) => (
            <li key={p.id} style={{ '--pc': `var(${hueOf(p.id)})` } as CSSProperties}>{baseName(p.name)}</li>
          ))}
        </ul>
        <span className="wk-tag" aria-label={`Kalenderwoche ${isoWeek(today)}`}>KW {isoWeek(today)}</span>
      </header>

      {loading ? (
        <p className="small muted wk-state">Wochenplan wird geladen …</p>
      ) : failed ? (
        <p className="small muted wk-state">Fristen konnten nicht geladen werden. Die Aufgabenliste unten zeigt den Fehler.</p>
      ) : (
        <ol className="wk-grid">
          {columns.map((col) => (
            <li key={col.key} className={`wk-col wk-col-${col.key} ${col.today ? 'is-today' : ''} ${col.entries.length ? '' : 'is-empty'}`}
              aria-label={`${col.label}, ${col.date}${col.today ? ', heute' : ''}`}>
              <div className="wk-day">
                <span className="wk-day-name">
                  {col.label}
                  {col.today && col.key !== 'we' ? <TodayStroke /> : null}
                </span>
                <span className="wk-day-date">{col.today ? 'heute' : col.date}</span>
                <span className="wk-strokes" aria-hidden="true">
                  {[...new Set(col.entries.map((e) => e.personId))].map((id) => (
                    <i key={id ?? 'allg'} style={{ '--pc': `var(${hueOf(id)})` } as CSSProperties} />
                  ))}
                </span>
              </div>
              {col.entries.length ? (
                <ul className="wk-entries">
                  {col.entries.slice(0, 4).map((e) => (
                    <EntryCard key={`${e.kind}-${e.id}`} entry={e} hue={hueOf(e.personId)} ring={e.id === ringId} check={checks.has(e.id)} />
                  ))}
                  {col.entries.length > 4 ? <li className="wk-more">+{col.entries.length - 4} weitere</li> : null}
                </ul>
              ) : (
                <p className="wk-free">frei</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
