import type { OnboardingSessionState, OnboardingConfig, ResolvedStep, EnrichmentCardDef } from './types';
import { getOnboardingConfig } from './configRegistry';

/**
 * Core decision engine: given current session state, determine the next step.
 */
export function resolveNextStep(session: OnboardingSessionState): ResolvedStep {
  const config = getOnboardingConfig(session.industryKey);

  // No industry selected yet
  if (!session.industryKey) {
    return {
      message: config.welcomeMessage,
      cardType: 'industry_select',
      phase: 'industry_select',
      skippable: false,
    };
  }

  // Real estate flow
  if (config.useREFlow) {
    return resolveREStep(session, config);
  }

  // Fallback flow — intent-based routing
  if (config.useFallbackFlow) {
    return resolveFallbackStep(session, config);
  }

  // Industry-specific flow (generic)
  return resolveIndustryStep(session, config);
}

// ── Real estate flow engine ───────────────────────────────────────────────

function resolveREStep(session: OnboardingSessionState, config: OnboardingConfig): ResolvedStep {
  // Step 1: No RE intent selected
  if (!session.reIntent) {
    return {
      message: config.welcomeMessage,
      cardType: 're_starter',
      phase: 'quick_start',
      skippable: false,
    };
  }

  // ── Flow A: Start with a listing ────────────────────────────────────
  if (session.reIntent === 'listing') {
    // Need listing source method
    if (!session.reListingSource) {
      return {
        message: "Great choice — send me the listing.",
        cardType: 're_listing_source',
        phase: 'quick_start',
        skippable: false,
      };
    }

    // Manual form → show listing form
    if (session.reListingSource === 'manual_form' && !session.primaryInput && !session.analyzeResult) {
      return {
        message: "Enter the listing details below.",
        cardType: 're_listing_form',
        phase: 'quick_start',
        skippable: false,
      };
    }

    // Link or description: need input
    if ((session.reListingSource === 'link' || session.reListingSource === 'description')
      && !session.primaryInput && !session.analyzeResult) {
      const msg = session.reListingSource === 'link'
        ? "Paste the listing URL and I'll extract the details."
        : "Paste the listing description and I'll work with it.";
      return {
        message: msg,
        cardType: 'source_input',
        phase: 'quick_start',
        skippable: false,
      };
    }

    // Photos: need upload (reuse source_input with document mode)
    if (session.reListingSource === 'photos' && !session.primaryInput && !session.analyzeResult) {
      return {
        message: "Upload your listing photos and I'll analyze them.",
        cardType: 'source_input',
        phase: 'quick_start',
        skippable: false,
      };
    }

    // Input provided, analysis in progress
    if (!session.analyzeResult && session.primaryInput) {
      return {
        message: config.analysisMessage,
        cardType: 'analysis_progress',
        phase: 'analysis',
        skippable: false,
      };
    }

    // Analysis result exists but brand not confirmed
    if (session.analyzeResult && !session.brandConfirmed) {
      return {
        message: "Here's the listing I found. Does this look right?",
        cardType: 'brand_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }

    // Brand confirmed but no preview posts
    if (session.brandConfirmed && session.previewDrafts.length === 0) {
      return {
        message: config.valueMessage,
        cardType: 'content_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }

    // Posts generated → agent profile refinement
    return resolveREPostGenerationStep(session, config);
  }

  // ── Flow B: Promote my real estate business ─────────────────────────
  if (session.reIntent === 'business') {
    // Need source method (reuse fallback source card pattern)
    if (!session.fallbackSourceMethod) {
      return {
        message: "What's the easiest way to tell me about your business?",
        cardType: 'fallback_source',
        phase: 'quick_start',
        skippable: false,
      };
    }

    // "Enter profile manually" → agent profile form
    if (session.fallbackSourceMethod === 'skip' && !session.reAgentProfileDone && !session.analyzeResult) {
      return {
        message: "Tell me about your real estate business.",
        cardType: 're_agent_profile',
        phase: 'quick_start',
        skippable: false,
      };
    }

    // Source selected but no input yet
    if (session.fallbackSourceMethod !== 'skip' && !session.primaryInput && !session.analyzeResult) {
      return {
        message: getSourceInputPrompt(session.fallbackSourceMethod),
        cardType: 'source_input',
        phase: 'quick_start',
        skippable: false,
      };
    }

    // Input provided, analysis in progress
    if (!session.analyzeResult && session.primaryInput) {
      return {
        message: config.analysisMessage,
        cardType: 'analysis_progress',
        phase: 'analysis',
        skippable: false,
      };
    }

    // Analysis done, brand not confirmed
    if (session.analyzeResult && !session.brandConfirmed) {
      return {
        message: "Here's what I found. Does this look right?",
        cardType: 'brand_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }

    // Brand confirmed → need content goal
    if (session.brandConfirmed && !session.reContentGoal) {
      return {
        message: "What kind of content do you want most right now?",
        cardType: 're_content_goal',
        phase: 'value_delivery',
        skippable: false,
      };
    }

    // Content goal set, no preview posts yet
    if (session.reContentGoal && session.previewDrafts.length === 0) {
      return {
        message: "Generating your content...",
        cardType: 'content_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }

    // Posts generated → enrichments/completion
    return resolveREPostGenerationStep(session, config);
  }

  // ── Flow C: Just create content ─────────────────────────────────────
  if (session.reIntent === 'just_create') {
    if (!session.contentPrompt && session.previewDrafts.length === 0) {
      return {
        message: "What do you want to create right now?",
        cardType: 're_content_prompt',
        phase: 'quick_start',
        skippable: false,
      };
    }
    if (!session.createdClientId) {
      return {
        message: "Let's set up your workspace.",
        cardType: 'brand_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }
    if (session.previewDrafts.length === 0) {
      return {
        message: "Generating your content...",
        cardType: 'content_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }
    return resolveREPostGenerationStep(session, config);
  }

  // ── Manual entry ────────────────────────────────────────────────────
  if (session.reIntent === 'manual') {
    if (!session.reAgentProfileDone) {
      return {
        message: "Let's set up your agent profile.",
        cardType: 're_agent_profile',
        phase: 'quick_start',
        skippable: false,
      };
    }
    if (!session.createdClientId) {
      return {
        message: "Creating your workspace...",
        cardType: 'brand_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }
    return resolveREPostGenerationStep(session, config);
  }

  // Fallthrough — completion
  return {
    message: "You're all set! Your workspace is ready to go.",
    cardType: 'completion_summary',
    phase: 'completion',
    skippable: false,
  };
}

/**
 * Post-generation step for RE: agent profile refinement → enrichments → completion.
 */
function resolveREPostGenerationStep(session: OnboardingSessionState, config: OnboardingConfig): ResolvedStep {
  // Offer agent profile refinement if not done (for listing-first and just-create flows)
  if (!session.reAgentProfileDone && !session.enrichmentsSkipped) {
    return {
      message: "Want me to make this sound more like your brand? Tell me about yourself.",
      cardType: 're_agent_profile',
      phase: 'profile_refinement',
      skippable: true,
    };
  }

  // Regular enrichments
  if (!session.enrichmentsSkipped) {
    const available = getAvailableEnrichments(session, config);
    if (available.length > 0) {
      return {
        message: 'Want to add more sources? These are optional.',
        cardType: 'enrichment_menu',
        phase: 'enrichment',
        skippable: true,
      };
    }
  }

  return {
    message: "You're all set! Your real estate workspace is ready.",
    cardType: 'completion_summary',
    phase: 'completion',
    skippable: false,
  };
}

// ── Fallback flow engine ─────────────────────────────────────────────────

function resolveFallbackStep(session: OnboardingSessionState, config: OnboardingConfig): ResolvedStep {
  // Step 1: No intent chosen yet → show fallback starter cards
  if (!session.fallbackIntent) {
    return {
      message: config.welcomeMessage,
      cardType: 'fallback_starter',
      phase: 'quick_start',
      skippable: false,
    };
  }

  // Flow C: "Just create content" — skip to content prompt
  if (session.fallbackIntent === 'just_create') {
    if (!session.contentPrompt && session.previewDrafts.length === 0) {
      return {
        message: "What do you want to make? Pick a suggestion or describe your idea.",
        cardType: 'fallback_content_prompt',
        phase: 'quick_start',
        skippable: false,
      };
    }
    // Content prompt provided but no workspace yet → brand preview (simple name entry)
    if (!session.createdClientId) {
      return {
        message: "Let's set up your workspace. You can add details later.",
        cardType: 'brand_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }
    // Workspace created, generate & show posts
    if (session.previewDrafts.length === 0) {
      return {
        message: "Generating your content...",
        cardType: 'content_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }
    // After generation → profile refinement (collect details after first value)
    return resolvePostGenerationStep(session, config);
  }

  // Flow A & B: "My business" / "Product or service"
  // Need to select source method
  if (!session.fallbackSourceMethod) {
    const prompt = session.fallbackIntent === 'my_business'
      ? "What's the easiest way to tell me about your business?"
      : "How would you like to share your product or service info?";
    return {
      message: prompt,
      cardType: 'fallback_source',
      phase: 'quick_start',
      skippable: false,
    };
  }

  // Source method "skip" → just create workspace quickly
  if (session.fallbackSourceMethod === 'skip') {
    if (!session.contentPrompt && session.previewDrafts.length === 0) {
      return {
        message: "What would you like to create right now?",
        cardType: 'fallback_content_prompt',
        phase: 'quick_start',
        skippable: false,
      };
    }
    if (!session.createdClientId) {
      return {
        message: "Let's set up your workspace.",
        cardType: 'brand_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }
    if (session.previewDrafts.length === 0) {
      return {
        message: "Generating your content...",
        cardType: 'content_preview',
        phase: 'value_delivery',
        skippable: false,
      };
    }
    return resolvePostGenerationStep(session, config);
  }

  // Source method "documents" → show document upload input
  if (session.fallbackSourceMethod === 'documents' && !session.primaryInput && !session.analyzeResult) {
    return {
      message: 'Upload your documents and I\'ll extract your brand info.',
      cardType: 'source_input',
      phase: 'quick_start',
      skippable: false,
    };
  }

  // Source method selected (website or description) but no input yet
  if (!session.analyzeResult && !session.primaryInput) {
    return {
      message: getSourceInputPrompt(session.fallbackSourceMethod),
      cardType: 'source_input',
      phase: 'quick_start',
      skippable: false,
    };
  }

  // Input provided, analysis in progress
  if (!session.analyzeResult && session.primaryInput) {
    return {
      message: config.analysisMessage,
      cardType: 'analysis_progress',
      phase: 'analysis',
      skippable: false,
    };
  }

  // Have analysis result but brand not confirmed
  if (session.analyzeResult && !session.brandConfirmed) {
    return {
      message: "Here's what I found. Does this look right?",
      cardType: 'brand_preview',
      phase: 'value_delivery',
      skippable: false,
    };
  }

  // Brand confirmed but no preview posts
  if (session.brandConfirmed && session.previewDrafts.length === 0) {
    return {
      message: config.valueMessage,
      cardType: 'content_preview',
      phase: 'value_delivery',
      skippable: false,
    };
  }

  // After generation → profile refinement then completion
  return resolvePostGenerationStep(session, config);
}

/**
 * After first content generation, offer profile refinement then completion.
 */
function resolvePostGenerationStep(session: OnboardingSessionState, config: OnboardingConfig): ResolvedStep {
  // Profile refinement (post-generation enrichment for fallback)
  if (!session.profileRefinementDone && !session.enrichmentsSkipped) {
    return {
      message: "Nice work! Want to save some details to make future content even better?",
      cardType: 'profile_refinement',
      phase: 'profile_refinement',
      skippable: true,
    };
  }

  // Check regular enrichments
  if (!session.enrichmentsSkipped) {
    const available = getAvailableEnrichments(session, config);
    if (available.length > 0) {
      return {
        message: 'Want to add more sources to improve your content? These are optional.',
        cardType: 'enrichment_menu',
        phase: 'enrichment',
        skippable: true,
      };
    }
  }

  // Done
  return {
    message: "You're all set! Your workspace is ready to go.",
    cardType: 'completion_summary',
    phase: 'completion',
    skippable: false,
  };
}

// ── Industry-specific flow engine ────────────────────────────────────────

function resolveIndustryStep(session: OnboardingSessionState, config: OnboardingConfig): ResolvedStep {
  // Industry selected but no starter method
  if (!session.starterMethod) {
    return {
      message: config.welcomeMessage,
      cardType: 'starter_options',
      phase: 'quick_start',
      skippable: false,
    };
  }

  // Starter selected but no analysis started (need input for non-scratch)
  if (!session.analyzeResult && session.starterMethod !== 'scratch') {
    if (!session.primaryInput) {
      return {
        message: getInputPrompt(session.starterMethod, config),
        cardType: 'source_input',
        phase: 'quick_start',
        skippable: false,
      };
    }

    // Input provided, analysis in progress
    return {
      message: config.analysisMessage,
      cardType: 'analysis_progress',
      phase: 'analysis',
      skippable: false,
    };
  }

  // Scratch flow — skip to brand/workspace creation
  if (session.starterMethod === 'scratch' && !session.createdClientId) {
    return {
      message: "Let's set up your workspace. You can add details later.",
      cardType: 'brand_preview',
      phase: 'value_delivery',
      skippable: false,
    };
  }

  // Have analysis result but brand not confirmed
  if (session.analyzeResult && !session.brandConfirmed) {
    return {
      message: "Here's what I found. Does this look right?",
      cardType: 'brand_preview',
      phase: 'value_delivery',
      skippable: false,
    };
  }

  // Brand confirmed but no preview posts
  if (session.brandConfirmed && session.previewDrafts.length === 0) {
    return {
      message: config.valueMessage,
      cardType: 'content_preview',
      phase: 'value_delivery',
      skippable: false,
    };
  }

  // Preview posts shown, check enrichments
  if (session.previewDrafts.length > 0 && !session.enrichmentsSkipped) {
    const available = getAvailableEnrichments(session, config);
    if (available.length > 0) {
      return {
        message: 'Want to add more sources to improve your content? These are optional.',
        cardType: 'enrichment_menu',
        phase: 'enrichment',
        skippable: true,
      };
    }
  }

  // Done
  return {
    message: "You're all set! Your workspace is ready to go.",
    cardType: 'completion_summary',
    phase: 'completion',
    skippable: false,
  };
}

// ── Data sufficiency heuristic ───────────────────────────────────────────

/**
 * Evaluate whether we have enough context to generate meaningful content.
 * Returns true when generation is reasonable without further input.
 */
export function hasMinimalContext(session: OnboardingSessionState): boolean {
  // Any analysis result means backend confirmed enough data
  if (session.analyzeResult) return true;

  // Manual description of at least 20 characters
  if (session.primaryInput && session.primaryInput.length >= 20) return true;

  // Content prompt provided
  if (session.contentPrompt) return true;

  return false;
}

/**
 * Get enrichment cards that are still available (not yet completed, not hidden).
 */
export function getAvailableEnrichments(
  session: OnboardingSessionState,
  config?: OnboardingConfig,
): EnrichmentCardDef[] {
  const cfg = config ?? getOnboardingConfig(session.industryKey);
  return cfg.enrichmentCards.filter((card) => {
    if (card.hideIfStarterMethod && card.hideIfStarterMethod === session.starterMethod) {
      return false;
    }
    if (session.enrichmentsCompleted.includes(card.key)) {
      return false;
    }
    return true;
  });
}

/**
 * Calculate a completeness score (0–100) for the onboarding session.
 */
export function getCompletenessScore(session: OnboardingSessionState): number {
  let score = 0;

  if (session.industryKey) score += 10;
  if (session.analyzeResult) score += 20;
  if (session.brandConfirmed) score += 15;
  if (session.createdClientId) score += 10;
  if (session.profilesSaved) score += 10;
  if (session.previewDrafts.length > 0) score += 15;
  if (session.profileRefinementDone || session.reAgentProfileDone) score += 5;

  const totalEnrichments = getOnboardingConfig(session.industryKey).enrichmentCards.length;
  if (totalEnrichments > 0) {
    const completed = session.enrichmentsCompleted.length;
    score += Math.round((completed / totalEnrichments) * 15);
  } else {
    score += 15;
  }

  return Math.min(score, 100);
}

// ── Internal helpers ─────────────────────────────────────────────────────

function getInputPrompt(method: string, config: OnboardingConfig): string {
  const starter = config.starters.find((s) => s.method === method);
  if (!starter) return 'Please provide your input to get started.';

  switch (starter.inputType) {
    case 'url':
      return `Enter your ${method === 'zillow' ? 'Zillow profile' : 'website'} URL and I'll analyze it.`;
    case 'textarea':
      return 'Tell me about your business. The more detail, the better!';
    default:
      return 'Please provide your input to get started.';
  }
}

function getSourceInputPrompt(method: string): string {
  switch (method) {
    case 'website':
      return "Enter your website URL and I'll analyze it.";
    case 'description':
      return 'Tell me about what you do. The more detail, the better!';
    case 'documents':
      return 'Upload your documents and I\'ll extract the key info.';
    default:
      return 'Please provide your input to get started.';
  }
}
