'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Send,
  LinkIcon,
  Sparkles,
  FileText,
  Hash,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  useDrafts,
  useUpdateDraft,
  useApproveDraft,
  useScheduleDraft,
  usePublishDraft,
  useChannelSettings,
  useChannelConnectionStatus,
  type Draft,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { trackActivationEvent } from '@/lib/activationTracking';

// ── Channel display helpers ─────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  X: 'X (Twitter)',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
  PINTEREST: 'Pinterest',
  THREADS: 'Threads',
  REDDIT: 'Reddit',
};

const KIND_LABELS: Record<string, string> = {
  POST: 'Post',
  CAPTION: 'Caption',
  VIDEO_SCRIPT: 'Video script',
  CAROUSEL: 'Carousel',
  HOOKS: 'Hooks',
  CTA_VARIANTS: 'CTA variants',
  REPLY: 'Reply',
};

// ── Progress step indicator ──────────────────────────────────────────────

type StepState = 'done' | 'active' | 'upcoming';

function ProgressSteps({ current }: { current: 'review' | 'channel' | 'publish' | 'done' }) {
  const steps: Array<{ key: string; label: string; state: StepState }> = [
    {
      key: 'review',
      label: 'Review',
      state: current === 'review' ? 'active' : 'done',
    },
    {
      key: 'channel',
      label: 'Channel',
      state:
        current === 'review'
          ? 'upcoming'
          : current === 'channel'
            ? 'active'
            : 'done',
    },
    {
      key: 'publish',
      label: 'Publish',
      state:
        current === 'done'
          ? 'done'
          : current === 'publish'
            ? 'active'
            : 'upcoming',
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          {i > 0 && (
            <div className={`w-6 h-px ${step.state === 'upcoming' ? 'bg-white-10' : 'bg-accent-green-110/40'}`} />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                step.state === 'done'
                  ? 'bg-accent-green-110/20 text-accent-green-110'
                  : step.state === 'active'
                    ? 'bg-accent-green-110 text-sp-bg'
                    : 'bg-white-5 text-white-30'
              }`}
            >
              {step.state === 'done' ? (
                <Check className="w-3 h-3" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-xs ${
                step.state === 'active'
                  ? 'text-white-100 font-medium'
                  : step.state === 'done'
                    ? 'text-white-60'
                    : 'text-white-30'
              }`}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

interface Props {
  clientId: string;
}

type FlowStep = 'review' | 'channel' | 'publish' | 'done';
type CompletionAction = 'approved' | 'scheduled' | 'published';

export function FirstPostReview({ clientId }: Props) {
  const router = useRouter();
  const base = `/workspaces/${clientId}`;

  // Data hooks
  const { data: drafts, isLoading, error, refetch } = useDrafts({ clientId, limit: 50 });
  const { data: channels } = useChannelSettings(clientId);
  const connectionStatus = useChannelConnectionStatus(clientId);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [step, setStep] = useState<FlowStep>('review');
  const [completionAction, setCompletionAction] = useState<CompletionAction | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');

  // Filter to onboarding/reviewable drafts
  const reviewableDrafts = useMemo(() => {
    if (!drafts) return [];
    return drafts
      .filter((d) =>
        d.status === 'DRAFT' ||
        d.status === 'PENDING_REVIEW' ||
        d.status === 'APPROVED'
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [drafts]);

  const currentDraft = reviewableDrafts[currentIndex] ?? null;

  // Channel state
  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];
  const hasChannels = enabledChannels.length > 0;
  const isCurrentChannelConnected = currentDraft
    ? connectionStatus.get(currentDraft.channel) ?? false
    : false;

  // Mutations
  const updateDraft = useUpdateDraft(currentDraft?.id ?? '');
  const approveDraft = useApproveDraft(currentDraft?.id ?? '');
  const scheduleDraft = useScheduleDraft(currentDraft?.id ?? '');
  const publishDraft = usePublishDraft(currentDraft?.id ?? '');

  const isMutating =
    updateDraft.isPending ||
    approveDraft.isPending ||
    scheduleDraft.isPending ||
    publishDraft.isPending;

  // ── Activation tracking: page view ────────────────────────────────────
  useEffect(() => {
    trackActivationEvent('first_post_review_viewed', {
      clientId,
      postsReadyCount: reviewableDrafts.length,
      connectedChannelCount: enabledChannels.length,
      selectedDraftId: currentDraft?.id,
      selectedPlatform: currentDraft?.channel,
    }, { once: true });
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────

  const startEdit = useCallback(() => {
    if (!currentDraft) return;
    setEditBody(currentDraft.body);
    setEditMode(true);
  }, [currentDraft]);

  const cancelEdit = useCallback(() => {
    setEditMode(false);
    setEditBody('');
  }, []);

  const saveEdit = useCallback(() => {
    if (!currentDraft || editBody === currentDraft.body) {
      setEditMode(false);
      return;
    }
    updateDraft.mutate(
      { body: editBody },
      {
        onSuccess: () => {
          setEditMode(false);
          trackActivationEvent('first_post_caption_edited', {
            clientId,
            selectedDraftId: currentDraft.id,
            selectedPlatform: currentDraft.channel,
          });
        },
      },
    );
  }, [currentDraft, editBody, updateDraft, clientId]);

  const handleApprove = useCallback(() => {
    if (!currentDraft) return;
    approveDraft.mutate({
      onSuccess: () => {
        trackActivationEvent('first_post_approved', {
          clientId,
          selectedDraftId: currentDraft.id,
          selectedPlatform: currentDraft.channel,
          connectedChannelCount: enabledChannels.length,
        });
        trackActivationEvent('first_post_flow_completed', {
          clientId,
          actionSource: 'approved',
        });
        setCompletionAction('approved');
        setStep('done');
      },
    });
  }, [currentDraft, approveDraft, clientId, enabledChannels.length]);

  const handleSchedule = useCallback(() => {
    if (!currentDraft || !scheduleDate) return;
    const iso = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    scheduleDraft.mutate(iso, {
      onSuccess: () => {
        trackActivationEvent('first_post_scheduled', {
          clientId,
          selectedDraftId: currentDraft.id,
          selectedPlatform: currentDraft.channel,
        });
        trackActivationEvent('first_post_flow_completed', {
          clientId,
          actionSource: 'scheduled',
        });
        setCompletionAction('scheduled');
        setStep('done');
      },
    });
  }, [currentDraft, scheduleDate, scheduleTime, scheduleDraft, clientId]);

  const handlePublish = useCallback(() => {
    if (!currentDraft) return;
    publishDraft.mutate({
      onSuccess: () => {
        trackActivationEvent('first_post_published', {
          clientId,
          selectedDraftId: currentDraft.id,
          selectedPlatform: currentDraft.channel,
        });
        trackActivationEvent('first_post_flow_completed', {
          clientId,
          actionSource: 'published',
        });
        setCompletionAction('published');
        setStep('done');
      },
    });
  }, [currentDraft, publishDraft, clientId]);

  const goToNext = useCallback(() => {
    if (currentIndex < reviewableDrafts.length - 1) {
      setCurrentIndex((i) => i + 1);
      setStep('review');
      setCompletionAction(null);
      setEditMode(false);
    }
  }, [currentIndex, reviewableDrafts.length]);

  // ── Loading state ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <LoadingSpinner size="md" />
        <p className="text-sm text-white-40 mt-4">Loading your posts...</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-white-60 mb-4">Something went wrong loading your posts.</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white-5 border border-white-10 text-sm text-white-70 hover:bg-white-10 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────

  if (reviewableDrafts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-white-5 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6 text-white-30" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">No posts to review</h2>
        <p className="text-sm text-white-40 mb-6">
          Create your first post and come back here to review it.
        </p>
        <Link
          href={`${base}/create`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Create your first post
        </Link>
      </div>
    );
  }

  // ── Completion state ──────────────────────────────────────────────────

  if (step === 'done' && completionAction) {
    const labels: Record<CompletionAction, string> = {
      approved: 'First post approved',
      scheduled: 'First post scheduled',
      published: 'First post published',
    };
    const hasMoreDrafts = currentIndex < reviewableDrafts.length - 1;

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-accent-green-110/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-accent-green-110" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{labels[completionAction]}</h2>
        <p className="text-sm text-white-50 mb-8 max-w-sm mx-auto">
          {completionAction === 'published'
            ? 'Your post is now live. Check your channel for the published content.'
            : completionAction === 'scheduled'
              ? 'Your post will be published at the scheduled time.'
              : 'Your post is approved and ready to be scheduled or published.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={base}
            onClick={() => trackActivationEvent('first_post_dashboard_returned', { clientId, actionSource: completionAction ?? undefined })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
          >
            Go to dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          {hasMoreDrafts && (
            <button
              onClick={goToNext}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-5 border border-white-10 text-white-70 text-sm font-medium hover:bg-white-10 transition-colors"
            >
              Review next post
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main review UI ────────────────────────────────────────────────────

  const draft = currentDraft!;
  const channelLabel = CHANNEL_LABELS[draft.channel] ?? draft.channel;
  const kindLabel = KIND_LABELS[draft.kind] ?? draft.kind;
  const canPublish = hasChannels && isCurrentChannelConnected;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href={base}
          className="inline-flex items-center gap-1.5 text-xs text-white-30 hover:text-white-60 transition-colors mb-4"
        >
          <ChevronLeft className="w-3 h-3" />
          Back to dashboard
        </Link>

        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-xl font-bold text-white">Review your first post</h1>
            <p className="text-sm text-white-40 mt-1">
              Make any quick edits, then publish or schedule it.
            </p>
          </div>
          <ProgressSteps current={step} />
        </div>
      </div>

      {/* ── Post navigation ────────────────────────────────── */}
      {reviewableDrafts.length > 1 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-white-30">
            Post {currentIndex + 1} of {reviewableDrafts.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setCurrentIndex((i) => Math.max(0, i - 1)); setEditMode(false); }}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg text-white-30 hover:text-white-70 hover:bg-white-5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setCurrentIndex((i) => Math.min(reviewableDrafts.length - 1, i + 1)); setEditMode(false); }}
              disabled={currentIndex === reviewableDrafts.length - 1}
              className="p-1.5 rounded-lg text-white-30 hover:text-white-70 hover:bg-white-5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Post card ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-white-10 bg-sp-card overflow-hidden">
        {/* Meta row */}
        <div className="px-5 py-3 border-b border-white-10 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white-5 text-[11px] font-medium text-white-60">
            {channelLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white-5 text-[11px] font-medium text-white-60">
            {kindLabel}
          </span>
          {draft.campaignName && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-400/10 text-[11px] font-medium text-purple-400">
              {draft.campaignName}
            </span>
          )}
          <span
            className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
              draft.status === 'APPROVED'
                ? 'bg-accent-green-110/15 text-accent-green-110'
                : draft.status === 'PENDING_REVIEW'
                  ? 'bg-yellow-400/15 text-yellow-400'
                  : 'bg-white-5 text-white-40'
            }`}
          >
            {draft.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Media preview */}
        {draft.mediaUrl && (
          <div className="border-b border-white-10">
            {draft.mediaType === 'video' ? (
              <video
                src={draft.mediaUrl}
                className="w-full max-h-72 object-contain bg-black"
                controls
                muted
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.mediaUrl}
                alt="Post media"
                className="w-full max-h-72 object-contain bg-black"
              />
            )}
          </div>
        )}

        {/* Caption */}
        <div className="px-5 py-4">
          {editMode ? (
            <div className="space-y-3">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full min-h-[160px] px-3 py-2.5 rounded-xl bg-white-5 border border-white-10 text-sm text-white-100 placeholder:text-white-20 resize-y focus:outline-none focus:border-accent-green-110/40 transition-colors"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white-30">
                  {editBody.length} characters
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 rounded-lg text-xs text-white-40 hover:text-white-70 hover:bg-white-5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={updateDraft.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-bg text-xs font-semibold hover:bg-accent-green-120 transition-colors disabled:opacity-50"
                  >
                    {updateDraft.isPending ? <LoadingSpinner size="sm" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-sm text-white-80 whitespace-pre-wrap leading-relaxed">
                {draft.body}
              </p>
              <button
                onClick={startEdit}
                className="absolute top-0 right-0 p-1.5 rounded-lg text-white-20 hover:text-white-60 hover:bg-white-5 opacity-0 group-hover:opacity-100 transition-all"
                title="Edit caption"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Hooks / Hashtags / CTA — compact */}
        {(draft.hooks.length > 0 || draft.hashtags.length > 0 || draft.cta) && (
          <div className="px-5 pb-4 flex flex-wrap gap-1.5">
            {draft.hooks.slice(0, 2).map((hook, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/10 text-[10px] text-yellow-400">
                <Sparkles className="w-2.5 h-2.5" />
                {hook.length > 40 ? hook.slice(0, 40) + '...' : hook}
              </span>
            ))}
            {draft.cta && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-green-110/10 text-[10px] text-accent-green-110">
                CTA: {draft.cta}
              </span>
            )}
            {draft.hashtags.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-400/10 text-[10px] text-blue-400">
                <Hash className="w-2.5 h-2.5" />
                {draft.hashtags.length} hashtag{draft.hashtags.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Source info */}
        {draft.sourceMeta?.listingTitle && (
          <div className="px-5 pb-3">
            <span className="text-[10px] text-white-30">
              Source: {draft.sourceMeta.listingTitle}
            </span>
          </div>
        )}
      </div>

      {/* ── Action area ───────────────────────────────────── */}
      <div className="mt-6 space-y-4">
        {/* Channel warning */}
        {!canPublish && (
          <div className="rounded-xl border border-white-10 bg-white-5/50 p-4 flex items-start gap-3">
            <LinkIcon className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white-70">
                {!hasChannels
                  ? 'Connect a channel to publish this post.'
                  : `${channelLabel} is not connected yet.`}
              </p>
              <Link
                href={`${base}/settings/channels`}
                onClick={() => trackActivationEvent('first_post_channel_connect_clicked', { clientId, actionSource: 'warning_banner' })}
                className="inline-flex items-center gap-1.5 text-xs text-accent-green-110 hover:text-accent-green-120 mt-1.5 transition-colors"
              >
                Connect channel
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Schedule picker — inline when scheduling */}
        {step === 'publish' && (
          <div className="rounded-xl border border-white-10 bg-white-5/50 p-4 space-y-3">
            <p className="text-sm font-medium text-white-80">Schedule for later</p>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-sm text-white-100 focus:outline-none focus:border-white-20 transition-colors"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-sm text-white-100 focus:outline-none focus:border-white-20 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSchedule}
                disabled={!scheduleDate || isMutating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-green-110 text-sp-bg text-sm font-semibold hover:bg-accent-green-120 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {scheduleDraft.isPending ? <LoadingSpinner size="sm" /> : <Calendar className="w-3.5 h-3.5" />}
                Schedule post
              </button>
              <button
                onClick={() => setStep('review')}
                className="px-3 py-2 rounded-xl text-sm text-white-40 hover:text-white-70 hover:bg-white-5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Primary actions */}
        {step === 'review' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Primary: Approve or Publish */}
            {canPublish ? (
              <button
                onClick={handlePublish}
                disabled={isMutating}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 sm:flex-none"
              >
                {publishDraft.isPending ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
                Publish now
              </button>
            ) : (
              <button
                onClick={handleApprove}
                disabled={isMutating || draft.status === 'APPROVED'}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 sm:flex-none"
              >
                {approveDraft.isPending ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="w-4 h-4" />}
                {draft.status === 'APPROVED' ? 'Approved' : 'Approve post'}
              </button>
            )}

            {/* Schedule */}
            <button
              onClick={() => setStep('publish')}
              disabled={isMutating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white-5 border border-white-10 text-white-70 text-sm font-medium hover:bg-white-10 hover:text-white transition-colors disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule
            </button>

            {/* Edit */}
            {!editMode && (
              <button
                onClick={startEdit}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white-5 border border-white-10 text-white-70 text-sm font-medium hover:bg-white-10 hover:text-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}

            {/* Connect channel — if none */}
            {!hasChannels && (
              <Link
                href={`${base}/settings/channels`}
                onClick={() => trackActivationEvent('first_post_channel_connect_clicked', { clientId, actionSource: 'action_bar' })}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-400/10 border border-blue-400/20 text-blue-400 text-sm font-medium hover:bg-blue-400/15 transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Connect channel
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
