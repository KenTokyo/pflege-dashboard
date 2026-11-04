import { lazy, Suspense } from 'react';
import { useLocation, useParams } from '@tanstack/react-router';
import { useDesign } from '../app/ThemeProvider';
import { Loading } from '../components/States';
import { ChatPage } from './ChatPage';
import { NewChat } from './chat/NewChat';

// Instrument behält die Übersicht als Startseite (unverändert); Tagwerk beginnt mit dem neuen Gespräch.
const DashboardPage = lazy(() => import('./DashboardPage').then((m) => ({ default: m.DashboardPage })));

export function ChatIndexRoute() {
  const { design } = useDesign();
  const pathname = useLocation({ select: (l) => l.pathname });
  if (design !== 'instrument') return <NewChat />;
  if (pathname === '/') return <Suspense fallback={<Loading label="Seite wird geladen …" />}><DashboardPage /></Suspense>;
  return <ChatPage conversationId={null} />;
}

export function ChatRoute() {
  const { conversationId } = useParams({ from: '/app/gespraeche/$conversationId' });
  return <ChatPage key={conversationId} conversationId={conversationId} />;
}
