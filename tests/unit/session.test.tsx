import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { IDLE_MS } from '../../src/auth/AuthProvider';
import { createFakeBackend, TEST_EMAIL, TEST_PASSWORD } from '../support/fakeBackend';

import { signedInApp } from '../support/renderApp';

describe('Anmeldung und Sitzung', () => {
  it('ohne Sitzung landet jede geschützte Route auf der Anmeldung', async () => {
    const fake = createFakeBackend();
    const history = createMemoryHistory({ initialEntries: ['/gespraeche'] });
    render(<App backend={fake} queryClient={new QueryClient()} history={history} />);
    expect(await screen.findByRole('heading', { name: 'Anmelden' })).toBeTruthy();
    expect(history.location.pathname).toBe('/anmelden');
    expect(screen.getByText('Demo – keine echten Daten eingeben')).toBeTruthy();
  });

  it('falsche Zugangsdaten: verständliche Meldung, Passwortfeld geleert', async () => {
    const fake = createFakeBackend();
    render(<App backend={fake} queryClient={new QueryClient()} history={createMemoryHistory({ initialEntries: ['/'] })} />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('E-Mail-Adresse'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Passwort'), 'falsch');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect((await screen.findByRole('alert')).textContent).toContain('E-Mail-Adresse oder Passwort stimmen nicht.');
    expect(screen.getByLabelText<HTMLInputElement>('Passwort').value).toBe('');
  });

  it('nach Anmeldung: Dashboard aus Seeddaten und genau ein Server-Touch', async () => {
    const { fake } = await signedInApp();
    expect((await screen.findAllByText(/Martha/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Widerspruch mit Beratungsstelle prüfen')).length).toBeGreaterThan(0);
    await waitFor(() => expect(fake.calls.touch).toBe(1));
  });

  it('15 Minuten ohne Aktivität: Server-Ende, Cache leer, lokal abgemeldet, Grund angezeigt', async () => {
    const { fake, queryClient, history, advance } = await signedInApp();
    await screen.findAllByText('Widerspruch mit Beratungsstelle prüfen');
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);
    act(() => advance(IDLE_MS));
    expect(await screen.findByText('Sie wurden nach 15 Minuten ohne Aktivität abgemeldet.')).toBeTruthy();
    expect(fake.calls.end).toBe(1);
    expect(fake.calls.signOut).toBe(1);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(history.location.pathname).toBe('/anmelden');
    expect(await fake.auth.getSession()).toBeNull();
  });

  it('Netzfehler beim Server-Ende verhindert die lokale Abmeldung nicht', async () => {
    const { fake, queryClient, user } = await signedInApp();
    fake.failSessionEnd = true;
    await screen.findAllByText('Widerspruch mit Beratungsstelle prüfen');
    await user.click(screen.getAllByRole('button', { name: /Konto/ })[0] as HTMLElement);
    await user.click(await screen.findByRole('menuitem', { name: 'Abmelden' }));
    expect(await screen.findByText('Sie wurden abgemeldet.')).toBeTruthy();
    expect(fake.calls.end).toBe(1);
    expect(fake.calls.signOut).toBe(1);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('SESSION_EXPIRED beim Touch meldet ab, ohne die Sitzung wiederzubeleben', async () => {
    const fake = createFakeBackend();
    fake.touchError = 'SESSION_EXPIRED';
    render(<App backend={fake} queryClient={new QueryClient()} history={createMemoryHistory({ initialEntries: ['/'] })} />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('E-Mail-Adresse'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Passwort'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(await screen.findByText('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.')).toBeTruthy();
    // Abgelaufene Sitzung wird serverseitig nicht noch einmal "beendet".
    expect(fake.calls.end).toBe(0);
    expect(fake.calls.signOut).toBe(1);
  });

  it('nach erneuter Anmeldung zurück auf die zuvor geöffnete Seite, fremde Ziele werden ignoriert', async () => {
    const { history } = await signedInApp({}, '/aufgaben');
    await waitFor(() => expect(history.location.pathname).toBe('/aufgaben'));
  });

  it('fremdes Rücksprungziel wird ignoriert', async () => {
    const { history } = await signedInApp({}, '/anmelden?weiter=%2F%2Fboese.example');
    await screen.findAllByText('Widerspruch mit Beratungsstelle prüfen');
    expect(history.location.pathname).toBe('/');
  });

  it('Abmeldung bricht einen laufenden Stream ab', async () => {
    const { fake, user, advance } = await signedInApp(
      { modelOperational: true, chat: () => ({ kind: 'answer', chunks: ['Teil'], holdBeforeComplete: true }) },
      '/gespraeche/10000000-0000-4000-8000-000000000050',
    );
    const box = await screen.findByLabelText(/Nachricht an den Sachbearbeiter/);
    await user.type(box, 'Welche Unterlagen brauche ich?');
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Teil')).toBeTruthy();
    act(() => advance(IDLE_MS));
    expect(await screen.findByText('Sie wurden nach 15 Minuten ohne Aktivität abgemeldet.')).toBeTruthy();
    expect(fake.calls.chat).toHaveLength(1);
    expect(screen.queryByText('Teil')).toBeNull();
  });
});
