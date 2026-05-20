'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { getAdapterSafe } from '@/lib/assistant/adapterRegistry';
import { recommendCampaignType } from '@/lib/assistant/campaignIntelligence';
import { getCampaignTypeOptions } from '@/lib/assistant/defaults';

interface Props {
  session: AssistantSessionState;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function CampaignTypeCard({ session, onSelection }: Props) {
  const adapter = useMemo(() => getAdapterSafe(session.industryKey), [session.industryKey]);

  // Intelligence recommendation only applies to property-sourced
  // campaigns — recommendCampaignType examines fields (price/status/
  // openHouseAt) that only exist on property dataJson.
  // industry-01 — also requires an adapter (no recommendations for
  // no-industry workspaces).
  const recommendation = useMemo(() => {
    if (session.campaignSourceType !== 'property') return null;
    if (!session.propertyData) return null;
    if (!adapter) return null;
    try {
      return recommendCampaignType(session.propertyData, adapter);
    } catch {
      return null;
    }
  }, [session.campaignSourceType, session.propertyData, adapter]);

  // Property → adapter's industry-specific types.
  // Content asset / idea → generic cross-industry types.
  const campaignTypes = useMemo(
    () => getCampaignTypeOptions(session.industryKey, session.campaignSourceType),
    [session.industryKey, session.campaignSourceType],
  );

  return (
    <div className="space-y-2">
      {/* Intelligence recommendation banner */}
      {recommendation && recommendation.confidence !== 'low' && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-accent-green-110 mt-0.5 shrink-0" />
          <p className="text-[11px] text-white-60">
            <span className="text-accent-green-110 font-medium">Suggested:</span>{' '}
            {recommendation.reason}
          </p>
        </div>
      )}

      {/* Campaign type options */}
      <div className="grid gap-1.5">
        {campaignTypes.map((ct) => {
          const isRecommended = recommendation?.recommended === ct.value;

          return (
            <button
              key={ct.value}
              onClick={() =>
                onSelection(
                  { type: 'SET_CAMPAIGN_TYPE', payload: ct.value as any },
                  `Campaign type: ${ct.label}`
                )
              }
              className={cn(
                'flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors',
                isRecommended
                  ? 'border-accent-green-110/40 bg-accent-green-110/5 hover:bg-accent-green-110/10'
                  : 'border-white-10 hover:border-white-20 hover:bg-white-5'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white-100">{ct.label}</span>
                  {isRecommended && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-green-110/20 text-accent-green-110 font-medium">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white-40 mt-0.5">{ct.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
