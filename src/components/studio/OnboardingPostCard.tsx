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

const CHANNEL_COLORS: Record<string, { badge: string; bg: string }> = {
  INSTAGRAM: { badge: 'bg-pink-500/20 text-pink-400', bg: 'from-pink-500/5' },
  TIKTOK:    { badge: 'bg-cyan-500/20 text-cyan-400', bg: 'from-cyan-500/5' },
  X:         { badge: 'bg-white/20 text-white/60',     bg: 'from-white/5' },
  LINKEDIN:  { badge: 'bg-blue-500/20 text-blue-400', bg: 'from-blue-500/5' },
  FACEBOOK:  { badge: 'bg-blue-600/20 text-blue-300', bg: 'from-blue-600/5' },
  YOUTUBE:   { badge: 'bg-red-500/20 text-red-400',   bg: 'from-red-500/5' },
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
  defaultScheduleTime: { iso: string; label: string };
  onRegenerated: (newDraft: Draft) => void;
}

export function OnboardingPostCard({
  draft,
  clientId,
  brandName,
  defaultScheduleTime,
  onRegenerated,
}: OnboardingPostCardProps) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(draft.body);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(
    defaultScheduleTime.iso.slice(0, 16) // datetime-local format
  );
  const [regenerating, setRegenerating] = useState(false);

  const updateDraft = useUpdateDraft(draft.id);
  const approveDraft = useApproveDraft(draft.id);
  const scheduleDraft = useScheduleDraft(draft.id);
  const deleteDraft = useDeleteDraft();
  const generate = useGenerateContent();
  const qc = useQueryClient();

  // Poll for assets linked to this draft (triggered by OnboardingWizard fire-and-forget)
  const { data: draftAssets } = useQuery({
    queryKey: ['draft-assets', draft.id],
    queryFn: () =>
      apiFetch<{ assets: MediaAsset[] }>(
        `clients/${clientId}/assets?draftId=${draft.id}&limit=1`,
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

      // Fire-and-forget image generation for the new draft
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

      // Reset asset polling for the new draft
      qc.invalidateQueries({ queryKey: ['draft-assets', newDraft.id] });
    } finally {
      setRegenerating(false);
    }
  };

  const now = new Date();
  const minDate = now.toISOString().slice(0, 16);

  const colors = CHANNEL_COLORS[draft.channel] || { badge: 'bg-white-10 text-white-60', bg: 'from-white/5' };
  const channelLabel = CHANNEL_LABELS[draft.channel] || draft.channel;

  const statusLabel = isScheduled ? 'Scheduled' : isApproved ? 'Approved' : 'Draft';

  const displayName = brandName || 'Your Brand';
  const brandInitial = displayName[0]?.toUpperCase() || '?';

  return (
    <div className={cn(
      'rounded-2xl border border-white-10 overflow-hidden flex flex-col bg-gradient-to-b to-white-5/80',
      colors.bg
    )}>
      {/* Social header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white-10">
        <div className="w-9 h-9 rounded-full bg-white-10 flex items-center justify-center text-sm font-bold text-white-60 flex-shrink-0">
          {brandInitial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white-80 truncate">{displayName}</p>
          <p className="text-[11px] text-white-30">
            {channelLabel} · {statusLabel}
          </p>
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0', colors.badge)}>
          {channelLabel}
        </span>
        {isScheduled && <Calendar className="w-3.5 h-3.5 text-zone-blue flex-shrink-0" />}
        {isApproved && !isScheduled && <Check className="w-3.5 h-3.5 text-zone-green flex-shrink-0" />}
      </div>

      {/* Image — edge-to-edge */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={draft.altText ?? 'Generated image'}
          className="w-full aspect-[4/3] object-cover"
        />
      )}
      {!imageUrl && asset && asset.status !== 'FAILED' && (
        <div className="w-full aspect-[4/3] bg-white-10 animate-pulse flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white-30 animate-spin" />
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-3 flex-1">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm p-3 focus:outline-none focus:border-accent-green-110 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={updateDraft.isPending}
                className="text-xs px-2.5 py-1 rounded-md bg-accent-green-110/20 text-accent-green-110 hover:bg-accent-green-110/30 disabled:opacity-50 flex items-center gap-1"
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
                className="text-xs px-2.5 py-1 rounded-md bg-white-10 text-white-60 hover:bg-white-15"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white-90 whitespace-pre-wrap leading-relaxed">
            {draft.body}
          </p>
        )}

        {/* Hashtags */}
        {draft.hashtags && draft.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {draft.hashtags.slice(0, 5).map((tag, j) => (
              <span key={j} className="text-xs text-accent-green-110/80 font-mono">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white-10">
        {!editing && !isScheduled && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2.5 py-1 rounded-md bg-white-10 text-white-60 hover:bg-white-15 flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}

        {!isApproved && (
          <button
            onClick={handleApprove}
            disabled={approveDraft.isPending}
            className="text-xs px-2.5 py-1 rounded-md bg-zone-green/10 text-zone-green hover:bg-zone-green/20 disabled:opacity-50 flex items-center gap-1"
          >
            {approveDraft.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Approve
          </button>
        )}

        {!isScheduled && !showSchedule && (
          <button
            onClick={() => setShowSchedule(true)}
            className="text-xs px-2.5 py-1 rounded-md bg-zone-blue/10 text-zone-blue hover:bg-zone-blue/20 flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" />
            Schedule
          </button>
        )}

        {!isScheduled && (
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs px-2.5 py-1 rounded-md bg-white-10 text-white-60 hover:bg-white-15 disabled:opacity-50 flex items-center gap-1 ml-auto"
          >
            {regenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Regenerate
          </button>
        )}
      </div>

      {/* Schedule picker */}
      {showSchedule && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white-10">
          <input
            type="datetime-local"
            value={scheduleDate}
            min={minDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="rounded-md bg-white-5 border border-white-10 text-white-100 text-xs px-2 py-1 focus:outline-none focus:border-accent-green-110"
          />
          <button
            onClick={handleSchedule}
            disabled={scheduleDraft.isPending || approveDraft.isPending}
            className="text-xs px-2.5 py-1 rounded-md bg-zone-blue/10 text-zone-blue hover:bg-zone-blue/20 disabled:opacity-50 flex items-center gap-1"
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
            className="text-xs px-2.5 py-1 rounded-md bg-white-10 text-white-60 hover:bg-white-15"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
