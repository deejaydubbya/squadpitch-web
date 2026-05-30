'use client';

// Step that appears immediately after the user picks Campaign mode.
// Replaces the previous behavior where the assistant jumped straight
// to "which listing?" — campaigns can now also be built from a
// Content Asset (any WorkspaceDataItem) or from a freeform idea.
//
// The card emits a SET_CAMPAIGN_SOURCE_TYPE action; the state
// resolver then routes to the matching picker (property_select,
// campaign_data_item, or campaign_idea) on the next turn.

import { Home, FileText, Lightbulb, ArrowRight, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { useIndustryTerminology } from '@/hooks/useIndustryTerminology';

interface Props {
  session: AssistantSessionState;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

const SOURCE_BLUE = 'hover:border-accent-green-110/50 hover:bg-accent-green-110/5';

export function CampaignSourceCard({ session, onSelection }: Props) {
  const t = useIndustryTerminology(session.industryKey);
  const itemLabel =
    t.itemSingular.charAt(0).toUpperCase() + t.itemSingular.slice(1);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() =>
          onSelection(
            { type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: 'property' },
            `Source: ${itemLabel}`,
          )
        }
        className={cn(
          'w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors border-white-10',
          SOURCE_BLUE,
        )}
      >
        <Home className="w-4 h-4 text-accent-green-110 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white-100">{itemLabel} / Listing</p>
          <p className="text-[11px] text-white-40 mt-0.5">
            Promote a {t.itemSingular.toLowerCase()}, open house, price change, or listing update.
          </p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-white-20 shrink-0 mt-0.5" />
      </button>

      <button
        type="button"
        onClick={() =>
          onSelection(
            { type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: 'url' },
            'Source: Listing URL',
          )
        }
        className={cn(
          'w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors border-white-10',
          SOURCE_BLUE,
        )}
      >
        <Globe className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white-100">Listing URL / Listings Page</p>
          <p className="text-[11px] text-white-40 mt-0.5">
            Paste a property listing or a page of listings — Squadpitch will
            extract the property data.
          </p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-white-20 shrink-0 mt-0.5" />
      </button>

      <button
        type="button"
        onClick={() =>
          onSelection(
            { type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: 'data_item' },
            'Source: Content Asset',
          )
        }
        className={cn(
          'w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors border-white-10',
          SOURCE_BLUE,
        )}
      >
        <FileText className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white-100">Content Asset</p>
          <p className="text-[11px] text-white-40 mt-0.5">
            Turn a saved testimonial, offer, service, article, or business detail into a campaign.
          </p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-white-20 shrink-0 mt-0.5" />
      </button>

      <button
        type="button"
        onClick={() =>
          onSelection(
            { type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: 'idea' },
            'Source: Idea',
          )
        }
        className={cn(
          'w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors border-white-10',
          SOURCE_BLUE,
        )}
      >
        <Lightbulb className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white-100">Start from an idea</p>
          <p className="text-[11px] text-white-40 mt-0.5">
            Describe the campaign in your own words.
          </p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-white-20 shrink-0 mt-0.5" />
      </button>
    </div>
  );
}
