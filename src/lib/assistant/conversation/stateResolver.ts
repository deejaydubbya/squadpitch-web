import type { AssistantSessionState, FieldStatus } from '../types';
import type { ResolvedPrompt, CardType, Step } from './types';
import { getAdapterSafe } from '../adapterRegistry';

// ── Field Definition ────────────────────────────────────────────────

interface FieldDef {
  field: string;
  cardType: CardType;
  priority: number;
  /** Label shown in sidebar */
  label: string | ((s: AssistantSessionState) => string);
  /** Display value for sidebar — returns null if field is empty */
  displayValue: (s: AssistantSessionState) => string | null;
  /** Whether the field has a value (regardless of source/status) */
  isComplete: (s: AssistantSessionState) => boolean;
  /** Whether this field is relevant in the current flow path (default: always) */
  isRelevant?: (s: AssistantSessionState) => boolean;
}

/** Exported summary item type for consumers (SummaryPanel, etc.) */
export interface SummaryItem {
  field: string;
  label: string;
  value: string | null;
  status: FieldStatus;
}

/**
 * Priority-ordered field requirements for campaign mode.
 * Lower priority number = ask first.
 */
const CAMPAIGN_FIELDS: FieldDef[] = [
  {
    field: 'mode',
    cardType: 'mode_select',
    priority: 0,
    label: 'Mode',
    displayValue: (s) => s.mode === 'campaign' ? 'Campaign' : s.mode === 'quick_post' ? 'Quick Post' : null,
    isComplete: (s) => s.mode !== null,
  },
  {
    field: 'selectedPropertyId',
    cardType: 'property_select',
    priority: 10,
    label: (s) => {
      const t = getAdapterSafe(s.industryKey).terminology;
      return t.itemSingular.charAt(0).toUpperCase() + t.itemSingular.slice(1);
    },
    displayValue: (s) => {
      if (!s.propertyData) return null;
      const d = s.propertyData;
      return (d.address as string)
        || (d.title as string)
        || (d.name as string)
        || (d.streetAddress as string)
        || ((() => {
          const street = d.street as string | undefined;
          const city = d.city as string | undefined;
          if (street && city) return `${street}, ${city}`;
          return street || city || null;
        })())
        || 'Selected';
    },
    isComplete: (s) => s.selectedPropertyId !== null,
  },
  {
    field: 'campaignType',
    cardType: 'campaign_type',
    priority: 20,
    label: 'Campaign Type',
    displayValue: (s) => {
      if (!s.campaignType) return null;
      const adapter = getAdapterSafe(s.industryKey);
      return adapter.campaignTypes.find((ct) => ct.value === s.campaignType)?.label ?? s.campaignType;
    },
    isComplete: (s) => s.campaignType !== null,
  },
  {
    field: 'channels',
    cardType: 'channel_select',
    priority: 30,
    label: 'Channels',
    displayValue: (s) => s.channels.length > 0 ? s.channels.join(', ') : null,
    isComplete: (s) => s.channels.length > 0,
  },
  {
    field: 'selectedMediaIds',
    cardType: 'media_select',
    priority: 40,
    label: 'Media',
    displayValue: (s) => {
      if (s.selectedMediaIds.length > 0) {
        const realCount = s.selectedMediaIds.filter(
          (id) => !id.startsWith('property_img_') && !id.startsWith('item_img_')
        ).length;
        const syntheticCount = s.selectedMediaIds.length - realCount;
        const parts: string[] = [];
        if (realCount > 0) parts.push(`${realCount} library`);
        if (syntheticCount > 0) parts.push(`${syntheticCount} property`);
        const heroSuffix = s.heroImageId ? ' (hero set)' : '';
        return `${s.selectedMediaIds.length} selected${heroSuffix}`;
      }
      if (s.mediaAcknowledged) return 'Skipped';
      return null;
    },
    isComplete: (s) => s.selectedMediaIds.length > 0 || s.mediaAcknowledged === true,
  },
  {
    field: 'slots',
    cardType: 'schedule_review',
    priority: 50,
    label: 'Schedule',
    displayValue: (s) => s.slots.length > 0 ? `${s.slots.length} posts` : null,
    isComplete: (s) => s.slots.length > 0,
  },
];

