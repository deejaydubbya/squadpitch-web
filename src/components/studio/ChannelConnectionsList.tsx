'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import {
  useChannelConnections,
  squadpitchKeys,
  type ChannelConnection,
  type Channel,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { ChannelConnectionCard, type ChannelRecommendationTier } from './ChannelConnectionCard';

interface ChannelRecommendations {
  primary: string[];
  secondary: string[];
  optional: string[];
}

interface Props {
  clientId: string;
  channelRecommendations?: ChannelRecommendations | null;
}

const CHANNELS: Channel[] = [
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'LINKEDIN',
  'LINKEDIN_ORGANIZATION_PAGE',
  'PINTEREST',
  'THREADS',
  'X',
  'YOUTUBE',
];

const COMING_SOON_CHANNELS: Channel[] = ['GOOGLE_BUSINESS_PROFILE', 'REDDIT'];

function resolveRecommendationTier(
  channel: Channel,
  recs: ChannelRecommendations | null | undefined,
): ChannelRecommendationTier | null {
  if (!recs) return null;
  if (recs.primary.includes(channel)) return 'primary';
  if (recs.secondary.includes(channel)) return 'secondary';
  if (recs.optional.includes(channel)) return 'optional';
  return null;
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  primary: { label: 'Recommended for your industry', color: 'text-green-400' },
  secondary: { label: 'Good fit', color: 'text-blue-400' },
  optional: { label: 'Optional', color: 'text-white-40' },
};

export function ChannelConnectionsList({ clientId, channelRecommendations }: Props) {
  const { data: connections, isLoading, error } = useChannelConnections(clientId);
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const expectedOrigin =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      if (event.origin !== expectedOrigin && event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as { type?: string; channel?: string } | null;
      if (data?.type === 'sp-oauth-complete') {
        qc.invalidateQueries({
          queryKey: squadpitchKeys.connections(clientId),
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [clientId, qc]);

  const byChannel = useMemo(() => {
    const map = new Map<Channel, ChannelConnection>();
    (connections ?? []).forEach((c) => map.set(c.channel, c));
    return map;
  }, [connections]);

  // Group channels by recommendation tier when recommendations are available
  const groupedChannels = useMemo(() => {
    if (!channelRecommendations) return null;

    const primary: Channel[] = [];
    const secondary: Channel[] = [];
    const optional: Channel[] = [];
    const ungrouped: Channel[] = [];

    for (const channel of CHANNELS) {
      const tier = resolveRecommendationTier(channel, channelRecommendations);
      if (tier === 'primary') primary.push(channel);
      else if (tier === 'secondary') secondary.push(channel);
      else if (tier === 'optional') optional.push(channel);
      else ungrouped.push(channel);
    }

    return { primary, secondary, optional, ungrouped };
  }, [channelRecommendations]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading connections…</span>
      </div>
    );
  }

  if (error) {
    return <StatusBanner error={(error as Error).message} />;
  }

  const renderCard = (channel: Channel) => (
    <ChannelConnectionCard
      key={channel}
      clientId={clientId}
      channel={channel}
      connection={byChannel.get(channel) ?? null}
      recommendationTier={resolveRecommendationTier(channel, channelRecommendations)}
    />
  );

  const renderTierGroup = (tier: string, channels: Channel[]) => {
    if (channels.length === 0) return null;
    const config = TIER_CONFIG[tier];
    return (
      <div key={tier} className="space-y-3">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
          {config.label}
        </h3>
        {channels.map(renderCard)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 bg-zone-yellow/10 border-zone-yellow/30">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-zone-yellow flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white-60">
            <span className="text-zone-yellow font-medium">
              Meta app still in development:
            </span>{' '}
            Until our Meta app passes review, only Instagram accounts added as{' '}
            <strong>testers</strong> on the Meta developer dashboard will be
            able to complete the Connect Instagram flow. Add the target
            account under <em>App Roles → Testers</em> first.
          </div>
        </div>
      </div>

      {groupedChannels ? (
        <div className="space-y-6">
          {renderTierGroup('primary', groupedChannels.primary)}
          {renderTierGroup('secondary', groupedChannels.secondary)}
          {renderTierGroup('optional', groupedChannels.optional)}
          {groupedChannels.ungrouped.length > 0 && (
            <div className="space-y-3">
              {groupedChannels.ungrouped.map(renderCard)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {CHANNELS.map(renderCard)}
        </div>
      )}

      {COMING_SOON_CHANNELS.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
            Coming Soon
          </h3>
          {COMING_SOON_CHANNELS.map((channel) => (
            <ChannelConnectionCard
              key={channel}
              clientId={clientId}
              channel={channel}
              connection={null}
              recommendationTier={resolveRecommendationTier(channel, channelRecommendations)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
