import type { Channel, Draft } from '@/hooks/useSquadpitch';

// ── Suggestion Categories ────────────────────────────────────────────────

export type OptimizationCategory =
  | 'caption'
  | 'media'
  | 'schedule'
  | 'channel'
  | 'campaign_structure';

// ── Suggestion Priority ──────────────────────────────────────────────────

export type SuggestionPriority = 'high' | 'medium' | 'low';

// ── Suggestion Basis ─────────────────────────────────────────────────────

export type SuggestionBasis = 'heuristic' | 'performance_data';

// ── Apply Action Type ────────────────────────────────────────────────────

export type ApplyActionType =
  | 'inline_action'     // Triggers an existing inline action (rewrite, improve, etc.)
  | 'reorder_media'     // Reorders media on a draft
  | 'reschedule'        // Adjusts schedule timing
  | 'navigate'          // Navigates to campaign builder / editor
  | 'generate';         // Generates new content (variations, follow-ups)

// ── Core Suggestion Interface ────────────────────────────────────────────

export interface OptimizationSuggestion {
  id: string;
  category: OptimizationCategory;
  priority: SuggestionPriority;
  basis: SuggestionBasis;

  /** Short action-oriented label (e.g. "Shorten caption for Instagram") */
  title: string;
  /** Longer explanation of why this is suggested */
  description: string;
  /** What data/heuristic drove this suggestion */
  reasoning: string;

  /** How to apply this suggestion */
  applyAction: ApplyActionType;
  /** Payload for applying (varies by action type) */
  applyPayload: OptimizationApplyPayload;

  /** Which draft(s) this applies to */
  targetDraftIds: string[];
  /** Which campaign this applies to (null for standalone drafts) */
  targetCampaignId: string | null;
}

// ── Apply Payloads ───────────────────────────────────────────────────────

export type OptimizationApplyPayload =
  | InlineActionPayload
  | ReorderMediaPayload
  | ReschedulePayload
  | NavigatePayload
  | GeneratePayload;

export interface InlineActionPayload {
  type: 'inline_action';
  actionType: string; // matches InlineActionType
  params?: Record<string, string>;
}

export interface ReorderMediaPayload {
  type: 'reorder_media';
  suggestedOrder: string[]; // asset IDs in recommended order
  reason: string;
}

export interface ReschedulePayload {
  type: 'reschedule';
  suggestedSpreadDays: number;
  reason: string;
}

export interface NavigatePayload {
  type: 'navigate';
  href: string;
}

export interface GeneratePayload {
  type: 'generate';
  actionType: 'variations' | 'follow_ups';
  channel?: Channel;
  count?: number;
}

// ── Engine Input ─────────────────────────────────────────────────────────

export interface OptimizationInput {
  drafts: Draft[];
  campaignId?: string | null;
  campaignType?: string | null;
  connectedChannels: Channel[];
  clientId: string;
}
