// Standardized query-param parser for /create.
//
// The Create route is the central entry point for the assistant
// flow. Other parts of the app (Planner, Dashboard, Property cards,
// CRM widgets, Autopilot) deep-link in with various legacy params.
// We need a single parser that normalizes everything into a shape
// the assistant can consume — including the prior `?mode=campaign`
// + `&listingId=…` aliases — so the entry contract stays clean.
//
// New canonical contract:
//   /create
//   /create?intent=campaign
//   /create?intent=single_post
//   /create?intent=campaign&sourceType=property&sourceId=...
//   /create?intent=campaign&sourceType=content_asset&sourceId=...
//   /create?intent=campaign&sourceType=idea&prompt=...
//   /create?intent=single_post&sourceType=property&sourceId=...
//   /create?intent=single_post&sourceType=content_asset&sourceId=...
//   /create?intent=single_post&sourceType=idea&prompt=...
//
// Optional add-ons (any intent): campaignType, channel, guidance,
// templateType.
//
// Legacy aliases that still resolve (back-compat for every existing
// link in the codebase):
//   mode=campaign          → intent=campaign
//   mode=single            → intent=single_post
//   mode=assistant         → (ignored — falls back to picker)
//   listingId=<id>         → sourceType=property + sourceId=<id>
//   type=<value>           → campaignType=<value>
//   input=<text>           → prompt=<text>

export type CreateIntent = 'campaign' | 'single_post';
export type CreateSourceType = 'property' | 'content_asset' | 'idea';

export interface CreateRouteParams {
  intent?: CreateIntent;
  sourceType?: CreateSourceType;
  sourceId?: string;
  campaignType?: string;
  prompt?: string;
  channel?: string;
  guidance?: string;
  templateType?: string;
  /**
   * True when ANY legacy alias was consumed (mode, listingId, type,
   * input). Useful for telemetry / future deprecation warnings;
   * the parser still handles them transparently.
   */
  legacyParamsUsed: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

function readParam(params: URLSearchParams | null, key: string): string | undefined {
  if (!params) return undefined;
  const v = params.get(key);
  if (v == null) return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeIntent(raw: string | undefined): CreateIntent | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v === 'campaign') return 'campaign';
  if (v === 'single_post' || v === 'single-post' || v === 'single') return 'single_post';
  return undefined;
}

function normalizeSourceType(raw: string | undefined): CreateSourceType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v === 'property' || v === 'listing') return 'property';
  if (v === 'content_asset' || v === 'content-asset' || v === 'asset' || v === 'data_item' || v === 'data-item') {
    return 'content_asset';
  }
  if (v === 'idea' || v === 'prompt') return 'idea';
  return undefined;
}

// Map legacy `mode` values to the new `intent` shape. `mode=assistant`
// was an old alias for "open the picker" — we map it to `undefined`
// so the caller falls through to no-intent (i.e. the mode-pick card
// inside the assistant runs).
function intentFromLegacyMode(mode: string | undefined): CreateIntent | undefined {
  if (!mode) return undefined;
  const v = mode.toLowerCase();
  if (v === 'campaign') return 'campaign';
  if (v === 'single') return 'single_post';
  return undefined;
}

// ── Parser ───────────────────────────────────────────────────────────

/**
 * Normalize the /create URL search params into a single, complete
 * `CreateRouteParams` object. Supports both the new contract and
 * every legacy alias documented at the top of this file.
 */
export function parseCreateRouteParams(
  searchParams: URLSearchParams | null,
): CreateRouteParams {
  // New canonical params take precedence; legacy aliases fill in
  // only when the canonical version isn't set, so a URL like
  // `?intent=campaign&mode=single` keeps `intent=campaign` rather
  // than getting confused.
  const newIntent = normalizeIntent(readParam(searchParams, 'intent'));
  const legacyMode = readParam(searchParams, 'mode');
  const legacyIntent = intentFromLegacyMode(legacyMode);
  const intent = newIntent ?? legacyIntent;

  const newSourceType = normalizeSourceType(readParam(searchParams, 'sourceType'));
  const newSourceId = readParam(searchParams, 'sourceId');
  const legacyListingId = readParam(searchParams, 'listingId');
  // listingId implies property source. Only used when no
  // canonical sourceType/sourceId was provided.
  const sourceType =
    newSourceType ?? (legacyListingId ? ('property' as const) : undefined);
  const sourceId = newSourceId ?? legacyListingId;

  const campaignType =
    readParam(searchParams, 'campaignType') ?? readParam(searchParams, 'type');

  const prompt = readParam(searchParams, 'prompt') ?? readParam(searchParams, 'input');

  const channel = readParam(searchParams, 'channel');
  const guidance = readParam(searchParams, 'guidance');
  const templateType = readParam(searchParams, 'templateType');

  // A legacy alias was actually used if its canonical equivalent
  // wasn't set and the legacy key was present.
  const legacyParamsUsed =
    (!newIntent && !!legacyMode && !!legacyIntent) ||
    (!newSourceType && !!legacyListingId) ||
    (!readParam(searchParams, 'campaignType') && !!readParam(searchParams, 'type')) ||
    (!readParam(searchParams, 'prompt') && !!readParam(searchParams, 'input'));

  return {
    intent,
    sourceType,
    sourceId,
    campaignType,
    prompt,
    channel,
    guidance,
    templateType,
    legacyParamsUsed,
  };
}

// ── Assistant-state mapping ─────────────────────────────────────────
//
// Maps the parser output to the assistant's internal `mode` +
// `campaignSourceType` enums. Kept separate from the parser so the
// pure URL contract above stays decoupled from session-shape
// changes.

export type AssistantMode = 'campaign' | 'quick_post';
export type AssistantCampaignSourceType = 'property' | 'data_item' | 'idea';

export function intentToAssistantMode(
  intent: CreateIntent | undefined,
): AssistantMode | undefined {
  if (intent === 'campaign') return 'campaign';
  if (intent === 'single_post') return 'quick_post';
  return undefined;
}

export function sourceTypeToAssistantSource(
  sourceType: CreateSourceType | undefined,
): AssistantCampaignSourceType | undefined {
  if (sourceType === 'property') return 'property';
  if (sourceType === 'content_asset') return 'data_item';
  if (sourceType === 'idea') return 'idea';
  return undefined;
}
