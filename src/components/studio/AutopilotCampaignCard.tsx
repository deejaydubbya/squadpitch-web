'use client';

import { Home, TrendingDown, Calendar, RefreshCw, Loader2, Check, X, Eye, Sparkles, Pencil, ArrowRight, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhyThis } from '@/components/studio/WhyThis';
import type {
  AutopilotCampaignRecommendation,
  AutopilotTriggerType,
  Channel,
} from '@/hooks/useSquadpitch';
import { useAutopilotCampaignIntelligence } from '@/hooks/useAutopilotCampaignIntelligence';
import { STATUS_DISPLAY, CHANNEL_LABELS, formatRelativeExpiry, isExpiringSoon, isInactiveStatus } from './autopilotInboxConstants';

// ── Trigger display config ───────────────────────────────────────────────

const TRIGGER_CONFIG: Record<AutopilotTriggerType, { label: string; accent: string; icon: typeof Home }> = {
  new_listing: { label: 'New Listing', accent: 'border-l-green-400', icon: Home },
  price_drop: { label: 'Price Drop', accent: 'border-l-orange-400', icon: TrendingDown },
  open_house_added: { label: 'Open House', accent: 'border-l-blue-400', icon: Calendar },
  open_house_updated: { label: 'Open House Updated', accent: 'border-l-blue-400', icon: Calendar },
  status_changed: { label: 'Status Changed', accent: 'border-l-purple-400', icon: RefreshCw },
};

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  just_listed: 'Just Listed',
  open_house: 'Open House',
  price_drop: 'Price Drop',
  general_promotion: 'General Promotion',
  // Automotive
  just_arrived: 'Just Arrived',
  featured_vehicle: 'Featured Vehicle',
  financing_offer: 'Financing Offer',
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-green-500/15 text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-white-10 text-white-60',
};

const URGENCY_STYLES: Record<string, { label: string; className: string }> = {
  immediate: { label: 'Urgent', className: 'bg-red-500/15 text-red-400' },
  high: { label: 'High', className: 'bg-orange-500/15 text-orange-400' },
  normal: { label: '', className: '' },
  low: { label: '', className: '' },
};

// ── Props ────────────────────────────────────────────────────────────────

interface AutopilotCampaignCardProps {
  recommendation: AutopilotCampaignRecommendation;
  connectedChannels: Channel[];
  clientId: string;
  onGenerate: (id: string) => void;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onViewDetails: (id: string) => void;
  onConvert: (id: string) => void;
}

