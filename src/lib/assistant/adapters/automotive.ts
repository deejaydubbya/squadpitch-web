import type { Channel, MediaAsset, AutopilotTriggerType } from '@/hooks/useSquadpitch';
import type { AssistantCampaignType } from '../types';
import type {
  CampaignTypeRecommendation,
  ChannelRecommendation,
  RecommendChannelsInput,
  MediaPrioritization,
  PrioritizeMediaInput,
} from '../campaignIntelligence.types';
import { SEQUENCE_PRESETS, SLOT_PURPOSE_HINTS, SLOT_MEDIA_HINTS } from '../schedulePresets';
import type { IndustryAdapter, TriggerConfig, WorkflowOverrides } from '../industryAdapter';

// ── Helpers ─────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ── Campaign Type Recommendation ────────────────────────────────────────

function recommendCampaignType(
  itemData: Record<string, unknown>,
): CampaignTypeRecommendation {
  const allTypes = ['just_arrived', 'price_drop', 'featured_vehicle', 'financing_offer'];

  const daysOnLot = itemData.daysOnLot as number | undefined;
  const price = itemData.price as number | undefined;
  const previousPrice = itemData.previousPrice as number | undefined;
  const hasFinancingOffer = itemData.hasFinancingOffer as boolean | undefined;

  // Rule 1: Price drop detected
  if (
    typeof previousPrice === 'number' &&
    typeof price === 'number' &&
    price < previousPrice
  ) {
    return {
      recommended: 'price_drop' as AssistantCampaignType,
      confidence: 'high',
      reason: `Price reduced from ${formatPrice(previousPrice)} to ${formatPrice(price)}`,
      alternatives: allTypes.filter((t) => t !== 'price_drop') as AssistantCampaignType[],
    };
  }

  // Rule 2: Just arrived — on lot <= 7 days
  if (typeof daysOnLot === 'number' && daysOnLot <= 7) {
    return {
      recommended: 'just_arrived' as AssistantCampaignType,
      confidence: 'high',
      reason: `Vehicle arrived ${daysOnLot} day${daysOnLot !== 1 ? 's' : ''} ago — ideal for a new arrival campaign`,
      alternatives: allTypes.filter((t) => t !== 'just_arrived') as AssistantCampaignType[],
    };
  }

  // Rule 3: Just arrived — on lot <= 14 days
  if (typeof daysOnLot === 'number' && daysOnLot <= 14) {
    return {
      recommended: 'just_arrived' as AssistantCampaignType,
      confidence: 'medium',
      reason: `Vehicle arrived ${daysOnLot} days ago — still fresh enough for a new arrival push`,
      alternatives: allTypes.filter((t) => t !== 'just_arrived') as AssistantCampaignType[],
    };
  }

  // Rule 4: Financing offer available
  if (hasFinancingOffer) {
    return {
      recommended: 'financing_offer' as AssistantCampaignType,
      confidence: 'medium',
      reason: 'Special financing available — highlight the deal to drive leads',
      alternatives: allTypes.filter((t) => t !== 'financing_offer') as AssistantCampaignType[],
    };
  }

  // Rule 5: Longer time on lot — featured vehicle to reignite interest
  if (typeof daysOnLot === 'number' && daysOnLot > 30) {
    return {
      recommended: 'featured_vehicle' as AssistantCampaignType,
      confidence: 'medium',
      reason: `On lot for ${daysOnLot} days — a featured spotlight can reignite buyer interest`,
      alternatives: allTypes.filter((t) => t !== 'featured_vehicle') as AssistantCampaignType[],
    };
  }

  // Rule 6: Fallback
  return {
    recommended: 'featured_vehicle' as AssistantCampaignType,
    confidence: 'low',
    reason: 'Featured vehicle campaign works for any inventory',
    alternatives: allTypes.filter((t) => t !== 'featured_vehicle') as AssistantCampaignType[],
  };
}

// ── Channel Recommendation ──────────────────────────────────────────────

