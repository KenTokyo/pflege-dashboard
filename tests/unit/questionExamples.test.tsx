import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QUESTION_GROUPS } from '../../src/routes/chat/questionExamples';
import { signedInApp } from '../support/renderApp';
import { SEED_CONVERSATION } from '../support/seed';

const THREAD = `/gespraeche/${SEED_CONVERSATION}`;
// JSDOM emuliert weder Top-Layer noch die native Fokusfalle; dafür gibt es die separate Browserprüfung.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'); Reflect.deleteProperty(HTMLDialogElement.prototype, 'close'); });

describe('Beispielfragen im Gespräch', () => {
  it('alle Alltagsthemen erreichbar; Auswahl ist ein bearbeitbarer Entwurf, kein Versand', async () => {
    const { user, fake } = await signedInApp({ modelOperational: true }, THREAD);
    await user.click(await screen.findByRole('button', { name: 'Was kann ich fragen?' }));
    const dialog = screen.getByRole('dialog', { name: 'Was kann ich fragen?' });
    expect(within(dialog).getByText(/Martha Beispielwald/)).toBeTruthy();
    for (const group of QUESTION_GROUPS) {
      await user.click(within(dialog).getByRole('button', { name: group.label }));
      expect(within(dialog).getAllByRole('radio')).toHaveLength(3);
    }
    await user.click(within(dialog).getByRole('button', { name: 'Aufgaben ordnen' }));
    await user.click(within(dialog).getByRole('radio', { name: /Was muss zuerst erledigt werden/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Frage übernehmen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const input = screen.getByLabelText<HTMLTextAreaElement>('Nachricht an den Sachbearbeiter');
    expect(input.value).toBe(QUESTION_GROUPS[1].questions[0].text);
    expect(document.activeElement).toBe(input);
    expect(fake.calls.chat).toHaveLength(0);
    await user.type(input, ' Bitte kurz.');
    expect(input.value).toContain('Bitte kurz.');
  });

  it('vorhandener Entwurf bleibt wörtlich erhalten, Auswahl wird nur angehängt', async () => {
    const { user, fake } = await signedInApp({ modelOperational: true }, THREAD);
    const input = await screen.findByLabelText<HTMLTextAreaElement>('Nachricht an den Sachbearbeiter');
    await user.type(input, 'Meine eigene Frage.');
    await user.click(screen.getByRole('button', { name: 'Was kann ich fragen?' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Ihr bisheriger Text bleibt erhalten/)).toBeTruthy();
    await user.click(within(dialog).getByRole('radio', { name: /Was ist gerade wichtig/ }));
    await user.click(within(dialog).getByRole('button', { name: 'An meinen Text anhängen' }));
    expect(input.value).toBe(`Meine eigene Frage.\n\n${QUESTION_GROUPS[0].questions[0].text}`);
    expect(fake.calls.chat).toHaveLength(0);
  });

  it('Schließen verändert keinen Entwurf; Themenwechsel verwirft unsichtbare Auswahl', async () => {
    const { user } = await signedInApp({}, THREAD);
    const input = await screen.findByLabelText<HTMLTextAreaElement>('Nachricht an den Sachbearbeiter');
    await user.type(input, 'Bleibt stehen.');
    await user.click(screen.getByRole('button', { name: 'Was kann ich fragen?' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: /Was ist gerade wichtig/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Einfach verstehen' }));
    expect(within(dialog).getByRole('button', { name: 'An meinen Text anhängen' }).hasAttribute('disabled')).toBe(true);
    await user.click(within(dialog).getByRole('button', { name: 'Beispiele schließen' }));
    expect(input.value).toBe('Bleibt stehen.');
  });
});
