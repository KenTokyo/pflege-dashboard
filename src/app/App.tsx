import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type RouterHistory } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AuthProvider } from '../auth/AuthProvider';
import type { Clock } from '../auth/activity';
import { BackendProvider } from '../services/BackendContext';
import type { Backend } from '../services/types';
import { createAppRouter } from './router';
import { ThemeProvider } from './ThemeProvider';
import { attachMicroInteractions } from '../motion/micro';
import { installSpringCss } from '../motion/tokens';

// Federkurven stehen vor dem ersten Bild, damit nichts mit der Rückfallkurve einfliegt.
if (typeof window !== 'undefined') installSpringCss();

type AppProps = { backend: Backend; queryClient: QueryClient; history?: RouterHistory; clock?: Clock };

export function App({ backend, queryClient, history, clock }: AppProps) {
  const [router] = useState(() => createAppRouter(history));
  useEffect(() => attachMicroInteractions(), []);
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BackendProvider backend={backend}>
          <AuthProvider {...(clock ? { clock } : {})}>
            <RouterProvider router={router} />
          </AuthProvider>
        </BackendProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
