import type { Channel, DraftKind, Draft, ListingCampaignResult } from '@/hooks/useSquadpitch';

// ── Session Memory ──────────────────────────────────────────────────────

export interface VersionSelection {
  postIndex: number;
  selected: 'a' | 'b' | 'ai';
  wasAutoSelected: boolean;
}

export interface MediaReplacement {
  postIndex: number;
  originalIds: string[];
  newIds: string[];
}

export interface SessionMemory {
  /** Last campaign type the user explicitly selected */
  preferredCampaignType: AssistantCampaignType | null;
  /** Channels the user has toggled on most recently */
  preferredChannels: Channel[];
  /** Last schedule preset the user chose */
  preferredPreset: string | null;
  /** Media IDs the user has manually selected (last session) */
  lastSelectedMediaIds: string[];
  /** Number of campaigns completed in this session (for confidence) */
  campaignsCompleted: number;
  /** Version selections during review (learning data) */
  versionSelections?: VersionSelection[];
  /** Media replacements during review (learning data) */
  mediaReplacements?: MediaReplacement[];
}

// ── Enums / Unions ───────────────────────────────────────────────────────

export type AssistantMode = 'campaign' | 'quick_post';

export type IndustryKey = 'real_estate' | (string & {});

// Property-specific (real estate) campaign types.
export type PropertyCampaignType =
  | 'just_listed'
  | 'open_house'
  | 'price_drop'
  | 'just_sold'
  | 'listing_spotlight'
  // Legacy value still emitted by older sessions and the RE adapter
  // until it's migrated to listing_spotlight. Treat as a synonym.
  | 'general_promotion';

// Generic cross-industry campaign types (for content-asset and idea
// sources where listing-specific framings don't apply).
export type GenericCampaignType =
  | 'awareness'
  | 'lead_generation'
  | 'educational'
  | 'promotion_offer'
  | 'social_proof'
  | 'event_announcement';

// The session stores either flavor as a plain string — the campaign
// type is just an enum key the prompt builder branches on.
export type AssistantCampaignType = PropertyCampaignType | GenericCampaignType;

// What is this campaign / single post based on? Decides which picker
// the assistant shows next and which campaign-type options appear.
// URL-02: 'url' added so the assistant can show the URL-intake card
// before falling through to the existing property flow (once the
// URL resolves to a saved WorkspaceDataItem, the source effectively
// becomes 'property' and the existing pickers + state-resolver
// gates take over).
export type CampaignSourceType = 'property' | 'data_item' | 'idea' | 'url';

// URL-02 — shape returned by POST /campaign-intake/url/analyze.
// Mirrors the backend service's analyzeUrl() response. Stored on
// the session so the URL card can re-render previews without
// re-hitting the analyze endpoint when the user navigates back.
export interface CampaignUrlListingPreview {
  previewId: string;
  sourceUrl: string;
  normalized: Record<string, unknown>;
  validation?: { valid: boolean; issues: string[] } | null;
  quality?: { grade: string; score: number; extracted?: string[]; missing?: string[]; message?: string } | null;
}

export interface CampaignUrlAnalyzeResult {
  url: string;
  detectedType: 'single_listing' | 'listing_index' | 'business_page' | 'unknown';
  confidence: number;
  listings: CampaignUrlListingPreview[];
  suggestedNextStep:
    | 'review_listing'
    | 'choose_listing'
    | 'use_as_idea'
    | 'import_business_page';
  preferredIntent?: 'campaign' | 'single_post' | null;
  reason?: string;
}

export type ScheduleMode = 'ai_proposed' | 'manual';

export type AssistantStepId =
  | 'mode_select'
  | 'property_select'
  | 'campaign_config'
  | 'quick_post_config'
  | 'media_select'
  | 'schedule_review'
  | 'generate';

// ── Workflow ─────────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: AssistantStepId;
  label: string;
  modes: AssistantMode[];
  required: (keyof AssistantSessionState)[];
}

// ── Field Metadata ──────────────────────────────────────────────────

/**
 * Status lifecycle for each tracked field in the session.
 * - missing: no value set yet
 * - inferred: value was auto-detected from freeform text or intelligence
 * - confirmed: value was explicitly chosen by user via card or confirmed inference
 * - needs_review: value exists but upstream dependency changed — user should re-check
 * - invalidated: value was cleared due to upstream change
 */
export type FieldStatus = 'missing' | 'inferred' | 'confirmed' | 'needs_review' | 'invalidated';

/**
 * Per-field metadata. Stored in `fieldMeta` map on session state.
 * The value itself stays in the flat session fields — this is purely metadata.
 */
export interface FieldMeta {
  status: FieldStatus;
  /** Where this value came from */
  source: 'user_card' | 'user_text' | 'auto' | 'intelligence' | 'default';
  /** Confidence 0-1 (only meaningful for inferred) */
  confidence: number;
  /** Timestamp of last change */
  updatedAt: number;
}

// ── Session State ────────────────────────────────────────────────────────

export interface ScheduleSlot {
  channel: Channel;
  campaignDay: number;
  label?: string;
  slotType?: string;
  angle?: string;
}

export interface AssistantSessionState {
  mode: AssistantMode | null;
  industryKey: IndustryKey;
  workspaceId: string | null;

