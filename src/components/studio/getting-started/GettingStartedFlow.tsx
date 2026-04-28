'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  CheckCircle2,
  PartyPopper,
  ArrowRight,
  Instagram,
  Linkedin,
  Facebook,
  Twitter,
  Loader2,
  ImageIcon,
  Sparkles,
  Calendar,
  Zap,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  useDrafts,
  useUpdateDraft,
  useApproveDraft,
  useClientAnalytics,
  type Draft,
  type Channel,
  type MediaAsset,
} from '@/hooks/useSquadpitch';
import { apiFetch } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';
import { trackActivationEvent, getActivationFlag, setActivationFlag } from '@/lib/activationTracking';
import { UpgradeTriggerBanner } from '@/components/billing/UpgradeTriggerBanner';

// ── Types ──────────────────────────────────────────────────────────────

type FlowStep = 'intro' | 'review' | 'success';

const STEP_LABELS: Record<FlowStep, string> = {
  intro: 'Overview',
  review: 'Review Posts',
  success: 'Done',
};

// ── Main Component ─────────────────────────────────────────────────────

interface Props {
  clientId: string;
}

export function GettingStartedFlow({ clientId }: Props) {
  const router = useRouter();
  const base = `/workspaces/${clientId}`;

  // ── Data hooks ─────────────────────────────────────────────────────
  const { data: drafts, isLoading: draftsLoading } = useDrafts({ clientId });
  const { data: analytics } = useClientAnalytics(clientId);

  // ── ALL onboarding-generated drafts (stable list for the session) ──
  // Include DRAFT, PENDING_REVIEW, and APPROVED so already-reviewed
  // posts stay visible instead of disappearing from the list.
  const allPosts = useMemo(() => {
    if (!drafts) return [];
    return drafts
      .filter((d) => ['DRAFT', 'PENDING_REVIEW', 'APPROVED'].includes(d.status))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [drafts]);

  const totalPosts = allPosts.length;

  // ── Per-post review state ──────────────────────────────────────────
  // Track which posts have been reviewed in this session + localStorage
  const [reviewedSet, setReviewedSet] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const d of allPosts) {
      if (
        (d.status === 'APPROVED' || d.status === 'SCHEDULED') &&
        getActivationFlag(`draft_reviewed_${d.id}`, clientId)
      ) {
        initial.add(d.id);
      }
    }
    return initial;
  });

  const reviewedCount = reviewedSet.size;
  const allReviewed = totalPosts > 0 && reviewedCount >= totalPosts;

  // ── Compute visible flow steps ─────────────────────────────────────
  // Strict sequential: Intro → Review all posts → Success
  const visibleSteps = useMemo<FlowStep[]>(() => ['intro', 'review', 'success'], []);

  // ── Resume logic ───────────────────────────────────────────────────
  const introSeen = getActivationFlag('intro_seen', clientId);

  const [step, setStep] = useState<FlowStep>(() => {
    const published = analytics?.byStatus?.PUBLISHED ?? 0;
    const scheduled = analytics?.byStatus?.SCHEDULED ?? 0;

    // If user has already published or scheduled, show success
    if (published > 0 || scheduled > 0) return 'success';

    // If all posts already reviewed, go to success
    if (allReviewed) return 'success';

    // If intro not yet seen, show it first
    if (!introSeen && totalPosts > 0) return 'intro';

    // Default: start at review
    return 'review';
  });

  // ── Current post index ─────────────────────────────────────────────
  // Find the first un-reviewed post as starting index
  const [currentPostIndex, setCurrentPostIndex] = useState(() => {
    const idx = allPosts.findIndex((d) => !reviewedSet.has(d.id));
    return idx >= 0 ? idx : 0;
  });

  const currentDraft = allPosts[currentPostIndex] ?? null;

  // ── Track content set started ──────────────────────────────────────
  const trackedStartRef = useRef(false);
  useEffect(() => {
    if (trackedStartRef.current || totalPosts === 0) return;
    trackedStartRef.current = true;
    trackActivationEvent('content_set_started', {
      clientId,
      totalPosts,
    }, { once: true });
  }, [clientId, totalPosts]);

  // ── Track step views ───────────────────────────────────────────────
  const trackedStepsRef = useRef(new Set<string>());

  useEffect(() => {
    const key = `${step}:${clientId}`;
    if (trackedStepsRef.current.has(key)) return;
    trackedStepsRef.current.add(key);

    trackActivationEvent('getting_started_step_viewed', { clientId, step }, { once: true });

    const stepEventMap: Partial<Record<FlowStep, Parameters<typeof trackActivationEvent>[0]>> = {
      intro: 'content_system_ready_viewed',
      review: 'guided_review_step_viewed',
      success: 'guided_success_viewed',
    };
    const granularEvent = stepEventMap[step];
    if (granularEvent) {
      trackActivationEvent(granularEvent, { clientId, step }, { once: true });
    }
  }, [step, clientId]);

  // ── Redirect if no drafts ──────────────────────────────────────────
  useEffect(() => {
    if (!draftsLoading && allPosts.length === 0 && step === 'review') {
      router.replace(`${base}/create`);
    }
  }, [draftsLoading, allPosts.length, step, base, router]);

  // ── Step navigation ────────────────────────────────────────────────
  const advanceStep = useCallback(() => {
    const currentIdx = visibleSteps.indexOf(step);
    if (currentIdx < visibleSteps.length - 1) {
      setStep(visibleSteps[currentIdx + 1]);
    }
  }, [step, visibleSteps]);

  // ── Post reviewed handler ──────────────────────────────────────────
  const handlePostReviewed = useCallback((draftId: string) => {
    // Mark as reviewed
    setActivationFlag(`draft_reviewed_${draftId}`, clientId);
    setReviewedSet((prev) => {
      const next = new Set(prev);
      next.add(draftId);
      return next;
    });

    const newReviewedCount = reviewedCount + 1;
    const isLast = newReviewedCount >= totalPosts;

    // Track individual post review
    trackActivationEvent('content_post_reviewed', {
      clientId,
      selectedDraftId: draftId,
      postIndex: currentPostIndex,
      totalPosts,
    });

    // Track progress
    trackActivationEvent('content_set_progress', {
      clientId,
      postIndex: currentPostIndex,
      totalPosts,
      meta: { reviewedCount: newReviewedCount, remaining: totalPosts - newReviewedCount },
    });

    if (isLast) {
      // All posts reviewed — advance to connect or success
      trackActivationEvent('content_set_completed', {
        clientId,
        totalPosts,
      });
      advanceStep();
    } else {
      // Move to next un-reviewed post
      const nextIdx = allPosts.findIndex((d, i) => i > currentPostIndex && !reviewedSet.has(d.id) && d.id !== draftId);
      if (nextIdx >= 0) {
        setCurrentPostIndex(nextIdx);
      } else {
        // Wrap around to find any un-reviewed
        const wrapIdx = allPosts.findIndex((d) => !reviewedSet.has(d.id) && d.id !== draftId);
        if (wrapIdx >= 0) {
          setCurrentPostIndex(wrapIdx);
        } else {
          advanceStep();
        }
      }
    }
  }, [clientId, currentPostIndex, totalPosts, reviewedCount, allPosts, reviewedSet, advanceStep]);

  // ── Skip handler ───────────────────────────────────────────────────
  const handleSkipSetup = () => {
    trackActivationEvent('getting_started_skip_clicked', { clientId });
    router.push(base);
  };

  if (draftsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-white-40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Progress bar */}
      <ContentSetProgress
        step={step}
        visibleSteps={visibleSteps}
        currentPostIndex={currentPostIndex}
        totalPosts={totalPosts}
        reviewedCount={reviewedCount}
      />

      {/* Step content */}
      {step === 'intro' && (
        <IntroStep
          clientId={clientId}
          allPosts={allPosts}
          onStart={() => {
            setActivationFlag('intro_seen', clientId);
            trackActivationEvent('content_system_started', { clientId, totalPosts }, { once: true });
            setStep('review');
          }}
        />
      )}

      {step === 'review' && currentDraft && (
        <ReviewStep
          clientId={clientId}
          draft={currentDraft}
          postIndex={currentPostIndex}
          totalPosts={totalPosts}
          reviewedCount={reviewedCount}
          isReviewed={reviewedSet.has(currentDraft.id)}
          isLast={reviewedCount + (reviewedSet.has(currentDraft.id) ? 0 : 1) >= totalPosts}
          allPosts={allPosts}
          reviewedSet={reviewedSet}
          onPostReviewed={handlePostReviewed}
          onNavigate={setCurrentPostIndex}
        />
      )}

      {step === 'success' && (
        <SuccessStep
          base={base}
          clientId={clientId}
          reviewedCount={reviewedCount}
          totalPosts={totalPosts}
          allPosts={allPosts}
          onReviewAgain={() => {
            setCurrentPostIndex(0);
            setStep('review');
          }}
        />
      )}

      {/* Skip setup link */}
      {step !== 'success' && (
        <div className="text-center">
          <button
            onClick={handleSkipSetup}
            className="text-xs text-white-30 hover:text-white-60 transition-colors"
          >
            Skip setup
          </button>
        </div>
      )}
    </div>
  );
}

