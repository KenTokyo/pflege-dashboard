import type { RefObject, SubmitEvent } from 'react';
import { useTheme } from '../../app/ThemeProvider';
import { DemoBanner } from '../../components/DemoBanner';
import type { AppError } from '../../services/errors';
import { Icon } from '../grundlage/Icon';
import { Metric } from '../grundlage/Metric';
import { Reveal } from '../grundlage/Reveal';
import { StateDrawing } from '../zustaende/StateDrawing';
import '../grundlage/controls.css';
import './anmeldung.css';

type Props = {
  email: string; password: string; remember: boolean; busy: boolean; error: AppError | null; errorId: string;
  reason: string | null; emailRef: RefObject<HTMLInputElement | null>; passwordRef: RefObject<HTMLInputElement | null>;
  setEmail: (value: string) => void; setPassword: (value: string) => void; setRemember: (value: boolean) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>;
};

export function InstrumentLogin(props: Props) {
  const { theme, toggle } = useTheme();
  const { email, password, remember, busy, error, errorId, reason, emailRef, passwordRef,
    setEmail, setPassword, setRemember, onSubmit } = props;
  const invalidEmail = error?.code === 'INVALID_EMAIL' || error?.code === 'INVALID_CREDENTIALS';
  const invalidPassword = error?.code === 'INVALID_CREDENTIALS';
  return <>
    <DemoBanner />
    <header className="in-login-top">
      <span className="in-login-brand"><Icon name="care" size={26} />Pflege-Dashboard</span>
      <button type="button" className="in-button" onClick={toggle} aria-label={`Zu ${theme === 'dunkel' ? 'hellem' : 'dunklem'} Design wechseln`}>
        <Icon name={theme === 'dunkel' ? 'moon' : 'sun'} /><span>{theme === 'dunkel' ? 'Dunkel' : 'Hell'}</span>
      </button>
    </header>
    <main id="main" className="in-login-main" tabIndex={-1}>
      <Reveal className="in-login-intro" stage="frame">
        <div className="in-login-intro-head"><span className="in-badge">Zugang zum Arbeitsbereich</span></div>
        <Reveal stage="head"><h1>Anmelden</h1><p>Pflegeanträge, Fristen und Gespräche</p></Reveal>
        <Reveal stage="data" className="in-login-illustration"><StateDrawing kind="access" /></Reveal>
        <div className="in-login-scope">
          <div><Icon name="task" /><span>Aufgaben und Fristen</span></div>
          <div><Icon name="conversation" /><span>Gespräche mit dem KI-Sachbearbeiter</span></div>
          <div><Icon name="document" /><span>Schreiben und Dokumente</span></div>
        </div>
        <p className="in-hint"><Icon name="shield" size={16} />Keine verbindliche Rechts- oder Medizinberatung.</p>
      </Reveal>
      <Reveal className="in-card in-login-card" index={1}>
        <div className="in-login-form-head"><Icon name="lock" /><div><h2>Ihr Zugang</h2><p>E-Mail-Adresse und Passwort Ihrer Verwaltung</p></div></div>
        <form className="in-login-form" onSubmit={(event) => void onSubmit(event)} noValidate
          aria-describedby={error ? errorId : undefined} aria-busy={busy}>
          {reason && !error ? <div className="in-notice" role="status"><Icon name="shield" /><span>{reason}</span></div> : null}
          {error ? <div className="in-notice in-notice-danger" role="alert" id={errorId}>
            <Icon name="warning" /><span>{error.message}</span></div> : null}
          <label className="in-field" htmlFor="email"><span className="in-field-label">E-Mail-Adresse</span>
            <span className={`in-input ${invalidEmail ? 'in-input-invalid' : ''}`}><Icon name="mail" />
              <input id="email" ref={emailRef} aria-invalid={invalidEmail} type="email" inputMode="email" autoComplete="username"
                required placeholder="name@beispiel.de" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
            </span>
          </label>
          <label className="in-field" htmlFor="password"><span className="in-field-label">Passwort</span>
            <span className={`in-input ${invalidPassword ? 'in-input-invalid' : ''}`}><Icon name="lock" />
              <input id="password" ref={passwordRef} aria-invalid={invalidPassword} type="password" autoComplete="current-password"
                required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
            </span>
          </label>
          <label className="in-login-remember"><input type="checkbox" checked={remember}
            onChange={(event) => setRemember(event.target.checked)} disabled={busy} /><span>Anmeldung auf diesem Gerät speichern</span></label>
          <Reveal stage="metric" className="in-login-policy">
            <Metric value={remember ? 30 : 15} unit={remember ? 'Tage' : 'Minuten'}
              label={remember ? 'Anmeldung gespeichert bis zu' : 'Abmeldung ohne Aktivität nach'} tone="deadline" />
            <p>{remember ? 'Beim Öffnen wird Ihr Zugang geprüft. Abmelden entfernt die gespeicherte Sitzung.'
              : 'Ohne Speichern endet die Sitzung spätestens nach 8 Stunden.'} Ihr Passwort wird nicht gespeichert.</p>
          </Reveal>
          <Reveal stage="action" className="in-login-actions">
            <button type="submit" className="in-button in-button-primary" disabled={busy || !email.trim() || !password}>
              <span>{busy ? 'Wird angemeldet …' : 'Anmelden'}</span>{busy ? null : <Icon name="arrow" />}</button>
            <button type="button" className="in-button" disabled={busy} onClick={() => { setEmail('test@test.de'); passwordRef.current?.focus(); }}>
              Demo-Zugang verwenden</button>
          </Reveal>
          <p className="in-hint"><Icon name="person" size={16} /><span>Zugänge vergibt Ihre Verwaltung. Eine Selbstregistrierung gibt es nicht.
            Passwort vergessen? Bitte wenden Sie sich an die Verwaltung.</span></p>
        </form>
      </Reveal>
    </main>
  </>;
}
