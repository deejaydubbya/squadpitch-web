import { useMemo } from 'react';
import { getAdapterSafe } from '@/lib/assistant/adapterRegistry';
import type {
  IndustryTerminology,
  CampaignTypeOption,
} from '@/lib/assistant/industryAdapter';

export interface IndustryTerminologyResult extends IndustryTerminology {
  /** Resolve a campaign type value to its human-readable label */
  campaignTypeLabel: (value: string) => string;
  /** All campaign type options for the industry */
  campaignTypes: CampaignTypeOption[];
}

// industry-01 — neutral terminology used when no industry is
// selected. Keeps the assistant honest: a no-industry workspace
// should never see "listing" / "property" / "open house" copy.
const NEUTRAL_TERMINOLOGY: IndustryTerminology = {
  itemSingular: 'item',
  itemPlural: 'items',
  selectItemLabel: 'Pick an item',
  itemDataLabel: 'Item details',
  priceLabel: 'Price',
};

const NEUTRAL_RESULT: IndustryTerminologyResult = {
  ...NEUTRAL_TERMINOLOGY,
  campaignTypes: [],
  campaignTypeLabel: (value: string) => value.replace(/_/g, ' '),
};

/**
 * Provides industry-specific terminology and label resolvers.
 * Components use this hook to render labels that adapt to the active industry.
 *
 * industry-01 — `industryKey` is now nullable. A null/unknown key
 * returns a neutral terminology bundle so non-real-estate
 * workspaces never see real-estate copy.
 */
export function useIndustryTerminology(
  industryKey: string | null | undefined,
): IndustryTerminologyResult {
  return useMemo(() => {
    const adapter = getAdapterSafe(industryKey);
    if (!adapter) return NEUTRAL_RESULT;
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
