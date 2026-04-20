import { useMemo } from 'react';
import type { Channel, MediaAsset, AutopilotCampaignRecommendation } from '@/hooks/useSquadpitch';
import type { AutopilotTriggerType } from '@/hooks/useSquadpitch';
import {
  buildAutopilotCampaignContext,
  type AutopilotCampaignContext,
} from '@/lib/assistant/autopilotCampaignMapping';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { getAdapter } from '@/lib/assistant/adapterRegistry';

/**
 * React hook that composes existing intelligence functions
 * to provide autopilot campaign recommendation context for display.
 * Also injects persistent content preferences for generation prompts.
 */
export function useAutopilotCampaignIntelligence(
  recommendation: AutopilotCampaignRecommendation,
  connectedChannels: Channel[],
  assets?: MediaAsset[],
): AutopilotCampaignContext {
  const preferencesContext = usePreferencesContext(recommendation.clientId);
  // For now always real_estate; future: derive from client's industry setting
  const adapter = useMemo(() => getAdapter('real_estate'), []);

  return useMemo(
    () => ({
      ...buildAutopilotCampaignContext({
        triggerType: recommendation.triggerType as AutopilotTriggerType,
        propertyData: recommendation.propertyData,
        connectedChannels,
        assets,
      }, adapter),
      preferencesContext,
    }),
    [recommendation.triggerType, recommendation.propertyData, connectedChannels, assets, preferencesContext, adapter],
  );
}
