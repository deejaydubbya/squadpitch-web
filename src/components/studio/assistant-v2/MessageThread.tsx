'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage, CardType } from '@/lib/assistant/conversation/types';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { ModeCard } from './cards/ModeCard';
import { CampaignTypeCard } from './cards/CampaignTypeCard';
import { CampaignSourceCard } from './cards/CampaignSourceCard';
import { CampaignDataItemCard } from './cards/CampaignDataItemCard';
import { CampaignIdeaCard } from './cards/CampaignIdeaCard';
import { CampaignUrlSourceCard } from './cards/CampaignUrlSourceCard';
import { PropertySelectCard } from './cards/PropertySelectCard';
import { ChannelSelectCard } from './cards/ChannelSelectCard';
import { MediaSelectCard } from './cards/MediaSelectCard';
import { ScheduleReviewCard } from './cards/ScheduleReviewCard';
import { GenerationCard } from './cards/GenerationCard';
import { CampaignReviewCard } from './cards/CampaignReviewCard';
import { QuickPostConfigCard } from './cards/QuickPostConfigCard';
import { QuickPostSourceCard } from './cards/QuickPostSourceCard';
import { QuickPostDataCard } from './cards/QuickPostDataCard';
import { QuickPostGuidanceCard } from './cards/QuickPostGuidanceCard';
import { QuickPostContentTypeCard } from './cards/QuickPostContentTypeCard';
import { QuickPostGoalCard } from './cards/QuickPostGoalCard';

interface Props {
  messages: ChatMessage[];
  session: AssistantSessionState;
  clientId: string;
  onCardSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}

export function MessageThread({ messages, session, clientId, onCardSelection }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Derive a key from message count + last message id so we scroll on any new message
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : '';

  useEffect(() => {
    // Immediate scroll
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Delayed scroll to catch card renders that expand content
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages.length, lastMessageId]);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          session={session}
          clientId={clientId}
          onCardSelection={onCardSelection}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Message Bubble ───────────────────────────────────────────────────────

function MessageBubble({
  message,
  session,
  clientId,
  onCardSelection,
}: {
  message: ChatMessage;
  session: AssistantSessionState;
  clientId: string;
  onCardSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}) {
  const isUser = message.type === 'user_text';
  const isConfirmation = message.type === 'confirmation';
  const isSystemUpdate = message.type === 'system_update';
  const isInteractive = message.type === 'interactive_prompt';
  const isResolved = message.status === 'resolved';
  const isInvalidated = message.status === 'invalidated';

  // Confirmation messages — compact inline pill
  if (isConfirmation) {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-accent-green-110 bg-accent-green-110/10 border border-accent-green-110/20 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

  // System updates — subtle centered
  if (isSystemUpdate) {
    return (
      <div className="flex justify-center">
        <div className="text-[11px] text-white-30 bg-white-5 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-xl px-3 py-2.5 sm:px-4',
          isInteractive ? 'w-full max-w-full sm:w-auto sm:max-w-[85%]' : 'max-w-[90%] sm:max-w-[85%]',
          isUser
            ? 'bg-accent-green-110/15 text-white-100'
            : 'bg-white-5 text-white-100',
          isInteractive && isResolved && 'opacity-60',
          isInvalidated && 'opacity-40'
        )}
      >
        {/* Text content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Embedded card (only for active interactive prompts) */}
        {isInteractive && message.status === 'active' && message.cardType && (
          <div className="mt-3">
            <CardRenderer
              cardType={message.cardType}
              session={session}
              clientId={clientId}
              onSelection={onCardSelection}
            />
          </div>
        )}

        {/* Collapsed card indicator */}
        {isInteractive && isResolved && message.cardType && (
          <div className="mt-1 text-[11px] text-white-30 italic">Selection confirmed</div>
        )}
      </div>
    </div>
  );
}

// ── Card Router ──────────────────────────────────────────────────────────

function CardRenderer({
  cardType,
  session,
  clientId,
  onSelection,
}: {
  cardType: CardType;
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}) {
  switch (cardType) {
    case 'mode_select':
      return <ModeCard onSelection={onSelection} />;
    case 'campaign_source':
      return <CampaignSourceCard session={session} onSelection={onSelection} />;
    case 'campaign_type':
      return <CampaignTypeCard session={session} onSelection={onSelection} />;
    case 'property_select':
      return <PropertySelectCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'campaign_data_item':
      return <CampaignDataItemCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'campaign_idea':
      return <CampaignIdeaCard session={session} onSelection={onSelection} />;
    case 'campaign_url_source':
      return (
        <CampaignUrlSourceCard
          session={session}
          clientId={clientId}
          onSelection={onSelection}
        />
      );
    case 'channel_select':
      return <ChannelSelectCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'media_select':
      return <MediaSelectCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'schedule_review':
      return <ScheduleReviewCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'generation':
      return <GenerationCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'campaign_review':
      return <CampaignReviewCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'quick_post_config':
      return <QuickPostConfigCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'quick_post_source':
      return <QuickPostSourceCard onSelection={onSelection} />;
    case 'quick_post_data':
      return <QuickPostDataCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'quick_post_guidance':
      return <QuickPostGuidanceCard session={session} clientId={clientId} onSelection={onSelection} />;
    case 'quick_post_content_type':
      return <QuickPostContentTypeCard onSelection={onSelection} />;
    case 'quick_post_goal':
      return <QuickPostGoalCard onSelection={onSelection} />;
    default:
      return null;
  }
}