// ── Content Set Progress ──────────────────────────────────────────────

function ContentSetProgress({
  step,
  visibleSteps,
  currentPostIndex,
  totalPosts,
  reviewedCount,
}: {
  step: FlowStep;
  visibleSteps: FlowStep[];
  currentPostIndex: number;
  totalPosts: number;
  reviewedCount: number;
}) {
  const stepIdx = visibleSteps.indexOf(step);

  // Hide progress on intro screen — it's a standalone welcome
  if (step === 'intro') return null;

  if (step === 'review' && totalPosts > 0) {
    // Show post-level progress during review
    const progressPct = totalPosts > 0 ? Math.round((reviewedCount / totalPosts) * 100) : 0;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-white-40">
          <span>
            Post {currentPostIndex + 1} of {totalPosts}
          </span>
          <span className="font-medium text-white-60">
            {reviewedCount} reviewed
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalPosts }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full flex-1 transition-colors',
                i < reviewedCount
                  ? 'bg-accent-green-110'
                  : i === currentPostIndex
                    ? 'bg-accent-green-110/40'
                    : 'bg-white-10',
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  // Generic step progress for connect/success
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-white-40">
        <span>
          Step {stepIdx + 1} of {visibleSteps.length}
        </span>
        <span className="font-medium text-white-60">
          {STEP_LABELS[step]}
        </span>
      </div>
      <div className="flex gap-1.5">
        {visibleSteps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full flex-1 transition-colors ${
              i <= stepIdx ? 'bg-accent-green-110' : 'bg-white-10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Intro Step ────────────────────────────────────────────────────────

function IntroStep({
  clientId,
  allPosts,
  onStart,
}: {
  clientId: string;
  allPosts: Draft[];
  onStart: () => void;
}) {
  return (
    <div className="card p-8 md:p-10 space-y-8 border-accent-green-110/20">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-accent-green-110/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-accent-green-110" />
        </div>
        <h2 className="text-2xl font-bold text-white-100">
          Your content system is ready
        </h2>
      </div>

      {/* Stat row */}
      <div className="text-center py-6 rounded-xl bg-accent-green-110/10 border border-accent-green-110/20">
        <p className="text-5xl font-bold text-white-100">
          {allPosts.length} post{allPosts.length !== 1 ? 's' : ''} ready
        </p>
        <p className="text-sm text-white-40 mt-2">
          We created these based on your business
        </p>
      </div>

      {/* Post preview cards */}
      <div className="space-y-3">
        {allPosts.map((draft, i) => (
          <div
            key={draft.id}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-white-15"
          >
            {/* Thumbnail */}
            {draft.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.mediaUrl}
                alt=""
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-white-10 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-white-20" />
              </div>
            )}

            {/* Caption preview + platform label */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <ChannelBadge channel={draft.channel} />
                <span className="text-xs text-white-40 capitalize font-medium">
                  {draft.channel.toLowerCase().replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-white-80 line-clamp-2 leading-snug">
                {draft.body?.slice(0, 120) || 'Untitled post'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
      >
        Review your posts
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Review Step ───────────────────────────────────────────────────────

function ReviewStep({
  clientId,
  draft,
  postIndex,
  totalPosts,
  reviewedCount,
  isReviewed,
  isLast,
  allPosts,
  reviewedSet,
  onPostReviewed,
  onNavigate,
}: {
  clientId: string;
  draft: Draft;
  postIndex: number;
  totalPosts: number;
  reviewedCount: number;
  isReviewed: boolean;
  isLast: boolean;
  allPosts: Draft[];
  reviewedSet: Set<string>;
  onPostReviewed: (draftId: string) => void;
  onNavigate: (index: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(draft.body);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const updateDraft = useUpdateDraft(draft.id);
  const approveDraft = useApproveDraft(draft.id);

  // Fetch all linked assets for this draft (carousel support)
  const { data: draftAssets } = useQuery({
    queryKey: ['draft-assets', draft.id],
    queryFn: () =>
      apiFetch<{ assets: MediaAsset[] }>(
        `workspaces/${clientId}/assets?draftId=${draft.id}&limit=10`,
      ),
    select: (d) => d.assets,
  });

  const readyAssets = (draftAssets ?? []).filter((a) => a.status === 'READY' && a.url);
  const hasMultipleImages = readyAssets.length > 1;
  const imageUrl = readyAssets[carouselIndex]?.url ?? readyAssets[0]?.url ?? draft.mediaUrl;

  const isAlreadyApproved = draft.status === 'APPROVED' || draft.status === 'SCHEDULED';

  // Reset edit state and carousel when draft changes
  useEffect(() => {
    setEditing(false);
    setEditBody(draft.body);
    setCarouselIndex(0);
  }, [draft.id, draft.body]);

  const handleSaveEdit = () => {
    updateDraft.mutate(
      { body: editBody },
      {
        onSuccess: () => {
          setEditing(false);
          trackActivationEvent('first_post_caption_edited', {
            clientId,
            selectedDraftId: draft.id,
            postIndex,
            totalPosts,
          });
        },
      },
    );
  };

  const handleApprove = () => {
    // If already approved/scheduled, just advance
    if (isAlreadyApproved || isReviewed) {
      onPostReviewed(draft.id);
      return;
    }

    approveDraft.mutate({
      onSuccess: () => {
        trackActivationEvent('first_post_approved', {
          clientId,
          selectedDraftId: draft.id,
          selectedPlatform: draft.channel,
          postIndex,
          totalPosts,
        });
        onPostReviewed(draft.id);
      },
    });
  };

  // Remaining posts message
  const remaining = totalPosts - reviewedCount - (isReviewed ? 0 : 1);

  // Headline varies by position
  const headline =
    postIndex === 0 && reviewedCount === 0
      ? `We created ${totalPosts} post${totalPosts !== 1 ? 's' : ''} for you`
      : `Post ${postIndex + 1} of ${totalPosts}`;

  const subtext =
    postIndex === 0 && reviewedCount === 0
      ? 'Squadpitch created these from your onboarding answers. Review each one before continuing.'
      : isReviewed
        ? 'You already reviewed this post.'
        : 'Give it a quick review, then continue to the next.';

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white-100">{headline}</h2>
        <p className="text-sm text-white-40 mt-1">{subtext}</p>
      </div>

      {/* Post thumbnails — mini nav showing all posts */}
      {totalPosts > 1 && (
        <div className="flex items-center gap-2">
          {allPosts.map((d, i) => {
            const reviewed = reviewedSet.has(d.id);
            const isCurrent = i === postIndex;
            return (
              <button
                key={d.id}
                onClick={() => onNavigate(i)}
                className={cn(
                  'relative w-10 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0',
                  isCurrent
                    ? 'border-accent-green-110 ring-1 ring-accent-green-110/30'
                    : reviewed
                      ? 'border-accent-green-110/40 opacity-70'
                      : 'border-white-10 opacity-50 hover:opacity-80',
                )}
              >
                {d.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.mediaUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white-5 flex items-center justify-center">
                    <span className="text-[9px] text-white-30">{i + 1}</span>
                  </div>
                )}
                {reviewed && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-accent-green-110" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Media preview with carousel */}
      {imageUrl ? (
        <div className="relative rounded-xl overflow-hidden bg-white-5 group">
          {draft.mediaType === 'video' ? (
            <video
              src={imageUrl}
              controls
              className="w-full max-h-72 object-contain bg-black"
              muted
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Post media"
              className="w-full max-h-72 object-contain bg-black"
            />
          )}

          {/* Carousel navigation */}
          {hasMultipleImages && (
            <>
              <button
                onClick={() => setCarouselIndex((prev) => (prev - 1 + readyAssets.length) % readyAssets.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCarouselIndex((prev) => (prev + 1) % readyAssets.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                {readyAssets.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all',
                      idx === carouselIndex ? 'bg-white w-3' : 'bg-white/50',
                    )}
                    aria-label={`Image ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                {carouselIndex + 1}/{readyAssets.length}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white-5 aspect-video max-h-48 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-white-20" />
        </div>
      )}

      {/* Channel badge */}
      <div className="flex items-center gap-2">
        <ChannelBadge channel={draft.channel} />
        <span className="text-xs text-white-40 capitalize">
          {draft.channel.toLowerCase().replace('_', ' ')}
        </span>
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white-40 uppercase tracking-wider">
            Caption
          </span>
          {!editing && !isReviewed && (
            <button
              onClick={() => {
                setEditBody(draft.body);
                setEditing(true);
              }}
              className="flex items-center gap-1 text-xs text-white-40 hover:text-accent-green-110 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              Edit caption
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110/50 resize-none transition-colors"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-white-30">{editBody.length} chars</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateDraft.isPending || editBody === draft.body}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110/20 text-accent-green-110 hover:bg-accent-green-110/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {updateDraft.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white-80 whitespace-pre-wrap leading-relaxed">
            {draft.body}
          </p>
        )}
      </div>

      {/* Primary CTA */}
      {isReviewed ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent-green-110/10 text-sm text-accent-green-110">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">Reviewed</span>
          </div>
          {/* Navigate to next un-reviewed post */}
          {remaining > 0 && (
            <button
              onClick={() => {
                const nextIdx = allPosts.findIndex((d) => !reviewedSet.has(d.id));
                if (nextIdx >= 0) onNavigate(nextIdx);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
            >
              Continue to next post
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleApprove}
          disabled={approveDraft.isPending || editing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {approveDraft.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isLast ? 'Looks good — finish setup' : 'Looks good — continue'}
        </button>
      )}

      {/* Remaining posts awareness — below CTA */}
      {!isReviewed && (
        <div className="text-center py-3">
          <p className="text-sm text-accent-green-110 font-semibold">
            {isLast
              ? 'Final post — almost done'
              : remaining === 1
                ? '1 more post to review'
                : `Nice — ${remaining} more posts ready`}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Success Step ───────────────────────────────────────────────────────

function SuccessStep({
  base,
  clientId,
  reviewedCount,
  totalPosts,
  allPosts,
  onReviewAgain,
}: {
  base: string;
  clientId: string;
  reviewedCount: number;
  totalPosts: number;
  allPosts: Draft[];
  onReviewAgain: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    trackActivationEvent('content_system_completed', { clientId, totalPosts }, { once: true });
    trackActivationEvent('getting_started_completed', { clientId, totalPosts }, { once: true });
  }, [clientId, totalPosts]);

  // Derive unique platforms from reviewed posts
  const platforms = useMemo(() => {
    const set = new Set<string>();
    allPosts.forEach((d) => set.add(d.channel));
    return Array.from(set);
  }, [allPosts]);

  return (
    <div className="card p-8 md:p-10 text-center space-y-8 border-accent-green-110/20">
      <div className="w-20 h-20 rounded-full bg-accent-green-110/20 flex items-center justify-center mx-auto">
        <PartyPopper className="w-10 h-10 text-accent-green-110" />
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-white-100">
        You&apos;re set for the week 🎉
      </h2>

      {/* Bold summary card */}
      <div className="rounded-xl bg-accent-green-110/10 border border-accent-green-110/20 p-6 space-y-2">
        <p className="text-4xl font-bold text-white-100">
          {reviewedCount} post{reviewedCount !== 1 ? 's' : ''} ready
        </p>
        <p className="text-base text-accent-green-110 font-medium">
          Ready to schedule or publish
        </p>
      </div>

      {/* What this means */}
      <p className="text-sm text-white-50 max-w-sm mx-auto leading-relaxed">
        You now have a working content system.
        You can post anytime, or let Squadpitch handle it.
      </p>

      {/* Upgrade trigger — Trigger A: post-onboarding */}
      <UpgradeTriggerBanner
        triggerSource="post_onboarding"
        headline="You created your first content set. Upgrade to keep generating every week."
        subtext="Pro includes Autopilot, 150 posts/mo, and multi-platform posting."
        cta="Upgrade to Pro"
        targetTier="PRO"
        clientId={clientId}
      />

      {/* What happens next */}
      <div className="text-left space-y-3">
        <h3 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
          What happens next
        </h3>
        <div className="rounded-xl border border-white-15 divide-y divide-white-10">
          <Link
            href={`${base}/planner`}
            className="flex items-center justify-between px-4 py-3 hover:bg-white-10 transition-colors first:rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white-80">Schedule your posts</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-white-30" />
          </Link>
          <Link
            href={`${base}/create`}
            className="flex items-center justify-between px-4 py-3 hover:bg-white-10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-accent-green-110" />
              <span className="text-sm text-white-80">Create more content</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-white-30" />
          </Link>
          <Link
            href={`${base}/autopilot`}
            className="flex items-center justify-between px-4 py-3 hover:bg-white-10 transition-colors last:rounded-b-xl"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white-80">Turn on autopilot</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-white-30" />
          </Link>
        </div>
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => {
          trackActivationEvent('first_post_dashboard_returned', { clientId });
          router.push(base);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
      >
        Go to dashboard
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Secondary CTA */}
      <button
        onClick={onReviewAgain}
        className="text-sm text-white-30 hover:text-white-60 transition-colors"
      >
        Review your posts again
      </button>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: Channel }) {
  const icons: Partial<Record<Channel, React.ReactNode>> = {
    INSTAGRAM: <Instagram className="w-3.5 h-3.5" />,
    LINKEDIN: <Linkedin className="w-3.5 h-3.5" />,
    FACEBOOK: <Facebook className="w-3.5 h-3.5" />,
    X: <Twitter className="w-3.5 h-3.5" />,
  };

  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white-10 text-white-60">
      {icons[channel] ?? <span className="text-[10px] font-bold">{channel[0]}</span>}
    </span>
  );
}

