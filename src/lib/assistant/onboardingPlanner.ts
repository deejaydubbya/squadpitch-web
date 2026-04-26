import type { Channel } from '@/hooks/useSquadpitch';

// ── Types ────────────────────────────────────────────────────────────

export interface TemplateConditions {
  hasData?: boolean;
  requiredDataType?: string;
  noPublished?: boolean;
}

export interface CoreTemplate {
  type: string;
  title: string;
  guidance: string;
  conditions?: TemplateConditions;
}

export interface DataItem {
  id: string;
  dataJson: Record<string, unknown>;
}

export interface GenerationSlot {
  templateType: string;
  title: string;
  guidance: string;
  channel: Channel | null;
  dataItemId: string | null;
  contentCategory: 'data-backed' | 'fallback';
}

export interface PlannerInput {
  coreTemplates: CoreTemplate[];
  starterAngles: string[];
  dataItems: DataItem[];
  connectedChannels: Channel[];
  /** Channels suggested by analysis (fallback when none connected) */
  suggestedChannels?: Channel[];
  /** Whether the workspace has media assets available */
  hasMedia?: boolean;
  industryKey: string;
  brandContext: string;
}

// ── Shared no-invention rule ─────────────────────────────────────────

const NO_INVENTION_RULE =
  'RULES: Only use facts explicitly provided. Do NOT invent open house dates, price drops, testimonials, client names, school ratings, crime stats, HOA details, or any property specs not given. If a detail is missing, omit it naturally. ' +
  'Avoid clichés: "dream home", "stunning", "gorgeous", "must-see", "act fast", "won\'t last", "hidden gem". Use soft CTAs only.';

// ── Real estate slot templates ───────────────────────────────────────

/** Slot 1: Listing spotlight — uses real property data */
function reListingSpotlight(listing: DataItem): CoreTemplate {
  const d = listing.dataJson;
  const addr = (d.address as string) ?? '';
  const city = (d.city as string) ?? '';
  const loc = [addr, city].filter(Boolean).join(', ');
  return {
    type: 'listing_post',
    title: 'Just Listed',
    guidance:
      `Create a "Just Listed" post for ${loc || 'this property'}. ` +
      'Highlight the most compelling facts from the listing data — location, price, size, standout features. ' +
      'Write it as a real agent would: grounded, specific, inviting. ' +
      'Do NOT dump all data as a bullet list — weave the best details into a natural post. ' +
      NO_INVENTION_RULE,
    conditions: { hasData: true, requiredDataType: 'listing' },
  };
}

/** Slot 2a: Neighborhood/lifestyle — when location data exists */
function reNeighborhoodPost(listing: DataItem): CoreTemplate {
  const d = listing.dataJson;
  const neighborhood = (d.neighborhood as string) ?? '';
  const city = (d.city as string) ?? '';
  const loc = neighborhood || city || 'the area';
  return {
    type: 'neighborhood_highlight',
    title: 'Neighborhood & Lifestyle',
    guidance:
      `Create a post about life in ${loc}. ` +
      'Focus on what makes the area desirable — walkability, vibe, convenience, community. ' +
      'Do NOT repeat the listing price, beds, baths, or sqft — this is about lifestyle, not specs. ' +
      'Only reference neighborhood details that were provided. ' +
      NO_INVENTION_RULE,
    conditions: { hasData: true, requiredDataType: 'listing' },
  };
}

/** Slot 2b: Buyer education — when neighborhood data is weak */
function reBuyerEducation(propertyType?: string): CoreTemplate {
  const typeLabel = propertyType ?? 'this type of property';
  return {
    type: 'buyer_tip',
    title: 'Buyer Education',
    guidance:
      `Write a helpful post with practical advice for buyers interested in ${typeLabel}. ` +
      'Topics: what to look for during a showing, financing tips, how to stand out in offers. ' +
      'Position yourself as a knowledgeable resource. Do NOT repeat listing specs. ' +
      NO_INVENTION_RULE,
  };
}

