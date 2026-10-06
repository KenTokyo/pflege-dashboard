/**
 * Aktivitätsverfolgung ohne Polling und ohne Hintergrund-Heartbeat.
 *
 * - Ein einziger Timer für die Inaktivitätsgrenze. Interaktionen ändern nur einen Zeitstempel; der Timer
 *   prüft beim Auslösen die echte Restzeit und plant sich höchstens einmal neu.
 * - Server-`touch` höchstens einmal pro Minute. Interaktionen innerhalb der Minute werden zu genau einem
 *   nachlaufenden Touch zusammengefasst; ohne neue Interaktion entsteht kein weiterer Aufruf.
 * - Zeitbox (8 h) aus der Serverantwort als eigener Einmal-Timer.
 */
export type Clock = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

export type ActivityOptions = {
  idleMs: number;
  touchIntervalMs: number;
  clock: Clock;
  /** Server-Touch auslösen. Ergebnis darf eine neue Zeitbox-Grenze (ms seit Epoch) liefern. */
  touch: () => Promise<number | null>;
  onIdle: () => void;
  onTimebox: () => void;
};

// setTimeout akzeptiert höchstens 2^31-1 ms.
const MAX_DELAY = 2_147_483_647;

export class ActivityTracker {
  private readonly o: ActivityOptions;
  private lastActivity = 0;
  private idleMs: number;
  private idleExpiresAt = Number.POSITIVE_INFINITY;
  private lastTouch = Number.NEGATIVE_INFINITY;
  private touchInFlight = false;
  private touchPending = false;
  private idleTimer: unknown = null;
  private touchTimer: unknown = null;
  private timeboxTimer: unknown = null;
  private running = false;

  constructor(options: ActivityOptions) {
    this.o = options;
    this.idleMs = options.idleMs;
  }

  /** Nach erfolgreicher Anmeldung: Startzeit setzen und sofort einmal beim Server melden. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastActivity = this.o.clock.now();
    this.armIdle(this.idleMs);
    this.sendTouch();
  }

  stop(): void {
    this.running = false;
    for (const t of [this.idleTimer, this.touchTimer, this.timeboxTimer]) if (t !== null) this.o.clock.clearTimeout(t);
    this.idleTimer = this.touchTimer = this.timeboxTimer = null;
    this.touchPending = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Echte Benutzerinteraktion (Taste, Zeiger, Scrollen). */
  interaction(): void {
    if (!this.running) return;
    const now = this.o.clock.now();
    // Eine überfällige Sitzung wird durch Interaktion nicht wiederbelebt.
    if (this.idleRemaining(now) <= 0) {
      this.expire();
      return;
    }
    this.lastActivity = now;
    const sinceTouch = now - this.lastTouch;
    if (sinceTouch >= this.o.touchIntervalMs && !this.touchInFlight) {
      this.sendTouch();
    } else if (!this.touchPending) {
      this.touchPending = true;
      const wait = Math.max(0, this.o.touchIntervalMs - sinceTouch);
      this.touchTimer = this.o.clock.setTimeout(() => {
        this.touchTimer = null;
        this.touchPending = false;
        if (this.running) this.sendTouch();
      }, wait);
    }
  }

  /** Beim Zurückkehren in den sichtbaren Tab: Hintergrund-Timer können gedrosselt gewesen sein. */
  checkNow(): void {
    if (!this.running) return;
    if (this.idleRemaining(this.o.clock.now()) <= 0) this.expire();
  }

  /** Erst nach gültiger Serverantwort anwenden, niemals aus einer lokalen Merken-Auswahl. */
  setIdleTimeout(idleMs: number, idleExpiresAt?: number): void {
    if (!Number.isFinite(idleMs) || idleMs <= 0 || !this.running) return;
    this.idleMs = idleMs;
    if (idleExpiresAt !== undefined && Number.isFinite(idleExpiresAt)) this.idleExpiresAt = idleExpiresAt;
    if (this.idleTimer !== null) this.o.clock.clearTimeout(this.idleTimer);
    const remaining = this.idleRemaining(this.o.clock.now());
    if (remaining <= 0) this.expire();
    else this.armIdle(remaining);
  }

  setTimebox(expiresAt: number | null): void {
    if (this.timeboxTimer !== null) this.o.clock.clearTimeout(this.timeboxTimer);
    this.timeboxTimer = null;
    if (expiresAt === null || !this.running) return;
    const delay = expiresAt - this.o.clock.now();
    if (delay <= 0) {
      this.stop();
      this.o.onTimebox();
      return;
    }
    this.timeboxTimer = this.o.clock.setTimeout(() => this.setTimebox(expiresAt), Math.min(delay, MAX_DELAY));
  }

  private sendTouch(): void {
    this.lastTouch = this.o.clock.now();
    this.touchInFlight = true;
    this.o
      .touch()
      .then((timebox) => {
        if (timebox !== null) this.setTimebox(timebox);
      })
      .catch(() => undefined)
      .finally(() => {
        this.touchInFlight = false;
      });
  }

  private idleRemaining(now: number): number {
    return Math.min(this.lastActivity + this.idleMs, this.idleExpiresAt) - now;
  }

  private armIdle(delay: number): void {
    this.idleTimer = this.o.clock.setTimeout(() => {
      this.idleTimer = null;
      if (!this.running) return;
      const remaining = this.idleRemaining(this.o.clock.now());
      if (remaining <= 0) this.expire();
      else this.armIdle(remaining);
    }, Math.min(delay, MAX_DELAY));
  }

  private expire(): void {
    this.stop();
    this.o.onIdle();
  }
}

export const browserClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (handle) => window.clearTimeout(handle as number),
};
