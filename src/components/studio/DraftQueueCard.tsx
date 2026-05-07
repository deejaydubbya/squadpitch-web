'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  TrendingUp,
  Minus,
  TrendingDown,
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
  useRatePerformance,
  useChannelConnectionStatus,
  type Draft,
  type PerformanceRating,
} from '@/hooks/useSquadpitch';
import { validatePublishEligibility } from '@/lib/publishValidator';
import { interpretPublishError } from '@/lib/publishErrorMessage';
import { getChannelLabel, getChannelRequirementHint } from '@/lib/channelRegistry';
import { useSubscription, useUsage } from '@/hooks/useBilling';
import { isAtOrAboveTier } from '@/lib/tierConfig';
import { UpgradeTriggerBanner } from '@/components/billing/UpgradeTriggerBanner';
import { DraftPreviewCard } from './DraftPreviewCard';
import { StatusBanner } from '@/components/common/StatusBanner';
import { MediaLightbox } from './MediaLightbox';
import { MediaSwapModal } from './MediaSwapModal';
import { InlineActionsMenu } from './InlineActionsMenu';
import { OverflowMenu, type OverflowMenuItem } from './OverflowMenu';
import { DraftOptimizations } from './OptimizationSuggestions';

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
  const [showMediaSwap, setShowMediaSwap] = useState(false);
  const [generatingMedia, setGeneratingMedia] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear polling when media arrives or component unmounts
  useEffect(() => {
    if (generatingMedia && draft.mediaUrl) {
      setGeneratingMedia(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [generatingMedia, draft.mediaUrl]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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
  const ratePerformance = useRatePerformance(draft.clientId);
  const connectionStatus = useChannelConnectionStatus(draft.clientId);
  const eligibility = validatePublishEligibility(draft, connectionStatus, draft.clientId);
  const { data: _sub } = useSubscription();
  const { data: _usage } = useUsage();
  const _belowPro = !isAtOrAboveTier(_sub?.tier ?? 'FREE', 'PRO');
  const _postPct = _usage && isFinite(_usage.limits.posts) && _usage.limits.posts > 0
    ? Math.round((_usage.usage.posts / _usage.limits.posts) * 100)
    : 0;
  const _showSchedulePressure = schedule.isSuccess && _belowPro && _postPct >= 70;

  const isEditable = draft.status === 'DRAFT' || draft.status === 'PENDING_REVIEW';
  const canApprove = isEditable;
  const canReject = isEditable || draft.status === 'APPROVED' || draft.status === 'SCHEDULED' || draft.status === 'FAILED';
  const canSchedule = (draft.status === 'APPROVED' || draft.status === 'SCHEDULED' || draft.status === 'FAILED') && eligibility.canSchedule;
  const canPublish = draft.status === 'APPROVED' || draft.status === 'SCHEDULED' || draft.status === 'FAILED';

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
      'rounded-xl border border-white-10 bg-sp-card overflow-hidden border-l-[3px] transition-shadow hover:shadow-lg hover:shadow-black/10',
      statusBorderColors[draft.status] ?? 'border-l-white-10'
    )}>
      <div className="px-5 py-4">
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
        <DraftPreviewCard draft={draft} compact={!expanded} clientId={draft.clientId} />
      </div>

      {/* Media indicator */}
      <div className={cn(
        'border-t border-white-10 px-5 py-3',
        draft.mediaUrl ? 'bg-accent-green-110/3' : ''
      )}>
        {draft.mediaUrl ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 flex-shrink-0 overflow-x-auto">
                {(draft.mediaAssets?.length > 0
                  ? draft.mediaAssets.map((a) => ({ url: a.assetType === 'video' ? (a.thumbnailUrl || a.url) : a.url, isVideo: a.assetType === 'video', key: a.id }))
                  : [{ url: draft.mediaUrl, isVideo: draft.mediaType === 'video', key: 'primary' }]
                ).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setLightboxOpen(true)}
                    className="flex-shrink-0 hover:opacity-90 transition-opacity rounded-lg overflow-hidden"
                    title="Click to preview"
                  >
                    {item.isVideo ? (
                      <div className="w-14 h-14 rounded-lg bg-white-10 flex items-center justify-center">
                        <Film className="w-5 h-5 text-white-60" />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt="Attached media"
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="text-xs text-white-60 truncate block text-left hover:text-white-100 transition-colors"
                >
                  {draft.mediaAssets?.length > 1
                    ? `${draft.mediaAssets.length} media attached`
                    : draft.mediaType === 'video' ? 'Video attached' : 'Image attached'}
                </button>
                <MediaSourceLabel draft={draft} />
              </div>
              <button
                onClick={() => setShowMediaSwap(true)}
                className="text-[10px] text-accent-green-110 hover:underline shrink-0"
              >
                Change
              </button>
            </div>
          </div>
        ) : generatingMedia ? (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-white-10 animate-pulse flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-white-40 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white-60 animate-pulse">Generating image...</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Placeholder thumbnail */}
            <div className="w-14 h-14 rounded-lg border-2 border-dashed border-white-10 flex items-center justify-center shrink-0">
              <ImagePlus className="w-5 h-5 text-white-20" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white-30 mb-1.5">
                {getChannelRequirementHint(draft.channel)
                  ? `${getChannelRequirementHint(draft.channel)} for ${getChannelLabel(draft.channel)}`
                  : 'No image assigned'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMediaSwap(true)}
                  className="text-xs text-white-40 hover:text-accent-green-110 transition-colors"
                >
                  Choose from library
                </button>
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
                          setGeneratingMedia(true);
                          qc.invalidateQueries({
                            queryKey: ['squadpitch', 'drafts'],
                          });
                          // Poll every 3s until mediaUrl appears
                          if (pollRef.current) clearInterval(pollRef.current);
                          pollRef.current = setInterval(() => {
                            qc.invalidateQueries({
                              queryKey: ['squadpitch', 'drafts'],
                            });
                          }, 3000);
                        },
                      }
                    );
                  }}
                  disabled={generateMedia.isPending || generatingMedia}
                  className="text-xs text-white-40 hover:text-accent-green-110 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {generateMedia.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Generate
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
                  className="text-xs text-white-40 hover:text-accent-green-110 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {generateVideo.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Generate video
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPublishError && (() => {
        const friendly = interpretPublishError({
          publishError: draft.publishError,
          channel: draft.channel,
          clientId: draft.clientId,
        });
        if (!friendly) return null;
        return (
          <div className="border-t border-white-10 px-4 py-3 bg-accent-red/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
              <div className="text-xs text-white-80 flex-1 min-w-0">
                <div className="text-accent-red font-medium">
                  {friendly.message}
                </div>
                {friendly.detail && (
                  <div className="text-white-60 mt-0.5">{friendly.detail}</div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {friendly.actions.map((action) => {
                    if (action.kind === 'reconnect' && action.href) {
                      return (
                        <Link
                          key={action.kind}
                          href={action.href}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-red/20 text-accent-red hover:bg-accent-red/30 text-[11px] font-medium"
                        >
                          {action.label}
                        </Link>
                      );
                    }
                    if (action.kind === 'retry' && canPublish) {
                      return (
                        <button
                          key={action.kind}
                          onClick={() => publish.mutate()}
                          disabled={publish.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white-10 text-white-80 hover:bg-white-20 text-[11px] font-medium disabled:opacity-50"
                        >
                          {publish.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          {action.label}
                        </button>
                      );
                    }
                    if (action.kind === 'edit') {
                      return (
                        <button
                          key={action.kind}
                          onClick={() => setEditMode(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white-10 text-white-80 hover:bg-white-20 text-[11px] font-medium"
                        >
                          {action.label}
                        </button>
                      );
                    }
                    if (action.kind === 'contact_support') {
                      return (
                        <a
                          key={action.kind}
                          href="mailto:support@squadpitch.com?subject=Squadpitch%20publish%20error"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white-10 text-white-80 hover:bg-white-20 text-[11px] font-medium"
                        >
                          {action.label}
                        </a>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="border-t border-white-10 px-5 py-3 flex items-center gap-2.5 flex-wrap">
        {/* Expand/Collapse */}
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

        <div className="flex-1" />

        {/* Primary action — status-dependent */}
        {draft.status === 'PENDING_REVIEW' && canApprove && (
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
        {draft.status === 'APPROVED' && canSchedule && (
          <button
            onClick={() => {
              setShowSchedule((v) => !v);
            }}
            className="text-xs px-2.5 py-1 rounded-md bg-zone-blue/20 text-zone-blue hover:bg-zone-blue/30 flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" /> Schedule
          </button>
        )}
        {draft.status === 'SCHEDULED' && draft.scheduledFor && (
          <span className="text-xs text-white-40">
            <Calendar className="w-3 h-3 inline mr-1" />
            {new Date(draft.scheduledFor).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
        {draft.status === 'FAILED' && canSchedule && (
          <button
            onClick={() => {
              setShowSchedule((v) => !v);
            }}
            className="text-xs px-2.5 py-1 rounded-md bg-zone-blue/20 text-zone-blue hover:bg-zone-blue/30 flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" /> Schedule
          </button>
        )}
        {draft.status === 'PUBLISHED' && draft.externalPostUrl && (
          <a
            href={draft.externalPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 rounded-md bg-white-10 text-white-80 hover:bg-white-20 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            View post
          </a>
        )}

        {/* Overflow menu */}
        <OverflowMenu
          items={[
            ...(isEditable ? [{
              label: editMode ? 'Cancel edit' : 'Edit',
              icon: Pencil,
              onClick: () => setEditMode((v) => !v),
            }] : []),
            {
              label: 'Duplicate',
              icon: CopyPlus,
              onClick: () => duplicateDraft.mutate(draft.id),
              loading: duplicateDraft.isPending,
            },
            {
              label: 'Regenerate',
              icon: RefreshCw,
              onClick: handleRegenerate,
              disabled: !draft.generationGuidance,
              loading: regenerate.isPending,
            },
            ...(canReject ? [{
              label: 'Reject',
              icon: X,
              onClick: () => setShowReject((v) => !v),
            }] : []),
            ...(canPublish ? [{
              label: 'Publish',
              icon: Send,
              onClick: () => publish.mutate(),
              loading: publish.isPending,
            }] : []),
            ...((draft.status === 'APPROVED' || draft.status === 'FAILED') && canSchedule ? [{
                label: 'Schedule',
                icon: Calendar,
                onClick: () => {
                  setShowSchedule((v) => !v);
                },
              }] : []),
            ...(draft.status === 'SCHEDULED' ? [{
                label: 'Reschedule',
                icon: Calendar,
                onClick: () => {
                  if (draft.scheduledFor) {
                    setScheduleDate(new Date(draft.scheduledFor).toISOString().slice(0, 16));
                  }
                  setShowSchedule((v) => !v);
                },
              }] : []),
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => {
                if (confirm('Delete this draft?')) deleteDraft.mutate(draft.id);
              },
              variant: 'danger' as const,
              loading: deleteDraft.isPending,
            },
          ]}
        />

        {/* Inline AI Actions menu — rendered outside overflow for its own popup */}
        <InlineActionsMenu draft={draft} />
      </div>

      {/* Eligibility issues */}
      {eligibility.issues.length > 0 && draft.status !== 'PUBLISHED' && draft.status !== 'REJECTED' && (
        <div className="px-5 space-y-1">
          {eligibility.issues.map((issue) => (
            <p
              key={issue.code}
              className={cn(
                'text-[11px]',
                issue.level === 'blocked' ? 'text-yellow-400' : 'text-white-30'
              )}
            >
              {issue.message}
              {issue.action && (
                <>
                  {' '}
                  <Link
                    href={issue.action.href}
                    className="underline hover:text-accent-green-110"
                  >
                    {issue.action.label}
                  </Link>
                </>
              )}
            </p>
          ))}
        </div>
      )}

      {/* Draft-level optimization suggestions (standalone drafts only) */}
      {!draft.campaignId && expanded && draft.status !== 'PUBLISHED' && draft.status !== 'REJECTED' && (
        <div className="px-5 pb-1">
          <DraftOptimizations draft={draft} />
        </div>
      )}

      {editMode && (
        <div className="border-t border-white-10 p-5 space-y-2">
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
        <div className="border-t border-white-10 p-5 space-y-2">
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
        <div className="border-t border-white-10 p-5 space-y-2">
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
      {_showSchedulePressure && (
        <div className="border-t border-white-10 px-4 py-2.5">
          <UpgradeTriggerBanner
            triggerSource="schedule_pressure"
            headline={`You've used ${_postPct}% of your monthly posts`}
            subtext="Upgrade to keep publishing without interruption."
            cta="Upgrade to Pro"
            targetTier="PRO"
            clientId={draft.clientId}
          />
        </div>
      )}

      {/* Performance feedback prompt for published drafts */}
      {draft.status === 'PUBLISHED' && !draft.performanceRating && !ratePerformance.isSuccess && (
        <div className="border-t border-white-10 px-5 py-3">
          <p className="text-xs text-white-60 mb-2">How did this post perform?</p>
          <div className="flex gap-2">
            {([
              { rating: 'HIGH' as PerformanceRating, label: 'High', icon: TrendingUp, color: 'text-accent-green-110 bg-accent-green-110/10 hover:bg-accent-green-110/20 border-accent-green-110/20' },
              { rating: 'AVERAGE' as PerformanceRating, label: 'Average', icon: Minus, color: 'text-white-60 bg-white-10 hover:bg-white-20 border-white-20' },
              { rating: 'LOW' as PerformanceRating, label: 'Low', icon: TrendingDown, color: 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/20' },
            ]).map(({ rating, label, icon: Icon, color }) => (
              <button
                key={rating}
                onClick={() => ratePerformance.mutate({ draftId: draft.id, rating })}
                disabled={ratePerformance.isPending}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-50',
                  color,
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {(draft.performanceRating || ratePerformance.isSuccess) && draft.status === 'PUBLISHED' && (
        <div className="border-t border-white-10 px-5 py-2.5 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-white-40" />
          <span className="text-xs text-white-40">
            Rated: <span className="font-medium text-white-60">{draft.performanceRating ?? 'Saved'}</span>
          </span>
        </div>
      )}

      {anyError && (
        <div className="border-t border-white-10 p-5">
          <StatusBanner error={anyError.message} />
        </div>
      )}

      {lightboxOpen && draft.mediaUrl && (
        <MediaLightbox
          url={draft.mediaUrl}
          type={draft.mediaType ?? 'image'}
          onClose={() => setLightboxOpen(false)}
          gallery={draft.mediaAssets?.length > 1 ? draft.mediaAssets.map((a) => ({
            url: a.url,
            type: (a.assetType as 'image' | 'video') ?? 'image',
          })) : undefined}
        />
      )}

      <MediaSwapModal
        clientId={draft.clientId}
        draftId={draft.id}
        open={showMediaSwap}
        onClose={() => setShowMediaSwap(false)}
        onApply={(ids) => {
          updateDraft.mutate(
            { mediaAssetIds: ids },
            { onSuccess: () => setShowMediaSwap(false) }
          );
        }}
        initialSelected={draft.mediaAssets?.map((a) => a.id) ?? []}
        initialAssets={draft.mediaAssets ?? []}
        applying={updateDraft.isPending}
      />
    </div>
  );
}

function MediaSourceLabel({ draft }: { draft: Draft }) {
  if (draft.imageGuidance) {
    return (
      <p className="text-[11px] text-white-30 truncate">
        Suggested: {draft.imageGuidance}
      </p>
    );
  }
  if (draft.sourceMeta?.listingTitle) {
    return (
      <p className="text-[11px] text-white-30 truncate">
        Using: {draft.sourceMeta.listingTitle} (auto-selected)
      </p>
    );
  }
  return null;
}
