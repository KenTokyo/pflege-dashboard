import { describe, expect, it, vi } from 'vitest';
import { ActivityTracker, type Clock } from '../../src/auth/activity';

/** Manuelle Uhr: Zeit läuft nur, wenn der Test sie vorstellt. */
function manualClock() {
  let t = 1_000_000;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: Clock = {
    now: () => t,
    setTimeout: (fn, ms) => {
      seq += 1;
      timers.set(seq, { at: t + ms, fn });
      return seq;
    },
    clearTimeout: (h) => timers.delete(h as number),
  };
  const advance = async (ms: number) => {
    const end = t + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      t = due[1].at;
      due[1].fn();
      await Promise.resolve();
    }
    t = end;
    await Promise.resolve();
  };
  return { clock, advance, pending: () => timers.size };
}

const MIN = 60_000;

function setup(timebox: number | null = null) {
  const c = manualClock();
  const touch = vi.fn(() => Promise.resolve(timebox));
  const onIdle = vi.fn();
  const onTimebox = vi.fn();
  const tracker = new ActivityTracker({ idleMs: 15 * MIN, touchIntervalMs: MIN, clock: c.clock, touch, onIdle, onTimebox });
  return { ...c, tracker, touch, onIdle, onTimebox };
}

describe('ActivityTracker', () => {
  it('meldet sich beim Start einmal und ohne Interaktion nie wieder (kein Heartbeat)', async () => {
    const s = setup();
    s.tracker.start();
    await s.advance(14 * MIN);
    expect(s.touch).toHaveBeenCalledTimes(1);
    expect(s.onIdle).not.toHaveBeenCalled();
  });

  it('meldet nach 15 Minuten ohne Aktivität ab und stoppt alle Timer', async () => {
    const s = setup();
    s.tracker.start();
    await s.advance(15 * MIN);
    expect(s.onIdle).toHaveBeenCalledTimes(1);
    expect(s.tracker.isRunning).toBe(false);
    expect(s.pending()).toBe(0);
  });

  it('fasst viele Interaktionen zu höchstens einem Touch pro Minute zusammen', async () => {
    const s = setup();
    s.tracker.start();
    for (let i = 0; i < 50; i += 1) {
      s.tracker.interaction();
      await s.advance(1000);
    }
    // 50 s Tippen: Start-Touch plus genau ein nachlaufender Touch nach Ablauf der Minute.
    await s.advance(MIN);
    expect(s.touch).toHaveBeenCalledTimes(2);
    await s.advance(5 * MIN);
    expect(s.touch).toHaveBeenCalledTimes(2);
  });

  it('verlängert die Inaktivitätsgrenze durch echte Interaktion', async () => {
    const s = setup();
    s.tracker.start();
    await s.advance(10 * MIN);
    s.tracker.interaction();
    await s.advance(10 * MIN);
    expect(s.onIdle).not.toHaveBeenCalled();
    await s.advance(5 * MIN);
    expect(s.onIdle).toHaveBeenCalledTimes(1);
  });

  it('belebt eine abgelaufene Sitzung nicht durch Interaktion wieder (gedrosselter Hintergrund-Tab)', () => {
    const s = setup();
    s.tracker.start();
    // Uhr springt ohne ausgelöste Timer (Tab im Hintergrund).
    const now = s.clock.now();
    vi.spyOn(s.clock, 'now').mockReturnValue(now + 16 * MIN);
    s.tracker.interaction();
    expect(s.onIdle).toHaveBeenCalledTimes(1);
  });

  it('checkNow beim Zurückkehren erkennt überschrittene Inaktivität', () => {
    const s = setup();
    s.tracker.start();
    const now = s.clock.now();
    vi.spyOn(s.clock, 'now').mockReturnValue(now + 15 * MIN + 1);
    s.tracker.checkNow();
    expect(s.onIdle).toHaveBeenCalledTimes(1);
  });

  it('beendet die Sitzung an der Zeitbox aus der Serverantwort', async () => {
    const c = manualClock();
    const onTimebox = vi.fn();
    const tracker = new ActivityTracker({
      idleMs: 15 * MIN,
      touchIntervalMs: MIN,
      clock: c.clock,
      touch: () => Promise.resolve(c.clock.now() + 2 * MIN),
      onIdle: vi.fn(),
      onTimebox,
    });
    tracker.start();
    await c.advance(0);
    await c.advance(2 * MIN);
    expect(onTimebox).toHaveBeenCalledTimes(1);
    expect(tracker.isRunning).toBe(false);
  });

  it('nach stop() keine Touches und keine Timer mehr', async () => {
    const s = setup();
    s.tracker.start();
    s.tracker.interaction();
    s.tracker.stop();
    s.tracker.interaction();
    await s.advance(30 * MIN);
    expect(s.touch).toHaveBeenCalledTimes(1);
    expect(s.onIdle).not.toHaveBeenCalled();
    expect(s.pending()).toBe(0);
  });
});
