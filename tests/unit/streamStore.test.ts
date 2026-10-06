import { describe, expect, it, vi } from 'vitest';
import { recoveryFor, StreamStore } from '../../src/chat/streamStore';
import { AppError } from '../../src/services/errors';
import { createFakeBackend, type ChatScript } from '../support/fakeBackend';
import { SEED_CONVERSATION } from '../support/seed';

function setup(script: (n: number) => ChatScript) {
  let n = 0;
  const fake = createFakeBackend({ modelOperational: true, chat: () => script(n++) });
  const onSettled = vi.fn();
  const onSessionLost = vi.fn();
  const registered = new Set<AbortController>();
  const store = new StreamStore({
    chat: fake.chat,
    workspaceId: fake.state.workspace.workspace.id,
    registerStream: (c) => {
      registered.add(c);
      return () => registered.delete(c);
    },
    onSettled,
    onSessionLost,
    schedule: (fn) => queueMicrotask(fn),
  });
  store.activate();
  const settled = () => vi.waitFor(() => expect(store.isActive(SEED_CONVERSATION)).toBe(false));
  return { fake, store, onSettled, onSessionLost, registered, settled };
}

describe('recoveryFor', () => {
  it.each([
    ['NETWORK', 'fetch_again'],
    ['PROTOCOL', 'fetch_again'],
    ['REQUEST_IN_PROGRESS', 'reload'],
    ['REQUEST_INTERRUPTED', 'send_new'],
    ['IDEMPOTENCY_CONFLICT', 'send_new'],
    ['PROVIDER_NOT_CONFIGURED', 'none'],
    ['BUDGET_EXCEEDED', 'none'],
  ] as const)('%s → %s', (code, expected) => {
    expect(recoveryFor({ phase: 'failed', error: new AppError(code) })).toBe(expected);
  });
  it('Abbruch → bewusst neu senden', () => {
    expect(recoveryFor({ phase: 'aborted', error: null })).toBe('send_new');
  });
});

describe('StreamStore', () => {
  it('setzt Deltas zusammen und meldet Abschluss', async () => {
    const s = setup(() => ({ kind: 'answer', chunks: ['Guten ', 'Tag.'] }));
    s.store.send(SEED_CONVERSATION, 'Hallo');
    await s.settled();
    const turn = s.store.get(SEED_CONVERSATION);
    expect(turn).toMatchObject({ phase: 'completed', text: 'Guten Tag.', replayed: false });
    expect(turn?.model?.displayName).toContain('Testmodell');
    expect(s.onSettled).toHaveBeenCalledWith(SEED_CONVERSATION);
    expect(s.registered.size).toBe(0);
  });

  it('Netzabriss: erneut abrufen nutzt dieselbe Request-ID und liefert ein Replay ohne neuen Aufruf beim Anbieter', async () => {
    const s = setup((n) => (n === 0 ? { kind: 'cut', afterChunks: ['Teil'] } : { kind: 'answer', chunks: ['egal'] }));
    s.store.send(SEED_CONVERSATION, 'Frage');
    await s.settled();
    const failed = s.store.get(SEED_CONVERSATION);
    expect(failed?.phase).toBe('failed');
    expect(recoveryFor(failed ?? { phase: 'failed', error: null })).toBe('fetch_again');
    const firstId = failed?.clientRequestId;
    s.store.fetchAgain(SEED_CONVERSATION);
    await s.settled();
    expect(s.fake.calls.chat.map((r) => r.clientRequestId)).toEqual([firstId, firstId]);
    expect(s.store.get(SEED_CONVERSATION)).toMatchObject({ phase: 'completed', replayed: true, text: 'Teil' });
    // Genau eine gespeicherte Antwort, keine zweite Generierung.
    expect(s.fake.state.messages.filter((m) => m.role === 'assistant')).toHaveLength(1);
  });

  it('bewusst neu senden erzeugt eine neue Request-ID', async () => {
    const s = setup(() => ({ kind: 'http_error', code: 'REQUEST_INTERRUPTED' }));
    s.store.send(SEED_CONVERSATION, 'Frage');
    await s.settled();
    const first = s.store.get(SEED_CONVERSATION);
    expect(first?.error?.code).toBe('REQUEST_INTERRUPTED');
    s.store.send(SEED_CONVERSATION, first?.content ?? '');
    await s.settled();
    const [a, b] = s.fake.calls.chat;
    expect(a?.clientRequestId).not.toBe(b?.clientRequestId);
    expect(a?.attachmentIds).toEqual([]);
  });

  it('nur ein laufender Request je Gespräch', async () => {
    const s = setup(() => ({ kind: 'answer', chunks: ['x'], holdBeforeComplete: true }));
    s.store.send(SEED_CONVERSATION, 'eins');
    s.store.send(SEED_CONVERSATION, 'zwei');
    await vi.waitFor(() => expect(s.store.get(SEED_CONVERSATION)?.text).toBe('x'));
    expect(s.fake.calls.chat).toHaveLength(1);
    s.fake.release();
    await s.settled();
  });

  it('Abbruch stoppt den Stream und bietet nur bewusstes Neusenden an', async () => {
    const s = setup(() => ({ kind: 'answer', chunks: ['a'], holdBeforeComplete: true }));
    s.store.send(SEED_CONVERSATION, 'Frage');
    await vi.waitFor(() => expect(s.store.get(SEED_CONVERSATION)?.phase).toBe('streaming'));
    s.store.abort(SEED_CONVERSATION);
    await s.settled();
    expect(s.store.get(SEED_CONVERSATION)?.phase).toBe('aborted');
  });

  it('Fehlerereignis im Stream (Budget 0) zeigt den Code, keinen Ersatztext', async () => {
    const s = setup(() => ({ kind: 'stream_error', afterChunks: [], code: 'BUDGET_EXCEEDED' }));
    s.store.send(SEED_CONVERSATION, 'Frage');
    await s.settled();
    expect(s.store.get(SEED_CONVERSATION)).toMatchObject({ phase: 'failed', text: '', error: { code: 'BUDGET_EXCEEDED' } });
  });

  it('abgelaufene Sitzung meldet Sitzungsverlust', async () => {
    const s = setup(() => ({ kind: 'http_error', code: 'SESSION_EXPIRED' }));
    s.store.send(SEED_CONVERSATION, 'Frage');
    await s.settled();
    expect(s.onSessionLost).toHaveBeenCalledWith('SESSION_EXPIRED');
  });

  it('dispose bricht laufende Streams ab und verwirft Zwischenstände', async () => {
    const s = setup(() => ({ kind: 'answer', chunks: ['a'], holdBeforeComplete: true }));
    s.store.send(SEED_CONVERSATION, 'Frage');
    await vi.waitFor(() => expect(s.store.get(SEED_CONVERSATION)?.phase).toBe('streaming'));
    s.store.dispose();
    expect(s.store.get(SEED_CONVERSATION)).toBeNull();
    await vi.waitFor(() => expect(s.registered.size).toBe(0));
    s.store.send(SEED_CONVERSATION, 'nach Abbau');
    expect(s.fake.calls.chat).toHaveLength(1);
  });
});
