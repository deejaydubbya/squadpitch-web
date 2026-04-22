'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Database, Sparkles, ArrowRight, SkipForward } from 'lucide-react';
import {
  useTechStack,
  squadpitchKeys,
} from '@/hooks/useSquadpitch';
import {
  TechStackGroup,
  GROUP_META,
} from '@/components/studio/TechStackSection';

interface Props {
  clientId: string;
  onContinue: () => void;
}

export function OnboardingTechStack({ clientId, onContinue }: Props) {
  const techStack = useTechStack(clientId);
  const qc = useQueryClient();

  // Listen for OAuth popup completion → refresh tech stack
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const expectedOrigin =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      if (event.origin !== expectedOrigin && event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as { type?: string } | null;
      if (data?.type === 'sp-oauth-complete') {
        qc.invalidateQueries({ queryKey: ['workspace-tech-stack', clientId] });
        qc.invalidateQueries({ queryKey: squadpitchKeys.connections(clientId) });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [clientId, qc]);

  // Filter out items with channelRef (those are handled in the channel step)
  const filteredGroups = techStack
    ? {
        importData: techStack.importData.filter((i) => !i.channelRef),
        publishContent: techStack.publishContent.filter((i) => !i.channelRef),
        enhanceWorkflow: techStack.enhanceWorkflow.filter((i) => !i.channelRef),
      }
    : null;

  const hasItems = filteredGroups
    ? filteredGroups.importData.length > 0 ||
      filteredGroups.publishContent.length > 0 ||
      filteredGroups.enhanceWorkflow.length > 0
    : false;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-400/10 text-purple-400 text-sm font-medium">
          <Database className="w-4 h-4" />
          Connect Your Data Sources
        </div>
        <p className="text-sm text-white-40 max-w-md mx-auto">
          Help us create better content by connecting your tools. The more data you connect, the more personalized your content will be.
        </p>
      </div>

      {/* Tech stack groups */}
      {hasItems && filteredGroups && (
        <div className="space-y-4">
          {GROUP_META.map(({ key, label, icon, color, bgColor }) => {
            const items = filteredGroups[key as keyof typeof filteredGroups];
            if (!items || items.length === 0) return null;
            return (
              <TechStackGroup
                key={key}
                label={label}
                icon={icon}
                color={color}
                bgColor={bgColor}
                items={items}
                clientId={clientId}
              />
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!hasItems && (
        <div className="text-center py-8">
          <Sparkles className="w-8 h-8 text-white-20 mx-auto mb-2" />
          <p className="text-sm text-white-40">
            No additional data sources available yet. You can add them later from your workspace settings.
          </p>
        </div>
      )}

      {/* CTAs */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-green-110 text-black text-sm font-semibold hover:bg-accent-green-110/90 transition-colors"
        >
          Generate My Content
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 text-sm text-white-40 hover:text-white-60 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip
        </button>
      </div>
    </div>
  );
}
