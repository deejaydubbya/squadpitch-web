import type { AssistantSessionState } from '../types';
import type { CampaignType, DraftKind, Channel, CampaignImageContext } from '@/hooks/useSquadpitch';
import { CAMPAIGN_PHASES } from '../campaignStrategy';
import type { CampaignPhaseKey } from '../campaignStrategy.types';

/**
 * Maps session state → campaign generation API input.
 * SessionState is the single source of truth for generation.
 * Chat history is never consulted.
 */
export interface CampaignGenerationInput {
  propertyData: Record<string, unknown>;
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
  if (!session.propertyData) return null;
  if (!session.campaignType) return null;
  if (session.slots.length === 0) return null;

  // Build imageContext from property photos for AI imageHint assignment
  const images = session.propertyData.images as Array<{ url?: string; label?: string; description?: string }> | undefined;
  const imageContext: CampaignImageContext[] | undefined =
    Array.isArray(images) && images.length > 0
      ? images.slice(0, 8).map((img, i) => ({
          label: img.label || `photo_${i + 1}`,
          description: img.description || '',
        }))
      : undefined;

  return {
    propertyData: session.propertyData,
    campaignType: session.campaignType as CampaignType,
    dataItemId: session.selectedPropertyId ?? undefined,
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
    if (!session.selectedPropertyId) missing.push('property');
    if (!session.campaignType) missing.push('campaignType');
    if (session.channels.length === 0) missing.push('channels');
    if (session.slots.length === 0) missing.push('schedule');
  } else {
    if (!session.quickPostChannel) missing.push('channel');
  }

  return { valid: missing.length === 0, missing };
}
