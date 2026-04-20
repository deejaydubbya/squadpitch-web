import type { AssistantAction, AssistantSessionState } from '../types';
import type { Channel, DraftKind } from '@/hooks/useSquadpitch';
import type { ParseResult } from './types';
import { getAdapterSafe } from '../adapterRegistry';

// ── Pattern Matchers ─────────────────────────────────────────────────────

const MODE_PATTERNS: Array<{ pattern: RegExp; mode: 'campaign' | 'quick_post'; confidence: number }> = [
  { pattern: /\b(campaign|multi[- ]?post|sequence|series)\b/i, mode: 'campaign', confidence: 0.9 },
  { pattern: /\b(quick\s*post|single\s*post|one\s*post|just\s*a?\s*post)\b/i, mode: 'quick_post', confidence: 0.9 },
  // Weaker signals
  { pattern: /\b(post)\b/i, mode: 'quick_post', confidence: 0.5 },
  { pattern: /\b(create|make|generate)\b/i, mode: 'campaign', confidence: 0.3 },
];

const CHANNEL_PATTERNS: Array<{ pattern: RegExp; channel: Channel; confidence: number }> = [
  { pattern: /\b(instagram|insta|ig)\b/i, channel: 'INSTAGRAM' as Channel, confidence: 0.95 },
  { pattern: /\b(facebook|fb)\b/i, channel: 'FACEBOOK' as Channel, confidence: 0.95 },
  { pattern: /\b(linkedin|li)\b/i, channel: 'LINKEDIN' as Channel, confidence: 0.9 },
  { pattern: /\b(twitter|x)\b/i, channel: 'TWITTER' as Channel, confidence: 0.85 },
  { pattern: /\b(tiktok|tik\s*tok)\b/i, channel: 'TIKTOK' as Channel, confidence: 0.95 },
  { pattern: /\b(google|gmb|google\s*business)\b/i, channel: 'GOOGLE_BUSINESS' as Channel, confidence: 0.9 },
];

