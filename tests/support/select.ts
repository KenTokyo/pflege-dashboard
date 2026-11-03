import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Eigene Auswahl (role combobox) wie ein Mensch bedienen: Knopf öffnen, Eintrag mit diesem Wert anklicken. */
export async function pickOption(user: UserEvent, combobox: HTMLElement, value: string) {
  await user.click(combobox);
  const list = document.getElementById(combobox.getAttribute('aria-controls') ?? '');
  const option = list?.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`);
  if (!option) throw new Error(`Eintrag ${value} nicht gefunden`);
  await user.click(option);
}

/** Gesprächskopf aufklappen (falls zu) und das Modellfeld liefern. */
export async function modelPicker(user: UserEvent) {
  const toggle = await screen.findByRole('button', { name: /^Gesprächsdetails (zeigen|ausblenden)$/ });
  if (toggle.getAttribute('aria-expanded') !== 'true') await user.click(toggle);
  return screen.getByRole('combobox', { name: 'Modell für die nächste Antwort' });
}
