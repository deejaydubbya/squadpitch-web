'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Pencil,
  Check,
  Calendar,
  RefreshCw,
  X,
  Heart,
  MessageCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/apiFetch';
import {
  useUpdateDraft,
  useApproveDraft,
  useScheduleDraft,
  useDeleteDraft,
  useGenerateContent,
  type Draft,
  type MediaAsset,
} from '@/hooks/useSquadpitch';

const CHANNEL_COLORS: Record<string, { badge: string; accent: string }> = {
  INSTAGRAM: { badge: 'bg-pink-500/20 text-pink-300', accent: 'text-pink-300' },
  TIKTOK:    { badge: 'bg-cyan-500/20 text-cyan-300', accent: 'text-cyan-300' },
  X:         { badge: 'bg-white-15 text-white-70',     accent: 'text-white-70' },
  LINKEDIN:  { badge: 'bg-blue-500/20 text-blue-300', accent: 'text-blue-300' },
  FACEBOOK:  { badge: 'bg-blue-600/20 text-blue-300', accent: 'text-blue-300' },
  YOUTUBE:   { badge: 'bg-red-500/20 text-red-300',   accent: 'text-red-300' },
};

const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  X: 'X',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
};

const CONTENT_TYPE_STYLE = 'bg-accent-green-110/12 text-accent-green-110/80 border border-accent-green-110/15';

const INDUSTRY_ATTRIBUTION: Record<string, string> = {
  real_estate: 'Based on your listing data',
  car_sales: 'Based on your inventory',
  property_management: 'Based on your property data',
  restaurant: 'Based on your menu & offerings',
  ecommerce: 'Based on your product catalog',
  fitness: 'Based on your programs',
  legal: 'Based on your services',
  mortgage: 'Based on your services',
  insurance: 'Based on your coverage options',
  finance: 'Based on your services',
};

const FAKE_TIMESTAMPS = ['2h ago', '4h ago', '1h ago', '6h ago', '30m ago'];

interface OnboardingPostCardProps {
  draft: Draft;
  clientId: string;
  brandName?: string;
  logoUrl?: string;
  defaultScheduleTime: { iso: string; label: string };
  onRegenerated: (newDraft: Draft) => void;
  contentType?: string;
  isFirstPost?: boolean;
  industryKey?: string;
  postIndex?: number;
  channelConnected?: boolean;
  onConnectChannel?: () => void;
}

