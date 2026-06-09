import { Suspense } from 'react';
import { MessagesView } from '@/components/messages/messages-view';

export default function EmployerMessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesView />
    </Suspense>
  );
}
