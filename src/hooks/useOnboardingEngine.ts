'use client';

import { useReducer, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateClient,
  useGenerateContent,
  squadpitchKeys,
  type Channel,
  type Draft,
  type AgentProfileDraft,
  type OnboardingAnalyzeResult,
} from '@/hooks/useSquadpitch';
import { trackActivationEvent } from '@/lib/activationTracking';
import type {
  OnboardingSessionState,
  OnboardingAction,
  ConversationState,
  ConversationAction,
  OnboardingChatMessage,
  OnboardingPhase,
  StarterMethod,
  AnalysisProgress,
  FallbackIntent,
  FallbackSourceMethod,
  ProfileRefinementData,
  REIntent,
  REListingSourceMethod,
  REContentGoal,
  REAgentProfileData,
  SourceEntry,
  PendingEnrichment,
} from '@/lib/onboarding/types';
import type { REListingFormData } from '@/lib/onboarding/configs/realEstate';
import { resolveNextStep, getAvailableEnrichments } from '@/lib/onboarding/engine';
import { getOnboardingConfig } from '@/lib/onboarding/configRegistry';
import {
  buildAssistantText,
  buildUserText,
  buildInteractivePrompt,
  buildConfirmation,
  buildSystemUpdate,
  buildCompletionPrompt,
} from '@/lib/onboarding/messageBuilder';
import {
  consumeAnalyzeStream,
  saveProfiles,
  mergeDrafts,
  slugify,
  normalizeUrl,
  isUrl,
} from '@/lib/onboarding/helpers';
import { buildOnboardingGenerationPlan } from '@/lib/assistant/onboardingPlanner';
import type { BrandOverrides } from '@/components/onboarding/cards/BrandPreviewCard';
import type { QuickStartClassification } from '@/components/onboarding/cards/QuickStartInputCard';
import { FALLBACK_SOURCE_PROMPT } from '@/lib/onboarding/configs/fallback';

// ── Name confidence heuristic ────────────────────────────────────────────

const STREET_SUFFIXES = /\b(st|street|ave|avenue|blvd|boulevard|dr|drive|rd|road|ln|lane|ct|court|way|pl|place|cir|circle|ter|terrace|pkwy|parkway|hwy|highway)\b/i;
const ADDRESS_NUMBER = /^\d{1,6}\s/;
const ZIP_CODE = /\b\d{5}(-\d{4})?\b/;
const STATE_ABBR = /\b[A-Z]{2}\s*\d{5}\b|\b,\s*[A-Z]{2}\b/;
const LISTING_PHRASES = /\b(bed|bath|sqft|sq\s*ft|acre|lot\s*size|mls|listing|for\s+sale|price\s*cut|open\s*house|pending|sold)\b/i;
const PROPERTY_DESCRIPTORS = /^\d+\s*(bed|br|bath|ba)\b/i;

/** Returns true only when the extracted name looks like a business or person name, not a property address or listing description. */
function looksLikeBusinessOrAgentName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return false;

  // Reject clear address patterns
  if (ADDRESS_NUMBER.test(trimmed) && STREET_SUFFIXES.test(trimmed)) return false;
  if (ZIP_CODE.test(trimmed)) return false;
  if (STATE_ABBR.test(trimmed)) return false;
  if (LISTING_PHRASES.test(trimmed)) return false;
  if (PROPERTY_DESCRIPTORS.test(trimmed)) return false;

  // Reject if it starts with a street number and contains a comma (like "123 Main St, City")
  if (ADDRESS_NUMBER.test(trimmed) && trimmed.includes(',')) return false;

  // Accept: looks like a named entity (not just numbers/address fragments)
  return true;
}

// ── Initial states ───────────────────────────────────────────────────────

const initialSession: OnboardingSessionState = {
  phase: 'industry_select',
  industryKey: null,
  starterMethod: null,
  primaryInput: null,
  sources: [],
  analyzeResult: null,
  createdClientId: null,
  previewDrafts: [],
  sourceEntries: [],
  enrichmentsCompleted: [],
  enrichmentsSkipped: false,
  brandConfirmed: false,
  profilesSaved: false,
  brandNameOverride: null,
  error: null,
  fallbackIntent: null,
  fallbackSourceMethod: null,
  contentPrompt: null,
  profileRefinementDone: false,
  reIntent: null,
  reListingSource: null,
  reContentGoal: null,
  reAgentProfileDone: false,
  selectedPropertyIds: null,
  propertyReviewDone: false,
  photoOfferResult: null,
  pendingEnrichment: null,
  channelConnectDone: false,
  channelConnectSkipped: false,
  connectedChannelsSnapshot: [],
};

const initialConversation: ConversationState = {
  messages: [],
  activeCardId: null,
};

// ── Session reducer ──────────────────────────────────────────────────────

function sessionReducer(state: OnboardingSessionState, action: OnboardingAction): OnboardingSessionState {
  switch (action.type) {
    case 'SET_INDUSTRY':
      return { ...state, industryKey: action.industryKey, phase: 'quick_start' };
    case 'SET_STARTER_METHOD':
      return { ...state, starterMethod: action.method };
    case 'SET_PRIMARY_INPUT':
      return { ...state, primaryInput: action.input };
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_ANALYZE_RESULT':
      return { ...state, analyzeResult: action.result, phase: 'value_delivery' };
    case 'SET_CREATED_CLIENT':
      return { ...state, createdClientId: action.clientId };
    case 'ADD_PREVIEW_DRAFT':
      return { ...state, previewDrafts: [...state.previewDrafts, action.draft] };
    case 'REPLACE_PREVIEW_DRAFT':
      return {
        ...state,
        previewDrafts: state.previewDrafts.map((d) =>
          d.id === action.oldId ? action.draft : d,
        ),
      };
    case 'SET_PREVIEW_DRAFTS':
      return { ...state, previewDrafts: action.drafts };
    case 'ADD_SOURCE':
      return { ...state, sources: [...state.sources, action.source] };
    case 'ADD_SOURCE_ENTRY':
      return { ...state, sourceEntries: [...state.sourceEntries, action.entry] };
    case 'UPDATE_SOURCE_ENTRY':
      return {
        ...state,
        sourceEntries: state.sourceEntries.map((e) =>
          e.id === action.id ? { ...e, ...action.updates } : e,
        ),
      };
    case 'MARK_ENRICHMENT_COMPLETED':
      return {
        ...state,
        enrichmentsCompleted: [...state.enrichmentsCompleted, action.key],
      };
    case 'MARK_ENRICHMENT_SKIPPED':
      return { ...state, enrichmentsSkipped: true, phase: 'completion' };
    case 'CONFIRM_BRAND':
      return { ...state, brandConfirmed: true };
    case 'SET_BRAND_NAME_OVERRIDE':
      return { ...state, brandNameOverride: action.name };
    case 'SET_PROFILES_SAVED':
      return { ...state, profilesSaved: true };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return { ...initialSession };
    // Fallback flow
    case 'SET_FALLBACK_INTENT':
      return { ...state, fallbackIntent: action.intent };
    case 'SET_FALLBACK_SOURCE_METHOD':
      return { ...state, fallbackSourceMethod: action.method };
    case 'SET_CONTENT_PROMPT':
      return { ...state, contentPrompt: action.prompt };
    case 'SET_PROFILE_REFINEMENT_DONE':
      return { ...state, profileRefinementDone: true };
    // Real estate flow
    case 'SET_RE_INTENT':
      return { ...state, reIntent: action.intent };
    case 'SET_RE_LISTING_SOURCE':
      return { ...state, reListingSource: action.method };
    case 'SET_RE_CONTENT_GOAL':
      return { ...state, reContentGoal: action.goal };
    case 'SET_RE_AGENT_PROFILE_DONE':
      return { ...state, reAgentProfileDone: true };
    // Property review
    case 'SET_SELECTED_PROPERTY_IDS':
      return { ...state, selectedPropertyIds: action.ids };
    case 'SET_PROPERTY_REVIEW_DONE':
      return { ...state, propertyReviewDone: true };
    case 'SET_PHOTO_OFFER_RESULT':
      return { ...state, photoOfferResult: action.result };
    case 'SET_PENDING_ENRICHMENT':
      return { ...state, pendingEnrichment: action.pending };
    case 'CLEAR_PENDING_ENRICHMENT':
      return { ...state, pendingEnrichment: null };
    case 'SET_CHANNEL_CONNECT_DONE':
      return { ...state, channelConnectDone: true, connectedChannelsSnapshot: action.channels };
    case 'SET_CHANNEL_CONNECT_SKIPPED':
      return { ...state, channelConnectSkipped: true };
    case 'UPDATE_CHANNELS_SNAPSHOT':
      return { ...state, connectedChannelsSnapshot: action.channels };
    default:
      return state;
  }
}

// ── Conversation reducer ─────────────────────────────────────────────────

function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'ADD_MESSAGE': {
      const messages = state.messages.map((m) =>
        m.status === 'active' ? { ...m, status: 'resolved' as const } : m,
      );
      const activeCardId = action.message.status === 'active' ? action.message.id : null;
      return { messages: [...messages, action.message], activeCardId };
    }
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, content: action.content } : m,
        ),
      };
    case 'RESOLVE_ACTIVE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.status === 'active' ? { ...m, status: 'resolved' as const } : m,
        ),
        activeCardId: null,
      };
    case 'CLEAR':
      return { ...initialConversation };
    default:
      return state;
  }
}

// ── Main hook ────────────────────────────────────────────────────────────