function recommendChannels(input: RecommendChannelsInput): ChannelRecommendation {
  const { campaignType, connectedChannels, hasMedia, propertyData } = input;
  const defaults = automotiveAdapter.defaultChannelsByCampaignType[campaignType] ?? [];
  const reasoning: Record<string, string> = {};

  let recommended = defaults.filter((ch) => connectedChannels.includes(ch));

  for (const ch of recommended) {
    reasoning[ch] = `Default channel for ${campaignType.replace(/_/g, ' ')} campaigns`;
  }

  // If no media, drop Instagram
  if (!hasMedia && recommended.includes('INSTAGRAM' as Channel)) {
    recommended = recommended.filter((ch) => ch !== 'INSTAGRAM');
    reasoning['INSTAGRAM'] = 'Excluded — Instagram requires media and none is available';
  }

  // Facebook is always strong for automotive (marketplace-style)
  if (recommended.includes('FACEBOOK' as Channel)) {
    reasoning['FACEBOOK'] = 'Prioritized — Facebook Marketplace reach is strong for vehicle sales';
  }

  // For premium vehicles (>$50k), add LinkedIn if connected
  const price = propertyData.price as number | undefined;
  if (
    typeof price === 'number' &&
    price >= 50000 &&
    connectedChannels.includes('LINKEDIN' as Channel) &&
    !recommended.includes('LINKEDIN' as Channel)
  ) {
    recommended.push('LINKEDIN' as Channel);
    reasoning['LINKEDIN'] = 'Added for premium vehicle — LinkedIn reaches high-income buyers';
  }

  // Ensure at least one channel
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

    const qualityLabel = (asset as any).qualityLabel as string | undefined;
    if (qualityLabel === 'good') {
      score += 20;
      reasons.push('high quality');
    } else if (qualityLabel === 'low') {
      score -= 20;
      reasons.push('low quality');
    }

    const searchable = [
      asset.filename?.toLowerCase() ?? '',
      ...(asset.tags ?? []).map((t) => t.toLowerCase()),
      asset.caption?.toLowerCase() ?? '',
    ].join(' ');

    const hasExteriorFront = /exterior.*front|front.*exterior|hero|front/.test(searchable);
    const hasInteriorDashboard = /interior|dashboard|cabin|cockpit/.test(searchable);
    const hasRear = /rear|back|trunk|tailgate/.test(searchable);
    const hasWheels = /wheel|rim|tire|alloy/.test(searchable);

    if (hasExteriorFront) {
      score += 30;
      reasons.push('exterior/front shot');
    }
    if (hasInteriorDashboard) {
      score += 15;
      reasons.push('interior/dashboard');
    }
    if (hasRear) {
      score += 10;
      reasons.push('rear view');
    }
    if (hasWheels) {
      score += 5;
      reasons.push('wheel detail');
    }

    if (reasons.length === 0) reasons.push('standard media');

    return {
      id: asset.id,
      score,
      reason: reasons.join(', '),
      hasExteriorFront,
      _primaryTag: hasExteriorFront ? 'exterior' : hasInteriorDashboard ? 'interior' : hasRear ? 'rear' : hasWheels ? 'wheels' : 'other',
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Penalize consecutive same-tag images (avoid duplicates)
  const tagCounts: Record<string, number> = {};
  for (const item of scored) {
    const tag = item._primaryTag;
    const count = (tagCounts[tag] ?? 0) + 1;
    tagCounts[tag] = count;
    if (count === 2) item.score -= 10;
    if (count >= 3) item.score -= 20;
  }

  scored.sort((a, b) => b.score - a.score);

  const heroCandidate = scored.find((s) => s.hasExteriorFront);
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
  const isPremium = typeof price === 'number' && price >= 50000;

  switch (campaignType) {
    case 'just_arrived':
      if (isPremium) {
        return { presetKey: 'luxury', reason: 'Premium vehicle — slower storytelling builds exclusivity' };
      }
      return { presetKey: 'aggressive', reason: 'New arrival — front-loaded schedule maximizes first-week visibility' };
    case 'price_drop':
      return { presetKey: 'aggressive', reason: 'Price reduction — fast cadence capitalizes on deal urgency' };
    case 'financing_offer':
      return { presetKey: 'aggressive', reason: 'Financing offer — time-sensitive deal benefits from concentrated push' };
    case 'featured_vehicle':
      return { presetKey: 'balanced', reason: 'Featured vehicle — balanced pacing sustains buyer interest' };
    default:
      return { presetKey: 'balanced', reason: 'Balanced cadence for general vehicle promotion' };
  }
}

// ── Trigger → Campaign Type Mapping ─────────────────────────────────────

function mapTriggerToCampaignType(
  triggerType: AutopilotTriggerType,
  itemData: Record<string, unknown>,
): CampaignTypeRecommendation {
  const allTypes = ['just_arrived', 'price_drop', 'featured_vehicle', 'financing_offer'];

  switch (triggerType) {
    case 'new_listing':
      return recommendCampaignType(itemData);

    case 'price_drop':
      return {
        recommended: 'price_drop' as AssistantCampaignType,
        confidence: 'high',
        reason: 'Price reduction detected — capitalize on deal urgency',
        alternatives: ['featured_vehicle' as AssistantCampaignType],
      };

    case 'status_changed': {
      const status = (itemData.status as string | undefined)?.toLowerCase();
      if (status === 'sold' || status === 'reserved') {
        return {
          recommended: 'featured_vehicle' as AssistantCampaignType,
          confidence: 'low',
          reason: 'Vehicle sold/reserved — consider pausing campaigns',
          alternatives: [],
        };
      }
      return recommendCampaignType(itemData);
    }

    default:
      return recommendCampaignType(itemData);
  }
}

// ── Prompt Context ──────────────────────────────────────────────────────

function buildPromptContext(itemData: Record<string, unknown>): string | null {
  const parts: string[] = [];

  const year = itemData.year as number | string | undefined;
  const make = itemData.make as string | undefined;
  const model = itemData.model as string | undefined;
  if (year || make || model) {
    parts.push(`Vehicle: ${[year, make, model].filter(Boolean).join(' ')}`);
  }

  const price = itemData.price as number | undefined;
  if (typeof price === 'number') parts.push(`MSRP: ${formatPrice(price)}`);

  const mileage = itemData.mileage as number | undefined;
  if (typeof mileage === 'number') parts.push(`Mileage: ${mileage.toLocaleString()} mi`);

  const features = itemData.features as string[] | undefined;
  if (features && features.length > 0) parts.push(`Features: ${features.slice(0, 5).join(', ')}`);

  const condition = itemData.condition as string | undefined;
  if (condition) parts.push(`Condition: ${condition}`);

  return parts.length > 0 ? parts.join(' | ') : null;
}

// ── Validation ──────────────────────────────────────────────────────────

function validateItemData(itemData: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const make = itemData.make as string | undefined;
  const model = itemData.model as string | undefined;
  const title = itemData.title as string | undefined;

  if (!make && !model && !title) {
    errors.push('Vehicle data must include at least a make/model or title');
  }

  return { valid: errors.length === 0, errors };
}

// ── Adapter Export ──────────────────────────────────────────────────────

export const automotiveAdapter: IndustryAdapter = {
  id: 'automotive',
  label: 'Automotive / Car Sales',

  terminology: {
    itemSingular: 'vehicle',
    itemPlural: 'vehicles',
    selectItemLabel: 'Select Vehicle',
    itemDataLabel: 'vehicle data',
    priceLabel: 'MSRP',
  },

  workflowOverrides: {
    steps: {
      property_select: {
        label: 'Select Vehicle',
        description: 'Choose a vehicle from your inventory to promote',
      },
      campaign_config: {
        description: 'Pick a campaign type and channels for this vehicle',
      },
      media_select: {
        description: 'Select vehicle photos — exterior front shots work best as hero images',
      },
      schedule_review: {
        description: 'Review the posting schedule for your inventory campaign',
      },
    },
    quickPostRequiresItem: false,
    campaignRequiresMedia: true,
  },

  campaignTypes: [
    { value: 'just_arrived', label: 'Just Arrived', description: 'Announce a new vehicle arrival on the lot' },
    { value: 'price_drop', label: 'Price Drop', description: 'Highlight a price reduction to drive urgency' },
    { value: 'featured_vehicle', label: 'Featured Vehicle', description: 'Spotlight a vehicle with flexible messaging' },
    { value: 'financing_offer', label: 'Financing Offer', description: 'Promote a special financing or lease deal' },
  ],

  defaultChannelsByCampaignType: {
    just_arrived: ['FACEBOOK', 'INSTAGRAM'] as Channel[],
    price_drop: ['FACEBOOK', 'INSTAGRAM'] as Channel[],
    featured_vehicle: ['FACEBOOK', 'INSTAGRAM'] as Channel[],
    financing_offer: ['FACEBOOK', 'INSTAGRAM'] as Channel[],
  },

  recommendCampaignType,
  recommendChannels,
  prioritizeMedia,

  scheduleStrategy: {
    presets: SEQUENCE_PRESETS,
    slotPurposeHints: SLOT_PURPOSE_HINTS,
    slotMediaHints: SLOT_MEDIA_HINTS,
    selectPreset,
  },

  supportedTriggers: ['new_listing', 'price_drop', 'status_changed'],

  triggerConfig: {
    new_listing: { urgency: 'high', angleHints: ['promotional', 'lifestyle'], autoGenerate: true },
    price_drop: { urgency: 'immediate', angleHints: ['urgency', 'promotional'], autoGenerate: true },
    status_changed: { urgency: 'normal', angleHints: ['authority', 'promotional'], autoGenerate: false },
  } as Partial<Record<AutopilotTriggerType, TriggerConfig>>,

  mapTriggerToCampaignType,
  buildPromptContext,
  validateItemData,
};
