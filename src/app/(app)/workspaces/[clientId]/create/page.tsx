'use client';

// Unified Create entry — assistant-first.
//
// The route has two states:
//   1. No `mode` query param (or mode=assistant for backward compat)
//      → Render the two-card landing: Campaign and Single Post.
//   2. mode=campaign or mode=single → Render the assistant
//      (ConversationalShell) with the mode pre-selected so the
//      assistant skips its own mode-pick card.
//
// The old standalone Single Post composer and Multi-Post Campaign
// wizard have been removed — the assistant workflow is now the only
// Create experience.

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Megaphone, MessageSquare, ArrowRight } from 'lucide-react';
import { ConversationalShell } from '@/components/studio/assistant-v2/ConversationalShell';

type Mode = 'campaign' | 'single';
type AssistantMode = 'campaign' | 'quick_post';

const MODE_TO_ASSISTANT: Record<Mode, AssistantMode> = {
  campaign: 'campaign',
  single: 'quick_post',
};

export default function CreatePage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const searchParams = useSearchParams();
  const router = useRouter();

  // Resolve the requested mode from the URL. `assistant` is treated
  // as "no mode" (legacy alias) so deep links keep working without
  // skipping the picker.
  const rawMode = searchParams.get('mode');
  const mode: Mode | null =
    rawMode === 'campaign' || rawMode === 'single' ? rawMode : null;

  if (mode) {
    return (
      <div className="fixed inset-0 lg:left-64 z-10 bg-sp-bg">
        <ConversationalShell
          clientId={clientId}
          initialMode={MODE_TO_ASSISTANT[mode]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white-100">Create</h1>
        <p className="text-sm text-white-40">What would you like to create?</p>
      </div>

      <div className="grid gap-4">
        {/* Campaign */}
        <button
          onClick={() => router.push(`/workspaces/${clientId}/create?mode=campaign`)}
          className="flex items-center gap-4 p-5 rounded-2xl border border-white-10 bg-sp-card hover:border-purple-400/40 hover:bg-purple-400/5 transition-all group text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-400/15 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white-100">Campaign</p>
            <p className="text-xs text-white-40 mt-0.5">
              Plan several connected posts around a goal. Best for planning a week or launch.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-white-20 group-hover:text-purple-400 transition-colors flex-shrink-0" />
        </button>

        {/* Single Post */}
        <button
          onClick={() => router.push(`/workspaces/${clientId}/create?mode=single`)}
          className="flex items-center gap-4 p-5 rounded-2xl border border-white-10 bg-sp-card hover:border-accent-green-110/40 hover:bg-accent-green-110/5 transition-all group text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-accent-green-110/15 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-accent-green-110" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white-100">Single Post</p>
            <p className="text-xs text-white-40 mt-0.5">
              Create one post right now. Best when you need something to post today.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-white-20 group-hover:text-accent-green-110 transition-colors flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
