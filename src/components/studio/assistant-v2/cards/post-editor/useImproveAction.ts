'use client';

import { useCallback } from 'react';
import { useGenerateContent, type Channel, type DraftKind } from '@/hooks/useSquadpitch';
import type { PostVersion } from '@/lib/assistant/normalizedPost.types';
import { computePostStrength } from '@/lib/assistant/normalizedPost.scoring';
import { buildImproveGuidance, type TextImproveActionId, type PromptContext } from '@/lib/assistant/improveActions';

interface UseImproveActionOptions {
  clientId: string;
  channel: Channel;
  kind: DraftKind;
  currentBody: string;
  currentCta: string | null;
  currentHashtags: string[];
  propertyAddress?: string;
  onVersionCreated: (version: PostVersion) => void;
  onLoading: (actionId: string) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

let improveCounter = 0;

export function useImproveAction({
  clientId,
  channel,
  kind,
  currentBody,
  currentCta,
  currentHashtags,
  propertyAddress,
  onVersionCreated,
  onLoading,
  onError,
  onComplete,
}: UseImproveActionOptions) {
  const generateMutation = useGenerateContent();

  const executeTextAction = useCallback(
    (actionId: TextImproveActionId) => {
      onLoading(actionId);

      const ctx: PromptContext = {
        body: currentBody,
        cta: currentCta,
        hashtags: currentHashtags,
        channel,
        propertyAddress,
      };
      const guidance = buildImproveGuidance(actionId, ctx);

      generateMutation.mutate(
        { clientId, kind, channel, guidance },
        {
          onSuccess: (draft) => {
            const score = computePostStrength({
              body: draft.body,
              cta: draft.cta,
              hashtags: draft.hashtags,
              hooks: draft.hooks ?? [],
              scoredHooks: draft.scoredHooks ?? null,
              channel,
            });

            improveCounter += 1;
            const version: PostVersion = {
              id: `ai_improved_${improveCounter}`,
              label: 'AI Improved',
              body: draft.body,
              hooks: draft.hooks ?? [],
              hashtags: draft.hashtags ?? [],
              cta: draft.cta ?? null,
              score,
            };

            onVersionCreated(version);
            onComplete();
          },
          onError: (err) => {
            onError(err instanceof Error ? err.message : 'AI improvement failed');
          },
        },
      );
    },
    [clientId, channel, kind, currentBody, currentCta, currentHashtags, propertyAddress, generateMutation, onVersionCreated, onLoading, onError, onComplete],
  );

  return {
    executeTextAction,
    isPending: generateMutation.isPending,
  };
}
