import type { Channel, MediaAsset, AutopilotTriggerType } from '@/hooks/useSquadpitch';
import type { AssistantCampaignType } from '../types';
import type {
  CampaignTypeRecommendation,
  ChannelRecommendation,
  RecommendChannelsInput,
  MediaPrioritization,
  PrioritizeMediaInput,
} from '../campaignIntelligence.types';
import {
  SEQUENCE_PRESETS,
  SLOT_PURPOSE_HINTS,
  SLOT_MEDIA_HINTS,
} from '../schedulePresets';
import type { IndustryAdapter, TriggerConfig } from '../industryAdapter';
import type { StrategyResolution, CampaignStrategyKey, CampaignCadenceKey } from '../campaignStrategy.types';
import { CAMPAIGN_STRATEGIES, CAMPAIGN_CADENCES } from '../campaignStrategy';

// ── Helpers ─────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatCampaignLabel(type: AssistantCampaignType): string {
  // Partial — only the property types we actually use here have
  // human labels. Generic types are routed to the generic options
  // list (see defaults.ts), so this function isn't called for them.
  const labels: Partial<Record<AssistantCampaignType, string>> = {
    just_listed: 'Just Listed',
    open_house: 'Open House',
    price_drop: 'Price Drop',
    just_sold: 'Just Sold',
    listing_spotlight: 'Listing Spotlight',
    general_promotion: 'General Promotion',
  };
  return labels[type] ?? type;
}

// ── Campaign Type Recommendation ────────────────────────────────────────

function recommendCampaignType(
  propertyData: Record<string, unknown>,
): CampaignTypeRecommendation {
  // Only the property types the heuristic actually returns. Other
  // adapter types (just_sold, listing_spotlight, generic) are not
  // produced by this rules engine — they're picked manually by the
  // user from the campaign-type card.
  const allTypes: AssistantCampaignType[] = ['just_listed', 'open_house', 'price_drop', 'general_promotion'];

  // Rule 1: Open house date in the future
  const openHouseDate = propertyData.openHouseDate as string | undefined;
  if (openHouseDate) {
    const ohDate = new Date(openHouseDate);
    if (!isNaN(ohDate.getTime()) && ohDate > new Date()) {
      return {
        recommended: 'open_house',
        confidence: 'high',
        reason: 'An upcoming open house is scheduled',
        alternatives: allTypes.filter((t) => t !== 'open_house'),
      };
    }
  }

  const listingStatus = propertyData.listingStatus as string | undefined;
  const daysOnMarket = propertyData.daysOnMarket as number | undefined;
  const price = propertyData.price as number | undefined;
  const previousPrice = propertyData.previousPrice as number | undefined;

  // Rule 2: Just listed — active and <= 7 DOM
  if (listingStatus === 'active' && typeof daysOnMarket === 'number' && daysOnMarket <= 7) {
    return {
      recommended: 'just_listed',
      confidence: 'high',
      reason: `Listed ${daysOnMarket} day${daysOnMarket !== 1 ? 's' : ''} ago — perfect timing for a launch campaign`,
      alternatives: allTypes.filter((t) => t !== 'just_listed'),
    };
  }

  // Rule 3: Just listed — active and <= 14 DOM
  if (listingStatus === 'active' && typeof daysOnMarket === 'number' && daysOnMarket <= 14) {
    return {
      recommended: 'just_listed',
      confidence: 'medium',
      reason: `Listed ${daysOnMarket} days ago — still fresh enough for a launch push`,
      alternatives: allTypes.filter((t) => t !== 'just_listed'),
    };
  }

  // Rule 4: Price drop
  if (
    typeof previousPrice === 'number' &&
    typeof price === 'number' &&
    price < previousPrice
  ) {
    return {
      recommended: 'price_drop',
      confidence: 'high',
      reason: `Price reduced from ${formatPrice(previousPrice)} to ${formatPrice(price)}`,
      alternatives: allTypes.filter((t) => t !== 'price_drop'),
    };
  }

  // Rule 5: Active listing > 14 DOM
  if (listingStatus === 'active' && typeof daysOnMarket === 'number' && daysOnMarket > 14) {
    return {
      recommended: 'general_promotion',
      confidence: 'medium',
      reason: `On market for ${daysOnMarket} days — a fresh promotional push can reignite interest`,
      alternatives: allTypes.filter((t) => t !== 'general_promotion'),
    };
  }

  // Rule 6: Fallback
  return {
    recommended: 'general_promotion',
    confidence: 'low',
    reason: 'General promotion works for any listing',
    alternatives: allTypes.filter((t) => t !== 'general_promotion'),
  };
}

