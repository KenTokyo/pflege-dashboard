import { useParams } from '@tanstack/react-router';
import { ChatPage } from './ChatPage';

export function ChatIndexRoute() {
  return <ChatPage conversationId={null} />;
}

export function ChatRoute() {
  const { conversationId } = useParams({ from: '/app/gespraeche/$conversationId' });
  return <ChatPage key={conversationId} conversationId={conversationId} />;
}