export function OnboardingPostCard({
  draft: draftProp,
  clientId,
  brandName,
  logoUrl,
  defaultScheduleTime,
  onRegenerated,
  contentType,
  isFirstPost,
  industryKey,
  postIndex = 0,
  channelConnected,
  onConnectChannel,
}: OnboardingPostCardProps) {
  // Local draft state — optimistically updated after mutations so UI stays in sync
  const [localDraft, setLocalDraft] = useState(draftProp);
  const draft = localDraft;

  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(draft.body);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(
    defaultScheduleTime.iso.slice(0, 16)
  );
  const [regenerating, setRegenerating] = useState(false);

  const updateDraft = useUpdateDraft(draft.id);
  const approveDraft = useApproveDraft(draft.id);
  const scheduleDraft = useScheduleDraft(draft.id);
  const deleteDraft = useDeleteDraft();
  const generate = useGenerateContent();
  const qc = useQueryClient();

  const [carouselIndex, setCarouselIndex] = useState(0);

  const { data: draftAssets } = useQuery({
    queryKey: ['draft-assets', draft.id],
    queryFn: () =>
      apiFetch<{ assets: MediaAsset[] }>(
        `workspaces/${clientId}/assets?draftId=${draft.id}&limit=10`,
      ),
    select: (d) => d.assets,
    refetchInterval: (query) => {
      const raw = query.state.data as { assets: MediaAsset[] } | undefined;
      const assets = raw?.assets;
      if (!assets || assets.length === 0) return 3000;
      if (assets.every((a) => a.status === 'READY' || a.status === 'FAILED')) return false;
      return 3000;
    },
  });

  const readyAssets = (draftAssets ?? []).filter((a) => a.status === 'READY' && a.url);
  const hasMultipleImages = readyAssets.length > 1;
  // Primary image: first ready asset or draft.mediaUrl
  const imageUrl = readyAssets[carouselIndex]?.url ?? readyAssets[0]?.url ?? draft.mediaUrl;
  const isLoading = draftAssets && draftAssets.length > 0 && readyAssets.length === 0
    && draftAssets.some((a) => a.status !== 'FAILED');

  const isApproved = draft.status === 'APPROVED' || draft.status === 'SCHEDULED';
  const isScheduled = draft.status === 'SCHEDULED';

  const handleSaveEdit = async () => {
    await updateDraft.mutateAsync({ body: editBody });
    setLocalDraft((d) => ({ ...d, body: editBody }));
    setEditing(false);
  };

  const handleApprove = async () => {
    if (!isApproved) {
      await approveDraft.mutateAsync();
      setLocalDraft((d) => ({ ...d, status: 'APPROVED' }));
    }
  };

  const handleSchedule = async () => {
    if (!isApproved) {
      await approveDraft.mutateAsync();
    }
    const iso = new Date(scheduleDate).toISOString();
    await scheduleDraft.mutateAsync(iso);
    setLocalDraft((d) => ({ ...d, status: 'SCHEDULED', scheduledFor: iso }));
    setShowSchedule(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const newDraft = await generate.mutateAsync({
        clientId,
        kind: draft.kind,
        channel: draft.channel,
        guidance: draft.generationGuidance || `Create an engaging ${draft.channel} post.`,
      });
      await deleteDraft.mutateAsync(draft.id);
      setLocalDraft(newDraft);
      setEditBody(newDraft.body);
      onRegenerated(newDraft);

      if (newDraft.imageGuidance) {
        apiFetch('assets/generate', {
          method: 'POST',
          body: JSON.stringify({
            clientId,
            guidance: newDraft.imageGuidance,
            draftId: newDraft.id,
            channel: newDraft.channel,
          }),
        }).catch(() => {});
      }

      qc.invalidateQueries({ queryKey: ['draft-assets', newDraft.id] });
    } finally {
      setRegenerating(false);
    }
  };

  const now = new Date();
  const minDate = now.toISOString().slice(0, 16);

  const colors = CHANNEL_COLORS[draft.channel] || { badge: 'bg-white-10 text-white-60', accent: 'text-white-60' };
  const channelLabel = CHANNEL_LABELS[draft.channel] || draft.channel;

  const displayName = brandName || 'Your Brand';
  const brandInitial = displayName[0]?.toUpperCase() || '?';
  const handle = '@' + displayName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
  const fakeTimestamp = FAKE_TIMESTAMPS[postIndex % FAKE_TIMESTAMPS.length];

  // Split body into caption and hashtags for display
  const bodyLines = draft.body.split('\n');
  const captionLines: string[] = [];
  const inlineHashtags: string[] = [];
  for (const line of bodyLines) {
    if (/^#\w/.test(line.trim())) {
      inlineHashtags.push(...line.trim().split(/\s+/).filter(t => t.startsWith('#')));
    } else {
      captionLines.push(line);
    }
  }
  const captionText = captionLines.join('\n').trim();
  const allHashtags = [
    ...inlineHashtags,
    ...(draft.hashtags ?? []).map(t => t.startsWith('#') ? t : `#${t}`),
  ];
  const uniqueHashtags = Array.from(new Set(allHashtags)).slice(0, 8);

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden flex flex-col bg-sp-card shadow-lg shadow-black/20',
      isScheduled
        ? 'border-zone-blue/40 ring-1 ring-zone-blue/15'
        : isApproved
          ? 'border-zone-green/40 ring-1 ring-zone-green/15'
          : isFirstPost
            ? 'border-accent-green-110/40 ring-1 ring-accent-green-110/20'
            : 'border-white-15'
    )}>
      {isFirstPost && !isApproved && !isScheduled && (
        <div className="px-4 py-2 bg-accent-green-110/10 text-accent-green-110 text-xs font-medium flex items-center gap-1.5">
          <Check className="w-3 h-3" />
          Start here — approve or edit this post
        </div>
      )}
      {/* Social-style header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white-10">
        <div className="w-9 h-9 rounded-full bg-accent-green-110/15 flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-accent-green-110">{brandInitial}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <p className="text-[11px] text-white-40 truncate">{handle} · {fakeTimestamp}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {contentType && (
            <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase', CONTENT_TYPE_STYLE)}>
              {contentType}
            </span>
          )}
          <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-medium', colors.badge)}>
            {channelLabel} Preview
          </span>
        </div>
      </div>

      {/* Image / Carousel */}
      {imageUrl ? (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={draft.altText ?? 'Generated image'}
            className="w-full aspect-[4/3] object-cover"
          />
          {/* Carousel navigation arrows */}
          {hasMultipleImages && (
            <>
              <button
                onClick={() => setCarouselIndex((prev) => (prev - 1 + readyAssets.length) % readyAssets.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCarouselIndex((prev) => (prev + 1) % readyAssets.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Carousel dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {readyAssets.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all cursor-pointer',
                      idx === carouselIndex ? 'bg-white w-3' : 'bg-white/50',
                    )}
                    aria-label={`Image ${idx + 1}`}
                  />
                ))}
              </div>
              {/* Image counter */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                {carouselIndex + 1}/{readyAssets.length}
              </div>
            </>
          )}
        </div>
      ) : isLoading ? (
        <div className="w-full aspect-[4/3] bg-white-5 animate-pulse flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white-30 animate-spin" />
        </div>
      ) : null}

      {/* Caption */}
      <div className="px-4 py-4 flex-1">
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={5}
              className="w-full rounded-xl bg-white-5 border border-white-15 text-white text-sm p-3 focus:outline-none focus:border-accent-green-110 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={updateDraft.isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-bg font-medium hover:bg-accent-green-120 disabled:opacity-50 flex items-center gap-1"
              >
                {updateDraft.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Save
              </button>
              <button
                onClick={() => {
                  setEditBody(draft.body);
                  setEditing(false);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white-10 text-white-70 hover:bg-white-15"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13.5px] text-white-90 whitespace-pre-wrap leading-[1.65]">
              {captionText}
            </p>
            {uniqueHashtags.length > 0 && (
              <p className="text-[11.5px] text-accent-green-110/60 leading-relaxed tracking-wide">
                {uniqueHashtags.join(' ')}
              </p>
            )}
            <div className="flex items-center gap-2 pt-0.5 text-[11px] text-white-25">
              <span className="w-3 h-px bg-white-15 inline-block" />
              <span>
                {industryKey && INDUSTRY_ATTRIBUTION[industryKey]
                  ? INDUSTRY_ATTRIBUTION[industryKey]
                  : 'Generated from your business data'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Static social engagement icons */}
      {!editing && (
        <div className="flex items-center gap-5 px-4 pb-3 text-white-30">
          <Heart className="w-4 h-4 hover:text-pink-400 transition-colors cursor-default" />
          <MessageCircle className="w-4 h-4 hover:text-blue-400 transition-colors cursor-default" />
          <Share2 className="w-4 h-4 hover:text-white-50 transition-colors cursor-default" />
        </div>
      )}

      {/* Status indicator */}
      {(isApproved || isScheduled) && (
        <div className={cn(
          'px-4 py-2 text-xs font-medium flex items-center gap-1.5',
          isScheduled ? 'bg-zone-blue/10 text-zone-blue' : 'bg-zone-green/10 text-zone-green'
        )}>
          {isScheduled ? (
            <>
              <Calendar className="w-3 h-3" />
              Scheduled for {new Date(draft.scheduledFor || scheduleDate).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              Approved
            </>
          )}
        </div>
      )}

      {/* Action footer */}
      {!isScheduled && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-white-10">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white-10 text-white-70 hover:bg-white-15 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}

          {!isApproved && (
            <button
              onClick={handleApprove}
              disabled={approveDraft.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-zone-green/15 text-zone-green hover:bg-zone-green/25 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {approveDraft.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Approve
            </button>
          )}

          {!showSchedule && (
            channelConnected ? (
              <button
                onClick={() => setShowSchedule(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-zone-blue/15 text-zone-blue hover:bg-zone-blue/25 flex items-center gap-1.5 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                Schedule
              </button>
            ) : onConnectChannel ? (
              <button
                onClick={onConnectChannel}
                className="text-xs px-3 py-1.5 rounded-lg bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60 flex items-center gap-1.5 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                Connect to schedule
              </button>
            ) : null
          )}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs px-3 py-1.5 rounded-lg bg-white-10 text-white-60 hover:bg-white-15 hover:text-white disabled:opacity-50 flex items-center gap-1.5 ml-auto transition-colors"
          >
            {regenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Regenerate
          </button>
        </div>
      )}

      {/* Schedule picker */}
      {showSchedule && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white-10">
          <input
            type="datetime-local"
            value={scheduleDate}
            min={minDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="rounded-lg bg-white-5 border border-white-15 text-white text-xs px-2.5 py-1.5 focus:outline-none focus:border-accent-green-110"
          />
          <button
            onClick={handleSchedule}
            disabled={scheduleDraft.isPending || approveDraft.isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-zone-blue/15 text-zone-blue hover:bg-zone-blue/25 disabled:opacity-50 flex items-center gap-1.5"
          >
            {scheduleDraft.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Confirm
          </button>
          <button
            onClick={() => setShowSchedule(false)}
            className="text-xs px-2 py-1.5 rounded-lg bg-white-10 text-white-60 hover:bg-white-15"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
