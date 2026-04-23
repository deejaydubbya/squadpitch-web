'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, CheckCircle, ArrowRight, SkipForward } from 'lucide-react';
import {
  useChannelConnections,
  squadpitchKeys,
  type Channel,
} from '@/hooks/useSquadpitch';
import { ChannelConnectionCard, type ChannelRecommendationTier } from '@/components/studio/ChannelConnectionCard';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';

interface ChannelRecommendations {
  primary: string[];
  secondary: string[];
  optional: string[];
}

interface Props {
  clientId: string;
  industryKey: string;
  channelRecommendations: ChannelRecommendations | null;
  onContinue: (connectedChannels: Channel[]) => void;
}

/** Available channels (not "coming soon"). */
const CONNECTABLE_CHANNELS: Channel[] = (
  Object.keys(CHANNEL_REGISTRY) as Channel[]
).filter((ch) => !CHANNEL_REGISTRY[ch].comingSoon);

function resolveRecommendationTier(
  channel: Channel,
  recs: ChannelRecommendations | null,
): ChannelRecommendationTier | null {
  if (!recs) return null;
  if (recs.primary.includes(channel)) return 'primary';
  if (recs.secondary.includes(channel)) return 'secondary';
  if (recs.optional.includes(channel)) return 'optional';
  return null;
}

export function OnboardingChannelConnect({
  clientId,
  channelRecommendations,
  onContinue,
}: Props) {
  const connections = useChannelConnections(clientId);
  const qc = useQueryClient();

  // Listen for OAuth popup completion → refresh connections
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const expectedOrigin =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      if (event.origin !== expectedOrigin && event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as { type?: string } | null;
      if (data?.type === 'sp-oauth-complete') {
        qc.invalidateQueries({ queryKey: squadpitchKeys.connections(clientId) });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [clientId, qc]);

  const connectedList = useMemo(() => {
    return (connections.data ?? [])
      .filter((c) => c.status === 'CONNECTED')
      .map((c) => c.channel);
  }, [connections.data]);

  const connectedCount = connectedList.length;

  // Group channels: recommended first, then the rest
  const { recommended, alsoAvailable } = useMemo(() => {
    const primary: Channel[] = [];
    const rest: Channel[] = [];
    for (const ch of CONNECTABLE_CHANNELS) {
      const tier = resolveRecommendationTier(ch, channelRecommendations);
      if (tier === 'primary') {
        primary.push(ch);
      } else {
        rest.push(ch);
      }
    }
    return { recommended: primary, alsoAvailable: rest };
  }, [channelRecommendations]);

  const handleContinue = () => {
    onContinue(connectedList);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-green-110/10 text-accent-green-110 text-sm font-medium">
          <Link2 className="w-4 h-4" />
          Connect Your Channels
        </div>
        <p className="text-sm text-white-40 max-w-md mx-auto">
          Connecting channels lets us create posts tailored for each platform and schedule them automatically.
        </p>
      </div>

      {/* Connected count */}
      <div className="flex items-center justify-center gap-2 text-xs text-white-40">
        <CheckCircle className={`w-3.5 h-3.5 ${connectedCount > 0 ? 'text-accent-green-110' : 'text-white-20'}`} />
        <span>
          {connectedCount} of {CONNECTABLE_CHANNELS.length} connected
        </span>
      </div>

      {/* Recommended channels */}
      {recommended.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white-60 uppercase tracking-wider">
            Recommended for your industry
          </h3>
          <div className="space-y-2">
            {recommended.map((ch) => (
              <ChannelConnectionCard
                key={ch}
                clientId={clientId}
                channel={ch}
                connection={connections.data?.find((c) => c.channel === ch) ?? null}
                recommendationTier="primary"
              />
            ))}
          </div>
        </div>
      )}

      {/* Other channels */}
      {alsoAvailable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white-60 uppercase tracking-wider">
            {recommended.length > 0 ? 'Also available' : 'Available channels'}
          </h3>
          <div className="space-y-2">
            {alsoAvailable.map((ch) => {
              const tier = resolveRecommendationTier(ch, channelRecommendations);
              return (
                <ChannelConnectionCard
                  key={ch}
                  clientId={clientId}
                  channel={ch}
                  connection={connections.data?.find((c) => c.channel === ch) ?? null}
                  recommendationTier={tier}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={handleContinue}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-green-110 text-black text-sm font-semibold hover:bg-accent-green-110/90 transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleContinue}
          className="inline-flex items-center gap-1.5 text-sm text-white-40 hover:text-white-60 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip for now
        </button>
      </div>
    </div>
  );
}
