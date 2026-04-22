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
  industryKey: string;
  brandContext: string;
}

// ── Safe fallback templates (no data dependency) ────────────────────

const FALLBACK_TEMPLATES: CoreTemplate[] = [
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

// ── Helpers ──────────────────────────────────────────────────────────

/** Classify data items by their type field. */
function classifyDataItems(
  items: DataItem[],
): Map<string, DataItem[]> {
  const map = new Map<string, DataItem[]>();
  for (const item of items) {
    const dataType =
      (item.dataJson.type as string) ??
      (item.dataJson.dataType as string) ??
      'unknown';
    const bucket = map.get(dataType) ?? [];
    bucket.push(item);
    map.set(dataType, bucket);
  }
  return map;
}

/** Check if a template's data requirement can be satisfied. */
function findMatchingDataItem(
  template: CoreTemplate,
  classified: Map<string, DataItem[]>,
  usedIds: Set<string>,
): DataItem | null {
  const requiredType = template.conditions?.requiredDataType;
  if (!requiredType) {
    // Template needs *any* data (hasData: true without requiredDataType)
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
  return candidates.find((c) => !usedIds.has(c.id)) ?? null;
}

// ── Main planner ─────────────────────────────────────────────────────

/**
 * Build a deterministic 3-post generation plan for onboarding.
 *
 * Algorithm:
 * 1. Classify data items by type
 * 2. Filter templates: skip those with requiredDataType when no matching data exists
 * 3. Pick data-backed templates first (up to available data items)
 * 4. Fill remaining with non-data-dependent templates, then fallbacks
 * 5. Assign channels round-robin from connectedChannels (null if none)
 * 6. Never reuse same template type or data item
 */
export function buildOnboardingGenerationPlan(
  input: PlannerInput,
): GenerationSlot[] {
  const { coreTemplates, starterAngles, dataItems, connectedChannels, brandContext } =
    input;

  // Exclude YouTube — requires video which is too expensive for onboarding
  const eligibleChannels = connectedChannels.filter((ch) => ch !== 'YOUTUBE');

  const classified = classifyDataItems(dataItems);
  const usedTemplateTypes = new Set<string>();
  const usedDataIds = new Set<string>();
  const slots: GenerationSlot[] = [];
  const TARGET = 3;

  // Separate data-backed vs non-data-dependent core templates
  const dataBacked: CoreTemplate[] = [];
  const nonDataDependent: CoreTemplate[] = [];

  for (const t of coreTemplates) {
    if (t.conditions?.hasData) {
      dataBacked.push(t);
    } else {
      nonDataDependent.push(t);
    }
  }

  // Pass 1: eligible data-backed templates (have matching data items)
  for (const t of dataBacked) {
    if (slots.length >= TARGET) break;
    if (usedTemplateTypes.has(t.type)) continue;

    const dataItem = findMatchingDataItem(t, classified, usedDataIds);
    if (!dataItem) continue; // skip — no matching data exists

    usedTemplateTypes.add(t.type);
    usedDataIds.add(dataItem.id);
    slots.push({
      templateType: t.type,
      title: t.title,
      guidance: `${brandContext} ${t.guidance}`,
      channel: eligibleChannels.length > 0
        ? eligibleChannels[slots.length % eligibleChannels.length]
        : null,
      dataItemId: dataItem.id,
      contentCategory: 'data-backed',
    });
  }

  // Pass 2: non-data-dependent core templates
  for (const t of nonDataDependent) {
    if (slots.length >= TARGET) break;
    if (usedTemplateTypes.has(t.type)) continue;

    usedTemplateTypes.add(t.type);
    slots.push({
      templateType: t.type,
      title: t.title,
      guidance: `${brandContext} ${t.guidance}`,
      channel: eligibleChannels.length > 0
        ? eligibleChannels[slots.length % eligibleChannels.length]
        : null,
      dataItemId: null,
      contentCategory: 'fallback',
    });
  }

  // Pass 3: fallback templates (safe, no data dependency)
  for (const t of FALLBACK_TEMPLATES) {
    if (slots.length >= TARGET) break;
    if (usedTemplateTypes.has(t.type)) continue;

    usedTemplateTypes.add(t.type);
    slots.push({
      templateType: t.type,
      title: t.title,
      guidance: `${brandContext} ${t.guidance}`,
      channel: eligibleChannels.length > 0
        ? eligibleChannels[slots.length % eligibleChannels.length]
        : null,
      dataItemId: null,
      contentCategory: 'fallback',
    });
  }

  // Pass 4: last resort — use starterAngles as guidance
  for (let i = 0; slots.length < TARGET && i < starterAngles.length; i++) {
    const type = `angle_${i}`;
    if (usedTemplateTypes.has(type)) continue;

    usedTemplateTypes.add(type);
    slots.push({
      templateType: type,
      title: 'Content Idea',
      guidance: `${brandContext} ${starterAngles[i]}`,
      channel: eligibleChannels.length > 0
        ? eligibleChannels[slots.length % eligibleChannels.length]
        : null,
      dataItemId: null,
      contentCategory: 'fallback',
    });
  }

  return slots;
}
