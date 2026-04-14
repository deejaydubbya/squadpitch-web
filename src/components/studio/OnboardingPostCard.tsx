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
  INSTAGRAM: { badge: 'bg-pink-500/20 text-pink-400', accent: 'text-pink-400' },
  TIKTOK:    { badge: 'bg-cyan-500/20 text-cyan-400', accent: 'text-cyan-400' },
  X:         { badge: 'bg-white-20 text-white-60',     accent: 'text-white-60' },
  LINKEDIN:  { badge: 'bg-blue-500/20 text-blue-400', accent: 'text-blue-400' },
  FACEBOOK:  { badge: 'bg-blue-600/20 text-blue-300', accent: 'text-blue-300' },
  YOUTUBE:   { badge: 'bg-red-500/20 text-red-400',   accent: 'text-red-400' },
};

const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  X: 'X',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
};

interface OnboardingPostCardProps {
  draft: Draft;
  clientId: string;
  brandName?: string;
  logoUrl?: string;
  defaultScheduleTime: { iso: string; label: string };
  onRegenerated: (newDraft: Draft) => void;
}

export function OnboardingPostCard({
  draft,
  clientId,
  brandName,
  logoUrl,
  defaultScheduleTime,
  onRegenerated,
}: OnboardingPostCardProps) {
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

  const { data: draftAssets } = useQuery({
    queryKey: ['draft-assets', draft.id],
    queryFn: () =>
      apiFetch<{ assets: MediaAsset[] }>(
        `workspaces/${clientId}/assets?draftId=${draft.id}&limit=1`,
      ),
    select: (d) => d.assets,
    refetchInterval: (query) => {
      const raw = query.state.data as { assets: MediaAsset[] } | undefined;
      const assets = raw?.assets;
      if (!assets || assets.length === 0) return 3000;
      if (assets[0].status === 'READY' || assets[0].status === 'FAILED') return false;
      return 3000;
    },
  });

  const asset = draftAssets?.[0] ?? null;
  const imageUrl = draft.mediaUrl ?? (asset?.status === 'READY' ? asset.url : null);

  const isApproved = draft.status === 'APPROVED' || draft.status === 'SCHEDULED';
  const isScheduled = draft.status === 'SCHEDULED';

  const handleSaveEdit = async () => {
    await updateDraft.mutateAsync({ body: editBody });
    setEditing(false);
  };

  const handleApprove = async () => {
    if (!isApproved) {
      await approveDraft.mutateAsync();
    }
  };

  const handleSchedule = async () => {
    if (!isApproved) {
      await approveDraft.mutateAsync();
    }
    await scheduleDraft.mutateAsync(new Date(scheduleDate).toISOString());
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
  // Deduplicate
  const uniqueHashtags = Array.from(new Set(allHashtags)).slice(0, 8);

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden flex flex-col',
      'bg-sp-card',
      isScheduled
        ? 'border-zone-blue/50 ring-1 ring-zone-blue/20'
        : isApproved
          ? 'border-zone-green/50 ring-1 ring-zone-green/20'
          : 'border-white-15'
    )}>
      {/* Social-style header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-accent-green-110/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-accent-green-110">{brandInitial}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <p className="text-xs text-white-60">{channelLabel}</p>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium', colors.badge)}>
          {channelLabel}
        </span>
      </div>

      {/* Image — edge-to-edge */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={draft.altText ?? 'Generated image'}
          className="w-full aspect-[4/3] object-cover"
        />
      ) : asset && asset.status !== 'FAILED' ? (
        <div className="w-full aspect-[4/3] bg-[#232840] animate-pulse flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white-40 animate-spin" />
        </div>
      ) : null}

      {/* Caption body */}
      <div className="px-4 py-4 flex-1 space-y-3">
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
                className="text-xs px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-surface font-medium hover:bg-accent-green-120 disabled:opacity-50 flex items-center gap-1"
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
          <>
            <p className="text-[13px] text-white whitespace-pre-wrap leading-[1.7]">
              {captionText}
            </p>
            {uniqueHashtags.length > 0 && (
              <p className="text-[13px] text-accent-green-110/80 leading-relaxed">
                {uniqueHashtags.join(' ')}
              </p>
            )}
          </>
        )}
      </div>

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
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-t border-white-15">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white-10 text-white-80 hover:bg-white-15 hover:text-white flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}

          {!isApproved && (
            <button
              onClick={handleApprove}
              disabled={approveDraft.isPending}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-zone-green/15 text-zone-green hover:bg-zone-green/25 disabled:opacity-50 flex items-center gap-1"
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
            <button
              onClick={() => setShowSchedule(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-zone-blue/15 text-zone-blue hover:bg-zone-blue/25 flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              Schedule
            </button>
          )}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white-10 text-white-70 hover:bg-white-15 hover:text-white disabled:opacity-50 flex items-center gap-1"
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
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white-15">
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
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zone-blue/15 text-zone-blue hover:bg-zone-blue/25 disabled:opacity-50 flex items-center gap-1"
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
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white-10 text-white-70 hover:bg-white-15"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
