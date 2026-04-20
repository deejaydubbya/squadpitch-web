import type { AssistantSessionState } from '../types';
import type { CampaignType, DraftKind, Channel } from '@/hooks/useSquadpitch';

/**
 * Maps session state → campaign generation API input.
 * SessionState is the single source of truth for generation.
 * Chat history is never consulted.
 */
export interface CampaignGenerationInput {
  propertyData: Record<string, unknown>;
  campaignType?: CampaignType;
  slots: Array<{
    label: string;
    channel: string;
    campaignDay: number;
    slotType?: string;
    angle?: string;
  }>;
  preferencesContext?: string;
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

  return {
    propertyData: session.propertyData,
    campaignType: session.campaignType as CampaignType,
    slots: session.slots.map((s) => ({
      label: s.label ?? '',
      channel: s.channel,
      campaignDay: s.campaignDay,
      slotType: s.slotType,
      angle: s.angle,
    })),
    preferencesContext: preferencesContext ?? undefined,
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

  const parts: string[] = [];
  if (session.propertyData) {
    const address = session.propertyData.address as string | undefined;
    if (address) parts.push(`Property: ${address}`);
  }
  if (session.quickPostGuidance) parts.push(session.quickPostGuidance);
  if (preferencesContext) parts.push(preferencesContext);

  return {
    clientId,
    kind: session.quickPostKind as DraftKind,
    channel: session.quickPostChannel as Channel,
    guidance: parts.length > 0 ? parts.join('\n') : 'Create an engaging post',
    dataItemId: session.selectedPropertyId ?? undefined,
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
