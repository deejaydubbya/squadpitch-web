'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChannelSettings, type Channel } from '@/hooks/useSquadpitch';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function ChannelSelectCard({ session, clientId, onSelection }: Props) {
  const { data: channelSettings } = useChannelSettings(clientId);
  const isCampaign = session.mode === 'campaign';

  const connectedChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings
      .filter((cs) => cs.isEnabled)
      .map((cs) => cs.channel);
  }, [channelSettings]);

  // Local selection state for multi-select (campaign mode)
  const [selected, setSelected] = useState<Channel[]>(session.channels);

  const toggle = (ch: Channel) => {
    if (isCampaign) {
      setSelected((prev) =>
        prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
      );
    } else {
      // Quick post — single select, immediately confirm
      onSelection(
        { type: 'SET_QUICK_POST_CHANNEL', payload: ch },
        `Channel: ${CHANNEL_REGISTRY[ch]?.label ?? ch}`
      );
    }
  };

  const confirmMulti = () => {
    if (selected.length === 0) return;
    const labels = selected.map((ch) => CHANNEL_REGISTRY[ch]?.label ?? ch).join(', ');
    onSelection(
      { type: 'SET_CHANNELS', payload: selected },
      `Channels: ${labels}`
    );
  };

  if (!channelSettings) {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
        <span className="text-xs text-white-40">Loading channels...</span>
      </div>
    );
  }

  if (connectedChannels.length === 0) {
    return (
      <div className="py-3 text-center">
        <p className="text-xs text-white-40">No channels connected to this workspace.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {connectedChannels.map((ch) => {
          const reg = CHANNEL_REGISTRY[ch];
          if (!reg || reg.comingSoon) return null;
          const isActive = isCampaign ? selected.includes(ch) : session.quickPostChannel === ch;

          return (
            <button
              key={ch}
              onClick={() => toggle(ch)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                isActive
                  ? 'border-accent-green-110 bg-accent-green-110/10 text-accent-green-110'
                  : 'border-white-10 text-white-60 hover:border-white-20 hover:bg-white-5'
              )}
            >
              {isActive && <Check className="w-3 h-3" />}
              {reg.label}
            </button>
          );
        })}
      </div>

      {/* Confirm button for campaign multi-select */}
      {isCampaign && (
        <button
          onClick={confirmMulti}
          disabled={selected.length === 0}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            selected.length > 0
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90'
              : 'bg-white-10 text-white-30 cursor-not-allowed'
          )}
        >
          Confirm {selected.length > 0 ? `(${selected.length})` : ''}
        </button>
      )}
    </div>
  );
}
