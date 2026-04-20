'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChannelSettings, type Channel } from '@/hooks/useSquadpitch';
import { useCampaignIntelligence } from '@/hooks/useCampaignIntelligence';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import { getCampaignTypeOptions, getDefaultChannels } from '@/lib/assistant/defaults';
import type { AssistantAction, AssistantCampaignType, AssistantSessionState } from '@/lib/assistant/types';
import { useResolvedDefaults } from '@/hooks/useContentPreferences';

interface Props {
  session: AssistantSessionState;
  dispatch: React.Dispatch<AssistantAction>;
  clientId: string;
}

export function CampaignConfigStep({ session, dispatch, clientId }: Props) {
  const { data: channelSettings } = useChannelSettings(clientId);

  const connectedChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings
      .filter((cs) => cs.isEnabled)
      .map((cs) => cs.channel);
  }, [channelSettings]);

  const { campaignTypeRec, channelRec } = useCampaignIntelligence(session, connectedChannels, undefined);
  const campaignTypeOptions = useMemo(() => getCampaignTypeOptions(session.industryKey), [session.industryKey]);

  // Persistent preferences — used as fallback between memory and static defaults
  const resolved = useResolvedDefaults(clientId, session.memory, session.campaignType);

  // Pre-select campaign type from memory/preferences when no high-confidence intelligence rec
  useEffect(() => {
    if (session.campaignType) return; // already selected
    if (campaignTypeRec?.confidence === 'high') return; // intelligence will guide
    // Priority: memory > persistent preferences > nothing
    const preferred = session.memory.preferredCampaignType ?? resolved.campaignType;
    if (preferred) {
      dispatch({ type: 'SET_CAMPAIGN_TYPE', payload: preferred });
    }
  }, [session.campaignType, campaignTypeRec, session.memory.preferredCampaignType, resolved.campaignType, dispatch]);

  // Auto-set recommended channels when campaign type changes
  // Priority: intelligence > memory > persistent preferences > static defaults
  useEffect(() => {
    if (!session.campaignType) return;

    let recommended: Channel[];
    if (channelRec?.recommended) {
      recommended = channelRec.recommended;
    } else if (session.memory.preferredChannels.length > 0) {
      recommended = session.memory.preferredChannels;
    } else if (resolved.channels.length > 0) {
      recommended = resolved.channels;
    } else {
      recommended = getDefaultChannels(session.campaignType, session.industryKey);
    }

    const available = recommended.filter((ch) => connectedChannels.includes(ch));
    if (available.length > 0) {
      dispatch({ type: 'SET_CHANNELS', payload: available, source: 'auto' });
    } else if (connectedChannels.length > 0) {
      dispatch({ type: 'SET_CHANNELS', payload: [connectedChannels[0]], source: 'auto' });
    }
  }, [session.campaignType, connectedChannels, channelRec, session.memory.preferredChannels, resolved.channels, dispatch]);

  const toggleChannel = (ch: Channel) => {
    const current = session.channels;
    const next = current.includes(ch)
      ? current.filter((c) => c !== ch)
      : [...current, ch];
    dispatch({ type: 'SET_CHANNELS', payload: next });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Campaign Type */}
      <div>
        <p className="text-sm text-white-60 mb-3">What type of campaign is this?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaignTypeOptions.map((opt) => {
            const isRecommended = campaignTypeRec?.recommended === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => dispatch({ type: 'SET_CAMPAIGN_TYPE', payload: opt.value as AssistantCampaignType })}
                className={cn(
                  'flex flex-col items-start p-4 rounded-lg border text-left transition-colors relative',
                  session.campaignType === opt.value
                    ? 'border-accent-green-110 bg-accent-green-110/10'
                    : 'border-white-10 hover:border-white-20 hover:bg-white-5'
                )}
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white-100">{opt.label}</p>
                  {isRecommended && (
                    <span className="px-1.5 py-0.5 rounded-full bg-accent-green-110/20 text-accent-green-110 text-[10px] font-semibold uppercase tracking-wide">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-white-40 mt-0.5">{opt.description}</p>
                {isRecommended && campaignTypeRec?.reason && (
                  <p className="text-[11px] text-accent-green-110/70 mt-1">{campaignTypeRec.reason}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Channels — shown after type is selected */}
      {session.campaignType && (
        <div>
          <p className="text-sm text-white-60 mb-3">Which channels should this campaign target?</p>

          {connectedChannels.length === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-3">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <div className="text-xs text-yellow-200">
                No channels connected.{' '}
                <Link href={`/workspaces/${clientId}/settings/channels`} className="underline hover:text-white-100">
                  Connect channels
                </Link>{' '}
                to unlock scheduling.
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {connectedChannels.map((ch) => {
              const reg = CHANNEL_REGISTRY[ch];
              if (!reg || reg.comingSoon) return null;
              const active = session.channels.includes(ch);
              const reason = channelRec?.reasoning[ch];
              return (
                <div key={ch} className="flex flex-col items-start">
                  <button
                    onClick={() => toggleChannel(ch)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'border-accent-green-110 bg-accent-green-110/10 text-accent-green-110'
                        : 'border-white-10 text-white-60 hover:border-white-20'
                    )}
                  >
                    {reg.label}
                  </button>
                  {reason && active && (
                    <p className="text-[10px] text-white-30 mt-0.5 ml-1 max-w-[180px]">{reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
