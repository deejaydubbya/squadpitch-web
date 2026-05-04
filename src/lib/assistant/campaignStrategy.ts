// ══════════════════════════════════════════════════════════════════════════
// Campaign Strategy Architecture — Definitions
//
// Config-driven strategy, phase, and cadence definitions.
// No scattered conditionals — everything is declared here.
// ══════════════════════════════════════════════════════════════════════════

import type {
  CampaignStrategyKey,
  CampaignPhaseKey,
  CampaignCadenceKey,
  CampaignPhaseDefinition,
  CampaignStrategyDefinition,
  CampaignCadenceDefinition,
} from './campaignStrategy.types';

// ── Phase Definitions ───────────────────────────────────────────────────

export const CAMPAIGN_PHASES: Record<CampaignPhaseKey, CampaignPhaseDefinition> = {
  announcement: {
    key: 'announcement',
    label: 'Launch Announcement',
    objective: 'First impression — announce with impact and grab attention',
    mediaHint: 'Best exterior / cover photo',
    toneGuidance: 'Attention-grabbing, exciting, high-energy',
    ctaGuidance: 'Invite curiosity — "See more", "Link in bio"',
  },
  feature: {
    key: 'feature',
    label: 'Feature Highlight',
    objective: 'Showcase key features, upgrades, and standout details',
    mediaHint: 'Kitchen, living room, or upgrades',
    toneGuidance: 'Informative, specific, benefit-focused',
    ctaGuidance: 'Encourage deeper exploration — "Schedule a tour", "See the full gallery"',
  },
  lifestyle: {
    key: 'lifestyle',
    label: 'Lifestyle Story',
    objective: 'Paint the lifestyle — who lives here, neighborhood feel, emotional connection',
    mediaHint: 'Backyard, living room, or neighborhood',
    toneGuidance: 'Emotional, aspirational, story-driven',
    ctaGuidance: 'Invite imagination — "Picture yourself here", "Can you see it?"',
  },
  authority: {
    key: 'authority',
    label: 'Authority & Expertise',
    objective: 'Build trust through agent expertise, market knowledge, and track record',
    mediaHint: 'Polished exterior or professional headshot',
    toneGuidance: 'Authoritative, confident, knowledgeable',
    ctaGuidance: 'Position as expert — "Let me guide you", "Questions? I have answers"',
  },
  social_proof: {
    key: 'social_proof',
    label: 'Social Proof',
    objective: 'Build trust with testimonials, showing data, market validation',
    mediaHint: 'Polished exterior or strong detail shot',
    toneGuidance: 'Credible, relatable, evidence-based',
    ctaGuidance: 'Leverage trust — "Join satisfied buyers", "See what others are saying"',
  },
  cta: {
    key: 'cta',
    label: 'Final Push',
    objective: 'Create urgency and drive action — last chance, price anchoring, scarcity',
    mediaHint: 'Emotionally resonant or cover photo',
    toneGuidance: 'Urgent, compelling, action-oriented',
    ctaGuidance: 'Direct action — "Call now", "Don\'t miss out", "Book your showing today"',
  },
  reminder: {
    key: 'reminder',
    label: 'Reminder / Countdown',
    objective: 'Time-sensitive reminder for events or deadlines',
    mediaHint: 'Eye-catching exterior or event-relevant imagery',
    toneGuidance: 'Urgent but helpful, time-aware',
    ctaGuidance: 'Time-bound — "This Saturday", "Only 2 days left", "RSVP now"',
  },
};

// ── Strategy Definitions ───────────────────────────────────────────���────

