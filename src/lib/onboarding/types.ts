import type {
  Channel,
  Draft,
  OnboardingAnalyzeResult,
  OnboardingDataItem,
  OnboardingBrandData,
  AgentProfileDraft,
} from '@/hooks/useSquadpitch';

// ── Pending enrichment (staged before user accepts) ─────────────────────

export type PendingEnrichment =
  | { type: 'license'; key: string; source: AgentProfileDraft }
  | {
      type: 'crm';
      key: string;
      source: AgentProfileDraft;
      importedCount: number;
      csvItems: Array<{ type: string; title: string; summary?: string; dataJson?: Record<string, unknown> }>;
    }
  | {
      type: 'urls' | 'description';
      key: string;
      analyzeResult: OnboardingAnalyzeResult;
      normalizedInput: string;
      inputType: 'url' | 'text';
    };

// ── Phases ───────────────────────────────────────────────────────────────

export type OnboardingPhase =
  | 'industry_select'
  | 'quick_start'
  | 'analysis'
  | 'value_delivery'
  | 'enrichment'
  | 'profile_refinement'
  | 'completion';

// ── Card types ───────────────────────────────────────────────────────────

export type OnboardingCardType =
  | 'quick_start_input'
  | 'industry_select'
  | 'starter_options'
  | 'source_input'
  | 'analysis_progress'
  | 'brand_preview'
  | 'property_review'
  | 'content_preview'
  | 'enrichment_menu'
  | 'source_zillow'
  | 'source_license'
  | 'source_crm'
  | 'channel_connect'
  | 'completion_summary'
  // Fallback-specific cards
  | 'fallback_starter'
  | 'fallback_source'
  | 'fallback_content_prompt'
  | 'profile_refinement'
  // Real estate cards
  | 're_starter'
  | 're_listing_source'
  | 're_listing_form'
  | 're_content_goal'
  | 're_content_prompt'
  | 're_agent_profile'
  | 'listing_photo_offer'
  | 'enrichment_review'
  | 'campaign_presentation';

// ── Starter methods ──────────────────────────────────────────────────────

export type StarterMethod = 'website' | 'zillow' | 'description' | 'scratch' | 'documents';

// ── Fallback intent ──────────────────────────────────────────────────────

export type FallbackIntent = 'my_business' | 'product_service' | 'just_create' | 'manual';

export type FallbackSourceMethod = 'website' | 'description' | 'documents' | 'skip';

// ── Real estate intent ───────────────────────────────────────────────────

export type REIntent = 'listing' | 'business' | 'just_create' | 'manual';

export type REListingSourceMethod = 'single_listing_url' | 'listing_feed_url' | 'description' | 'manual_form';

export type REContentGoal =
  | 'attract_sellers'
  | 'attract_buyers'
  | 'build_authority'
  | 'stay_top_of_mind'
  | 'mixed';

export interface StarterDef {
  method: StarterMethod;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  inputType: 'url' | 'textarea' | 'none';
  placeholder?: string;
}

// ── Source provenance ────────────────────────────────────────────────────

export interface SourceEntry {
  id: string;
  sourceType: 'website' | 'description' | 'documents' | 'photos' | 'listing_link' | 'feed_link' | 'zillow' | 'license' | 'crm';
  label: string;
  status: 'pending' | 'analyzed' | 'failed';
  timestamp: number;
  extractedFields?: string[];
}

// ── Enrichment ───────────────────────────────────────────────────────────

export interface EnrichmentCardDef {
  key: string;
  label: string;
  description: string;
  icon: string;
  cardType: OnboardingCardType;
  /** Hide if this starter method was already used */
  hideIfStarterMethod?: StarterMethod;
  /** Arbitrary data passed through to the rendered card (e.g. { inputMode: 'url' }) */
  payload?: Record<string, unknown>;
}

// ── Config ───────────────────────────────────────────────────────────────

