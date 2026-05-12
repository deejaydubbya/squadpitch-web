'use client';

// Freeform-idea card for campaign mode. The user describes the
// campaign in plain text and the prompt builder treats that as the
// primary context (no listing data, no asset).

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  onSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}

const SUGGESTION_CHIPS = [
  'Promote our new coaching package',
  'Educate first-time buyers on the closing process',
  'Drive sign-ups for next month’s webinar',
  'Highlight a recent client win',
];

const MAX_IDEA_CHARS = 600;

export function CampaignIdeaCard({ session, onSelection }: Props) {
  const [idea, setIdea] = useState(session.campaignIdea ?? '');
  const trimmed = idea.trim();
  const remaining = MAX_IDEA_CHARS - idea.length;

  const handleConfirm = () => {
    if (!trimmed) return;
    onSelection(
      { type: 'SET_CAMPAIGN_IDEA', payload: trimmed },
      `Idea: ${trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed}`,
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-400/5 border border-purple-400/20">
        <Lightbulb className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-white-60">
          Describe the campaign in one or two sentences. The AI will pick a campaign type, channels, and a schedule that fit.
        </p>
      </div>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value.slice(0, MAX_IDEA_CHARS))}
        rows={3}
        placeholder="e.g. Promote our new buyer concierge service to first-time homebuyers over two weeks."
        className="w-full px-2.5 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none"
      />

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setIdea(chip)}
            className="px-2.5 py-1 rounded-full bg-white-5 hover:bg-white-10 text-[11px] text-white-60 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] ${remaining < 50 ? 'text-amber-400' : 'text-white-30'}`}>
          {remaining} chars left
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!trimmed}
          className="py-1.5 px-4 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-xs flex items-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
