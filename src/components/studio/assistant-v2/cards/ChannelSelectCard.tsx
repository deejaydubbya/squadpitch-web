'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  useChannelSettings,
  useChannelConnections,
  type Channel,
  type ChannelConnection,
} from '@/hooks/useSquadpitch';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function ChannelSelectCard({ session, clientId, onSelection }: Props) {
  const { data: channelSettings } = useChannelSettings(clientId);
  const { data: connections, isLoading: connectionsLoading } = useChannelConnections(clientId);
  const isCampaign = session.mode === 'campaign';

  // Build map of channel → display name from OAuth connections
  const connectionDisplayNames = useMemo(() => {
    const map = new Map<Channel, string>();
    if (!connections) return map;
    for (const conn of connections) {
      if (conn.status === 'CONNECTED' && conn.displayName) {
        map.set(conn.channel, conn.displayName);
      }
    }
    return map;
  }, [connections]);

  // Only show channels with an active OAuth connection
  const availableChannels = useMemo(() => {
    if (!connections) return [];

    // Build set of connected channels
    const connected = new Set<Channel>();
    for (const conn of connections) {
      if (conn.status === 'CONNECTED') {
        connected.add(conn.channel);
      }
    }

    // If channel settings exist, respect isEnabled as an additional filter
    if (channelSettings) {
      const enabledAndConnected: Channel[] = [];
      for (const cs of channelSettings) {
        if (cs.isEnabled && connected.has(cs.channel)) {
          enabledAndConnected.push(cs.channel);
        }
      }
      // Also include connected channels that don't have settings yet
      connected.forEach((ch) => {
        if (!enabledAndConnected.includes(ch)) {
          enabledAndConnected.push(ch);
        }
      });
      return enabledAndConnected;
    }

    const result: Channel[] = [];
    connected.forEach((ch) => result.push(ch));
    return result;
  }, [channelSettings, connections]);

  // Local selection state for multi-select (campaign mode)
  const [selected, setSelected] = useState<Channel[]>(session.channels);

  const toggle = (ch: Channel) => {
    if (isCampaign) {
      setSelected((prev) =>
        prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
      );
    } else {
      // Quick post — single select, immediately confirm
      const displayName = connectionDisplayNames.get(ch);
      const label = displayName
        ? `${CHANNEL_REGISTRY[ch]?.label ?? ch} (${displayName})`
        : (CHANNEL_REGISTRY[ch]?.label ?? ch);
      onSelection(
        { type: 'SET_QUICK_POST_CHANNEL', payload: ch },
        `Channel: ${label}`
      );
    }
  };

  const confirmMulti = () => {
    if (selected.length === 0) return;
    const labels = selected.map((ch) => {
      const displayName = connectionDisplayNames.get(ch);
      const platformLabel = CHANNEL_REGISTRY[ch]?.label ?? ch;
      return displayName ? `${platformLabel} (${displayName})` : platformLabel;
    }).join(', ');
    onSelection(
      { type: 'SET_CHANNELS', payload: selected },
      `Channels: ${labels}`
    );
  };

  if (connectionsLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
        <span className="text-xs text-white-40">Loading channels...</span>
      </div>
    );
  }

  if (availableChannels.length === 0) {
    return (
      <div className="py-4 text-center space-y-2">
        <p className="text-xs text-white-40">No channels connected yet.</p>
        <Link
          href={`/studio/settings/channels`}
          className="inline-block text-xs text-accent-green-110 hover:underline"
        >
          Connect channels
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {availableChannels.map((ch) => {
          const reg = CHANNEL_REGISTRY[ch];
          if (!reg || reg.comingSoon) return null;
          const isActive = isCampaign ? selected.includes(ch) : session.quickPostChannel === ch;
          const displayName = connectionDisplayNames.get(ch);

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
              <span>{reg.label}</span>
              {displayName && (
                <span className="text-[10px] opacity-60 truncate max-w-[120px]">{displayName}</span>
              )}
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
