import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { signedInApp } from '../support/renderApp';

describe('Demo-Hinweis', () => {
  it('lässt sich schließen und über die Seitenleiste wieder zeigen', async () => {
    await signedInApp();
    const user = userEvent.setup();
    expect(await screen.findByText('Demo – keine echten Daten eingeben')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Demo-Hinweis zeigen' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Demo-Hinweis schließen' }));
    await waitFor(() => expect(screen.queryByText('Demo – keine echten Daten eingeben')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Demo-Hinweis zeigen' }));
    expect(await screen.findByText('Demo – keine echten Daten eingeben')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Demo-Hinweis zeigen' })).toBeNull();
  });
});
