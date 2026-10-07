import './bootstrap';
import { Renderer, type OpenUIError } from '@openuidev/react-lang';
import { Component, useState, type ReactNode } from 'react';
import { parseOpenUi, type ChatPresentation } from '../../../types/openui';
import { SafeMarkdown } from '../Markdown';
import { tagwerkOpenUiLibrary } from './library';

function FormatFallback({ text, source }: { text: string; source?: string }) {
  return (
    <>
      {text ? <SafeMarkdown text={text} /> : null}
      <p className="msg-status is-warn">Die Komponentenansicht konnte nicht vollständig dargestellt werden.{text ? ' Die lesbare Textfassung bleibt erhalten.' : ''}</p>
      {!text && source ? <details className="openui-original"><summary>Unverarbeitete Anbieterantwort ansehen</summary><pre>{source}</pre></details> : null}
    </>
  );
}

type BoundaryProps = { children: ReactNode; text: string; source: string };
class RenderBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidUpdate(previous: BoundaryProps) {
    if (this.state.failed && previous.source !== this.props.source) this.setState({ failed: false });
  }
  override render() { return this.state.failed ? <FormatFallback text={this.props.text} source={this.props.source} /> : this.props.children; }
}

function ValidatedRenderer({ source, text, streaming }: { source: string; text: string; streaming: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const onError = (errors: OpenUIError[]) => {
    // The shared literal gate has already rejected unsafe calls. The SDK can report
    // an unfinished, permitted component name as a parser error during streaming.
    if (errors.some(error => !streaming || error.source !== 'parser')) setFailedSource(source);
  };
  if (failedSource === source) return <FormatFallback text={text} source={source} />;
  return <Renderer response={source} library={tagwerkOpenUiLibrary} isStreaming={streaming} toolProvider={null} publishObservability={false} onError={onError} />;
}

export default function OpenUiAnswer({ text, presentation, streaming }: { text: string; presentation: ChatPresentation; streaming: boolean }) {
  const result = parseOpenUi(presentation.source, streaming);
  const canonical = text || result.text;
  if (streaming && result.state === 'streaming' && !result.source) return canonical ? <SafeMarkdown text={canonical} /> : null;
  if (!streaming && presentation.state === 'valid' && text.trim() !== result.text.trim()) return <FormatFallback text={text} source={presentation.source} />;
  if (presentation.state === 'invalid' || result.state === 'invalid' || !result.source) {
    if (streaming && presentation.source.trim() === '') return null;
    return <FormatFallback text={canonical} source={presentation.source} />;
  }
  return (
    <RenderBoundary text={canonical} source={result.source}>
      <ValidatedRenderer source={result.source} text={canonical} streaming={streaming} />
    </RenderBoundary>
  );
}
