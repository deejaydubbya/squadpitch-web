import type { AssistantSessionState, CampaignSourceType } from '../types';
import type { CampaignType, DraftKind, Channel, CampaignImageContext } from '@/hooks/useSquadpitch';
import { CAMPAIGN_PHASES } from '../campaignStrategy';
import type { CampaignPhaseKey } from '../campaignStrategy.types';

/**
 * Maps session state → campaign generation API input.
 * SessionState is the single source of truth for generation.
 * Chat history is never consulted.
 */
export interface CampaignGenerationInput {
  /**
   * The canonical context object passed to the prompt builder. Shape
   * depends on sourceType:
   *  - property: the listing's dataJson (address/price/etc.)
   *  - data_item: { title, type, summary, ...item.dataJson }
   *  - idea:    { title: 'Custom idea', idea: <user text> }
   * Backend treats this as opaque input + reads `sourceType` to know
   * how to frame the prompt.
   */
  propertyData: Record<string, unknown>;
  /**
   * What kind of source this campaign is built from. Backend prompts
   * differ for property (listing-aware framing) vs data_item/idea
   * (generic content campaign framing).
   */
  sourceType?: CampaignSourceType;
  campaignType?: CampaignType;
  dataItemId?: string;
  slots: Array<{
    label: string;
    channel: string;
    campaignDay: number;
    slotType?: string;
    angle?: string;
    /** Phase key from the strategy architecture (e.g. 'announcement', 'feature') */
    phase?: string;
    /** Phase objective guidance for generation */
    phaseObjective?: string;
  }>;
  preferencesContext?: string;
  /** Strategy context for generation — included when strategy architecture is active */
  strategyContext?: string;
  /** Image context for the AI to assign imageHint to posts */
  imageContext?: CampaignImageContext[];
}

/**
 * Maps session state → quick post generation API input.
 */
export interface QuickPostGenerationInput {
  clientId: string;
  kind: DraftKind;
  channel: Channel;
  guidance: string;
  dataItemId?: string;
  blueprintId?: string;
}

/**
 * Extract campaign generation input from session state.
 * Returns null if state is incomplete.
 */
export function mapSessionToCampaignInput(
  session: AssistantSessionState,
  preferencesContext?: string | null
): CampaignGenerationInput | null {
  if (!session.campaignType) return null;
  if (session.slots.length === 0) return null;

  // Resolve the source-derived context object that we send to the
  // backend as `propertyData`. Default to property for legacy
  // sessions that haven't picked a source type yet.
  const sourceType: CampaignSourceType = session.campaignSourceType ?? 'property';
  let sourceData: Record<string, unknown> | null = null;
  let dataItemId: string | undefined;

  if (sourceType === 'property') {
    if (!session.propertyData) return null;
    sourceData = session.propertyData;
    dataItemId = session.selectedPropertyId ?? undefined;
  } else if (sourceType === 'data_item') {
    if (!session.campaignDataItemId) return null;
    const item = session.campaignDataItemData ?? {};
    sourceData = {
      ...item,
      title: session.campaignDataItemTitle ?? (item as { title?: unknown }).title ?? 'Content Asset',
      _dataItemType: session.campaignDataItemType ?? null,
    };
    dataItemId = session.campaignDataItemId;
  } else {
    // idea
    if (!session.campaignIdea) return null;
    sourceData = {
      title: 'Custom campaign idea',
      idea: session.campaignIdea,
    };
  }

  // Build imageContext from property photos for AI imageHint
  // assignment. Only applicable when source is a property (data
  // items / ideas don't carry an `images` array).
  let imageContext: CampaignImageContext[] | undefined;
  if (sourceType === 'property') {
    const images = sourceData?.images as
      | Array<{ url?: string; label?: string; description?: string }>
      | undefined;
    imageContext =
      Array.isArray(images) && images.length > 0
        ? images.slice(0, 8).map((img, i) => ({
            label: img.label || `photo_${i + 1}`,
            description: img.description || '',
          }))
        : undefined;
  }

  return {
    propertyData: sourceData!,
    sourceType,
    campaignType: session.campaignType as CampaignType,
    dataItemId,
    slots: session.slots.map((s) => {
      const phaseKey = s.angle as CampaignPhaseKey | undefined;
      const phaseDef = phaseKey && CAMPAIGN_PHASES[phaseKey] ? CAMPAIGN_PHASES[phaseKey] : null;
      return {
        label: s.label ?? '',
        channel: s.channel,
        campaignDay: s.campaignDay,
        slotType: s.slotType,
        angle: s.angle,
        phase: phaseKey,
        phaseObjective: phaseDef?.objective,
      };
    }),
    preferencesContext: preferencesContext ?? undefined,
    imageContext,
  };
}

