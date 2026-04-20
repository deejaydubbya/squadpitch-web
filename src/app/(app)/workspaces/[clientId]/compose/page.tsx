'use client';

import { useParams } from 'next/navigation';
import { ConversationalShell } from '@/components/studio/assistant-v2/ConversationalShell';

export default function ComposePage() {
  const params = useParams<{ clientId: string }>();
  // Shell manages its own full-height layout — break out of the parent's padding/scroll wrapper
  return (
    <div className="fixed inset-0 lg:left-64 z-10 bg-sp-bg">
      <ConversationalShell clientId={params.clientId} />
    </div>
  );
}
