'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Database } from 'lucide-react';
import {
  useRecommendations,
  useAcceptRecommendation,
  type Channel,
  type UnifiedRecommendation,
} from '@/hooks/useSquadpitch';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { QUICK_CHIPS, type ContentType } from './quickPostConstants';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}

export function QuickPostGuidanceCard({ session, clientId, onSelection }: Props) {
  const { data: recommendations } = useRecommendations(clientId, 'create_content');
  const acceptRec = useAcceptRecommendation(clientId);

  const [guidance, setGuidance] = useState(session.quickPostGuidance ?? '');

  // Build recommended posts
  interface RecommendedPost {
    id: string;
    title: string;
    description: string;
    guidance: string;
    type: ContentType;
    dataItemId?: string;
    channel?: string;
  }

  const typeMap: Record<string, ContentType> = {
    listing_post: 'listing',
    milestone_post: 'personal',
    testimonial_post: 'testimonial',
    engagement_post: 'educational',
    scheduling_action: 'educational',
    growth_post: 'growth',
  };

  const recommendedPosts = useMemo<RecommendedPost[]>(() => {
    const recs = recommendations?.recommendations ?? [];
    if (recs.length === 0) return [];
    return recs
      .filter((r: UnifiedRecommendation) => r.type !== 'campaign_hint')
      .slice(0, 3)
      .map((rec: UnifiedRecommendation) => ({
        id: rec.id,
        title: rec.title,
        description: rec.description,
        guidance: rec.actionPayload?.guidance ?? rec.description,
        type: typeMap[rec.type] ?? 'educational',
        dataItemId: rec.actionPayload?.dataItemId ?? rec.sourceId ?? undefined,
        channel: rec.actionPayload?.channel ?? rec.suggestedChannel ?? undefined,
      }));
  }, [recommendations]);

  const handleConfirm = (
    guidanceText: string,
    extras?: {
      contentType?: ContentType;
      channel?: Channel;
    }
  ) => {
    if (!guidanceText.trim()) return;

    // Batch all actions into a single onSelection call
    const actions: AssistantAction[] = [];
    if (extras?.contentType) {
      actions.push({ type: 'SET_QUICK_POST_CONTENT_TYPE', payload: extras.contentType });
    }
    if (extras?.channel) {
      actions.push({ type: 'SET_QUICK_POST_CHANNEL', payload: extras.channel });
    }
    actions.push({ type: 'SET_QUICK_POST_GUIDANCE', payload: guidanceText.trim() });

    const label = guidanceText.trim().length > 50
      ? guidanceText.trim().slice(0, 50) + '...'
      : guidanceText.trim();
    onSelection(actions, `Topic: "${label}"`);
  };

  const handleRecommendedClick = (rec: RecommendedPost) => {
    acceptRec.mutate(rec.id);
    handleConfirm(rec.guidance, {
      contentType: rec.type,
      channel: rec.channel as Channel | undefined,
    });
  };

  const handleChipClick = (chip: typeof QUICK_CHIPS[number]) => {
    handleConfirm(chip.guidance, { contentType: chip.type });
  };

  const canContinue = guidance.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Recommendations */}
      {recommendedPosts.length > 0 && !guidance.trim() && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-green-110" />
            <span className="text-[11px] font-medium text-white-40 uppercase tracking-wider">
              Recommended for you
            </span>
          </div>
          <div className="space-y-1.5">
            {recommendedPosts.map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => handleRecommendedClick(rec)}
                className="w-full text-left p-2.5 rounded-lg bg-accent-green-110/5 border border-accent-green-110/15 hover:bg-accent-green-110/10 hover:border-accent-green-110/25 transition-all"
              >
                <div className="flex items-start gap-2">
                  {rec.dataItemId && <Database className="w-3.5 h-3.5 text-accent-green-110 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-accent-green-110 truncate">{rec.title}</p>
                    <p className="text-[11px] text-white-40 line-clamp-1">{rec.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt textarea */}
      <textarea
        value={guidance}
        onChange={(e) => setGuidance(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canContinue) {
            e.preventDefault();
            handleConfirm(guidance);
          }
        }}
        placeholder="e.g. Introduce protein timing for marathon runners, mention our coaching plan..."
        rows={4}
        maxLength={4000}
        className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 resize-none placeholder:text-white-30"
      />

      {/* Quick Angle Chips */}
      {!guidance.trim() && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white-5 border border-white-10 text-white-60 hover:bg-white-10 hover:text-white-100 hover:border-white-20 transition-all"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={() => handleConfirm(guidance)}
        disabled={!canContinue}
        className="w-full py-2.5 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>

      {!canContinue && (
        <p className="text-center text-[10px] text-white-25">
          Enter a prompt or pick a suggestion to get started
        </p>
      )}
    </div>
  );
}
