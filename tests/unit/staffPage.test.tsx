import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../src/services/errors';
import { signedInApp } from '../support/renderApp';
import { MARTHA } from '../support/seed';
import { createFakeBackend } from '../support/fakeBackend';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'); Reflect.deleteProperty(HTMLDialogElement.prototype, 'close'); });

describe('Sachbearbeiter-Test: angemeldete Arbeitsansicht', () => {
  it('Direktlink führt durch echte App-Sitzung; Sichtwechsel erhält Rolle und Daten', async () => {
    const { fake, user, history } = await signedInApp({ role: 'member' }, '/sachbearbeitung');
    await screen.findByRole('heading', { name: 'Die richtigen Fälle im Blick.' });
    expect(fake.state.workspace.role).toBe('member');
    expect(screen.getByText(/ändert keine Zugriffsrechte/)).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Kundenansicht' }));
    await waitFor(() => expect(history.location.pathname).toBe('/'));
    await screen.findByRole('heading', { name: /Guten (Morgen|Tag|Abend)/ });
    await user.click(await screen.findByRole('link', { name: 'Sachbearbeiter-Test' }));
    await screen.findByRole('heading', { name: 'Die richtigen Fälle im Blick.' });
    expect(fake.calls.chat).toHaveLength(0);
  });

  it('Beispieldialoge ergeben keine erfundenen echten KI-Aufrufe', async () => {
    await signedInApp({}, '/sachbearbeitung');
    const region = await screen.findByRole('region', { name: 'Echte Modellnutzung' });
    await within(region).findByText('Noch keine abgeschlossene Modellnutzung gespeichert.');
    expect(within(region).getByText(/0 echte Anfragen/)).toBeTruthy();
    const row = screen.getByRole('listitem', { name: 'Fall Martha Beispielwald' });
    expect(within(row).getByText('0 echte KI-Antworten')).toBeTruthy();
    expect(within(row).getByText('1')).toBeTruthy();
  });

  it('zeigt gelieferte echte Nutzungswerte unverändert, ohne Kosten zu behaupten', async () => {
    const overview = await createFakeBackend().data.getStaffOverview('synthetisch');
    overview.totals.requests = 7;
    overview.totals.completedRequests = 5;
    overview.totals.failedRequests = 1;
    overview.totals.interruptedRequests = 1;
    overview.usage = [{ modelId: 'test-model', provider: 'opencode', providerModelId: 'deepseek-v4.1-flash', displayName: 'DeepSeek · synthetischer Prüfwert', requests: 5, inputTokens: 1234, outputTokens: 456, costMicrousd: 0, estimatedRequests: 0 }];
    await signedInApp({ staffOverview: overview }, '/sachbearbeitung');
    const region = await screen.findByRole('region', { name: 'Echte Modellnutzung' });
    await within(region).findByText('DeepSeek · synthetischer Prüfwert');
    expect(within(region).getByText(/7 echte Anfragen/)).toBeTruthy();
    expect(within(region).getByText('1.690')).toBeTruthy();
    expect(within(region).getByText(/1.234 ein \/ 456 aus/)).toBeTruthy();
    expect(within(region).queryByText(/0,00/)).toBeNull();
  });

  it('Filteranfrage per Tastatur und leere Auswahl; keinerlei Modellaufruf', async () => {
    const { user, fake } = await signedInApp({}, '/sachbearbeitung');
    await user.click(await screen.findByText('Arbeitsansicht per Anfrage'));
    const input = await screen.findByLabelText('Filteranfrage');
    await waitFor(() => expect(input.hasAttribute('disabled')).toBe(false));
    await user.type(input, 'Offene Aufgaben nach Frist{Enter}');
    await screen.findByRole('heading', { name: /Offene Aufgaben/ });
    expect(screen.getByText('Offene Aufgaben · alle Personen · nach Frist')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText(/Sortieren nach/), 'priority');
    const list = screen.getByRole('region', { name: /Offene Aufgaben/ });
    expect(within(list).getAllByRole('heading', { level: 3 })[0]?.textContent).toBe('Widerspruch mit Beratungsstelle prüfen');
    await user.clear(input);
    await user.type(input, 'Daten zu Unbekannt nach Frist{Enter}');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(fake.calls.chat).toHaveLength(0);
  });

  it('Fall zeigt gespeicherte Daten; KI-Einstieg übernimmt Person ohne automatischen Versand', async () => {
    const { user, fake } = await signedInApp({ modelOperational: true }, '/sachbearbeitung');
    await user.click(await screen.findByRole('button', { name: 'Fall öffnen: Martha Beispielwald' }));
    const dialog = screen.getByRole('dialog', { name: 'Martha Beispielwald' });
    expect(within(dialog).getByText(/Vollständig erfundene Demoperson/)).toBeTruthy();
    await within(dialog).findByRole('link', { name: /Widerspruch vorbereiten/ });
    await user.click(within(dialog).getByRole('button', { name: 'KI zu diesem Fall fragen' }));
    const newDialog = screen.getByRole('dialog', { name: 'Neues Gespräch' });
    expect(within(newDialog).getByLabelText<HTMLSelectElement>('Bezug zu einer Person').value).toBe(MARTHA);
    expect(fake.calls.chat).toHaveLength(0);
    await user.type(within(newDialog).getByLabelText('Titel'), 'Fragen zur Vertretung');
    await user.click(within(newDialog).getByRole('button', { name: 'Gespräch anlegen' }));
    await waitFor(() => expect(fake.state.conversations.find((c) => c.title === 'Fragen zur Vertretung')?.care_recipient_id).toBe(MARTHA));
    expect(fake.calls.chat).toHaveLength(0);
  });

  it('Escape schließt die Fallansicht; native Fokusfalle bleibt Browserprüfpunkt', async () => {
    const { user } = await signedInApp({}, '/sachbearbeitung');
    await user.click(await screen.findByRole('button', { name: 'Fall öffnen: Martha Beispielwald' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Fehler und laufende Aktualisierung werden nicht zu Nullstatistiken', async () => {
    const { fake, user } = await signedInApp({}, '/sachbearbeitung');
    await screen.findByText('Noch keine abgeschlossene Modellnutzung gespeichert.');
    let reject!: (error: unknown) => void;
    fake.data.getStaffOverview = () => new Promise((_resolve, r) => { reject = r; });
    await user.click(screen.getByRole('button', { name: 'Aktualisieren' }));
    expect(screen.getByRole('button', { name: 'Wird aktualisiert …' }).hasAttribute('disabled')).toBe(true);
    act(() => reject(new AppError('NETWORK')));
    expect(await screen.findByText('Gesprächszahlen und Modellnutzung nicht verfügbar')).toBeTruthy();
    expect(screen.queryByText('0 echte KI-Antworten')).toBeNull();
  });

  it('leerer Workspace und Abmelden entfernen private Fallansicht', async () => {
    const { user, queryClient } = await signedInApp({ extend: (s) => { s.people = []; s.tasks = []; s.conversations = []; } }, '/sachbearbeitung');
    await screen.findByText('Noch keine Pflegefälle gespeichert');
    const account = screen.getAllByRole('button', { name: /Konto:/ })[0];
    if (!account) throw new Error('Kontomenü fehlt');
    await user.click(account);
    await user.click(screen.getByRole('menuitem', { name: 'Abmelden' }));
    await screen.findByRole('button', { name: 'Anmelden' });
    expect(screen.queryByRole('heading', { name: 'Die richtigen Fälle im Blick.' })).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