export function useOnboardingEngine() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createClient = useCreateClient();
  const generateContent = useGenerateContent();

  const [session, dispatchSession] = useReducer(sessionReducer, initialSession);
  const [conversation, dispatchConversation] = useReducer(conversationReducer, initialConversation);

  // Track analysis progress for the UI
  const analysisProgressRef = useRef<AnalysisProgress>({
    stage: 'connecting',
    rootUrl: null,
    crawledPages: [],
    failedPages: [],
    totalExpected: 0,
    crawlDone: false,
    imagesFound: 0,
    brandData: null,
    dataItems: [],
    dataCount: 0,
    errorMessage: null,
    errorCode: null,
    imagesDownloaded: 0,
    imagesDownloadTotal: 0,
    imagesFailed: 0,
  });

  const busyRef = useRef(false);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────

  const addMessage = useCallback((msg: OnboardingChatMessage) => {
    dispatchConversation({ type: 'ADD_MESSAGE', message: msg });
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    dispatchConversation({ type: 'UPDATE_MESSAGE', id, content });
  }, []);

  const advanceToNextStep = useCallback(() => {
    const step = resolveNextStep(session);
    addMessage(buildInteractivePrompt(step.message, step.cardType, step.payload));
    dispatchSession({ type: 'SET_PHASE', phase: step.phase });
  }, [session, addMessage]);

  // ── Public methods ─────────────────────────────────────────────────

  const selectIndustry = useCallback((industryKey: string, industryLabel: string) => {
    dispatchSession({ type: 'SET_INDUSTRY', industryKey });
    addMessage(buildConfirmation(industryLabel));

    const config = getOnboardingConfig(industryKey);
    if (config.useREFlow) {
      // Real estate flow — show RE starter
      addMessage(buildInteractivePrompt(config.welcomeMessage, 're_starter'));
    } else if (config.useFallbackFlow) {
      // Fallback flow — show intent-based starter
      addMessage(buildInteractivePrompt(config.welcomeMessage, 'fallback_starter'));
    } else {
      // Industry-specific flow — show starter options
      addMessage(buildInteractivePrompt(config.welcomeMessage, 'starter_options'));
    }
  }, [addMessage]);

  const selectStarter = useCallback((method: StarterMethod, label: string) => {
    dispatchSession({ type: 'SET_STARTER_METHOD', method });
    addMessage(buildConfirmation(label));

    if (method === 'scratch') {
      addMessage(buildInteractivePrompt(
        "Let's set up your workspace. You can add details later.",
        'brand_preview',
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'value_delivery' });
    } else {
      const config = getOnboardingConfig(session.industryKey);
      const starter = config.starters.find((s) => s.method === method);
      const prompt = starter?.inputType === 'url'
        ? `Enter your ${method === 'zillow' ? 'Zillow profile' : 'website'} URL and I'll analyze it.`
        : 'Tell me about your business. The more detail, the better!';
      addMessage(buildInteractivePrompt(prompt, 'source_input'));
    }
  }, [session.industryKey, addMessage]);

  // ── Fallback-specific methods ──────────────────────────────────────

  const selectFallbackIntent = useCallback((intent: FallbackIntent, label: string) => {
    dispatchSession({ type: 'SET_FALLBACK_INTENT', intent });
    addMessage(buildConfirmation(label));

    if (intent === 'just_create') {
      // Flow C: skip to content prompt
      addMessage(buildInteractivePrompt(
        "What do you want to make? Pick a suggestion or describe your idea.",
        'fallback_content_prompt',
      ));
    } else if (intent === 'manual') {
      // Manual entry mode → straight to brand preview
      addMessage(buildInteractivePrompt(
        "Let's set up your workspace. You can fill in the details.",
        'brand_preview',
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'value_delivery' });
    } else {
      // Flow A or B: ask for source method
      const prompt = FALLBACK_SOURCE_PROMPT[intent]
        ?? "What's the easiest way to tell me about your business?";
      addMessage(buildInteractivePrompt(prompt, 'fallback_source'));
    }
  }, [addMessage]);

  const selectFallbackSource = useCallback((method: FallbackSourceMethod, label: string) => {
    dispatchSession({ type: 'SET_FALLBACK_SOURCE_METHOD', method });

    // Map fallback source method to a starter method for source_input compatibility
    if (method === 'website') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'website' });
    } else if (method === 'description') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'description' });
    } else if (method === 'documents') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'documents' });
    }

    addMessage(buildConfirmation(label));

    if (method === 'skip') {
      // Skip → ask what they want to create right now
      addMessage(buildInteractivePrompt(
        "What would you like to create right now?",
        'fallback_content_prompt',
      ));
    } else if (method === 'website') {
      addMessage(buildInteractivePrompt(
        "Enter your website URL and I'll analyze it.",
        'source_input',
      ));
    } else if (method === 'description') {
      const prompt = session.fallbackIntent === 'product_service'
        ? 'Tell me about your product or service — what it does, who it\'s for, and what makes it stand out.'
        : 'Tell me about your business. The more detail, the better!';
      addMessage(buildInteractivePrompt(prompt, 'source_input'));
    } else if (method === 'documents') {
      addMessage(buildInteractivePrompt(
        'Upload your documents and I\'ll extract the key info.',
        'source_input',
        { inputMode: 'file', accept: '.pdf,.doc,.docx,.txt,.csv' },
      ));
    }
  }, [session.fallbackIntent, addMessage]);

  const submitContentPrompt = useCallback(async (prompt: string) => {
    if (busyRef.current) return;
    busyRef.current = true;

    dispatchSession({ type: 'SET_CONTENT_PROMPT', prompt });
    addMessage(buildUserText(prompt));

    // If no workspace yet, create one first
    if (!session.createdClientId) {
      try {
        addMessage(buildSystemUpdate('Setting up your workspace...'));
        const workspaceName = session.brandNameOverride ?? 'My Workspace';
        const client = await createClient.mutateAsync({
          name: workspaceName,
          slug: slugify(workspaceName),
          industryKey: session.industryKey ?? undefined,
          status: 'DRAFT',
        });
        dispatchSession({ type: 'SET_CREATED_CLIENT', clientId: client.id });
        dispatchSession({ type: 'CONFIRM_BRAND' });

        // Generate content directly using the prompt
        setGenerationProgress({ current: 0, total: 1 });
        try {
          const draft = await generateContent.mutateAsync({
            clientId: client.id,
            kind: 'POST',
            channel: 'INSTAGRAM',
            guidance: prompt,
          });
          dispatchSession({ type: 'ADD_PREVIEW_DRAFT', draft });
          setGenerationProgress({ current: 1, total: 1 });
        } catch {
          // Non-critical
        }
        setGenerationProgress(null);

        // Show campaign presentation directly
        addMessage(buildInteractivePrompt(
          'Your campaign is ready. Review and take action.',
          'campaign_presentation',
        ));
        dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create workspace.';
        dispatchSession({ type: 'SET_ERROR', error: msg });
        addMessage(buildSystemUpdate(msg));
      }
    }

    busyRef.current = false;
  }, [session, addMessage, createClient, generateContent]);

  const saveProfileRefinement = useCallback(async (data: ProfileRefinementData) => {
    if (!session.createdClientId) return;

    dispatchSession({ type: 'SET_PROFILE_REFINEMENT_DONE' });
    addMessage(buildConfirmation('Profile details saved'));

    // Save the refinement data to backend
    try {
      if (data.businessName || data.audience || data.services || data.location) {
        await fetch(`/api/proxy/workspaces/${session.createdClientId}/brand`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(data.businessName && { description: data.businessName }),
            ...(data.audience && { audience: data.audience }),
            ...(data.services && { offers: data.services }),
            ...(data.location && { city: data.location }),
          }),
        });
      }
      if (data.voiceTone) {
        await fetch(`/api/proxy/workspaces/${session.createdClientId}/voice`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tone: data.voiceTone }),
        });
      }
    } catch {
      // Non-critical — refinement save failure shouldn't block
    }

    // Move to enrichment or completion
    const config = getOnboardingConfig(session.industryKey);
    const available = config.enrichmentCards.filter(
      (c) => !session.enrichmentsCompleted.includes(c.key),
    );
    if (available.length > 0) {
      addMessage(buildInteractivePrompt(
        'Want to add more sources to improve your content? These are optional.',
        'enrichment_menu',
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
    } else {
      addMessage(buildCompletionPrompt());
      dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
    }
  }, [session, addMessage]);

  const skipProfileRefinement = useCallback(() => {
    dispatchSession({ type: 'SET_PROFILE_REFINEMENT_DONE' });
    addMessage(buildConfirmation('Skipped'));

    const config = getOnboardingConfig(session.industryKey);
    const available = config.enrichmentCards.filter(
      (c) => !session.enrichmentsCompleted.includes(c.key),
    );
    if (available.length > 0) {
      addMessage(buildInteractivePrompt(
        'Want to add more sources to improve your content? These are optional.',
        'enrichment_menu',
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
    } else {
      addMessage(buildCompletionPrompt());
      dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
    }
  }, [session, addMessage]);

  // ── Real estate–specific methods ─────────────────────────────────

  const selectREIntent = useCallback((intent: REIntent, label: string) => {
    dispatchSession({ type: 'SET_RE_INTENT', intent });
    addMessage(buildConfirmation(label));

    if (intent === 'listing') {
      addMessage(buildInteractivePrompt(
        "How do you want to add the listing?",
        're_listing_source',
      ));
    } else if (intent === 'business') {
      addMessage(buildInteractivePrompt(
        "What's the easiest way to tell me about your business?",
        'fallback_source',
      ));
    } else if (intent === 'just_create') {
      addMessage(buildInteractivePrompt(
        "What do you want to create right now?",
        're_content_prompt',
      ));
    } else if (intent === 'manual') {
      addMessage(buildInteractivePrompt(
        "Let's set up your agent profile.",
        're_agent_profile',
      ));
    }
  }, [addMessage]);

  const selectREListingSource = useCallback((method: REListingSourceMethod, label: string) => {
    dispatchSession({ type: 'SET_RE_LISTING_SOURCE', method });
    addMessage(buildConfirmation(label));

    if (method === 'manual_form') {
      addMessage(buildInteractivePrompt(
        "Enter the listing details below.",
        're_listing_form',
      ));
    } else if (method === 'single_listing_url') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'website' });
      addMessage(buildInteractivePrompt(
        "Paste the property page URL and I'll extract the listing details.",
        'source_input',
      ));
    } else if (method === 'listing_feed_url') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'website' });
      addMessage(buildInteractivePrompt(
        "Paste the listing feed or IDX page URL and I'll find the properties on it.",
        'source_input',
      ));
    } else if (method === 'description') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'description' });
      addMessage(buildInteractivePrompt(
        "Paste the listing description and I'll work with it.",
        'source_input',
      ));
    }
  }, [addMessage]);

  const selectREContentGoal = useCallback((goal: REContentGoal, label: string) => {
    dispatchSession({ type: 'SET_RE_CONTENT_GOAL', goal });
    addMessage(buildConfirmation(label));

    // After goal selection, go to campaign card (generation auto-triggers there)
    addMessage(buildInteractivePrompt(
      'Your campaign is ready. Review and take action.',
      'campaign_presentation',
    ));
    dispatchSession({ type: 'SET_PHASE', phase: 'value_delivery' });
  }, [addMessage]);

  const submitListingForm = useCallback(async (formData: REListingFormData) => {
    if (busyRef.current) return;
    busyRef.current = true;

    // Build a descriptive string from the form data
    const parts: string[] = [];
    if (formData.address) parts.push(formData.address);
    if (formData.city || formData.state || formData.zip) {
      parts.push([formData.city, formData.state, formData.zip].filter(Boolean).join(', '));
    }
    if (formData.price) parts.push(`Price: ${formData.price}`);
    if (formData.propertyType) parts.push(`Type: ${formData.propertyType}`);
    if (formData.beds) parts.push(`${formData.beds} beds`);
    if (formData.baths) parts.push(`${formData.baths} baths`);
    if (formData.sqft) parts.push(`${formData.sqft} sqft`);
    if (formData.lotSize) parts.push(`Lot: ${formData.lotSize}`);
    if (formData.yearBuilt) parts.push(`Built: ${formData.yearBuilt}`);
    if (formData.description) parts.push(formData.description);
    if (formData.features) parts.push(`Features: ${formData.features}`);

    const description = parts.join(' | ');
    dispatchSession({ type: 'SET_PRIMARY_INPUT', input: description });
    addMessage(buildUserText(description));

    // Build a synthetic analyzeResult so generatePreviews has listing-aware
    // templates and data items instead of falling back to generic content.
    const listingTitle = formData.address || 'Property Listing';
    const hasNeighborhood = !!(formData.neighborhood?.trim());
    const noInventionRule =
      'RULES: Only use facts explicitly provided. Do NOT invent open house dates, price drops, testimonials, client names, school ratings, crime stats, HOA details, or any specs not given. If a detail is missing, omit it naturally. ' +
      'Avoid clichés: "dream home", "stunning", "gorgeous", "must-see", "act fast", "won\'t last", "hidden gem". Use soft CTAs only. Sound like a real agent, not a marketing bot.';

    const loc = [formData.address, formData.city].filter(Boolean).join(', ');

    const syntheticResult: OnboardingAnalyzeResult = {
      brandData: {
        name: listingTitle,
        description,
        industry: 'Real Estate',
        audience: 'Home buyers and investors',
        offers: formData.propertyType ? `${formData.propertyType} properties` : 'Residential properties',
        competitors: '',
      },
      voiceData: {
        tone: 'Professional and inviting',
        doRules: [],
        dontRules: [],
        contentBuckets: [],
      },
      suggestedGoal: 'Generate listing content',
      suggestedChannels: ['INSTAGRAM'],
      images: [],
      dataItems: [{
        type: 'PROPERTY',
        title: listingTitle,
        summary: description,
        dataJson: {
          type: 'listing',
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          price: formData.price ? Number(formData.price.replace(/[^0-9.]/g, '')) || undefined : undefined,
          propertyType: formData.propertyType,
          beds: formData.beds ? Number(formData.beds) || undefined : undefined,
          baths: formData.baths ? Number(formData.baths) || undefined : undefined,
          sqft: formData.sqft ? Number(formData.sqft.replace(/[^0-9]/g, '')) || undefined : undefined,
          lotSize: formData.lotSize,
          yearBuilt: formData.yearBuilt,
          description: formData.description,
          features: formData.features,
          neighborhood: formData.neighborhood,
          showingInstructions: formData.showingInstructions,
        },
        tags: ['listing'],
        priority: 1,
      }],
      coreTemplates: [
        {
          type: 'listing_post',
          title: 'Just Listed',
          guidance: `Create a "Just Listed" post for ${loc || 'this property'}. Highlight the most compelling facts from the listing data — location, price, size, standout features. Write it as a real agent would: grounded, specific, inviting. Do NOT dump all data as a bullet list — weave the best details into a natural post.${formData.showingInstructions ? ` Showing info: ${formData.showingInstructions}.` : ''} ${noInventionRule}`,
          conditions: { hasData: true, requiredDataType: 'listing' },
        },
        {
          type: hasNeighborhood ? 'neighborhood_highlight' : 'buyer_tip',
          title: hasNeighborhood ? 'Neighborhood & Lifestyle' : 'Buyer Education',
          guidance: hasNeighborhood
            ? `Create a post about life in ${formData.neighborhood}${formData.city ? `, ${formData.city}` : ''}. Focus on what makes the area desirable — walkability, vibe, convenience, community. Do NOT repeat listing price, beds, baths, or sqft — this is about lifestyle, not specs. Only reference neighborhood details that were provided. ${noInventionRule}`
            : `Write a practical advice post for buyers interested in ${formData.propertyType ?? 'this type of'} properties. Topics: what to look for during a showing, financing tips, how to stand out in offers. Position yourself as a knowledgeable resource. Do NOT repeat listing specs. ${noInventionRule}`,
        },
        {
          type: 'brand_authority',
          title: 'Agent Expertise',
          guidance: `Create a post establishing your expertise${formData.propertyType ? ` in ${formData.propertyType} properties` : ''}${formData.city ? ` in ${formData.city}` : ''}. Share a professional insight, market observation, or practical tip that builds trust. Sound knowledgeable but approachable. Do NOT reference any specific listing or invent market statistics. ${noInventionRule}`,
        },
      ],
    };
    dispatchSession({ type: 'SET_ANALYZE_RESULT', result: syntheticResult });

    // For manual form, skip analysis — create workspace directly
    try {
      addMessage(buildSystemUpdate('Setting up your workspace...'));
      const workspaceName = formData.address ?? 'My Listing';
      const client = await createClient.mutateAsync({
        name: workspaceName,
        slug: slugify(workspaceName),
        industryKey: session.industryKey ?? undefined,
        status: 'DRAFT',
      });
      dispatchSession({ type: 'SET_CREATED_CLIENT', clientId: client.id });
      dispatchSession({ type: 'CONFIRM_BRAND' });

      // Save listing data as brand description
      try {
        await fetch(`/api/proxy/workspaces/${client.id}/brand`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description }),
        });
        dispatchSession({ type: 'SET_PROFILES_SAVED' });
      } catch {
        // Non-critical
      }

      // Save listing as a data item in the workspace
      try {
        await fetch(`/api/proxy/workspaces/${client.id}/data-import/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: syntheticResult.dataItems,
            sourceType: 'TEXT',
          }),
        });
      } catch {
        // Non-critical
      }

      // Offer photo upload before generating content — images will be
      // attached to generated posts if uploaded first.
      addMessage(buildInteractivePrompt(
        "Add listing photos to use in your posts.",
        'listing_photo_offer',
        { clientId: client.id },
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'value_delivery' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create workspace.';
      dispatchSession({ type: 'SET_ERROR', error: msg });
      addMessage(buildSystemUpdate(msg));
    } finally {
      busyRef.current = false;
    }
  }, [session, addMessage, createClient]);

  // -- Listing photo offer → optional setup → campaign ----------------------
  const proceedToContentPreview = useCallback(() => {
    // Show enrichment menu before campaign generation
    const config = getOnboardingConfig(session.industryKey);
    const available = getAvailableEnrichments(session, config);
    if (available.length > 0 && !session.enrichmentsSkipped) {
      addMessage(buildInteractivePrompt(
        'Add optional setup to help Squadpitch create better, safer, and more useful campaigns.',
        'enrichment_menu',
        { preGeneration: true },
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
    } else {
      addMessage(buildInteractivePrompt(
        'Your campaign is ready. Review and take action.',
        'campaign_presentation',
      ));
    }
  }, [session, addMessage]);

  const uploadListingPhotos = useCallback(async (
    files: File[],
    onProgress?: (p: { uploaded: number; total: number; currentName: string }) => void,
  ) => {
    const clientId = session.createdClientId;
    if (!clientId || files.length === 0) return;

    let uploaded = 0;
    const uploadedAssetIds: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.({ uploaded, total: files.length, currentName: file.name });
      try {
        const params = new URLSearchParams();
        params.set('filename', file.name);
        params.set('onboarding', 'true');
        const res = await fetch(
          `/api/proxy/workspaces/${clientId}/assets/upload?${params}`,
          {
            method: 'POST',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
          },
        );
        if (res.ok) {
          uploaded++;
          try { const asset = await res.json(); if (asset?.id) uploadedAssetIds.push(asset.id); } catch { /* ok */ }
        }
      } catch {
        // Skip individual failures
      }
    }
    onProgress?.({ uploaded, total: files.length, currentName: '' });

    dispatchSession({ type: 'SET_PHOTO_OFFER_RESULT', result: uploaded > 0 ? 'uploaded' : 'skipped' });

    if (uploaded > 0) {
      addMessage(buildConfirmation(`${uploaded} photo${uploaded > 1 ? 's' : ''} uploaded`));
    }

    // Auto-tag uploaded images using AI vision (fire-and-forget, don't block UI)
    if (uploadedAssetIds.length > 0) {
      addMessage(buildSystemUpdate('Analyzing photos...'));
      try {
        await fetch(`/api/proxy/workspaces/${clientId}/assets/batch-auto-tag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetIds: uploadedAssetIds }),
        });
      } catch { /* non-critical */ }
    }

    proceedToContentPreview();
  }, [session.createdClientId, addMessage, proceedToContentPreview]);

  const skipListingPhotos = useCallback(() => {
    dispatchSession({ type: 'SET_PHOTO_OFFER_RESULT', result: 'skipped' });
    addMessage(buildConfirmation('Skipped'));
    proceedToContentPreview();
  }, [addMessage, proceedToContentPreview]);

  // -- Channel connection -------------------------------------------------------
  const completeChannelConnect = useCallback((connectedChannels: Channel[]) => {
    dispatchSession({ type: 'SET_CHANNEL_CONNECT_DONE', channels: connectedChannels });
    addMessage(buildConfirmation(
      connectedChannels.length > 0
        ? `${connectedChannels.length} channel${connectedChannels.length > 1 ? 's' : ''} connected`
        : 'No channels connected',
    ));
    // Move to enrichments or completion
    const config = getOnboardingConfig(session.industryKey);
    const step = resolveNextStep(session);
    addMessage(buildInteractivePrompt(step.message, step.cardType));
    dispatchSession({ type: 'SET_PHASE', phase: step.phase });
  }, [session, addMessage]);

  const skipChannelConnect = useCallback(() => {
    dispatchSession({ type: 'SET_CHANNEL_CONNECT_SKIPPED' });
    addMessage(buildConfirmation('Skipped — your posts will be saved as drafts'));
    const step = resolveNextStep(session);
    addMessage(buildInteractivePrompt(step.message, step.cardType));
    dispatchSession({ type: 'SET_PHASE', phase: step.phase });
  }, [session, addMessage]);

  const saveREAgentProfile = useCallback(async (data: REAgentProfileData) => {
    if (!session.createdClientId) return;

    dispatchSession({ type: 'SET_RE_AGENT_PROFILE_DONE' });
    addMessage(buildConfirmation('Agent profile saved'));

    // Save agent profile data to backend
    try {
      const brandParts: Record<string, string> = {};
      if (data.agentName) brandParts.description = data.agentName;
      if (data.brokerage) brandParts.company = data.brokerage;
      if (data.serviceAreas) brandParts.city = data.serviceAreas;
      if (data.specialties) brandParts.offers = data.specialties;

      if (Object.keys(brandParts).length > 0) {
        await fetch(`/api/proxy/workspaces/${session.createdClientId}/brand`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brandParts),
        });
      }
      if (data.tagline) {
        await fetch(`/api/proxy/workspaces/${session.createdClientId}/voice`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagline: data.tagline }),
        });
      }
    } catch {
      // Non-critical
    }

    // Move to enrichment or completion
    const config = getOnboardingConfig(session.industryKey);
    const available = config.enrichmentCards.filter(
      (c) => !session.enrichmentsCompleted.includes(c.key),
    );
    if (available.length > 0) {
      addMessage(buildInteractivePrompt(
        'Want to add more sources to improve your content? These are optional.',
        'enrichment_menu',
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
    } else {
      addMessage(buildCompletionPrompt());
      dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
    }
  }, [session, addMessage]);

  const skipREAgentProfile = useCallback(() => {
    dispatchSession({ type: 'SET_RE_AGENT_PROFILE_DONE' });
    addMessage(buildConfirmation('Skipped'));

    const config = getOnboardingConfig(session.industryKey);
    const available = config.enrichmentCards.filter(
      (c) => !session.enrichmentsCompleted.includes(c.key),
    );
    if (available.length > 0) {
      addMessage(buildInteractivePrompt(
        'Want to add more sources to improve your content? These are optional.',
        'enrichment_menu',
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
    } else {
      addMessage(buildCompletionPrompt());
      dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
    }
  }, [session, addMessage]);

  // ── Standard methods (unchanged) ───────────────────────────────────

  const submitInput = useCallback(async (input: string, opts?: {
    displayLabel?: string;
    documentTexts?: string[];
    industryKeyOverride?: string;
    reListingSourceOverride?: REListingSourceMethod;
    reIntentOverride?: REIntent;
  }) => {
    if (busyRef.current) return;
    busyRef.current = true;

    const effectiveIndustryKey = opts?.industryKeyOverride ?? session.industryKey;
    const effectiveReListingSource = opts?.reListingSourceOverride ?? session.reListingSource;
    const effectiveReIntent = opts?.reIntentOverride ?? session.reIntent;
    const config = getOnboardingConfig(effectiveIndustryKey);
    // Detect input type from the content itself, not the original starter method.
    // This prevents sending a description as 'url' during enrichment.
    const looksLikeUrl = isUrl(input);
    const inputType = looksLikeUrl ? 'url' : 'text';
    const normalizedInput = looksLikeUrl ? normalizeUrl(input) : input;

    dispatchSession({ type: 'SET_PRIMARY_INPUT', input: normalizedInput });
    addMessage(buildUserText(opts?.displayLabel ?? input));

    // Record source entry for provenance tracking
    const reSourceMap: Record<string, SourceEntry['sourceType']> = {
      single_listing_url: 'listing_link',
      listing_feed_url: 'feed_link',
    };
    const sourceType: SourceEntry['sourceType'] =
      (effectiveReListingSource && reSourceMap[effectiveReListingSource])
        ?? (inputType === 'url' ? 'website' : 'description');
    const entryId = `src_${Date.now()}`;
    dispatchSession({
      type: 'ADD_SOURCE_ENTRY',
      entry: {
        id: entryId,
        sourceType,
        label: inputType === 'url' ? normalizedInput : `${input.slice(0, 40)}...`,
        status: 'pending',
        timestamp: Date.now(),
      },
    });

    dispatchSession({ type: 'SET_PHASE', phase: 'analysis' });

    addMessage(buildInteractivePrompt(config.analysisMessage, 'analysis_progress'));

    analysisProgressRef.current = {
      stage: 'connecting',
      rootUrl: null,
      crawledPages: [],
      failedPages: [],
      totalExpected: 0,
      crawlDone: false,
      imagesFound: 0,
      brandData: null,
      dataItems: [],
      dataCount: 0,
      errorMessage: null,
      errorCode: null,
      imagesDownloaded: 0,
      imagesDownloadTotal: 0,
      imagesFailed: 0,
    };

    try {
      const result = await consumeAnalyzeStream(
        {
          input: normalizedInput,
          inputType,
          documentTexts: opts?.documentTexts,
          industryKey: effectiveIndustryKey ?? undefined,
        },
        {
          onCrawlStart: (url) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              rootUrl: url,
              stage: 'crawling',
            };
          },
          onCrawlDiscovered: (totalExpected) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              totalExpected,
            };
          },
          onCrawlPage: (page) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              crawledPages: [...analysisProgressRef.current.crawledPages, page],
            };
          },
          onCrawlPageError: (err) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              failedPages: [...analysisProgressRef.current.failedPages, err],
            };
          },
          onCrawlDone: () => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              crawlDone: true,
              stage: 'extracting_brand',
            };
          },
          onImagesFound: (count) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              imagesFound: count,
            };
          },
          onExtractStart: () => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              stage: 'extracting_brand',
            };
          },
          onBrandDone: (brandData) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              brandData,
              stage: 'extracting_data',
            };
          },
          onDataProgress: (items, count) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              dataItems: items,
              dataCount: count,
            };
          },
          onDataDone: (items, count) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              dataItems: items,
              dataCount: count,
              stage: 'done',
            };
          },
          onError: (message, code) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              stage: 'error',
              errorMessage: message,
              errorCode: code ?? null,
            };
          },
        },
      );

      if (result) {
        // Only keep the extracted name if it's confidently a business or agent name,
        // not a property address, listing description, or generic placeholder.
        if (result.brandData?.name) {
          if (!looksLikeBusinessOrAgentName(result.brandData.name)) {
            result.brandData.name = '';
          }
        }

        dispatchSession({ type: 'SET_ANALYZE_RESULT', result });
        dispatchSession({
          type: 'UPDATE_SOURCE_ENTRY',
          id: entryId,
          updates: {
            status: 'analyzed',
            extractedFields: Object.keys(result.brandData ?? {}),
          },
        });

        // If workspace already exists (enrichment flow), stage result for review
        // instead of saving directly.
        if (session.createdClientId) {
          const enrichType: 'urls' | 'description' = inputType === 'url' ? 'urls' : 'description';
          const enrichKey = inputType === 'url' ? 'additional_urls' : 'add_description';
          const pending: PendingEnrichment = {
            type: enrichType,
            key: enrichKey,
            analyzeResult: result,
            normalizedInput,
            inputType,
          };
          dispatchSession({ type: 'SET_PENDING_ENRICHMENT', pending });
          addMessage(buildInteractivePrompt(
            'Review the extracted data.',
            'enrichment_review',
          ));
        } else {
          const isListingFlow = effectiveReIntent === 'listing';
          const confirmMsg = isListingFlow
            ? "Review the listing details."
            : "Review your brand details.";
          addMessage(buildInteractivePrompt(confirmMsg, 'brand_preview'));
        }
      } else {
        dispatchSession({ type: 'UPDATE_SOURCE_ENTRY', id: entryId, updates: { status: 'failed' } });
        dispatchSession({ type: 'SET_ERROR', error: 'Analysis failed. Please try again.' });
        addMessage(buildSystemUpdate('Analysis failed. Please try again.'));

        // Recover: let the user retry or continue
        if (session.createdClientId) {
          addMessage(buildInteractivePrompt(
            'Want to try something else?',
            'enrichment_menu',
          ));
          dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
        } else {
          addMessage(buildInteractivePrompt(
            'Try again or use a different method.',
            'source_input',
          ));
          dispatchSession({ type: 'SET_PHASE', phase: 'quick_start' });
        }
      }
    } catch (err) {
      dispatchSession({ type: 'UPDATE_SOURCE_ENTRY', id: entryId, updates: { status: 'failed' } });
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      dispatchSession({ type: 'SET_ERROR', error: msg });
      addMessage(buildSystemUpdate(msg));

      // Recover: let the user retry or continue
      if (session.createdClientId) {
        addMessage(buildInteractivePrompt(
          'Want to try something else?',
          'enrichment_menu',
        ));
        dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
      } else {
        addMessage(buildInteractivePrompt(
          'Try again or use a different method.',
          'source_input',
        ));
        dispatchSession({ type: 'SET_PHASE', phase: 'quick_start' });
      }
    } finally {
      busyRef.current = false;
    }
  }, [session, addMessage]);

  const confirmBrand = useCallback(async (overrides?: BrandOverrides) => {
    if (busyRef.current) return;
    busyRef.current = true;

    const nameOverride = overrides?.name;
    if (nameOverride) {
      dispatchSession({ type: 'SET_BRAND_NAME_OVERRIDE', name: nameOverride });
    }
    dispatchSession({ type: 'CONFIRM_BRAND' });
    addMessage(buildConfirmation('Brand confirmed'));

    // Apply field overrides to the analyzeResult before saving
    if (session.analyzeResult && overrides) {
      const bd = session.analyzeResult.brandData;
      if (overrides.description !== undefined) bd.description = overrides.description;
      if (overrides.audience !== undefined) bd.audience = overrides.audience;
      if (overrides.offers !== undefined) bd.offers = overrides.offers;
      if (overrides.voiceTone !== undefined && session.analyzeResult.voiceData) {
        session.analyzeResult.voiceData.tone = overrides.voiceTone;
      }
    }

    const brandName = nameOverride
      ?? session.analyzeResult?.brandData.name
      ?? 'My Workspace';

    try {
      addMessage(buildSystemUpdate('Creating your workspace...'));
      const client = await createClient.mutateAsync({
        name: brandName,
        slug: slugify(brandName),
        logoUrl: session.analyzeResult?.brandData.logoUrl ?? null,
        industryKey: session.industryKey ?? undefined,
        status: 'DRAFT',
      });
      dispatchSession({ type: 'SET_CREATED_CLIENT', clientId: client.id });

      if (session.analyzeResult) {
        console.log('[confirmBrand] analyzeResult dataItems:', session.analyzeResult.dataItems?.length ?? 0,
          'images:', session.analyzeResult.images?.length ?? 0);

        const merged = mergeDrafts(session.sources);
        await saveProfiles(client.id, session.analyzeResult, merged);
        dispatchSession({ type: 'SET_PROFILES_SAVED' });

        // Collect all unique image URLs from data items + top-level images
        const isValidUrl = (s: string) => {
          try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
          catch { return false; }
        };
        const imageUrls = new Set<string>();
        for (const di of session.analyzeResult.dataItems ?? []) {
          const heroUrl = di.dataJson?.imageUrl as string | undefined;
          if (heroUrl && isValidUrl(heroUrl)) imageUrls.add(heroUrl);
          const gallery = di.dataJson?.images as string[] | undefined;
          if (Array.isArray(gallery)) {
            for (const u of gallery) { if (u && isValidUrl(u)) imageUrls.add(u); }
          }
        }
        for (const img of session.analyzeResult.images ?? []) {
          if (img && isValidUrl(img)) imageUrls.add(img);
        }

        // Upload images to media library and build source→cloudinary URL map
        const urlMap = new Map<string, string>(); // sourceUrl → cloudinaryUrl
        const scrapedAssetIds: string[] = [];
        if (imageUrls.size > 0) {
          const total = imageUrls.size;
          const progressMsg = buildSystemUpdate(`Downloading images: 0/${total}`);
          const progressId = progressMsg.id;
          addMessage(progressMsg);

          let downloaded = 0;
          let failed = 0;
          const urls = Array.from(imageUrls);

          for (let i = 0; i < urls.length; i += 5) {
            const batch = urls.slice(i, i + 5);
            const results = await Promise.allSettled(
              batch.map(async (sourceUrl) => {
                const resp = await fetch(`/api/proxy/workspaces/${client.id}/assets/upload-from-url`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: sourceUrl, onboarding: true }),
                });
                if (!resp.ok) throw new Error(`${resp.status}`);
                const asset = await resp.json();
                return { sourceUrl, cloudinaryUrl: asset.url as string, assetId: asset.id as string };
              }),
            );
            for (const r of results) {
              if (r.status === 'fulfilled') {
                downloaded++;
                urlMap.set(r.value.sourceUrl, r.value.cloudinaryUrl);
                if (r.value.assetId) scrapedAssetIds.push(r.value.assetId);
              } else {
                failed++;
              }
            }
            updateMessage(progressId, `Downloading images: ${downloaded}/${total}`);
          }

          updateMessage(
            progressId,
            failed > 0
              ? `Downloaded ${downloaded} of ${total} images (${failed} failed).`
              : `Downloaded ${downloaded} image${downloaded !== 1 ? 's' : ''}.`,
          );

          // Auto-tag scraped images using AI vision
          if (scrapedAssetIds.length > 0) {
            updateMessage(progressId, 'Analyzing photos...');
            try {
              console.log(`[confirmBrand] auto-tagging ${scrapedAssetIds.length} assets`);
              const tagRes = await fetch(`/api/proxy/workspaces/${client.id}/assets/batch-auto-tag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetIds: scrapedAssetIds }),
              });
              if (!tagRes.ok) {
                console.warn('[confirmBrand] batch-auto-tag failed:', tagRes.status, await tagRes.text().catch(() => ''));
              }
            } catch (e) {
              console.warn('[confirmBrand] batch-auto-tag error:', e);
            }
          }
        }

        // Replace source image URLs with cloudinary URLs in data items
        // Also truncate fields to match schema limits (title ≤ 200, summary ≤ 2000)
        const updatedItems = session.analyzeResult.dataItems.map((di) => {
          const dj = { ...di.dataJson };
          if (typeof dj.imageUrl === 'string' && urlMap.has(dj.imageUrl)) {
            dj.imageUrl = urlMap.get(dj.imageUrl);
          }
          if (Array.isArray(dj.images)) {
            dj.images = (dj.images as string[]).map((u) => urlMap.get(u) ?? u);
          }
          return {
            ...di,
            title: (di.title || 'Untitled').slice(0, 200),
            summary: di.summary ? di.summary.slice(0, 2000) : null,
            dataJson: dj,
          };
        });

        // Save data items (properties) with uploaded image URLs
        if (updatedItems.length > 0) {
          try {
            const sourceType = session.starterMethod === 'description' ? 'TEXT' : 'URL';
            const confirmRes = await fetch(`/api/proxy/workspaces/${client.id}/data-import/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: updatedItems,
                sourceType,
                sourceUrl: session.primaryInput && sourceType === 'URL' ? session.primaryInput : undefined,
              }),
            });
            if (!confirmRes.ok) {
              const errData = await confirmRes.json().catch(() => ({}));
              console.error('[confirmBrand] data-import/confirm failed:', confirmRes.status, errData);
              addMessage(buildSystemUpdate('Warning: failed to save property data.'));
            }
          } catch (err) {
            console.error('[confirmBrand] data-import/confirm error:', err);
          }
        } else {
          console.warn('[confirmBrand] No data items to save');
        }
      }

      // Show property review only for listing intent with data items
      const hasDataItems = (session.analyzeResult?.dataItems?.length ?? 0) > 0;
      const isListingFlow = session.reIntent === 'listing';

      if (hasDataItems && isListingFlow) {
        addMessage(buildInteractivePrompt(
          "Review the listing details.",
          'property_review',
          { clientId: client.id },
        ));
      } else if (session.reIntent === 'business') {
        // Business path: offer optional image upload (skip property review)
        addMessage(buildInteractivePrompt(
          "Add business photos to use in your posts.",
          'listing_photo_offer',
          { clientId: client.id },
        ));
      } else if (isListingFlow && session.starterMethod === 'description') {
        // Listing from description, no data items extracted — offer photo upload
        addMessage(buildInteractivePrompt(
          "Add listing photos to use in your posts.",
          'listing_photo_offer',
          { clientId: client.id },
        ));
      } else {
        // Show enrichment menu if available, otherwise go to campaign
        const config = getOnboardingConfig(session.industryKey);
        const available = getAvailableEnrichments(session, config);
        if (available.length > 0 && !session.enrichmentsSkipped) {
          addMessage(buildInteractivePrompt(
            'Add optional setup to help Squadpitch create better, safer, and more useful campaigns.',
            'enrichment_menu',
            { preGeneration: true },
          ));
          dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
        } else {
          addMessage(buildInteractivePrompt(
            'Your campaign is ready. Review and take action.',
            'campaign_presentation',
          ));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create workspace.';
      dispatchSession({ type: 'SET_ERROR', error: msg });
      addMessage(buildSystemUpdate(msg));
    } finally {
      busyRef.current = false;
    }
  }, [session, addMessage, updateMessage, createClient]);

  // ── Property review confirmation ────────────────────────────────────

  const confirmPropertyReview = useCallback(async (
    selectedIds: string[],
    updates: Map<string, { title?: string; dataJson?: Record<string, unknown> }>,
  ) => {
    if (!session.createdClientId) return;
    const clientId = session.createdClientId;

    console.log(`[confirmPropertyReview] patching ${updates.size} items, selected:`, selectedIds);

    // Patch edited data items
    const entries = Array.from(updates.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, patch] = entries[i];
      try {
        const res = await fetch(`/api/proxy/business-data/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          console.error(`[confirmPropertyReview] PATCH failed for ${id}:`, res.status);
        }
      } catch (err) {
        console.error(`[confirmPropertyReview] PATCH error for ${id}:`, err);
      }
    }

    dispatchSession({ type: 'SET_SELECTED_PROPERTY_IDS', ids: selectedIds });
    dispatchSession({ type: 'SET_PROPERTY_REVIEW_DONE' });

    addMessage(buildConfirmation(`${selectedIds.length} propert${selectedIds.length === 1 ? 'y' : 'ies'} confirmed`));

    // Description-based listing flow: offer photo upload before content preview
    const needsPhotoOffer = session.reListingSource === 'description'
      || (session.reIntent === 'listing' && session.starterMethod === 'description');

    if (needsPhotoOffer) {
      addMessage(buildInteractivePrompt(
        "Add listing photos to use in your posts.",
        'listing_photo_offer',
        { clientId },
      ));
    } else {
      // Show enrichment menu if available, otherwise go to campaign
      const config = getOnboardingConfig(session.industryKey);
      const available = getAvailableEnrichments(session, config);
      if (available.length > 0 && !session.enrichmentsSkipped) {
        addMessage(buildInteractivePrompt(
          'Add optional setup to help Squadpitch create better, safer, and more useful campaigns.',
          'enrichment_menu',
          { preGeneration: true },
        ));
        dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
      } else {
        addMessage(buildInteractivePrompt(
          'Your campaign is ready. Review and take action.',
          'campaign_presentation',
        ));
      }
    }
  }, [session.createdClientId, session.industryKey, session.reListingSource, session.reIntent, session.starterMethod, session.enrichmentsSkipped, session.enrichmentsCompleted, addMessage]);

  const generatePreviews = useCallback(async () => {
    if (busyRef.current || !session.createdClientId) return;
    busyRef.current = true;
    setGenerationError(null);

    try {
      const result = session.analyzeResult;
      const clientId = session.createdClientId;

      // Fetch saved data items from API to get real DB IDs
      let savedDataItems: { id: string; type: string; title: string; dataJson: Record<string, unknown> }[] = [];
      try {
        const diRes = await fetch(`/api/proxy/workspaces/${clientId}/business-data?limit=50`);
        if (diRes.ok) {
          const diData = await diRes.json();
          savedDataItems = diData.dataItems ?? [];
        }
      } catch {
        // Fall back to analyzeResult data items without real IDs
      }

      // Use saved items (with real IDs) if available, fall back to analyzeResult
      let plannerDataItems = savedDataItems.length > 0
        ? savedDataItems.map((d) => ({ id: d.id, dataJson: d.dataJson }))
        : (result?.dataItems ?? []).map((d) => ({
            id: `${d.type}_${d.title}`,
            dataJson: d.dataJson,
          }));

      // Filter by property review selection if user reviewed properties
      if (session.selectedPropertyIds) {
        const selectedSet = new Set(session.selectedPropertyIds);
        plannerDataItems = plannerDataItems.filter((d) => selectedSet.has(d.id));
      }

      // Business intent: don't use listing data items for generation
      // (planner falls through to brand_authority, educational_tip, etc.)
      if (session.reIntent === 'business') {
        plannerDataItems = [];
      }

      // Fetch uploaded media assets (with IDs + tags) for linking to drafts
      type TaggedAsset = { id: string; url: string; tags: string[] };
      let mediaAssets: TaggedAsset[] = [];
      try {
        const assetsRes = await fetch(`/api/proxy/workspaces/${clientId}/assets?limit=100&status=READY&assetType=image`);
        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          mediaAssets = (assetsData.assets ?? [])
            .filter((a: TaggedAsset) => a.id && a.url)
            .map((a: TaggedAsset) => ({ id: a.id, url: a.url, tags: a.tags ?? [] }));
        }
      } catch { /* non-critical */ }

      // Fallback: if any assets are untagged, auto-tag them now before generating
      const untaggedIds = mediaAssets.filter((a) => a.tags.length === 0).map((a) => a.id);
      if (untaggedIds.length > 0) {
        console.log(`[generatePreviews] ${untaggedIds.length} untagged assets — running auto-tag`);
        try {
          const tagRes = await fetch(`/api/proxy/workspaces/${clientId}/assets/batch-auto-tag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetIds: untaggedIds }),
          });
          if (tagRes.ok) {
            const { results } = await tagRes.json() as { results: { assetId: string; tags: string[] }[] };
            const tagMap = new Map(results.map((r) => [r.assetId, r.tags ?? []]));
            mediaAssets = mediaAssets.map((a) => tagMap.has(a.id) ? { ...a, tags: tagMap.get(a.id)! } : a);
          } else {
            console.warn('[generatePreviews] batch-auto-tag failed:', tagRes.status);
          }
        } catch (e) {
          console.warn('[generatePreviews] batch-auto-tag error:', e);
        }
      }

      // Identify scraped assets (URL-matched to data item imageUrl/images fields)
      const urlToAsset = new Map(mediaAssets.map(a => [a.url, a]));
      const scrapedAssetIdSet = new Set<string>();
      const allDataSource = savedDataItems.length > 0 ? savedDataItems : plannerDataItems;
      for (const di of allDataSource) {
        const hero = di.dataJson?.imageUrl as string;
        if (hero) { const a = urlToAsset.get(hero); if (a) scrapedAssetIdSet.add(a.id); }
        const gallery = di.dataJson?.images as string[];
        if (Array.isArray(gallery)) {
          for (const url of gallery) { const a = urlToAsset.get(url); if (a) scrapedAssetIdSet.add(a.id); }
        }
      }

      // Split assets into scraped (from URL crawl) vs user-uploaded (from photo offer)
      const userUploadedAssets = mediaAssets.filter((a) => !scrapedAssetIdSet.has(a.id));

      // Determine which assets to use based on photo offer result:
      // - 'uploaded': user uploaded images → use only those
      // - 'skipped': user skipped → no images (they chose not to add any)
      // - null: photo offer not shown (URL flow) → use all assets with URL matching
      const photoResult = session.photoOfferResult;
      const effectiveAssets = photoResult === 'uploaded'
        ? userUploadedAssets
        : photoResult === 'skipped'
          ? [] // User explicitly skipped — no images
          : mediaAssets; // URL flow: use all

      // Map each data item → its own images
      const itemAssetMap = new Map<string, TaggedAsset[]>();
      if (photoResult === null) {
        // URL flow: match by data item image URLs (existing behavior)
        for (const di of allDataSource) {
          const assets: TaggedAsset[] = [];
          const seen = new Set<string>();
          const hero = di.dataJson?.imageUrl as string;
          if (hero) { const a = urlToAsset.get(hero); if (a && !seen.has(a.id)) { assets.push(a); seen.add(a.id); } }
          const gallery = di.dataJson?.images as string[];
          if (Array.isArray(gallery)) {
            for (const url of gallery) { const a = urlToAsset.get(url); if (a && !seen.has(a.id)) { assets.push(a); seen.add(a.id); } }
          }
          itemAssetMap.set(di.id, assets);
        }
        // Fallback: distribute unlinked assets to items with no URL matches
        const usedIds = new Set<string>();
        itemAssetMap.forEach((a) => a.forEach((x) => usedIds.add(x.id)));
        const unlinked = mediaAssets.filter((a) => !usedIds.has(a.id));
        if (unlinked.length > 0) {
          for (const di of plannerDataItems) {
            if ((itemAssetMap.get(di.id) ?? []).length === 0) {
              itemAssetMap.set(di.id, unlinked);
            }
          }
        }
      } else if (photoResult === 'uploaded' && userUploadedAssets.length > 0) {
        // Photo offer: distribute user-uploaded images to all data items
        for (const di of plannerDataItems) {
          itemAssetMap.set(di.id, userUploadedAssets);
        }
      }

      // ── Tag constants for per-item classification ─────────────────────
      const EXTERIOR_TAGS = new Set(['exterior', 'aerial', 'neighborhood']);
      const INTERIOR_TAGS: Record<string, Set<string>> = {
        kitchen: new Set(['kitchen']),
        bathroom: new Set(['bathroom']),
        bedroom: new Set(['bedroom']),
        living: new Set(['living_room']),
        dining: new Set(['dining_room']),
        backyard: new Set(['backyard', 'pool', 'garden']),
        garage: new Set(['garage']),
        office: new Set(['office']),
      };

      /** Classify a list of assets into exterior/interior/untagged buckets. */
      const classifyAssets = (assets: TaggedAsset[]) => {
        const exterior: TaggedAsset[] = [];
        const interior: TaggedAsset[] = [];
        const untagged: TaggedAsset[] = [];
        for (const a of assets) {
          if (a.tags.length === 0) untagged.push(a);
          else if (a.tags.some((t) => EXTERIOR_TAGS.has(t))) exterior.push(a);
          else interior.push(a);
        }
        // If nothing tagged, treat first as exterior
        const hasTags = assets.some((a) => a.tags.length > 0);
        if (!hasTags && assets.length > 0) {
          exterior.push(assets[0]);
          interior.push(...assets.slice(1));
          untagged.length = 0;
        }
        return { exterior, interior, untagged, hasTags };
      }

      console.log('[generatePreviews] mediaAssets:', mediaAssets.length,
        'dataItems:', plannerDataItems.length,
        'itemAssetMap entries:', itemAssetMap.size);

      // ── Organize images: create folders, move assets, link to data items ──
      for (const di of savedDataItems) {
        const assets = itemAssetMap.get(di.id);
        if (!assets || assets.length === 0) continue;

        // Build folder name from property title or address
        const dj = di.dataJson ?? {};
        const street = (dj.street ?? dj.address ?? di.title ?? '') as string;
        const city = (dj.city ?? '') as string;
        const folderName = city
          ? `Property — ${street}, ${city}`.slice(0, 100)
          : `Property — ${street}`.slice(0, 100);

        // Create folder and move assets into it
        let folderId: string | null = null;
        try {
          const folderRes = await fetch(`/api/proxy/workspaces/${clientId}/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: folderName }),
          });
          if (folderRes.ok) {
            const folder = await folderRes.json();
            folderId = folder.id;
          } else if (folderRes.status === 409) {
            // Folder already exists — fetch existing folders to find ID
            const listRes = await fetch(`/api/proxy/workspaces/${clientId}/folders`);
            if (listRes.ok) {
              const { folders } = await listRes.json();
              const existing = (folders as { id: string; name: string }[]).find((f) => f.name === folderName);
              if (existing) folderId = existing.id;
            }
          }
        } catch { /* non-critical */ }

        // Move assets into the folder
        if (folderId) {
          await Promise.allSettled(
            assets.map((a) =>
              fetch(`/api/proxy/assets/${a.id}/folder`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderId }),
              })
            ),
          );
        }

        // Update data item with image URLs so property library shows them
        const existingImages = (dj.images as string[]) ?? [];
        const assetUrls = assets.map((a) => a.url);
        const mergedImages = Array.from(new Set([...existingImages, ...assetUrls]));

        // Pick best hero: first exterior-tagged image, or first image
        const heroAsset = assets.find((a) => a.tags.some((t) => EXTERIOR_TAGS.has(t))) ?? assets[0];
        const heroUrl = heroAsset?.url ?? (dj.imageUrl as string) ?? mergedImages[0];

        if (mergedImages.length > existingImages.length || !dj.imageUrl) {
          try {
            await fetch(`/api/proxy/business-data/${di.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dataJson: { ...dj, images: mergedImages, imageUrl: heroUrl },
              }),
            });
          } catch { /* non-critical */ }
        }
      }

      // Prefer actually connected channels over suggested ones
      const channelsForPlan: Channel[] = session.connectedChannelsSnapshot.length > 0
        ? session.connectedChannelsSnapshot
        : (result?.suggestedChannels ?? ['INSTAGRAM']) as Channel[];

      const plan = buildOnboardingGenerationPlan({
        coreTemplates: result?.coreTemplates ?? [],
        starterAngles: result?.starterAngles ?? [],
        dataItems: plannerDataItems,
        connectedChannels: channelsForPlan,
        suggestedChannels: (result?.suggestedChannels ?? ['INSTAGRAM']) as Channel[],
        hasMedia: mediaAssets.length > 0,
        industryKey: session.industryKey ?? 'general',
        brandContext: result?.brandData.description ?? session.contentPrompt ?? session.primaryInput ?? '',
      });

      // Distribute data items across slots:
      // 3+ items → one each | 2 items → [A, A, B] | 1 item → [A, A, A]
      const itemCount = plannerDataItems.length;
      const slotItems: (typeof plannerDataItems[0] | null)[] =
        itemCount >= 3 ? [plannerDataItems[0], plannerDataItems[1], plannerDataItems[2]]
        : itemCount === 2 ? [plannerDataItems[0], plannerDataItems[0], plannerDataItems[1]]
        : itemCount === 1 ? [plannerDataItems[0], plannerDataItems[0], plannerDataItems[0]]
        : [null, null, null];

      for (let s = 0; s < plan.length && s < slotItems.length; s++) {
        if (slotItems[s]) plan[s].dataItemId = slotItems[s]!.id;
      }

      setGenerationProgress({ current: 0, total: plan.length });

      const drafts: Draft[] = [];
      for (let i = 0; i < plan.length; i++) {
        const slot = plan[i];
        try {
          const draft = await generateContent.mutateAsync({
            clientId,
            kind: 'POST',
            channel: slot.channel ?? 'INSTAGRAM',
            guidance: slot.guidance,
            templateType: slot.templateType,
            dataItemId: slot.dataItemId ?? undefined,
          });

          // ── Per-item image selection ─────────────────────────────────
          const slotItem = slotItems[i] ?? null;
          const itemImages = slotItem ? (itemAssetMap.get(slotItem.id) ?? []) : effectiveAssets;

          // Classify THIS item's images (not global) so each property gets its own photos
          const itemClassified = classifyAssets(itemImages);

          const FEATURE_TEMPLATE_TYPES = new Set([
            'kitchen_feature', 'bathroom_feature', 'interior_highlight',
            'pool_feature', 'backyard_feature', 'room_feature',
          ]);
          const isFeatureFocused = FEATURE_TEMPLATE_TYPES.has(slot.templateType);

          let primaryAsset: TaggedAsset | null = null;
          let remainingAssets: TaggedAsset[] = [];

          if (itemClassified.hasTags) {
            if (isFeatureFocused) {
              const featureMatch = slot.guidance.toLowerCase();
              let matchedInterior: TaggedAsset | null = null;
              for (const [keyword, tagSet] of Object.entries(INTERIOR_TAGS)) {
                if (featureMatch.includes(keyword)) {
                  matchedInterior = itemClassified.interior.find((a) =>
                    a.tags.some((t) => tagSet.has(t))
                  ) ?? null;
                  if (matchedInterior) break;
                }
              }
              primaryAsset = matchedInterior ?? itemClassified.interior[0] ?? null;
            }

            if (!primaryAsset) {
              // Default: exterior image from THIS item, rotating across posts
              const ext = itemClassified.exterior;
              primaryAsset = ext.length > 0
                ? ext[i % ext.length]
                : itemImages[i % Math.max(itemImages.length, 1)] ?? null;
            }

            // Remaining = other images from THIS item, rotated for variety
            const otherImages = itemImages.filter((a) => a.id !== primaryAsset?.id);
            const rotateBy = otherImages.length > 0 ? (i % otherImages.length) : 0;
            remainingAssets = [...otherImages.slice(rotateBy), ...otherImages.slice(0, rotateBy)];
          } else {
            // No tags: rotate through images per slot
            primaryAsset = itemImages.length > 0
              ? itemImages[i % itemImages.length]
              : null;
            const others = itemImages.filter((a) => a.id !== primaryAsset?.id);
            const rotateBy = others.length > 0 ? (i % others.length) : 0;
            remainingAssets = [...others.slice(rotateBy), ...others.slice(0, rotateBy)];
          }

          const assetsToLink = [
            ...(primaryAsset ? [primaryAsset] : []),
            ...remainingAssets,
          ].slice(0, 5);
          const primaryImage = assetsToLink[0]?.url;
          console.log(`[generatePreviews] slot ${i}: ${assetsToLink.length} assets, primary=${primaryAsset?.tags}, feature=${isFeatureFocused}`);

          // Set exterior/hero as primary mediaUrl
          if (primaryImage && draft.mediaUrl !== primaryImage) {
            try {
              const patchRes = await fetch(`/api/proxy/drafts/${draft.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mediaUrl: primaryImage }),
              });
              if (patchRes.ok) {
                draft.mediaUrl = primaryImage;
                draft.mediaType = 'image';
              }
            } catch { /* non-critical */ }
          }

          // Link all selected assets to draft (multi-image carousel)
          for (let ai = 0; ai < assetsToLink.length; ai++) {
            try {
              await fetch(`/api/proxy/assets/${assetsToLink[ai].id}/link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  draftId: draft.id,
                  ...(ai === 0 ? { role: 'primary' } : {}),
                  orderIndex: ai,
                }),
              });
            } catch { /* non-critical */ }
          }
          console.log(`[generatePreviews] slot ${i}: linked ${assetsToLink.length} assets`);

          drafts.push(draft);
          dispatchSession({ type: 'ADD_PREVIEW_DRAFT', draft });
          setGenerationProgress({ current: drafts.length, total: plan.length });
        } catch (slotErr) {
          const errMsg = slotErr instanceof Error ? slotErr.message : '';
          const isUsageLimit = errMsg.includes('generation limit') || errMsg.includes('USAGE_LIMIT');
          if (isUsageLimit) {
            // Stop trying — all subsequent calls will also fail
            setGenerationError('You\u2019ve reached your monthly post limit. Upgrade your plan to continue.');
            break;
          }
          // Skip failed individual generations
          setGenerationProgress((prev) => prev ? { ...prev, total: prev.total - 1 } : null);
        }
      }

      if (drafts.length > 0) {
        // Campaign card is already showing — just update the phase
        dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
      }
      // If 0 drafts, stay on campaign presentation — it shows the failure UI
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate previews.';
      addMessage(buildSystemUpdate(msg));
    } finally {
      setGenerationProgress(null);
      busyRef.current = false;
    }
  }, [session, addMessage, generateContent]);

  const handleEnrichment = useCallback((cardType: string, key: string) => {
    const config = getOnboardingConfig(session.industryKey);
    const enrichmentDef = config.enrichmentCards.find((c) => c.key === key);
    const payload = { ...enrichmentDef?.payload, fromEnrichment: true };
    addMessage(buildInteractivePrompt(
      `Let's add your ${key.replace(/_/g, ' ')}.`,
      cardType as any,
      payload,
    ));
  }, [session.industryKey, addMessage]);

  const markEnrichmentDone = useCallback(async (key: string) => {
    dispatchSession({ type: 'MARK_ENRICHMENT_COMPLETED', key });
    addMessage(buildConfirmation(`${key.replace(/_/g, ' ')} added`));

    // Record a source entry for provenance
    const sourceTypeMap: Record<string, SourceEntry['sourceType']> = {
      zillow: 'zillow',
      license: 'license',
      crm: 'crm',
      additional_urls: 'website',
      documents: 'documents',
      add_description: 'description',
      add_photos: 'photos',
    };
    dispatchSession({
      type: 'ADD_SOURCE_ENTRY',
      entry: {
        id: `src_${Date.now()}`,
        sourceType: sourceTypeMap[key] ?? 'description',
        label: key.replace(/_/g, ' '),
        status: 'analyzed',
        timestamp: Date.now(),
      },
    });

    // Re-merge sources if workspace already exists
    if (session.createdClientId && session.analyzeResult) {
      try {
        const merged = mergeDrafts(session.sources);
        await saveProfiles(session.createdClientId, session.analyzeResult, merged);
      } catch {
        // Non-critical
      }
    }

    const isPreGeneration = session.previewDrafts.length === 0;
    const config = getOnboardingConfig(session.industryKey);
    const remaining = config.enrichmentCards.filter(
      (c) =>
        c.hideIfStarterMethod !== session.starterMethod &&
        !session.enrichmentsCompleted.includes(c.key) &&
        c.key !== key,
    );

    if (remaining.length > 0) {
      addMessage(buildInteractivePrompt(
        'Anything else you\'d like to add?',
        'enrichment_menu',
        isPreGeneration ? { preGeneration: true } : undefined,
      ));
    } else if (isPreGeneration) {
      addMessage(buildInteractivePrompt(
        'Your campaign is ready. Review and take action.',
        'campaign_presentation',
      ));
    } else {
      addMessage(buildCompletionPrompt());
      dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
    }
  }, [session, addMessage]);

  const replacePreviewDraft = useCallback((oldId: string, newDraft: Draft) => {
    dispatchSession({ type: 'REPLACE_PREVIEW_DRAFT', oldId, draft: newDraft });
  }, []);

  const addSource = useCallback((source: AgentProfileDraft) => {
    dispatchSession({ type: 'ADD_SOURCE', source });
  }, []);

  // ── Enrichment review (stage → accept/reject) ──────────────────────

  const returnToEnrichmentMenu = useCallback(() => {
    const config = getOnboardingConfig(session.industryKey);
    const remaining = config.enrichmentCards.filter(
      (c) =>
        c.hideIfStarterMethod !== session.starterMethod &&
        !session.enrichmentsCompleted.includes(c.key),
    );
    const isPreGeneration = session.previewDrafts.length === 0;
    if (remaining.length > 0) {
      addMessage(buildInteractivePrompt(
        'Anything else you\'d like to add?',
        'enrichment_menu',
        isPreGeneration ? { preGeneration: true } : undefined,
      ));
      dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
    } else if (isPreGeneration) {
      addMessage(buildInteractivePrompt(
        'Your campaign is ready. Review and take action.',
        'campaign_presentation',
      ));
    } else {
      addMessage(buildCompletionPrompt());
      dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
    }
  }, [session.industryKey, session.starterMethod, session.enrichmentsCompleted, session.previewDrafts.length, addMessage]);

  const stageEnrichmentFromCard = useCallback((
    type: PendingEnrichment['type'],
    key: string,
    source: AgentProfileDraft,
    extra?: { importedCount: number; csvItems: Array<{ type: string; title: string; summary?: string; dataJson?: Record<string, unknown> }> },
  ) => {
    let pending: PendingEnrichment;
    if (type === 'license') {
      pending = { type: 'license', key, source };
    } else if (type === 'crm') {
      pending = {
        type: 'crm',
        key,
        source,
        importedCount: extra?.importedCount ?? 0,
        csvItems: extra?.csvItems ?? [],
      };
    } else {
      // urls/description — shouldn't be called from cards directly
      return;
    }
    dispatchSession({ type: 'SET_PENDING_ENRICHMENT', pending });
    addMessage(buildInteractivePrompt(
      'Review the extracted data.',
      'enrichment_review',
    ));
  }, [addMessage]);

  const acceptEnrichment = useCallback(async () => {
    const pending = session.pendingEnrichment;
    if (!pending) return;

    if (pending.type === 'license') {
      dispatchSession({ type: 'ADD_SOURCE', source: pending.source });
      dispatchSession({ type: 'MARK_ENRICHMENT_COMPLETED', key: pending.key });
      addMessage(buildConfirmation('License data accepted'));

      // Re-merge sources if workspace exists
      if (session.createdClientId && session.analyzeResult) {
        try {
          const merged = mergeDrafts([...session.sources, pending.source]);
          await saveProfiles(session.createdClientId, session.analyzeResult, merged);
        } catch { /* Non-critical */ }
      }

      // Record source entry
      dispatchSession({
        type: 'ADD_SOURCE_ENTRY',
        entry: {
          id: `src_${Date.now()}`,
          sourceType: 'license',
          label: 'license',
          status: 'analyzed',
          timestamp: Date.now(),
        },
      });
    } else if (pending.type === 'crm') {
      dispatchSession({ type: 'ADD_SOURCE', source: pending.source });

      // Now confirm import — save CSV items to database
      if (session.createdClientId && pending.csvItems.length > 0) {
        try {
          await fetch(`/api/proxy/workspaces/${session.createdClientId}/data-import/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: pending.csvItems,
              sourceType: 'CSV',
            }),
          });
        } catch { /* Non-critical */ }
      }

      // Re-merge sources
      if (session.createdClientId && session.analyzeResult) {
        try {
          const merged = mergeDrafts([...session.sources, pending.source]);
          await saveProfiles(session.createdClientId, session.analyzeResult, merged);
        } catch { /* Non-critical */ }
      }

      dispatchSession({ type: 'MARK_ENRICHMENT_COMPLETED', key: pending.key });
      addMessage(buildConfirmation(`CRM data accepted — ${pending.importedCount} listing${pending.importedCount !== 1 ? 's' : ''} imported`));

      dispatchSession({
        type: 'ADD_SOURCE_ENTRY',
        entry: {
          id: `src_${Date.now()}`,
          sourceType: 'crm',
          label: 'crm',
          status: 'analyzed',
          timestamp: Date.now(),
        },
      });
    } else if (pending.type === 'urls' || pending.type === 'description') {
      // Save profiles + data items
      if (session.createdClientId) {
        try {
          const merged = mergeDrafts([...session.sources]);
          await saveProfiles(session.createdClientId, pending.analyzeResult, merged);

          if (pending.analyzeResult.dataItems.length > 0) {
            const importSourceType = pending.inputType === 'text' ? 'TEXT' : 'URL';
            await fetch(`/api/proxy/workspaces/${session.createdClientId}/data-import/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: pending.analyzeResult.dataItems,
                sourceType: importSourceType,
                sourceUrl: pending.normalizedInput && importSourceType === 'URL' ? pending.normalizedInput : undefined,
              }),
            }).catch(() => {});
          }
        } catch { /* Non-critical */ }
      }

      dispatchSession({ type: 'SET_ANALYZE_RESULT', result: pending.analyzeResult });
      dispatchSession({ type: 'MARK_ENRICHMENT_COMPLETED', key: pending.key });
      addMessage(buildConfirmation('New source accepted & saved'));

      dispatchSession({
        type: 'ADD_SOURCE_ENTRY',
        entry: {
          id: `src_${Date.now()}`,
          sourceType: pending.inputType === 'url' ? 'website' : 'description',
          label: pending.key.replace(/_/g, ' '),
          status: 'analyzed',
          timestamp: Date.now(),
        },
      });
    }

    dispatchSession({ type: 'CLEAR_PENDING_ENRICHMENT' });
    returnToEnrichmentMenu();
  }, [session, addMessage, returnToEnrichmentMenu]);

  const rejectEnrichment = useCallback(() => {
    dispatchSession({ type: 'CLEAR_PENDING_ENRICHMENT' });
    addMessage(buildConfirmation('Discarded'));
    returnToEnrichmentMenu();
  }, [addMessage, returnToEnrichmentMenu]);

  const skipEnrichment = useCallback(() => {
    dispatchSession({ type: 'MARK_ENRICHMENT_SKIPPED' });
    addMessage(buildConfirmation('Skipped'));
    // If pre-generation (no drafts yet), proceed to campaign; otherwise completion
    if (session.previewDrafts.length === 0) {
      addMessage(buildInteractivePrompt(
        'Your campaign is ready. Review and take action.',
        'campaign_presentation',
      ));
    } else {
      addMessage(buildCompletionPrompt());
    }
  }, [session.previewDrafts.length, addMessage]);

  const continueToGeneration = useCallback(() => {
    addMessage(buildInteractivePrompt(
      'Your campaign is ready. Review and take action.',
      'campaign_presentation',
    ));
  }, [addMessage]);

  const updateChannelsSnapshot = useCallback((channels: Channel[]) => {
    dispatchSession({ type: 'UPDATE_CHANNELS_SNAPSHOT', channels });
  }, []);

  // Campaign presentation actions
  const approveCampaign = useCallback(async () => {
    if (!session.createdClientId) return;
    // Approve all preview drafts
    for (const draft of session.previewDrafts) {
      try {
        await fetch(`/api/proxy/drafts/${draft.id}/approve`, { method: 'POST' });
      } catch { /* non-critical */ }
    }
    addMessage(buildConfirmation(`${session.previewDrafts.length} post${session.previewDrafts.length > 1 ? 's' : ''} approved`));
    addMessage(buildCompletionPrompt());
  }, [session.createdClientId, session.previewDrafts, addMessage]);

  const saveCampaignAsDrafts = useCallback(() => {
    addMessage(buildConfirmation('Posts saved as drafts'));
    addMessage(buildCompletionPrompt());
  }, [addMessage]);

  const connectChannelsFromCampaign = useCallback(() => {
    dispatchConversation({ type: 'RESOLVE_ACTIVE' });
    addMessage(buildInteractivePrompt(
      'Connect your publishing channels.',
      'channel_connect',
      { fromCampaign: true },
    ));
  }, [addMessage]);

  const returnToCampaignFromChannelConnect = useCallback((connectedChannels: Channel[]) => {
    // Update channel snapshot without marking channel connect step as "done"
    // so we don't advance past the campaign screen
    dispatchSession({ type: 'UPDATE_CHANNELS_SNAPSHOT', channels: connectedChannels });
    dispatchConversation({ type: 'RESOLVE_ACTIVE' });
    addMessage(buildConfirmation(
      connectedChannels.length > 0
        ? `${connectedChannels.length} channel${connectedChannels.length > 1 ? 's' : ''} connected. Returning to your campaign.`
        : 'No channels connected',
    ));
    // Return to campaign presentation
    addMessage(buildInteractivePrompt(
      'Here\'s your campaign.',
      'campaign_presentation',
    ));
  }, [addMessage]);

  const finish = useCallback(async () => {
    if (session.createdClientId) {
      // Activate the workspace (created as DRAFT during onboarding)
      try {
        await fetch(`/api/proxy/workspaces/${session.createdClientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
      } catch {
        // Non-critical — workspace still usable
      }

      // Persist source entries for the post-onboarding welcome panel
      if (session.sourceEntries.length > 0) {
        try {
          localStorage.setItem(
            `sp_onboarding_sources_${session.createdClientId}`,
            JSON.stringify(session.sourceEntries),
          );
        } catch {
          // Non-critical
        }
      }
      queryClient.invalidateQueries({ queryKey: squadpitchKeys.clients() });
      trackActivationEvent('onboarding_completed', {
        clientId: session.createdClientId!,
        industry: session.industryKey,
        connectedChannelCount: session.connectedChannelsSnapshot.length,
        postsReadyCount: session.previewDrafts.length,
      });
      router.push(`/workspaces/${session.createdClientId}/getting-started`);
    }
  }, [session.createdClientId, session.sourceEntries, router, queryClient]);

  const reset = useCallback(() => {
    dispatchSession({ type: 'RESET' });
    dispatchConversation({ type: 'CLEAR' });
  }, []);

  // Initialize with welcome message on first render
  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    initializedRef.current = true;
    dispatchConversation({
      type: 'ADD_MESSAGE',
      message: buildAssistantText(
        "Let's set up your workspace and generate ready-to-post content.",
      ),
    });
    dispatchConversation({
      type: 'ADD_MESSAGE',
      message: buildInteractivePrompt(
        'Paste a link or describe your business to get started.',
        'quick_start_input',
      ),
    });
  }

  const submitFiles = useCallback(async (files: File[], onProgress?: (p: { uploaded: number; total: number; currentName: string }) => void) => {
    if (files.length === 0) return;

    const clientId = session.createdClientId;

    // Pre-workspace: documents as starter input — upload to backend for parsing, then analyse
    if (!clientId) {
      onProgress?.({ uploaded: 0, total: files.length, currentName: files[0].name });

      // Upload files to backend document parser (handles PDF, DOCX, TXT, CSV)
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      try {
        const res = await fetch('/api/proxy/onboarding/upload-documents', {
          method: 'POST',
          body: formData,
        });

        onProgress?.({ uploaded: files.length, total: files.length, currentName: '' });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: { message: 'Upload failed' } }));
          addMessage(buildSystemUpdate(err.error?.message ?? 'Failed to process documents. Please try again.'));
          return;
        }

        const { documents } = await res.json() as { documents: { text: string; filename: string }[] };
        const docTexts = documents.filter((d) => d.text.trim()).map((d) => d.text.trim());

        if (docTexts.length === 0) {
          addMessage(buildSystemUpdate('No text could be extracted from the uploaded files. Try a different file or paste the content directly.'));
          return;
        }

        const fileNames = files.map((f) => f.name).join(', ');
        // Pass short summary as input (max 5000 chars on backend), full text via documentTexts
        const summary = docTexts.join('\n\n').slice(0, 4000);
        submitInput(summary, { displayLabel: `Uploaded: ${fileNames}`, documentTexts: docTexts });
      } catch {
        onProgress?.({ uploaded: files.length, total: files.length, currentName: '' });
        addMessage(buildSystemUpdate('Failed to upload documents. Please check your connection and try again.'));
      }
      return;
    }

    // Post-workspace: upload assets to workspace (enrichment phase)
    addMessage(buildUserText(`${files.length} photo${files.length > 1 ? 's' : ''} selected`));

    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.({ uploaded, total: files.length, currentName: file.name });
      try {
        const params = new URLSearchParams();
        params.set('filename', file.name);
        params.set('onboarding', 'true');
        const res = await fetch(
          `/api/proxy/workspaces/${clientId}/assets/upload?${params}`,
          {
            method: 'POST',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
          },
        );
        if (res.ok) uploaded++;
      } catch {
        // Skip individual failures
      }
    }
    onProgress?.({ uploaded, total: files.length, currentName: '' });

    if (uploaded > 0) {
      // Determine enrichment key from file types
      const isPhotos = files.some((f) => f.type.startsWith('image/'));
      const enrichKey = isPhotos ? 'add_photos' : 'documents';
      const label = isPhotos ? 'photo' : 'file';
      addMessage(buildConfirmation(`${uploaded} ${label}${uploaded > 1 ? 's' : ''} uploaded`));
      markEnrichmentDone(enrichKey);
    } else {
      addMessage(buildSystemUpdate('Failed to upload files. Please try again.'));
    }
  }, [session.createdClientId, addMessage, markEnrichmentDone, submitInput]);

  // ── Recovery actions ──────────────────────────────────────────────

  const retryAnalysis = useCallback(() => {
    if (!session.primaryInput) return;
    // Resolve the current error card and re-submit the same input
    dispatchConversation({ type: 'RESOLVE_ACTIVE' });
    submitInput(session.primaryInput);
  }, [session.primaryInput, submitInput]);

  const fallbackToText = useCallback(() => {
    // Resolve the current error card and show a text input
    dispatchConversation({ type: 'RESOLVE_ACTIVE' });
    dispatchSession({ type: 'SET_PHASE', phase: 'quick_start' });
    addMessage(buildInteractivePrompt(
      "No problem! Paste a description of your business instead — what you do, who you serve, and what makes you unique.",
      'source_input',
      { inputMode: 'textarea', placeholder: 'Tell me about your business...' },
    ));
  }, [addMessage]);

  // ── Quick Start ──────────────────────────────────────────────────

  const handleQuickStartInput = useCallback((input: string, classification: QuickStartClassification) => {
    if (busyRef.current) return;

    // Resolve the quick_start_input card
    dispatchConversation({ type: 'RESOLVE_ACTIVE' });

    if (classification.type === 'listing_url') {
      // Real estate listing URL
      dispatchSession({ type: 'SET_INDUSTRY', industryKey: 'real_estate' });
      dispatchSession({ type: 'SET_RE_INTENT', intent: 'listing' });
      dispatchSession({ type: 'SET_RE_LISTING_SOURCE', method: 'single_listing_url' });
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'website' });
      addMessage(buildConfirmation("I'll extract listing details, find images, and build your first campaign."));
      submitInput(classification.url, {
        industryKeyOverride: 'real_estate',
        reListingSourceOverride: 'single_listing_url',
        reIntentOverride: 'listing',
      });
    } else if (classification.type === 'feed_url') {
      // Real estate feed/search URL
      dispatchSession({ type: 'SET_INDUSTRY', industryKey: 'real_estate' });
      dispatchSession({ type: 'SET_RE_INTENT', intent: 'listing' });
      dispatchSession({ type: 'SET_RE_LISTING_SOURCE', method: 'listing_feed_url' });
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'website' });
      addMessage(buildConfirmation("I'll analyze your listings, extract details, and build your campaign."));
      submitInput(classification.url, {
        industryKeyOverride: 'real_estate',
        reListingSourceOverride: 'listing_feed_url',
        reIntentOverride: 'listing',
      });
    } else if (classification.type === 'website_url') {
      // Generic business website — use fallback flow
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'website' });
      addMessage(buildConfirmation("I'll analyze your website and build your first campaign."));
      submitInput(classification.url);
    } else {
      // Plain text description — use fallback flow
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'description' });
      addMessage(buildConfirmation('Description received'));
      submitInput(classification.text);
    }
  }, [addMessage, submitInput]);

  const quickStartFallbackToIndustry = useCallback(() => {
    dispatchConversation({ type: 'RESOLVE_ACTIVE' });
    addMessage(buildInteractivePrompt(
      'What industry are you in?',
      'industry_select',
    ));
  }, [addMessage]);

  const chooseAlternateMethod = useCallback((method: string) => {
    dispatchConversation({ type: 'RESOLVE_ACTIVE' });
    if (method === 'description') {
      dispatchSession({ type: 'SET_RE_LISTING_SOURCE', method: 'description' as REListingSourceMethod });
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'description' });
      addMessage(buildInteractivePrompt(
        "Paste the listing description and I'll work with it.",
        'source_input',
        { inputMode: 'textarea', placeholder: 'Paste listing text from your MLS or website...' },
      ));
    } else if (method === 'manual_form') {
      dispatchSession({ type: 'SET_RE_LISTING_SOURCE', method: 'manual_form' as REListingSourceMethod });
      addMessage(buildInteractivePrompt(
        "Enter your listing details below.",
        're_listing_form',
      ));
    } else if (method === 'link' || method === 'single_listing_url' || method === 'listing_feed_url') {
      // Let them try a different link
      dispatchSession({ type: 'SET_PHASE', phase: 'quick_start' });
      addMessage(buildInteractivePrompt(
        "Paste a different listing link — some sites block automated access, so try another source if possible.",
        'source_input',
        { inputMode: 'url', placeholder: 'https://...' },
      ));
    }
  }, [addMessage]);

  return {
    session,
    conversation,
    analysisProgress: analysisProgressRef,

    // Quick start
    handleQuickStartInput,
    quickStartFallbackToIndustry,

    // Standard actions
    selectIndustry,
    selectStarter,
    submitInput,
    submitFiles,
    retryAnalysis,
    fallbackToText,
    chooseAlternateMethod,
    confirmBrand,
    confirmPropertyReview,
    generatePreviews,
    replacePreviewDraft,
    handleEnrichment,
    markEnrichmentDone,
    addSource,
    stageEnrichmentFromCard,
    acceptEnrichment,
    rejectEnrichment,
    skipEnrichment,
    continueToGeneration,
    updateChannelsSnapshot,
    finish,
    reset,

    // Campaign presentation actions
    approveCampaign,
    saveCampaignAsDrafts,
    connectChannelsFromCampaign,
    returnToCampaignFromChannelConnect,

    // Fallback-specific actions
    selectFallbackIntent,
    selectFallbackSource,
    submitContentPrompt,
    saveProfileRefinement,
    skipProfileRefinement,

    // Real estate–specific actions
    selectREIntent,
    selectREListingSource,
    selectREContentGoal,
    submitListingForm,
    uploadListingPhotos,
    skipListingPhotos,
    completeChannelConnect,
    skipChannelConnect,
    saveREAgentProfile,
    skipREAgentProfile,

    // Loading states
    isAnalyzing: busyRef.current && session.phase === 'analysis',
    isCreating: createClient.isPending,
    isGenerating: generationProgress !== null,
    generationProgress,
    generationError,
  };
}
