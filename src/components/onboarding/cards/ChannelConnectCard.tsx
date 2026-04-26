'use client';

import { OnboardingChannelConnect } from './OnboardingChannelConnect';
import type { Channel } from '@/hooks/useSquadpitch';

interface Props {
  clientId: string | null;
  onDone: (connectedChannels: Channel[]) => void;
  onSkip?: () => void;
}

export function ChannelConnectCard({ clientId, onDone, onSkip }: Props) {
  if (!clientId) {
    return (
      <p className="text-sm text-white-40">Create your workspace first to connect channels.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <OnboardingChannelConnect
        clientId={clientId}
        industryKey=""
        channelRecommendations={null}
        onContinue={(channels) => onDone(channels)}
      />
      {onSkip && (
        <button
          onClick={onSkip}
          className="text-xs text-white-40 hover:text-white-60 transition-colors self-start"
        >
          Skip — I&apos;ll connect channels later
        </button>
      )}
    </div>
  );
}
