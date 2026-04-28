'use client';

import { cn } from '@/lib/utils';
import type { OnboardingSessionState } from '@/lib/onboarding/types';
import { CheckCircle2, ArrowRight, Link2, Plus, MessageSquare } from 'lucide-react';

interface Props {
  session: OnboardingSessionState;
  onFinish: () => void;
  onConnectChannels?: () => void;
}

const SUGGESTION_PROMPTS = [
  'Create another campaign',
  'Make 5 Instagram posts',
  'Analyze my content',
];

export function CompletionSummaryCard({ session, onFinish, onConnectChannels }: Props) {
  const hasChannels = session.connectedChannelsSnapshot.length > 0;
  const clientId = session.createdClientId;
  const isRE = session.industryKey === 'real_estate';
  const postCount = session.previewDrafts.length;

  // Context-aware attribution
  const brandName = session.brandNameOverride ?? session.analyzeResult?.brandData?.name;
  const listingTitle = session.analyzeResult?.dataItems?.find((d) => {
    const t = ((d.dataJson?.type as string) ?? '').toLowerCase();
    return t.includes('listing') || t.includes('property');
  })?.title;

  const summaryText = isRE && listingTitle && brandName
    ? `We created ${postCount} post${postCount !== 1 ? 's' : ''} for ${listingTitle} using ${brandName}\u2019s brand.`
    : isRE && listingTitle
      ? `We created ${postCount} post${postCount !== 1 ? 's' : ''} for ${listingTitle}.`
      : `We created ${postCount} post${postCount !== 1 ? 's' : ''} for your business.`;

  const handlePrompt = (prompt: string) => {
    if (clientId) {
      window.location.href = `/workspaces/${clientId}?prompt=${encodeURIComponent(prompt)}`;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── 1. Completion confirmation ─────────────────────── */}
      <div className="rounded-xl border border-accent-green-110/20 overflow-hidden">
        <div className="px-4 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-accent-green-110 flex-shrink-0" />
            <h2 className="text-xl font-bold text-white">Campaign saved</h2>
          </div>
          <p className="text-sm text-white-50 leading-relaxed">
            {summaryText} This campaign is now yours — edit anytime, connect channels to publish, or create another.
          </p>
        </div>
      </div>

      {/* ── 2. Next actions ────────────────────────────────── */}
      <div className="rounded-xl border border-white-10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white-10">
          <p className="text-xs font-medium text-white-40">What would you like to do next?</p>
        </div>
        <div className="px-4 py-3 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onFinish}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-black font-semibold text-sm hover:bg-accent-green-110/90 transition-colors sm:flex-none"
          >
            Go to dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
          {!hasChannels && onConnectChannels && (
            <button
              onClick={onConnectChannels}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Connect channels
            </button>
          )}
          <button
            onClick={() => handlePrompt('Create another campaign')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create another campaign
          </button>
        </div>
      </div>

      {/* ── 3. Suggestion prompts (optional, separated) ──── */}
      <div className="rounded-xl border border-white-10 overflow-hidden">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-white-30" />
            <p className="text-sm font-medium text-white-40">You can also ask Squadpitch to:</p>
          </div>
        </div>

        <div className="px-4 pb-3 flex flex-col gap-1.5">
          {SUGGESTION_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handlePrompt(prompt)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-left',
                'bg-white-5 hover:bg-white-10 border border-transparent hover:border-accent-green-110/20',
                'transition-all group',
              )}
            >
              <span className="text-[11px] text-white-20 group-hover:text-accent-green-110 transition-colors">&rarr;</span>
              <span className="text-xs text-white-50 group-hover:text-white-70 transition-colors">
                &ldquo;{prompt}&rdquo;
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