const QUICK_POST_FIELDS: FieldDef[] = [
  {
    field: 'mode',
    cardType: 'mode_select',
    priority: 0,
    label: 'Mode',
    displayValue: (s) => s.mode === 'campaign' ? 'Campaign' : s.mode === 'quick_post' ? 'Quick Post' : null,
    isComplete: (s) => s.mode !== null,
  },
  {
    field: 'quickPostSource',
    cardType: 'quick_post_source',
    priority: 5,
    label: 'Source',
    displayValue: (s) => s.quickPostSource === 'data' ? 'Use my data' : s.quickPostSource === 'idea' ? 'Start from an idea' : null,
    isComplete: (s) => s.quickPostSource !== null,
  },
  {
    field: 'quickPostDataItemId',
    cardType: 'quick_post_data',
    priority: 10,
    label: 'Data Source',
    displayValue: (s) => s.quickPostDataItemTitle || (s.quickPostDataItemId ? 'Selected' : null),
    // Skipped if idea path — only required when source === 'data'
    isComplete: (s) => s.quickPostSource !== 'data' || s.quickPostDataItemId !== null,
    isRelevant: (s) => s.quickPostSource === 'data',
  },
  {
    field: 'quickPostGuidance',
    cardType: 'quick_post_guidance',
    priority: 15,
    label: 'Topic',
    displayValue: (s) => {
      if (!s.quickPostGuidance) return null;
      return s.quickPostGuidance.length > 40 ? s.quickPostGuidance.slice(0, 40) + '...' : s.quickPostGuidance;
    },
    // Skipped if data path — auto-filled when data item is selected
    isComplete: (s) => s.quickPostSource !== 'idea' || !!s.quickPostGuidance,
    isRelevant: (s) => s.quickPostSource === 'idea',
  },
  {
    field: 'quickPostContentType',
    cardType: 'quick_post_content_type',
    priority: 20,
    label: 'Content Type',
    displayValue: (s) => s.quickPostContentType
      ? s.quickPostContentType.charAt(0).toUpperCase() + s.quickPostContentType.slice(1).replace(/_/g, ' ')
      : null,
    isComplete: (s) => s.quickPostContentType !== null,
  },
  {
    field: 'quickPostChannel',
    cardType: 'channel_select',
    priority: 30,
    label: 'Channel',
    displayValue: (s) => s.quickPostChannel,
    isComplete: (s) => s.quickPostChannel !== null,
  },
  {
    field: 'selectedMediaIds',
    cardType: 'media_select',
    priority: 35,
    label: 'Media',
    displayValue: (s) => {
      if (s.selectedMediaIds.length > 0) {
        const heroSuffix = s.heroImageId ? ' (hero set)' : '';
        return `${s.selectedMediaIds.length} selected${heroSuffix}`;
      }
      if (s.mediaAcknowledged) return 'Skipped';
      return null;
    },
    isComplete: (s) => s.selectedMediaIds.length > 0 || s.mediaAcknowledged === true,
  },
  {
    field: 'quickPostGoal',
    cardType: 'quick_post_goal',
    priority: 40,
    label: 'Goal',
    displayValue: (s) => s.quickPostGoal,
    isComplete: (s) => s.quickPostGoal !== null,
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
    // Skip fields irrelevant to the current flow path
    if (f.isRelevant && !f.isRelevant(session)) continue;
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
 * Data-driven summary derived from session state + fieldMeta.
 * Campaign: shows all fields. Quick post: progressive disclosure.
 * The sidebar is never a fixed list — it reflects current truth.
 */
export function getStateSummary(session: AssistantSessionState): SummaryItem[] {
  if (!session.mode) return [];

  const fields = session.mode === 'campaign' ? CAMPAIGN_FIELDS : QUICK_POST_FIELDS;
  const items: SummaryItem[] = [];
  let nextMissingShown = false;

  for (const f of fields) {
    // Skip fields irrelevant to the current flow path
    if (f.isRelevant && !f.isRelevant(session)) continue;

    const complete = f.isComplete(session);
    const value = f.displayValue(session);
    const meta = session.fieldMeta[f.field];
    const label = typeof f.label === 'function' ? f.label(session) : f.label;

    // Status priority: explicit fieldMeta > derived from completion
    const status: FieldStatus = meta?.status ?? (complete ? 'confirmed' : 'missing');

    // Quick post progressive disclosure: show confirmed + first missing only
    if (session.mode === 'quick_post' && status === 'missing') {
      if (nextMissingShown) continue;
      nextMissingShown = true;
    }

    items.push({ field: f.field, label, value, status });
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
  quickPostSource: () => "Do you want to use your data or start from an idea?",
  quickPostDataItemId: () => "Which data item should we base this post on?",
  quickPostChannel: () => "Which channel is this post for?",
  quickPostGuidance: () => "What do you want to post about?",
  quickPostContentType: () => "What type of content is this?",
  quickPostGoal: () => "What's the goal of this post?",
  selectedMediaIds: (s) => s.mode === 'quick_post'
    ? "Add images or videos to your post, or skip to continue."
    : "Select media for your campaign — choose from property photos or your media library.",
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
