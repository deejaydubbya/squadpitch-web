'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { OnboardingChatMessage, OnboardingCardType } from '@/lib/onboarding/types';
import type { useOnboardingEngine } from '@/hooks/useOnboardingEngine';

import { IndustrySelectCard } from './cards/IndustrySelectCard';
import { StarterOptionsCard } from './cards/StarterOptionsCard';
import { SourceInputCard } from './cards/SourceInputCard';
import { AnalysisProgressCard } from './cards/AnalysisProgressCard';
import { BrandPreviewCard } from './cards/BrandPreviewCard';
import { ContentPreviewCard } from './cards/ContentPreviewCard';
import { EnrichmentMenuCard } from './cards/EnrichmentMenuCard';
import { SourceZillowCard } from './cards/SourceZillowCard';
import { SourceLicenseCard } from './cards/SourceLicenseCard';
import { SourceCrmCard } from './cards/SourceCrmCard';
import { ChannelConnectCard } from './cards/ChannelConnectCard';
import { CompletionSummaryCard } from './cards/CompletionSummaryCard';
import { FallbackStarterCard } from './cards/FallbackStarterCard';
import { FallbackSourceCard } from './cards/FallbackSourceCard';
import { FallbackContentPromptCard } from './cards/FallbackContentPromptCard';
import { ProfileRefinementCard } from './cards/ProfileRefinementCard';
import { REStarterCard } from './cards/REStarterCard';
import { REListingSourceCard } from './cards/REListingSourceCard';
import { REListingFormCard } from './cards/REListingFormCard';
import { REContentGoalCard } from './cards/REContentGoalCard';
import { REContentPromptCard } from './cards/REContentPromptCard';
import { REAgentProfileCard } from './cards/REAgentProfileCard';

type Engine = ReturnType<typeof useOnboardingEngine>;

interface Props {
  engine: Engine;
}

export function OnboardingMessageThread({ engine }: Props) {
  const { session, conversation } = engine;
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageId = conversation.messages.length > 0
    ? conversation.messages[conversation.messages.length - 1].id
    : '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timer);
  }, [conversation.messages.length, lastMessageId]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3 scrollbar-dark">
      {conversation.messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} engine={engine} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Message Bubble ───────────────────────────────────────────────────────

function MessageBubble({ message, engine }: { message: OnboardingChatMessage; engine: Engine }) {
  const isUser = message.type === 'user_text';
  const isConfirmation = message.type === 'confirmation';
  const isSystemUpdate = message.type === 'system_update';
  const isInteractive = message.type === 'interactive_prompt';
  const isResolved = message.status === 'resolved';

  if (isConfirmation) {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-accent-green-110 bg-accent-green-110/10 border border-accent-green-110/20 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

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
          'max-w-[85%] min-w-0 rounded-xl px-4 py-2.5',
          isUser
            ? 'bg-accent-green-110/15 text-white-100'
            : 'bg-white-5 text-white-100',
          isInteractive && isResolved && 'opacity-60',
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

        {isInteractive && message.status === 'active' && message.cardType && (
          <div className="mt-3">
            <CardRouter
              cardType={message.cardType}
              engine={engine}
              payload={message.payload}
            />
          </div>
        )}

        {isInteractive && isResolved && message.cardType && (
          <div className="mt-1 text-[11px] text-white-30 italic">Selection confirmed</div>
        )}
      </div>
    </div>
  );
}

// ── Card Router ──────────────────────────────────────────────────────────

function CardRouter({
  cardType,
  engine,
  payload,
}: {
  cardType: OnboardingCardType;
  engine: Engine;
  payload?: Record<string, unknown>;
}) {
  switch (cardType) {
    case 'industry_select':
      return <IndustrySelectCard onSelect={engine.selectIndustry} />;
    case 'starter_options':
      return (
        <StarterOptionsCard
          industryKey={engine.session.industryKey}
          onSelect={engine.selectStarter}
        />
      );
    case 'source_input':
      return (
        <SourceInputCard
          industryKey={engine.session.industryKey}
          starterMethod={engine.session.starterMethod}
          onSubmit={engine.submitInput}
          payload={payload}
        />
      );
    case 'analysis_progress':
      return <AnalysisProgressCard progressRef={engine.analysisProgress} />;
    case 'brand_preview':
      return (
        <BrandPreviewCard
          analyzeResult={engine.session.analyzeResult}
          starterMethod={engine.session.starterMethod}
          onConfirm={engine.confirmBrand}
          isCreating={engine.isCreating}
        />
      );
    case 'content_preview':
      return (
        <ContentPreviewCard
          session={engine.session}
          onGenerate={engine.generatePreviews}
          isGenerating={engine.isGenerating}
          generationProgress={engine.generationProgress}
        />
      );
    case 'enrichment_menu':
      return (
        <EnrichmentMenuCard
          session={engine.session}
          onSelect={engine.handleEnrichment}
          onSkip={engine.skipEnrichment}
        />
      );
    case 'source_zillow':
      return (
        <SourceZillowCard
          onDone={(source) => {
            engine.addSource(source);
            engine.markEnrichmentDone('zillow');
          }}
        />
      );
    case 'source_license':
      return (
        <SourceLicenseCard
          onDone={(source) => {
            engine.addSource(source);
            engine.markEnrichmentDone('license');
          }}
        />
      );
    case 'source_crm':
      return (
        <SourceCrmCard
          clientId={engine.session.createdClientId}
          onDone={(source) => {
            engine.addSource(source);
            engine.markEnrichmentDone('crm');
          }}
        />
      );
    case 'channel_connect':
      return (
        <ChannelConnectCard
          clientId={engine.session.createdClientId}
          onDone={() => engine.markEnrichmentDone('channels')}
        />
      );
    case 'completion_summary':
      return (
        <CompletionSummaryCard
          session={engine.session}
          onFinish={engine.finish}
        />
      );

    // ── Fallback-specific cards ──────────────────────────────────────
    case 'fallback_starter':
      return <FallbackStarterCard onSelect={engine.selectFallbackIntent} />;
    case 'fallback_source':
      return <FallbackSourceCard onSelect={engine.selectFallbackSource} />;
    case 'fallback_content_prompt':
      return (
        <FallbackContentPromptCard
          onSubmit={engine.submitContentPrompt}
          isGenerating={engine.isGenerating}
        />
      );
    case 'profile_refinement':
      return (
        <ProfileRefinementCard
          onSave={engine.saveProfileRefinement}
          onSkip={engine.skipProfileRefinement}
        />
      );

    // ── Real estate cards ────────────────────────────────────────────
    case 're_starter':
      return <REStarterCard onSelect={engine.selectREIntent} />;
    case 're_listing_source':
      return <REListingSourceCard onSelect={engine.selectREListingSource} />;
    case 're_listing_form':
      return (
        <REListingFormCard
          onSubmit={engine.submitListingForm}
          isSubmitting={engine.isCreating || engine.isGenerating}
        />
      );
    case 're_content_goal':
      return <REContentGoalCard onSelect={engine.selectREContentGoal} />;
    case 're_content_prompt':
      return (
        <REContentPromptCard
          onSubmit={engine.submitContentPrompt}
          isGenerating={engine.isGenerating}
        />
      );
    case 're_agent_profile':
      return (
        <REAgentProfileCard
          onSave={engine.saveREAgentProfile}
          onSkip={engine.skipREAgentProfile}
        />
      );

    default:
      return null;
  }
}
