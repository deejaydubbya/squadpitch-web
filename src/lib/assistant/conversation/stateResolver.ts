import type { AssistantSessionState } from '../types';
import type { ResolvedPrompt, CardType, Step } from './types';
import { getAdapterSafe } from '../adapterRegistry';

/**
 * Priority-ordered field requirements for campaign mode.
 * Lower priority number = ask first.
 */
const CAMPAIGN_FIELDS: Array<{
  field: string;
  cardType: CardType;
  priority: number;
  isComplete: (s: AssistantSessionState) => boolean;
}> = [
  {
    field: 'mode',
    cardType: 'mode_select',
    priority: 0,
    isComplete: (s) => s.mode !== null,
  },
  {
    field: 'selectedPropertyId',
    cardType: 'property_select',
    priority: 10,
    isComplete: (s) => s.selectedPropertyId !== null,
  },
  {
    field: 'campaignType',
    cardType: 'campaign_type',
    priority: 20,
    isComplete: (s) => s.campaignType !== null,
  },
  {
    field: 'channels',
    cardType: 'channel_select',
    priority: 30,
    isComplete: (s) => s.channels.length > 0,
  },
  {
    field: 'selectedMediaIds',
    cardType: 'media_select',
    priority: 40,
    isComplete: (s) => s.selectedMediaIds.length > 0 || s.mediaAcknowledged === true,
  },
  {
    field: 'slots',
    cardType: 'schedule_review',
    priority: 50,
    isComplete: (s) => s.slots.length > 0,
  },
];

const QUICK_POST_FIELDS: Array<{
  field: string;
  cardType: CardType;
  priority: number;
  isComplete: (s: AssistantSessionState) => boolean;
}> = [
  {
    field: 'mode',
    cardType: 'mode_select',
    priority: 0,
    isComplete: (s) => s.mode !== null,
  },
  {
    field: 'quickPostChannel',
    cardType: 'channel_select',
    priority: 20,
    isComplete: (s) => s.quickPostChannel !== null,
  },
];

/**
 * Resolves what field(s) to ask for next, based on current state.
 * Returns all missing required fields sorted by priority.
 * The first item is the next question to ask.
 */
export function resolveNextPrompts(session: AssistantSessionState): ResolvedPrompt[] {
  // If no mode yet, that's the only thing to ask
  if (!session.mode) {
    return [{
      field: 'mode',
      cardType: 'mode_select',
      priority: 0,
    }];
  }

  const fields = session.mode === 'campaign' ? CAMPAIGN_FIELDS : QUICK_POST_FIELDS;
  const missing: ResolvedPrompt[] = [];

  for (const f of fields) {
    if (!f.isComplete(session)) {
      missing.push({
        field: f.field,
        cardType: f.cardType,
        priority: f.priority,
      });
    }
  }

  return missing.sort((a, b) => a.priority - b.priority);
}

/**
 * Returns true if all required fields are complete and generation can proceed.
 */
export function isReadyToGenerate(session: AssistantSessionState): boolean {
  if (!session.mode) return false;
  const missing = resolveNextPrompts(session);
  return missing.length === 0;
}

/**
 * Returns a completionStatus record: field → boolean.
 * This is the canonical check for what's done vs pending.
 * SessionState is the source of truth — this is derived, not stored.
 */
export function getCompletionStatus(session: AssistantSessionState): Record<string, boolean> {
  if (!session.mode) {
    return { mode: false };
  }

  const fields = session.mode === 'campaign' ? CAMPAIGN_FIELDS : QUICK_POST_FIELDS;
  const status: Record<string, boolean> = {};

  for (const f of fields) {
    status[f.field] = f.isComplete(session);
  }

  return status;
}

/**
 * Returns a summary of confirmed vs missing fields for the summary panel.
 */
