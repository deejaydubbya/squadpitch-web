'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Star,
  MapPin,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGBPReviews,
  useGBPSync,
  useGBPInsights,
  useIntegrationStatus,
  type GBPReview,
  type GBPReviewInsights,
} from '@/hooks/useSquadpitch';
import { GBPReviewReplyModal } from './GBPReviewReplyModal';

interface Props {
  clientId: string;
}

export function GBPDashboardWidget({ clientId }: Props) {
  const router = useRouter();
  const base = `/workspaces/${clientId}`;
  const { data: status } = useIntegrationStatus(clientId);
  const { data: reviewsData, isLoading } = useGBPReviews(clientId);
  const { data: insights } = useGBPInsights(clientId);
  const gbpSync = useGBPSync(clientId);
  const [replyReview, setReplyReview] = useState<GBPReview | null>(null);

  const gbp = status?.gbp;
  if (!gbp || gbp.status !== 'connected') return null;

  const reviews = reviewsData?.reviews ?? [];
  const latestReviews = reviews.slice(0, 3);

  // Build a set of "top" theme names (count >= 3) for highlighting
  const topThemeNames = new Set(
    (insights?.topThemes ?? []).filter((t) => t.count >= 3).map((t) => t.theme)
  );

  const handleCreatePost = (review: GBPReview) => {
    const guidance = `Create a social proof post featuring this Google review: "${review.comment}" from ${review.reviewer}. Build trust and encourage inquiries.`;
    router.push(
      `${base}/create?guidance=${encodeURIComponent(guidance)}&templateType=client_testimonial&dataItemId=${encodeURIComponent(review.dataItemId)}`
    );
  };

  return (
    <>
      <div className="card p-5 border-white-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-green-110/15 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-accent-green-110" />
            </div>
            <h2 className="text-sm font-semibold text-white-100">Google Business Profile</h2>
            {gbp.averageRating && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-semibold">
                <Star className="w-3 h-3 fill-current" />
                {gbp.averageRating}
              </span>
            )}
            {(gbp.reviewCount ?? 0) > 0 && (
              <span className="text-[11px] text-white-30">{gbp.reviewCount} reviews</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => gbpSync.mutate()}
              disabled={gbpSync.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', gbpSync.isPending && 'animate-spin')} />
              {gbpSync.isPending ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* Review Intelligence Panel */}
        {insights && <ReviewIntelligencePanel insights={insights} topThemeNames={topThemeNames} />}

        {/* Reviews */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-white-30" />
          </div>
        ) : latestReviews.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-white-30">No reviews imported yet. Sync to pull your latest reviews.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {latestReviews.map((review) => (
              <div
                key={review.dataItemId}
                className="p-3 rounded-xl bg-white-5 border border-white-10 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-3 h-3',
                            i < (review.rating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-white-20'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-white-80">{review.reviewer}</span>
                    {review.reviewDate && (
                      <span className="text-[10px] text-white-25">
                        {new Date(review.reviewDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {review.comment && (
                  <p className="text-xs text-white-50 leading-relaxed line-clamp-2">
                    {review.comment.length > 120
                      ? review.comment.slice(0, 117) + '...'
                      : review.comment}
                  </p>
                )}

                {/* Per-review theme badges */}
                {review.extractedThemes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {review.extractedThemes.slice(0, 3).map((theme) => (
                      <span
                        key={theme}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          topThemeNames.has(theme)
                            ? 'bg-accent-green-110/15 text-accent-green-110 ring-1 ring-accent-green-110/30'
                            : 'bg-white-10 text-white-40'
                        )}
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {!review.reply && (
                    <button
                      onClick={() => setReplyReview(review)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-accent-green-110 hover:bg-accent-green-110/10 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Reply
                    </button>
                  )}
                  <button
                    onClick={() => handleCreatePost(review)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white-40 hover:text-white-60 hover:bg-white-10 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Create Post
                  </button>
                  {review.reply && (
                    <span className="text-[10px] text-white-25 ml-auto">Replied</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white-10">
          {gbp.lastSyncedAt && (
            <span className="text-[10px] text-white-20">
              Last synced: {formatTimeAgo(gbp.lastSyncedAt)}
            </span>
          )}
          <Link
            href={`${base}/sources`}
            className="flex items-center gap-1 text-[11px] text-accent-green-110 hover:underline ml-auto"
          >
            View all reviews
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Reply Modal */}
      {replyReview && (
        <GBPReviewReplyModal
          clientId={clientId}
          review={replyReview}
          onClose={() => setReplyReview(null)}
        />
      )}
    </>
  );
}

// ── Review Intelligence Panel ───────────────────────────────────────────

function ReviewIntelligencePanel({
  insights,
  topThemeNames,
}: {
  insights: GBPReviewInsights;
  topThemeNames: Set<string>;
}) {
  const { sentimentBreakdown, topThemes } = insights;
  const total =
    (sentimentBreakdown?.positive ?? 0) +
    (sentimentBreakdown?.neutral ?? 0) +
    (sentimentBreakdown?.negative ?? 0);

  if (topThemes.length === 0 && total === 0) return null;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="mb-4 p-3 rounded-xl bg-white-5 border border-white-10 space-y-3">
      <p className="text-[11px] font-semibold text-white-60 uppercase tracking-wide">Review Intelligence</p>

      {/* Top Themes */}
      {topThemes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topThemes.slice(0, 6).map((t) => (
            <span
              key={t.theme}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                topThemeNames.has(t.theme)
                  ? 'bg-accent-green-110/15 text-accent-green-110'
                  : 'bg-white-10 text-white-50'
              )}
            >
              {t.theme}
              <span className="text-[9px] opacity-60">({t.count})</span>
            </span>
          ))}
        </div>
      )}

      {/* Sentiment Breakdown Bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-2 rounded-full overflow-hidden bg-white-10">
            {sentimentBreakdown.positive > 0 && (
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${pct(sentimentBreakdown.positive)}%` }}
              />
            )}
            {sentimentBreakdown.neutral > 0 && (
              <div
                className="bg-yellow-400 transition-all"
                style={{ width: `${pct(sentimentBreakdown.neutral)}%` }}
              />
            )}
            {sentimentBreakdown.negative > 0 && (
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${pct(sentimentBreakdown.negative)}%` }}
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-white-40">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {sentimentBreakdown.positive} positive
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              {sentimentBreakdown.neutral} neutral
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {sentimentBreakdown.negative} negative
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
