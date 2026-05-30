'use client';

import {
  Sparkles,
  Home as HomeIcon,
  TrendingDown,
  Calendar,
  RefreshCw,
  ArrowRight,
  X,
  Eye,
  Loader2,
  Trophy,
  Clock,
  Sun,
  Star,
  Megaphone,
} from 'lucide-react';
import type {
  AutopilotCampaignRecommendation,
  AutopilotMode,
  AutopilotTriggerType,
  Channel,
} from '@/hooks/useSquadpitch';
import { CHANNEL_LABELS } from '../autopilotInboxConstants';
import { cn } from '@/lib/utils';

const TRIGGER_CONFIG: Record<
  AutopilotTriggerType,
  { label: string; Icon: typeof HomeIcon; accent: string; ring: string }
> = {
  new_listing: {
    label: 'New Listing',
    Icon: HomeIcon,
    accent: 'text-green-400',
    ring: 'bg-green-500/10',
  },
  price_drop: {
    label: 'Price Drop',
    Icon: TrendingDown,
    accent: 'text-orange-400',
    ring: 'bg-orange-500/10',
  },
  open_house_added: {
    label: 'Open House',
    Icon: Calendar,
    accent: 'text-blue-400',
    ring: 'bg-blue-500/10',
  },
  open_house_updated: {
    label: 'Open House Updated',
    Icon: Calendar,
    accent: 'text-blue-400',
    ring: 'bg-blue-500/10',
  },
  status_changed: {
    label: 'Status Changed',
    Icon: RefreshCw,
    accent: 'text-purple-400',
    ring: 'bg-purple-500/10',
  },
  just_sold: {
    label: 'Just Sold',
    Icon: Trophy,
    accent: 'text-amber-400',
    ring: 'bg-amber-500/10',
  },
  stale_listing: {
    label: 'Refresh Campaign',
    Icon: Clock,
    accent: 'text-cyan-400',
    ring: 'bg-cyan-500/10',
  },
  seasonal: {
    label: 'Seasonal',
    Icon: Sun,
    accent: 'text-yellow-400',
    ring: 'bg-yellow-500/10',
  },
  new_review: {
    label: 'New Review',
    Icon: Star,
    accent: 'text-pink-400',
    ring: 'bg-pink-500/10',
  },
  inactivity_gap: {
    label: 'Re-engagement',
    Icon: Megaphone,
    accent: 'text-white-60',
    ring: 'bg-white-10',
  },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-green-500/15 text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-white-10 text-white-60',
};

interface OpportunityHeroProps {
  recommendation: AutopilotCampaignRecommendation;
  mode: AutopilotMode;
  onGenerate: (id: string) => void;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onViewDetails: (id: string) => void;
  isGenerating?: boolean;
}

