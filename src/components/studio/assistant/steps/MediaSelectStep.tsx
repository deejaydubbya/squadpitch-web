'use client';

import { useMemo } from 'react';
import { ImageIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssets, type Channel } from '@/hooks/useSquadpitch';
import { useChannelSettings } from '@/hooks/useSquadpitch';
import { useCampaignIntelligence } from '@/hooks/useCampaignIntelligence';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  dispatch: React.Dispatch<AssistantAction>;
  clientId: string;
}

export function MediaSelectStep({ session, dispatch, clientId }: Props) {
  const { data: assets, isLoading } = useAssets(clientId, { status: 'READY', assetType: 'image' });
  const { data: channelSettings } = useChannelSettings(clientId);

  const connectedChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings
      .filter((cs) => cs.isEnabled)
      .map((cs) => cs.channel);
  }, [channelSettings]);

  const { mediaRec } = useCampaignIntelligence(session, connectedChannels, assets);

  const channelNeedsMedia = useMemo(() => {
    if (session.mode === 'quick_post' && session.quickPostChannel) {
      return CHANNEL_REGISTRY[session.quickPostChannel]?.requiresMedia ?? false;
    }
    if (session.mode === 'campaign') {
      return session.channels.some((ch) => CHANNEL_REGISTRY[ch]?.requiresMedia);
    }
    return false;
  }, [session.mode, session.quickPostChannel, session.channels]);

  // Set of previously-used media IDs that still exist in the library
  const previouslyUsedIds = useMemo(() => {
    if (!assets || session.memory.lastSelectedMediaIds.length === 0) return new Set<string>();
    const assetIds = new Set(assets.map((a) => a.id));
    return new Set(session.memory.lastSelectedMediaIds.filter((id) => assetIds.has(id)));
  }, [assets, session.memory.lastSelectedMediaIds]);

  // Sort assets by intelligence priority
  const sortedAssets = useMemo(() => {
    if (!assets) return [];
    if (!mediaRec) return assets;

    const priorityMap = new Map(mediaRec.prioritized.map((p, i) => [p.id, i]));
    return [...assets].sort((a, b) => {
      const aIdx = priorityMap.get(a.id) ?? Infinity;
      const bIdx = priorityMap.get(b.id) ?? Infinity;
      return aIdx - bIdx;
    });
  }, [assets, mediaRec]);

  const toggleMedia = (id: string) => {
    const current = session.selectedMediaIds;
    const next = current.includes(id)
      ? current.filter((mid) => mid !== id)
      : [...current, id];
    dispatch({ type: 'SET_MEDIA', payload: next });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="w-6 h-6 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
        <div className="w-12 h-12 rounded-xl bg-white-10 flex items-center justify-center mb-4">
          <ImageIcon className="w-6 h-6 text-white-40" />
        </div>
        <p className="text-sm text-white-60 mb-1">No images in your library</p>
        <p className="text-xs text-white-40">Skip this step — AI can generate without media.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {channelNeedsMedia && session.selectedMediaIds.length === 0 && (
        <p className="text-xs text-yellow-200/80">
          Your selected channel requires media for publishing. Select an image, or skip — you can attach one later.
        </p>
      )}

      {session.selectedMediaIds.length > 0 && (
        <p className="text-xs text-accent-green-110 font-medium">
          {session.selectedMediaIds.length} image{session.selectedMediaIds.length !== 1 ? 's' : ''} selected
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
        {sortedAssets.map((asset) => {
          const selected = session.selectedMediaIds.includes(asset.id);
          const thumb = asset.thumbnailUrl || asset.url;
          const isHero = mediaRec?.heroImageId === asset.id;
          return (
            <button
              key={asset.id}
              onClick={() => toggleMedia(asset.id)}
              className={cn(
                'relative aspect-square rounded-lg border overflow-hidden transition-colors',
                selected
                  ? 'border-accent-green-110 ring-2 ring-accent-green-110/40'
                  : 'border-white-10 hover:border-white-20'
              )}
            >
              {thumb ? (
                <img src={thumb} alt={asset.filename ?? ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white-5 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-white-20" />
                </div>
              )}
              {isHero && (
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-accent-green-110/90 text-sp-bg text-[10px] font-semibold uppercase tracking-wide">
                  Hero
                </span>
              )}
              {previouslyUsedIds.has(asset.id) && !isHero && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white-10/80 backdrop-blur-sm text-white-60 text-[10px] font-medium">
                  <Clock className="w-2.5 h-2.5" />
                  Previously used
                </span>
              )}
              {selected && (
                <div className="absolute inset-0 bg-accent-green-110/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-accent-green-110 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-sp-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
