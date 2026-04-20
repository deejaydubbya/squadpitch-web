'use client';

import { RotateCcw } from 'lucide-react';
import { useClient } from '@/hooks/useSquadpitch';
import { useConversationalAssistant } from '@/hooks/useConversationalAssistant';
import { MessageThread } from './MessageThread';
import { ChatInput } from './ChatInput';
import { SummaryPanel } from './SummaryPanel';

interface Props {
  clientId: string;
}

export function ConversationalShell({ clientId }: Props) {
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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
        {/* Header — fixed */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white-10">
          <h1 className="text-base font-semibold text-white-100">Create Content</h1>
          {session.mode && (
            <button
              onClick={reset}
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

        {/* Input — fixed at bottom */}
        <div className="shrink-0">
          <ChatInput
            onSend={sendMessage}
            placeholder={
              ready
                ? 'Ready to generate! Type "generate" or adjust settings...'
                : 'Type your instructions or use the options above...'
            }
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