const TONE_PATTERNS: Array<{ pattern: RegExp; tone: string; confidence: number }> = [
  { pattern: /\b(luxury|premium|high[- ]end|exclusive|elegant)\b/i, tone: 'luxury', confidence: 0.9 },
  { pattern: /\b(urgent|hurry|limited|act now|don'?t miss|time[- ]sensitive)\b/i, tone: 'urgency', confidence: 0.85 },
  { pattern: /\b(casual|friendly|fun|playful|relaxed)\b/i, tone: 'casual', confidence: 0.85 },
  { pattern: /\b(professional|formal|corporate|authoritative)\b/i, tone: 'professional', confidence: 0.85 },
  { pattern: /\b(storytelling|narrative|emotional)\b/i, tone: 'storytelling', confidence: 0.8 },
];

const SCHEDULE_PATTERNS: Array<{ pattern: RegExp; hint: string; presetKey: string; confidence: number }> = [
  { pattern: /\b(recommend|suggested|use\s*recommend|use\s*suggested)\b/i, hint: 'recommended', presetKey: 'balanced', confidence: 0.95 },
  { pattern: /\b(aggressive|fast|rapid|quick cadence|daily)\b/i, hint: 'aggressive', presetKey: 'aggressive', confidence: 0.8 },
  { pattern: /\b(balanced|standard|normal|default)\b/i, hint: 'balanced', presetKey: 'balanced', confidence: 0.75 },
  { pattern: /\b(luxury|slow|spread\s*out|storytelling|drip)\b/i, hint: 'luxury', presetKey: 'luxury', confidence: 0.8 },
  { pattern: /\b(\d+)\s*(?:day|post)/i, hint: 'custom', presetKey: 'balanced', confidence: 0.5 },
];

const KIND_PATTERNS: Array<{ pattern: RegExp; kind: string; confidence: number }> = [
  { pattern: /\b(caption|write\s*a?\s*caption)s?\b/i, kind: 'CAPTION', confidence: 0.9 },
  { pattern: /\b(video\s*script|script|reel\s*script)s?\b/i, kind: 'VIDEO_SCRIPT', confidence: 0.9 },
  { pattern: /\b(post|social\s*post)s?\b/i, kind: 'POST', confidence: 0.7 },
];

// ── Main Parser ──────────────────────────────────────────────────────────

/**
 * Parse freeform user input and extract structured field updates.
 * Returns confidence scores and flags ambiguities.
 *
 * Safety: Does not overwrite fields that already have high-confidence values
 * unless the user explicitly uses revision language ("change", "switch", "use X instead").
 */
export function parseUserInput(
  input: string,
  session: AssistantSessionState
): ParseResult {
  const actions: AssistantAction[] = [];
  const detectedFields: string[] = [];
  const confidence: Record<string, number> = {};
  const ambiguities: string[] = [];
  const text = input.trim();

  if (!text) {
    return { actions, detectedFields, remainingRequired: [], confidence, ambiguities };
  }

  const adapter = getAdapterSafe(session.industryKey);
  const isRevision = /\b(change|switch|update|replace|use .* instead|redo|different)\b/i.test(text);

  // ── Detect mode ──
  if (!session.mode || isRevision) {
    let bestMode: { mode: 'campaign' | 'quick_post'; confidence: number } | null = null;

    for (const { pattern, mode, confidence: conf } of MODE_PATTERNS) {
      if (pattern.test(text) && (!bestMode || conf > bestMode.confidence)) {
        bestMode = { mode, confidence: conf };
      }
    }

    if (bestMode && bestMode.confidence >= 0.5) {
      // Only set if not already set or if revision
      if (!session.mode || isRevision) {
        actions.push({ type: 'SET_MODE', payload: bestMode.mode });
        detectedFields.push(`mode: ${bestMode.mode}`);
        confidence['mode'] = bestMode.confidence;
      }
    } else if (bestMode && bestMode.confidence < 0.5) {
      ambiguities.push(`Did you mean to create a ${bestMode.mode}?`);
    }
  }

  // ── Detect campaign type ──
  const effectiveMode = session.mode ?? inferredModeFromActions(actions);

  if (!session.campaignType || isRevision) {
    let bestMatch: { value: string; label: string; conf: number } | null = null;

    for (const ct of adapter.campaignTypes) {
      const labelPattern = new RegExp(`\\b${escapeRegex(ct.label)}\\b`, 'i');
      const valuePattern = new RegExp(`\\b${ct.value.replace(/_/g, '[_ ]')}\\b`, 'i');

      if (labelPattern.test(text)) {
        const conf = 0.95; // exact label match
        if (!bestMatch || conf > bestMatch.conf) {
          bestMatch = { value: ct.value, label: ct.label, conf };
        }
      } else if (valuePattern.test(text)) {
        const conf = 0.85; // value slug match
        if (!bestMatch || conf > bestMatch.conf) {
          bestMatch = { value: ct.value, label: ct.label, conf };
        }
      }
    }

    if (bestMatch) {
      actions.push({ type: 'SET_CAMPAIGN_TYPE', payload: bestMatch.value as any });
      detectedFields.push(`campaignType: ${bestMatch.label}`);
      confidence['campaignType'] = bestMatch.conf;
    }
  }

  // ── Detect channels ──
  if (session.channels.length === 0 || isRevision) {
    const detectedChannels: Array<{ channel: Channel; conf: number }> = [];

    for (const { pattern, channel, confidence: conf } of CHANNEL_PATTERNS) {
      if (pattern.test(text)) {
        detectedChannels.push({ channel, conf });
      }
    }

    if (detectedChannels.length > 0) {
      const channels = detectedChannels.map((c) => c.channel);
      const avgConf = detectedChannels.reduce((sum, c) => sum + c.conf, 0) / detectedChannels.length;

      if (effectiveMode === 'campaign' || effectiveMode === null) {
        actions.push({ type: 'SET_CHANNELS', payload: channels, source: 'user' });
        detectedFields.push(`channels: ${channels.join(', ')}`);
      } else if (effectiveMode === 'quick_post') {
        actions.push({ type: 'SET_QUICK_POST_CHANNEL', payload: channels[0] });
        detectedFields.push(`channel: ${channels[0]}`);
      }
      confidence['channels'] = avgConf;
    }

    // Ambiguity: "x" could be Twitter
    if (/\bx\b/i.test(text) && !(/\b(twitter)\b/i.test(text))) {
      const hasOtherChannels = detectedChannels.some((c) => c.channel !== ('TWITTER' as Channel));
      if (!hasOtherChannels && detectedChannels.some((c) => c.channel === ('TWITTER' as Channel))) {
        ambiguities.push(`Did you mean Twitter/X as a channel?`);
      }
    }
  }

  // ── Detect tone ──
  const detectedTones: Array<{ tone: string; conf: number }> = [];
  for (const { pattern, tone, confidence: conf } of TONE_PATTERNS) {
    if (pattern.test(text)) {
      detectedTones.push({ tone, conf });
    }
  }

  if (detectedTones.length > 0) {
    const toneStr = detectedTones.map((t) => t.tone).join(', ');
    const avgConf = detectedTones.reduce((sum, t) => sum + t.conf, 0) / detectedTones.length;

    if (effectiveMode === 'quick_post') {
      const guidance = detectedTones.map((t) => `Tone: ${t.tone}`).join('. ');
      actions.push({ type: 'SET_QUICK_POST_GUIDANCE', payload: guidance });
    }
    // For campaigns, tone is included in detectedFields for context but doesn't map to a specific state field
    detectedFields.push(`tone: ${toneStr}`);
    confidence['tone'] = avgConf;

    if (detectedTones.length > 1) {
      ambiguities.push(`Multiple tones detected (${toneStr}). The first will take priority.`);
    }
  }

  // ── Detect quick post kind ──
  if (effectiveMode === 'quick_post' || !session.mode) {
    for (const { pattern, kind, confidence: conf } of KIND_PATTERNS) {
      if (pattern.test(text)) {
        actions.push({ type: 'SET_QUICK_POST_KIND', payload: kind as DraftKind });
        detectedFields.push(`kind: ${kind.toLowerCase().replace('_', ' ')}`);
        confidence['kind'] = conf;
        break;
      }
    }
  }

  // ── Detect schedule hints ──
  if (session.slots.length === 0 || isRevision) {
    for (const { pattern, hint, presetKey, confidence: conf } of SCHEDULE_PATTERNS) {
      if (pattern.test(text)) {
        actions.push({ type: 'SET_PREFERRED_PRESET', payload: presetKey });
        detectedFields.push(`schedule: ${hint}`);
        confidence['schedule'] = conf;
        break; // only first match
      }
    }
  }

  // ── Detect revision-without-value (re-show card) ──
  // If revision language detected but no actions extracted, detect which field to re-prompt
  let revisionTarget: string | undefined;
  if (isRevision && actions.length === 0) {
    revisionTarget = detectRevisionTarget(text, session);
  }

  return {
    actions,
    detectedFields,
    remainingRequired: [], // Filled by caller using stateResolver
    confidence,
    ambiguities,
    revisionTarget,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferredModeFromActions(actions: AssistantAction[]): 'campaign' | 'quick_post' | null {
  const modeAction = actions.find((a) => a.type === 'SET_MODE');
  if (modeAction && modeAction.type === 'SET_MODE') return modeAction.payload;
  return null;
}

/**
 * When revision language is detected but no new value is extracted,
 * identify which field the user wants to change based on field-name keywords.
 */
const REVISION_FIELD_PATTERNS: Array<{ pattern: RegExp; field: string }> = [
  { pattern: /\b(property|listing|address|home|house|vehicle)s?\b/i, field: 'selectedPropertyId' },
  { pattern: /\b(campaign\s*type|type\s*of\s*campaign)s?\b/i, field: 'campaignType' },
  { pattern: /\b(channel|platform|network)s?\b/i, field: 'channels' },
  { pattern: /\b(media|image|photo|picture|asset)s?\b/i, field: 'selectedMediaIds' },
  { pattern: /\b(schedule|timing|cadence|calendar|days?)s?\b/i, field: 'slots' },
  { pattern: /\b(mode|format)s?\b/i, field: 'mode' },
];

function detectRevisionTarget(text: string, session: AssistantSessionState): string | undefined {
  for (const { pattern, field } of REVISION_FIELD_PATTERNS) {
    if (pattern.test(text)) {
      // Only target fields that are already set (otherwise stateResolver handles it)
      if (isFieldSet(field, session)) {
        return field;
      }
    }
  }
  return undefined;
}

function isFieldSet(field: string, session: AssistantSessionState): boolean {
  switch (field) {
    case 'mode': return session.mode !== null;
    case 'selectedPropertyId': return session.selectedPropertyId !== null;
    case 'campaignType': return session.campaignType !== null;
    case 'channels': return session.channels.length > 0;
    case 'selectedMediaIds': return session.selectedMediaIds.length > 0;
    case 'slots': return session.slots.length > 0;
    default: return false;
  }
}

// ── Property Resolution ─────────────────────────────────────────────────

export interface PropertyCandidate {
  id: string;
  title: string;
  address?: string;
  dataJson: Record<string, unknown>;
}

export interface PropertyResolutionResult {
  /** Single best match (confidence >= 0.75) */
  match?: { property: PropertyCandidate; confidence: number };
  /** Multiple viable matches needing disambiguation (0.5 <= confidence < 0.75 or tied) */
  ambiguous?: PropertyCandidate[];
}

/**
 * Resolve a property reference from freeform text against available properties.
 *
 * Matching strategies (in priority order):
 * 1. Exact address match (full string equality after normalization)
 * 2. Starts-with match (user typed beginning of address)
 * 3. Street-number + street-name match
 * 4. Word-overlap fuzzy matching
 *
 * Returns disambiguation list if multiple properties score similarly.
 */
export function resolvePropertyFromText(
  text: string,
  properties: PropertyCandidate[]
): PropertyResolutionResult | null {
  if (!properties || properties.length === 0) return null;

  // Strip filler words to isolate the address reference
  const cleaned = text
    .replace(/\b(use|for|listing|property|at|the|a|an|my|this|that|create|campaign|content)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to extract address-like fragment: number + street words (stop at common non-address words)
  const addressMatch = cleaned.match(/(\d+\s+[A-Za-z][A-Za-z\s.]*?)(?:\s*(?:,|$|\b(?:for|and|with|on|to)\b))/i)
    || cleaned.match(/(\d+\s+[A-Za-z][A-Za-z\s.]+)/);
  const fragment = (addressMatch ? addressMatch[1] : cleaned).trim().toLowerCase();

  if (fragment.length < 3) return null;

  // Score all properties
  const scored: Array<{ property: PropertyCandidate; score: number }> = [];

  for (const prop of properties) {
    const address = ((prop.dataJson?.address as string) || prop.title || '').toLowerCase();
    if (!address) continue;

    let score = 0;

    // Normalize both for comparison
    const normalizedAddr = address.replace(/[,.\s]+/g, ' ').trim();
    const normalizedFrag = fragment.replace(/[,.\s]+/g, ' ').trim();

    // 1. Exact match (after normalization)
    if (normalizedAddr === normalizedFrag) {
      score = 1.0;
    }
    // 2. Address starts with fragment
    else if (normalizedAddr.startsWith(normalizedFrag)) {
      score = 0.95;
    }
    // 3. Fragment is contained in address
    else if (normalizedAddr.includes(normalizedFrag)) {
      score = 0.85;
    }
    // 4. Street-number + street-name match
    else {
      const fragNumMatch = normalizedFrag.match(/^(\d+)\s+(.+)/);
      const addrNumMatch = normalizedAddr.match(/^(\d+)\s+(.+)/);
      if (fragNumMatch && addrNumMatch && fragNumMatch[1] === addrNumMatch[1]) {
        // Same street number — check street name overlap
        const fragStreet = fragNumMatch[2].split(/\s+/);
        const addrStreet = addrNumMatch[2];
        const streetMatched = fragStreet.filter((w) => w.length > 1 && addrStreet.includes(w));
        if (streetMatched.length === fragStreet.length) {
          score = 0.9; // all street words match
        } else if (streetMatched.length >= 1 && streetMatched.length / fragStreet.length >= 0.5) {
          score = 0.75; // partial street match with same number
        }
      }
      // 5. General word overlap
      else {
        const words = normalizedFrag.split(/\s+/).filter((w) => w.length > 1);
        const matched = words.filter((w) => normalizedAddr.includes(w));
        if (matched.length === words.length && words.length >= 2) {
          score = 0.7;
        } else if (matched.length >= 2 && matched.length / words.length >= 0.7) {
          score = 0.5;
        }
      }
    }

    if (score > 0) {
      scored.push({ property: prop, score });
    }
  }

  if (scored.length === 0) return null;

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  // High confidence single match
  if (best.score >= 0.75) {
    // Check if there's a close second (within 0.1) — if so, disambiguate
    const closeMatches = scored.filter((s) => s.score >= best.score - 0.1);
    if (closeMatches.length > 1) {
      return { ambiguous: closeMatches.map((s) => s.property) };
    }
    return { match: { property: best.property, confidence: best.score } };
  }

  // Medium confidence — offer disambiguation
  const viable = scored.filter((s) => s.score >= 0.5);
  if (viable.length === 1) {
    return { match: { property: viable[0].property, confidence: viable[0].score } };
  }
  if (viable.length > 1) {
    return { ambiguous: viable.map((s) => s.property) };
  }

  return null;
}
