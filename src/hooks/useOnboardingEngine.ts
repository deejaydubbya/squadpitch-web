'use client';

import { useReducer, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateClient,
  useGenerateContent,
  squadpitchKeys,
  type Draft,
  type AgentProfileDraft,
  type OnboardingAnalyzeResult,
} from '@/hooks/useSquadpitch';
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
} from '@/lib/onboarding/types';
import type { REListingFormData } from '@/lib/onboarding/configs/realEstate';
import { resolveNextStep } from '@/lib/onboarding/engine';
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
} from '@/lib/onboarding/helpers';
import { buildOnboardingGenerationPlan } from '@/lib/assistant/onboardingPlanner';
import { FALLBACK_SOURCE_PROMPT } from '@/lib/onboarding/configs/fallback';

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
    stage: 'crawling',
    crawledPages: [],
    crawlDone: false,
    brandData: null,
    dataItems: [],
    dataCount: 0,
    errorMessage: null,
  });

  const busyRef = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────────

  const addMessage = useCallback((msg: OnboardingChatMessage) => {
    dispatchConversation({ type: 'ADD_MESSAGE', message: msg });
  }, []);

  const advanceToNextStep = useCallback(() => {
    const step = resolveNextStep(session);
    addMessage(buildInteractivePrompt(step.message, step.cardType));
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
        });
        dispatchSession({ type: 'SET_CREATED_CLIENT', clientId: client.id });
        dispatchSession({ type: 'CONFIRM_BRAND' });

        // Generate content directly using the prompt
        addMessage(buildSystemUpdate('Generating your content...'));
        try {
          const draft = await generateContent.mutateAsync({
            clientId: client.id,
            kind: 'POST',
            channel: 'INSTAGRAM',
            guidance: prompt,
          });
          dispatchSession({ type: 'ADD_PREVIEW_DRAFT', draft });
        } catch {
          // Non-critical
        }

        // Show content preview
        addMessage(buildInteractivePrompt(
          "Here's what I created! What do you think?",
          'content_preview',
          { clientId: client.id },
        ));
        dispatchSession({ type: 'SET_PHASE', phase: 'value_delivery' });
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
        "Great choice — send me the listing.",
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
    } else if (method === 'link') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'website' });
      addMessage(buildInteractivePrompt(
        "Paste the listing URL and I'll extract the details.",
        'source_input',
      ));
    } else if (method === 'description') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'description' });
      addMessage(buildInteractivePrompt(
        "Paste the listing description and I'll work with it.",
        'source_input',
      ));
    } else if (method === 'photos') {
      dispatchSession({ type: 'SET_STARTER_METHOD', method: 'documents' });
      addMessage(buildInteractivePrompt(
        "Upload your listing photos and I'll analyze them.",
        'source_input',
      ));
    }
  }, [addMessage]);

  const selectREContentGoal = useCallback((goal: REContentGoal, label: string) => {
    dispatchSession({ type: 'SET_RE_CONTENT_GOAL', goal });
    addMessage(buildConfirmation(label));

    // After goal selection, generate content
    addMessage(buildInteractivePrompt(
      "Generating your content...",
      'content_preview',
    ));
    dispatchSession({ type: 'SET_PHASE', phase: 'value_delivery' });
  }, [addMessage]);

  const submitListingForm = useCallback(async (formData: REListingFormData) => {
    if (busyRef.current) return;
    busyRef.current = true;

    // Build a descriptive string from the form data
    const parts: string[] = [];
    if (formData.address) parts.push(formData.address);
    if (formData.city || formData.state) {
      parts.push([formData.city, formData.state].filter(Boolean).join(', '));
    }
    if (formData.price) parts.push(`Price: ${formData.price}`);
    if (formData.propertyType) parts.push(`Type: ${formData.propertyType}`);
    if (formData.beds) parts.push(`${formData.beds} beds`);
    if (formData.baths) parts.push(`${formData.baths} baths`);
    if (formData.sqft) parts.push(`${formData.sqft} sqft`);
    if (formData.description) parts.push(formData.description);

    const description = parts.join(' | ');
    dispatchSession({ type: 'SET_PRIMARY_INPUT', input: description });
    addMessage(buildUserText(description));

    // For manual form, skip analysis — create workspace directly
    try {
      addMessage(buildSystemUpdate('Setting up your workspace...'));
      const workspaceName = formData.address ?? 'My Listing';
      const client = await createClient.mutateAsync({
        name: workspaceName,
        slug: slugify(workspaceName),
        industryKey: session.industryKey ?? undefined,
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

      // Generate preview content
      addMessage(buildSystemUpdate('Generating listing content...'));
      try {
        const draft = await generateContent.mutateAsync({
          clientId: client.id,
          kind: 'POST',
          channel: 'INSTAGRAM',
          guidance: `Create an engaging new listing announcement post for: ${description}`,
        });
        dispatchSession({ type: 'ADD_PREVIEW_DRAFT', draft });
      } catch {
        // Non-critical
      }

      addMessage(buildInteractivePrompt(
        "Here's what I created! What do you think?",
        'content_preview',
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
  }, [session, addMessage, createClient, generateContent]);

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

  const submitInput = useCallback(async (input: string) => {
    if (busyRef.current) return;
    busyRef.current = true;

    const config = getOnboardingConfig(session.industryKey);
    const starterMethod = session.starterMethod ?? session.fallbackSourceMethod;
    const starter = config.starters.find((s) => s.method === starterMethod);
    const inputType = starter?.inputType === 'url' ? 'url' : 'text';
    const normalizedInput = inputType === 'url' ? normalizeUrl(input) : input;

    dispatchSession({ type: 'SET_PRIMARY_INPUT', input: normalizedInput });
    addMessage(buildUserText(input));

    // Record source entry for provenance tracking
    const sourceType: SourceEntry['sourceType'] = inputType === 'url' ? 'website' : 'description';
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
      stage: 'crawling',
      crawledPages: [],
      crawlDone: false,
      brandData: null,
      dataItems: [],
      dataCount: 0,
      errorMessage: null,
    };

    try {
      const result = await consumeAnalyzeStream(
        {
          input: normalizedInput,
          inputType: starterMethod === 'zillow' ? 'url' : inputType,
          industryKey: session.industryKey ?? undefined,
        },
        {
          onCrawlPage: (page) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              crawledPages: [...analysisProgressRef.current.crawledPages, page],
            };
          },
          onCrawlDone: () => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              crawlDone: true,
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
          onError: (message) => {
            analysisProgressRef.current = {
              ...analysisProgressRef.current,
              stage: 'error',
              errorMessage: message,
            };
          },
        },
      );

      if (result) {
        dispatchSession({ type: 'SET_ANALYZE_RESULT', result });
        dispatchSession({
          type: 'UPDATE_SOURCE_ENTRY',
          id: entryId,
          updates: {
            status: 'analyzed',
            extractedFields: Object.keys(result.brandData ?? {}),
          },
        });
        addMessage(buildInteractivePrompt(
          "Here's what I found. Does this look right?",
          'brand_preview',
        ));
      } else {
        dispatchSession({ type: 'UPDATE_SOURCE_ENTRY', id: entryId, updates: { status: 'failed' } });
        dispatchSession({ type: 'SET_ERROR', error: 'Analysis failed. Please try again.' });
        addMessage(buildSystemUpdate('Analysis failed. Please try again.'));
      }
    } catch (err) {
      dispatchSession({ type: 'UPDATE_SOURCE_ENTRY', id: entryId, updates: { status: 'failed' } });
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      dispatchSession({ type: 'SET_ERROR', error: msg });
      addMessage(buildSystemUpdate(msg));
    } finally {
      busyRef.current = false;
    }
  }, [session.industryKey, session.starterMethod, session.fallbackSourceMethod, addMessage]);

  const confirmBrand = useCallback(async (nameOverride?: string) => {
    if (busyRef.current) return;
    busyRef.current = true;

    if (nameOverride) {
      dispatchSession({ type: 'SET_BRAND_NAME_OVERRIDE', name: nameOverride });
    }
    dispatchSession({ type: 'CONFIRM_BRAND' });
    addMessage(buildConfirmation('Brand confirmed'));

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
      });
      dispatchSession({ type: 'SET_CREATED_CLIENT', clientId: client.id });

      if (session.analyzeResult) {
        const merged = mergeDrafts(session.sources);
        await saveProfiles(client.id, session.analyzeResult, merged);
        dispatchSession({ type: 'SET_PROFILES_SAVED' });

        if (session.analyzeResult.dataItems.length > 0) {
          try {
            await fetch(`/api/proxy/workspaces/${client.id}/data-import/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: session.analyzeResult.dataItems }),
            });
          } catch {
            // Non-critical
          }
        }
      }

      const config = getOnboardingConfig(session.industryKey);
      addMessage(buildInteractivePrompt(config.valueMessage, 'content_preview', { clientId: client.id }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create workspace.';
      dispatchSession({ type: 'SET_ERROR', error: msg });
      addMessage(buildSystemUpdate(msg));
    } finally {
      busyRef.current = false;
    }
  }, [session, addMessage, createClient]);

  const generatePreviews = useCallback(async () => {
    if (busyRef.current || !session.createdClientId) return;
    busyRef.current = true;

    addMessage(buildSystemUpdate('Generating sample posts...'));

    try {
      const result = session.analyzeResult;
      const clientId = session.createdClientId;

      const plan = buildOnboardingGenerationPlan({
        coreTemplates: result?.coreTemplates ?? [],
        starterAngles: result?.starterAngles ?? [],
        dataItems: (result?.dataItems ?? []).map((d) => ({
          id: `${d.type}_${d.title}`,
          dataJson: d.dataJson,
        })),
        connectedChannels: result?.suggestedChannels ?? ['INSTAGRAM'],
        industryKey: session.industryKey ?? 'general',
        brandContext: result?.brandData.description ?? session.contentPrompt ?? '',
      });

      const drafts: Draft[] = [];
      for (const slot of plan) {
        try {
          const draft = await generateContent.mutateAsync({
            clientId,
            kind: 'POST',
            channel: slot.channel ?? 'INSTAGRAM',
            guidance: slot.guidance,
            templateType: slot.templateType,
            dataItemId: slot.dataItemId ?? undefined,
          });
          drafts.push(draft);
          dispatchSession({ type: 'ADD_PREVIEW_DRAFT', draft });
        } catch {
          // Skip failed individual generations
        }
      }

      if (drafts.length > 0) {
        const config = getOnboardingConfig(session.industryKey);

        // RE flow → agent profile refinement after first output
        if (config.useREFlow && !session.reAgentProfileDone) {
          addMessage(buildInteractivePrompt(
            "Want me to make this sound more like your brand? Tell me about yourself.",
            're_agent_profile',
          ));
          dispatchSession({ type: 'SET_PHASE', phase: 'profile_refinement' });
        }
        // Fallback flow → profile refinement after first output
        else if (config.useFallbackFlow && !session.profileRefinementDone) {
          addMessage(buildInteractivePrompt(
            "Nice work! Want to save some details to make future content even better?",
            'profile_refinement',
          ));
          dispatchSession({ type: 'SET_PHASE', phase: 'profile_refinement' });
        } else {
          const enrichments = config.enrichmentCards.filter(
            (c) => c.hideIfStarterMethod !== session.starterMethod,
          );
          if (enrichments.length > 0) {
            addMessage(buildInteractivePrompt(
              'Want to add more sources to improve your content? These are optional.',
              'enrichment_menu',
            ));
            dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
          } else {
            addMessage(buildCompletionPrompt());
            dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
          }
        }
      } else {
        addMessage(buildSystemUpdate('Could not generate sample posts. You can generate them from your workspace.'));
        addMessage(buildCompletionPrompt());
        dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate previews.';
      addMessage(buildSystemUpdate(msg));
    } finally {
      busyRef.current = false;
    }
  }, [session, addMessage, generateContent]);

  const handleEnrichment = useCallback((cardType: string, key: string) => {
    const config = getOnboardingConfig(session.industryKey);
    const enrichmentDef = config.enrichmentCards.find((c) => c.key === key);
    addMessage(buildInteractivePrompt(
      `Let's add your ${key.replace(/_/g, ' ')}.`,
      cardType as any,
      enrichmentDef?.payload,
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
      ));
    } else {
      addMessage(buildCompletionPrompt());
      dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
    }
  }, [session, addMessage]);

  const addSource = useCallback((source: AgentProfileDraft) => {
    dispatchSession({ type: 'ADD_SOURCE', source });
  }, []);

  const skipEnrichment = useCallback(() => {
    dispatchSession({ type: 'MARK_ENRICHMENT_SKIPPED' });
    addMessage(buildConfirmation('Skipped'));
    addMessage(buildCompletionPrompt());
  }, [addMessage]);

  const finish = useCallback(() => {
    if (session.createdClientId) {
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
      router.push(`/workspaces/${session.createdClientId}?onboarded=true`);
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
      message: buildInteractivePrompt(
        "Welcome! Let's set up your workspace. First, what industry are you in?",
        'industry_select',
      ),
    });
  }

  return {
    session,
    conversation,
    analysisProgress: analysisProgressRef,

    // Standard actions
    selectIndustry,
    selectStarter,
    submitInput,
    confirmBrand,
    generatePreviews,
    handleEnrichment,
    markEnrichmentDone,
    addSource,
    skipEnrichment,
    finish,
    reset,

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
    saveREAgentProfile,
    skipREAgentProfile,

    // Loading states
    isAnalyzing: busyRef.current && session.phase === 'analysis',
    isCreating: createClient.isPending,
    isGenerating: generateContent.isPending,
  };
}
