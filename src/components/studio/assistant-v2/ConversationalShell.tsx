'use client';

import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useClient } from '@/hooks/useSquadpitch';
import { useConversationalAssistant } from '@/hooks/useConversationalAssistant';
import { MessageThread } from './MessageThread';
import { AssistantCommandBar } from './AssistantCommandBar';
import { SummaryPanel } from './SummaryPanel';

interface Props {
  clientId: string;
  // When set, the shell will auto-select this mode on mount as if the
  // user had picked it from the Mode card. Used by /create when the
  // user clicks Campaign or Single Post on the entry screen — the
  // assistant skips its own mode-select card and goes straight to
  // the next prompt. Re-running the auto-select on remount is
  // guarded so a user who manually changes mode mid-session isn't
  // forced back.
  initialMode?: 'campaign' | 'quick_post';
}

export function ConversationalShell({ clientId, initialMode }: Props) {
  const { data: client } = useClient(clientId);
  const {
    session,
    conversation,
    summary,
    ready,
    sendMessage,
    handleCardSelection,
    requestRevision,
    reset,
  } = useConversationalAssistant(clientId, client?.industryKey ?? undefined);

  // Auto-apply initialMode once per mount when the session has no
  // mode yet. Re-firing is blocked by both `appliedRef` (once-per-
  // mount) and the `!session.mode` guard (no clobber on a session
  // that's already past the mode pick).
  const appliedRef = useRef(false);
  useEffect(() => {
    if (appliedRef.current) return;
    if (!initialMode) return;
    if (session.mode) return;
    appliedRef.current = true;
    handleCardSelection(
      { type: 'SET_MODE', payload: initialMode },
      initialMode === 'campaign' ? 'Mode: Campaign' : 'Mode: Single Post',
    );
  }, [initialMode, session.mode, handleCardSelection]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
        {/* Header — fixed */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white-10">
          <h1 className="text-base font-semibold text-white-100">
            {session.mode === 'campaign' ? 'Campaign' : session.mode === 'quick_post' ? 'Single Post' : 'Create'}
          </h1>
          {session.mode && (
            <button
              onClick={() => {
                if (window.confirm('Start over? This will clear your current progress.')) {
                  reset();
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Start over
            </button>
          )}
        </div>

        {/* Message thread — scrollable */}
        <MessageThread
          messages={conversation.messages}
          session={session}
          clientId={clientId}
          onCardSelection={handleCardSelection}
        />

        {/* Command bar — fixed at bottom.
            Provides per-step helper label, contextual chips, Examples
            popover, and the existing typed input. Chips fire through
            sendMessage so typed and clicked commands behave the same. */}
        <div className="shrink-0">
          <AssistantCommandBar
            session={session}
            ready={ready}
            hasGenerationResult={session.generationResult != null}
            onSend={sendMessage}
          />
        </div>
      </div>

      {/* Summary panel — fixed sidebar */}
      <SummaryPanel
        items={summary}
        ready={ready}
        onRevise={requestRevision}
      />
    </div>
  );
}
