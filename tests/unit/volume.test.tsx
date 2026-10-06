/**
 * Datenumfang: Oberfläche zeigt große Bestände vollständig (synthetischer Transport, kein Konto).
 * Das vollständige Laden selbst prüft supabaseBackend.test.ts gegen eine PostgREST-Nachbildung.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SeedState } from '../support/seed';
import { MARTHA, SEED_CONVERSATION } from '../support/seed';
import { signedInApp } from '../support/renderApp';

const base = { workspace_id: '10000000-0000-4000-8000-000000000001', created_by: '10000000-0000-4000-8000-000000000002' };
const uuid = (prefix: string, i: number) => `${prefix}-0000-4000-8000-${String(i).padStart(12, '0')}`;

function longConversation(state: SeedState) {
  const t0 = Date.parse('2026-10-01T08:00:00Z');
  for (let i = 1; i <= 450; i++) {
    const assistant = i % 2 === 0;
    state.messages.push({
      ...base,
      id: uuid('30000000', i),
      created_at: new Date(t0 + i * 60_000).toISOString(),
      conversation_id: SEED_CONVERSATION,
      role: assistant ? 'assistant' : 'user',
      content: assistant ? `Antwort Nummer ${i}` : `Frage Nummer ${i}`,
      status: 'completed',
      model_id: null,
      model_snapshot: assistant ? { displayName: 'Synthetisches Modell', region: 'unverified' } : null,
      prompt_version_id: null,
      input_tokens: null,
      output_tokens: null,
      tool_calls: [],
      sources: [],
      client_request_id: null,
      provider_response_model: null,
    });
  }
}

function manyTasks(state: SeedState) {
  for (let i = 1; i <= 128; i++) {
    state.tasks.push({
      ...base,
      id: uuid('40000000', i),
      created_at: '2026-10-06T07:30:00Z',
      care_recipient_id: MARTHA,
      conversation_id: null,
      title: `Synthetische Aufgabe ${i}`,
      description: '',
      due_at: i % 3 === 0 ? null : new Date(Date.parse('2026-11-01T09:00:00Z') + i * 86_400_000).toISOString(),
      deadline_source: null,
      priority: 'normal',
      status: i % 2 === 0 ? 'in_progress' : 'open',
      kind: 'standard',
    });
  }
}

function manyConversations(state: SeedState) {
  for (let i = 1; i <= 230; i++) {
    state.conversations.push({
      ...base,
      id: uuid('50000000', i),
      created_at: new Date(Date.parse('2026-09-01T08:00:00Z') + i * 3_600_000).toISOString(),
      title: `Gespräch Nummer ${i}`,
      care_recipient_id: null,
      archived_at: null,
      mode_override: null,
      model_override_id: null,
      revision: 1,
    });
  }
}

describe('Datenumfang', () => {
  it('Gespräch mit über 450 Nachrichten zeigt die neueste Antwort', async () => {
    await signedInApp({ extend: longConversation }, `/gespraeche/${SEED_CONVERSATION}`);
    expect(await screen.findByText('Antwort Nummer 450')).toBeTruthy();
    expect(screen.getByText('Frage Nummer 1')).toBeTruthy();
  });

  it('Dashboard zählt alle offenen Aufgaben (auch „in Bearbeitung“), die Aufgabenseite listet alle', async () => {
    const { user } = await signedInApp({ extend: manyTasks });
    const tasks = await screen.findByRole('region', { name: 'Offene Aufgaben und Fristen' });
    expect(await within(tasks).findByText('130')).toBeTruthy(); // 2 Seed + 128
    await user.click(within(tasks).getByRole('link', { name: 'Alle anzeigen' }));
    const list = await screen.findByRole('region', { name: 'Aufgabenliste' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(130);
  });

  it('Gesprächsliste zeigt alle 231 Gespräche', async () => {
    await signedInApp({ extend: manyConversations }, '/gespraeche');
    const list = await screen.findByRole('list', { name: 'Gespräche' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(231);
  });
});
