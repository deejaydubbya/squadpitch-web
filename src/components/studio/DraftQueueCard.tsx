'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Check,
  X,
  Calendar,
  Send,
  ChevronDown,
  ChevronUp,
  Pencil,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ImagePlus,
  Trash2,
  CopyPlus,
  RefreshCw,
  Film,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUpdateDraft,
  useApproveDraft,
  useRejectDraft,
  useScheduleDraft,
  usePublishDraft,
  useDeleteDraft,
  useDuplicateDraft,
  useGenerateContent,
  useGenerateMedia,
  useGenerateVideo,
  type Draft,
} from '@/hooks/useSquadpitch';
import { DraftPreviewCard } from './DraftPreviewCard';
import { StatusBanner } from '@/components/common/StatusBanner';
import { MediaLightbox } from './MediaLightbox';

interface Props {
  draft: Draft;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

export function DraftQueueCard({ draft, selected, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [body, setBody] = useState(draft.body);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const qc = useQueryClient();
  const updateDraft = useUpdateDraft(draft.id);
  const approve = useApproveDraft(draft.id);
  const reject = useRejectDraft(draft.id);
  const schedule = useScheduleDraft(draft.id);
  const publish = usePublishDraft(draft.id);
  const deleteDraft = useDeleteDraft();
  const duplicateDraft = useDuplicateDraft();
  const regenerate = useGenerateContent();
  const generateMedia = useGenerateMedia(draft.clientId);
  const generateVideo = useGenerateVideo(draft.clientId);

  const isEditable = draft.status === 'DRAFT' || draft.status === 'PENDING_REVIEW';
  const canApprove = isEditable;
  const canReject = isEditable || draft.status === 'APPROVED' || draft.status === 'SCHEDULED';
  const canSchedule = draft.status === 'APPROVED';
  const canPublish = draft.status === 'APPROVED' || draft.status === 'SCHEDULED';

  const anyError =
    (updateDraft.error as Error | null) ||
    (approve.error as Error | null) ||
    (reject.error as Error | null) ||
    (schedule.error as Error | null) ||
    (publish.error as Error | null) ||
    (deleteDraft.error as Error | null) ||
    (duplicateDraft.error as Error | null) ||
    (regenerate.error as Error | null) ||
    (generateMedia.error as Error | null) ||
    (generateVideo.error as Error | null);

  const handleSaveBody = () => {
    updateDraft.mutate(
      { body },
      {
        onSuccess: () => setEditMode(false),
      }
    );
  };

  const handleSchedule = () => {
    if (!scheduleDate) return;
    schedule.mutate(new Date(scheduleDate).toISOString(), {
      onSuccess: () => {
        setShowSchedule(false);
        setScheduleDate('');
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    reject.mutate(rejectReason.trim(), {
      onSuccess: () => {
        setShowReject(false);
        setRejectReason('');
      },
    });
  };

  const handleRegenerate = () => {
    regenerate.mutate({
      clientId: draft.clientId,
      kind: draft.kind,
      channel: draft.channel,
      bucketKey: draft.bucketKey || undefined,
      guidance: draft.generationGuidance,
    });
  };

  const showPublishError =
    draft.publishError && draft.status !== 'PUBLISHED';

  const statusBorderColors: Record<string, string> = {
    DRAFT: 'border-l-white-20',
    PENDING_REVIEW: 'border-l-yellow-400',
    APPROVED: 'border-l-green-400',
    SCHEDULED: 'border-l-blue-400',
    PUBLISHED: 'border-l-accent-green-110',
    REJECTED: 'border-l-red-400',
    FAILED: 'border-l-red-400',
  };

  return (
    <div className={cn(
      'card p-0 overflow-hidden border-l-[3px] transition-shadow hover:shadow-lg hover:shadow-black/10',
      statusBorderColors[draft.status] ?? 'border-l-white-10'
    )}>
      <div className="p-4">
        {onSelect && (
          <div className="float-left mr-3 mt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(draft.id, e.target.checked)}
              className="accent-accent-green-110"
            />
          </div>
        )}
        <DraftPreviewCard draft={draft} compact={!expanded} />
      </div>

      {/* Media indicator */}
      <div className={cn(
        'border-t border-white-10 px-4 py-2.5 flex items-center gap-3',
        draft.mediaUrl ? 'bg-accent-green-110/3' : 'bg-white-5'
      )}>
        {draft.mediaUrl ? (
          <>
            <button
              onClick={() => setLightboxOpen(true)}
              className="flex-shrink-0 hover:opacity-90 transition-opacity rounded-lg overflow-hidden"
              title="Click to preview"
            >
              {draft.mediaType === 'video' ? (
                <div className="w-14 h-14 rounded-lg bg-white-10 flex items-center justify-center">
                  <Film className="w-5 h-5 text-white-60" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.mediaUrl}
                  alt="Attached media"
                  className="w-14 h-14 rounded-lg object-cover"
                />
              )}
            </button>
            <button
              onClick={() => setLightboxOpen(true)}
              className="text-xs text-white-60 truncate flex-1 text-left hover:text-white-100 transition-colors"
            >
              {draft.mediaType === 'video' ? 'Video attached' : 'Image attached'}
            </button>
            <Link
              href={`/workspaces/${draft.clientId}/assets`}
              className="text-[10px] text-accent-green-110 hover:underline"
            >
              Change
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href={`/workspaces/${draft.clientId}/assets?draftId=${draft.id}`}
              className="flex items-center gap-1.5 text-xs text-white-40 hover:text-accent-green-110 transition-colors"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Add image
            </Link>
            <button
              onClick={() => {
                generateMedia.mutate(
                  {
                    clientId: draft.clientId,
                    guidance:
                      draft.imageGuidance ||
                      draft.altText ||
                      draft.body.slice(0, 500),
                    draftId: draft.id,
                    channel: draft.channel,
                  },
                  {
                    onSuccess: () => {
                      qc.invalidateQueries({
                        queryKey: ['squadpitch', 'drafts'],
                      });
                    },
                  }
                );
              }}
              disabled={generateMedia.isPending}
              className="flex items-center gap-1.5 text-xs text-white-40 hover:text-accent-green-110 transition-colors disabled:opacity-50"
            >
              {generateMedia.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" />
              )}
              Generate Image
            </button>
            <button
              onClick={() => {
                generateVideo.mutate(
                  {
                    clientId: draft.clientId,
                    guidance:
                      draft.imageGuidance ||
                      draft.altText ||
                      draft.body.slice(0, 500),
                    draftId: draft.id,
                    channel: draft.channel,
                  },
                  {
                    onSuccess: () => {
                      qc.invalidateQueries({
                        queryKey: ['squadpitch', 'drafts'],
                      });
                    },
                  }
                );
              }}
              disabled={generateVideo.isPending}
              className="flex items-center gap-1.5 text-xs text-white-40 hover:text-accent-green-110 transition-colors disabled:opacity-50"
            >
              {generateVideo.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Video className="w-3.5 h-3.5" />
              )}
              Generate Video
            </button>
          </div>
        )}
      </div>

      {showPublishError && (
        <div className="border-t border-white-10 px-4 py-3 bg-accent-red/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
            <div className="text-xs text-white-80">
              <span className="text-accent-red font-medium">
                Last publish attempt failed:
              </span>{' '}
              {draft.publishError}. Click Publish to retry.
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-white-10 px-4 py-3 flex items-center gap-2 flex-wrap bg-white-5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-white-60 hover:text-white-100 flex items-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Expand
            </>
          )}
        </button>

        {isEditable && (
          <button
            onClick={() => setEditMode((v) => !v)}
            className="text-xs text-white-60 hover:text-white-100 flex items-center gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            {editMode ? 'Cancel' : 'Edit'}
          </button>
        )}

        <button
          onClick={() => duplicateDraft.mutate(draft.id)}
          disabled={duplicateDraft.isPending}
          className="text-xs text-white-60 hover:text-white-100 flex items-center gap-1"
          title="Duplicate"
        >
          {duplicateDraft.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CopyPlus className="w-3.5 h-3.5" />
          )}
          Duplicate
        </button>

        <button
          onClick={handleRegenerate}
          disabled={regenerate.isPending || !draft.generationGuidance}
          className="text-xs text-white-60 hover:text-white-100 flex items-center gap-1"
          title="Regenerate with same guidance"
        >
          {regenerate.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Regenerate
        </button>

        <button
          onClick={() => {
            if (confirm('Delete this draft?')) deleteDraft.mutate(draft.id);
          }}
          disabled={deleteDraft.isPending}
          className="text-xs text-white-60 hover:text-accent-red flex items-center gap-1"
          title="Delete"
        >
          {deleteDraft.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Delete
        </button>

        <div className="flex-1" />

        {draft.externalPostUrl && draft.status === 'PUBLISHED' && (
          <a
            href={draft.externalPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 rounded-md bg-white-10 text-white-80 hover:bg-white-20 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            {draft.channel === 'INSTAGRAM'
              ? 'View on Instagram'
              : 'View post'}
          </a>
        )}

        {canApprove && (
          <button
            onClick={() => approve.mutate()}
            disabled={approve.isPending}
            className="text-xs px-2.5 py-1 rounded-md bg-zone-green/20 text-zone-green hover:bg-zone-green/30 flex items-center gap-1 disabled:opacity-50"
          >
            {approve.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Approve
          </button>
        )}
        {canReject && (
          <button
            onClick={() => setShowReject((v) => !v)}
            className="text-xs px-2.5 py-1 rounded-md bg-accent-red/20 text-accent-red hover:bg-accent-red/30 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Reject
          </button>
        )}
        {canSchedule && (
          <button
            onClick={() => setShowSchedule((v) => !v)}
            className="text-xs px-2.5 py-1 rounded-md bg-zone-blue/20 text-zone-blue hover:bg-zone-blue/30 flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" /> Schedule
          </button>
        )}
        {canPublish && (
          <button
            onClick={() => publish.mutate()}
            disabled={publish.isPending}
            className="text-xs px-2.5 py-1 rounded-md bg-accent-green-110/20 text-accent-green-110 hover:bg-accent-green-110/30 flex items-center gap-1 disabled:opacity-50"
          >
            {publish.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Publish
          </button>
        )}
      </div>

      {editMode && (
        <div className="border-t border-white-10 p-4 bg-white-5 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
          />
          <button
            onClick={handleSaveBody}
            disabled={updateDraft.isPending}
            className="btn btn-primary text-xs flex items-center gap-1"
          >
            {updateDraft.isPending && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            Save changes
          </button>
        </div>
      )}

      {showReject && (
        <div className="border-t border-white-10 p-4 bg-white-5 space-y-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection"
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-red"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim() || reject.isPending}
              className="text-xs px-3 py-1.5 rounded-md bg-accent-red/20 text-accent-red hover:bg-accent-red/30 disabled:opacity-50"
            >
              Confirm rejection
            </button>
            <button
              onClick={() => setShowReject(false)}
              className="text-xs px-3 py-1.5 rounded-md bg-white-10 text-white-60 hover:bg-white-20"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSchedule && (
        <div className="border-t border-white-10 p-4 bg-white-5 space-y-2">
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            style={{ colorScheme: 'dark' }}
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSchedule}
              disabled={!scheduleDate || schedule.isPending}
              className="text-xs px-3 py-1.5 rounded-md bg-zone-blue/20 text-zone-blue hover:bg-zone-blue/30 disabled:opacity-50"
            >
              Confirm schedule
            </button>
            <button
              onClick={() => setShowSchedule(false)}
              className="text-xs px-3 py-1.5 rounded-md bg-white-10 text-white-60 hover:bg-white-20"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confidence moment — success feedback */}
      {approve.isSuccess && (
        <div className="border-t border-white-10 px-4 py-2.5 bg-green-500/5 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-400 font-medium">Approved — ready to schedule or publish</span>
        </div>
      )}
      {publish.isSuccess && (
        <div className="border-t border-white-10 px-4 py-2.5 bg-accent-green-110/5 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-accent-green-110" />
          <span className="text-xs text-accent-green-110 font-medium">Published successfully</span>
        </div>
      )}
      {schedule.isSuccess && (
        <div className="border-t border-white-10 px-4 py-2.5 bg-blue-500/5 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs text-blue-400 font-medium">Scheduled — it will publish automatically</span>
        </div>
      )}

      {anyError && (
        <div className="border-t border-white-10 p-4 bg-white-5">
          <StatusBanner error={anyError.message} />
        </div>
      )}

      {lightboxOpen && draft.mediaUrl && (
        <MediaLightbox
          url={draft.mediaUrl}
          type={draft.mediaType ?? 'image'}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