export function AutopilotCampaignCard({
  recommendation,
  connectedChannels,
  clientId,
  onGenerate,
  onApprove,
  onDismiss,
  onViewDetails,
  onConvert,
}: AutopilotCampaignCardProps) {
  const { status, triggerType, propertyTitle, propertyAddress, propertyImageUrl, confidence } = recommendation;
  const triggerCfg = TRIGGER_CONFIG[triggerType] ?? TRIGGER_CONFIG.new_listing;
  const TriggerIcon = triggerCfg.icon;

  const intelligence = useAutopilotCampaignIntelligence(recommendation, connectedChannels);
  const { recommendation: recMeta } = intelligence;

  const reasons = [
    recMeta.rationale,
    recommendation.triggerReason !== recMeta.rationale ? recommendation.triggerReason : null,
  ].filter(Boolean) as string[];

  const isInactive = isInactiveStatus(status);
  const statusDisplay = STATUS_DISPLAY[status];

  // Media summary: channels from generated posts + image indicator
  const campaign = recommendation.generatedCampaign;
  const posts = campaign?.campaign.posts ?? [];
  const postChannels = Array.from(new Set(posts.map((p) => p.channel)));
  const hasImages = posts.some((p) => (p as { assignedImageIds?: string[] }).assignedImageIds?.length);

  // Schedule preview
  const maxDay = posts.length > 0 ? Math.max(...posts.map((p) => p.campaignDay)) : 0;

  return (
    <div
      className={cn(
        'relative rounded-xl bg-white-5 border border-white-10 border-l-4 transition-all',
        triggerCfg.accent,
        isInactive && status !== 'approved' && 'opacity-50',
        !isInactive && 'hover:border-white-20',
      )}
    >
      <div className="p-4">
        {/* Header row: trigger badge + property info */}
        <div className="flex items-start gap-3">
          {/* Property image or trigger icon */}
          <div className="w-12 h-12 rounded-lg bg-white-10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {propertyImageUrl ? (
              <img src={propertyImageUrl} alt={propertyTitle} className="w-full h-full object-cover" />
            ) : (
              <TriggerIcon className="w-5 h-5 text-white-40" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Trigger label + confidence + status badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white-40">
                {triggerCfg.label}
              </span>
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', CONFIDENCE_STYLES[confidence])}>
                {confidence}
              </span>
              {URGENCY_STYLES[recMeta.urgency]?.label && (
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', URGENCY_STYLES[recMeta.urgency].className)}>
                  {URGENCY_STYLES[recMeta.urgency].label}
                </span>
              )}
              {statusDisplay && (
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', statusDisplay.className)}>
                  {statusDisplay.label}
                </span>
              )}
            </div>

            {/* Property title */}
            <p className="text-sm font-medium text-white-100 truncate">{propertyTitle}</p>
            {propertyAddress && (
              <p className="text-xs text-white-40 truncate mt-0.5">{propertyAddress}</p>
            )}

            {/* Campaign type recommendation */}
            <div className="flex items-center gap-2 mt-2">
              <Sparkles className="w-3 h-3 text-accent-green-110" />
              <span className="text-xs text-white-60">
                {CAMPAIGN_TYPE_LABELS[recommendation.suggestedCampaignType] ?? recommendation.suggestedCampaignType}
              </span>
              {status === 'ready' && recommendation.postCount && (
                <span className="text-xs text-white-40">
                  · {recommendation.postCount} posts
                </span>
              )}
              {status === 'ready' && recommendation.suggestedChannels.length > 0 && (
                <span className="text-xs text-white-40">
                  · {recommendation.suggestedChannels.length} channels
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Media summary strip (ready campaigns with generated content) */}
        {status === 'ready' && campaign && postChannels.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {postChannels.map((ch) => (
              <span key={ch} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white-10 text-white-60">
                {CHANNEL_LABELS[ch] ?? ch}
              </span>
            ))}
            {hasImages && (
              <span className="flex items-center gap-1 text-[10px] text-white-40">
                <Image className="w-3 h-3" />
                Images included
              </span>
            )}
          </div>
        )}

        {/* Schedule preview line (ready campaigns) */}
        {status === 'ready' && maxDay > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-white-40">
            <Calendar className="w-3 h-3" />
            <span>{maxDay}-day campaign · {posts.length} posts</span>
            {recommendation.expiresAt && (
              <span className={cn(
                'ml-auto',
                isExpiringSoon(recommendation.expiresAt) && 'text-orange-400',
              )}>
                {formatRelativeExpiry(recommendation.expiresAt)}
              </span>
            )}
          </div>
        )}

        {/* Planner link for approved cards */}
        {status === 'approved' && recommendation.approvedCampaignId && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white-10">
            <Check className="w-3 h-3 text-green-400" />
            <span className="text-xs text-white-60">Campaign added to planner</span>
            <a
              href={`/workspaces/${clientId}/planner?campaignId=${recommendation.approvedCampaignId}`}
              className="ml-auto flex items-center gap-1 text-xs text-accent-green-110 hover:text-accent-green-110/80 transition-colors"
            >
              View in Planner
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Inline reasoning — first reason shown directly */}
        {!isInactive && reasons.length > 0 && (
          <p className="text-xs text-white-50 flex items-center gap-1.5 mt-2">
            <Sparkles className="w-3 h-3 text-white-30 shrink-0" />
            {reasons[0]}
          </p>
        )}

        {/* Why This — remaining reasons */}
        {!isInactive && reasons.length > 1 && (
          <div className="mt-2">
            <WhyThis reasons={reasons.slice(1)} />
          </div>
        )}

        {/* Actions */}
        {!isInactive && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white-10">
            {status === 'pending' && (
              <>
                <button
                  onClick={() => onGenerate(recommendation.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold hover:bg-accent-green-110/20 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate Drafts
                </button>
                <button
                  onClick={() => onDismiss(recommendation.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white-40 text-xs hover:bg-white-10 hover:text-white-60 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Dismiss
                </button>
              </>
            )}

            {status === 'generating' && (
              <div className="flex items-center gap-2 text-xs text-white-40">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating campaign...
              </div>
            )}

            {status === 'ready' && (
              <>
                <button
                  onClick={() => onApprove(recommendation.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold hover:bg-accent-green-110/20 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Approve & Save
                </button>
                <button
                  onClick={() => onViewDetails(recommendation.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white-60 text-xs hover:bg-white-10 hover:text-white-100 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  View Details
                </button>
                <button
                  onClick={() => onConvert(recommendation.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white-40 text-xs hover:bg-white-10 hover:text-white-60 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit in Builder
                </button>
                <button
                  onClick={() => onDismiss(recommendation.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white-40 text-xs hover:bg-white-10 hover:text-white-60 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Dismiss
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