export function OpportunityHero({
  recommendation,
  mode,
  onGenerate,
  onApprove,
  onDismiss,
  onViewDetails,
  isGenerating,
}: OpportunityHeroProps) {
  const triggerCfg = TRIGGER_CONFIG[recommendation.triggerType] ?? TRIGGER_CONFIG.new_listing;
  const TriggerIcon = triggerCfg.Icon;

  // The extra fields (whatWeNoticed / whyItMatters) are returned
  // by the API but not in the strict type — read them off the row
  // with a cast so the hero can show the long-form copy.
  const extras = recommendation as AutopilotCampaignRecommendation & {
    whatWeNoticed?: string;
    whyItMatters?: string;
  };
  const whatWeNoticed = extras.whatWeNoticed || recommendation.triggerReason;
  const whyItMatters = extras.whyItMatters || '';

  // CTA depends on lifecycle stage. The Hero always shows the
  // single most useful next action — multiple are only available
  // in the inactive states (which we wouldn't pick as the Hero
  // anyway, but defend against it).
  //
  // Spinstr06 — recommend_only mode intentionally hides the
  // Prepare CTA. The product contract for that mode is "Autopilot
  // finds opportunities and adds them to your inbox. You choose
  // what to create." — generating drafts from Autopilot would
  // break that promise.
  const recommendOnly = mode === 'recommend_only';
  let primaryAction: { label: string; onClick: () => void; loading?: boolean } | null = null;
  if (recommendation.status === 'pending') {
    if (!recommendOnly) {
      primaryAction = {
        label: 'Prepare Drafts',
        onClick: () => onGenerate(recommendation.id),
        loading: isGenerating,
      };
    }
  } else if (recommendation.status === 'ready') {
    primaryAction = {
      label: 'Approve Drafts',
      onClick: () => onApprove(recommendation.id),
    };
  } else if (recommendation.status === 'approved' || recommendation.status === 'launched') {
    primaryAction = {
      label: 'View Drafts',
      onClick: () => onViewDetails(recommendation.id),
    };
  } else if (recommendation.status === 'generating') {
    primaryAction = { label: 'Generating…', onClick: () => {}, loading: true };
  }

  const isInactive =
    recommendation.status === 'dismissed' || recommendation.status === 'expired';

  const channels = recommendation.suggestedChannels.slice(0, 5);

  return (
    <article
      data-testid="autopilot-hero"
      className="card p-0 border-accent-green-110/20 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 pt-4">
        <Sparkles className="w-3.5 h-3.5 text-accent-green-110" />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-accent-green-110">
          Next best move
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-5 p-5">
        {/* Image */}
        <div className="md:w-56 shrink-0">
          {recommendation.propertyImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recommendation.propertyImageUrl}
              alt={recommendation.propertyTitle}
              className="w-full h-40 md:h-44 object-cover rounded-xl border border-white-10"
            />
          ) : (
            <div className="w-full h-40 md:h-44 rounded-xl border border-white-10 bg-white-5 flex items-center justify-center">
              <TriggerIcon className={cn('w-8 h-8', triggerCfg.accent)} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
                triggerCfg.ring,
                triggerCfg.accent,
              )}
            >
              <TriggerIcon className="w-3 h-3" />
              {triggerCfg.label}
            </span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[11px] font-medium',
                CONFIDENCE_STYLES[recommendation.confidence],
              )}
            >
              {recommendation.confidence === 'high'
                ? 'High confidence'
                : recommendation.confidence === 'medium'
                  ? 'Medium confidence'
                  : 'Low confidence'}
            </span>
            {recommendation.status === 'ready' && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-green-110/15 text-accent-green-110">
                Drafts Ready
              </span>
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-white-100 leading-snug">
              {recommendation.propertyTitle}
            </h3>
            {recommendation.propertyAddress &&
              recommendation.propertyAddress !== recommendation.propertyTitle && (
                <p className="text-xs text-white-50 mt-0.5 truncate">
                  {recommendation.propertyAddress}
                </p>
              )}
          </div>

          {whatWeNoticed && (
            <p className="text-sm text-white-70 leading-relaxed">{whatWeNoticed}</p>
          )}
          {whyItMatters && (
            <p className="text-xs text-white-50 leading-relaxed">{whyItMatters}</p>
          )}

          {channels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-white-40 font-medium mr-1">
                Channels
              </span>
              {channels.map((ch: Channel) => (
                <span
                  key={ch}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white-10 text-white-70"
                >
                  {CHANNEL_LABELS[ch] ?? ch}
                </span>
              ))}
            </div>
          )}

          {recommendOnly && recommendation.status === 'pending' && (
            <p
              data-testid="hero-recommend-only-note"
              className="text-xs text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2"
            >
              Recommendations-only mode. Switch automation level to
              Generate drafts manually (or higher) on the Settings tab to
              prepare drafts from Autopilot.
            </p>
          )}

          {/* Actions */}
          {!isInactive && (
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.loading}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                    'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  {primaryAction.loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  {primaryAction.label}
                </button>
              )}
              <button
                onClick={() => onViewDetails(recommendation.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white-60 hover:bg-white-10 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View details
              </button>
              <button
                onClick={() => onDismiss(recommendation.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white-40 hover:bg-white-5 hover:text-white-60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
