/**
 * Querverbindungsfunde der unabhängigen Prüfung (synthetischer Transport, kein Konto):
 * Fristen bei Ladefehler, Live-Text gegenüber halbfertiger gespeicherter Antwort, Reihenfolge bei
 * gleichem Zeitstempel von Frage und Antwort.
 */
import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { orderMessages } from '../../src/data/model';
import { AppError } from '../../src/services/errors';
import type { MessageRow } from '../../src/services/types';
import { createFakeBackend, TEST_EMAIL, TEST_PASSWORD } from '../support/fakeBackend';
import { testClock, signedInApp } from '../support/renderApp';
import { SEED_CONVERSATION, type SeedState } from '../support/seed';

const THREAD = `/gespraeche/${SEED_CONVERSATION}`;

function row(id: string, role: MessageRow['role'], at: string, rid: string | null, content: string = role): MessageRow {
  return {
    id,
    workspace_id: '10000000-0000-4000-8000-000000000001',
    created_by: '10000000-0000-4000-8000-000000000002',
    created_at: at,
    conversation_id: SEED_CONVERSATION,
    role,
    content,
    status: 'completed',
    model_id: null,
    model_snapshot: role === 'assistant' ? { displayName: 'Synthetisch', region: 'unverified' } : null,
    prompt_version_id: null,
    input_tokens: null,
    output_tokens: null,
    tool_calls: [],
    sources: [],
    client_request_id: rid,
    provider_response_model: null,
  };
}

describe('Reihenfolge des Verlaufs', () => {
  const T = '2026-10-06T08:00:00.000Z';
  it('gleicher Zeitstempel: Frage vor Antwort, auch wenn die Antwort-UUID kleiner ist', () => {
    const list = [row('ffff', 'user', T, 'r1'), row('0000', 'assistant', T, 'r1')];
    expect(orderMessages(list).map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('gleicher Zeitstempel, zwei Anfragen: vollständige Paare in Anfrage-Reihenfolge (wie Backend)', () => {
    const list = [
      row('userB4', 'user', T, 'requestB', 'Frage B'),
      row('assistantA1', 'assistant', T, 'requestA', 'Antwort A'),
      row('userA2', 'user', T, 'requestA', 'Frage A'),
      row('assistantB3', 'assistant', T, 'requestB', 'Antwort B'),
    ];
    expect(orderMessages(list).map((m) => m.content)).toEqual(['Frage A', 'Antwort A', 'Frage B', 'Antwort B']);
  });

  it('Antwort mit früherem Zeitstempel (Uhrabweichung) steht direkt hinter ihrer Frage', () => {
    const list = [
      row('a1', 'assistant', '2026-10-06T07:59:59.000Z', 'r1', 'Antwort 1'),
      row('u0', 'user', '2026-10-06T07:00:00.000Z', 'r0', 'Frage 0'),
      row('a0', 'assistant', '2026-10-06T07:00:01.000Z', 'r0', 'Antwort 0'),
      row('u1', 'user', T, 'r1', 'Frage 1'),
      row('s', 'system', '2026-10-06T06:00:00.000Z', null, 'Hinweis'),
    ];
    expect(orderMessages(list).map((m) => m.content)).toEqual(['Hinweis', 'Frage 0', 'Antwort 0', 'Frage 1', 'Antwort 1']);
  });

  it('im Gespräch: gespeicherte Frage steht vor der Antwort mit gleichem Zeitstempel', async () => {
    const extend = (s: SeedState) => {
      s.messages.push(row('00000000-0000-4000-8000-0000000000a2', 'assistant', T, 'r9', 'Die Antwort'), row('ffffffff-0000-4000-8000-0000000000a1', 'user', T, 'r9', 'Die Frage'));
    };
    await signedInApp({ extend }, THREAD);
    const answer = await screen.findByText('Die Antwort');
    const question = screen.getByText('Die Frage');
    expect(question.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('Live-Antwort gegenüber halbfertiger gespeicherter Zeile', () => {
  it('nach Weg- und Zurücknavigieren bleibt der gestreamte Text sichtbar, am Ende genau eine Antwort', async () => {
    const { fake, user, history } = await signedInApp(
      { modelOperational: true, chat: () => ({ kind: 'answer', chunks: ['Erster Teil. ', 'Zweiter Teil.'], holdBeforeComplete: true }) },
      THREAD,
    );
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage');
    await user.keyboard('{Enter}');
    await screen.findByText(/Zweiter Teil/);
    // Der Server hat die Antwortzeile bereits angelegt (Status streaming, noch leer).
    expect(fake.state.messages.some((m) => m.role === 'assistant' && m.status === 'streaming')).toBe(true);
    act(() => history.push('/aufgaben'));
    await screen.findByRole('heading', { name: 'Offene Aufgaben und Fristen', level: 1 });
    const reads = vi.spyOn(fake.data, 'listMessages');
    act(() => history.push(THREAD));
    // Warten, bis der Verlauf neu geladen ist und die halbfertige Zeile enthält.
    await waitFor(() => expect(reads).toHaveBeenCalled());
    const reloaded = await (reads.mock.results.at(-1)?.value as Promise<MessageRow[]>);
    expect(reloaded.some((m) => m.role === 'assistant' && m.status === 'streaming')).toBe(true);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    // Der Live-Text darf nicht verschwinden.
    expect(await screen.findByText(/Erster Teil\. Zweiter Teil\./)).toBeTruthy();
    expect(screen.queryByText(/Antwort wird noch erzeugt/)).toBeNull();
    act(() => fake.release());
    await waitFor(() => expect(fake.state.messages.find((m) => m.role === 'assistant' && m.client_request_id)?.status).toBe('completed'));
    await waitFor(() => expect(screen.getAllByRole('article', { name: 'Antwort des KI-Sachbearbeiters' })).toHaveLength(1));
    expect(screen.getAllByText(/Erster Teil\. Zweiter Teil\./)).toHaveLength(1);
  });

  it('Abbruch: gespeicherter Teiltext erscheint genau einmal mit Hinweis „unterbrochen“', async () => {
    const { user } = await signedInApp(
      { modelOperational: true, chat: () => ({ kind: 'answer', chunks: ['Nur ein Teil.'], holdBeforeComplete: true }) },
      THREAD,
    );
    await user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage');
    await user.keyboard('{Enter}');
    await screen.findByText('Nur ein Teil.');
    await user.click(screen.getByRole('button', { name: 'Antwort abbrechen' }));
    expect(await screen.findByText('Antwort abgebrochen')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText('Nur ein Teil.')).toHaveLength(1));
  });
});

describe('Dashboard bei Ladefehler der Aufgaben', () => {
  it('Personenkarte behauptet keine fehlende Frist, sondern meldet den Ladefehler', async () => {
    const fake = createFakeBackend();
    vi.spyOn(fake.data, 'listOpenTasks').mockRejectedValue(new AppError('NETWORK'));
    render(
      <App
        backend={fake}
        queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        history={createMemoryHistory({ initialEntries: ['/'] })}
        clock={testClock().clock}
      />,
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('E-Mail-Adresse'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Passwort'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    const people = await screen.findByRole('region', { name: 'Pflegebedürftige' });
    expect(await within(people).findByText('Fristen konnten nicht geladen werden')).toBeTruthy();
    expect(within(people).queryByText('Keine offene Frist')).toBeNull();
  });
});
