// ══════════════════════════════════════════════════════════════════════════
// Campaign Strategy Architecture — Type Definitions
//
// Separates three concerns that were previously conflated in presets:
//   1. STRATEGY — the "why" (campaign objective)
//   2. PHASE    — the "what" (content persuasion sequence)
//   3. CADENCE  — the "when" (timing / pacing)
// ══════════════════════════════════════════════════════════════════════════

// ── Strategy Keys ───────────────────────────────────────────────────────

export type CampaignStrategyKey =
  | 'new_listing_launch'
  | 'open_house_push'
  | 'price_drop_push'
  | 'luxury_showcase'
  | 'stale_listing_revival'
  | 'evergreen_promotion';

// ── Phase Keys ──────────────────────────────────────────────────────────

export type CampaignPhaseKey =
  | 'announcement'
  | 'feature'
  | 'lifestyle'
  | 'authority'
  | 'social_proof'
  | 'cta'
  | 'reminder';

// ── Cadence Keys ────────────────────────────────────────────────────────

export type CampaignCadenceKey =
  | 'fast'
  | 'standard'
  | 'extended';

// ── Phase Definition ────────────────────────────────────────────────────

export interface CampaignPhaseDefinition {
  key: CampaignPhaseKey;
  label: string;
  /** What this phase should accomplish */
  objective: string;
  /** Hint for the type of media that works best */
  mediaHint: string;
  /** Tone/approach guidance for generation */
  toneGuidance: string;
  /** Suggested CTA approach */
  ctaGuidance: string;
}

// ── Strategy Definition ─────────────────────────────────────────────────

export interface CampaignStrategyDefinition {
  key: CampaignStrategyKey;
  label: string;
  description: string;
  /** Which campaign types this strategy supports */
  supportedCampaignTypes: string[];
  /** Ordered default phase sequence */
  defaultPhases: CampaignPhaseKey[];
  /** Additional phases that can be added */
  optionalPhases: CampaignPhaseKey[];
  /** Which cadences work well with this strategy */
  recommendedCadences: CampaignCadenceKey[];
  /** Preferred default cadence */
  defaultCadence: CampaignCadenceKey;
  /** Channel preferences: which channels should get priority */
  channelPreferences: string[];
  /** Media priority guidance */
  mediaPriority: 'exterior_first' | 'hero_first' | 'variety' | 'lifestyle_first';
  /** Default CTA style */
  ctaStyle: 'direct' | 'soft' | 'question' | 'urgency';
  /** User-facing explanation of the strategy */
  explanation: string;
}

// ── Cadence Definition ──────────────────────────────────────────────────

export interface CampaignCadenceDefinition {
  key: CampaignCadenceKey;
  label: string;
  description: string;
  /** Generate day numbers for N phases. Returns array of campaign days. */
  computeDays: (phaseCount: number) => number[];
  /** User-facing summary */
  explanation: string;
}

// ── Strategy Resolution Result ──────────────────────────────────────────

export interface StrategyResolution {
  strategy: CampaignStrategyKey;
  cadence: CampaignCadenceKey;
  phases: CampaignPhaseKey[];
  strategyReason: string;
  cadenceReason: string;
}

// ── Legacy Preset Mapping ───────────────────────────────────────────────

/** Maps old preset keys to new cadence keys for backward compatibility */
export const LEGACY_PRESET_TO_CADENCE: Record<string, CampaignCadenceKey> = {
  balanced: 'standard',
  aggressive: 'fast',
  luxury: 'extended',
};

/** Maps new cadence keys back to old preset keys for session memory compat */
export const CADENCE_TO_LEGACY_PRESET: Record<CampaignCadenceKey, string> = {
  fast: 'aggressive',
  standard: 'balanced',
  extended: 'luxury',
};
