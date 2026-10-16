import { baseName, initials } from '../../lib/format';
import type { CareRecipient, TaskRow } from '../../services/types';
import type { StaffOverview } from '../../../types/staff';
import { compareDeadline, PRIORITY_LABEL } from '../../staff/model';
import { Icon } from '../grundlage/Icon';
import { Timeline } from '../grundlage/Timeline';

export function Priority({ value }: { value: TaskRow['priority'] }) {
  return <span className={`is-priority is-priority-${value}`}><i aria-hidden="true" />{PRIORITY_LABEL[value]}</span>;
}

function Deadline({ task }: { task: TaskRow | undefined }) {
  return task?.due_at ? <Timeline items={[{ id: task.id, date: task.due_at, label: task.title, thing: 'deadline' }]} /> :
    <div className="is-no-deadline"><Icon name="deadline" /><span>{task ? task.title : 'Keine offene Aufgabe'}
      <small>{task ? 'Ohne Termin' : 'Keine Frist gespeichert'}</small></span></div>;
}

export function CaseList({ people, tasks, summaries, onOpen }: {
  people: CareRecipient[]; tasks: TaskRow[]; summaries: StaffOverview['people'] | undefined; onOpen: (id: string) => void;
}) {
  return <div className="is-cases" role="list" aria-label="Pflegefälle">
    <div className="is-case-head" aria-hidden="true"><span>Person / Pflegekasse</span>
      <span className="is-list-axis"><span>−14 Tage</span><b>Heute</b><span>+42 Tage</span></span>
      <span>Arbeitsbestand</span><span>Aktion</span></div>
    {people.map((person) => {
      const personalTasks = tasks.filter((task) => task.care_recipient_id === person.id).sort(compareDeadline);
      const next = personalTasks[0];
      const summary = summaries?.find((item) => item.id === person.id);
      return <article className="is-case-row" role="listitem" key={person.id} aria-label={`Fall ${baseName(person.name)}`}>
        <div className="is-person"><span className="is-avatar" aria-hidden="true">{initials(person.name)}</span>
          <div><h3>{baseName(person.name)}</h3><p>{person.care_grade ? `Pflegegrad ${person.care_grade}` : 'Kein Pflegegrad'}
            {' · '}{person.insurerName ? baseName(person.insurerName) : 'Kasse nicht hinterlegt'}</p>
          {next ? <Priority value={next.priority} /> : null}</div></div>
        <div className="is-deadline"><Deadline task={next} /></div>
        <dl className="is-case-counts"><div><dt>{personalTasks.length === 1 ? 'offene Aufgabe' : 'offene Aufgaben'}</dt>
          <dd>{personalTasks.length}</dd></div>
          <div><dt>{summary?.conversations === 1 ? 'Gespräch' : 'Gespräche'}</dt>
            <dd>{summary ? summary.conversations.toLocaleString('de-DE') : '–'}</dd></div>
          <div><dt>{summary?.completedAnswers === 1 ? 'echte KI-Antwort' : 'echte KI-Antworten'}</dt>
            <dd>{summary ? summary.completedAnswers.toLocaleString('de-DE') : '–'}</dd></div></dl>
        <button type="button" className="is-button is-row-action" onClick={() => onOpen(person.id)}
          aria-label={`Fall öffnen: ${baseName(person.name)}`}><span>Fall öffnen</span><Icon name="arrow" size={16} /></button>
      </article>;
    })}
  </div>;
}

export function TaskList({ people, tasks, onOpen }: {
  people: CareRecipient[]; tasks: TaskRow[]; onOpen: (id: string) => void;
}) {
  return <ul className="is-task-list">{tasks.map((task) => {
    const person = people.find((item) => item.id === task.care_recipient_id);
    return <li key={task.id}>
      <div className="is-task-person"><Priority value={task.priority} />
        <h3>{person ? baseName(person.name) : 'Allgemeine Aufgabe'}</h3>
        {task.deadline_source ? <p>Quelle: {task.deadline_source}</p> : null}</div>
      <div className="is-deadline"><Deadline task={task} /></div>
      {person ? <button type="button" className="is-button is-row-action" onClick={() => onOpen(person.id)}
        aria-label={`Fall öffnen: ${baseName(person.name)} – ${task.title}`}>
        <span>Fall öffnen</span><Icon name="arrow" size={16} /></button> : null}
    </li>;
  })}</ul>;
}
