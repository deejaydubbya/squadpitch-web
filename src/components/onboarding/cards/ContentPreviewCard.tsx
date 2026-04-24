'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { OnboardingSessionState } from '@/lib/onboarding/types';
import { OnboardingPostCard } from './OnboardingPostCard';
import { Loader2, Sparkles } from 'lucide-react';
import type { Draft } from '@/hooks/useSquadpitch';

interface Props {
  session: OnboardingSessionState;
  onGenerate: () => void;
  isGenerating: boolean;
  generationProgress: { current: number; total: number } | null;
}

export function ContentPreviewCard({ session, onGenerate, isGenerating, generationProgress }: Props) {
  const triggeredRef = useRef(false);

  // Auto-trigger generation on mount
  useEffect(() => {
    if (!triggeredRef.current && session.previewDrafts.length === 0 && !isGenerating) {
      triggeredRef.current = true;
      onGenerate();
    }
  }, [session.previewDrafts.length, isGenerating, onGenerate]);

  const total = generationProgress?.total ?? 3;
  const draftCount = session.previewDrafts.length;
  const remainingSkeletons = isGenerating ? Math.max(0, total - draftCount) : 0;

  if (isGenerating && draftCount === 0) {
    return (
      <div className="flex flex-col gap-3">
        <GenerationHeader current={0} total={total} />
        {Array.from({ length: total }).map((_, i) => (
          <SkeletonPostCard key={i} index={i} />
        ))}
      </div>
    );
  }

  if (draftCount === 0 && !isGenerating) {
    return (
      <button
        onClick={onGenerate}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
          'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer transition-all',
        )}
      >
        <Sparkles className="w-4 h-4" />
        Generate sample posts
      </button>
    );
  }

  const brandName = session.analyzeResult?.brandData.name ?? 'Your Business';
  const logoUrl = session.analyzeResult?.brandData.logoUrl;
  const clientId = session.createdClientId ?? '';

  // Default schedule time (tomorrow 9am)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const defaultScheduleTime = {
    iso: tomorrow.toISOString(),
    label: 'Tomorrow at 9:00 AM',
  };

  return (
    <div className="flex flex-col gap-3">
      {isGenerating && (
        <GenerationHeader current={draftCount} total={total} />
      )}

      {session.previewDrafts.map((draft, idx) => (
        <OnboardingPostCard
          key={draft.id}
          draft={draft}
          clientId={clientId}
          brandName={brandName}
          logoUrl={logoUrl}
          defaultScheduleTime={defaultScheduleTime}
          onRegenerated={(newDraft: Draft) => {
            // Update handled by parent
          }}
          isFirstPost={idx === 0 && !isGenerating}
          industryKey={session.industryKey ?? undefined}
          postIndex={idx}
        />
      ))}

      {Array.from({ length: remainingSkeletons }).map((_, i) => (
        <SkeletonPostCard key={`skeleton-${i}`} index={draftCount + i} />
      ))}
    </div>
  );
}

// ── Generation progress header ───────────────────────────────────────────

function GenerationHeader({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white-5 border border-white-10">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-accent-green-110 flex-shrink-0" />
        <span className="text-sm text-white-70">
          Creating post {Math.min(current + 1, total)} of {total}...
        </span>
      </div>
      <div className="h-1 rounded-full bg-white-10 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-green-110 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(pct, 8)}%` }}
        />
      </div>
    </div>
  );
}

// ── Skeleton post card ───────────────────────────────────────────────────

function SkeletonPostCard({ index }: { index: number }) {
  // Stagger the animation slightly per card
  const delay = `${index * 150}ms`;

  return (
    <div
      className="rounded-2xl border border-white-10 overflow-hidden bg-sp-card animate-pulse"
      style={{ animationDelay: delay }}
    >
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white-10">
        <div className="w-9 h-9 rounded-full bg-white-10 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 rounded bg-white-10" />
          <div className="h-2.5 w-16 rounded bg-white-5" />
        </div>
        <div className="h-5 w-20 rounded-full bg-white-5" />
      </div>

      {/* Image placeholder */}
      <div className="w-full aspect-[4/3] bg-white-5 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-white-10" />
      </div>

      {/* Caption skeleton */}
      <div className="px-4 py-4 space-y-2.5">
        <div className="h-3 w-full rounded bg-white-10" />
        <div className="h-3 w-[85%] rounded bg-white-10" />
        <div className="h-3 w-[60%] rounded bg-white-5" />
        <div className="h-2.5 w-[40%] rounded bg-white-5 mt-3" />
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white-10">
        <div className="h-7 w-14 rounded-lg bg-white-5" />
        <div className="h-7 w-[72px] rounded-lg bg-white-5" />
        <div className="h-7 w-20 rounded-lg bg-white-5 ml-auto" />
      </div>
    </div>
  );
}