// ── Channel Recommendation ──────────────────────────────────────────────

function recommendChannels(input: RecommendChannelsInput): ChannelRecommendation {
  const { campaignType, connectedChannels, hasMedia, propertyData } = input;
  const defaults = realEstateAdapter.defaultChannelsByCampaignType[campaignType] ?? [];
  const reasoning: Record<string, string> = {};

  // Start with defaults filtered to connected
  let recommended = defaults.filter((ch) => connectedChannels.includes(ch));

  // Add reasoning for included defaults
  for (const ch of recommended) {
    reasoning[ch] = `Default channel for ${formatCampaignLabel(campaignType as AssistantCampaignType)} campaigns`;
  }

  // If no media, drop Instagram (requires media)
  if (!hasMedia && recommended.includes('INSTAGRAM' as Channel)) {
    recommended = recommended.filter((ch) => ch !== 'INSTAGRAM');
    reasoning['INSTAGRAM'] = 'Excluded — Instagram requires media and none is available';
  }

  // For luxury properties, add LinkedIn if connected
  const price = propertyData.price as number | undefined;
  if (
    typeof price === 'number' &&
    price >= 750000 &&
    connectedChannels.includes('LINKEDIN' as Channel) &&
    !recommended.includes('LINKEDIN' as Channel)
  ) {
    recommended.push('LINKEDIN' as Channel);
    reasoning['LINKEDIN'] = 'Added for luxury listing — LinkedIn reaches high-value audiences';
  }

  // For open_house, note Facebook priority
  if (campaignType === 'open_house' && recommended.includes('FACEBOOK' as Channel)) {
    reasoning['FACEBOOK'] = 'Prioritized for open house — Facebook has strong local reach and events';
  }

  // Ensure at least one channel if any are connected
  if (recommended.length === 0 && connectedChannels.length > 0) {
    recommended = [connectedChannels[0]];
    reasoning[connectedChannels[0]] = 'Fallback — only available connected channel';
  }

  return { recommended, reasoning };
}

// ── Media Prioritization ────────────────────────────────────────────────

