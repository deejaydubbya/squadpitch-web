import { useMemo } from 'react';
import { getAdapter } from '@/lib/assistant/adapterRegistry';
import type { IndustryTerminology, CampaignTypeOption } from '@/lib/assistant/industryAdapter';

export interface IndustryTerminologyResult extends IndustryTerminology {
  /** Resolve a campaign type value to its human-readable label */
  campaignTypeLabel: (value: string) => string;
  /** All campaign type options for the industry */
  campaignTypes: CampaignTypeOption[];
}

/**
 * Provides industry-specific terminology and label resolvers.
 * Components use this hook to render labels that adapt to the active industry.
 */
export function useIndustryTerminology(industryKey: string = 'real_estate'): IndustryTerminologyResult {
  return useMemo(() => {
    const adapter = getAdapter(industryKey);
    const { terminology, campaignTypes } = adapter;

    const campaignTypeLabel = (value: string): string => {
      const option = campaignTypes.find((ct) => ct.value === value);
      return option?.label ?? value.replace(/_/g, ' ');
    };

    return {
      ...terminology,
      campaignTypeLabel,
      campaignTypes,
    };
  }, [industryKey]);
}
