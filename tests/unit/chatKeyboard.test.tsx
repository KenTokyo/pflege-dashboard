/** Chat mit Tastatur und bei langsamer Antwort (synthetischer Transport, kein Konto). */
import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { signedInApp } from '../support/renderApp';
import { SEED_CONVERSATION } from '../support/seed';

const THREAD = `/gespraeche/${SEED_CONVERSATION}`;

async function startHeld(chunks: string[]) {
  const app = await signedInApp({ modelOperational: true, chat: () => ({ kind: 'answer', chunks, holdBeforeComplete: true }) }, THREAD);
  await app.user.type(await screen.findByLabelText(/Nachricht an den Sachbearbeiter/), 'Frage');
  await app.user.keyboard('{Enter}');
  return app;
}

describe('Chat: Tastatur und Warten', () => {
  it('Abbrechen per Tastatur: Fokus landet im Eingabefeld, nicht auf der Seite', async () => {
    const { user } = await startHeld(['Teil.']);
    const stop = await screen.findByRole('button', { name: 'Antwort abbrechen' });
    stop.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Antwort abgebrochen')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Nachricht an den Sachbearbeiter/)));
  });

  it('Antwort endet, während der Abbruch-Knopf den Fokus hat: Fokus geht ins Eingabefeld', async () => {
    const { fake } = await startHeld(['Fertig.']);
    const stop = await screen.findByRole('button', { name: 'Antwort abbrechen' });
    act(() => stop.focus());
    act(() => fake.release());
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Antwort abbrechen' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Nachricht an den Sachbearbeiter/)));
  });

  it('langsame Antwort ohne ersten Text: sichtbarer Hinweis statt nur Cursor', async () => {
    await startHeld([]);
    expect(await screen.findByText('Denkt nach …')).toBeTruthy();
  });
});
