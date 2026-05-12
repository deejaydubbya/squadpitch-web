import type {
  Channel,
  ContentPreferences,
  PreferredTone,
  PreferredCadence,
  MediaOrderPreference,
} from '@/hooks/useSquadpitch';
import type {
  AssistantCampaignType,
  CampaignSourceType,
  SessionMemory,
} from './types';
import { DEFAULT_CHANNELS_BY_CAMPAIGN_TYPE } from './defaults';

// ── Packed default-campaign-type format ─────────────────────────────
//
// `ContentPreferences.defaultCampaignType` is a single string column,
// but we want to let users configure a different default per source
// type (property / data_item / idea). To avoid a schema change for
// MVP, we encode the three values into one string:
//
//   "property:just_listed|data_item:educational|idea:lead_generation"
//
// Order of entries does not matter. Unknown keys, malformed entries,
// and empty values are dropped silently — the assistant treats a
// missing source-specific default as "fall back to the static
// default", so silent drops are safe.
//
// These helpers are the single source of truth for the format.
// Anything that writes or reads `defaultCampaignType` must go
// through them so the format can evolve without churn.

const VALID_SOURCE_KEYS: readonly CampaignSourceType[] = [
  'property',
  'data_item',
  'idea',
];

function isValidSourceKey(key: string): key is CampaignSourceType {
  return (VALID_SOURCE_KEYS as readonly string[]).includes(key);
}

export type DefaultCampaignTypeMap = Partial<Record<CampaignSourceType, string>>;

export function packDefaultCampaignTypes(map: DefaultCampaignTypeMap): string | null {
  const parts: string[] = [];
  for (const key of VALID_SOURCE_KEYS) {
    const raw = map[key];
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    if (!value) continue;
    // The campaign-type value itself can't contain our delimiters.
    // Strip them defensively so a stray ':' or '|' from a future
    // adapter doesn't corrupt the encoding.
    const safe = value.replace(/[:|]/g, '');
    if (!safe) continue;
    parts.push(`${key}:${safe}`);
  }
  return parts.length > 0 ? parts.join('|') : null;
}

export function unpackDefaultCampaignTypes(
  packed: string | null | undefined,
): DefaultCampaignTypeMap {
  const out: DefaultCampaignTypeMap = {};
  if (!packed || typeof packed !== 'string') return out;
  for (const part of packed.split('|')) {
    const colon = part.indexOf(':');
    if (colon <= 0) continue;
    const rawKey = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (!value) continue;
    if (!isValidSourceKey(rawKey)) continue;
    out[rawKey] = value;
  }
  return out;
}

/**
 * Resolve the per-source default campaign type for the assistant.
 * Returns null when the user hasn't set a default for that source —
 * caller is expected to fall through to its own static default.
 */
export function getDefaultCampaignTypeForSource(
  packed: string | null | undefined,
  source: CampaignSourceType,
): string | null {
  const map = unpackDefaultCampaignTypes(packed);
  return map[source] ?? null;
}

// ══════════════════════════════════════════════════════════════════════════
// Content Preferences — Utility layer
//
// Resolves defaults from persistent preferences, session memory, and
// static defaults. Preferences are suggestions, never hard constraints.
//
// Priority order for any default:
//   1. User's explicit choice in current session (highest priority)
//   2. Session memory (last-used, survives session reset)
//   3. Persistent content preferences (account-level)
//   4. Static defaults (code-level fallback)
// ══════════════════════════════════════════════════════════════════════════

// ── Resolved Defaults ────────────────────────────────────────────────────

export interface ResolvedDefaults {
  channels: Channel[];
  quickPostChannel: Channel | null;
  tone: PreferredTone | null;
  ctaStyle: string | null;
  campaignCadence: PreferredCadence | null;
  campaignType: AssistantCampaignType | null;
  mediaOrder: MediaOrderPreference | null;
  contentBucket: string | null;
  requireReview: boolean;
  autoMedia: boolean;
}

/**
 * Resolves the effective defaults for the assistant by layering
 * persistent preferences over session memory and static defaults.
 *
 * This is the single source of truth for "what should the assistant use
 * as defaults when the user hasn't explicitly chosen yet."
 */
