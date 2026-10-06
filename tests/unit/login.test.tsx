/** Anmeldeformular: Tastaturfluss nach Fehlern und Vorprüfung der E-Mail (synthetischer Transport). */
import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { createFakeBackend, TEST_EMAIL } from '../support/fakeBackend';
import { testClock } from '../support/renderApp';

function setup() {
  const fake = createFakeBackend();
  const signIn = vi.spyOn(fake.auth, 'signIn');
  render(
    <App
      backend={fake}
      queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      history={createMemoryHistory({ initialEntries: ['/'] })}
      clock={testClock().clock}
    />,
  );
  return { fake, signIn, user: userEvent.setup() };
}

describe('Anmeldung: Randfälle', () => {
  it('falsches Passwort: Meldung, Passwort geleert, Fokus zurück im Passwortfeld', async () => {
    const { user, signIn, fake } = setup();
    await user.type(await screen.findByLabelText('E-Mail-Adresse'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Passwort'), 'falsch');
    fake.hold.add('signIn');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(fake.heldCount('signIn')).toBe(1));
    // Wie im Browser: Das gesperrte Feld verliert während der Anmeldung den Fokus.
    expect(screen.getByLabelText('Passwort').hasAttribute('disabled')).toBe(true);
    // jsdom ignoriert blur() auf gesperrten Feldern; Fokus daher über ein Hilfselement auf <body> setzen.
    const helper = document.body.appendChild(document.createElement('button'));
    helper.focus();
    helper.remove();
    expect(document.activeElement).toBe(document.body);
    fake.hold.delete('signIn');
    fake.settleHeld('signIn');
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'E-Mail-Adresse oder Passwort stimmen nicht.');
    const password = screen.getByLabelText('Passwort');
    await waitFor(() => expect(document.activeElement).toBe(password));
    expect((password as HTMLInputElement).value).toBe('');
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(signIn).toHaveBeenCalledTimes(1);
    // Direkt weitertippen und mit Enter erneut senden, ohne Maus.
    await user.keyboard('nochmal-falsch{Enter}');
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));
  });

  it('unvollständige E-Mail-Adresse: kein Aufruf beim Auth-Server, Fokus im E-Mail-Feld', async () => {
    const { user, signIn } = setup();
    await user.type(await screen.findByLabelText('E-Mail-Adresse'), 'name@beispiel');
    await user.type(screen.getByLabelText('Passwort'), 'irgendwas');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/vollständige E-Mail-Adresse/);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('E-Mail-Adresse')));
    expect(signIn).not.toHaveBeenCalled();
  });

  it('Leerzeichen um die Adresse werden entfernt', async () => {
    const { user, signIn } = setup();
    await user.type(await screen.findByLabelText('E-Mail-Adresse'), `  ${TEST_EMAIL}  `);
    await user.type(screen.getByLabelText('Passwort'), 'falsch');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(TEST_EMAIL, 'falsch'));
  });
});
