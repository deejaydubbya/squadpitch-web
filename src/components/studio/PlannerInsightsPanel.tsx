'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Clock, Megaphone, ArrowRight, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeekPlanSummary } from './WeekPlanSummary';
import type { WeekSummary, PlannerCampaignSuggestion } from '@/hooks/useSquadpitch';

interface PlannerInsightsPanelProps {
  clientId: string;
  weekSummary: WeekSummary | null;
  onPlanMyWeek: () => void;
  isPlanningWeek: boolean;
  planResult: { generated: number; scheduled: number } | null;
  hasSuggestions: boolean;
  campaignSuggestions: PlannerCampaignSuggestion[];
  timingSuggestions: Record<string, { bestTimeLabel: string; bestDays: string }> | undefined;
  /** Counts to show in collapsed summary bar */
  postedCount: number;
  scheduledCount: number;
}

export function PlannerInsightsPanel({
  clientId,
  weekSummary,
  onPlanMyWeek,
  isPlanningWeek,
  planResult,
  hasSuggestions,
  campaignSuggestions,
  timingSuggestions,
  postedCount,
  scheduledCount,
}: PlannerInsightsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const hasContent =
    weekSummary ||
    planResult ||
    campaignSuggestions.length > 0 ||
    (timingSuggestions && Object.keys(timingSuggestions).length > 0);

  if (!hasContent) return null;

  return (
    <div className="border border-white-10 rounded-xl overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white-8 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-white-30 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white-30 shrink-0" />
        )}
        <BarChart3 className="w-3.5 h-3.5 text-white-30" />
        <span className="text-xs text-white-60">
          {postedCount} posted, {scheduledCount} scheduled
        </span>
        <span className="text-xs text-accent-green-110 font-medium ml-auto">
          {expanded ? 'Hide insights' : 'Show insights'}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white-10">
          {/* Week plan summary */}
          <div className="pt-4" data-tour-step="week-summary">
            <WeekPlanSummary
              weekSummary={weekSummary}
              onPlanMyWeek={onPlanMyWeek}
              isPlanningWeek={isPlanningWeek}
              planResult={planResult}
              hasSuggestions={hasSuggestions}
              clientId={clientId}
            />
          </div>

          {/* Campaign suggestions from recommendation engine */}
          {campaignSuggestions.length > 0 && (
            <div className="card p-4 border-purple-400/20 bg-purple-400/5">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-semibold text-white-60 uppercase tracking-wider">
                  Campaign Ideas
                </h3>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-400/15 text-purple-400">
                  {campaignSuggestions.length}
                </span>
              </div>
              <div className="space-y-2">
                {campaignSuggestions.map((cs) => {
                  const payload = cs.actionPayload ?? {};
                  const params = new URLSearchParams({ intent: 'campaign' });
                  const propertyId = payload.listingDataItemId ?? payload.sourceId;
                  if (propertyId) {
                    params.set('sourceType', 'property');
                    params.set('sourceId', propertyId);
                  }
                  const campaignType = payload.campaignType ?? cs.suggestedCampaignType;
                  if (campaignType) params.set('campaignType', campaignType);

                  return (
                    <Link
                      key={cs.id}
                      href={`/workspaces/${clientId}/create?${params.toString()}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white-5 hover:bg-white-8 border border-white-10 hover:border-purple-400/20 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white-80 group-hover:text-white-100 truncate">
                            {cs.title}
                          </span>
                          <span className={cn(
                            'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                            cs.confidence === 'high'
                              ? 'bg-accent-green-110/15 text-accent-green-110'
                              : 'bg-yellow-400/15 text-yellow-400'
                          )}>
                            {cs.confidence === 'high' ? 'Recommended' : 'Suggested'}
                          </span>
                        </div>
                        {cs.reasons[0] && (
                          <p className="text-[11px] text-white-30 mt-0.5">{cs.reasons[0]}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-purple-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {cs.actionLabel}
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timing suggestions */}
          {timingSuggestions && Object.keys(timingSuggestions).length > 0 && (
            <div className="flex items-center gap-3 text-xs text-white-40 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span className="font-medium text-white-30 uppercase tracking-wider">Best times</span>
              </div>
              {Object.entries(timingSuggestions).map(([channel, t]) => (
                <span key={channel} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white-5 border border-white-10">
                  <span className="text-white-60">{channel}</span>
                  <span className="text-white-30">{t.bestTimeLabel}</span>
                  <span className="text-white-20">&middot;</span>
                  <span className="text-white-30">{t.bestDays}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
