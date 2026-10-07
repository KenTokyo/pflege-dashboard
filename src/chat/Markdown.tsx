import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Nur diese Linkziele werden als Link dargestellt; alles andere bleibt Text. */
export function safeHref(href: string | undefined): string | null {
  if (!href) return null;
  const cleaned = defaultUrlTransform(href);
  return /^(https:|mailto:)/i.test(cleaned) ? cleaned : null;
}

const components: Components = {
  a: ({ href, children }) => {
    const safe = safeHref(href);
    if (!safe) return <span>{children}</span>;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    );
  },
  // Keine externen Bilder aus Modellantworten (Tracking, ungeprüfte Inhalte): nur Alternativtext.
  img: ({ alt }) => (alt ? <span>[Bild: {alt}]</span> : null),
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h3>{children}</h3>,
};

/**
 * Antworttext des Modells sicher darstellen: kein HTML (skipHtml), keine Skript-/Daten-URLs,
 * keine Bilder. Inhalt gilt als nicht vertrauenswürdig.
 */
export function SafeMarkdown({ text }: { text: string }) {
  return (
    <div className="md">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {text}
      </Markdown>
    </div>
  );
}

/** Phrasing content only, so model emphasis never inserts paragraphs into headings. */
export function SafeInlineMarkdown({ text }: { text: string }) {
  return (
    <span className="md md-inline">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={components}
        allowedElements={['strong', 'em', 'del', 'code', 'a', 'br', 'img']} unwrapDisallowed>
        {text}
      </Markdown>
    </span>
  );
}