/** Slot 3: Agent expertise — connected to property type/market */
function reAgentExpertise(listing: DataItem | null): CoreTemplate {
  const d = listing?.dataJson;
  const propType = (d?.propertyType as string) ?? '';
  const city = (d?.city as string) ?? '';
  const context = [propType, city].filter(Boolean).join(' in ') || 'your local market';
  return {
    type: 'brand_authority',
    title: 'Agent Expertise',
    guidance:
      `Create a post that establishes your expertise in ${context}. ` +
      'Share a professional insight, market observation, or practical tip that builds trust. ' +
      'Sound knowledgeable but approachable — not salesy. ' +
      'Do NOT reference any specific listing or invent market statistics. ' +
      NO_INVENTION_RULE,
  };
}

// ── Real estate no-listing fallback templates ────────────────────────

const RE_NO_LISTING_TEMPLATES: CoreTemplate[] = [
  {
    type: 'market_insight',
    title: 'Local Market Insight',
    guidance:
      'Share a market trend or observation about your local area. ' +
      'Use your knowledge to educate buyers and sellers. Be specific to your market if possible. ' +
      'Do NOT invent statistics or cite made-up numbers. ' +
      NO_INVENTION_RULE,
  },
  {
    type: 'buyer_tip',
    title: 'Buyer Education',
    guidance:
      'Write a practical, actionable tip for home buyers. ' +
      'Topics: what to prioritize in a showing, negotiation basics, mortgage prep, red flags. ' +
      'Position yourself as the go-to local expert. ' +
      NO_INVENTION_RULE,
  },
  {
    type: 'brand_authority',
    title: 'Agent Expertise',
    guidance:
      'Create a post that establishes your authority in real estate. ' +
      'Share a unique perspective, lesson learned, or professional insight. ' +
      'Sound like a real person sharing experience, not a brand broadcasting. ' +
      NO_INVENTION_RULE,
  },
];

// ── Business onboarding templates ────────────────────────────────────

const BUSINESS_TEMPLATES: CoreTemplate[] = [
  {
    type: 'business_intro',
    title: 'Brand Introduction',
    guidance:
      'Introduce the business to new followers. Explain what you do, who you serve, and what makes you different. ' +
      'Keep it warm, confident, and specific. Use only facts from the brand data provided. ' +
      'Do NOT invent testimonials, customer names, awards, locations, or case studies. ' +
      'If the brand data is thin, focus on the core value proposition.',
  },
  {
    type: 'offer_highlight',
    title: 'Offer / Service Spotlight',
    guidance:
      'Create a post highlighting one specific product, service, or offer. ' +
      'Explain the value clearly — what problem does it solve? Who is it for? ' +
      'Use only information provided in the brand data. Do NOT invent pricing, features, or customer quotes. ' +
      'If specific offers are not available, write about the general category of service.',
  },
  {
    type: 'authority_education',
    title: 'Authority & Education',
    guidance:
      'Write an educational post that positions the business as an expert in its field. ' +
      'Share a useful tip, industry insight, or common misconception. ' +
      'Sound knowledgeable but approachable. Do NOT invent case studies, customer stories, or statistics. ' +
      'If the business data is thin, write general industry education.',
  },
];

// ── Generic safe fallback templates ──────────────────────────────────

const GENERIC_FALLBACK_TEMPLATES: CoreTemplate[] = [
  {
    type: 'educational_tip',
    title: 'Share an Industry Tip',
    guidance:
      'Share a useful, actionable tip that your target audience will find valuable. Position yourself as a knowledgeable resource in your field.',
  },
  {
    type: 'market_insight',
    title: 'Share a Market Insight',
    guidance:
      'Write a post sharing a market trend, surprising statistic, or industry observation. Make it relevant and specific to your area of expertise.',
  },
  {
    type: 'brand_authority',
    title: 'Establish Your Expertise',
    guidance:
      'Create a post that establishes your authority in your field. Share a unique perspective, lesson learned, or professional insight that builds trust.',
  },
  {
    type: 'myth_busting',
    title: 'Bust a Common Myth',
    guidance:
      'Debunk a common myth or misconception in your industry. Explain the truth clearly and position yourself as a trusted source of information.',
  },
];