  // Campaign / single-post source
  // What is this content based on? Drives which picker shows next
  // and which campaign-type options appear.
  campaignSourceType: CampaignSourceType | null;

  // Property source (real-estate listings + any data item with type=PROPERTY)
  selectedPropertyId: string | null;
  propertyData: Record<string, unknown> | null;

  // Content-asset source (non-property WorkspaceDataItem)
  campaignDataItemId: string | null;
  campaignDataItemTitle: string | null;
  campaignDataItemType: string | null;
  campaignDataItemData: Record<string, unknown> | null;

  // Idea source — user describes the campaign in their own words
  campaignIdea: string | null;

  // URL-02: URL source — user pasted a listing or page-of-listings
  // URL. campaignSourceUrl is the original input; the analyze
  // result drives the UrlSourceCard. Once the user confirms a
  // listing, the existing SET_PROPERTY action fires so the rest of
  // the campaign flow uses the property path unchanged.
  campaignSourceUrl: string | null;
  campaignUrlAnalyzeResult: CampaignUrlAnalyzeResult | null;

  // Campaign config
  campaignType: AssistantCampaignType | null;
  channels: Channel[];
  scheduleMode: ScheduleMode;
  slots: ScheduleSlot[];
  campaignStartDate: string | null; // ISO date string (YYYY-MM-DD)

  // Media
  selectedMediaIds: string[];
  mediaAcknowledged: boolean;
  heroImageId: string | null;

  // Quick post
  quickPostSource: 'data' | 'idea' | null;
  quickPostChannel: Channel | null;
  quickPostGuidance: string | null;
  quickPostKind: DraftKind;
  quickPostGoal: 'Growth' | 'Engagement' | 'Sales' | null;
  quickPostContentType: string | null;
  quickPostDataItemId: string | null;
  quickPostDataItemTitle: string | null;
  quickPostBlueprintId: string | null;

  // Generation result (stored for contract building)
  generationResult: Draft | ListingCampaignResult | null;

  // Per-field metadata (status, source, confidence)
  fieldMeta: Partial<Record<string, FieldMeta>>;

  // Session memory (survives resets)
  memory: SessionMemory;
}

// ── Picker Options ───────────────────────────────────────────────────────

export interface PropertyOption {
  id: string;
  title: string;
  address?: string;
  imageUrl?: string;
  dataJson: Record<string, unknown>;
}

export interface MediaOption {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  assetType: 'image' | 'video';
}

// ── Reducer Actions ──────────────────────────────────────────────────────

export type AssistantAction =
  | { type: 'SET_MODE'; payload: AssistantMode }
  | { type: 'SET_CAMPAIGN_SOURCE_TYPE'; payload: CampaignSourceType }
  | { type: 'SET_PROPERTY'; payload: { id: string; data: Record<string, unknown> } }
  | { type: 'CLEAR_PROPERTY' }
  | {
      type: 'SET_CAMPAIGN_DATA_ITEM';
      payload: { id: string; title: string; itemType: string; data: Record<string, unknown> } | null;
    }
  | { type: 'SET_CAMPAIGN_IDEA'; payload: string | null }
  // URL-02 — URL source actions. Used by the URL card before it
  // dispatches the standard SET_PROPERTY action to hand off to
  // the existing property flow.
  | { type: 'SET_CAMPAIGN_SOURCE_URL'; payload: string | null }
  | { type: 'SET_CAMPAIGN_URL_ANALYZE_RESULT'; payload: CampaignUrlAnalyzeResult | null }
  | { type: 'SET_CAMPAIGN_TYPE'; payload: AssistantCampaignType }
  | { type: 'SET_CHANNELS'; payload: Channel[]; source?: 'user' | 'auto' }
  | { type: 'SET_SCHEDULE_MODE'; payload: ScheduleMode }
  | { type: 'SET_SLOTS'; payload: ScheduleSlot[] }
  | { type: 'SET_CAMPAIGN_START_DATE'; payload: string | null }
  | { type: 'SET_MEDIA'; payload: string[] }
  | { type: 'SET_MEDIA_ACKNOWLEDGED' }
  | { type: 'SET_HERO_IMAGE'; payload: string | null }
  | { type: 'SET_QUICK_POST_SOURCE'; payload: 'data' | 'idea' }
  | { type: 'SET_QUICK_POST_CHANNEL'; payload: Channel }
  | { type: 'SET_QUICK_POST_GUIDANCE'; payload: string }
  | { type: 'SET_QUICK_POST_KIND'; payload: DraftKind }
  | { type: 'SET_QUICK_POST_GOAL'; payload: 'Growth' | 'Engagement' | 'Sales' }
  | { type: 'SET_QUICK_POST_CONTENT_TYPE'; payload: string }
  | { type: 'SET_QUICK_POST_DATA_ITEM'; payload: { id: string; title: string } | null }
  | { type: 'SET_QUICK_POST_BLUEPRINT'; payload: string | null }
  | { type: 'SET_GENERATION_RESULT'; payload: Draft | ListingCampaignResult | null }
  | { type: 'SET_PREFERRED_PRESET'; payload: string }
  | { type: 'RESET' };
