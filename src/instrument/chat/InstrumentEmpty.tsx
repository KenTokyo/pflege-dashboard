import { CardHead } from '../grundlage/CardHead';
import { Icon } from '../grundlage/Icon';
import { Reveal } from '../grundlage/Reveal';
import './chat.css';
import './answers.css';
import './composer.css';
import './dialogs.css';

export function ConversationDrawing() {
  return <svg className="in-conversation-drawing" viewBox="0 0 320 176" fill="none" aria-hidden="true">
    <g stroke="var(--border-strong)" strokeWidth="1" strokeLinejoin="round">
      <path d="m24 115 142-66 130 53-141 66z" strokeDasharray="3 5" />
      <path d="m52 103 112-52 104 43-112 53z" fill="var(--sunken)" />
      <path d="m52 103 112-52 104 43v9l-112 53-104-44z" />
      <path d="m69 88 95-45 88 36-96 45z" fill="var(--surface2)" />
      <path d="m69 88 87 36v10M156 124l96-45M88 87l50 20M102 81l63 25M116 75l50 20" />
      <path d="M164 43V25m88 54V48" strokeDasharray="3 4" />
    </g>
    <g stroke="var(--thing-conversation)" strokeWidth="1.5" strokeLinejoin="round">
      <path d="m128 35 49-23 83 34-50 24-25-10-21 3 3-10z" fill="var(--accent-soft)" />
      <path d="m151 35 42 17m-28-24 65 26" />
    </g>
  </svg>;
}

export function InstrumentEmpty({ onNew }: { onNew: () => void }) {
  return <section className="thread in-empty-thread in-card">
    <Reveal stage="head"><CardHead icon="ai" title="KI-Sachbearbeiter" subtitle="Gespräche zu Ihrer Pflegeorganisation" /></Reveal>
    <div className="in-chat-welcome">
      <Reveal stage="data"><ConversationDrawing /></Reveal>
      <Reveal stage="head"><h1>Wählen Sie ein Gespräch</h1>
        <p>Öffnen Sie ein Anliegen aus der Liste oder beginnen Sie ein neues Gespräch.</p></Reveal>
      <Reveal stage="action"><button type="button" className="in-chat-primary" onClick={onNew}>
        <Icon name="plus" /><span>Neues Gespräch</span>
      </button></Reveal>
      <div className="in-chat-boundary"><Icon name="shield" size={16} />
        <span>Auskunft und Textentwürfe im Chat. Keine Rechts- oder Medizinberatung.</span></div>
    </div>
  </section>;
}
