import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChatActivity } from '../../types/phase1';
import { parseActivity } from '../../src/chat/activity';
import { parseChatEvent } from '../../src/chat/sse';
import { ActivityView } from '../../src/routes/chat/ActivityView';
import { signedInApp } from '../support/renderApp';
import { SEED_CONVERSATION } from '../support/seed';

const trace: ChatActivity = {
  stage: 'awaiting_text', at: '2026-10-07T21:00:00.000Z', elapsedMs: 850,
  source: 'provider_stream', provider: 'opencode', modelId: 'deepseek-v4.1-flash',
  details: { thinking: 'disabled', reasoningChunks: 4 },
};

describe('Echte gemeldete Ablaufdaten', () => {
  it('verwirft unbekannte Felder, Anbieterdetails, Eingaben und Gedanken vor der Darstellung', () => {
    const unknown = { ...trace, authorization: 'sensitive-test-marker', rawThinking: 'sensitive-test-marker', details: { ...trace.details, apiKey: 'sensitive-test-marker', prompt: 'sensitive-test-marker', operation: 'sensitive-test-marker' } };
    const event = parseChatEvent({ event: 'message.activity', data: JSON.stringify({ version: 1, type: 'message.activity', sequence: 1, requestId: 'r', conversationId: 'c', data: unknown }) }, 'c');
    expect(event.type).toBe('message.activity');
    expect(JSON.stringify(event.data)).not.toContain('sensitive-test-marker');
    expect(event.data).toMatchObject({ stage: 'awaiting_text', details: { thinking: 'disabled', reasoningChunks: 4 } });
  });

  it.each(['text', 'openui'] as const)('erhält erlaubtes Antwortformat %s und die bekannte Katalogversion im bereinigten Ablauf', (responseFormat) => {
    const data: ChatActivity = { ...trace, details: { ...trace.details, responseFormat, catalogVersion: 'pflege-openui-v1' } };
    const event = parseChatEvent({ event: 'message.activity', data: JSON.stringify({ version: 1, type: 'message.activity', sequence: 1, requestId: 'r', conversationId: 'c', data }) }, 'c');
    expect(event.data).toMatchObject({ details: { responseFormat, catalogVersion: 'pflege-openui-v1' } });
    const { container } = render(<ActivityView activity={[data]} />);
    expect(container.querySelector('pre')?.textContent).toContain(`"responseFormat": "${responseFormat}"`);
    expect(container.querySelector('pre')?.textContent).toContain('"catalogVersion": "pflege-openui-v1"');
  });

  it('verwirft unbekannte Format- und Katalogwerte weiterhin ohne andere echte Metadaten zu verlieren', () => {
    const parsed = parseActivity({ ...trace, details: { ...trace.details, responseFormat: 'arbitrary-format', catalogVersion: 'foreign-catalog' } });
    expect(parsed?.details).toEqual(trace.details);
    expect(JSON.stringify(parsed)).not.toContain('arbitrary-format');
    expect(JSON.stringify(parsed)).not.toContain('foreign-catalog');
  });

  it.each([
    { ...trace, stage: 'fake_mcp_call' },
    { ...trace, source: 'not-a-source' },
    { ...trace, at: 'not-a-date' },
    { ...trace, elapsedMs: -1 },
  ])('ungültige Stufen und Zeitangaben werden nie als echter Ablauf angezeigt', (value) => {
    expect(parseActivity(value)).toBeNull();
  });

  it('Thinking-Konfiguration sichtbar, nur gezählte Metadaten und bereinigtes JSON', () => {
    render(<ActivityView activity={[trace]} />);
    expect(screen.getByText('Ablauf und Technik')).toBeTruthy();
    expect(screen.getByText('deaktiviert')).toBeTruthy();
    expect(screen.getByText('Auf den ersten Antworttext warten')).toBeTruthy();
    expect(screen.getByText(/Anbieter.*OpenCode|Antwortstream.*OpenCode/)).toBeTruthy();
    expect(screen.getByText('Bereinigtes JSON')).toBeTruthy();
    expect(screen.queryByText(/MCP/)).toBeNull();
  });

  it('ohne Serverereignisse wird kein Ablauf erfunden', () => {
    const { container } = render(<ActivityView activity={[]} />);
    expect(container.textContent).toBe('');
  });

  it('gespeicherte Antwort erscheint einmal; aktuelle Trace bleibt nach Abschluss aufklappbar', async () => {
    const { user, fake } = await signedInApp({ modelOperational: true, activity: [trace], chat: () => ({ kind: 'answer', chunks: ['Fertige Antwort.'] }) }, `/gespraeche/${SEED_CONVERSATION}`);
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage{Enter}');
    expect(await screen.findByText('Fertige Antwort.')).toBeTruthy();
    const summary = await screen.findByText('Ablauf und Technik');
    await user.click(summary);
    expect(summary.closest('details')?.open).toBe(true);
    expect(screen.getByText('deaktiviert')).toBeTruthy();
    expect(screen.getAllByRole('article', { name: 'Antwort des KI-Sachbearbeiters' })).toHaveLength(1);
    expect(fake.calls.chat).toHaveLength(1);
  });
});