export interface OnboardingConfig {
  industryKey: string;
  starters: StarterDef[];
  enrichmentCards: EnrichmentCardDef[];
  welcomeMessage: string;
  analysisMessage: string;
  valueMessage: string;
  /** If true, this industry uses the fallback intent-based starter flow. */
  useFallbackFlow?: boolean;
  /** If true, this industry uses the real estate flow. */
  useREFlow?: boolean;
}

// ── RE agent profile ────────────────────────────────────────────────

export interface REAgentProfileData {
  agentName?: string;
  brokerage?: string;
  specialties?: string;
  serviceAreas?: string;
  experience?: string;
  tagline?: string;
}

// ── Profile refinement ───────────────────────────────────────────────────

export interface ProfileRefinementData {
  businessName?: string;
  audience?: string;
  voiceTone?: string;
  services?: string;
  location?: string;
}

// ── Chat messages ────────────────────────────────────────────────────────

export type OnboardingMessageType =
  | 'assistant_text'
  | 'user_text'
  | 'interactive_prompt'
  | 'confirmation'
  | 'system_update';

export interface OnboardingChatMessage {
  id: string;
  type: OnboardingMessageType;
  content: string;
  timestamp: number;
  status: 'active' | 'resolved';
  cardType?: OnboardingCardType;
  payload?: Record<string, unknown>;
}

// ── Session state ────────────────────────────────────────────────────────

export interface OnboardingSessionState {
  phase: OnboardingPhase;
  industryKey: string | null;
  starterMethod: StarterMethod | null;
  primaryInput: string | null;
  sources: AgentProfileDraft[];
  analyzeResult: OnboardingAnalyzeResult | null;
  createdClientId: string | null;
  previewDrafts: Draft[];
  sourceEntries: SourceEntry[];
  enrichmentsCompleted: string[];
  enrichmentsSkipped: boolean;
  brandConfirmed: boolean;
  profilesSaved: boolean;
  brandNameOverride: string | null;
  error: string | null;

  // Fallback flow state
  fallbackIntent: FallbackIntent | null;
  fallbackSourceMethod: FallbackSourceMethod | null;
  contentPrompt: string | null;
  profileRefinementDone: boolean;

  // Real estate flow state
  reIntent: REIntent | null;
  reListingSource: REListingSourceMethod | null;
  reContentGoal: REContentGoal | null;
  reAgentProfileDone: boolean;

  // Property review
  selectedPropertyIds: string[] | null;  // null = not reviewed yet
  propertyReviewDone: boolean;

  // Photo upload tracking
  photoOfferResult: 'uploaded' | 'skipped' | null;  // null = not shown yet

  // Enrichment review (staged before user accepts)
  pendingEnrichment: PendingEnrichment | null;

  // Channel connection tracking
  channelConnectDone: boolean;
  channelConnectSkipped: boolean;
  connectedChannelsSnapshot: Channel[];
}

// ── Analysis progress (SSE tracking) ─────────────────────────────────────

export interface CrawlPage {
  url: string;
  title: string;
  pageNum: number;
  totalExpected: number;
}

export interface CrawlPageError {
  url: string;
  error: string;
}

export interface AnalysisProgress {
  stage: 'connecting' | 'crawling' | 'extracting_brand' | 'extracting_data' | 'done' | 'error';
  rootUrl: string | null;
  crawledPages: CrawlPage[];
  failedPages: CrawlPageError[];
  totalExpected: number;
  crawlDone: boolean;
  imagesFound: number;
  brandData: OnboardingBrandData | null;
  dataItems: OnboardingDataItem[];
  dataCount: number;
  errorMessage: string | null;
  errorCode: string | null;
  // Download progress (set during workspace creation)
  imagesDownloaded: number;
  imagesDownloadTotal: number;
  imagesFailed: number;
}

