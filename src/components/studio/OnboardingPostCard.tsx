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

interface OnboardingPostCardProps {
  draft: Draft;
  clientId: string;
  defaultScheduleTime: { iso: string; label: string };
  onRegenerated: (newDraft: Draft) => void;
}

export function OnboardingPostCard({
  draft,
  clientId,
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

  return (
    <div className="card p-5 space-y-3 bg-white-5/50">
      {/* Header: channel badge + status */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full bg-accent-green-110/20 text-accent-green-110 text-xs font-medium">
          {draft.channel}
        </span>
        {isScheduled && (
          <span className="px-2 py-0.5 rounded-full bg-zone-blue/20 text-zone-blue text-xs font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Scheduled
          </span>
        )}
        {isApproved && !isScheduled && (
          <span className="px-2 py-0.5 rounded-full bg-zone-green/20 text-zone-green text-xs font-medium flex items-center gap-1">
            <Check className="w-3 h-3" />
            Approved
          </span>
        )}
      </div>

      {/* Generated image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={draft.altText ?? 'Generated image'}
          className="w-full rounded-lg object-cover"
        />
      )}
      {!imageUrl && asset && asset.status !== 'FAILED' && (
        <div className="w-full aspect-video rounded-lg bg-white-5 animate-pulse flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white-30 animate-spin" />
        </div>
      )}

      {/* Body: view or edit */}
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
        <p className="text-sm text-white-100 whitespace-pre-wrap leading-relaxed">
          {draft.body}
        </p>
      )}

      {/* Hashtags */}
      {draft.hashtags && draft.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.hashtags.slice(0, 5).map((tag, j) => (
            <span key={j} className="text-xs text-accent-green-110 font-mono">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Schedule picker */}
      {showSchedule && (
        <div className="flex items-center gap-2 pt-1">
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
            className="text-xs px-2.5 py-1 rounded-md bg-zone-blue/20 text-zone-blue hover:bg-zone-blue/30 disabled:opacity-50 flex items-center gap-1"
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

      {/* Action bar */}
      <div className="flex items-center gap-2 pt-1">
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
            className="text-xs px-2.5 py-1 rounded-md bg-zone-green/20 text-zone-green hover:bg-zone-green/30 disabled:opacity-50 flex items-center gap-1"
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
            className="text-xs px-2.5 py-1 rounded-md bg-zone-blue/20 text-zone-blue hover:bg-zone-blue/30 flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" />
            Schedule
          </button>
        )}

        {!isScheduled && (
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs px-2.5 py-1 rounded-md bg-white-10 text-white-60 hover:bg-white-15 disabled:opacity-50 flex items-center gap-1"
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
    </div>
  );
}
