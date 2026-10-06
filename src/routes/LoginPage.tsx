import { useSearch } from '@tanstack/react-router';
import { ReturnTo } from '../app/returnPath';
import { ArrowRight, CalendarClock, Clock, Info, LockKeyhole, Mail, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { useAuth, type SignOutReason } from '../auth/AuthProvider';
import { DemoBanner } from '../components/DemoBanner';
import { BrandMark, Spray, TagLine } from '../components/Brand';
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

  return (
    <>
      <DemoBanner />
      <div className="login-mobile-top">
        <span className="topbar-brand">
          <BrandMark size={30} />
          Pflege-Dashboard
        </span>
        <ThemeToggle />
      </div>
      <div className="login">
        <section className="login-side" aria-labelledby="claim">
          <Spray className="g-spray login-spray" />
          <div className="login-brand relative flex items-center gap-2.5">
            <BrandMark size={40} />
            <span className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Pflege-Dashboard
            </span>
          </div>
          <h1 id="claim" className="login-claim relative">
            Pflegeanträge ohne Papierchaos.
          </h1>
          <TagLine />
          <p className="login-sub relative">
            Ihr KI-Sachbearbeiter für Fragen zu Pflegegrad, Fristen und Schreiben – rund um die Uhr, mit Angabe des antwortenden
            Modells.
          </p>
          <ul className="login-points relative">
            <li>
              <CalendarClock className="i" size={20} aria-hidden="true" />
              <span>
                <strong>Fristen im Blick</strong>
                <span>Offene Aufgaben nach Dringlichkeit sortiert.</span>
              </span>
            </li>
            <li>
              <MessageSquareText className="i" size={20} aria-hidden="true" />
              <span>
                <strong>KI-Sachbearbeiter</strong>
                <span>Antworten im Gesprächsverlauf, bezogen auf die gewählte Person.</span>
              </span>
            </li>
            <li>
              <ShieldCheck className="i" size={20} aria-hidden="true" />
              <span>
                <strong>Ehrlich statt verbindlich</strong>
                <span>Keine Rechts- oder Medizinberatung. Unsicherheit wird benannt.</span>
              </span>
            </li>
          </ul>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-top">
            <ThemeToggle />
          </div>
          <div className="login-card">
            <form className="login-form" onSubmit={(e) => void onSubmit(e)} noValidate aria-describedby={error ? errorId : undefined}>
              <h2 id="login-title" className="login-title">
                Anmelden
              </h2>
              <p className="login-lead">Ihr Arbeitsbereich für Pflegeanträge, Fristen und Schreiben.</p>

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

              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => {
                setEmail('test@test.de');
                passwordRef.current?.focus();
              }}>Demo-Zugang verwenden</button>
              <div className="field">
                <label htmlFor="email">E-Mail-Adresse</label>
                <div className={`input ${error?.code === 'INVALID_CREDENTIALS' || error?.code === 'INVALID_EMAIL' ? 'is-invalid' : ''}`}>
                  <Mail className="i" size={18} aria-hidden="true" />
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
                  <LockKeyhole className="i" size={18} aria-hidden="true" />
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
                {busy ? null : <ArrowRight className="i" size={18} aria-hidden="true" />}
              </button>
              <p className="note">
                <Info className="i" size={15} aria-hidden="true" />
                <span>Zugänge vergibt Ihre Verwaltung. Eine Selbstregistrierung gibt es nicht. Passwort vergessen? Bitte wenden Sie sich an die Verwaltung.</span>
              </p>
              <p className="note">
                <Clock className="i" size={15} aria-hidden="true" />
                <span>{remember ? 'Mit dieser Auswahl bleiben Sie bis zu 30 Tage angemeldet. Beim Öffnen wird Ihr Zugang geprüft. Ihr Passwort wird nicht gespeichert.' : 'Ohne gespeicherte Anmeldung werden Sie nach 15 Minuten ohne Aktivität abgemeldet. Ihr Passwort wird nicht gespeichert.'}</span>
              </p>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
