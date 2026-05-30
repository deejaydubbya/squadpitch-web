import type { AssistantAction, AssistantSessionState } from '../types';
import type { Channel } from '@/hooks/useSquadpitch';

// ── Message Lifecycle ────────────────────────────────────────────────────

/**
 * Message status lifecycle:
 * - active: currently awaiting user input (InteractivePrompt)
 * - resolved: user has answered, collapsed into confirmation
 * - invalidated: a later revision made this answer stale
 */
export type MessageStatus = 'active' | 'resolved' | 'invalidated';

/**
 * Types of interactive cards that can be embedded in messages.
 */
export type CardType =
  | 'mode_select'
  | 'campaign_source'
  | 'campaign_url_source'
  | 'property_select'
  | 'campaign_data_item'
  | 'campaign_idea'
  | 'campaign_type'
  | 'channel_select'
  | 'media_select'
  | 'schedule_review'
  | 'generation'
  | 'campaign_review'
  | 'quick_post_config'
  | 'quick_post_source'
  | 'quick_post_data'
  | 'quick_post_guidance'
  | 'quick_post_content_type'
  | 'quick_post_goal';

// ── Message Types (discriminated union) ──────────────────────────────────

/**
 * ChatMessage types per spec:
 * - AssistantText: plain assistant message
 * - UserText: user's freeform input
 * - InteractivePrompt: assistant message with embedded UI card
 * - Confirmation: system message confirming a selection
 * - SystemUpdate: system notification (field invalidated, etc.)
 */
export type MessageType =
  | 'assistant_text'
  | 'user_text'
  | 'interactive_prompt'
  | 'confirmation'
  | 'system_update';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  status: MessageStatus;

  /** Card type (only for interactive_prompt messages) */
  cardType?: CardType;

  /** Structured payload (selected value, parsed fields, etc.) */
  payload?: Record<string, unknown>;
}

// ── Parser Output ────────────────────────────────────────────────────────

/**
 * Result of parsing freeform user input.
 * Contains detected fields, the actions to dispatch,
 * confidence scores, and ambiguities.
 */
export interface ParseResult {
  /** Actions to dispatch against the session reducer */
  actions: AssistantAction[];
  /** Human-readable summary of what was detected */
  detectedFields: string[];
  /** Fields that were NOT parseable and still need asking */
  remainingRequired: string[];
  /** Confidence score (0–1) for each detected field */
  confidence: Record<string, number>;
  /** Ambiguous extractions that need user confirmation */
  ambiguities: string[];
  /** Field the user wants to revise (no new value extracted — re-show card) */
  revisionTarget?: string;
  /** Field name to jump to (show that card) */
  navigationTarget?: string;
  /** Field to skip (null = current step) */
  skipTarget?: string | null;
  /** Contextual action inferred from freeform text on the current step */
  contextualAction?: {
    type: 'media_acknowledge' | 'schedule_preset';
    label: string;
    presetKey?: string;
  };
}

// ── State Resolution ─────────────────────────────────────────────────────

/**
 * A field that the resolver has determined needs input.
 */
export interface ResolvedPrompt {
  /** Which field is missing */
  field: string;
  /** Suggested card type to render */
  cardType: CardType;
  /** Priority (lower = ask first) */
  priority: number;
  /** Whether this field has a recommendation available */
  hasRecommendation?: boolean;
}

// ── Step (Decision Engine Output) ────────────────────────────────────────

/**
 * Output of getNextStep(): the single thing the assistant should do next.
 * No fixed step order — derived from session state at call time.
 *
 * - message: what the assistant says to the user
 * - requiredFields: which field(s) this step collects
 * - cardType: optional UI component to embed (omit for generation-ready)
 */
export interface Step {
  /** Assistant message to display */
  message: string;
  /** The field(s) this step is collecting */
  requiredFields: string[];
  /** Card to embed, if any */
  cardType?: CardType;
  /** True when all required fields are complete */
  ready: boolean;
}

// ── Conversation State ───────────────────────────────────────────────────

export interface ConversationState {
  messages: ChatMessage[];
  /** The active card message ID (only one card is active at a time) */
  activeCardId: string | null;
}
