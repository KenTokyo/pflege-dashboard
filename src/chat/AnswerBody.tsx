import { lazy, Suspense } from 'react';
import { parseOpenUi } from '../../types/openui';
import { SafeMarkdown } from './Markdown';
import { readPresentation } from './openui/presentation';
import type { ResponseFormat } from './responseFormat';

const OpenUiAnswer = lazy(() => import('./openui/OpenUiAnswer'));

/** One display path for live and stored messages; switching never changes a request. */
export function AnswerBody({ text, presentation, responseFormat = 'text', streaming = false }: {
  text: string; presentation?: unknown; responseFormat?: ResponseFormat; streaming?: boolean;
}) {
  const structured = readPresentation(presentation);
  if (!structured) return (
    <>
      {text ? <SafeMarkdown text={text} /> : null}
      {presentation != null && responseFormat === 'openui' ? <p className="msg-status is-warn">Diese gespeicherte Komponentenansicht ist nicht verfügbar. Die Textfassung bleibt erhalten.</p> : null}
    </>
  );
  const canonical = text || (streaming || structured.state !== 'valid' ? parseOpenUi(structured.source, streaming).text : '');
  const normal = canonical ? <SafeMarkdown text={canonical} /> : null;
  if (responseFormat === 'text') return normal;
  return <Suspense fallback={normal}><OpenUiAnswer text={canonical} presentation={structured} streaming={streaming} /></Suspense>;
}