export interface StreamCallbacks {
  onCrawlStart: (url: string | null) => void;
  onCrawlDiscovered: (totalExpected: number) => void;
  onCrawlPage: (page: CrawlPage) => void;
  onCrawlPageError: (err: CrawlPageError) => void;
  onCrawlDone: () => void;
  onImagesFound: (count: number) => void;
  onExtractStart: () => void;
  onBrandDone: (brandData: OnboardingBrandData) => void;
  onDataProgress: (items: OnboardingDataItem[], count: number) => void;
  onDataDone: (items: OnboardingDataItem[], count: number) => void;
  onError: (message: string, code?: string) => void;
}

// ── Reducer actions ──────────────────────────────────────────────────────

export type OnboardingAction =
  | { type: 'SET_INDUSTRY'; industryKey: string }
  | { type: 'SET_STARTER_METHOD'; method: StarterMethod }
  | { type: 'SET_PRIMARY_INPUT'; input: string }
  | { type: 'SET_PHASE'; phase: OnboardingPhase }
  | { type: 'SET_ANALYZE_RESULT'; result: OnboardingAnalyzeResult }
  | { type: 'SET_CREATED_CLIENT'; clientId: string }
  | { type: 'ADD_PREVIEW_DRAFT'; draft: Draft }
  | { type: 'REPLACE_PREVIEW_DRAFT'; oldId: string; draft: Draft }
  | { type: 'SET_PREVIEW_DRAFTS'; drafts: Draft[] }
  | { type: 'ADD_SOURCE'; source: AgentProfileDraft }
  | { type: 'ADD_SOURCE_ENTRY'; entry: SourceEntry }
  | { type: 'UPDATE_SOURCE_ENTRY'; id: string; updates: Partial<Pick<SourceEntry, 'status' | 'extractedFields'>> }
  | { type: 'MARK_ENRICHMENT_COMPLETED'; key: string }
  | { type: 'MARK_ENRICHMENT_SKIPPED' }
  | { type: 'CONFIRM_BRAND' }
  | { type: 'SET_SELECTED_PROPERTY_IDS'; ids: string[] }
  | { type: 'SET_PROPERTY_REVIEW_DONE' }
  | { type: 'SET_BRAND_NAME_OVERRIDE'; name: string }
  | { type: 'SET_PROFILES_SAVED' }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' }
  // Fallback flow actions
  | { type: 'SET_FALLBACK_INTENT'; intent: FallbackIntent }
  | { type: 'SET_FALLBACK_SOURCE_METHOD'; method: FallbackSourceMethod }
  | { type: 'SET_CONTENT_PROMPT'; prompt: string }
  | { type: 'SET_PROFILE_REFINEMENT_DONE' }
  // Real estate flow actions
  | { type: 'SET_RE_INTENT'; intent: REIntent }
  | { type: 'SET_RE_LISTING_SOURCE'; method: REListingSourceMethod }
  | { type: 'SET_RE_CONTENT_GOAL'; goal: REContentGoal }
  | { type: 'SET_RE_AGENT_PROFILE_DONE' }
  | { type: 'SET_PHOTO_OFFER_RESULT'; result: 'uploaded' | 'skipped' }
  | { type: 'SET_PENDING_ENRICHMENT'; pending: PendingEnrichment }
  | { type: 'CLEAR_PENDING_ENRICHMENT' }
  | { type: 'SET_CHANNEL_CONNECT_DONE'; channels: Channel[] }
  | { type: 'SET_CHANNEL_CONNECT_SKIPPED' }
  | { type: 'UPDATE_CHANNELS_SNAPSHOT'; channels: Channel[] };

// ── Conversation reducer actions ─────────────────────────────────────────

export type ConversationAction =
  | { type: 'ADD_MESSAGE'; message: OnboardingChatMessage }
  | { type: 'UPDATE_MESSAGE'; id: string; content: string }
  | { type: 'RESOLVE_ACTIVE' }
  | { type: 'CLEAR' };

export interface ConversationState {
  messages: OnboardingChatMessage[];
  activeCardId: string | null;
}

// ── Engine output ────────────────────────────────────────────────────────

export interface ResolvedStep {
  message: string;
  cardType: OnboardingCardType;
  phase: OnboardingPhase;
  skippable: boolean;
  payload?: Record<string, unknown>;
}
