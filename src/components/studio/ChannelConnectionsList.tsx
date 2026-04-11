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
import { ChannelConnectionCard } from './ChannelConnectionCard';

interface Props {
  clientId: string;
}

const CHANNELS: Channel[] = [
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'LINKEDIN',
  'X',
  'YOUTUBE',
];

export function ChannelConnectionsList({ clientId }: Props) {
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

      <div className="space-y-3">
        {CHANNELS.map((channel) => (
          <ChannelConnectionCard
            key={channel}
            clientId={clientId}
            channel={channel}
            connection={byChannel.get(channel) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
