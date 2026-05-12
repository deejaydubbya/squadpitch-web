'use client';

// Unified Create entry — drops straight into the AI Assistant. The
// assistant's first interactive card is its own Campaign/Single Post
// mode-pick, so no separate landing screen is needed.
//
// Deep links still work:
//   /create?mode=single   → assistant starts with mode pre-set to quick_post
//   /create?mode=campaign → assistant starts with mode pre-set to campaign
//   (anything else)       → assistant opens at its mode-pick card

import { useParams, useSearchParams } from 'next/navigation';
import { ConversationalShell } from '@/components/studio/assistant-v2/ConversationalShell';

export default function CreatePage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const searchParams = useSearchParams();

  const rawMode = searchParams.get('mode');
  const initialMode =
    rawMode === 'campaign'
      ? ('campaign' as const)
      : rawMode === 'single'
        ? ('quick_post' as const)
        : undefined;

  return (
    <div className="fixed inset-0 lg:left-64 z-10 bg-sp-bg">
      <ConversationalShell clientId={clientId} initialMode={initialMode} />
    </div>
  );
}
