import './bootstrap';
import { createLibrary, defineComponent } from '@openuidev/react-lang';
import { CircleHelp, ListOrdered, NotebookTabs } from 'lucide-react';
import { OPENUI_ANSWER_SCHEMA, OPENUI_CATALOG_VERSION, OPENUI_LIBRARY, OPENUI_SCHEMAS } from '../../../types/openui';
import { SafeInlineMarkdown, SafeMarkdown } from '../Markdown';

const description = (name: string) => OPENUI_LIBRARY.components[name]?.description ?? name;

const Text = defineComponent({
  name: 'Text', props: OPENUI_SCHEMAS.Text, description: description('Text'),
  component: ({ props }) => <div className="openui-text"><SafeMarkdown text={props.markdown} /></div>,
});

const Facts = defineComponent({
  name: 'Facts', props: OPENUI_SCHEMAS.Facts, description: description('Facts'),
  component: ({ props }) => (
    <section className="openui-section openui-facts">
      <h3><NotebookTabs className="i" size={17} aria-hidden="true" /><SafeInlineMarkdown text={props.title || 'Fakten im Überblick'} /></h3>
      <ul>{props.items.map((item, i) => <li key={i}><SafeMarkdown text={item} /></li>)}</ul>
    </section>
  ),
});

const Steps = defineComponent({
  name: 'Steps', props: OPENUI_SCHEMAS.Steps, description: description('Steps'),
  component: ({ props }) => (
    <section className="openui-section openui-steps">
      <h3><ListOrdered className="i" size={17} aria-hidden="true" /><SafeInlineMarkdown text={props.title || 'Nächste Schritte'} /></h3>
      <ol>{props.items.map((item, i) => <li key={i}><SafeMarkdown text={item} /></li>)}</ol>
    </section>
  ),
});

const Notice = defineComponent({
  name: 'Notice', props: OPENUI_SCHEMAS.Notice, description: description('Notice'),
  component: ({ props }) => (
    <aside className="openui-notice">
      <h3><CircleHelp className="i" size={17} aria-hidden="true" /><SafeInlineMarkdown text={props.title || 'Hinweis'} /></h3>
      <SafeMarkdown text={props.markdown} />
    </aside>
  ),
});

const Answer = defineComponent({
  name: 'Answer', props: OPENUI_ANSWER_SCHEMA, description: description('Answer'),
  component: ({ props, renderNode }) => <div className="openui-answer">{renderNode(props.sections)}</div>,
});

export const tagwerkOpenUiLibrary = createLibrary({
  id: OPENUI_CATALOG_VERSION, root: 'Answer', components: [Answer, Text, Facts, Steps, Notice],
});
