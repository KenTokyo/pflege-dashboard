import { useDesign } from '../app/ThemeProvider';
import { InstrumentLogin } from '../instrument/anmeldung/InstrumentLogin';
import { useSearch } from '@tanstack/react-router';
import { ReturnTo } from '../app/returnPath';
import { Clock, Info, LockKeyhole, Mail } from 'lucide-react';
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { useAuth, type SignOutReason } from '../auth/AuthProvider';
import { DemoBanner } from '../components/DemoBanner';
import { BrandMark } from '../components/Brand';
import { CareFigure, FIGURE } from '../components/CareFigure';
import { ThemeToggle } from '../components/ThemeToggle';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useBackend } from '../services/BackendContext';
import { AppError, toAppError } from '../services/errors';

const REASON: Record<SignOutReason, string> = {
  manual: 'Sie wurden abgemeldet.',
  idle: 'Ihre Anmeldung ist wegen längerer Inaktivität abgelaufen. Bitte melden Sie sich erneut an.',
  expired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
  timebox: 'Ihre gespeicherte Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.',
  forbidden: 'Ihr Zugang zu diesem Arbeitsbereich ist nicht mehr aktiv.',
};

export function LoginPage() {
  useDocumentTitle('Anmelden');
  const { design } = useDesign();
  const { state, signIn } = useAuth();
  const backend = useBackend();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => backend.auth.getRememberPreference());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const errorId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Während der Anmeldung sind die Felder gesperrt und verlieren den Fokus. Nach einem Fehler
  // springt er zurück ins passende Feld, damit Tastatur- und Screenreader-Nutzer direkt weitermachen.
  useEffect(() => {
    if (!error) return;
    (error.code === 'INVALID_EMAIL' ? emailRef : passwordRef).current?.focus();
  }, [error]);
  const weiter = useSearch({ from: '/anmelden', select: (s) => s.weiter });

  if (state.status === 'signedIn' || state.status === 'noAccess' || state.status === 'error') {
    return <ReturnTo path={weiter} />;
  }

  const reason = state.status === 'signedOut' && state.reason ? REASON[state.reason] : null;

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const address = email.trim();
    // Offensichtlich ungültige Adresse gar nicht erst an den Auth-Server schicken.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(new AppError('INVALID_EMAIL'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(address, password, remember);
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setPassword('');
      setBusy(false);
    }
  };

  if (design === 'instrument') return <InstrumentLogin email={email} password={password} remember={remember} busy={busy}
    error={error} errorId={errorId} reason={reason} emailRef={emailRef} passwordRef={passwordRef}
    setEmail={setEmail} setPassword={setPassword} setRemember={setRemember} onSubmit={onSubmit} />;

  return (
    <>
      <DemoBanner />
      <div className="login">
        <div className="login-top">
          <span className="login-brand">
            <BrandMark size={24} />
            Pflege-Dashboard
          </span>
          <ThemeToggle />
        </div>
        <div className="login-col fx-fall">
          <div className="login-host">
            <CareFigure pose="greet" />
            <div className="host-bubble">
              <p className="host-from">{FIGURE.from}</p>
              <h1 id="login-title">Anmelden</h1>
            </div>
          </div>
          <section className="login-card" aria-labelledby="login-title">
            <form className="login-form" onSubmit={(e) => void onSubmit(e)} noValidate aria-describedby={error ? errorId : undefined}>
              <p className="login-lead">Ihr Arbeitsbereich für Pflegeanträge, Fristen und Schreiben – mit einem KI-Sachbearbeiter, der Unsicherheiten benennt.</p>

              {reason && !error ? (
                <div className="alert" role="status">
                  <Info className="i" size={18} aria-hidden="true" />
                  <span>{reason}</span>
                </div>
              ) : null}
              {error ? (
                <div className="alert alert-danger" role="alert" id={errorId}>
                  <Info className="i" size={18} aria-hidden="true" />
                  <span>{error.message}</span>
                </div>
              ) : null}

              <div className="field">
                <label htmlFor="email">E-Mail-Adresse</label>
                <div className={`input ${error?.code === 'INVALID_CREDENTIALS' || error?.code === 'INVALID_EMAIL' ? 'is-invalid' : ''}`}>
                  <Mail className="i" size={15} aria-hidden="true" />
                  <input
                    id="email"
                    ref={emailRef}
                    aria-invalid={error?.code === 'INVALID_EMAIL' || error?.code === 'INVALID_CREDENTIALS'}
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    required
                    placeholder="name@beispiel.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="password">Passwort</label>
                <div className={`input ${error?.code === 'INVALID_CREDENTIALS' ? 'is-invalid' : ''}`}>
                  <LockKeyhole className="i" size={15} aria-hidden="true" />
                  <input
                    id="password"
                    ref={passwordRef}
                    aria-invalid={error?.code === 'INVALID_CREDENTIALS'}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={busy} />
                <span>Anmeldung auf diesem Gerät speichern</span>
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email.trim() || !password}>
                {busy ? 'Wird angemeldet …' : 'Anmelden'}
              </button>
              <p className="login-or">oder</p>
              <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => {
                setEmail('test@test.de');
                passwordRef.current?.focus();
              }}>Demo-Zugang verwenden</button>
            </form>
          </section>
          <div className="login-notes">
            <p className="note">
              <Info className="i" size={15} aria-hidden="true" />
              <span>Zugänge vergibt Ihre Verwaltung. Eine Selbstregistrierung gibt es nicht. Passwort vergessen? Bitte wenden Sie sich an die Verwaltung.</span>
            </p>
            <p className="note">
              <Clock className="i" size={15} aria-hidden="true" />
              <span>{remember ? 'Mit dieser Auswahl bleiben Sie bis zu 30 Tage angemeldet. Beim Öffnen wird Ihr Zugang geprüft. Ihr Passwort wird nicht gespeichert.' : 'Ohne gespeicherte Anmeldung werden Sie nach 15 Minuten ohne Aktivität abgemeldet. Ihr Passwort wird nicht gespeichert.'}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