function prioritizeMedia(
  assets: MediaAsset[],
  input: PrioritizeMediaInput,
): MediaPrioritization {
  const scored = assets.map((asset) => {
    let score = (asset as any).qualityScore ?? 50;
    const reasons: string[] = [];

    // Quality label bonus/penalty
    const qualityLabel = (asset as any).qualityLabel as string | undefined;
    if (qualityLabel === 'good') {
      score += 20;
      reasons.push('high quality');
    } else if (qualityLabel === 'low') {
      score -= 20;
      reasons.push('low quality');
    }

    // Filename/tag signals
    const searchable = [
      asset.filename?.toLowerCase() ?? '',
      ...(asset.tags ?? []).map((t) => t.toLowerCase()),
      asset.caption?.toLowerCase() ?? '',
    ].join(' ');

    const hasExterior = /exterior|front|hero/.test(searchable);
    const hasInterior = /kitchen|living|interior|basement|bathroom|bedroom|dining/.test(searchable);
    const hasLifestyle = /backyard|neighborhood|lifestyle|pool|patio|garden/.test(searchable);

    if (hasExterior) {
      score += 30;
      reasons.push('exterior/cover photo');
    }
    if (hasInterior) {
      score += 15;
      reasons.push('interior feature');
    }
    if (hasLifestyle) {
      score += 10;
      reasons.push('lifestyle imagery');
    }

    if (reasons.length === 0) reasons.push('standard media');

    return {
      id: asset.id,
      score,
      reason: reasons.join(', '),
      hasExterior,
      _primaryTag: hasExterior ? 'exterior' : hasInterior ? 'interior' : hasLifestyle ? 'lifestyle' : 'other',
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Penalize consecutive same-tag images
  const tagCounts: Record<string, number> = {};
  for (const item of scored) {
    const tag = item._primaryTag;
    const count = (tagCounts[tag] ?? 0) + 1;
    tagCounts[tag] = count;
    if (count === 2) item.score -= 10;
    if (count >= 3) item.score -= 20;
  }

  // Re-sort after penalties
  scored.sort((a, b) => b.score - a.score);

  // Find hero image (top-scoring with exterior signal)
  const heroCandidate = scored.find((s) => s.hasExterior);
  const heroImageId = heroCandidate?.id ?? (scored.length > 0 ? scored[0].id : null);

  return {
    prioritized: scored.map(({ id, score, reason }) => ({ id, score, reason })),
    heroImageId,
  };
}

// ── Schedule Strategy ───────────────────────────────────────────────────

function selectPreset(
  campaignType: string,
  itemData: Record<string, unknown>,
): { presetKey: string; reason: string } {
  const price = itemData.price as number | undefined;
  const daysOnMarket = itemData.daysOnMarket as number | undefined;
  const isLuxury = typeof price === 'number' && price >= 750000;

  switch (campaignType) {
    case 'just_listed':
      if (isLuxury) {
        return { presetKey: 'luxury', reason: 'Luxury listing — slower storytelling builds exclusivity and anticipation' };
      }
      return { presetKey: 'aggressive', reason: 'New listing — front-loaded schedule maximizes launch momentum' };
    case 'open_house':
      return { presetKey: 'aggressive', reason: 'Open house — concentrated schedule drives attendance' };
    case 'price_drop':
      return { presetKey: 'aggressive', reason: 'Price reduction — fast cadence capitalizes on urgency' };
    case 'general_promotion':
      if (typeof daysOnMarket === 'number' && daysOnMarket > 30) {
        return { presetKey: 'luxury', reason: 'Longer time on market — sustained pacing keeps interest alive' };
      }
      return { presetKey: 'balanced', reason: 'Balanced cadence suits a general promotional campaign' };
    default:
      return { presetKey: 'balanced', reason: 'Balanced cadence suits a general promotional campaign' };
  }
}

// ── Trigger → Campaign Type Mapping ─────────────────────────────────────

function mapStatusChange(propertyData: Record<string, unknown>): CampaignTypeRecommendation {
  const listingStatus = (propertyData.listingStatus as string | undefined)?.toLowerCase();

  if (listingStatus === 'sold' || listingStatus === 'closed') {
    return {
      recommended: 'general_promotion' as AssistantCampaignType,
      confidence: 'low',
      reason: 'Listing is sold/closed — consider a "just sold" celebration or pause campaigns',
      alternatives: [],
    };
  }

  if (listingStatus === 'withdrawn' || listingStatus === 'expired' || listingStatus === 'cancelled') {
    return {
      recommended: 'general_promotion' as AssistantCampaignType,
      confidence: 'low',
      reason: 'Listing withdrawn/expired — recommend pausing active campaigns',
      alternatives: [],
    };
  }

  if (listingStatus === 'active') {
    return recommendCampaignType(propertyData);
  }

  if (listingStatus === 'pending' || listingStatus === 'under_contract') {
    return {
      recommended: 'general_promotion' as AssistantCampaignType,
      confidence: 'low',
      reason: 'Listing is pending — campaigns may no longer be relevant',
      alternatives: [],
    };
  }

  return recommendCampaignType(propertyData);
}

function mapTriggerToCampaignType(
  triggerType: AutopilotTriggerType,
  propertyData: Record<string, unknown>,
): CampaignTypeRecommendation {
  switch (triggerType) {
    case 'new_listing':
      return recommendCampaignType(propertyData);

    case 'price_drop':
      return {
        recommended: 'price_drop' as AssistantCampaignType,
        confidence: 'high',
        reason: 'Price reduction detected — capitalize on buyer urgency',
        alternatives: ['general_promotion' as AssistantCampaignType],
      };

    case 'open_house_added':
      return {
        recommended: 'open_house' as AssistantCampaignType,
        confidence: 'high',
        reason: 'Open house scheduled — drive attendance with targeted campaign',
        alternatives: ['just_listed' as AssistantCampaignType],
      };

    case 'open_house_updated':
      return {
        recommended: 'open_house' as AssistantCampaignType,
        confidence: 'high',
        reason: 'Open house details updated — send a refresh/reminder campaign',
        alternatives: ['general_promotion' as AssistantCampaignType],
      };

    case 'status_changed':
      return mapStatusChange(propertyData);

    default:
      return recommendCampaignType(propertyData);
  }
}

// ── Strategy Resolution ─────────────────────────────────────────────────

function resolveStrategy(
  campaignType: string,
  itemData: Record<string, unknown>,
): StrategyResolution {
  const price = itemData.price as number | undefined;
  const daysOnMarket = itemData.daysOnMarket as number | undefined;
  const isLuxury = typeof price === 'number' && price >= 750000;

  let strategyKey: CampaignStrategyKey;
  let cadenceKey: CampaignCadenceKey;
  let strategyReason: string;
  let cadenceReason: string;

  switch (campaignType) {
    case 'just_listed':
      if (isLuxury) {
        strategyKey = 'luxury_showcase';
        cadenceKey = 'extended';
        strategyReason = 'Luxury listing — storytelling approach builds exclusivity and perceived value';
        cadenceReason = 'Extended cadence lets the narrative breathe and build anticipation';
      } else {
        strategyKey = 'new_listing_launch';
        cadenceKey = 'fast';
        strategyReason = 'New listing — maximize launch momentum while the listing is fresh';
        cadenceReason = 'Fast cadence capitalizes on the excitement of a new listing';
      }
      break;

    case 'open_house':
      strategyKey = 'open_house_push';
      cadenceKey = 'fast';
      strategyReason = 'Open house — concentrated campaign drives event attendance';
      cadenceReason = 'Fast cadence builds urgency leading up to the event';
      break;

    case 'price_drop':
      strategyKey = 'price_drop_push';
      cadenceKey = 'fast';
      strategyReason = 'Price reduction — capture buyer urgency before the window closes';
      cadenceReason = 'Fast cadence capitalizes on the time-sensitive nature of a price drop';
      break;

    case 'general_promotion':
      if (typeof daysOnMarket === 'number' && daysOnMarket > 30) {
        strategyKey = 'stale_listing_revival';
        cadenceKey = 'standard';
        strategyReason = `${daysOnMarket} days on market — fresh angles and repositioning can reignite buyer interest`;
        cadenceReason = 'Standard cadence provides steady momentum without appearing desperate';
      } else if (isLuxury) {
        strategyKey = 'luxury_showcase';
        cadenceKey = 'extended';
        strategyReason = 'Luxury listing — slow-build approach suits high-value properties';
        cadenceReason = 'Extended cadence builds exclusivity and emotional connection';
      } else {
        strategyKey = 'evergreen_promotion';
        cadenceKey = 'standard';
        strategyReason = 'General promotion — balanced multi-touch strategy for broad appeal';
        cadenceReason = 'Standard cadence suits a general promotional campaign';
      }
      break;

    default:
      strategyKey = 'evergreen_promotion';
      cadenceKey = 'standard';
      strategyReason = 'Default strategy — well-rounded multi-touch campaign';
      cadenceReason = 'Standard cadence suits most campaign scenarios';
  }

  const strategy = CAMPAIGN_STRATEGIES[strategyKey];

  return {
    strategy: strategyKey,
    cadence: cadenceKey,
    phases: strategy.defaultPhases,
    strategyReason,
    cadenceReason,
  };
}

// ── Prompt Context ──────────────────────────────────────────────────────

function buildPromptContext(itemData: Record<string, unknown>): string | null {
  const parts: string[] = [];

  const address = itemData.address as string | undefined;
  const title = itemData.title as string | undefined;
  if (address) parts.push(`Address: ${address}`);
  else if (title) parts.push(`Property: ${title}`);

  const price = itemData.price as number | undefined;
  if (typeof price === 'number') parts.push(`List Price: ${formatPrice(price)}`);

  const beds = itemData.beds as number | undefined;
  const baths = itemData.baths as number | undefined;
  if (typeof beds === 'number' || typeof baths === 'number') {
    const bedsStr = typeof beds === 'number' ? `${beds} bed` : '';
    const bathsStr = typeof baths === 'number' ? `${baths} bath` : '';
    parts.push([bedsStr, bathsStr].filter(Boolean).join(' / '));
  }

  const sqft = itemData.sqft as number | undefined;
  if (typeof sqft === 'number') parts.push(`${sqft.toLocaleString()} sqft`);

  return parts.length > 0 ? parts.join(' | ') : null;
}

// ── Validation ──────────────────────────────────────────────────────────

function validateItemData(itemData: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const address = itemData.address as string | undefined;
  const title = itemData.title as string | undefined;

  if (!address && !title) {
    errors.push('Item data must include at least an address or title');
  }

  return { valid: errors.length === 0, errors };
}

// ── Adapter Export ──────────────────────────────────────────────────────

export const realEstateAdapter: IndustryAdapter = {
  id: 'real_estate',
  label: 'Real Estate',

  terminology: {
    itemSingular: 'listing',
    itemPlural: 'listings',
    selectItemLabel: 'Select Listing',
    itemDataLabel: 'property data',
    priceLabel: 'List Price',
  },

  workflowOverrides: {
    steps: {
      property_select: {
        label: 'Select Listing',
        description: 'Choose a property listing to build a campaign for',
      },
      campaign_config: {
        description: 'Pick a campaign type and channels for this listing',
      },
      media_select: {
        description: 'Select property photos — exterior/cover photos work best as lead images',
      },
      schedule_review: {
        description: 'Review and adjust the posting schedule for your property campaign',
      },
    },
    quickPostRequiresItem: false,
    campaignRequiresMedia: true,
  },

  campaignTypes: [
    { value: 'just_listed', label: 'Just Listed', description: 'Announce a new listing across multiple channels' },
    { value: 'open_house', label: 'Open House', description: 'Promote an upcoming open house event' },
    { value: 'price_drop', label: 'Price Drop', description: 'Highlight a price reduction to drive urgency' },
    { value: 'just_sold', label: 'Just Sold', description: 'Celebrate a closing and reinforce social proof' },
    { value: 'listing_spotlight', label: 'Listing Spotlight', description: 'Flexible feature campaign for a listing with no specific trigger' },
  ],

  defaultChannelsByCampaignType: {
    just_listed: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE'] as Channel[],
    open_house: ['INSTAGRAM', 'FACEBOOK', 'YOUTUBE'] as Channel[],
    price_drop: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as Channel[],
    just_sold: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as Channel[],
    listing_spotlight: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE'] as Channel[],
    // Legacy synonym for listing_spotlight — kept so existing sessions
    // and the strategy resolver below don't 404 on the old key.
    general_promotion: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE'] as Channel[],
  },

  recommendCampaignType,
  recommendChannels,
  prioritizeMedia,

  scheduleStrategy: {
    presets: SEQUENCE_PRESETS,
    slotPurposeHints: SLOT_PURPOSE_HINTS,
    slotMediaHints: SLOT_MEDIA_HINTS,
    selectPreset,
    resolveStrategy,
  },

  supportedTriggers: ['new_listing', 'price_drop', 'open_house_added', 'open_house_updated', 'status_changed'],

  triggerConfig: {
    new_listing: { urgency: 'high', angleHints: ['promotional', 'storytelling', 'lifestyle'], autoGenerate: true },
    price_drop: { urgency: 'immediate', angleHints: ['urgency', 'promotional'], autoGenerate: true },
    open_house_added: { urgency: 'high', angleHints: ['promotional', 'social_proof'], autoGenerate: true },
    open_house_updated: { urgency: 'normal', angleHints: ['urgency', 'social_proof'], autoGenerate: false },
    status_changed: { urgency: 'normal', angleHints: ['authority', 'promotional'], autoGenerate: false },
  },

  mapTriggerToCampaignType,
  buildPromptContext,
  validateItemData,
};