// ── Diversity enforcement ────────────────────────────────────────────

/** Short labels describing each template's angle, used to tell the LLM what to avoid. */
const ANGLE_LABELS: Record<string, string> = {
  listing_post: 'property listing announcement with price/features',
  open_house_post: 'open house event announcement',
  price_drop_alert: 'price reduction alert',
  client_testimonial: 'client success story',
  market_update: 'market statistics and trends',
  business_intro: 'business introduction and positioning',
  offer_highlight: 'product/service spotlight',
  authority_education: 'educational expert content',
  neighborhood_highlight: 'neighborhood and lifestyle spotlight',
  buyer_tip: 'buyer advice and tips',
  educational_tip: 'educational tip or how-to advice',
  market_insight: 'market statistics and trends',
  brand_authority: 'personal expertise and authority',
  myth_busting: 'myth-busting or misconception correction',
};

/**
 * Build a diversity directive that tells the LLM what angles have already
 * been covered so it produces clearly different content.
 */
function buildDiversityDirective(
  priorSlots: GenerationSlot[],
): string {
  if (priorSlots.length === 0) return '';

  const covered = priorSlots
    .map((s) => ANGLE_LABELS[s.templateType] ?? s.title)
    .filter(Boolean);

  if (covered.length === 0) return '';

  return (
    '\n\nIMPORTANT — Content diversity: The other posts in this set already cover: ' +
    covered.map((a) => `"${a}"`).join(', ') +
    '. This post MUST take a clearly different angle. ' +
    'Do NOT repeat similar statistics, themes, or talking points. ' +
    'Vary your tone, structure, and hook.'
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Heuristic: does a data item look like a property listing? */
function looksLikeListing(item: DataItem): boolean {
  const d = item.dataJson;
  const t = ((d.type as string) ?? (d.dataType as string) ?? '').toLowerCase();
  if (t.includes('listing') || t.includes('property')) return true;
  return !!(d.address || d.price || d.bedrooms || d.sqft || d.mls || d.listPrice || d.beds || d.bathrooms || d.baths);
}

/** Check if a listing has enough neighborhood/location data for a lifestyle post. */
function hasNeighborhoodData(item: DataItem): boolean {
  const d = item.dataJson;
  return !!(d.neighborhood || d.locationSummary || (d.city && d.state));
}

/** Find the first listing-like data item. */
function findFirstListing(items: DataItem[]): DataItem | null {
  return items.find(looksLikeListing) ?? null;
}

// ── Channel eligibility ──────────────────────────────────────────────

const VIDEO_ONLY_CHANNELS = new Set<Channel>(['YOUTUBE', 'TIKTOK'] as Channel[]);
const MEDIA_NEEDED_CHANNELS = new Set<Channel>(['INSTAGRAM'] as Channel[]);

function resolveEligibleChannels(
  connectedChannels: Channel[],
  suggestedChannels: Channel[],
  hasMedia: boolean,
): Channel[] {
  function isEligible(ch: Channel): boolean {
    if (VIDEO_ONLY_CHANNELS.has(ch)) return false;
    if (MEDIA_NEEDED_CHANNELS.has(ch) && !hasMedia) return false;
    return true;
  }

  const connectedEligible = connectedChannels.filter(isEligible);
  const suggestedEligible = suggestedChannels.filter(isEligible);

  const SAFE_DEFAULTS: Channel[] = hasMedia
    ? ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN']
    : ['FACEBOOK', 'LINKEDIN'];

  return connectedEligible.length > 0 ? connectedEligible
    : suggestedEligible.length > 0 ? suggestedEligible
    : SAFE_DEFAULTS;
}

// ── Main planner ─────────────────────────────────────────────────────

/**
 * Build a deterministic 3-post generation plan for onboarding.
 *
 * Strategy by industry + data availability:
 *
 * RE with listings:
 *   1. Listing spotlight (property facts)
 *   2. Neighborhood/lifestyle or buyer education (no spec overlap)
 *   3. Agent expertise (market authority)
 *   Multi-property: distribute one property per post, no mixing.
 *
 * RE without listings:
 *   1. Local market insight
 *   2. Buyer education
 *   3. Agent brand authority
 *
 * Business:
 *   1. Brand introduction
 *   2. Offer/service spotlight
 *   3. Authority/education
 *
 * General/other:
 *   Falls through to core templates → generic fallbacks → starter angles.
 */
export function buildOnboardingGenerationPlan(
  input: PlannerInput,
): GenerationSlot[] {
  const {
    coreTemplates, starterAngles, dataItems, connectedChannels,
    suggestedChannels, hasMedia, industryKey, brandContext,
  } = input;

  const eligibleChannels = resolveEligibleChannels(
    connectedChannels,
    suggestedChannels ?? [],
    hasMedia ?? false,
  );

  const slots: GenerationSlot[] = [];
  const TARGET = 3;

  const assignChannel = () =>
    eligibleChannels.length > 0
      ? eligibleChannels[slots.length % eligibleChannels.length]
      : null;

  const pushSlot = (
    t: CoreTemplate,
    category: 'data-backed' | 'fallback',
    dataItem?: DataItem | null,
  ) => {
    const diversity = buildDiversityDirective(slots);
    slots.push({
      templateType: t.type,
      title: t.title,
      guidance: `${brandContext} ${t.guidance}${diversity}`,
      channel: assignChannel(),
      dataItemId: dataItem?.id ?? null,
      contentCategory: category,
    });
  };

  // ── Real estate strategy ───────────────────────────────────────────
  if (industryKey === 'real_estate') {
    const listings = dataItems.filter(looksLikeListing);

    if (listings.length > 0) {
      // Strategy: listing spotlight → lifestyle/buyer ed → agent expertise
      // Multi-property: one listing per post, no detail mixing

      // Slot 1: listing spotlight for first property
      const primary = listings[0];
      pushSlot(reListingSpotlight(primary), 'data-backed', primary);

      // Slot 2: lifestyle/neighborhood or buyer education
      // For multi-property, use a different property for slot 2 if possible
      const slot2Listing = listings.length >= 2 ? listings[1] : primary;
      if (listings.length >= 2) {
        // Second property gets its own listing spotlight
        pushSlot(reListingSpotlight(slot2Listing), 'data-backed', slot2Listing);
      } else if (hasNeighborhoodData(primary)) {
        pushSlot(reNeighborhoodPost(primary), 'data-backed', primary);
      } else {
        const propType = (primary.dataJson.propertyType as string) ?? undefined;
        pushSlot(reBuyerEducation(propType), 'fallback');
      }

      // Slot 3: third property listing, or agent expertise
      if (listings.length >= 3) {
        pushSlot(reListingSpotlight(listings[2]), 'data-backed', listings[2]);
      } else {
        pushSlot(reAgentExpertise(primary), 'fallback');
      }

      return slots;
    }

    // RE without listing data — use safe non-data templates
    for (const t of RE_NO_LISTING_TEMPLATES) {
      if (slots.length >= TARGET) break;
      pushSlot(t, 'fallback');
    }
    return slots;
  }

  // ── Business strategy (non-RE) ─────────────────────────────────────
  // Use business templates when: industry is explicitly business-like,
  // or when coreTemplates don't provide enough coverage.
  const useBusinessStrategy =
    industryKey !== 'real_estate' && dataItems.length === 0;

  if (useBusinessStrategy) {
    for (const t of BUSINESS_TEMPLATES) {
      if (slots.length >= TARGET) break;
      pushSlot(t, 'fallback');
    }
    if (slots.length >= TARGET) return slots;
  }

  // ── Generic strategy (core templates → fallbacks → angles) ─────────

  // Event-based templates that fabricate facts
  const EVENT_BLACKLIST = new Set([
    'open_house_post',
    'price_drop_alert',
    'client_testimonial',
  ]);

  const usedTypes = new Set(slots.map((s) => s.templateType));

  // Pass 1: data-backed core templates
  const dataBacked = coreTemplates
    .filter((t) => t.conditions?.hasData && !EVENT_BLACKLIST.has(t.type))
    .sort((a, b) => {
      const aL = a.conditions?.requiredDataType === 'listing' ? 0 : 1;
      const bL = b.conditions?.requiredDataType === 'listing' ? 0 : 1;
      return aL - bL;
    });

  const classified = new Map<string, DataItem[]>();
  for (const item of dataItems) {
    const dt = (item.dataJson.type as string) ?? (item.dataJson.dataType as string) ?? 'unknown';
    const bucket = classified.get(dt) ?? [];
    bucket.push(item);
    classified.set(dt, bucket);
  }
  const usedDataIds = new Set<string>();

  for (const t of dataBacked) {
    if (slots.length >= TARGET) break;
    if (usedTypes.has(t.type)) continue;
    const dataItem = findMatchingDataItem(t, classified, usedDataIds);
    if (!dataItem) continue;
    if (slots.some((s) => isSimilarAngle(s.templateType, t.type))) continue;
    usedTypes.add(t.type);
    usedDataIds.add(dataItem.id);
    pushSlot(t, 'data-backed', dataItem);
  }

  // Pass 2: non-data-dependent core templates
  const nonDataDep = coreTemplates.filter(
    (t) => !t.conditions?.hasData && !EVENT_BLACKLIST.has(t.type),
  );
  for (const t of nonDataDep) {
    if (slots.length >= TARGET) break;
    if (usedTypes.has(t.type)) continue;
    if (slots.some((s) => isSimilarAngle(s.templateType, t.type))) continue;
    usedTypes.add(t.type);
    pushSlot(t, 'fallback');
  }

  // Pass 3: generic fallback templates
  for (const t of GENERIC_FALLBACK_TEMPLATES) {
    if (slots.length >= TARGET) break;
    if (usedTypes.has(t.type)) continue;
    if (slots.some((s) => isSimilarAngle(s.templateType, t.type))) continue;
    usedTypes.add(t.type);
    pushSlot(t, 'fallback');
  }

  // Pass 4: starter angles as last resort
  for (let i = 0; slots.length < TARGET && i < starterAngles.length; i++) {
    const type = `angle_${i}`;
    if (usedTypes.has(type)) continue;
    usedTypes.add(type);
    const diversity = buildDiversityDirective(slots);
    slots.push({
      templateType: type,
      title: 'Content Idea',
      guidance: `${brandContext} ${starterAngles[i]}${diversity}`,
      channel: assignChannel(),
      dataItemId: null,
      contentCategory: 'fallback',
    });
  }

  return slots;
}

// ── Helpers exported for testing ─────────────────────────────────────

/** @internal */ export { looksLikeListing as _looksLikeListing };
/** @internal */ export { hasNeighborhoodData as _hasNeighborhoodData };
/** @internal */ export { resolveEligibleChannels as _resolveEligibleChannels };

// ── Helpers used by findMatchingDataItem ──────────────────────────────

function findMatchingDataItem(
  template: CoreTemplate,
  classified: Map<string, DataItem[]>,
  usedIds: Set<string>,
): DataItem | null {
  const requiredType = template.conditions?.requiredDataType;
  if (!requiredType) {
    let found: DataItem | null = null;
    classified.forEach((items) => {
      if (found) return;
      for (const item of items) {
        if (!usedIds.has(item.id)) { found = item; return; }
      }
    });
    return found;
  }

  const candidates = classified.get(requiredType) ?? [];
  const direct = candidates.find((c) => !usedIds.has(c.id));
  if (direct) return direct;

  if (requiredType === 'listing') {
    let found: DataItem | null = null;
    classified.forEach((items) => {
      if (found) return;
      for (const item of items) {
        if (!usedIds.has(item.id) && looksLikeListing(item)) { found = item; return; }
      }
    });
    return found;
  }

  return null;
}

function isSimilarAngle(typeA: string, typeB: string): boolean {
  const a = ANGLE_LABELS[typeA] ?? '';
  const b = ANGLE_LABELS[typeB] ?? '';
  if (!a || !b) return false;
  return a === b;
}
