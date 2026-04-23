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
}

export function ContentPreviewCard({ session, onGenerate, isGenerating }: Props) {
  const triggeredRef = useRef(false);

  // Auto-trigger generation on mount
  useEffect(() => {
    if (!triggeredRef.current && session.previewDrafts.length === 0 && !isGenerating) {
      triggeredRef.current = true;
      onGenerate();
    }
  }, [session.previewDrafts.length, isGenerating, onGenerate]);

  if (isGenerating && session.previewDrafts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="w-6 h-6 animate-spin text-accent-green-110" />
        <p className="text-sm text-white-40">Generating sample posts...</p>
      </div>
    );
  }

  if (session.previewDrafts.length === 0) {
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
          isFirstPost={idx === 0}
          industryKey={session.industryKey ?? undefined}
          postIndex={idx}
        />
      ))}

      {isGenerating && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-accent-green-110" />
          <p className="text-xs text-white-40">Generating more...</p>
        </div>
      )}
    </div>
  );
}
