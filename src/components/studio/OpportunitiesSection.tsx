'use client';

import { Sparkles, ChevronRight, Zap, X } from 'lucide-react';
import { WhyThis } from '@/components/studio/WhyThis';
import type { DashboardRecommendation } from '@/hooks/useSquadpitch';

export interface NextActionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  action?: string;
  cta: string;
  priority: number;
  accent?: string;
  sourceHint?: string;
  reasons?: string[];
  dismissable?: boolean;
}

interface OpportunitiesSectionProps {
  nextActions: NextActionItem[];
  topRecommendation: DashboardRecommendation | null;
  autopilot?: {
    enabled: boolean;
    draftsThisWeek: number;
    maxDraftsPerWeek: number;
  };
  onNextAction: (action: NextActionItem) => void;
  onRecommendationAction: (rec: DashboardRecommendation) => void;
  onDismissRecommendation?: (recId: string) => void;
}

export function OpportunitiesSection({
  nextActions,
  topRecommendation,
  autopilot,
  onNextAction,
  onRecommendationAction,
  onDismissRecommendation,
}: OpportunitiesSectionProps) {
  if (nextActions.length === 0 && !topRecommendation) return null;

  // Don't show top recommendation in the footer if it's already in the grid
  const showTopRec =
    topRecommendation &&
    !nextActions.some((a) => a.id === topRecommendation.id);

  return (
    <div className="card p-6 bg-gradient-to-br from-accent-green-110/8 via-transparent to-transparent border-accent-green-110/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-accent-green-110" />
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          Opportunities
        </h2>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
          AI-powered
        </span>
        {autopilot && (
          <span
            className={`ml-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
              autopilot.enabled
                ? 'bg-accent-green-110/10 text-accent-green-110'
                : 'bg-white-10 text-white-40'
            }`}
          >
            <Zap className="w-3 h-3" />
            Autopilot {autopilot.enabled ? 'ON' : 'OFF'}
            {autopilot.enabled && (
              <span className="text-white-40">
                · {autopilot.draftsThisWeek}/{autopilot.maxDraftsPerWeek}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Action cards grid */}
      {nextActions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nextActions.map((action) => (
            <div key={action.id} className="relative group/card">
              {action.dismissable && onDismissRecommendation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissRecommendation(action.id);
                  }}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white-10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:bg-white-20 transition-all"
                  aria-label="Dismiss recommendation"
                >
                  <X className="w-3.5 h-3.5 text-white-40" />
                </button>
              )}
              <button
                onClick={() => onNextAction(action)}
                className="w-full flex flex-col gap-2 p-4 rounded-xl bg-white-5 border border-white-10 hover:border-white-20 hover:bg-white-10 transition-all text-left group"
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${action.accent ?? 'text-accent-green-110 bg-accent-green-110/15'}`}
                  >
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white-100 group-hover:text-white transition-colors">
                      {action.title}
                    </p>
                    <p className="text-xs text-white-40 mt-0.5">{action.description}</p>
                    {action.sourceHint && (
                      <p className="text-[10px] text-accent-green-110/70 mt-0.5">
                        {action.sourceHint}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    {action.cta}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white-20 flex-shrink-0 group-hover:hidden" />
                </div>
                {action.reasons && action.reasons.length > 0 && (
                  <WhyThis reasons={action.reasons} className="ml-[52px]" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top Recommendation — separated below the grid */}
      {showTopRec && (
        <>
          <div className="border-t border-white-10 my-4" />
          <div className="relative group/toprec">
            {onDismissRecommendation && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissRecommendation(topRecommendation.id);
                }}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white-10 flex items-center justify-center opacity-0 group-hover/toprec:opacity-100 hover:bg-white-20 transition-all"
                aria-label="Dismiss recommendation"
              >
                <X className="w-3.5 h-3.5 text-white-40" />
              </button>
            )}
            <button
              onClick={() => onRecommendationAction(topRecommendation)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-white-5 border border-white-10 hover:border-white-20 hover:bg-white-10 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-green-110/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-accent-green-110" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white-100 group-hover:text-white transition-colors truncate">
                    {topRecommendation.title}
                  </p>
                  {topRecommendation.confidence === 'high' && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-green-110/15 text-accent-green-110">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-white-40 mt-0.5 truncate">
                  {topRecommendation.reasons?.[0] ??
                    topRecommendation.reason ??
                    topRecommendation.description}
                </p>
                {topRecommendation.sourceLabel && (
                  <p className="text-[10px] text-accent-green-110/70 mt-0.5">
                    Based on your {topRecommendation.sourceLabel.toLowerCase()}
                  </p>
                )}
              </div>
              <span className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                {topRecommendation.actionLabel}
              </span>
              <ChevronRight className="w-4 h-4 text-white-20 flex-shrink-0 group-hover:hidden" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