/**
 * Extract quick post generation input from session state.
 * Returns null if state is incomplete.
 */
export function mapSessionToQuickPostInput(
  session: AssistantSessionState,
  clientId: string,
  preferencesContext?: string | null
): QuickPostGenerationInput | null {
  if (!session.quickPostChannel) return null;

  // Determine if user chose to use data or not
  const isNoData = session.quickPostSource === 'idea' || (
    !session.quickPostDataItemId && !session.selectedPropertyId
  );

  const parts: string[] = [];
  if (session.quickPostGoal) parts.push(`[Goal: ${session.quickPostGoal}]`);
  if (session.quickPostContentType) parts.push(`[Type: ${session.quickPostContentType}]`);

  // Only include property context when user intentionally selected data
  if (!isNoData && session.propertyData) {
    const address = session.propertyData.address as string | undefined;
    if (address) parts.push(`Property: ${address}`);
  }

  if (session.quickPostGuidance) parts.push(session.quickPostGuidance);
  if (preferencesContext) parts.push(preferencesContext);

  // When no data source, explicitly instruct AI to stay general
  if (isNoData) {
    parts.push('[NO_DATA_IDEA_POST] This is a no-data educational/idea post. Write a general educational real estate post. Do not mention a property, listing, address, price, square footage, bedrooms, bathrooms, neighborhood, seller, buyer, showing, testimonial, or client.');

    // Myth buster content type: extra guidance
    if (session.quickPostContentType && /myth/i.test(session.quickPostContentType)) {
      parts.push('[MYTH_BUSTER] Debunk one common real estate myth in general terms. Do not invent or reference a property listing, address, or price.');
    }
  }

  return {
    clientId,
    kind: session.quickPostKind as DraftKind,
    channel: session.quickPostChannel as Channel,
    guidance: parts.length > 0 ? parts.join(' ') : 'Create an engaging post',
    // Only pass dataItemId when user intentionally selected data
    dataItemId: isNoData ? undefined : (session.quickPostDataItemId ?? session.selectedPropertyId ?? undefined),
    blueprintId: session.quickPostBlueprintId ?? undefined,
  };
}

/**
 * Validates that session has all required fields for generation.
 * Same as isReadyToGenerate but returns specific missing fields.
 */
export function validateSessionForGeneration(session: AssistantSessionState): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!session.mode) {
    return { valid: false, missing: ['mode'] };
  }

  if (session.mode === 'campaign') {
    const src = session.campaignSourceType;
    if (!src) {
      missing.push('campaignSourceType');
    } else if (src === 'property' && !session.selectedPropertyId) {
      missing.push('property');
    } else if (src === 'data_item' && !session.campaignDataItemId) {
      missing.push('campaignDataItem');
    } else if (src === 'idea' && !session.campaignIdea) {
      missing.push('campaignIdea');
    }
    if (!session.campaignType) missing.push('campaignType');
    if (session.channels.length === 0) missing.push('channels');
    if (session.slots.length === 0) missing.push('schedule');
  } else {
    if (!session.quickPostChannel) missing.push('channel');
  }

  return { valid: missing.length === 0, missing };
}
