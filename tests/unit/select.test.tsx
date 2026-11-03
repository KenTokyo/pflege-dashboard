import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../src/app/ThemeProvider';
import { Select } from '../../src/components/Select';

function Demo() {
  const [value, setValue] = useState('a');
  return (
    <ThemeProvider>
      <Select aria-label="Farbe" value={value} onChange={setValue}
        options={[{ value: 'a', label: 'Apfel' }, { value: 'b', label: 'Birne', disabled: true }, { value: 'c', label: 'Clementine' }]} />
    </ThemeProvider>
  );
}

describe('Tagwerk-Auswahl', () => {
  it('per Tastatur: öffnen, gesperrten Eintrag überspringen, wählen, Fokus zurück', async () => {
    render(<Demo />);
    const user = userEvent.setup();
    const box = screen.getByRole('combobox', { name: 'Farbe' });
    box.focus();
    await user.keyboard('{ArrowDown}');
    expect(box.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('listbox', { name: 'Farbe' });
    await user.keyboard('{ArrowDown}');
    expect(list.getAttribute('aria-activedescendant')).toMatch(/-2$/);
    await user.keyboard('{Enter}');
    expect((box as HTMLButtonElement).value).toBe('c');
    expect(document.activeElement).toBe(box);
  });

  it('Esc schließt ohne Änderung, Tippen springt zum Eintrag', async () => {
    render(<Demo />);
    const user = userEvent.setup();
    const box = screen.getByRole('combobox', { name: 'Farbe' });
    await user.click(box);
    await user.keyboard('cl');
    expect(screen.getByRole('listbox').getAttribute('aria-activedescendant')).toMatch(/-2$/);
    await user.keyboard('{Escape}');
    expect(box.getAttribute('aria-expanded')).toBe('false');
    expect((box as HTMLButtonElement).value).toBe('a');
  });
});
