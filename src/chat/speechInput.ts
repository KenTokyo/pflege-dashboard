/** Narrow Web Speech API surface: standard constructor or Chrome's prefixed constructor. */
export type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
export interface SpeechRecognitionPort {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type SpeechConstructor = new () => SpeechRecognitionPort;
export type SpeechSnapshot = {
  active: boolean;
  status: string;
  interim: string;
  error: string | null;
};
export const SPEECH_IDLE: SpeechSnapshot = { active: false, status: '', interim: '', error: null };

export function speechConstructor(): SpeechConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const browser = window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Das Mikrofon wurde nicht freigegeben. Bitte prüfen Sie die Mikrofonfreigabe Ihres Browsers.',
  'service-not-allowed': 'Ihr Browser erlaubt diesen Spracherkennungsdienst nicht.',
  'audio-capture': 'Das Mikrofon ist nicht erreichbar. Bitte prüfen Sie Ihr Mikrofon.',
  'no-speech': 'Es wurde keine Sprache erkannt. Ihr bisheriger Text bleibt erhalten.',
  network: 'Die Verbindung zur Spracherkennung ist unterbrochen. Ihr bisheriger Text bleibt erhalten.',
  'language-not-supported': 'Die Spracherkennung unterstützt Deutsch in diesem Browser nicht.',
};

/** Owns a recording only after a click. No background loop and no automatic chat submission. */
export class SpeechInputController {
  private recognition: SpeechRecognitionPort | null = null;
  private wanted = false;
  private alive = true;
  private restarts = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private draft = '';
  private interim = '';
  private snapshot = SPEECH_IDLE;
  private finals = new Set<number>();

  constructor(
    private readonly Recognition: SpeechConstructor | undefined,
    private onText: (text: string) => void,
    private onState: (state: SpeechSnapshot) => void,
  ) {}

  activate(): void { this.alive = true; }
  update(text: string, onText: (text: string) => void): void { this.draft = text; this.onText = onText; }

  start(): void {
    if (!this.alive || this.wanted || this.recognition) return;
    if (!this.Recognition) {
      this.publish({ ...SPEECH_IDLE, error: 'Dieser Browser bietet keine Spracheingabe an. Sie können Ihre Frage eintippen.' });
      return;
    }
    this.wanted = true;
    this.restarts = 0;
    this.launch();
  }

  stop(): void {
    if (!this.wanted && this.stopTimer !== null) return;
    this.wanted = false;
    this.clearTimers();
    const recognition = this.recognition;
    if (!recognition) { this.publish(SPEECH_IDLE); return; }
    this.publish({ ...this.snapshot, active: true, status: 'Spracheingabe wird beendet …' });
    try { recognition.stop(); }
    catch { this.commitInterim(); this.release(recognition); this.publish(SPEECH_IDLE); return; }
    // Some engines omit end after a disconnect; release the microphone in a bounded cleanup.
    if (this.recognition === recognition) this.stopTimer = setTimeout(() => {
      this.stopTimer = null;
      this.commitInterim();
      this.release(recognition);
      this.publish(SPEECH_IDLE);
    }, 800);
  }

  suspend(): void {
    this.wanted = false;
    this.clearTimers();
    this.commitInterim();
    if (this.recognition) this.release(this.recognition);
    this.publish(SPEECH_IDLE);
  }

  dispose(): void {
    this.alive = false;
    this.wanted = false;
    this.clearTimers();
    if (this.recognition) this.release(this.recognition);
    this.interim = '';
  }

  private launch(): void {
    if (!this.alive || !this.wanted || !this.Recognition) return;
    let recognition: SpeechRecognitionPort;
    try { recognition = new this.Recognition(); }
    catch { this.fail('Die Spracheingabe konnte nicht gestartet werden. Bitte versuchen Sie es erneut.'); return; }
    this.recognition = recognition;
    this.finals = new Set();
    this.interim = '';
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    this.publish({ active: true, status: 'Mikrofon wird gestartet …', interim: '', error: null });
    recognition.onstart = () => {
      if (this.recognition === recognition && this.wanted) this.publish({ active: true, status: 'Sie können sprechen. Es wird nichts automatisch gesendet.', interim: this.interim, error: null });
    };
    recognition.onresult = (event) => {
      if (!this.alive || this.recognition !== recognition) return;
      let finalText = '';
      const interim: string[] = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0].transcript.trim();
        if (result.isFinal) {
          if (i >= event.resultIndex && !this.finals.has(i)) { this.finals.add(i); finalText = `${finalText} ${text}`.trim(); }
        } else if (text) interim.push(text);
      }
      if (finalText || (interim.length > 0 && interim.join(' ') !== this.interim)) this.restarts = 0;
      if (finalText) this.append(finalText);
      this.interim = interim.join(' ');
      this.publish({ ...this.snapshot, interim: this.interim });
    };
    recognition.onerror = (event) => {
      if (!this.alive || this.recognition !== recognition) return;
      if (event.error === 'aborted' && !this.wanted) return;
      this.fail(ERRORS[event.error] ?? 'Die Spracherkennung wurde unterbrochen. Ihr bisheriger Text bleibt erhalten.');
    };
    recognition.onend = () => {
      if (!this.alive || this.recognition !== recognition) return;
      this.commitInterim();
      this.release(recognition, false);
      if (!this.wanted) { this.clearTimers(); this.publish(SPEECH_IDLE); return; }
      if (this.restarts >= 3) {
        this.wanted = false;
        this.publish({ ...SPEECH_IDLE, status: 'Der Browser hat die Spracheingabe mehrfach ohne neuen Text beendet. Zum Weiterdiktieren bitte das Mikrofon erneut starten.' });
        return;
      }
      this.restarts += 1;
      this.publish({ active: true, status: 'Der Browser hat pausiert. Spracheingabe wird fortgesetzt …', interim: '', error: null });
      this.restartTimer = setTimeout(() => { this.restartTimer = null; this.launch(); }, 500);
    };
    try { recognition.start(); }
    catch { this.fail('Die Spracheingabe konnte nicht gestartet werden. Bitte versuchen Sie es erneut.'); }
  }

  private append(text: string): void {
    this.draft = this.draft ? `${this.draft}${/\s$/.test(this.draft) ? '' : ' '}${text}` : text;
    if (this.alive) this.onText(this.draft);
  }
  private commitInterim(): void { if (this.interim) this.append(this.interim); this.interim = ''; }
  private fail(error: string): void {
    this.wanted = false;
    this.clearTimers();
    this.commitInterim();
    if (this.recognition) this.release(this.recognition);
    this.publish({ ...SPEECH_IDLE, error });
  }
  private release(recognition: SpeechRecognitionPort, abort = true): void {
    recognition.onstart = null; recognition.onresult = null; recognition.onerror = null; recognition.onend = null;
    if (this.recognition === recognition) this.recognition = null;
    if (abort) try { recognition.abort(); } catch { /* Already stopped. */ }
  }
  private clearTimers(): void {
    if (this.restartTimer !== null) clearTimeout(this.restartTimer);
    if (this.stopTimer !== null) clearTimeout(this.stopTimer);
    this.restartTimer = null; this.stopTimer = null;
  }
  private publish(state: SpeechSnapshot): void { this.snapshot = state; if (this.alive) this.onState(state); }
}
