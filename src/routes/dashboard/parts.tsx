import { Link } from '@tanstack/react-router';
import type { CSSProperties, ReactNode } from 'react';
import { DOC_STATUS_LABEL, isUrgent } from '../../data/model';
import { baseName, daysUntil, formatShortDate, initials } from '../../lib/format';
import type { CareRecipient, DocumentRow, TaskRow } from '../../services/types';
import '../../styles/overview.css';

/*
 * Bausteine der leichten Tabelle (Studio V2, Vorbild Service OALab `workspace/table.css`, `list.css`):
 * Statussymbol 14 px, Personenpunkt, leiser Chip, Fälligkeit mit tabellarischen Ziffern, ruhiges Segment.
 * Farbe nur mit Bedeutung: Person (Punkt), überfällig (Fehler-Rot), dringend (rotes Quadrat).
 */

/** Wasserfall-Index für Kinder eines `fx-fall`-Containers (Bewegung baut `src/motion/motion.css`). */
export const fall = (i: number) => ({ '--i': i }) as CSSProperties;

const PERSON_COLORS = 6;

/** Feste Personenfarbe nach Reihenfolge der Personenliste; „Allgemein“ bleibt grau. */
export function personHue(id: string | null, people: readonly CareRecipient[]): string | null {
  const i = id ? people.findIndex((p) => p.id === id) : -1;
  return i < 0 ? null : `var(--lt-p${i % PERSON_COLORS})`;
}

export function PersonDot({ id, people, full = false }: { id: string | null; people: readonly CareRecipient[]; full?: boolean }) {
  const person = id ? people.find((p) => p.id === id) : undefined;
  const hue = personHue(id, people);
  const name = person ? baseName(person.name) : 'Allgemein';
  return (
    <span className="lt-person" title={name}>
      <i className={hue ? '' : 'is-none'} style={hue ? ({ '--pc': hue } as CSSProperties) : undefined} aria-hidden="true" />
      <span>{full ? name : (name.split(' ')[0] ?? name)}</span>
    </span>
  );
}

export function PersonAvatar({ id, people }: { id: string; people: readonly CareRecipient[] }) {
  const person = people.find((p) => p.id === id);
  const hue = personHue(id, people);
  return (
    <span className="lt-av" style={hue ? ({ '--pc': hue } as CSSProperties) : undefined} aria-hidden="true">
      {initials(person?.name ?? '?')}
    </span>
  );
}

type Status = 'backlog' | 'todo' | 'progress' | 'review' | 'done';

/** Linear-Statussymbole (viewBox 14). */
export function StatusIcon({ status, label }: { status: Status; label?: string }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <svg className={`lt-st st-${status}`} viewBox="0 0 14 14" width="14" height="14" {...a11y}>
      {status === 'done' ? (
        <>
          <circle cx="7" cy="7" r="6.2" className="fill" />
          <path d="M4.4 7.2 6.2 9 9.6 5.3" className="tick" />
        </>
      ) : (
        <>
          <circle cx="7" cy="7" r="5.4" className={`ring ${status === 'backlog' ? 'dash' : ''}`} />
          {status === 'progress' ? <path d="M7 3.4A3.6 3.6 0 0 1 7 10.6Z" className="fill" /> : null}
          {status === 'review' ? <path d="M7 3.4A3.6 3.6 0 1 1 3.4 7L7 7Z" className="fill" /> : null}
        </>
      )}
    </svg>
  );
}

export const taskStatus = (t: TaskRow): Status => (t.status === 'in_progress' ? 'progress' : 'todo');
export const taskStatusLabel = (t: TaskRow) => (t.status === 'in_progress' ? 'In Bearbeitung' : 'Offen');
export const docStatus = (d: DocumentRow): Status => (d.status === 'sent' ? 'done' : d.status === 'reviewed' ? 'review' : 'backlog');

const PRIO_LABEL: Record<TaskRow['priority'], string> = { urgent: 'Dringend', high: 'Hoch', normal: 'Normal', low: 'Niedrig' };