export const CAMPAIGN_STRATEGIES: Record<CampaignStrategyKey, CampaignStrategyDefinition> = {
  new_listing_launch: {
    key: 'new_listing_launch',
    label: 'New Listing Launch',
    description: 'Announce a new listing with maximum launch momentum',
    supportedCampaignTypes: ['just_listed'],
    defaultPhases: ['announcement', 'feature', 'lifestyle', 'social_proof', 'cta'],
    optionalPhases: ['authority'],
    recommendedCadences: ['fast', 'standard'],
    defaultCadence: 'fast',
    channelPreferences: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
    mediaPriority: 'exterior_first',
    ctaStyle: 'direct',
    explanation: 'Starts with a strong announcement, highlights key features, builds emotional interest through lifestyle content, adds social proof, and closes with a direct call to action.',
  },
  open_house_push: {
    key: 'open_house_push',
    label: 'Open House Push',
    description: 'Drive attendance to an upcoming open house event',
    supportedCampaignTypes: ['open_house'],
    defaultPhases: ['announcement', 'feature', 'reminder', 'cta'],
    optionalPhases: ['lifestyle', 'social_proof'],
    recommendedCadences: ['fast', 'standard'],
    defaultCadence: 'fast',
    channelPreferences: ['INSTAGRAM', 'FACEBOOK'],
    mediaPriority: 'exterior_first',
    ctaStyle: 'urgency',
    explanation: 'Announces the open house, highlights property features, sends event reminders, and drives RSVPs with urgency-based CTAs.',
  },
  price_drop_push: {
    key: 'price_drop_push',
    label: 'Price Drop Push',
    description: 'Capitalize on a price reduction to drive urgency',
    supportedCampaignTypes: ['price_drop'],
    defaultPhases: ['announcement', 'feature', 'cta'],
    optionalPhases: ['lifestyle', 'social_proof'],
    recommendedCadences: ['fast'],
    defaultCadence: 'fast',
    channelPreferences: ['INSTAGRAM', 'FACEBOOK'],
    mediaPriority: 'hero_first',
    ctaStyle: 'urgency',
    explanation: 'Announces the price reduction, reminds buyers of key features at the new price, and pushes urgency to drive quick action.',
  },
  luxury_showcase: {
    key: 'luxury_showcase',
    label: 'Luxury Showcase',
    description: 'Build exclusivity and emotional connection for high-value properties',
    supportedCampaignTypes: ['just_listed', 'general_promotion'],
    defaultPhases: ['announcement', 'lifestyle', 'feature', 'authority', 'cta'],
    optionalPhases: ['social_proof'],
    recommendedCadences: ['extended', 'standard'],
    defaultCadence: 'extended',
    channelPreferences: ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'],
    mediaPriority: 'lifestyle_first',
    ctaStyle: 'soft',
    explanation: 'Uses a slower, story-driven approach to build emotional connection and perceived value. Leads with lifestyle before features, building exclusivity and anticipation.',
  },
  stale_listing_revival: {
    key: 'stale_listing_revival',
    label: 'Stale Listing Revival',
    description: 'Reignite interest for a listing that has been on market too long',
    supportedCampaignTypes: ['general_promotion'],
    defaultPhases: ['announcement', 'feature', 'lifestyle', 'social_proof', 'cta'],
    optionalPhases: ['authority'],
    recommendedCadences: ['standard', 'extended'],
    defaultCadence: 'standard',
    channelPreferences: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
    mediaPriority: 'variety',
    ctaStyle: 'question',
    explanation: 'Repositions a stale listing with fresh angles. Highlights overlooked features, paints a new lifestyle narrative, and uses social proof to rebuild momentum.',
  },
  evergreen_promotion: {
    key: 'evergreen_promotion',
    label: 'Evergreen Promotion',
    description: 'Flexible promotional campaign for any listing scenario',
    supportedCampaignTypes: ['general_promotion', 'just_listed', 'open_house', 'price_drop'],
    defaultPhases: ['announcement', 'feature', 'lifestyle', 'authority', 'cta'],
    optionalPhases: ['social_proof', 'reminder'],
    recommendedCadences: ['standard', 'fast', 'extended'],
    defaultCadence: 'standard',
    channelPreferences: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
    mediaPriority: 'hero_first',
    ctaStyle: 'direct',
    explanation: 'A well-rounded multi-touch campaign: awareness, interest, trust, and action — adapted to the listing context.',
  },
};

// ── Cadence Definitions ────────────────────────────────────────────────���

