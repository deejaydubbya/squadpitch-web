'use client';

import { useReducer, useCallback, useRef, useState } from 'react';
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
  isUrl,
} from '@/lib/onboarding/helpers';
import { buildOnboardingGenerationPlan } from '@/lib/assistant/onboardingPlanner';
import type { BrandOverrides } from '@/components/onboarding/cards/BrandPreviewCard';
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

  // ── Helpers ──────────────────────────────────────────────────────────

  const addMessage = useCallback((msg: OnboardingChatMessage) => {
    dispatchConversation({ type: 'ADD_MESSAGE', message: msg });
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    dispatchConversation({ type: 'UPDATE_MESSAGE', id, content });
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

    // Build a synthetic analyzeResult so generatePreviews has listing-aware
    // templates and data items instead of falling back to generic content.
    const listingTitle = formData.address || 'Property Listing';
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
          price: formData.price ? Number(formData.price.replace(/[^0-9.]/g, '')) || undefined : undefined,
          propertyType: formData.propertyType,
          beds: formData.beds ? Number(formData.beds) || undefined : undefined,
          baths: formData.baths ? Number(formData.baths) || undefined : undefined,
          sqft: formData.sqft ? Number(formData.sqft.replace(/[^0-9]/g, '')) || undefined : undefined,
          description: formData.description,
          features: formData.features,
        },
        tags: ['listing'],
        priority: 1,
      }],
      coreTemplates: [
        {
          type: 'listing_post',
          title: 'Just Listed Announcement',
          guidance: `Create a compelling "Just Listed" announcement post for this property: ${description}. Highlight the best features — location, price, size, unique selling points. Make it exciting and urgent.`,
          conditions: { hasData: true, requiredDataType: 'listing' },
        },
        {
          type: 'neighborhood_highlight',
          title: 'Neighborhood & Lifestyle',
          guidance: `Create a post showcasing the neighborhood and lifestyle around this property: ${description}. Focus on nearby amenities, schools, parks, dining, commute, and what makes the area desirable. Do NOT repeat pricing or bedroom/bath counts — paint a picture of life in this neighborhood.`,
        },
        {
          type: 'buyer_tip',
          title: 'Buyer Advice',
          guidance: `Write a helpful post with practical advice for buyers interested in properties like this: ${description}. Topics could include financing tips, what to look for during a showing, how to stand out in a competitive market, or first-time buyer guidance. Do NOT repeat the listing details — focus on being a helpful expert resource.`,
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
        "Got it! Want to add listing photos? They'll be used in your posts.",
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

  // -- Listing photo offer -------------------------------------------------
  const proceedToContentPreview = useCallback(() => {
    const clientId = session.createdClientId;
    addMessage(buildInteractivePrompt(
      "Here's what I created! Approve, edit, or regenerate any post.",
      'content_preview',
      clientId ? { clientId } : undefined,
    ));
  }, [session.createdClientId, addMessage]);

  const uploadListingPhotos = useCallback(async (
    files: File[],
    onProgress?: (p: { uploaded: number; total: number; currentName: string }) => void,
  ) => {
    const clientId = session.createdClientId;
    if (!clientId || files.length === 0) return;

    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.({ uploaded, total: files.length, currentName: file.name });
      try {
        const params = new URLSearchParams();
        params.set('filename', file.name);
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
      addMessage(buildConfirmation(`${uploaded} photo${uploaded > 1 ? 's' : ''} uploaded`));
    }
    proceedToContentPreview();
  }, [session.createdClientId, addMessage, proceedToContentPreview]);

  const skipListingPhotos = useCallback(() => {
    addMessage(buildConfirmation('Skipped'));
    proceedToContentPreview();
  }, [addMessage, proceedToContentPreview]);

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
    // Detect input type from the content itself, not the original starter method.
    // This prevents sending a description as 'url' during enrichment.
    const looksLikeUrl = isUrl(input);
    const inputType = looksLikeUrl ? 'url' : 'text';
    const normalizedInput = looksLikeUrl ? normalizeUrl(input) : input;

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
          industryKey: session.industryKey ?? undefined,
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
        dispatchSession({ type: 'SET_ANALYZE_RESULT', result });
        dispatchSession({
          type: 'UPDATE_SOURCE_ENTRY',
          id: entryId,
          updates: {
            status: 'analyzed',
            extractedFields: Object.keys(result.brandData ?? {}),
          },
        });

        // If workspace already exists (enrichment flow), save data directly
        // and return to enrichment menu instead of showing brand_preview again.
        if (session.createdClientId) {
          try {
            const merged = mergeDrafts([...session.sources]);
            await saveProfiles(session.createdClientId, result, merged);

            if (result.dataItems.length > 0) {
              const importSourceType = inputType === 'text' ? 'TEXT' : 'URL';
              await fetch(`/api/proxy/workspaces/${session.createdClientId}/data-import/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items: result.dataItems,
                  sourceType: importSourceType,
                  sourceUrl: normalizedInput && importSourceType === 'URL' ? normalizedInput : undefined,
                }),
              }).catch(() => {});
            }
          } catch {
            // Non-critical
          }

          dispatchSession({ type: 'MARK_ENRICHMENT_COMPLETED', key: 'additional_urls' });
          addMessage(buildConfirmation('New source analyzed & saved'));

          const config = getOnboardingConfig(session.industryKey);
          const remaining = config.enrichmentCards.filter(
            (c) =>
              c.hideIfStarterMethod !== session.starterMethod &&
              !session.enrichmentsCompleted.includes(c.key) &&
              c.key !== 'additional_urls',
          );
          if (remaining.length > 0) {
            addMessage(buildInteractivePrompt(
              'Anything else you\'d like to add?',
              'enrichment_menu',
            ));
            dispatchSession({ type: 'SET_PHASE', phase: 'enrichment' });
          } else {
            addMessage(buildCompletionPrompt());
            dispatchSession({ type: 'SET_PHASE', phase: 'completion' });
          }
        } else {
          addMessage(buildInteractivePrompt(
            "Here's what I found. Does this look right?",
            'brand_preview',
          ));
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
        const imageUrls = new Set<string>();
        for (const di of session.analyzeResult.dataItems ?? []) {
          const heroUrl = di.dataJson?.imageUrl as string | undefined;
          if (heroUrl) imageUrls.add(heroUrl);
          const gallery = di.dataJson?.images as string[] | undefined;
          if (Array.isArray(gallery)) {
            for (const u of gallery) { if (u) imageUrls.add(u); }
          }
        }
        for (const img of session.analyzeResult.images ?? []) {
          if (img) imageUrls.add(img);
        }

        // Upload images to media library and build source→cloudinary URL map
        const urlMap = new Map<string, string>(); // sourceUrl → cloudinaryUrl
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
                return { sourceUrl, cloudinaryUrl: asset.url as string };
              }),
            );
            for (const r of results) {
              if (r.status === 'fulfilled') {
                downloaded++;
                urlMap.set(r.value.sourceUrl, r.value.cloudinaryUrl);
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

      // Show content preview AFTER images are downloaded and data items saved
      const config = getOnboardingConfig(session.industryKey);
      addMessage(buildInteractivePrompt(config.valueMessage, 'content_preview', { clientId: client.id }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create workspace.';
      dispatchSession({ type: 'SET_ERROR', error: msg });
      addMessage(buildSystemUpdate(msg));
    } finally {
      busyRef.current = false;
    }
  }, [session, addMessage, updateMessage, createClient]);

  const generatePreviews = useCallback(async () => {
    if (busyRef.current || !session.createdClientId) return;
    busyRef.current = true;

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
      const plannerDataItems = savedDataItems.length > 0
        ? savedDataItems.map((d) => ({ id: d.id, dataJson: d.dataJson }))
        : (result?.dataItems ?? []).map((d) => ({
            id: `${d.type}_${d.title}`,
            dataJson: d.dataJson,
          }));

      // Fetch uploaded media assets (with IDs) for linking to drafts
      const primaryDataItem = plannerDataItems[0] ?? null;
      let mediaAssets: { id: string; url: string }[] = [];
      try {
        const assetsRes = await fetch(`/api/proxy/workspaces/${clientId}/assets?limit=100&status=READY&assetType=image`);
        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          mediaAssets = (assetsData.assets ?? [])
            .filter((a: { id: string; url: string }) => a.id && a.url);
        }
      } catch { /* non-critical */ }

      // Build URL→assetId map for matching data item images to assets
      const urlToAssetId = new Map<string, string>();
      for (const a of mediaAssets) urlToAssetId.set(a.url, a.id);

      // Identify the hero/exterior image (first in data item gallery)
      let heroUrl: string | undefined;
      if (primaryDataItem) {
        heroUrl = primaryDataItem.dataJson?.imageUrl as string | undefined;
      }
      // Fall back to first media asset
      if (!heroUrl && mediaAssets.length > 0) heroUrl = mediaAssets[0].url;

      console.log('[generatePreviews] mediaAssets:', mediaAssets.length,
        'heroUrl:', heroUrl ? 'set' : 'none', 'primary dataItem:', !!primaryDataItem);

      // Pick assets for a given slot: hero as primary, then spread
      // interior shots for variety. Returns up to `count` asset IDs.
      const pickAssetsForSlot = (slotIndex: number, count: number): { id: string; url: string }[] => {
        if (mediaAssets.length === 0) return [];
        const picked: { id: string; url: string }[] = [];
        const usedIds = new Set<string>();

        // 1. Always start with the hero/exterior as primary
        const heroAsset = heroUrl ? mediaAssets.find((a) => a.url === heroUrl) : mediaAssets[0];
        if (heroAsset) {
          picked.push(heroAsset);
          usedIds.add(heroAsset.id);
        }

        // 2. Add varied interior shots — offset by slot index for variety
        // Skip the hero image; spread through remaining gallery
        const others = mediaAssets.filter((a) => !usedIds.has(a.id));
        if (others.length > 0) {
          const startOffset = slotIndex * Math.max(1, Math.floor(others.length / 6));
          for (let j = 0; picked.length < count && j < others.length; j++) {
            const idx = (startOffset + j) % others.length;
            picked.push(others[idx]);
          }
        }

        return picked;
      };

      const plan = buildOnboardingGenerationPlan({
        coreTemplates: result?.coreTemplates ?? [],
        starterAngles: result?.starterAngles ?? [],
        dataItems: plannerDataItems,
        connectedChannels: result?.suggestedChannels ?? ['INSTAGRAM'],
        industryKey: session.industryKey ?? 'general',
        brandContext: result?.brandData.description ?? session.contentPrompt ?? session.primaryInput ?? '',
      });

      // Override: pass the primary data item to ALL slots so all content
      // references the property listing (not just the first slot)
      if (primaryDataItem) {
        for (const slot of plan) {
          if (!slot.dataItemId) slot.dataItemId = primaryDataItem.id;
        }
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

          // Attach multiple images to each post:
          // - Primary (mediaUrl) = exterior/hero for all posts
          // - Link 3+ assets for carousel via DraftAsset join table
          const slotAssets = pickAssetsForSlot(i, Math.min(5, mediaAssets.length));
          const primaryImage = slotAssets[0]?.url;
          console.log(`[generatePreviews] slot ${i}: ${slotAssets.length} assets picked, primary=${primaryImage ? 'set' : 'none'}`);

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
          for (let ai = 0; ai < slotAssets.length; ai++) {
            try {
              await fetch(`/api/proxy/assets/${slotAssets[ai].id}/link`, {
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
          console.log(`[generatePreviews] slot ${i}: linked ${slotAssets.length} assets`);

          drafts.push(draft);
          dispatchSession({ type: 'ADD_PREVIEW_DRAFT', draft });
          setGenerationProgress({ current: drafts.length, total: plan.length });
        } catch {
          // Skip failed individual generations
          setGenerationProgress((prev) => prev ? { ...prev, total: prev.total - 1 } : null);
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
      setGenerationProgress(null);
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

  const replacePreviewDraft = useCallback((oldId: string, newDraft: Draft) => {
    dispatchSession({ type: 'REPLACE_PREVIEW_DRAFT', oldId, draft: newDraft });
  }, []);

  const addSource = useCallback((source: AgentProfileDraft) => {
    dispatchSession({ type: 'ADD_SOURCE', source });
  }, []);

  const skipEnrichment = useCallback(() => {
    dispatchSession({ type: 'MARK_ENRICHMENT_SKIPPED' });
    addMessage(buildConfirmation('Skipped'));
    addMessage(buildCompletionPrompt());
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

  const submitFiles = useCallback(async (files: File[], onProgress?: (p: { uploaded: number; total: number; currentName: string }) => void) => {
    const clientId = session.createdClientId;
    if (!clientId || files.length === 0) return;

    addMessage(buildUserText(`${files.length} photo${files.length > 1 ? 's' : ''} selected`));

    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.({ uploaded, total: files.length, currentName: file.name });
      try {
        const params = new URLSearchParams();
        params.set('filename', file.name);
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
  }, [session.createdClientId, addMessage, markEnrichmentDone]);

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
    } else if (method === 'link') {
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

    // Standard actions
    selectIndustry,
    selectStarter,
    submitInput,
    submitFiles,
    retryAnalysis,
    fallbackToText,
    chooseAlternateMethod,
    confirmBrand,
    generatePreviews,
    replacePreviewDraft,
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
    uploadListingPhotos,
    skipListingPhotos,
    saveREAgentProfile,
    skipREAgentProfile,

    // Loading states
    isAnalyzing: busyRef.current && session.phase === 'analysis',
    isCreating: createClient.isPending,
    isGenerating: generationProgress !== null,
    generationProgress,
  };
}