export function resolveDefaults(
  preferences: ContentPreferences | null | undefined,
  memory: SessionMemory,
  campaignType?: AssistantCampaignType | null,
): ResolvedDefaults {
  const staticChannels = campaignType
    ? DEFAULT_CHANNELS_BY_CAMPAIGN_TYPE[campaignType] ?? []
    : [];

  // Channel resolution: memory > preferences > static defaults
  const channels =
    memory.preferredChannels.length > 0
      ? memory.preferredChannels
      : preferences?.preferredChannels && preferences.preferredChannels.length > 0
        ? preferences.preferredChannels
        : staticChannels;

  const quickPostChannel =
    preferences?.defaultQuickPostChannel ?? channels[0] ?? null;

  // Tone: preferences only (session doesn't store tone)
  const tone = preferences?.preferredTone ?? null;

  // CTA style
  const ctaStyle = preferences?.preferredCtaStyle ?? null;

  // Campaign cadence: memory > preferences > null
  const campaignCadence =
    (memory.preferredPreset as PreferredCadence | null) ??
    preferences?.preferredCampaignCadence ??
    null;

  // Campaign type: memory > preferences > null
  const resolvedCampaignType =
    memory.preferredCampaignType ??
    (preferences?.defaultCampaignType as AssistantCampaignType | null) ??
    null;

  // Media
  const mediaOrder = preferences?.mediaOrderPreference ?? null;

  // Content bucket
  const contentBucket = preferences?.defaultContentBucket ?? null;

  // Workflow
  const requireReview = preferences?.alwaysRequireReview ?? true;
  const autoMedia = preferences?.autoGenerateMedia ?? false;

  return {
    channels,
    quickPostChannel,
    tone,
    ctaStyle,
    campaignCadence,
    campaignType: resolvedCampaignType,
    mediaOrder,
    contentBucket,
    requireReview,
    autoMedia,
  };
}

// ── Prompt Context Snippet ───────────────────────────────────────────────

/**
 * Builds a preferences context string suitable for injection into
 * generation prompts. Returns null if no meaningful preferences exist.
 *
 * This is intentionally concise — the backend uses this as a hint,
 * not a rigid template.
 */
export function buildPreferencesContext(
  preferences: ContentPreferences | null | undefined,
): string | null {
  if (!preferences) return null;

  const parts: string[] = [];

  if (preferences.preferredTone) {
    parts.push(`Preferred tone: ${preferences.preferredTone}`);
  }

  if (preferences.preferredCtaStyle && preferences.preferredCtaStyle !== 'none') {
    const ctaDescriptions: Record<string, string> = {
      direct: 'Use direct, action-oriented CTAs (e.g., "Call now", "Book a showing")',
      soft: 'Use soft CTAs that invite engagement (e.g., "Learn more", "What do you think?")',
      question: 'End with a question to drive comments',
      urgency: 'Use urgency-based CTAs (e.g., "Don\'t miss out", "Limited time")',
    };
    parts.push(ctaDescriptions[preferences.preferredCtaStyle] ?? `CTA style: ${preferences.preferredCtaStyle}`);
  }

  if (preferences.preferredChannels.length > 0) {
    parts.push(`Primary channels: ${preferences.preferredChannels.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

// ── Tone Options ─────────────────────────────────────────────────────────

export const TONE_OPTIONS: Array<{ value: PreferredTone; label: string; description: string }> = [
  { value: 'professional', label: 'Professional', description: 'Clean, authoritative, business-focused' },
  { value: 'casual', label: 'Casual', description: 'Friendly, approachable, conversational' },
  { value: 'witty', label: 'Witty', description: 'Clever, playful, attention-grabbing' },
  { value: 'inspirational', label: 'Inspirational', description: 'Motivating, aspirational, uplifting' },
  { value: 'urgent', label: 'Urgent', description: 'Time-sensitive, action-driven, compelling' },
  { value: 'luxury', label: 'Luxury', description: 'Sophisticated, exclusive, premium' },
];

export const CTA_STYLE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'direct', label: 'Direct', description: '"Call now", "Book a showing", "DM me"' },
  { value: 'soft', label: 'Soft', description: '"Learn more", "See details", "Link in bio"' },
  { value: 'question', label: 'Question', description: 'End with a question to drive engagement' },
  { value: 'urgency', label: 'Urgency', description: '"Don\'t miss out", "Act fast"' },
  { value: 'none', label: 'None', description: 'No explicit CTA in posts' },
];

export const CADENCE_OPTIONS: Array<{ value: PreferredCadence; label: string; description: string }> = [
  { value: 'aggressive', label: 'Fast', description: 'Front-loaded posts for maximum early impact' },
  { value: 'balanced', label: 'Standard', description: 'Even pacing over about a week' },
  { value: 'luxury', label: 'Extended', description: 'Slow build over 10+ days for sustained storytelling' },
];

export const MEDIA_ORDER_OPTIONS: Array<{ value: MediaOrderPreference; label: string; description: string }> = [
  { value: 'exterior_first', label: 'Exterior First', description: 'Always lead with the best exterior shot' },
  { value: 'hero_first', label: 'Cover Photo First', description: 'Use the highest-quality image regardless of type' },
  { value: 'ai_recommended', label: 'AI Recommended', description: 'Let the system pick optimal ordering' },
  { value: 'manual', label: 'Manual', description: 'Always let me choose the order' },
];