export const CAMPAIGN_CADENCES: Record<CampaignCadenceKey, CampaignCadenceDefinition> = {
  fast: {
    key: 'fast',
    label: 'Fast',
    description: 'Front-loaded posts for maximum early impact',
    explanation: 'Concentrated posting in the first few days to maximize launch momentum and urgency.',
    computeDays: (phaseCount: number): number[] => {
      // Front-loaded: day 1, 1, 2, 3, 4, 5, ...
      // First two phases can share Day 1, then daily
      if (phaseCount <= 1) return [1];
      if (phaseCount === 2) return [1, 2];
      if (phaseCount === 3) return [1, 2, 3];
      // 4+: first two on day 1, then one per day
      const days = [1];
      for (let i = 1; i < phaseCount; i++) {
        days.push(i);
      }
      return days;
    },
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    description: 'Even pacing over about a week',
    explanation: 'Balanced spacing across 7 days for steady engagement without overwhelming the audience.',
    computeDays: (phaseCount: number): number[] => {
      // Spread evenly across ~7 days
      if (phaseCount <= 1) return [1];
      const maxDay = 7;
      const days: number[] = [];
      for (let i = 0; i < phaseCount; i++) {
        days.push(Math.round(1 + (i / (phaseCount - 1)) * (maxDay - 1)));
      }
      return days;
    },
  },
  extended: {
    key: 'extended',
    label: 'Extended',
    description: 'Slow build over 10+ days for sustained storytelling',
    explanation: 'Slower, more deliberate pacing designed to build anticipation and emotional connection over time.',
    computeDays: (phaseCount: number): number[] => {
      // Spread across ~10-14 days
      if (phaseCount <= 1) return [1];
      const maxDay = Math.max(10, phaseCount * 2 + 2);
      const days: number[] = [];
      for (let i = 0; i < phaseCount; i++) {
        days.push(Math.round(1 + (i / (phaseCount - 1)) * (maxDay - 1)));
      }
      return days;
    },
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────

/** Get the phase definition for a given key */
export function getPhase(key: CampaignPhaseKey): CampaignPhaseDefinition {
  return CAMPAIGN_PHASES[key];
}

/** Get the strategy definition for a given key */
export function getStrategy(key: CampaignStrategyKey): CampaignStrategyDefinition {
  return CAMPAIGN_STRATEGIES[key];
}

/** Get the cadence definition for a given key */
export function getCadence(key: CampaignCadenceKey): CampaignCadenceDefinition {
  return CAMPAIGN_CADENCES[key];
}

/** Get all strategy options as a list (for UI rendering) */
export function getStrategyOptions(): CampaignStrategyDefinition[] {
  return Object.values(CAMPAIGN_STRATEGIES);
}

/** Get strategies that support a given campaign type */
export function getStrategiesForCampaignType(campaignType: string): CampaignStrategyDefinition[] {
  return Object.values(CAMPAIGN_STRATEGIES).filter(
    (s) => s.supportedCampaignTypes.includes(campaignType)
  );
}

/** Get all cadence options as a list (for UI rendering) */
export function getCadenceOptions(): CampaignCadenceDefinition[] {
  return Object.values(CAMPAIGN_CADENCES);
}

/**
 * Build a user-facing strategy explanation string.
 * Example: "This campaign uses a New Listing Launch strategy with Fast cadence.
 * We'll start with awareness, then highlight standout features, build emotional interest,
 * and finish with a strong call to action."
 */
export function buildStrategyExplanation(
  strategyKey: CampaignStrategyKey,
  cadenceKey: CampaignCadenceKey,
): string {
  const strategy = CAMPAIGN_STRATEGIES[strategyKey];
  const cadence = CAMPAIGN_CADENCES[cadenceKey];

  const phaseNames = strategy.defaultPhases
    .map((p) => CAMPAIGN_PHASES[p].label.toLowerCase())
    .join(', then ');

  return [
    `${strategy.label} strategy with ${cadence.label} cadence.`,
    `The campaign follows ${phaseNames}.`,
    strategy.explanation,
  ].join(' ');
}
