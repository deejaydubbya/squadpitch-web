'use client';

import { Fragment, useEffect, useRef } from 'react';
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
import { ListingPhotoOfferCard } from './cards/ListingPhotoOfferCard';
import { PropertyReviewCard } from './cards/PropertyReviewCard';
import { EnrichmentReviewCard } from './cards/EnrichmentReviewCard';
import { CampaignPresentationCard } from './cards/CampaignPresentationCard';

type Engine = ReturnType<typeof useOnboardingEngine>;

// ── Step grouping ────────────────────────────────────────────────────────

const STEP_GROUP: Partial<Record<OnboardingCardType, string>> = {
  industry_select: 'setup', starter_options: 'setup', fallback_starter: 'setup',
  re_starter: 'setup', source_input: 'setup', fallback_source: 'setup',
  re_listing_source: 'setup', re_listing_form: 'setup', re_content_goal: 'setup',
  re_content_prompt: 'setup', fallback_content_prompt: 'setup',
  analysis_progress: 'analysis',
  brand_preview: 'review', property_review: 'review', listing_photo_offer: 'review',
  re_agent_profile: 'review', profile_refinement: 'review',
  content_preview: 'content', enrichment_menu: 'content', source_zillow: 'content',
  source_license: 'content', source_crm: 'content', enrichment_review: 'content',
  channel_connect: 'content',
  campaign_presentation: 'campaign', completion_summary: 'campaign',
};

const STEP_LABEL: Record<string, string> = {
  analysis: 'Analyzing your data',
  review: 'Review',
  content: 'Your content',
  campaign: 'Your campaign',
};

// Cards that render at full width without chat bubble wrapper
const WIDE_CARDS = new Set<OnboardingCardType>([
  'content_preview', 'property_review', 'brand_preview',
  'enrichment_review', 're_listing_form', 're_agent_profile',
  'profile_refinement', 'completion_summary', 'campaign_presentation',
  'analysis_progress', 'channel_connect', 'listing_photo_offer',
]);

// Cards that persist visible even after resolution
const PERSIST_CARDS = new Set<OnboardingCardType>([
  'content_preview', 'property_review',
]);

function StepDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 mt-2">
      <div className="flex-1 h-px bg-white-10" />
      <span className="text-[11px] font-medium text-white-30 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-white-10" />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

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
    // Delayed scroll to handle card content that renders after mount
    const t1 = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    const t2 = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [conversation.messages.length, lastMessageId, session.previewDrafts.length]);

  // Track step groups for dividers
  let lastStep: string | null = null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-5 space-y-4 scrollbar-dark">
      {conversation.messages.map((msg) => {
        const currentStep = msg.cardType ? STEP_GROUP[msg.cardType] ?? null : null;
        const dividerLabel =
          currentStep &&
          currentStep !== lastStep &&
          currentStep !== 'setup' &&
          msg.type === 'interactive_prompt'
            ? STEP_LABEL[currentStep]
            : null;

        if (currentStep && msg.type === 'interactive_prompt') {
          lastStep = currentStep;
        }

        return (
          <Fragment key={msg.id}>
            {dividerLabel && <StepDivider label={dividerLabel} />}
            <MessageBubble message={msg} engine={engine} />
          </Fragment>
        );
      })}
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
  const isAssistantText = message.type === 'assistant_text';
  const isResolved = message.status === 'resolved';

  // Confirmation pills — compact inline
  if (isConfirmation) {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-accent-green-110 bg-accent-green-110/10 border border-accent-green-110/20 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

  // System updates — subtle centered pill
  if (isSystemUpdate) {
    return (
      <div className="flex justify-center">
        <div className="text-[11px] text-white-30 bg-white-5 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

  const persistCard = message.cardType ? PERSIST_CARDS.has(message.cardType) : false;
  const isWideCard = message.cardType && WIDE_CARDS.has(message.cardType);
  const showCard = isInteractive && message.cardType && (message.status === 'active' || persistCard);
  const showResolved = isInteractive && isResolved && message.cardType && !persistCard;

  // ── Card-dominant: wide cards break out of the chat bubble ──
  if (isInteractive && isWideCard && showCard) {
    return (
      <div className="w-full">
        <p className="text-xs text-white-40 mb-2 px-1">{message.content}</p>
        <CardRouter cardType={message.cardType!} engine={engine} payload={message.payload} />
      </div>
    );
  }

  // ── Resolved interactive prompts — collapsed to minimal text ──
  if (showResolved) {
    return (
      <div className="px-1">
        <p className="text-[11px] text-white-30 leading-relaxed">{message.content}</p>
      </div>
    );
  }

  // ── Assistant text — no bubble, lighter weight ──
  if (isAssistantText) {
    return (
      <div className="px-1">
        <p className="text-sm text-white-50 leading-relaxed">{message.content}</p>
      </div>
    );
  }

  // ── Standard bubbles (user text, non-wide interactive with card) ──
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'min-w-0 rounded-xl px-4 py-2.5 max-w-[88%] sm:max-w-[80%]',
          isUser
            ? 'bg-accent-green-110/15 text-white-100'
            : 'bg-white-5 text-white-100',
        )}
      >
        <p className={cn(
          'whitespace-pre-wrap break-words leading-relaxed',
          isInteractive && showCard ? 'text-xs text-white-50 mb-1' : 'text-sm',
        )}>
          {message.content}
        </p>

        {showCard && (
          <div className="mt-2">
            <CardRouter cardType={message.cardType!} engine={engine} payload={message.payload} />
          </div>
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
          onSubmitFiles={engine.submitFiles}
          payload={payload}
        />
      );
    case 'analysis_progress':
      return (
        <AnalysisProgressCard
          progressRef={engine.analysisProgress}
          isTextInput={engine.session.starterMethod === 'description' || engine.session.starterMethod === 'documents'}
          onRetry={engine.retryAnalysis}
          onFallbackToText={engine.fallbackToText}
          onChooseMethod={engine.chooseAlternateMethod}
        />
      );
    case 'brand_preview':
      return (
        <BrandPreviewCard
          analyzeResult={engine.session.analyzeResult}
          starterMethod={engine.session.starterMethod}
          onConfirm={engine.confirmBrand}
          isCreating={engine.isCreating}
          sourceUrl={engine.session.primaryInput && /^https?:\/\//i.test(engine.session.primaryInput) ? engine.session.primaryInput : null}
        />
      );
    case 'property_review':
      return (
        <PropertyReviewCard
          clientId={payload?.clientId as string}
          onConfirm={engine.confirmPropertyReview}
          onChooseMethod={engine.chooseAlternateMethod}
        />
      );
    case 'content_preview':
      return (
        <ContentPreviewCard
          session={engine.session}
          onGenerate={engine.generatePreviews}
          onReplaceDraft={engine.replacePreviewDraft}
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
          onDone={(source) => engine.stageEnrichmentFromCard('license', 'license', source)}
        />
      );
    case 'source_crm':
      return (
        <SourceCrmCard
          clientId={engine.session.createdClientId}
          onDone={(source, extra) => engine.stageEnrichmentFromCard('crm', 'crm', source, extra)}
        />
      );
    case 'enrichment_review':
      return <EnrichmentReviewCard engine={engine} />;
    case 'channel_connect':
      return (
        <ChannelConnectCard
          clientId={engine.session.createdClientId}
          onDone={(channels) => {
            if (engine.session.channelConnectDone || engine.session.channelConnectSkipped) {
              // Enrichment menu flow — already past initial channel connect
              engine.markEnrichmentDone('channels');
            } else {
              engine.completeChannelConnect(channels);
            }
          }}
          onSkip={
            !engine.session.channelConnectDone && !engine.session.channelConnectSkipped
              ? engine.skipChannelConnect
              : undefined
          }
        />
      );
    case 'campaign_presentation':
      return <CampaignPresentationCard engine={engine} />;
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
    case 're_agent_profile': {
      const ar = engine.session.analyzeResult;
      const prefill: Partial<import('@/lib/onboarding/types').REAgentProfileData> = {};
      if (ar) {
        if (ar.brandData.name) prefill.agentName = ar.brandData.name;
        if (ar.brandData.offers) prefill.specialties = ar.brandData.offers;
        // Extract service areas from data items or brand description
        const listing = ar.dataItems.find((d) => d.dataJson?.city || d.dataJson?.location);
        if (listing) {
          prefill.serviceAreas = (listing.dataJson.city ?? listing.dataJson.location) as string;
        }
      }
      return (
        <REAgentProfileCard
          onSave={engine.saveREAgentProfile}
          onSkip={engine.skipREAgentProfile}
          initialData={Object.keys(prefill).length > 0 ? prefill : undefined}
        />
      );
    }

    case 'listing_photo_offer':
      return (
        <ListingPhotoOfferCard
          onUpload={engine.uploadListingPhotos}
          onSkip={engine.skipListingPhotos}
          variant={engine.session.reIntent === 'business' ? 'business' : 'listing'}
        />
      );

    default:
      return null;
  }
}
