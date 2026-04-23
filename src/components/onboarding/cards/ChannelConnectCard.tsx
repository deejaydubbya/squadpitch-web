'use client';

import { cn } from '@/lib/utils';
import { OnboardingChannelConnect } from './OnboardingChannelConnect';
import type { Channel } from '@/hooks/useSquadpitch';

interface Props {
  clientId: string | null;
  onDone: () => void;
}

export function ChannelConnectCard({ clientId, onDone }: Props) {
  if (!clientId) {
    return (
      <p className="text-sm text-white-40">Create your workspace first to connect channels.</p>
    );
  }

  return (
    <OnboardingChannelConnect
      clientId={clientId}
      industryKey=""
      channelRecommendations={null}
      onContinue={() => onDone()}
    />
  );
}