export function getStateSummary(session: AssistantSessionState): Array<{
  field: string;
  label: string;
  value: string | null;
  confirmed: boolean;
}> {
  if (!session.mode) return [];

  const adapter = getAdapterSafe(session.industryKey);
  const t = adapter.terminology;

  const items: Array<{ field: string; label: string; value: string | null; confirmed: boolean }> = [];

  items.push({
    field: 'mode',
    label: 'Mode',
    value: session.mode === 'campaign' ? 'Campaign' : 'Quick Post',
    confirmed: true,
  });

  if (session.mode === 'campaign') {
    items.push({
      field: 'selectedPropertyId',
      label: t.itemSingular.charAt(0).toUpperCase() + t.itemSingular.slice(1),
      value: session.propertyData
        ? (session.propertyData.address as string) || (session.propertyData.title as string) || 'Selected'
        : null,
      confirmed: session.selectedPropertyId !== null,
    });

    items.push({
      field: 'campaignType',
      label: 'Campaign Type',
      value: session.campaignType
        ? adapter.campaignTypes.find((ct) => ct.value === session.campaignType)?.label ?? session.campaignType
        : null,
      confirmed: session.campaignType !== null,
    });

    items.push({
      field: 'channels',
      label: 'Channels',
      value: session.channels.length > 0 ? session.channels.join(', ') : null,
      confirmed: session.channels.length > 0,
    });

    const hasPropertyImages = session.propertyData
      && (Array.isArray(session.propertyData.images) || typeof session.propertyData.imageUrl === 'string');
    items.push({
      field: 'selectedMediaIds',
      label: 'Images',
      value: session.selectedMediaIds.length > 0
        ? `${session.selectedMediaIds.length} selected`
        : session.mediaAcknowledged
          ? (hasPropertyImages ? 'Property photos' : 'Skipped')
          : null,
      confirmed: session.selectedMediaIds.length > 0 || session.mediaAcknowledged,
    });

    items.push({
      field: 'slots',
      label: 'Schedule',
      value: session.slots.length > 0 ? `${session.slots.length} posts` : null,
      confirmed: session.slots.length > 0,
    });
  } else {
    const kindLabels: Record<string, string> = { POST: 'Post', CAPTION: 'Caption', VIDEO_SCRIPT: 'Video Script' };
    items.push({
      field: 'quickPostKind',
      label: 'Content Type',
      value: kindLabels[session.quickPostKind] ?? session.quickPostKind,
      confirmed: true, // always has a default
    });

    items.push({
      field: 'quickPostChannel',
      label: 'Channel',
      value: session.quickPostChannel,
      confirmed: session.quickPostChannel !== null,
    });
  }

  return items;
}

// ── Step Messages ───────────────────────────────────────────────────────

const STEP_MESSAGES: Record<string, (session: AssistantSessionState) => string> = {
  mode: () => "What would you like to create?",
  selectedPropertyId: (s) => {
    const t = getAdapterSafe(s.industryKey).terminology;
    return `Which ${t.itemSingular} is this for?`;
  },
  campaignType: () => "What type of campaign should we create?",
  channels: () => "Which channels do you want to post on?",
  quickPostChannel: () => "Which channel is this post for?",
  selectedMediaIds: () => "Which images should we use? Select from your property photos or media library.",
  slots: () => "Review and confirm the posting schedule.",
};

const READY_MESSAGE = "Everything looks good. Ready to generate!";

// ── Decision Engine ─────────────────────────────────────────────────────

/**
 * The assistant decision engine.
 *
 * Evaluates session state and returns the single next Step.
 * No fixed order — skips completed fields, picks the highest-priority
 * missing field. Returns `ready: true` when all required fields are set.
 *
 * Usage:
 *   const step = getNextStep(session);
 *   if (step.ready) { /* show generate button *\/ }
 *   else { /* render step.cardType with step.message *\/ }
 */
export function getNextStep(session: AssistantSessionState): Step {
  const missing = resolveNextPrompts(session);

  if (missing.length === 0) {
    return {
      message: READY_MESSAGE,
      requiredFields: [],
      ready: true,
      cardType: 'generation',
    };
  }

  const next = missing[0]; // highest priority (already sorted)
  const messageFn = STEP_MESSAGES[next.field];
  const message = messageFn ? messageFn(session) : `Please provide: ${next.field}`;

  return {
    message,
    requiredFields: [next.field],
    cardType: next.cardType,
    ready: false,
  };
}
