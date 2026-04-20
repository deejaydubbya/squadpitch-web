'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChannelSettings, type Channel, type DraftKind } from '@/hooks/useSquadpitch';
import { CHANNEL_REGISTRY, getChannelRequirementHint } from '@/lib/channelRegistry';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  dispatch: React.Dispatch<AssistantAction>;
  clientId: string;
}

const KIND_OPTIONS: { value: DraftKind; label: string; description: string }[] = [
  { value: 'POST', label: 'Post', description: 'Standard social media post' },
  { value: 'CAPTION', label: 'Caption', description: 'Short caption for an image or reel' },
  { value: 'VIDEO_SCRIPT', label: 'Video Script', description: 'Script for a short-form video' },
];

export function QuickPostConfigStep({ session, dispatch, clientId }: Props) {
  const { data: channelSettings } = useChannelSettings(clientId);

  const availableChannels: Channel[] = useMemo(() => {
    if (!channelSettings) return [];
    return channelSettings
      .filter((cs) => cs.isEnabled && !CHANNEL_REGISTRY[cs.channel]?.comingSoon)
      .map((cs) => cs.channel);
  }, [channelSettings]);

  return (
    <div className="flex flex-col gap-6">
      {/* Channel */}
      <div>
        <p className="text-sm text-white-60 mb-3">Which channel is this post for?</p>

        {availableChannels.length === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-3">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-xs text-yellow-200">
              No channels connected.{' '}
              <Link href={`/workspaces/${clientId}/settings/channels`} className="underline hover:text-white-100">
                Connect channels
              </Link>{' '}
              to get started.
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {availableChannels.map((ch) => {
            const reg = CHANNEL_REGISTRY[ch];
            const active = session.quickPostChannel === ch;
            return (
              <button
                key={ch}
                onClick={() => dispatch({ type: 'SET_QUICK_POST_CHANNEL', payload: ch })}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  active
                    ? 'border-accent-green-110 bg-accent-green-110/10 text-accent-green-110'
                    : 'border-white-10 text-white-60 hover:border-white-20'
                )}
              >
                {reg?.label ?? ch}
              </button>
            );
          })}
        </div>

        {session.quickPostChannel && getChannelRequirementHint(session.quickPostChannel) && (
          <p className="text-xs text-white-40 mt-2">
            {getChannelRequirementHint(session.quickPostChannel)} for publishing.
          </p>
        )}
      </div>

      {/* Kind */}
      <div>
        <p className="text-sm text-white-60 mb-3">What kind of content?</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => dispatch({ type: 'SET_QUICK_POST_KIND', payload: opt.value })}
              className={cn(
                'flex flex-col items-start p-4 rounded-lg border text-left transition-colors',
                session.quickPostKind === opt.value
                  ? 'border-accent-green-110 bg-accent-green-110/10'
                  : 'border-white-10 hover:border-white-20 hover:bg-white-5'
              )}
            >
              <p className="text-sm font-medium text-white-100">{opt.label}</p>
              <p className="text-xs text-white-40 mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Guidance */}
      <div>
        <p className="text-sm text-white-60 mb-3">Any specific guidance? (optional)</p>
        <textarea
          value={session.quickPostGuidance ?? ''}
          onChange={(e) => dispatch({ type: 'SET_QUICK_POST_GUIDANCE', payload: e.target.value })}
          placeholder="e.g. Focus on the open floor plan, mention the open house this Saturday..."
          rows={3}
          className="w-full rounded-lg border border-white-10 bg-white-5 px-4 py-3 text-sm text-white-100 placeholder:text-white-30 focus:border-accent-green-110 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
