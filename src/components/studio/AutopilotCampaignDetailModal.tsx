'use client';

import { useRouter } from 'next/navigation';
import { X, Check, Pencil, Sparkles, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutopilotCampaignRecommendation, Channel } from '@/hooks/useSquadpitch';
import { useAutopilotCampaignIntelligence } from '@/hooks/useAutopilotCampaignIntelligence';
import { CHANNEL_LABELS, CAMPAIGN_TYPE_LABELS, formatRelativeExpiry, isExpiringSoon } from './autopilotInboxConstants';

interface AutopilotCampaignDetailModalProps {
  recommendation: AutopilotCampaignRecommendation;
  connectedChannels: Channel[];
  clientId: string;
  onApprove: () => void;
  onDismiss: () => void;
  onConvert: () => void;
  onClose: () => void;
}

export function AutopilotCampaignDetailModal({
  recommendation,
  connectedChannels,
  clientId,
  onApprove,
  onDismiss,
  onConvert,
  onClose,
}: AutopilotCampaignDetailModalProps) {
  const router = useRouter();
  const intelligence = useAutopilotCampaignIntelligence(recommendation, connectedChannels);
  const campaign = recommendation.generatedCampaign;
  const posts = campaign?.campaign.posts ?? [];

  const handleEditInBuilder = () => {
    onConvert();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-sp-bg border border-white-10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white-10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {recommendation.propertyImageUrl ? (
                <img src={recommendation.propertyImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-5 h-5 text-accent-green-110" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white-100">{recommendation.propertyTitle}</h2>
              {recommendation.propertyAddress && (
                <p className="text-xs text-white-40">{recommendation.propertyAddress}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Campaign type + intelligence */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent-green-110" />
              <span className="text-sm font-medium text-white-100">
                {CAMPAIGN_TYPE_LABELS[recommendation.suggestedCampaignType] ?? recommendation.suggestedCampaignType}
              </span>
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                recommendation.confidence === 'high' ? 'bg-green-500/15 text-green-400' :
                recommendation.confidence === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                'bg-white-10 text-white-60',
              )}>
                {recommendation.confidence} confidence
              </span>
            </div>
            {/* Trust attribution */}
            <div className="flex items-center gap-1.5 text-[11px] text-white-40">
              <Sparkles className="w-3 h-3" />
              <span>AI prepared this · you remain in full control</span>
            </div>
            <p className="text-xs text-white-50">{intelligence.campaignType.reason}</p>
          </div>

          {/* Schedule info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-white-40" />
              <span className="text-sm font-medium text-white-100">Schedule</span>
              <span className="text-xs text-white-40">· {intelligence.schedule.preset} preset</span>
              {/* Expiry badge */}
              {recommendation.expiresAt && (
                <span className={cn(
                  'ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium',
                  isExpiringSoon(recommendation.expiresAt)
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'bg-white-10 text-white-40',
                )}>
                  {formatRelativeExpiry(recommendation.expiresAt)}
                </span>
              )}
            </div>
            <p className="text-xs text-white-50">{intelligence.schedule.cadenceReason}</p>
          </div>

          {/* Media & Channels section */}
          {recommendation.suggestedChannels.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white-100">Channels</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {recommendation.suggestedChannels.map((ch) => (
                  <span key={ch} className="px-2 py-0.5 rounded text-[10px] font-medium bg-white-10 text-white-60">
                    {CHANNEL_LABELS[ch] ?? ch}
                  </span>
                ))}
              </div>
              {posts.some((p) => (p as { assignedImageIds?: string[] }).assignedImageIds?.length) && (
                <p className="text-xs text-white-40">
                  Property images will be attached to relevant posts
                </p>
              )}
            </div>
          )}

          {/* Generated posts */}
          {posts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white-100">
                Generated Posts ({posts.length})
              </h3>
              <div className="space-y-2">
                {posts.map((post, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-white-5 border border-white-10"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white-10 text-white-60">
                        {CHANNEL_LABELS[post.channel] ?? post.channel}
                      </span>
                      <span className="text-[10px] text-white-40">
                        Day {post.campaignDay}
                      </span>
                      <span className="text-[10px] text-white-40">
                        · {post.label}
                      </span>
                    </div>
                    <p className="text-xs text-white-80 line-clamp-3">
                      {post.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white-10">
          <button
            onClick={onDismiss}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white-40 text-sm hover:bg-white-10 hover:text-white-60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEditInBuilder}
              className="flex flex-col items-center px-4 py-2 rounded-lg bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Edit in Builder
              </span>
              <span className="text-[10px] text-white-40 font-normal">Converts to manual workflow</span>
            </button>
            <button
              onClick={onApprove}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-green-110 text-sp-dark text-sm font-semibold hover:bg-accent-green-110/90 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Approve & Save to Planner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
