import { useMemo } from 'react';
import type { Channel, MediaAsset } from '@/hooks/useSquadpitch';
import type { AssistantSessionState } from '@/lib/assistant/types';
import {
  recommendCampaignType,
  recommendChannels,
  prioritizeMedia,
  buildIntelligentSchedule,
} from '@/lib/assistant/campaignIntelligence';
import type {
  CampaignTypeRecommendation,
  ChannelRecommendation,
  MediaPrioritization,
  ScheduleRecommendation,
} from '@/lib/assistant/campaignIntelligence.types';
import { getAdapter } from '@/lib/assistant/adapterRegistry';

interface CampaignIntelligenceResult {
  campaignTypeRec: CampaignTypeRecommendation | null;
  channelRec: ChannelRecommendation | null;
  mediaRec: MediaPrioritization | null;
  scheduleRec: ScheduleRecommendation | null;
}

export function useCampaignIntelligence(
  session: AssistantSessionState,
  connectedChannels: Channel[],
  assets: MediaAsset[] | undefined,
): CampaignIntelligenceResult {
  const adapter = useMemo(() => getAdapter(session.industryKey), [session.industryKey]);

  const campaignTypeRec = useMemo(() => {
    if (!session.propertyData) return null;
    return recommendCampaignType(session.propertyData, adapter);
  }, [session.propertyData, adapter]);

  const channelRec = useMemo(() => {
    if (!session.campaignType || connectedChannels.length === 0) return null;
    return recommendChannels({
      campaignType: session.campaignType,
      connectedChannels,
      hasMedia: (assets?.length ?? 0) > 0,
      propertyData: session.propertyData ?? {},
    }, adapter);
  }, [session.campaignType, connectedChannels, assets, session.propertyData, adapter]);

  const mediaRec = useMemo(() => {
    if (!assets || assets.length === 0 || !session.campaignType) return null;
    return prioritizeMedia(assets, {
      campaignType: session.campaignType,
      slotCount: session.slots.length || 5,
    }, adapter);
  }, [assets, session.campaignType, session.slots.length, adapter]);

  const scheduleRec = useMemo(() => {
    if (!session.campaignType || session.channels.length === 0) return null;
    return buildIntelligentSchedule({
      campaignType: session.campaignType,
      channels: session.channels,
      propertyData: session.propertyData ?? {},
    }, adapter);
  }, [session.campaignType, session.channels, session.propertyData, adapter]);

  return { campaignTypeRec, channelRec, mediaRec, scheduleRec };
}
