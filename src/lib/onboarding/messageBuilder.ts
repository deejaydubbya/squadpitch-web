import type { OnboardingChatMessage, OnboardingCardType, OnboardingMessageType } from './types';

let messageCounter = 0;

function createId(): string {
  return `ob_msg_${Date.now()}_${++messageCounter}`;
}

// ── Factories ────────────────────────────────────────────────────────────

export function buildAssistantText(content: string): OnboardingChatMessage {
  return {
    id: createId(),
    type: 'assistant_text',
    content,
    timestamp: Date.now(),
    status: 'resolved',
  };
}

export function buildUserText(content: string, payload?: Record<string, unknown>): OnboardingChatMessage {
  return {
    id: createId(),
    type: 'user_text',
    content,
    timestamp: Date.now(),
    status: 'resolved',
    payload,
  };
}

export function buildInteractivePrompt(
  content: string,
  cardType: OnboardingCardType,
  payload?: Record<string, unknown>,
): OnboardingChatMessage {
  return {
    id: createId(),
    type: 'interactive_prompt',
    content,
    cardType,
    timestamp: Date.now(),
    status: 'active',
    payload,
  };
}

export function buildConfirmation(content: string, payload?: Record<string, unknown>): OnboardingChatMessage {
  return {
    id: createId(),
    type: 'confirmation',
    content,
    timestamp: Date.now(),
    status: 'resolved',
    payload,
  };
}

export function buildSystemUpdate(content: string): OnboardingChatMessage {
  return {
    id: createId(),
    type: 'system_update',
    content,
    timestamp: Date.now(),
    status: 'resolved',
  };
}

// ── High-level builders ──────────────────────────────────────────────────

export function buildWelcomeMessage(welcomeText: string): OnboardingChatMessage {
  return buildInteractivePrompt(welcomeText, 'industry_select');
}

export function buildStarterPrompt(message: string): OnboardingChatMessage {
  return buildInteractivePrompt(message, 'starter_options');
}

export function buildSourceInputPrompt(message: string): OnboardingChatMessage {
  return buildInteractivePrompt(message, 'source_input');
}

export function buildAnalysisPrompt(message: string): OnboardingChatMessage {
  return buildInteractivePrompt(message, 'analysis_progress');
}

export function buildBrandPreviewPrompt(message: string): OnboardingChatMessage {
  return buildInteractivePrompt(message, 'brand_preview');
}

export function buildContentPreviewPrompt(message: string): OnboardingChatMessage {
  return buildInteractivePrompt(message, 'content_preview');
}

export function buildEnrichmentPrompt(message: string): OnboardingChatMessage {
  return buildInteractivePrompt(message, 'enrichment_menu');
}

export function buildCompletionPrompt(): OnboardingChatMessage {
  return buildInteractivePrompt(
    "You're all set! Your workspace is ready to go.",
    'completion_summary',
  );
}