/** Priorität: drei Balken, dringend als rotes Quadrat mit „!“. */
export function PrioIcon({ priority }: { priority: TaskRow['priority'] }) {
  const label = `Priorität: ${PRIO_LABEL[priority]}`;
  if (priority === 'urgent') {
    return (
      <svg className="lt-prio is-urgent" viewBox="0 0 14 14" width="14" height="14" role="img" aria-label={label}>
        <rect x="1" y="1" width="12" height="12" rx="3" />
        <path d="M7 3.8v3.9M7 9.7v.4" />
      </svg>
    );
  }
  const on = priority === 'high' ? 3 : priority === 'normal' ? 2 : 1;
  return (
    <svg className="lt-prio" viewBox="0 0 14 14" width="14" height="14" role="img" aria-label={label}>
      {[4.5, 7.5, 10.5].map((h, i) => (
        <rect key={h} x={1.5 + i * 4} y={12 - h} width="2.6" height={h} rx="0.8" className={i < on ? 'on' : ''} />
      ))}
    </svg>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="lt-chip">{children}</span>;
}

export const taskKind = (t: TaskRow) => (t.kind === 'handover' ? 'Übergabe' : t.due_at && t.deadline_source ? 'Frist' : 'Aufgabe');

function shortRel(days: number): string {
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === -1) return 'seit gestern';
  if (days < 0) return `seit ${-days} Tagen`;
  return `in ${days} Tagen`;
}

/** Fälligkeit: Datum tabellarisch, daneben wie lange; überfällig in Fehler-Rot. */
export function Due({ task, now }: { task: TaskRow; now: Date }) {
  if (!task.due_at) return <span className="lt-due is-none">ohne Termin</span>;
  const days = daysUntil(task.due_at, now);
  const tone = days < 0 ? 'is-over' : isUrgent(task, days) && days <= 3 ? 'is-soon' : '';
  return (
    <span className={`lt-due ${tone}`}>
      <span className="lt-due-date">{formatShortDate(task.due_at)}</span>
      <span className="lt-due-rel">
        {days < 0 ? <span className="sr-only">überfällig </span> : null}
        {shortRel(days)}
      </span>
    </span>
  );
}

/** Aufgabenzeile 40 px. In der Übersicht ein Link zur Aufgabenseite, dort eine ruhige Zeile mit Quelle. */
export function TaskLine({ task, people, now, link = false, source = false, style }: {
  task: TaskRow; people: readonly CareRecipient[]; now: Date; link?: boolean; source?: boolean; style?: CSSProperties;
}) {
  const days = task.due_at ? daysUntil(task.due_at, now) : null;
  const cells = (
    <>
      <StatusIcon status={taskStatus(task)} label={taskStatusLabel(task)} />
      <PrioIcon priority={task.priority} />
      <span className="lt-title">{task.title}</span>
      <PersonDot id={task.care_recipient_id} people={people} />
      <span className="lt-kind"><Chip>{taskKind(task)}</Chip></span>
      {source ? <span className="lt-src" title={task.deadline_source ?? undefined}>{task.deadline_source ?? '—'}</span> : null}
      <Due task={task} now={now} />
      {isUrgent(task, days) ? <span className="sr-only">dringend</span> : null}
    </>
  );
  return (
    <li className={`lt-li ${source ? 'has-src' : ''}`} style={style}>
      {link ? <Link to="/aufgaben" className="lt-row is-link">{cells}</Link> : <div className="lt-row">{cells}</div>}
    </li>
  );
}

export function DocStatus({ status }: { status: DocumentRow['status'] }) {
  return (
    <span className={`lt-docst is-${status}`}>
      <StatusIcon status={status === 'sent' ? 'done' : status === 'reviewed' ? 'review' : 'backlog'} />
      {DOC_STATUS_LABEL[status]}
    </span>
  );
}

/** Ruhiges Segment (2–4 gleichrangige Filter), ohne gleitende Tinte. */
export function Seg<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (next: T) => void;
}) {
  return (
    <div className="lt-seg" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => { if (id !== value) onChange(id); }}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** Laden: fünf Shimmer-Zeilen in Tabellenhöhe. */
export function SkeletonRows({ rows = 5, label = 'Wird geladen …' }: { rows?: number; label?: string }) {
  return (
    <div className="lt-sk-wrap" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="lt-sk-row" aria-hidden="true">
          <span className="sk dot" />
          <span className="sk" style={{ width: `${62 - ((i * 13) % 30)}%` }} />
          <span className="sk short" />
        </div>
      ))}
    </div>
  );
}

/** Leerzustand als eine ruhige Zeile; Häkchen nur, wenn „leer“ wirklich „erledigt“ heißt. */
export function EmptyRow({ title, children, done = false }: { title: string; children?: ReactNode; done?: boolean }) {
  return (
    <div className="lt-empty">
      {done ? <StatusIcon status="done" /> : null}
      <strong>{title}</strong>
      {children ? <span>{children}</span> : null}
    </div>
  );
}

export function PanelHead({ id, title, count, children }: { id: string; title: string; count?: ReactNode; children?: ReactNode }) {
  return (
    <header className="lt-head">
      <h2 id={id}>{title}</h2>
      {count !== undefined && count !== null ? <span className="lt-count">{count}</span> : null}
      {children ? <div className="lt-acts">{children}</div> : null}
    </header>
  );
}
