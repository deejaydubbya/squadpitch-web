// Parse source attribution off `Draft.warnings: string[]`.
//
// The save-drafts route persists campaign source attribution as
// free-form `key:value` tags on each draft's `warnings` array (no
// schema migration). Planner UI surfaces (CampaignSection,
// DraftPreviewCard, draft tooltips) need a typed view of that data
// so they can render a source row, build correct Create-link
// fallbacks, and adapt copy per source type. This is that helper.
//
// Tag shape (written by squadpitch-api/domains/studio/studio.routes.js
// in the /listing-campaign/save-drafts handler):
//   source:property|data_item|idea
//   campaignType:<string>
//   campaignNameRoot:<string>
//   address:<string>            (property only)
//   sourceTitle:<string>        (optional, truncated to 120)
//   sourceDataItemType:<string> (optional)
//   campaignIdea:<string>       (idea only, truncated to 200)
//   dataItemId:<string>         (optional)
//   angle:<string>              (per-post; ignored here)
//
// Backward compat:
//   - Autopilot drafts use a different tag namespace
//     (autopilot_*, source:listing/review/milestone). We recognize
//     `source:listing` → 'property' so old campaigns still display.
//   - Drafts with no `source:` tag return `sourceType: null`.

import type { CampaignSourceType } from './types';

export interface DraftSourceMeta {
  sourceType: CampaignSourceType | null;
  sourceTitle: string | null;
  sourceDataItemType: string | null;
  campaignIdea: string | null;
  address: string | null;
  dataItemId: string | null;
  campaignNameRoot: string | null;
  campaignType: string | null;
  /** True when the draft has any autopilot_* tag. */
  isAutopilot: boolean;
}

const EMPTY: DraftSourceMeta = {
  sourceType: null,
  sourceTitle: null,
  sourceDataItemType: null,
  campaignIdea: null,
  address: null,
  dataItemId: null,
  campaignNameRoot: null,
  campaignType: null,
  isAutopilot: false,
};

// `warnings` entries follow the shape "key:value". The route
// formatter uses no space after the colon (`source:property`) but
// autopilot uses ", " patterns ("autopilot: true"). Trim both.
function readTag(warnings: readonly string[], key: string): string | null {
  const prefix = `${key}:`;
  for (const w of warnings) {
    if (typeof w !== 'string') continue;
    if (w.startsWith(prefix)) {
      return w.slice(prefix.length).trim();
    }
  }
  return null;
}

function normalizeSourceType(raw: string | null): CampaignSourceType | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === 'property' || v === 'listing') return 'property';
  if (v === 'data_item' || v === 'content_asset' || v === 'asset') return 'data_item';
  if (v === 'idea' || v === 'prompt') return 'idea';
  return null;
}

export function parseDraftSourceMeta(
  warnings: readonly string[] | null | undefined,
): DraftSourceMeta {
  if (!warnings || warnings.length === 0) return EMPTY;

  const sourceType = normalizeSourceType(readTag(warnings, 'source'));
  const sourceTitle = readTag(warnings, 'sourceTitle');
  const sourceDataItemType = readTag(warnings, 'sourceDataItemType');
  const campaignIdea = readTag(warnings, 'campaignIdea');
  const address = readTag(warnings, 'address');
  const dataItemId = readTag(warnings, 'dataItemId');
  const campaignNameRoot = readTag(warnings, 'campaignNameRoot');
  const campaignType = readTag(warnings, 'campaignType');

  const isAutopilot = warnings.some(
    (w) => typeof w === 'string' && (w === 'autopilot: true' || w.startsWith('autopilot_')),
  );

  return {
    sourceType,
    sourceTitle,
    sourceDataItemType,
    campaignIdea,
    address,
    dataItemId,
    campaignNameRoot,
    campaignType,
    isAutopilot,
  };
}

// ── Display helpers ─────────────────────────────────────────────────

/**
 * Human-readable label for the source type. Returns null when the
 * source type can't be determined so callers can decide whether to
 * hide the source row entirely vs. show a fallback string.
 */
export function sourceTypeLabel(sourceType: CampaignSourceType | null): string | null {
  if (sourceType === 'property') return 'Property';
  if (sourceType === 'data_item') return 'Content asset';
  if (sourceType === 'idea') return 'Idea';
  return null;
}

/**
 * Best-effort source title for display in lists/cards. Falls back
 * through address → sourceTitle → campaignNameRoot → null so older
 * drafts that only carry one of those tags still get a sensible
 * label.
 */
export function sourceTitleForDisplay(meta: DraftSourceMeta): string | null {
  if (meta.sourceType === 'property') {
    return meta.address ?? meta.sourceTitle ?? meta.campaignNameRoot ?? null;
  }
  if (meta.sourceType === 'data_item') {
    return meta.sourceTitle ?? meta.campaignNameRoot ?? null;
  }
  if (meta.sourceType === 'idea') {
    return meta.campaignIdea ?? meta.campaignNameRoot ?? null;
  }
  return meta.campaignNameRoot ?? null;
}

/**
 * Build the canonical `/create` link for "edit / regenerate this
 * campaign" — uses the new `intent=` contract and the source
 * attribution we parsed. Returns just the query string (callers
 * prepend `/create?`).
 *
 * - property + dataItemId   → ?intent=campaign&sourceType=property&sourceId=<id>
 * - data_item + dataItemId  → ?intent=campaign&sourceType=content_asset&sourceId=<id>
 * - idea + campaignIdea     → ?intent=campaign&sourceType=idea&prompt=<text>
 * - unknown                 → ?intent=campaign
 */
export function createLinkFromSourceMeta(meta: DraftSourceMeta): string {
  const params = new URLSearchParams({ intent: 'campaign' });
  if (meta.sourceType === 'property') {
    params.set('sourceType', 'property');
    if (meta.dataItemId) params.set('sourceId', meta.dataItemId);
  } else if (meta.sourceType === 'data_item') {
    params.set('sourceType', 'content_asset');
    if (meta.dataItemId) params.set('sourceId', meta.dataItemId);
  } else if (meta.sourceType === 'idea') {
    params.set('sourceType', 'idea');
    if (meta.campaignIdea) params.set('prompt', meta.campaignIdea);
  }
  if (meta.campaignType) params.set('campaignType', meta.campaignType);
  return params.toString();
}
