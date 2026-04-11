'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wand2, Loader2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGenerateContent,
  useChannelSettings,
  useMediaProfile,
  useGenerateMedia,
  useGenerateVideo,
  useGenerateIdeas,
  type Channel,
  type Draft,
  type ContentIdea,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';
import { useUsage } from '@/hooks/useBilling';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';

interface Props {
  clientId: string;
  onGenerated: (draft: Draft) => void;
}

const GOALS = ['Growth', 'Engagement', 'Sales'] as const;

export function CreateContentForm({ clientId, onGenerated }: Props) {
  const { data: channels } = useChannelSettings(clientId);
  const { data: mediaProfile } = useMediaProfile(clientId);
  const generate = useGenerateContent();
  const generateMedia = useGenerateMedia(clientId);
  const generateVideo = useGenerateVideo(clientId);
  const ideasMutation = useGenerateIdeas(clientId);

  const { data: usage } = useUsage();

  const [guidance, setGuidance] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [goal, setGoal] = useState<typeof GOALS[number]>('Growth');
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);

  const aiImageAvailable =
    mediaProfile?.mode === 'BRAND_ASSETS_PLUS_AI' ||
    mediaProfile?.mode === 'AI_CHARACTER';

  const enabledChannels = useMemo(
    () => channels?.filter((c) => c.isEnabled) ?? [],
    [channels]
  );

  // Auto-select first enabled channel
  useEffect(() => {
    if (selectedChannels.length === 0 && enabledChannels.length > 0) {
      setSelectedChannels([enabledChannels[0].channel]);
    }
  }, [selectedChannels.length, enabledChannels]);

  const toggleChannel = (ch: Channel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleGenerate = () => {
    if (selectedChannels.length === 0 || !guidance.trim()) return;
    const channel = selectedChannels[0];
    const fullGuidance = `[Goal: ${goal}] ${guidance.trim()}`;

    generate.mutate(
      {
        clientId,
        kind: 'POST',
        channel,
        guidance: fullGuidance,
      },
      {
        onSuccess: (draft) => {
          // Auto-generate image if AI available
          if (aiImageAvailable) {
            generateMedia.mutate({
              clientId,
              guidance: draft.imageGuidance || draft.altText || draft.body.slice(0, 500),
              draftId: draft.id,
              channel,
            });
          }
          onGenerated(draft);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const atPostLimit =
    usage && isFinite(usage.limits.posts) && usage.usage.posts >= usage.limits.posts;

  const canGenerate =
    selectedChannels.length > 0 && guidance.trim().length > 0 && !generate.isPending && !atPostLimit;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white-100">
          What do you want to post about?
        </h1>
        <p className="text-white-40 mt-2">
          Describe your idea and we'll generate on-brand content ready to publish.
        </p>
      </div>

      <div className="space-y-6">
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Introduce protein timing for marathon runners, mention our coaching plan..."
          rows={6}
          maxLength={4000}
          className="w-full px-4 py-3.5 rounded-xl bg-white-5 border border-white-10 text-white-100 text-base focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 resize-none placeholder:text-white-30"
        />

        {/* Platform pills */}
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2.5">
            Platform
          </label>
          {enabledChannels.length === 0 ? (
            <p className="text-sm text-white-40 italic">
              No channels enabled. Enable channels in Settings → Media.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enabledChannels.map((c) => (
                <button
                  key={c.channel}
                  type="button"
                  onClick={() => toggleChannel(c.channel)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    selectedChannels.includes(c.channel)
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  {c.channel}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Goal pills */}
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2.5">
            Goal
          </label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  goal === g
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-10 text-white-60 hover:bg-white-20'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {atPostLimit && (
          <UpgradePrompt currentTier={usage!.tier} limitType="Post" />
        )}

        {generate.error && (
          <StatusBanner error={(generate.error as Error).message} />
        )}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full py-3.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generate.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate
            </>
          )}
        </button>

        <p className="text-center text-xs text-white-30">
          Ctrl+Enter to generate
        </p>

        {/* Ideas Engine */}
        <div className="border-t border-white-10 pt-6 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white-60">Need inspiration?</h3>
            <button
              onClick={() =>
                ideasMutation.mutate(undefined, {
                  onSuccess: (data) => setIdeas(data),
                })
              }
              disabled={ideasMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {ideasMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lightbulb className="w-3.5 h-3.5" />
              )}
              Give me ideas
            </button>
          </div>

          {ideas.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {ideas.map((idea, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGuidance(idea.description)}
                  className="w-full text-left p-3 rounded-lg bg-white-5 border border-white-10 hover:bg-white-10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-white-100">{idea.title}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white-10 text-white-40 text-[10px] uppercase">
                      {idea.category}
                    </span>
                    <span className="text-[10px] text-white-30 ml-auto">
                      {idea.suggestedChannel}
                    </span>
                  </div>
                  <p className="text-xs text-white-40">{idea.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
