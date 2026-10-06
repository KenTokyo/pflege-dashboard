import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import type { Clock } from '../../src/auth/activity';
import { createFakeBackend, TEST_EMAIL, TEST_PASSWORD, type FakeOptions } from './fakeBackend';

/** Uhr, deren Timer der Test gezielt auslöst. */
export function testClock() {
  let t = Date.now();
  const timers = new Map<number, { at: number; fn: () => void }>();
  let seq = 0;
  const clock: Clock = {
    now: () => t,
    setTimeout: (fn, ms) => {
      seq += 1;
      timers.set(seq, { at: t + ms, fn });
      return seq;
    },
    clearTimeout: (h) => timers.delete(h as number),
  };
  const advance = (ms: number) => {
    t += ms;
    for (const [id, timer] of [...timers.entries()].sort((a, b) => a[1].at - b[1].at)) {
      if (timer.at <= t && timers.delete(id)) timer.fn();
    }
  };
  return { clock, advance, timers };
}

/** App mit synthetischem Transport rendern und über das echte Login-Formular anmelden. */
export async function signedInApp(options: FakeOptions = {}, path = '/') {
  const fake = createFakeBackend(options);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const c = testClock();
  const history = createMemoryHistory({ initialEntries: [path] });
  render(<App backend={fake} queryClient={queryClient} history={history} clock={c.clock} />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('E-Mail-Adresse'), TEST_EMAIL);
  await user.type(screen.getByLabelText('Passwort'), TEST_PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Anmelden' }));
  return { fake, queryClient, history, user, ...c };
}
