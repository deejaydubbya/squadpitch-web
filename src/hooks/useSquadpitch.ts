'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { isAutopilotCampaignInboxEnabled } from '@/lib/autopilotCampaignInbox';

// ── Types ────────────────────────────────────────────────────────────────

export type ClientStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type Channel =
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'X'
  | 'LINKEDIN'
  | 'LINKEDIN_ORGANIZATION_PAGE'
  | 'FACEBOOK'
  | 'YOUTUBE'
  | 'PINTEREST'
  | 'THREADS'
  | 'REDDIT'
  // Inbox-only channel (no publishing). Reviews ingestion + reply
  // land in a follow-up prompt; the tile in Settings → Channels
  // exists today as a disabled "Coming soon" placeholder.
  | 'GOOGLE_BUSINESS_PROFILE';

export type MediaMode =
  | 'BRAND_ASSETS_ONLY'
  | 'BRAND_ASSETS_PLUS_AI'
  | 'AI_CHARACTER';

export type DraftKind =
  | 'POST'
  | 'CAPTION'
  | 'VIDEO_SCRIPT'
  | 'CAROUSEL'
  | 'HOOKS'
  | 'CTA_VARIANTS'
  | 'REPLY';

export type DraftStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'FAILED';

export type CampaignStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'FAILED';

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  campaignType: string;
  sourceType: 'property' | 'data_item' | 'idea' | null;
  sourceDataItemId: string | null;
  sourceTitle: string | null;
  campaignIdea: string | null;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  metadataJson: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandProfile {
  clientId: string;
  description: string | null;
  industry: string | null;
  audience: string | null;
  website: string | null;
  socialsJson: Record<string, string> | null;
  offers: string | null;
  competitors: string | null;
  examplePosts: Array<{ label?: string; text: string }> | null;
  city: string | null;
  state: string | null;
  marketArea: string | null;
  primaryZip: string | null;
  serviceAreas: string[] | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface VoiceRules {
  do: string[];
  dont: string[];
}

export interface ContentBucket {
  key: string;
  label: string;
  template: string;
}

export interface VoiceProfile {
  clientId: string;
  tone: string | null;
  voiceRulesJson: VoiceRules;
  bannedPhrases: string[];
  ctaPreferences: Record<string, unknown> | null;
  contentBuckets: ContentBucket[];
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface MediaProfile {
  clientId: string;
  mode: MediaMode;
  visualStyle: string | null;
  assetLibraryJson: Array<{ url: string; caption?: string }> | null;
  characterPrompt: string | null;
  basePromptTemplate: string | null;
  loraModelUrl: string | null;
  loraTriggerWord: string | null;
  loraScale: number | null;
  updatedBy: string | null;
  updatedAt: string;
}

export type PersonaType = 'AGENT' | 'BRAND_STYLE' | 'TEAM';

export type PersonaTrainingStatus =
  | 'DRAFT'
  | 'UPLOADING'
  | 'READY_TO_TRAIN'
  | 'QUEUED'
  | 'TRAINING'
  | 'COMPLETED'
  | 'FAILED';

export interface PersonaTrainingImage {
  id: string;
  url: string;
  filename: string | null;
  size: number | null;
  mimeType: string | null;
  quality: string;
  addedAt: string;
}

export interface PersonaUsageSettings {
  personalBrandPosts?: boolean;
  educationalGraphics?: boolean;
  listingPromotions?: boolean;
  smartVideoThumbnails?: boolean;
  smartVideoIntroOutro?: boolean;
  campaignCoverImages?: boolean;
  askBeforeUsing?: boolean;
}

export interface PersonaPreviewImage {
  url: string;
  publicId?: string;
  prompt: string;
  width?: number;
  height?: number;
}

export interface BrandStyleProfile {
  colors?: string[];
  fonts?: string[];
  styleDescriptors?: string[];
  promptModifiers?: string;
  mood?: string;
}

export interface BrandPersona {
  clientId: string;
  personaType: PersonaType;
  name: string | null;
  status: PersonaTrainingStatus;
  trainingImages: PersonaTrainingImage[];
  imageCount: number;
  visualStyle: string | null;
  usageSettings: PersonaUsageSettings;
  styleProfile?: BrandStyleProfile | null;
  trainingProgress: number | null;
  previewImages: PersonaPreviewImage[] | null;
  provider: string | null;
  providerModelId: boolean; // true if trained model exists (URL not exposed)
  triggerPhrase: string | null;
  errorMessage: string | null;
  consentAt: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelSettings {
  id: string;
  clientId: string;
  channel: Channel;
  isEnabled: boolean;
  maxChars: number | null;
  allowEmoji: boolean;
  trailingHashtags: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  status: ClientStatus;
  logoUrl: string | null;
  industryKey: string | null;
  /** IANA timezone — e.g. "America/New_York". Defaults to "UTC". */
  timezone?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  draftCount?: number;
  brandProfile?: BrandProfile | null;
  voiceProfile?: VoiceProfile | null;
  mediaProfile?: MediaProfile | null;
  channelSettings?: ChannelSettings[];
}

export interface ContentVariation {
  body: string;
  hooks: string[];
  hashtags: string[];
  cta: string | null;
}

export interface ScoredHook {
  text: string;
  hookScore: number;
  reason: string;
}

export type MediaPlanSource = 'property_images' | 'brand_library' | 'ai_generated' | 'stock_like' | 'none';

export interface MediaPlan {
  recommendedMediaType: 'image' | 'video' | 'carousel' | 'none';
  visualConcept: string;
  prompt: string;
  negativePrompt: string;
  style: string;
  reason: string;
  fallbackStrategy: string;
  preferredSources: MediaPlanSource[];
}

export interface PersonaRecommendation {
  shouldUsePersona: boolean;
  suggestedPersonaId: string;
  usageType: 'thumbnail' | 'intro_frame' | 'outro_frame' | 'image_generation' | 'none';
  reason: string;
  safetyLevel: 'safe' | 'needs_review' | 'not_allowed';
  autoApply: boolean;
}

export interface Draft {
  id: string;
  clientId: string;
  kind: DraftKind;
  status: DraftStatus;
  channel: Channel;
  bucketKey: string | null;
  generationGuidance: string;
  modelUsed: string | null;
  promptVersion: number;
  body: string;
  hooks: string[];
  hashtags: string[];
  cta: string | null;
  variations: ContentVariation[] | null;
  scoredHooks: ScoredHook[] | null;
  altText: string | null;
  imageGuidance: string | null;
  videoGuidance: string | null;
  mediaPlan: MediaPlan | null;
  warnings: string[];
  sourceMeta?: {
    source?: string;
    listingTitle?: string;
    autopilot?: boolean;
    autoGenerated?: boolean;
    autopilotTrigger?: string;
    autopilotReason?: string;
    autopilotChannel?: string;
    autopilotAsset?: string;
    autopilotMode?: string;
    contentAngle?: string;
    contentAngleKey?: string;
    recommendationId?: string;
    autoBlueprint?: string;
    rotated?: boolean;
  };
  personaRecommendation?: PersonaRecommendation;
  // Campaign fields (nullable for non-campaign drafts)
  campaignId: string | null;
  campaignName: string | null;
  campaignType: string | null;
  campaignDay: number | null;
  campaignOrder: number | null;
  campaignTotal: number | null;

  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  mediaAssets: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    assetType: string;
    filename: string | null;
    role: string | null;
    orderIndex: number;
  }[];
  externalPostId: string | null;
  externalPostUrl: string | null;
  publishError: string | null;
  publishAttempts: number;
  lastPublishAttemptAt: string | null;
  performanceRating: 'HIGH' | 'AVERAGE' | 'LOW' | null;
  ratedAt: string | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ChannelConnectionStatus =
  | 'CONNECTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'ERROR';

export interface ChannelConnection {
  id: string;
  clientId: string;
  channel: Channel;
  externalAccountId: string | null;
  displayName: string | null;
  scopes: string[];
  status: ChannelConnectionStatus;
  tokenExpiresAt: string | null;
  lastValidatedAt: string | null;
  lastError: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthStartResponse {
  authUrl: string;
  state: string;
  expiresAt: string;
}

export interface ClientAnalytics {
  total: number;
  byStatus: Partial<Record<DraftStatus, number>>;
  byKind: Partial<Record<DraftKind, number>>;
  byChannel: Partial<Record<Channel, number>>;
  approvalRate: number;
  rejectionRate: number;
  last14Days: Array<{ date: string; count: number }>;
}

export type AnalyticsRange = '7d' | '30d' | '90d' | 'all';

export interface AnalyticsPost {
  id: string;
  body: string;
  channel: Channel;
  publishedAt: string;
  mediaType: string | null;
  qualityScore: number | null;
  observedScore: number | null;
  compositeScore: number | null;
  engagementRate: number | null;
  impressions: number | null;
  contentType?: string | null;
  hookType?: string | null;
  sentiment?: string | null;
  worstReason?: string | null;
}

export interface PlatformStat {
  channel: Channel;
  postCount: number;
  avgEngagementRate: number | null;
  avgScore: number | null;
  totalReach: number | null;
  totalImpressions: number | null;
  totalEngagements: number | null;
}

export interface TrendPoint {
  date: string;
  count: number;
  avgScore: number | null;
}

export interface SyncStatus {
  lastSyncedAt: string | null;
  syncedPostCount: number;
  pendingSyncCount: number;
}

export interface Insight {
  type: string;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  supportingMetrics: Record<string, unknown>;
}

export interface Recommendation {
  title: string;
  reason: string;
  suggestedAction: string;
  confidence: 'high' | 'medium' | 'low';
  category: string;
}

export interface ContentTypeStat {
  contentType: string;
  postCount: number;
  avgScore: number | null;
}

export interface ScoreComponent {
  raw: number;
  weight: number;
  weighted: number;
}

export interface ScoreBreakdown {
  qualityScore: number;
  observedScore: number | null;
  compositeScore: number;
  tier: string;
  mode: 'weighted' | 'internal_only';
  components: {
    engagement: ScoreComponent | null;
    quality: ScoreComponent;
    consistency: ScoreComponent;
  };
  explanation: string;
}

export interface PostDetailMetrics {
  impressions: number;
  reach: number;
  engagements: number;
  clicks: number;
  saves: number;
  shares: number;
  comments: number;
  likes: number;
  engagementRate: number | null;
  lastSyncedAt: string | null;
}

export interface PostDetailInsight {
  qualityScore: number | null;
  observedScore: number | null;
  compositeScore: number | null;
  contentType: string | null;
  hookType: string | null;
  sentiment: string | null;
  lengthBucket: string | null;
  mediaType: string | null;
  postingTimeBucket: string | null;
  recommendationTags: string[] | null;
}

export interface MetricSnapshot {
  snapshotAt: string;
  impressions: number;
  reach: number;
  engagements: number;
  clicks: number;
  saves: number;
  shares: number;
  comments: number;
  likes: number;
  engagementRate: number | null;
}

export interface MetricGrowth {
  impressionsDelta: number;
  reachDelta: number;
  engagementsDelta: number;
  clicksDelta: number;
  engagementRateDelta: number | null;
  periodHours: number;
}

export interface PostMetricHistory {
  history: MetricSnapshot[];
  growth: MetricGrowth | null;
}

export interface PostBenchmarkComparison {
  vsWorkspace: {
    score: BenchmarkComparison | null;
    engagement: BenchmarkComparison | null;
  };
  vsChannel: {
    score: BenchmarkComparison | null;
    engagement: BenchmarkComparison | null;
  };
  vsContentType: {
    score: BenchmarkComparison | null;
    engagement: BenchmarkComparison | null;
  } | null;
}

export interface PostDetail {
  id: string;
  body: string;
  channel: Channel;
  publishedAt: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  externalPostUrl: string | null;
  externalPostId: string | null;
  metrics: PostDetailMetrics | null;
  insight: PostDetailInsight | null;
  scoreBreakdown: ScoreBreakdown;
  benchmarkComparison: PostBenchmarkComparison | null;
  growth: MetricGrowth | null;
}

export interface DistributionSection {
  totalImpressions: number | null;
  totalReach: number | null;
  postsPublished: number;
  publishingTrend: TrendPoint[];
  platformReach: PlatformStat[];
  hasReachData: boolean;
}

export interface EngagementSection {
  engagementRate: number | null;
  observedScore: number | null;
  topPosts: AnalyticsPost[];
  worstPosts: AnalyticsPost[];
  hasEngagementData: boolean;
}

export interface ContentIntelligenceSection {
  qualityScore: number | null;
  compositeScore: number | null;
  insights: Insight[];
  recommendations: Recommendation[];
  contentTypeBreakdown: ContentTypeStat[];
  topPlatform: string | null;
  bestContentType: string | null;
  bestMediaType: string | null;
}

export interface ChannelCoverage {
  channel: string;
  published: number;
  synced: number;
  internalOnly: number;
  coveragePercent: number;
  lastSyncedAt: string | null;
}
export interface ConnectionHealthItem {
  channel: string;
  status: string;
  displayName: string | null;
  tokenExpiresAt: string | null;
  lastValidatedAt: string | null;
  lastError: string | null;
  isHealthy: boolean;
}
export interface FreshnessWarning {
  type: string;
  message: string;
  severity: 'info' | 'warning';
  count: number;
}
export interface CoverageSection {
  totalPublished: number;
  withEngagementData: number;
  withInternalOnly: number;
  coveragePercent: number;
  coverageLabel: 'full' | 'partial' | 'internal_only';
  syncStatus: SyncStatus;
  channelCoverage: ChannelCoverage[];
  connectionHealth: ConnectionHealthItem[];
  freshnessWarnings: FreshnessWarning[];
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export interface ConversionByType {
  type: string;
  count: number;
}
export interface ConversionByChannel {
  channel: Channel;
  count: number;
}
export interface ConversionTopDraft {
  draftId: string;
  body: string;
  channel: Channel;
  count: number;
}
export interface ConversionsSection {
  totalConversions: number;
  conversionRate: number | null;
  totalPublishedPosts: number;
  activeLinks: number;
  byType: ConversionByType[];
  byChannel: ConversionByChannel[];
  topDrafts: ConversionTopDraft[];
  hasData: boolean;
}

export interface CampaignTypeStat {
  campaignType: string;
  campaignCount: number;
  totalPosts: number;
  avgScore: number | null;
  avgEngagementRate: number | null;
  avgCompletionRate: number | null;
}
export interface CampaignDayStat {
  day: number;
  postCount: number;
  avgScore: number | null;
  avgEngagementRate: number | null;
}
export interface CampaignRanked {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  postCount: number;
  campaignTotal: number;
  completionRate: number;
  avgScore: number | null;
  avgEngagementRate: number | null;
  totalReach: number | null;
}
export interface CampaignsSection {
  totalCampaigns: number;
  completedCampaigns: number;
  avgCompletionRate: number | null;
  totalCampaignReach: number | null;
  totalCampaignImpressions: number | null;
  avgCampaignScore: number | null;
  byType: CampaignTypeStat[];
  byDay: CampaignDayStat[];
  topCampaigns: CampaignRanked[];
  worstCampaigns: CampaignRanked[];
  hasData: boolean;
}

export interface TrackableLink {
  id: string;
  clientId: string;
  draftId: string | null;
  shortCode: string;
  destinationUrl: string;
  redirectUrl: string;
  label: string | null;
  channel: Channel | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  isActive: boolean;
  clickCount: number;
  createdAt: string;
}

export interface AutopilotChannelStat {
  channel: string;
  count: number;
  publishedCount: number;
  avgScore: number | null;
}
export interface AutopilotTriggerStat {
  trigger: string;
  count: number;
  publishedCount: number;
  avgScore: number | null;
}
export interface AutopilotActivity {
  id: string;
  channel: string;
  status: string;
  body: string;
  trigger: string | null;
  reason: string | null;
  angle: string | null;
  createdAt: string | null;
  publishedAt: string | null;
  score: number | null;
}
export interface AutopilotSection {
  totalGenerated: number;
  totalPublished: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  approvalRate: number | null;
  publishRate: number | null;
  avgAutopilotScore: number | null;
  avgManualScore: number | null;
  scoreDelta: number | null;
  avgAutopilotEngagement: number | null;
  avgManualEngagement: number | null;
  engagementDelta: number | null;
  byChannel: AutopilotChannelStat[];
  byTrigger: AutopilotTriggerStat[];
  recentActivity: AutopilotActivity[];
  hasData: boolean;
}

export interface BusinessDataTypeStat {
  type: string;
  itemCount: number;
  totalDrafts: number;
  totalPublished: number;
  avgScore: number | null;
  avgEngagement: number | null;
}
export interface BusinessDataBlueprintStat {
  blueprintId: string;
  blueprintName: string;
  category: string;
  totalDrafts: number;
  totalPublished: number;
  avgScore: number | null;
  avgEngagement: number | null;
}
export interface BusinessDataFreshnessStat {
  bucket: string;
  label: string;
  itemCount: number;
  avgScore: number | null;
}
export interface BusinessDataTopItem {
  id: string;
  title: string;
  type: string;
  usageCount: number;
  totalPublished: number;
  avgScore: number | null;
  avgEngagement: number | null;
}
export interface BusinessDataUnusedItem {
  id: string;
  title: string;
  type: string;
  usageCount: number;
  daysSinceCreation: number;
}
export interface BusinessDataSection {
  totalDataItems: number;
  totalUsed: number;
  totalUnused: number;
  totalStale: number;
  totalDraftsFromData: number;
  totalPublishedFromData: number;
  byType: BusinessDataTypeStat[];
  byBlueprint: BusinessDataBlueprintStat[];
  byFreshness: BusinessDataFreshnessStat[];
  topItems: BusinessDataTopItem[];
  underusedItems: BusinessDataUnusedItem[];
  hasData: boolean;
}

export interface BenchmarkValue {
  avgScore: number | null;
  avgEngagementRate: number | null;
  avgReach: number | null;
  sampleSize: number;
  scoreSampleSize: number;
  engagementSampleSize: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
}
export interface BenchmarkComparison {
  delta: number;
  benchmarkValue: number;
  label: 'above' | 'below' | 'at';
  confidence: 'high' | 'medium' | 'low';
  sampleSize: number;
  unit: 'pts' | 'pp';
}
export interface BenchmarksSection {
  workspace: BenchmarkValue;
  byChannel: Record<string, BenchmarkValue>;
  byContentType: Record<string, BenchmarkValue>;
  byMediaType: Record<string, BenchmarkValue>;
  hasData: boolean;
}

export interface AnalyticsOverviewSections {
  distribution: DistributionSection;
  engagement: EngagementSection;
  contentIntelligence: ContentIntelligenceSection;
  coverage: CoverageSection;
  conversions: ConversionsSection;
  campaigns: CampaignsSection;
  autopilot: AutopilotSection;
  businessData: BusinessDataSection;
  benchmarks: BenchmarksSection;
}

export interface AnalyticsOverview {
  timezone?: string;
  summary: {
    qualityScore: number | null;
    observedScore: number | null;
    compositeScore: number | null;
    engagementRate: number | null;
    totalReach: number | null;
    totalImpressions: number | null;
    postsPublished: number;
    dataCoverage: 'full' | 'partial' | 'internal_only';
  };
  kpis: {
    topPlatform: string | null;
    bestContentType: string | null;
    bestMediaType: string | null;
  };
  topPosts: AnalyticsPost[];
  worstPosts: AnalyticsPost[];
  platformBreakdown: PlatformStat[];
  publishingTrend: TrendPoint[];
  dataCoverage: {
    totalPublished: number;
    withEngagementData: number;
    withInternalOnly: number;
    coveragePercent: number;
  };
  syncStatus?: SyncStatus;
  insights?: Insight[];
  recommendations?: Recommendation[];
  contentTypeBreakdown?: ContentTypeStat[];
  sections: AnalyticsOverviewSections;
}

export type MediaAssetSource = 'UPLOAD' | 'AI_GENERATED' | 'IMPORTED';
export type MediaAssetStatus = 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
export type MediaAssetType = 'image' | 'video';

export interface MediaAsset {
  id: string;
  clientId: string;
  source: MediaAssetSource;
  status: MediaAssetStatus;
  progressStage: string | null;
  assetType: MediaAssetType;
  url: string | null;
  publicId: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mimeType: string | null;
  thumbnailUrl: string | null;
  videoDurationSec: number | null;
  filename: string | null;
  altText: string | null;
  caption: string | null;
  folderId: string | null;
  tags: string[];
  draftId: string | null;
  displayOrder: number;
  falModelId: string | null;
  renderedPrompt: string | null;
  personaSnapshot: string | null;
  seed: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetFolder {
  id: string;
  clientId: string;
  name: string;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export type DataSourceType = 'MANUAL' | 'URL' | 'CSV' | 'TEXT' | 'GOOGLE_SHEETS' | 'NOTION';

export type DataItemStatus = 'ACTIVE' | 'ARCHIVED';

export type DataItemType =
  | 'TESTIMONIAL'
  | 'CASE_STUDY'
  | 'PRODUCT_LAUNCH'
  | 'PROMOTION'
  | 'STATISTIC'
  | 'MILESTONE'
  | 'FAQ'
  | 'TEAM_SPOTLIGHT'
  | 'INDUSTRY_NEWS'
  | 'EVENT'
  | 'PROPERTY'
  | 'CUSTOM';

export type BlueprintCategory =
  | 'SOCIAL_PROOF'
  | 'EDUCATION'
  | 'BEHIND_THE_SCENES'
  | 'PROMOTION'
  | 'ENGAGEMENT'
  | 'STORYTELLING'
  | 'AUTHORITY'
  | 'SEASONAL';

export interface WorkspaceDataSource {
  id: string;
  clientId: string;
  type: DataSourceType;
  name: string;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataItemPerformanceStats {
  totalDrafts: number;
  totalPublished: number;
  avgEngagement: number | null;
  avgQualityScore: number | null;
  avgObservedScore: number | null;
  avgCompositeScore: number | null;
  lastCalculated: string;
}

export interface WorkspaceDataItem {
  id: string;
  clientId: string;
  dataSourceId: string;
  type: DataItemType;
  status: DataItemStatus;
  title: string;
  summary: string | null;
  dataJson: Record<string, unknown>;
  tags: string[];
  priority: number;
  expiresAt: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  performance: DataItemPerformanceStats | null;
}

export interface BlueprintWithPerformance {
  id: string;
  slug: string;
  name: string;
  category: BlueprintCategory;
  performance: DataItemPerformanceStats | null;
}

export interface TopPerformingItem {
  id: string;
  type: DataItemType;
  title: string;
  summary: string | null;
  usageCount: number;
  performance: DataItemPerformanceStats | null;
}

// ── Autopilot Types ──────────────────────────────────────────────────

export interface AutopilotSuggestion {
  rank: number;
  dataItem: {
    id: string;
    type: DataItemType;
    title: string;
    summary: string | null;
    usageCount: number;
    lastUsedAt: string | null;
  };
  blueprint: {
    id: string;
    slug: string;
    name: string;
    category: BlueprintCategory;
  };
  opportunityScore: number;
  adjustedScore: number;
  autoSelected: boolean;
  reasoning: string;
}

export interface AutopilotPreviewInput {
  count?: number;
  channel?: Channel;
  excludeDataItemIds?: string[];
}

export interface AutopilotExecuteInput {
  channel?: Channel;
  autoSchedule?: boolean;
  suggestions: Array<{
    dataItem: { id: string };
    blueprint: { id: string };
  }>;
}

export interface AutopilotExecuteResult {
  results: Array<{
    dataItemId: string;
    status: 'success' | 'error' | 'limit_reached';
    draftId?: string;
  }>;
  generated: number;
  total: number;
  scheduled: number;
}

// ── Autopilot Campaign Types ────────────────────────────────────────

export type AutopilotTriggerType =
  | 'new_listing'
  | 'price_drop'
  | 'open_house_added'
  | 'open_house_updated'
  | 'status_changed';

export type AutopilotCampaignStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'approved'
  | 'dismissed'
  | 'expired'
  | 'converted'
  | 'launched';

export interface AutopilotCampaignRecommendation {
  id: string;
  clientId: string;
  status: AutopilotCampaignStatus;

  // Trigger
  triggerType: AutopilotTriggerType;
  triggerReason: string;
  triggeredAt: string;

  // Property
  listingDataItemId: string;
  propertyTitle: string;
  propertyAddress: string | null;
  propertyData: Record<string, unknown>;
  propertyImageUrl: string | null;

  // Campaign recommendation
  suggestedCampaignType: string;
  confidence: 'high' | 'medium' | 'low';
  suggestedChannels: Channel[];

  // Generated content (populated when status='ready')
  generatedCampaign: ListingCampaignResult | null;
  postCount: number | null;

  // Links to resulting campaign after approval
  approvedCampaignId: string | null;

  createdAt: string;
  expiresAt: string | null;
}

export interface AutopilotCampaignStatsResponse {
  pendingCount: number;
  readyCount: number;
  approvedThisWeek: number;
  dismissedThisWeek: number;
  convertedThisWeek: number;
}

export interface AutopilotCampaignRecommendationsResponse {
  recommendations: AutopilotCampaignRecommendation[];
  pendingCount: number;
  readyCount: number;
}

// ── Planner Suggestion Types ─────────────────────────────────────────

export interface PlannerSuggestion {
  id: string;
  suggestedDate: string;
  suggestedHour: number;
  rank: number;
  dataItem: {
    id: string;
    type: DataItemType;
    title: string;
    summary: string | null;
    usageCount: number;
    lastUsedAt: string | null;
  };
  blueprint: {
    id: string;
    slug: string;
    name: string;
    category: BlueprintCategory;
  };
  opportunityScore: number;
  adjustedScore: number;
  angle: string | null;
  angleLabel: string | null;
  angleCategory: string | null;
  reasoning: string;
  channel: Channel | null;
}

export interface CoverageGap {
  label: string;
  category: string;
  suggestion?: string;
  guidance?: string;
  contentType?: string;
}

export interface WeekSummary {
  published: number;
  scheduled: number;
  projected: number;
  target: number;
  gap: number;
  gapDays: string[];
  coverageGaps: (string | CoverageGap)[];
  missingAngleCategories: string[];
  status: 'on_track' | 'below' | 'ahead';
}

export interface PlannerCampaignSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  sourceId: string | null;
  sourceLabel: string;
  priorityScore: number;
  confidence: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionPayload: {
    action?: string;
    campaignType?: string;
    listingDataItemId?: string;
    sourceId?: string;
  };
  suggestedCampaignType: string | null;
  reasons: string[];
}

export interface PlannerEngineInsights {
  growthScore: number | null;
  daysSinceLastGeneration: number | null;
  contentMixHealth: 'healthy' | 'fair' | 'low';
}

export interface PlannerSuggestionsResult {
  suggestions: PlannerSuggestion[];
  campaignSuggestions?: PlannerCampaignSuggestion[];
  engineInsights?: PlannerEngineInsights | null;
  weekSummary: WeekSummary;
}

export interface PlanMyWeekInput {
  weekStart?: string;
  weekEnd?: string;
}

export interface SwapSuggestionInput {
  excludeDataItemIds: string[];
  targetDate: string;
  channel?: Channel;
}

export interface SwapSuggestionResult {
  suggestion: PlannerSuggestion | null;
}

export interface ContentBlueprint {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: BlueprintCategory;
  promptTemplate: string;
  applicableTypes: DataItemType[];
  applicableChannels: Channel[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentOpportunity {
  dataItem: {
    id: string;
    type: DataItemType;
    title: string;
    summary: string | null;
    usageCount: number;
  };
  blueprint: {
    id: string;
    slug: string;
    name: string;
    category: BlueprintCategory;
  };
  score: number;
}

export interface ItemOpportunity {
  blueprint: {
    id: string;
    slug: string;
    name: string;
    category: BlueprintCategory;
    description: string;
  };
  score: number;
}

export interface BulkGenerateItem {
  dataItemId: string;
  blueprintId: string;
  channel: Channel;
  guidance?: string;
}

export interface BulkGenerateResult {
  results: Array<{
    dataItemId: string;
    status: 'success' | 'error' | 'limit_reached';
    draftId?: string;
  }>;
  generated: number;
  total: number;
}

export interface GenerateContentInput {
  clientId: string;
  kind: DraftKind;
  channel: Channel;
  bucketKey?: string;
  guidance: string;
  templateType?: string;
  dataItemId?: string;
  blueprintId?: string;
}

export interface GenerateMediaInput {
  clientId: string;
  guidance: string;
  draftId?: string;
  folderId?: string;
  channel?: Channel;
  usePersona?: boolean;
  overrides?: Record<string, unknown>;
}

export interface AssetFilters {
  source?: MediaAssetSource;
  status?: MediaAssetStatus;
  assetType?: MediaAssetType;
  draftId?: string;
  folderId?: string;
  tag?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

// ── Query keys ───────────────────────────────────────────────────────────

export const squadpitchKeys = {
  all: ['squadpitch'] as const,
  clients: () => [...squadpitchKeys.all, 'clients'] as const,
  client: (id: string) => [...squadpitchKeys.all, 'client', id] as const,
  brand: (id: string) =>
    [...squadpitchKeys.all, 'client', id, 'brand'] as const,
  voice: (id: string) =>
    [...squadpitchKeys.all, 'client', id, 'voice'] as const,
  media: (id: string) =>
    [...squadpitchKeys.all, 'client', id, 'media'] as const,
  channels: (id: string) =>
    [...squadpitchKeys.all, 'client', id, 'channels'] as const,
  connections: (id: string) =>
    [...squadpitchKeys.all, 'client', id, 'connections'] as const,
  analytics: (id: string) =>
    [...squadpitchKeys.all, 'client', id, 'analytics'] as const,
  analyticsOverview: (id: string, range: string) =>
    [...squadpitchKeys.all, 'client', id, 'analytics-overview', range] as const,
  trackableLinks: (id: string, draftId?: string) =>
    [...squadpitchKeys.all, 'client', id, 'trackable-links', draftId ?? ''] as const,
  drafts: (filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'drafts', filters ?? {}] as const,
  draft: (id: string) => [...squadpitchKeys.all, 'draft', id] as const,
  campaigns: (clientId: string, filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'client', clientId, 'campaigns', filters ?? {}] as const,
  campaign: (id: string) =>
    [...squadpitchKeys.all, 'campaign', id] as const,
  suiteFlags: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'suite-flags'] as const,
  assets: (clientId: string, filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'client', clientId, 'assets', filters ?? {}] as const,
  asset: (id: string) => [...squadpitchKeys.all, 'asset', id] as const,
  folders: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'folders'] as const,
  assetTagDefaults: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'asset-tag-defaults'] as const,
  postDetail: (clientId: string, postId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'post-detail', postId] as const,
  postMetricHistory: (clientId: string, postId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'post-metric-history', postId] as const,
  dataSources: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'data-sources'] as const,
  dataItems: (clientId: string, filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'client', clientId, 'data-items', filters ?? {}] as const,
  dataItem: (id: string) =>
    [...squadpitchKeys.all, 'data-item', id] as const,
  blueprints: (filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'blueprints', filters ?? {}] as const,
  opportunities: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'opportunities'] as const,
  itemOpportunities: (itemId: string) =>
    [...squadpitchKeys.all, 'item-opportunities', itemId] as const,
  topPerforming: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'top-performing'] as const,
  bestBlueprints: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'best-blueprints'] as const,
  autopilot: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'autopilot'] as const,
  autopilotReadiness: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'autopilot-readiness'] as const,
  autopilotActivity: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'autopilot-activity'] as const,
  autopilotStatus: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'autopilot-status'] as const,
  dashboardRecommendations: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'dashboard-recommendations'] as const,
  dashboardActions: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'dashboard-actions'] as const,
  nearbyListings: (clientId: string, zipCode: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'nearby-listings', zipCode] as const,
  autopilotCampaigns: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'autopilot-campaigns'] as const,
  autopilotCampaignStats: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'autopilot-campaign-stats'] as const,
  contentPreferences: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'content-preferences'] as const,
  brandPersona: (id: string) =>
    [...squadpitchKeys.all, 'client', id, 'brand-persona'] as const,
};

// ── Clients ──────────────────────────────────────────────────────────────

export function useClients() {
  return useQuery({
    queryKey: squadpitchKeys.clients(),
    queryFn: () => apiFetch<{ clients: Client[] }>('workspaces'),
    select: (data) => data.clients,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.client(id ?? ''),
    queryFn: () => apiFetch<Client>(`workspaces/${id}`),
    enabled: Boolean(id),
  });
}

export interface CreateClientInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
  industryKey?: string;
  status?: ClientStatus;
  /** IANA timezone, e.g. "America/New_York". Only present on updates. */
  timezone?: string;
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClientInput) =>
      apiFetch<Client>('workspaces', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.clients() });
    },
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CreateClientInput> & { status?: ClientStatus }) =>
      apiFetch<Client>(`workspaces/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.client(id) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.clients() });
    },
  });
}

export function useArchiveClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Client>(`workspaces/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.client(id) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.clients() });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Client>(`workspaces/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.clients() });
    },
  });
}

// ── Brand ────────────────────────────────────────────────────────────────

export function useBrandProfile(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.brand(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ brand: BrandProfile | null }>(`workspaces/${clientId}/brand`),
    select: (data) => data.brand,
    enabled: Boolean(clientId),
  });
}

export type UpsertBrandProfileInput = Partial<
  Omit<BrandProfile, 'clientId' | 'updatedBy' | 'updatedAt'>
>;

export function useUpsertBrandProfile(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertBrandProfileInput) =>
      apiFetch<{ brand: BrandProfile }>(`workspaces/${clientId}/brand`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.brand(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.client(clientId) });
    },
  });
}

// ── Voice ────────────────────────────────────────────────────────────────

export function useVoiceProfile(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.voice(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ voice: VoiceProfile | null }>(`workspaces/${clientId}/voice`),
    select: (data) => data.voice,
    enabled: Boolean(clientId),
  });
}

export interface UpsertVoiceProfileInput {
  tone?: string | null;
  voiceRulesJson?: VoiceRules;
  bannedPhrases?: string[];
  ctaPreferences?: Record<string, unknown> | null;
  contentBuckets?: ContentBucket[];
}

export function useUpsertVoiceProfile(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertVoiceProfileInput) =>
      apiFetch<{ voice: VoiceProfile }>(`workspaces/${clientId}/voice`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.voice(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.client(clientId) });
    },
  });
}

// ── Media ────────────────────────────────────────────────────────────────

export function useMediaProfile(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.media(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ media: MediaProfile | null }>(`workspaces/${clientId}/media`),
    select: (data) => data.media,
    enabled: Boolean(clientId),
  });
}

export type UpsertMediaProfileInput = Partial<
  Omit<MediaProfile, 'clientId' | 'updatedBy' | 'updatedAt'>
> & { mode: MediaMode };

export function useUpsertMediaProfile(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertMediaProfileInput) =>
      apiFetch<{ media: MediaProfile }>(`workspaces/${clientId}/media`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.media(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.client(clientId) });
    },
  });
}

// ── Brand Persona ────────────────────────────────────────────────────────

export function useBrandPersona(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.brandPersona(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ persona: BrandPersona | null }>(`workspaces/${clientId}/brand-persona`),
    select: (data) => data.persona,
    enabled: Boolean(clientId),
  });
}

export interface UpsertBrandPersonaInput {
  personaType?: PersonaType;
  name?: string | null;
  status?: PersonaTrainingStatus;
  visualStyle?: string | null;
  usageSettings?: PersonaUsageSettings;
  styleProfile?: BrandStyleProfile;
}

export function useUpsertBrandPersona(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertBrandPersonaInput) =>
      apiFetch<{ persona: BrandPersona }>(`workspaces/${clientId}/brand-persona`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.brandPersona(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.client(clientId) });
    },
  });
}

export function useDeleteBrandPersona(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`workspaces/${clientId}/brand-persona`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.brandPersona(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.client(clientId) });
    },
  });
}

export function useUploadPersonaTrainingImage(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      // First upload the file as an asset via existing pipeline
      const res = await fetch(
        `/api/proxy/workspaces/${clientId}/assets/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Upload failed (${res.status})`);
      }
      const asset = await res.json();
      // Then register the image in the persona's training set
      return apiFetch<{ image: PersonaTrainingImage }>(
        `workspaces/${clientId}/brand-persona/training-images`,
        {
          method: 'POST',
          body: JSON.stringify({
            url: asset.url,
            filename: file.name,
            size: file.size,
            mimeType: file.type,
          }),
        }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.brandPersona(clientId) });
    },
  });
}

export function useRemovePersonaTrainingImage(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      apiFetch(`workspaces/${clientId}/brand-persona/training-images/${imageId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.brandPersona(clientId) });
    },
  });
}

export function useRecordPersonaConsent(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ persona: BrandPersona }>(`workspaces/${clientId}/brand-persona/consent`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.brandPersona(clientId) });
    },
  });
}

export function useStartPersonaTraining(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true; requestId: string; triggerPhrase: string }>(
        `workspaces/${clientId}/brand-persona/train`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.brandPersona(clientId) });
    },
  });
}

export function useGeneratePersonaPreviews(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ previews: PersonaPreviewImage[] }>(
        `workspaces/${clientId}/brand-persona/previews`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.brandPersona(clientId) });
    },
  });
}

// ── Persona Frame Generation ──────────────────────────────────────────────

export interface PersonaFrameInput {
  purpose: 'intro' | 'outro' | 'thumbnail';
  overlayText?: string;
}

export interface PersonaFrame {
  purpose: 'intro' | 'outro' | 'thumbnail';
  url: string;
  width: number;
  height: number;
}

export function useGeneratePersonaFrames(clientId: string) {
  return useMutation({
    mutationFn: (input: { frames: PersonaFrameInput[] }) =>
      apiFetch<{ frames: PersonaFrame[] }>(`workspaces/${clientId}/brand-persona/generate-frames`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

// ── Channels ─────────────────────────────────────────────────────────────

export function useChannelSettings(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.channels(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ channels: ChannelSettings[] }>(`workspaces/${clientId}/channels`),
    select: (data) => data.channels,
    enabled: Boolean(clientId),
  });
}

export interface UpsertChannelSettingsItem {
  channel: Channel;
  isEnabled?: boolean;
  maxChars?: number | null;
  allowEmoji?: boolean;
  trailingHashtags?: string[];
  notes?: string | null;
}

export function useUpsertChannelSettings(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: UpsertChannelSettingsItem[]) =>
      apiFetch<{ channels: ChannelSettings[] }>(`workspaces/${clientId}/channels`, {
        method: 'PUT',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.channels(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.client(clientId) });
    },
  });
}

// ── Analytics ────────────────────────────────────────────────────────────

export function useClientAnalytics(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.analytics(clientId ?? ''),
    queryFn: () => apiFetch<ClientAnalytics>(`workspaces/${clientId}/analytics`),
    enabled: Boolean(clientId),
  });
}

export function useAnalyticsOverview(
  clientId: string | undefined,
  range: AnalyticsRange = '30d',
) {
  return useQuery({
    queryKey: squadpitchKeys.analyticsOverview(clientId ?? '', range),
    queryFn: () =>
      apiFetch<AnalyticsOverview>(
        `workspaces/${clientId}/analytics/overview?range=${range}`,
      ),
    enabled: Boolean(clientId),
  });
}

export function useTrackableLinks(
  clientId: string | undefined,
  draftId?: string,
) {
  const query = draftId ? `?draftId=${draftId}` : '';
  return useQuery({
    queryKey: squadpitchKeys.trackableLinks(clientId ?? '', draftId),
    queryFn: () =>
      apiFetch<{ links: TrackableLink[] }>(
        `workspaces/${clientId}/links${query}`,
      ),
    select: (data) => data.links,
    enabled: Boolean(clientId),
  });
}

export function useCreateTrackableLink(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      destinationUrl: string;
      draftId?: string;
      label?: string;
      channel?: Channel;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmTerm?: string;
      utmContent?: string;
    }) =>
      apiFetch<TrackableLink>(`workspaces/${clientId}/links`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...squadpitchKeys.all, 'client', clientId, 'trackable-links'],
      });
    },
  });
}

export function useDeleteTrackableLink(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) =>
      apiFetch<{ ok: boolean }>(`workspaces/${clientId}/links/${linkId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...squadpitchKeys.all, 'client', clientId, 'trackable-links'],
      });
    },
  });
}

export function useSyncMetrics(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) =>
      apiFetch<{ synced: boolean; reason?: string }>(`drafts/${draftId}/metrics/sync`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.analytics(clientId) });
      qc.invalidateQueries({
        queryKey: [...squadpitchKeys.all, 'client', clientId, 'analytics-overview'],
      });
    },
  });
}

export interface SyncMetaInsightsResult {
  totalCandidates: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: {
    draftId: string;
    channel: string;
    reason: string;
    detail: string | null;
  }[];
}

export function useSyncMetaInsights(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<SyncMetaInsightsResult>(
        `workspaces/${clientId}/metrics/sync-meta`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.analytics(clientId) });
      qc.invalidateQueries({
        queryKey: [...squadpitchKeys.all, 'client', clientId, 'analytics-overview'],
      });
    },
  });
}

// ── Meta App Review API check tool — TEMPORARY ──────────────────────
// Mirrors the backend POST /api/v1/workspaces/:id/dev/meta/app-review-checks.
// Delete this hook (and SyncMetaAppReviewCheckResult) when the
// App Review tool is retired.

export interface MetaAppReviewCheckResult {
  scope: 'read_insights' | 'instagram_manage_insights';
  attempted: boolean;
  success: boolean;
  endpoint: string;
  metrics: string[];
  errorCode: string | null;
  message: string;
}

export interface MetaAppReviewChecksResponse {
  facebook: MetaAppReviewCheckResult;
  instagram: MetaAppReviewCheckResult;
  tokenScopes: {
    facebook: string[] | null;
    instagram: string[] | null;
  };
  nextSteps: string[];
}

export function useMetaAppReviewChecks(clientId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<MetaAppReviewChecksResponse>(
        `workspaces/${clientId}/dev/meta/app-review-checks`,
        { method: 'POST' },
      ),
  });
}

// ── Threads replies ─────────────────────────────────────────────────
// Mirrors the backend POST /api/v1/drafts/:id/threads/replies endpoint.

export interface ThreadsReply {
  replyId: string;
  text: string | null;
  author: string | null;
  timestamp: string | null;
  permalink: string | null;
  hidden: boolean;
}

export interface ThreadsRepliesResponse {
  draftId: string;
  threadId: string;
  fetchedAt: string;
  replies: ThreadsReply[];
}

export function useThreadsReplies(draftId: string | undefined) {
  return useQuery({
    queryKey: ['threadsReplies', draftId],
    queryFn: () =>
      apiFetch<ThreadsRepliesResponse>(`drafts/${draftId}/threads/replies`),
    enabled: Boolean(draftId),
    staleTime: 30_000,
  });
}

export function useSetThreadsReplyHidden(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ replyId, hide }: { replyId: string; hide: boolean }) =>
      apiFetch<{ replyId: string; hidden: boolean; success: boolean }>(
        `drafts/${draftId}/threads/replies/${replyId}/visibility`,
        { method: 'POST', body: JSON.stringify({ hide }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threadsReplies', draftId] });
    },
  });
}

export function usePostDetail(clientId: string | undefined, postId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.postDetail(clientId ?? '', postId ?? ''),
    queryFn: () =>
      apiFetch<PostDetail>(`workspaces/${clientId}/analytics/posts/${postId}`),
    enabled: Boolean(clientId) && Boolean(postId),
  });
}

export function usePostMetricHistory(
  clientId: string | undefined,
  postId: string | undefined,
  enabled = false,
) {
  return useQuery({
    queryKey: squadpitchKeys.postMetricHistory(clientId ?? '', postId ?? ''),
    queryFn: () =>
      apiFetch<PostMetricHistory>(
        `workspaces/${clientId}/analytics/posts/${postId}/history`,
      ),
    enabled: Boolean(clientId) && Boolean(postId) && enabled,
  });
}

// ── Generation ───────────────────────────────────────────────────────────

export function useGenerateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateContentInput) =>
      apiFetch<Draft>('generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_draft, input) => {
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
      qc.invalidateQueries({
        queryKey: squadpitchKeys.analytics(input.clientId),
      });
    },
  });
}

// ── Content Remix ────────────────────────────────────────────────────────

export interface RemixDraft extends Draft {
  remixFormat: 'post' | 'carousel' | 'videoScript' | 'storyCaption';
}

export function useRemixContent(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) =>
      apiFetch<{ drafts: RemixDraft[] }>(`workspaces/${clientId}/remix`, {
        method: 'POST',
        body: JSON.stringify({ draftId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

// ── Content Ideas ────────────────────────────────────────────────────────

export interface ContentIdea {
  title: string;
  category: string;
  description: string;
  suggestedChannel: string;
}

export function useGenerateIdeas(clientId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ideas: ContentIdea[] }>(`workspaces/${clientId}/ideas`, {
        method: 'POST',
      }).then((r) => r.ideas),
  });
}

// ── Auto-schedule ────────────────────────────────────────────────────────

export function useAutoSchedule(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftIds: string[]) =>
      apiFetch<{ scheduled: Draft[]; count: number }>(`workspaces/${clientId}/auto-schedule`, {
        method: 'POST',
        body: JSON.stringify({ draftIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

// ── Drafts ───────────────────────────────────────────────────────────────

export interface DraftFilters {
  clientId?: string;
  status?: DraftStatus;
  kind?: DraftKind;
  channel?: Channel;
  limit?: number;
}

// "Active" statuses are the ones whose state can change without the user
// touching the page — scheduled posts that the worker may pick up,
// drafts that are mid-publish-attempt, etc. When the planner sees any
// active draft, we poll every 20 s so the UI reflects the worker's
// progress without a manual refresh. Otherwise we don't poll.
const ACTIVE_DRAFT_STATUSES = new Set([
  'SCHEDULED',
  'PENDING_REVIEW',
  'APPROVED',
]);

function hasActiveDraft(drafts: ReadonlyArray<Draft> | undefined): boolean {
  if (!drafts) return false;
  return drafts.some((d) => {
    if (ACTIVE_DRAFT_STATUSES.has(d.status)) return true;
    // A FAILED draft with a recent (last 30 min) publish attempt is
    // still likely to flip if the user retries; refresh while that's
    // possible.
    if (d.status === 'FAILED' && d.lastPublishAttemptAt) {
      const ageMs = Date.now() - new Date(d.lastPublishAttemptAt).getTime();
      if (ageMs < 30 * 60 * 1000) return true;
    }
    return false;
  });
}

export function useDrafts(filters: DraftFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  const path = qs ? `drafts?${qs}` : 'drafts';

  return useQuery({
    queryKey: squadpitchKeys.drafts(filters as Record<string, unknown>),
    queryFn: () => apiFetch<{ drafts: Draft[] }>(path),
    select: (data) => data.drafts,
    // refetchInterval can return a number (ms) or false. We re-evaluate
    // each time to flip polling off as soon as the active drafts settle.
    refetchInterval: (q) => (hasActiveDraft(q.state.data?.drafts) ? 20_000 : false),
    refetchIntervalInBackground: false,
  });
}

export function useDraft(id: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.draft(id ?? ''),
    queryFn: () => apiFetch<Draft>(`drafts/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateDraft(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      body: Partial<Pick<Draft, 'body' | 'hooks' | 'hashtags' | 'cta' | 'altText' | 'channel'>> & {
        mediaAssetIds?: string[];
        mediaUrl?: string | null;
      }
    ) =>
      apiFetch<Draft>(`drafts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.draft(id) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

function useDraftAction(
  id: string,
  action: 'approve' | 'reject' | 'schedule' | 'publish'
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: Record<string, unknown>) =>
      apiFetch<Draft>(`drafts/${id}/${action}`, {
        method: 'POST',
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.draft(id) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'client'] });
    },
  });
}

type DraftActionOptions = Parameters<
  ReturnType<typeof useDraftAction>['mutate']
>[1];

export function useApproveDraft(id: string) {
  const mutation = useDraftAction(id, 'approve');
  return {
    ...mutation,
    mutate: (options?: DraftActionOptions) =>
      mutation.mutate(undefined, options),
    mutateAsync: (options?: DraftActionOptions) =>
      mutation.mutateAsync(undefined, options),
  };
}

export function useRejectDraft(id: string) {
  const mutation = useDraftAction(id, 'reject');
  return {
    ...mutation,
    mutate: (reason: string, options?: DraftActionOptions) =>
      mutation.mutate({ reason }, options),
    mutateAsync: (reason: string, options?: DraftActionOptions) =>
      mutation.mutateAsync({ reason }, options),
  };
}

export function useScheduleDraft(id: string) {
  const mutation = useDraftAction(id, 'schedule');
  return {
    ...mutation,
    mutate: (scheduledFor: string, options?: DraftActionOptions) =>
      mutation.mutate({ scheduledFor }, options),
    mutateAsync: (scheduledFor: string, options?: DraftActionOptions) =>
      mutation.mutateAsync({ scheduledFor }, options),
  };
}

export function usePublishDraft(id: string) {
  const mutation = useDraftAction(id, 'publish');
  return {
    ...mutation,
    mutate: (options?: DraftActionOptions) =>
      mutation.mutate(undefined, options),
    mutateAsync: (options?: DraftActionOptions) =>
      mutation.mutateAsync(undefined, options),
  };
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`drafts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

export function useDeleteAllDrafts(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; deleted: number }>(`workspaces/${clientId}/drafts`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

export function useDuplicateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Draft>(`drafts/${id}/duplicate`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

// ── Channel connections ──────────────────────────────────────────────────

export function useChannelConnections(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.connections(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ connections: ChannelConnection[] }>(
        `workspaces/${clientId}/connections`
      ),
    select: (data) => data.connections,
    enabled: Boolean(clientId),
  });
}

/**
 * Returns a Map<Channel, boolean> indicating which channels are connected.
 */
export function useChannelConnectionStatus(clientId: string | undefined) {
  const { data: connections } = useChannelConnections(clientId);
  const statusMap = new Map<Channel, boolean>();
  if (connections) {
    for (const conn of connections) {
      if (conn.status === 'CONNECTED') {
        statusMap.set(conn.channel, true);
      }
    }
  }
  return statusMap;
}

export function useStartOAuth(clientId: string) {
  return useMutation({
    mutationFn: (channel: Channel) =>
      apiFetch<OAuthStartResponse>(
        `workspaces/${clientId}/connections/${channel}/oauth/start`,
        { method: 'POST', body: JSON.stringify({}) }
      ),
  });
}

// ── LinkedIn Organization Page picker ────────────────────────────────
//
// Two-step flow surfaced via dedicated endpoints — see
// squadpitch-api/domains/studio/studio.routes.js (LINKEDIN_ORGANIZATION_PAGE
// orgs / select). The org-picker UI calls useLinkedinOrganizationPages
// after the OAuth callback succeeds, then useSelectLinkedinOrganization
// once the user chooses one.

export interface LinkedinOrganizationPage {
  id: string;
  urn: string;
  name: string;
  vanityName: string | null;
  logoUrl: string | null;
}

export function useLinkedinOrganizationPages(clientId: string | undefined) {
  return useQuery({
    queryKey: ['linkedin-org-pages', clientId ?? ''],
    queryFn: () =>
      apiFetch<{ orgs: LinkedinOrganizationPage[]; message?: string }>(
        `workspaces/${clientId}/connections/LINKEDIN_ORGANIZATION_PAGE/orgs`
      ),
    enabled: Boolean(clientId),
    // Don't auto-refetch — this is shown only inside a picker modal
    // and we want a stable list during selection.
    staleTime: 60_000,
  });
}

export function useSelectLinkedinOrganization(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { organizationId: string; organizationName?: string }) =>
      apiFetch<{ connection: ChannelConnection }>(
        `workspaces/${clientId}/connections/LINKEDIN_ORGANIZATION_PAGE/orgs/select`,
        { method: 'POST', body: JSON.stringify(input) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.connections(clientId) });
    },
  });
}

// ── Pinterest board picker ───────────────────────────────────────────
//
// Mirrors the LinkedIn Organization Page two-step pattern. After the
// Pinterest OAuth callback succeeds the connection is CONNECTED but
// has no destination board set; the picker UI calls usePinterestBoards
// to list boards then useSelectPinterestBoard to persist the choice.

export interface PinterestBoard {
  id: string;
  name: string;
  description: string | null;
  privacy: string | null;
}

export function usePinterestBoards(clientId: string | undefined) {
  return useQuery({
    queryKey: ['pinterest-boards', clientId ?? ''],
    queryFn: () =>
      apiFetch<{ boards: PinterestBoard[]; message?: string }>(
        `workspaces/${clientId}/connections/PINTEREST/boards`
      ),
    enabled: Boolean(clientId),
    staleTime: 60_000,
  });
}

export function useSelectPinterestBoard(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { boardId: string; boardName?: string }) =>
      apiFetch<{ connection: ChannelConnection }>(
        `workspaces/${clientId}/connections/PINTEREST/boards/select`,
        { method: 'POST', body: JSON.stringify(input) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.connections(clientId) });
    },
  });
}

// Create a Pinterest board via the API. Sandbox-mode escape hatch:
// Pinterest's sandbox host has no UI for creating boards, so trial
// apps can't otherwise seed a destination. Production / Standard
// access apps can also use this if they want — there's no harm.
// ── Google Business Profile location picker ──────────────────────────
// Mirrors the Pinterest board picker pattern. After GBP OAuth, the
// ChannelConnection has the user's tokens but externalAccountId is
// the sentinel "accounts/{a}" — the location picker upgrades that
// to "accounts/{a}/locations/{l}" before review polling/reply fire.

export interface GbpLocation {
  name: string; // "accounts/{a}/locations/{l}" canonical resource name
  title: string | null;
  address: string | null;
  accountId: string;
  accountName: string;
}

// Picker response can be one of three states. The UI branches on
// `status` so the empty / access-denied paths render dedicated
// copy rather than a misleading "no locations" message.
export interface GbpLocationsResponse {
  status: 'ok' | 'empty' | 'access_denied';
  locations: GbpLocation[];
  message?: string;
  providerMessage?: string | null;
}

export function useGbpLocations(clientId: string | undefined) {
  return useQuery({
    queryKey: ['gbp-locations', clientId ?? ''],
    queryFn: () =>
      apiFetch<GbpLocationsResponse>(
        `workspaces/${clientId}/connections/GOOGLE_BUSINESS_PROFILE/locations`,
      ),
    enabled: Boolean(clientId),
    staleTime: 60_000,
  });
}

// Manual probe — fires reviews.list pageSize=1 against the
// connection's selected location. Returns the resolved access
// state without any fake ingestion. Invalidates the connections
// query on completion so the Settings tile rerenders with the
// new lastError state immediately.
export interface GbpAccessCheckResult {
  status: 'ok' | 'access_denied' | 'no_location' | 'error';
  message: string;
  providerMessage?: string;
}

export function useCheckGbpReviewAccess(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<GbpAccessCheckResult>(
        `workspaces/${clientId}/connections/GOOGLE_BUSINESS_PROFILE/check-review-access`,
        { method: 'POST' },
      ),
    onSettled: () => {
      // Whether the check succeeded or failed, the connection's
      // lastError may have flipped — refetch so the access-pending
      // banner appears/disappears immediately.
      qc.invalidateQueries({ queryKey: squadpitchKeys.connections(clientId) });
    },
  });
}

export function useSelectGbpLocation(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { locationName: string; locationTitle?: string }) =>
      apiFetch<{ connection: ChannelConnection }>(
        `workspaces/${clientId}/connections/GOOGLE_BUSINESS_PROFILE/locations/select`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.connections(clientId) });
    },
  });
}

export function useCreatePinterestBoard(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      apiFetch<{ board: PinterestBoard }>(
        `workspaces/${clientId}/connections/PINTEREST/boards`,
        { method: 'POST', body: JSON.stringify(input) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pinterest-boards', clientId ?? ''] });
    },
  });
}

export function useCompleteOAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; state: string }) =>
      apiFetch<{ connection: ChannelConnection }>('oauth/complete', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({
        queryKey: squadpitchKeys.connections(result.connection.clientId),
      });
    },
  });
}

export function useDisconnectChannel(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: Channel) =>
      apiFetch<{ ok: true }>(`workspaces/${clientId}/connections/${channel}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: squadpitchKeys.connections(clientId),
      });
    },
  });
}

// ── Media Assets ────────────────────────────────────────────────────────

export interface AssetsPage {
  assets: MediaAsset[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function useAssets(clientId: string, filters: AssetFilters = {}, poll = false) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  const path = `workspaces/${clientId}/assets${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: squadpitchKeys.assets(clientId, filters as Record<string, unknown>),
    queryFn: () => apiFetch<AssetsPage>(path),
    select: (data) => data.assets,
    refetchInterval: poll ? 3000 : false,
  });
}

/** Like useAssets but returns full pagination metadata */
export function useAssetsPaginated(clientId: string, filters: AssetFilters = {}, poll = false) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  const path = `workspaces/${clientId}/assets${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: squadpitchKeys.assets(clientId, filters as Record<string, unknown>),
    queryFn: () => apiFetch<AssetsPage>(path),
    refetchInterval: poll ? 3000 : false,
    placeholderData: (prev) => prev,
  });
}

export function useAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.asset(assetId ?? ''),
    queryFn: () => apiFetch<MediaAsset>(`assets/${assetId}`),
    enabled: Boolean(assetId),
  });
}

export function useUploadAsset(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ formData, assetType, folderId }: { formData: FormData; assetType?: MediaAssetType; folderId?: string }) => {
      const file = formData.get('file') as File | null;
      if (!file) throw new Error('No file provided');

      const params = new URLSearchParams();
      if (assetType === 'video') params.set('assetType', 'video');
      if (file.name) params.set('filename', file.name);
      const altText = formData.get('altText');
      if (altText) params.set('altText', altText as string);
      const caption = formData.get('caption');
      if (caption) params.set('caption', caption as string);
      if (folderId) params.set('folderId', folderId);
      const qs = params.toString();

      const res = await fetch(
        `/api/proxy/workspaces/${clientId}/assets/upload${qs ? `?${qs}` : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        }
      );
      if (!res.ok) {
        let message = `Upload failed (${res.status})`;
        try {
          const body = await res.json();
          message = body?.message || body?.error || message;
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }
      return res.json() as Promise<MediaAsset>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.folders(clientId) });
    },
  });
}

export function useDeleteAsset(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) =>
      apiFetch<{ ok: true }>(`assets/${assetId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.folders(clientId) });
    },
  });
}

export function useUploadAssetFromUrl(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, folderId }: { url: string; folderId?: string }) =>
      apiFetch<MediaAsset>(`workspaces/${clientId}/assets/upload-from-url`, {
        method: 'POST',
        body: JSON.stringify({ url, folderId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.folders(clientId) });
    },
  });
}

// ── Folder hooks ────────────────────────────────────────────────────────

export function useFolders(clientId: string) {
  return useQuery({
    queryKey: squadpitchKeys.folders(clientId),
    queryFn: () => apiFetch<{ folders: AssetFolder[] }>(`workspaces/${clientId}/folders`),
    select: (data) => data.folders,
  });
}

export function useCreateFolder(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    // Idempotent "ensure folder exists" semantics. A naive POST hits
    // the (clientId, name) unique index with a 409 when the folder was
    // already created (different tab, recent campaign rerun, stale
    // useFolders cache). We treat 409 as "great, fetch the existing
    // one" so callers can always rely on getting back a folder.
    mutationFn: async (name: string): Promise<AssetFolder> => {
      try {
        return await apiFetch<AssetFolder>(`workspaces/${clientId}/folders`, {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
      } catch (err) {
        const status = (err as { status?: number })?.status;
        const code = (err as { code?: string })?.code;
        if (status === 409 || code === 'DUPLICATE_FOLDER') {
          const fresh = await apiFetch<{ folders: AssetFolder[] }>(
            `workspaces/${clientId}/folders`
          );
          const existing = fresh.folders.find((f) => f.name === name);
          if (existing) return existing;
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.folders(clientId) });
    },
  });
}

export function useRenameFolder(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      apiFetch<AssetFolder>(`workspaces/${clientId}/folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.folders(clientId) });
    },
  });
}

export function useDeleteFolder(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) =>
      apiFetch<{ ok: true }>(`workspaces/${clientId}/folders/${folderId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.folders(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
    },
  });
}

export function useMoveAssetToFolder(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, folderId }: { assetId: string; folderId: string | null }) =>
      apiFetch<MediaAsset>(`assets/${assetId}/folder`, {
        method: 'PATCH',
        body: JSON.stringify({ folderId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.folders(clientId) });
    },
  });
}

export function useUpdateAssetTags(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, tags }: { assetId: string; tags: string[] }) =>
      apiFetch<MediaAsset>(`assets/${assetId}/tags`, {
        method: 'PATCH',
        body: JSON.stringify({ tags }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
    },
  });
}

export function useAutoTagAsset(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) =>
      apiFetch<{ suggestedTags: string[]; savedTags: string[] }>(`workspaces/${clientId}/assets/${assetId}/auto-tag`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
    },
  });
}

/**
 * Fire-and-forget auto-tag via plain fetch — avoids useMutation's
 * single-observer limitation where rapid calls clobber each other.
 * The backend now saves tags directly, so no second call is needed.
 */
export function autoTagAssetFetch(clientId: string, assetId: string): Promise<void> {
  return apiFetch<void>(`workspaces/${clientId}/assets/${assetId}/auto-tag`, {
    method: 'POST',
    body: JSON.stringify({}),
  }).then(() => {}).catch(() => {
    // Fire-and-forget — swallow errors silently
  });
}

/**
 * Auto-tag and return the saved tags so the caller can use them immediately.
 */
export function autoTagAssetWithResult(clientId: string, assetId: string): Promise<string[]> {
  return apiFetch<{ suggestedTags: string[]; savedTags: string[] }>(
    `workspaces/${clientId}/assets/${assetId}/auto-tag`,
    { method: 'POST', body: JSON.stringify({}) },
  ).then((r) => r.savedTags ?? r.suggestedTags ?? []).catch(() => []);
}

export function useAssetTagDefaults(clientId: string) {
  return useQuery({
    queryKey: squadpitchKeys.assetTagDefaults(clientId),
    queryFn: () => apiFetch<{ tags: string[] }>(`workspaces/${clientId}/asset-tag-defaults`),
    select: (data) => data.tags,
  });
}

export function useGenerateMedia(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateMediaInput) =>
      apiFetch<MediaAsset>('assets/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
    },
  });
}

export interface GenerateVideoInput {
  clientId: string;
  guidance: string;
  draftId?: string;
  channel?: Channel;
  preset?: string;
  duration?: string;
  aspectRatio?: string;
}

export function useGenerateVideo(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateVideoInput) =>
      apiFetch<MediaAsset>('assets/generate-video', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
    },
  });
}

// ── Persona Compose (Add Me to Photo) ────────────────────────────────────

export type ComposePose = 'standing' | 'pointing' | 'casual' | 'presenting' | 'arms_crossed' | 'walking';
export type SceneType = 'auto' | 'interior' | 'exterior';
export type InteriorLighting = 'warm_cozy' | 'bright_clean' | 'natural_window' | 'moody_cinematic' | 'luxury_high_end';
export type ExteriorLighting = 'golden_hour' | 'midday_sun' | 'overcast' | 'sunset_dusk' | 'twilight_lights_on';
export type LightingStyle = InteriorLighting | ExteriorLighting;
export type ComposeOutfit = 'business_suit' | 'smart_casual' | 'polo_casual' | 'branded_shirt' | 'luxury_agent' | 'outdoor_casual';
export type ComposeVibe = 'friendly_smile' | 'professional' | 'confident' | 'welcoming' | 'energetic';
export type FramingPreset = 'full_body' | 'waist_up' | 'bust' | 'custom';

export interface PersonaLayer {
  centerX: number;
  footY: number;
  scale: number;
  allowOverflow: boolean;
  framingPreset: FramingPreset;
}

export interface PersonaComposeInput {
  clientId: string;
  sourceImageUrl: string;
  sourceAssetId?: string;
  pose?: ComposePose;
  sceneType?: SceneType;
  lightingStyle?: LightingStyle;
  outfit?: ComposeOutfit;
  vibe?: ComposeVibe;
  personaLayer?: PersonaLayer;
  folderId?: string;
  draftId?: string;
}

export function usePersonaCompose(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PersonaComposeInput) =>
      apiFetch<{ asset: MediaAsset; metadata: { pose: string; placement: string; style: string } }>('persona/compose', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
    },
  });
}

// ── Persona Cutout + Blend (new two-step flow) ──────────────────────────

export interface PersonaCutoutInput {
  clientId: string;
  pose?: ComposePose;
  outfit?: ComposeOutfit;
  vibe?: ComposeVibe;
  sceneType?: SceneType;
  lightingStyle?: LightingStyle;
  framingPreset?: FramingPreset;
  folderId?: string;
}

export interface PersonaBlendTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface PersonaBlendInput {
  clientId: string;
  backgroundImageUrl: string;
  backgroundAssetId?: string;
  cutoutImageUrl: string;
  cutoutAssetId?: string;
  transform: PersonaBlendTransform;
  sceneType?: SceneType;
  lightingStyle?: LightingStyle;
  advanced?: {
    shadowIntensity?: number;   // 0-1, default 0.5
    warmthAdjust?: number;      // -1 to 1, default 0
    blendStrength?: number;     // 0-1, default 0.8
  };
  folderId?: string;
  draftId?: string;
}

export function usePersonaCutout(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PersonaCutoutInput) =>
      apiFetch<{ asset: MediaAsset }>('persona/cutout', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
    },
  });
}

export function usePersonaBlend(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PersonaBlendInput) =>
      apiFetch<{ asset: MediaAsset }>('persona/blend', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
    },
  });
}

export function useAttachAsset(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, draftId, displayOrder }: { assetId: string; draftId: string; displayOrder?: number }) =>
      apiFetch<MediaAsset>(`assets/${assetId}/attach`, {
        method: 'POST',
        body: JSON.stringify({ draftId, displayOrder }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

export function useDetachAsset(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) =>
      apiFetch<MediaAsset>(`assets/${assetId}/detach`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

// ── Asset Link / Unlink (many-to-many) ─────────────────────────────────

export function useLinkAsset(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, draftId, role }: { assetId: string; draftId: string; role?: string }) =>
      apiFetch<MediaAsset>(`assets/${assetId}/link`, {
        method: 'POST',
        body: JSON.stringify({ draftId, role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

export function useUnlinkAsset(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, draftId }: { assetId: string; draftId: string }) =>
      apiFetch<{ ok: true }>(`assets/${assetId}/link/${draftId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

export interface AssetUsageDraft {
  id: string;
  channel: Channel;
  bodySnippet: string;
  status: DraftStatus;
  role: string | null;
}

export function useAssetUsage(assetId: string | undefined) {
  return useQuery({
    queryKey: [...squadpitchKeys.all, 'asset-usage', assetId ?? ''],
    queryFn: () => apiFetch<{ drafts: AssetUsageDraft[] }>(`assets/${assetId}/usage`),
    select: (data) => data.drafts,
    enabled: Boolean(assetId),
  });
}

export interface GeneratePostFromAssetInput {
  kind?: DraftKind;
  channel: Channel;
  guidance?: string;
}

export function useGeneratePostFromAsset(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, ...input }: GeneratePostFromAssetInput & { assetId: string }) =>
      apiFetch<Draft>(`assets/${assetId}/generate-post`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.assets(clientId) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

// ── Campaigns ─────────────────────────────────────────────────────────
//
// First-class Campaign rows live alongside Drafts. The Planner
// still groups by `Draft.campaignId` today (back-compat); these
// hooks let surfaces that want canonical campaign metadata
// (Planner header, Dashboard active campaigns, future Sites/Ads
// modules) read it directly.

export interface CampaignFilters {
  status?: CampaignStatus;
}

export function useCampaigns(
  clientId: string | undefined,
  filters: CampaignFilters = {},
) {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  const qs = query.toString();
  return useQuery({
    queryKey: squadpitchKeys.campaigns(clientId ?? '', filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ campaigns: Campaign[] }>(
        `workspaces/${clientId}/campaigns${qs ? `?${qs}` : ''}`,
      ).then((r) => r.campaigns),
    enabled: !!clientId,
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.campaign(id ?? ''),
    queryFn: () =>
      apiFetch<{ campaign: Campaign }>(`campaigns/${id}`).then((r) => r.campaign),
    enabled: !!id,
  });
}

// ── Suite Feature Flags ───────────────────────────────────────────────
//
// Workspace-scoped read of the three suite-module flags. Backed by
// GET /workspaces/:id/suite-flags which calls configService.evaluateFlag
// for each on the server (per-workspace targeting + global enablement
// + rollout percentages all handled there).
//
// Returns booleans + a single isLoading. Callers use the booleans
// to gate sidebar entries and route shells; loading state is
// treated as "off" by callers so a slow flag fetch doesn't flash
// the placeholder visible.

export interface SuiteFlags {
  sites: boolean;
  inbox: boolean;
  ads: boolean;
}

export function useSuiteFlags(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.suiteFlags(clientId ?? ''),
    queryFn: () =>
      apiFetch<SuiteFlags>(`workspaces/${clientId}/suite-flags`),
    enabled: !!clientId,
    // Suite flags don't change often — cache for the page session
    // and refetch on workspace change. Avoids flashing the
    // "Coming Soon" copy on every navigation.
    staleTime: 5 * 60 * 1000,
  });
}

// ── Business Data ────────────────────────────────────���───────────────────

export interface DataItemFilters {
  type?: DataItemType;
  status?: DataItemStatus;
  search?: string;
  limit?: number;
}

export function useDataItems(clientId: string, filters: DataItemFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  const path = `workspaces/${clientId}/business-data${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: squadpitchKeys.dataItems(clientId, filters as Record<string, unknown>),
    queryFn: () => apiFetch<{ dataItems: WorkspaceDataItem[] }>(path),
    select: (data) => data.dataItems,
  });
}

export function useProperties(clientId: string, filters?: Omit<DataItemFilters, 'type'>) {
  return useDataItems(clientId, { ...filters, type: 'PROPERTY' });
}

export function useDataItem(
  clientId: string | undefined,
  id: string | undefined,
) {
  return useQuery({
    queryKey: squadpitchKeys.dataItem(id ?? ''),
    queryFn: () =>
      apiFetch<WorkspaceDataItem>(`workspaces/${clientId}/business-data/${id}`),
    enabled: Boolean(clientId && id),
  });
}

export interface CreateDataItemInput {
  type: DataItemType;
  title: string;
  summary?: string | null;
  dataJson?: Record<string, unknown>;
  tags?: string[];
  priority?: number;
  expiresAt?: string | null;
}

export function useCreateDataItem(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDataItemInput) =>
      apiFetch<WorkspaceDataItem>(`workspaces/${clientId}/business-data`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useUpdateDataItem(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateDataItemInput> & { id: string }) =>
      apiFetch<WorkspaceDataItem>(
        `workspaces/${clientId}/business-data/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useArchiveDataItem(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<WorkspaceDataItem>(
        `workspaces/${clientId}/business-data/${id}/archive`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useDeleteDataItem(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(
        `workspaces/${clientId}/business-data/${id}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

// ── Data Import ──────────────────────────────────────────────────────────

export interface ExtractedItem {
  type: DataItemType;
  title: string;
  summary: string | null;
  dataJson: Record<string, unknown>;
  tags: string[];
  priority: number;
  confidence: number;
}

export interface UrlExtractResult {
  items: ExtractedItem[];
  sourceUrl: string;
}

export interface TextExtractResult {
  items: ExtractedItem[];
}

export interface CSVPreviewResult {
  headers: string[];
  rowCount: number;
}

export interface CSVExtractResult {
  items: ExtractedItem[];
  headers: string[];
  rowCount: number;
}

export interface CSVColumnMapping {
  title?: string;
  summary?: string;
  type?: string;
  tags?: string;
  priority?: string;
  dataJsonFields?: string[];
}

export interface ConfirmImportInput {
  items: Array<{
    type: DataItemType;
    title: string;
    summary?: string | null;
    dataJson?: Record<string, unknown>;
    tags?: string[];
    priority?: number;
    expiresAt?: string | null;
  }>;
  sourceType: DataSourceType;
  sourceUrl?: string;
}

export interface ConfirmImportResult {
  created: number;
  dataSourceId: string;
}

export function useImportFromUrl(clientId: string) {
  return useMutation({
    mutationFn: (body: { url: string; hint?: string }) =>
      apiFetch<UrlExtractResult>(`workspaces/${clientId}/data-import/url`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useImportFromText(clientId: string) {
  return useMutation({
    mutationFn: (body: { text: string; hint?: string }) =>
      apiFetch<TextExtractResult>(`workspaces/${clientId}/data-import/text`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useCSVPreview(clientId: string) {
  return useMutation({
    mutationFn: (body: { csvContent: string }) =>
      apiFetch<CSVPreviewResult>(`workspaces/${clientId}/data-import/csv/preview`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useCSVExtract(clientId: string) {
  return useMutation({
    mutationFn: (body: { csvContent: string; columnMapping: CSVColumnMapping; defaultType?: DataItemType }) =>
      apiFetch<CSVExtractResult>(`workspaces/${clientId}/data-import/csv/extract`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useImportFromSheets(clientId: string) {
  return useMutation({
    mutationFn: (body: { integrationId: string; spreadsheetId: string; sheetName?: string; hint?: string }) =>
      apiFetch<{ items: ExtractedItem[]; spreadsheetId: string; sheetName: string }>(
        `workspaces/${clientId}/data-import/sheets`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
  });
}

export function useImportFromNotion(clientId: string) {
  return useMutation({
    mutationFn: (body: { integrationId: string; hint?: string }) =>
      apiFetch<{ items: ExtractedItem[] }>(
        `workspaces/${clientId}/data-import/notion`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
  });
}

export function useConfirmImport(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConfirmImportInput) =>
      apiFetch<ConfirmImportResult>(`workspaces/${clientId}/data-import/confirm`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

// ── Data Usage & Suggestions ─────────────────────────────────────────────

export interface DataSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  action: string;
  priority: number;
  missingTypes?: string[];
}

export interface DataCoverage {
  totalActive: number;
  unusedCount: number;
  staleCount: number;
  missingTypes: string[];
  typeBreakdown: Record<string, number>;
}

export interface DataSuggestionsResult {
  suggestions: DataSuggestion[];
  coverage: DataCoverage;
}

export interface UnusedDataResult {
  unusedCount: number;
  items: Array<{
    id: string;
    type: DataItemType;
    title: string;
    summary: string | null;
    tags: string[];
    priority: number;
    createdAt: string;
  }>;
}

export function useUnusedData(clientId: string) {
  return useQuery({
    queryKey: [...squadpitchKeys.dataItems(clientId), 'unused'],
    queryFn: () => apiFetch<UnusedDataResult>(`workspaces/${clientId}/business-data/unused`),
  });
}

export function useDataSuggestions(clientId: string) {
  return useQuery({
    queryKey: [...squadpitchKeys.dataItems(clientId), 'suggestions'],
    queryFn: () => apiFetch<DataSuggestionsResult>(`workspaces/${clientId}/business-data/suggestions`),
  });
}

// ── Content Blueprints ───────────────────────────────────────────────────

export interface BlueprintFilters {
  category?: BlueprintCategory;
  applicableType?: DataItemType;
  channel?: Channel;
}

export function useBlueprints(filters: BlueprintFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  const path = `content-blueprints${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: squadpitchKeys.blueprints(filters as Record<string, unknown>),
    queryFn: () => apiFetch<{ blueprints: ContentBlueprint[] }>(path),
    select: (data) => data.blueprints,
  });
}

// ── Content Opportunities ────────────────────────────────────────────────

export function useContentOpportunities(clientId: string) {
  return useQuery({
    queryKey: squadpitchKeys.opportunities(clientId),
    queryFn: () =>
      apiFetch<{ opportunities: ContentOpportunity[] }>(
        `workspaces/${clientId}/content-opportunities`
      ),
    select: (data) => data.opportunities,
  });
}

export function useItemOpportunities(
  clientId: string | undefined,
  itemId: string | undefined,
) {
  return useQuery({
    queryKey: squadpitchKeys.itemOpportunities(itemId ?? ''),
    queryFn: () =>
      apiFetch<{ opportunities: ItemOpportunity[] }>(
        `workspaces/${clientId}/business-data/${itemId}/opportunities`
      ),
    select: (data) => data.opportunities,
    enabled: Boolean(clientId && itemId),
  });
}

// ── Bulk Generate ────────────────────────────────────────────────────────

export function useBulkGenerate(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkGenerateItem[]) =>
      apiFetch<BulkGenerateResult>(
        `workspaces/${clientId}/business-data/bulk-generate`,
        {
          method: 'POST',
          body: JSON.stringify({ items }),
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

// ── Data Performance ──────────────────────────────────────────────────

export function useTopPerformingDataItems(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.topPerforming(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ items: TopPerformingItem[] }>(
        `workspaces/${clientId}/business-data/top-performing`
      ),
    select: (data) => data.items,
    enabled: Boolean(clientId),
  });
}

export function useBestBlueprints(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.bestBlueprints(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ blueprints: BlueprintWithPerformance[] }>(
        `workspaces/${clientId}/business-data/best-blueprints`
      ),
    select: (data) => data.blueprints,
    enabled: Boolean(clientId),
  });
}

export function useRecalculatePerformance(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ recalculated: number }>(
        `workspaces/${clientId}/business-data/recalculate`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.topPerforming(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.bestBlueprints(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

// ── Autopilot ────────────────────────────────────────────────────────

export function useAutopilotPreview(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AutopilotPreviewInput) =>
      apiFetch<{ suggestions: AutopilotSuggestion[] }>(
        `workspaces/${clientId}/autopilot/preview`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
  });
}

export function useAutopilotExecute(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AutopilotExecuteInput) =>
      apiFetch<AutopilotExecuteResult>(
        `workspaces/${clientId}/autopilot/execute`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
      qc.invalidateQueries({ queryKey: squadpitchKeys.topPerforming(clientId) });
    },
  });
}

// ── Autopilot Settings ───────────────────────────────────────────────────

// Spinstr01 — full automation mode ladder. auto_publish_guarded
// renders in the UI as a locked Coming Soon card; the backend
// schema rejects it on save. The type includes it for
// label-mapping purposes; the picker filters it from the
// selectable set. Legacy 'draft_only' rows persist and the API
// normalizes them to 'draft_on_click' on read.
export type AutopilotMode =
  | 'off'
  | 'recommend_only'
  | 'draft_on_click'
  | 'auto_generate_drafts'
  | 'schedule_after_approval'
  | 'auto_publish_guarded'
  // Accepted on the wire for backward compat; normalized to
  // 'draft_on_click' on read.
  | 'draft_only';

export interface AutopilotSettings {
  enabled: boolean;
  mode: AutopilotMode;
  preferredChannels: Channel[];
  allowListingPosts: boolean;
  allowTestimonialPosts: boolean;
  allowMilestonePosts: boolean;
  allowFallbackPosts: boolean;
  maxDraftsPerWeek: number;
  maxDraftsPerDay: number;
  maxDraftsPerScheduledRun: number;
  minimumHoursBetweenDrafts: number;
  requireApprovalBeforePublish: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  skipChannelsWithoutMedia: boolean;
}

export interface AutopilotReadinessCheck {
  id: string;
  label: string;
  met: boolean;
  fix: string;
}

export interface AutopilotReadiness {
  ready: boolean;
  checks: AutopilotReadinessCheck[];
  availableModes: AutopilotMode[];
  connectedChannels: string[];
  totalDataItems: number;
}

export interface AutopilotActivityItem {
  id: string;
  eventType: 'generated' | 'scheduled' | 'published' | 'skipped' | 'failed';
  channel: string;
  status: string;
  body: string | null;
  trigger: string | null;
  reason: string | null;
  angle: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export function useAutopilotSettings(clientId: string | undefined) {
  return useQuery({
    queryKey: [...squadpitchKeys.autopilot(clientId ?? ''), 'settings'],
    queryFn: () =>
      apiFetch<{ settings: AutopilotSettings }>(
        `workspaces/${clientId}/autopilot/settings`,
      ).then((r) => r.settings),
    enabled: Boolean(clientId),
  });
}

export function useUpdateAutopilotSettings(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AutopilotSettings>) =>
      apiFetch<{ settings: AutopilotSettings }>(
        `workspaces/${clientId}/autopilot/settings`,
        { method: 'PUT', body: JSON.stringify(body) },
      ).then((r) => r.settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilot(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotStatus(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dashboardRecommendations(clientId) });
    },
  });
}

export function useAutopilotReadiness(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.autopilotReadiness(clientId ?? ''),
    queryFn: () =>
      apiFetch<AutopilotReadiness>(
        `workspaces/${clientId}/autopilot/readiness`,
      ),
    enabled: Boolean(clientId),
  });
}

export function useAutopilotActivity(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.autopilotActivity(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ activity: AutopilotActivityItem[] }>(
        `workspaces/${clientId}/autopilot/activity`,
      ).then((r) => r.activity),
    enabled: Boolean(clientId),
  });
}

export function useAutopilotStatus(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.autopilotStatus(clientId ?? ''),
    queryFn: () =>
      apiFetch<{
        enabled: boolean;
        mode: AutopilotMode;
        maxDraftsPerWeek: number;
        draftsThisWeek: number;
        lastActionAt: string | null;
        lastActionType: string | null;
        lastActionChannel: string | null;
        coverageGaps: string[];
      }>(`workspaces/${clientId}/autopilot/status`),
    enabled: Boolean(clientId),
  });
}

// ── Autopilot Campaign Recommendations ─────────────────────────────────

// Phase 5 — Autopilot run history. Each row is one evaluator
// pass (manual, scheduled, or internal evaluate-all). reason
// explains WHY Autopilot did nothing on a given tick.
// Spinstr04 — detector summary returned per run for the
// explainability surface. All fields are optional so older runs
// without summary metadata still parse.
export interface AutopilotRunSummary {
  eligibleListings?: number;
  duplicatesSuppressed?: number;
  listingsCappedByRunLimit?: number;
  openHouseCandidates?: number;
  openHouseEmitted?: number;
  reviewsConsidered?: number;
  reviewsEmitted?: number;
  inactivityEmitted?: boolean;
  noActionReason?: string | null;
}

export interface AutopilotRunAutoGenerate {
  draftsCreated?: number;
  recommendationsGenerated?: number;
  skipped?: Array<{ recommendationId: string; reason: string }>;
}

export interface AutopilotRunMetadata {
  summary?: AutopilotRunSummary;
  autoGenerate?: AutopilotRunAutoGenerate;
  schedulerTickId?: string;
}

export interface AutopilotRun {
  id: string;
  triggerSource: 'manual' | 'scheduled' | 'event';
  status:
    | 'created_recommendations'
    | 'updated_recommendations'
    | 'no_action'
    | 'skipped'
    | 'error';
  reason: string | null;
  recommendationsCreated: number;
  recommendationsUpdated: number;
  recommendationsExpired: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  metadata: AutopilotRunMetadata | null;
}

export interface AutopilotRunsResponse {
  runs: AutopilotRun[];
  total: number;
}

export function useAutopilotRuns(clientId: string | undefined) {
  return useQuery({
    queryKey: [...squadpitchKeys.all, 'autopilot-runs', clientId ?? ''],
    queryFn: () =>
      apiFetch<AutopilotRunsResponse>(`workspaces/${clientId}/autopilot/runs`),
    enabled: Boolean(clientId),
    staleTime: 30_000,
  });
}

// Both Campaign Inbox readers gate on the feature flag — the
// backend routes don't exist yet (Phase 2 of the audit doc will
// land them). Until the flag flips, the queries never fire and
// the UI renders an empty / coming-soon state instead.
export function useAutopilotCampaignRecommendations(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.autopilotCampaigns(clientId ?? ''),
    queryFn: () =>
      apiFetch<AutopilotCampaignRecommendationsResponse>(
        `workspaces/${clientId}/autopilot/campaign-recommendations`,
      ),
    enabled: Boolean(clientId) && isAutopilotCampaignInboxEnabled(),
    refetchInterval: 60_000,
  });
}

export function useAutopilotCampaignStats(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.autopilotCampaignStats(clientId ?? ''),
    queryFn: () =>
      apiFetch<AutopilotCampaignStatsResponse>(
        `workspaces/${clientId}/autopilot/campaign-stats`,
      ),
    enabled: Boolean(clientId) && isAutopilotCampaignInboxEnabled(),
  });
}

// Phase 3 — the generate endpoint returns a fan-out result, not
// the recommendation alone. Surface drafts + skipped reasons so
// the UI can render both ("Generated 2 drafts; Instagram skipped:
// no image").
export interface AutopilotGenerateResult {
  status: 'success' | 'partial_success' | 'noop' | 'failed';
  drafts: Array<{ id: string; channel: string; status: string; templateType?: string }>;
  skipped: Array<{ channel: string; reason: string }>;
  recommendation: AutopilotCampaignRecommendation | null;
  recommendationId: string;
  alreadyGenerated?: boolean;
  reason?: string;
}

export function useGenerateAutopilotCampaign(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recommendationId: string) =>
      apiFetch<AutopilotGenerateResult>(
        `workspaces/${clientId}/autopilot/campaign-recommendations/${recommendationId}/generate`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotCampaigns(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotCampaignStats(clientId) });
    },
  });
}

// Phase 4 — approve result. Each child draft's outcome is
// returned so the UI can show "3 drafts approved" or "2 of 3
// approved — 1 was already published".
export interface AutopilotApproveResult {
  status: 'success' | 'partial_success' | 'noop';
  drafts: Array<{
    draftId: string;
    channel: string;
    status: string;
    scheduled: boolean;
    skipped: boolean;
    error?: string;
  }>;
  scheduledAt: string | null;
  recommendation: AutopilotCampaignRecommendation | null;
  recommendationId: string;
}

export function useApproveAutopilotCampaign(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { recommendationId: string; scheduleAt?: string | null }) =>
      apiFetch<AutopilotApproveResult>(
        `workspaces/${clientId}/autopilot/campaign-recommendations/${input.recommendationId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ scheduleAt: input.scheduleAt ?? null }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotCampaigns(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotCampaignStats(clientId) });
      qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'drafts'] });
    },
  });
}

export function useDismissAutopilotCampaign(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { recommendationId: string; reason?: string }) =>
      apiFetch<{ success: boolean }>(
        `workspaces/${clientId}/autopilot/campaign-recommendations/${input.recommendationId}/dismiss`,
        { method: 'POST', body: JSON.stringify({ reason: input.reason }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotCampaigns(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotCampaignStats(clientId) });
    },
  });
}

export function useConvertAutopilotCampaign(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recommendationId: string) =>
      apiFetch<{ success: boolean }>(
        `workspaces/${clientId}/autopilot/campaign-recommendations/${recommendationId}/convert`,
        { method: 'POST' },
      ).catch(() => ({ success: false })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotCampaigns(clientId) });
      qc.invalidateQueries({ queryKey: squadpitchKeys.autopilotCampaignStats(clientId) });
    },
  });
}

// ── Content Preferences ──────────────────────────────────────────────────

export type PreferredTone =
  | 'professional'
  | 'casual'
  | 'witty'
  | 'inspirational'
  | 'urgent'
  | 'luxury'
  | 'friendly'
  | 'educational';
export type PreferredCtaStyle = 'direct' | 'soft' | 'question' | 'urgency' | 'none';
export type PreferredCadence = 'aggressive' | 'balanced' | 'luxury';
export type MediaOrderPreference = 'exterior_first' | 'hero_first' | 'ai_recommended' | 'manual';

// Plan 07 — additional defaults.
export type DefaultContentMode = 'campaign' | 'single_post';
export type DefaultSource = 'property' | 'data_item' | 'idea';
export type ContentGoal = 'growth' | 'engagement' | 'sales';
export type DefaultCtaPreference =
  | 'dm_me'
  | 'schedule_consult'
  | 'visit_website'
  | 'call_now'
  | 'custom';
export type PostingDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DefaultCampaignLength = 3 | 5 | 7;

export interface ContentPreferences {
  clientId: string;

  // Channel defaults
  preferredChannels: Channel[];
  defaultQuickPostChannel: Channel | null;

  // Voice/tone
  preferredTone: PreferredTone | null;
  preferredCtaStyle: PreferredCtaStyle | null;

  // Campaign defaults
  preferredCampaignCadence: PreferredCadence | null;
  defaultCampaignType: string | null;

  // Media
  mediaOrderPreference: MediaOrderPreference | null;

  // Workflow
  alwaysRequireReview: boolean;
  autoGenerateMedia: boolean;

  // Content bucket default
  defaultContentBucket: string | null;

  // ── Plan 07 — Create Preferences additions
  defaultContentMode: DefaultContentMode | null;
  defaultSource: DefaultSource | null;
  preferredContentGoals: ContentGoal[];
  defaultCtaPreference: DefaultCtaPreference | null;
  defaultCtaCustom: string | null;

  // ── Plan 07 — Scheduling Defaults
  defaultCampaignLength: DefaultCampaignLength | null;
  preferredPostingDays: PostingDay[];
  /** "HH:mm" — interpreted in Client.timezone. */
  preferredPostingTime: string | null;

  updatedAt: string;
}

export function useContentPreferences(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.contentPreferences(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ preferences: ContentPreferences }>(
        `workspaces/${clientId}/content-preferences`,
      ).then((r) => r.preferences),
    enabled: !!clientId,
  });
}

export function useUpdateContentPreferences(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Omit<ContentPreferences, 'clientId' | 'updatedAt'>>) =>
      apiFetch<{ preferences: ContentPreferences }>(
        `workspaces/${clientId}/content-preferences`,
        { method: 'PUT', body: JSON.stringify(body) },
      ).then((r) => r.preferences),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.contentPreferences(clientId) });
    },
  });
}

// ── Listing Feed ─────────────────────────────────────────────────────────

export function useRefreshListingFeed(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: { sourceUrl?: string }) =>
      apiFetch<{ listings: number; lastSyncedAt: string; autopilotTriggered: boolean }>(
        `workspaces/${clientId}/tech-stack/listing_feed/refresh`,
        { method: 'POST', body: JSON.stringify(body ?? {}) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
      qc.invalidateQueries({ queryKey: ['workspace-tech-stack', clientId] });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dashboardRecommendations(clientId) });
    },
  });
}

// ── Dashboard ───────────────────────────────────────────────────────────

export interface DashboardRecommendation {
  id: string;
  title: string;
  description: string;
  // Legacy fields (backward compat)
  reason?: string;
  action: string;
  actionLabel: string;
  priority: number;
  category: string;
  metadata?: { guidance?: string; templateType?: string; dataItemId?: string; channel?: string; recommendationId?: string; campaignType?: string; listingDataItemId?: string };
  // Unified engine fields
  type?: string;
  sourceType?: string;
  sourceId?: string | null;
  sourceLabel?: string;
  priorityScore?: number;
  confidence?: 'high' | 'medium' | 'low';
  freshness?: 'fresh' | 'recent' | 'stale';
  reasons?: string[];
  actionPayload?: {
    action?: string;
    guidance?: string;
    templateType?: string;
    dataItemId?: string;
    channel?: string;
    campaignType?: string;
    listingDataItemId?: string;
    route?: string;
  };
  suggestedCampaignType?: string | null;
  hasCampaign?: boolean;
  campaignCount?: number;
}

export interface DashboardRecommendationsResponse {
  recommendations: DashboardRecommendation[];
  summary: {
    totalDataItems: number;
    unusedDataCount: number;
    enabledChannels: number;
    recentPublished: number;
    dataByType: Partial<Record<string, number>>;
    publishedThisWeek: number;
    scheduledUpcoming: number;
    lastAutopilotAt: string | null;
    lastGeneratedAt: string | null;
    daysSinceLastGeneration: number | null;
    topUnusedItems?: Array<{
      id: string;
      type: string;
      title: string;
      summary?: string;
      address?: string;
      quote?: string;
      author?: string;
      achievement?: string;
    }>;
    realEstate?: {
      listingCount: number;
      reviewCount: number;
      milestoneCount: number;
      listingFeedConnected: boolean;
      websiteConnected: boolean;
      availableChannels: string[];
    };
    autopilot?: {
      enabled: boolean;
      mode: string;
      maxDraftsPerWeek: number;
      draftsThisWeek: number;
      lastActionAt: string | null;
      lastActionType: string | null;
      lastActionChannel: string | null;
      lastRunMode: string | null;
      coverageGaps: string[];
    };
  };
}

export interface DashboardActionItem {
  id: string;
  body: string;
  channel: string;
  kind: string;
}

export interface DashboardAction {
  id: string;
  type: string;
  title: string;
  description: string;
  actionLabel: string;
  actionRoute: string;
  priority: number;
  count: number;
  items: DashboardActionItem[];
}

export interface DashboardActionsResponse {
  actions: DashboardAction[];
}

export function useDashboardRecommendations(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.dashboardRecommendations(clientId ?? ''),
    queryFn: () =>
      apiFetch<DashboardRecommendationsResponse>(
        `workspaces/${clientId}/dashboard/recommendations`,
      ),
    enabled: Boolean(clientId),
    staleTime: 5 * 60_000,            // 5 min — triggers recommendation engine + property loads
    refetchOnWindowFocus: false,
  });
}

export function useDashboardActions(clientId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.dashboardActions(clientId ?? ''),
    queryFn: () =>
      apiFetch<DashboardActionsResponse>(
        `workspaces/${clientId}/dashboard/actions`,
      ),
    enabled: Boolean(clientId),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

// ── Unified Recommendations (Shared Intelligence Layer) ─────────────────

export type RecommendationSurface = 'dashboard' | 'create_content' | 'listing_campaign' | 'planner';

export interface RecommendationActionPayload {
  action: string;
  guidance?: string;
  templateType?: string;
  dataItemId?: string;
  channel?: string;
  campaignType?: string;
  listingDataItemId?: string;
  sourceType?: string;
  sourceId?: string;
  status?: string;
  route?: string;
}

export interface UnifiedRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  sourceType: string;
  sourceId: string | null;
  sourceLabel: string;
  priorityScore: number;
  confidence: 'high' | 'medium' | 'low';
  freshness: 'fresh' | 'recent' | 'stale';
  surfaces: RecommendationSurface[];
  suggestedContentType: string | null;
  suggestedCampaignType: string | null;
  suggestedChannel: string | null;
  actionLabel: string;
  actionPayload: RecommendationActionPayload;
  reasons: string[];
  hasCampaign?: boolean;
  campaignCount?: number;
  lastCampaignAt?: string | null;
  evaluatedAt: string;
}

export interface RecommendationsResponse {
  recommendations: UnifiedRecommendation[];
  summary: DashboardRecommendationsResponse['summary'];
}

export function useRecommendations(clientId: string | undefined, surface?: RecommendationSurface) {
  const qs = surface ? `?surface=${surface}` : '';
  return useQuery({
    queryKey: [...squadpitchKeys.all, 'recommendations', clientId, surface ?? 'all'],
    queryFn: () =>
      apiFetch<RecommendationsResponse>(
        `workspaces/${clientId}/recommendations${qs}`,
      ),
    enabled: Boolean(clientId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fire-and-forget mutation to track that a recommendation was acted on.
 * Helps the engine avoid showing the same recommendations repeatedly.
 */
export function useAcceptRecommendation(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recId: string) =>
      apiFetch<{ ok: boolean }>(
        `workspaces/${clientId}/recommendations/${recId}/accept`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      if (clientId) {
        qc.invalidateQueries({ queryKey: squadpitchKeys.dashboardRecommendations(clientId) });
        qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'recommendations', clientId] });
      }
    },
  });
}

export function useDismissRecommendation(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recId, reason }: { recId: string; reason?: string }) =>
      apiFetch<{ ok: boolean }>(
        `workspaces/${clientId}/recommendations/${recId}/dismiss`,
        { method: 'POST', body: JSON.stringify({ reason }) },
      ),
    onSuccess: () => {
      if (clientId) {
        qc.invalidateQueries({ queryKey: squadpitchKeys.dashboardRecommendations(clientId) });
        qc.invalidateQueries({ queryKey: [...squadpitchKeys.all, 'recommendations', clientId] });
      }
    },
  });
}

// ── Agent Profile Draft (RE onboarding) ─────────────────────────────────

export interface AgentProfileDraft {
  sourceType: 'website' | 'zillow_profile' | 'license_lookup' | 'crm_import' | 'documents' | 'manual';
  agentName?: string;
  brokerageName?: string;
  teamName?: string;
  bio?: string;
  specialties?: string[];
  serviceAreas?: string[];
  primaryCity?: string;
  primaryState?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseStatus?: string;
  websiteUrl?: string;
  zillowProfileUrl?: string;
  socialLinks?: { instagram?: string; facebook?: string; linkedin?: string; youtube?: string };
  exampleListings?: Array<{ address?: string; city?: string; state?: string; price?: number }>;
  inferredAudience?: string[];
  inferredPriceBands?: string[];
  notes?: string[];
  confidence?: Record<string, number>;
  _mergedSources?: Record<string, string>;
}

// ── Onboarding ──────────────────────────────────────────────────────────

export type OnboardingAnalyzeInput = {
  input: string;
  inputType: 'url' | 'text';
  documentTexts?: string[];
  agentProfileDraft?: AgentProfileDraft;
};

export interface OnboardingBrandData {
  name: string;
  description: string;
  industry: string;
  audience: string;
  offers: string;
  competitors: string;
  website?: string;
  logoUrl?: string;
}

export interface OnboardingVoiceData {
  tone: string;
  doRules: string[];
  dontRules: string[];
  contentBuckets: ContentBucket[];
}

export interface OnboardingDataItem {
  type: string;
  title: string;
  summary: string;
  dataJson: Record<string, unknown>;
  tags: string[];
  priority: number;
  /** Real database ID, set after data-import/confirm saves the item */
  savedId?: string;
}

export interface OnboardingAnalyzeResult {
  brandData: OnboardingBrandData;
  voiceData: OnboardingVoiceData;
  suggestedGoal: string;
  suggestedChannels: Channel[];
  images: string[];
  dataItems: OnboardingDataItem[];
  starterAngles?: string[];
  coreTemplates?: { type: string; title: string; guidance: string; conditions?: { hasData?: boolean; requiredDataType?: string; noPublished?: boolean } }[];
}

export interface IndustryOnboarding {
  websitePlaceholder: string;
  extraContextLabel: string;
  extraContextPlaceholder: string;
  helperText: string;
}

export type TechStackCategory =
  | 'data_source'
  | 'crm'
  | 'publishing'
  | 'analytics'
  | 'website'
  | 'operations'
  | 'documents'
  | 'compliance';

export type IntegrationCapability =
  | 'imports'
  | 'content_source'
  | 'publishing'
  | 'analytics_source'
  | 'lead_sync'
  | 'client_sync'
  | 'document_source'
  | 'data_enrichment'
  | 'workflow_trigger'
  | 'scheduling_target'
  | 'reporting_source'
  | 'compliance_context';

export type ConnectionMode = 'oauth' | 'manual' | 'managed' | 'planned';

export interface ManualSetupField {
  key: string;
  label: string;
  type: 'url' | 'text' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface ManualSetupConfig {
  fields: ManualSetupField[];
}

export interface IndustryTechStackItem {
  providerKey: string;
  label: string;
  category: TechStackCategory;
  priority: 'core' | 'recommended' | 'optional';
  status: 'live' | 'beta' | 'planned';
  connectionMode?: ConnectionMode;
  description?: string;
  useCases?: string[];
  capabilities: IntegrationCapability[];
  manualSetup?: ManualSetupConfig;
  channelRef?: string;
}

export interface IndustryTerminology {
  item: string;
  items: string;
  customer: string;
  customers?: string;
  service?: string;
  services?: string;
  offer?: string;
  offers?: string;
  contentUnit: string;
  contentUnits?: string;
  campaign?: string;
  campaigns?: string;
  primaryAction?: string;
}

export interface IndustryOnboardingSteps {
  explore: string;
  understand: string;
  insights: string;
  prepare: string;
  generate: string;
}

export interface IndustryBusinessDataLabels {
  itemSingular?: string;
  itemPlural?: string;
  launchLabel?: string;
  categoryLabel?: string;
  collectionLabel?: string;
  serviceLabel?: string;
  offerLabel?: string;
}

export interface IndustryContentTypeLabel {
  key: string;
  label: string;
}

export type IndustryStatus = 'active' | 'coming_soon';

export interface IndustryProfile {
  key: string;
  label: string;
  description: string;
  // spinstr421 — present on every profile returned by the server.
  // Older callers that don't read these can ignore them; the
  // onboarding grid uses them to render coming-soon cards.
  status?: IndustryStatus;
  isComplianceSensitive?: boolean;
  onboarding: IndustryOnboarding;
  content: {
    starterBlueprintSlugs: string[];
    starterChannels: string[];
    channelRecommendations: {
      primary: string[];
      secondary: string[];
      optional: string[];
    } | null;
  };
  integrations: {
    supportedCapabilities: string[];
    recommendedProviders: string[];
    starterAutomations: string[];
  };
  terminology: IndustryTerminology | null;
  onboardingSteps: IndustryOnboardingSteps | null;
  businessDataLabels: IndustryBusinessDataLabels | null;
  contentTypeLabels: IndustryContentTypeLabel[] | null;
  ui: { icon: string };
  techStack: IndustryTechStackItem[];
  onboardingSources?: Array<{
    key: string;
    label: string;
    icon: string;
    default?: boolean;
    comingSoon?: boolean;
  }>;
}

export function useIndustries() {
  return useQuery({
    queryKey: ['industries'],
    queryFn: () =>
      apiFetch<{ industries: IndustryProfile[] }>('industries').then(
        (r) => r.industries,
      ),
    staleTime: Infinity,
  });
}

// ── Business Data Labels ──────────────────────────────────────────────

const DEFAULT_BD_LABELS: Required<IndustryBusinessDataLabels> = {
  itemSingular: 'Item',
  itemPlural: 'Items',
  launchLabel: 'New Item',
  categoryLabel: 'Category',
  collectionLabel: 'Collection',
  serviceLabel: 'Service',
  offerLabel: 'Offer',
};

export type ResolvedBusinessDataLabels = Required<IndustryBusinessDataLabels>;

/** Merge industry-specific labels with defaults. */
export function resolveBusinessDataLabels(
  labels: IndustryBusinessDataLabels | null | undefined,
): ResolvedBusinessDataLabels {
  if (!labels) return { ...DEFAULT_BD_LABELS };
  return { ...DEFAULT_BD_LABELS, ...labels };
}

/** Hook that resolves business-data labels for a workspace's industry. */
export function useBusinessDataLabels(clientId: string | undefined): ResolvedBusinessDataLabels {
  const { data: client } = useClient(clientId);
  const { data: industries } = useIndustries();

  const key = client?.industryKey;
  const profile = key && industries ? industries.find((p) => p.key === key) : undefined;
  return resolveBusinessDataLabels(profile?.businessDataLabels);
}

// ── Tech Stack View ───────────────────────────────────────────────────

export type TechStackGroup = 'importData' | 'publishContent' | 'enhanceWorkflow';
export type ConnectionStatus = 'not_connected' | 'connected' | 'pending' | 'error';

/** Item returned from the workspace tech stack merged view API. */
export interface WorkspaceTechStackItem {
  providerKey: string;
  label: string;
  description?: string;
  priority: 'core' | 'recommended' | 'optional';
  status: 'live' | 'beta' | 'planned';
  category: string;
  capabilities: IntegrationCapability[];
  connectionMode: ConnectionMode;
  manualSetup?: ManualSetupConfig;
  managedIn?: string;
  channelRef?: string;
  connectionStatus: ConnectionStatus;
  metadataJson: Record<string, unknown> | null;
  isPublishing: boolean;
  isImportSource: boolean;
  isWorkflowTool: boolean;
}

export interface TechStackViewItem extends WorkspaceTechStackItem {
  group: TechStackGroup;
  statusBadge: 'Coming Soon' | 'Connected' | 'Connect' | 'Add Data' | 'Manage';
}

export interface GroupedTechStack {
  importData: TechStackViewItem[];
  publishContent: TechStackViewItem[];
  enhanceWorkflow: TechStackViewItem[];
  totalCount: number;
  activeCount: number;
}

const PRIORITY_ORDER: Record<string, number> = { core: 0, recommended: 1, optional: 2 };

function resolveTechStackGroup(capabilities: IntegrationCapability[]): TechStackGroup {
  if (capabilities.includes('publishing') || capabilities.includes('scheduling_target')) {
    return 'publishContent';
  }
  if (capabilities.includes('imports') || capabilities.includes('content_source')) {
    return 'importData';
  }
  return 'enhanceWorkflow';
}

function resolveStatusBadge(item: WorkspaceTechStackItem): TechStackViewItem['statusBadge'] {
  // Rule 0: managed items always show "Manage" (they have their own UI)
  if (item.connectionMode === 'managed') return item.connectionStatus === 'connected' ? 'Manage' : 'Manage';
  // Rule 1: planned items are always "Coming Soon" (unless already connected)
  if (item.status === 'planned' && item.connectionStatus !== 'connected') return 'Coming Soon';
  // Rule 2: already connected
  if (item.connectionStatus === 'connected') return 'Connected';
  // Rule 3: oauth items not yet connected
  if (item.connectionMode === 'oauth') return 'Connect';
  // Rule 4: manual items not yet connected
  if (item.connectionMode === 'manual') return 'Add Data';
  return 'Coming Soon';
}

function sortByPriority(a: TechStackViewItem, b: TechStackViewItem): number {
  const pa = PRIORITY_ORDER[a.priority] ?? 2;
  const pb = PRIORITY_ORDER[b.priority] ?? 2;
  if (pa !== pb) return pa - pb;
  return a.label.localeCompare(b.label);
}

/** Fetch the merged workspace tech stack view from the API. */
export function useWorkspaceTechStack(clientId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-tech-stack', clientId],
    queryFn: () =>
      apiFetch<{ techStack: WorkspaceTechStackItem[] }>(
        `workspaces/${clientId}/tech-stack`,
      ).then((r) => r.techStack),
    enabled: !!clientId,
  });
}

/** Hook that returns grouped & sorted tech stack items for a workspace. */
export function useTechStack(clientId: string | undefined): GroupedTechStack | null {
  const { data: items } = useWorkspaceTechStack(clientId);

  if (!items || items.length === 0) return null;

  const viewItems: TechStackViewItem[] = items.map((item) => ({
    ...item,
    group: resolveTechStackGroup(item.capabilities),
    statusBadge: resolveStatusBadge(item),
  }));

  return {
    importData: viewItems.filter((i) => i.group === 'importData').sort(sortByPriority),
    publishContent: viewItems.filter((i) => i.group === 'publishContent').sort(sortByPriority),
    enhanceWorkflow: viewItems.filter((i) => i.group === 'enhanceWorkflow').sort(sortByPriority),
    totalCount: viewItems.length,
    activeCount: viewItems.filter((i) => i.connectionStatus === 'connected').length,
  };
}

/** Save metadata for a manual tech stack item and mark it as connected. */
export function useSaveManualConnection(clientId: string, providerKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (metadata: Record<string, string>) =>
      apiFetch(`workspaces/${clientId}/tech-stack/${providerKey}`, {
        method: 'PUT',
        body: JSON.stringify({ metadata }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-tech-stack', clientId] });
    },
  });
}

// ── Sync / Refresh ──────────────────────────────────────────────────────

const SYNC_ENDPOINTS: Record<string, string> = {
  listing_feed: 'tech-stack/listing_feed/refresh',
  real_estate_crm: 'integrations/crm/sync',
  google_business_profile: 'integrations/gbp/sync',
  idx_website: 'tech-stack/idx_website/refresh',
};

export function isSyncable(providerKey: string): boolean {
  return providerKey in SYNC_ENDPOINTS;
}

export function useSyncIntegration(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (providerKey: string) => {
      const endpoint = SYNC_ENDPOINTS[providerKey];
      if (!endpoint) throw new Error(`No sync endpoint for ${providerKey}`);
      return apiFetch(`workspaces/${clientId}/${endpoint}`, { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-tech-stack', clientId] });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export interface UploadDocumentsResult {
  documents: Array<{ filename: string; text: string }>;
}

export function useOnboardingAnalyze() {
  return useMutation({
    mutationFn: (body: OnboardingAnalyzeInput) =>
      apiFetch<OnboardingAnalyzeResult>('onboarding/analyze', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useOnboardingUploadDocuments() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
      const res = await fetch('/api/proxy/onboarding/upload-documents', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Upload failed (${res.status})`);
      }
      return res.json() as Promise<UploadDocumentsResult>;
    },
  });
}

// ── Agent Onboarding Sources (RE) ────────────────────────────────────────

export function useZillowExtract() {
  return useMutation({
    mutationFn: (url: string) =>
      apiFetch<AgentProfileDraft>('onboarding/zillow-extract', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
  });
}

export function useLicenseLookup() {
  return useMutation({
    mutationFn: (params: { state: string; licenseNumber: string }) =>
      apiFetch<AgentProfileDraft>('onboarding/license-lookup', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}

export function useCrmAnalyze() {
  return useMutation({
    mutationFn: (csvText: string) =>
      apiFetch<AgentProfileDraft>('onboarding/crm-analyze', {
        method: 'POST',
        body: JSON.stringify({ csvText }),
      }),
  });
}

// ── Planner Suggestions ─────────────────────────────────────────────────

export function usePlannerSuggestions(clientId: string) {
  return useMutation({
    mutationFn: (body: { weekStart: string; weekEnd: string }) =>
      apiFetch<PlannerSuggestionsResult>(
        `workspaces/${clientId}/planner/suggestions`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
  });
}

export function usePlanMyWeek(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: PlanMyWeekInput) =>
      apiFetch<AutopilotExecuteResult>(
        `workspaces/${clientId}/planner/plan-week`,
        { method: 'POST', body: JSON.stringify(body ?? {}) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.drafts() });
      qc.invalidateQueries({
        queryKey: squadpitchKeys.dashboardRecommendations(clientId),
      });
    },
  });
}

export function useSwapSuggestion(clientId: string) {
  return useMutation({
    mutationFn: (body: SwapSuggestionInput) =>
      apiFetch<SwapSuggestionResult>(
        `workspaces/${clientId}/planner/swap-suggestion`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
  });
}

// ── Listing Ingestion ───────────────────────────────────────────────────────

export interface CanonicalListing {
  title: string | null;
  description: string | null;
  price: number | null;
  status: string;
  address: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize: string | null;
  propertyType: string | null;
  images: string[];
  listingUrl: string | null;
  agentName: string | null;
  brokerage: string | null;
  yearBuilt: number | null;
  garage: number | null;
  features: string[];
  sourceType: string;
  sourceId: string | null;
}

export interface ListingValidation {
  valid: boolean;
  complete: boolean;
  issues: string[];
}

export interface ManualListingInput {
  title?: string;
  description?: string;
  price?: string | number;
  status?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  beds?: string | number;
  baths?: string | number;
  sqft?: string | number;
  lotSize?: string;
  propertyType?: string;
  images?: string | string[];
  imageUrl?: string;
  listingUrl?: string;
  agentName?: string;
  brokerage?: string;
  yearBuilt?: string | number;
  garage?: string | number;
  features?: string | string[];
}

export interface ManualListingResult {
  listing: WorkspaceDataItem;
  created: boolean;
  existingId?: string;
}

export interface ListingCSVPreviewResult {
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  autoMapping: Record<string, string>;
}

export interface ListingCSVImportResult {
  imported: number;
  updated: number;
  skipped: number;
  listings: WorkspaceDataItem[];
}

export interface ExtractionQuality {
  grade: 'good' | 'partial' | 'poor';
  score: number;
  extracted: string[];
  missing: string[];
  message: string;
}

export interface ListingUrlPreviewResult {
  preview: CanonicalListing & { validation: ListingValidation };
  normalized: CanonicalListing;
  quality?: ExtractionQuality;
}

export function useManualListingImport(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ManualListingInput) =>
      apiFetch<ManualListingResult>(
        `workspaces/${clientId}/listings/manual`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useSavePropertyToLibrary(clientId: string) {
  return useManualListingImport(clientId);
}

export function useListingCSVPreview(clientId: string) {
  return useMutation({
    mutationFn: (body: { csvContent: string }) =>
      apiFetch<ListingCSVPreviewResult>(
        `workspaces/${clientId}/listings/csv/preview`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
  });
}

export function useListingCSVImport(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { csvContent: string; columnMapping: Record<string, string> }) =>
      apiFetch<ListingCSVImportResult>(
        `workspaces/${clientId}/listings/csv/import`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useListingUrlImport(clientId: string) {
  return useMutation({
    mutationFn: (body: { url: string }) =>
      apiFetch<ListingUrlPreviewResult>(
        `workspaces/${clientId}/listings/url`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
  });
}

export function useListingUrlConfirm(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ManualListingResult>(
        `workspaces/${clientId}/listings/url/confirm`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

// ── Property Data Lookup ────────────────────────────────────────────────

export interface PropertyLookupResult {
  data: {
    provider: string;
    providerId: string | null;
    formattedAddress: string | null;
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    propertyType: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    sqft: number | null;
    lotSize: number | null;
    yearBuilt: number | null;
    garage: number | null;
    lastSalePrice: number | null;
    lastSaleDate: string | null;
    hoaFee: number | null;
  } | null;
}

export interface RentEstimateResult {
  data: {
    provider: string;
    estimate: number;
    rangeLow: number | null;
    rangeHigh: number | null;
  } | null;
}

export function usePropertyLookup(clientId: string) {
  return useMutation({
    mutationFn: (address: string) =>
      apiFetch<PropertyLookupResult>(
        `workspaces/${clientId}/property-data/lookup?address=${encodeURIComponent(address)}`
      ),
  });
}

export function useRentEstimate(clientId: string) {
  return useMutation({
    mutationFn: (address: string) =>
      apiFetch<RentEstimateResult>(
        `workspaces/${clientId}/property-data/rent-estimate?address=${encodeURIComponent(address)}`
      ),
  });
}

// ── Property Listings Search ────────────────────────────────────────────

export interface UnifiedListing {
  provider: string;
  providerId: string | null;
  formattedAddress: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  propertyType: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  status: string | null;
  daysOnMarket: number | null;
  listedDate: string | null;
  removedDate: string | null;
  agent: string | null;
  office: string | null;
}

export interface PropertyListingsSearchParams {
  city?: string;
  state?: string;
  zipCode?: string;
  address?: string;
  propertyType?: string;
}

export interface PropertyListingsSearchResult {
  data: UnifiedListing[];
}

export function usePropertyListingsSearch(clientId: string) {
  return useMutation({
    mutationFn: (params: PropertyListingsSearchParams) => {
      const qs = new URLSearchParams();
      if (params.address) qs.set('address', params.address);
      if (params.city) qs.set('city', params.city);
      if (params.state) qs.set('state', params.state);
      if (params.zipCode) qs.set('zipCode', params.zipCode);
      if (params.propertyType) qs.set('propertyType', params.propertyType);
      qs.set('limit', '20');
      qs.set('offset', '0');
      return apiFetch<PropertyListingsSearchResult>(
        `workspaces/${clientId}/property-data/listings?${qs.toString()}`
      );
    },
  });
}

/** @deprecated Use `useListingOpportunities` instead. */
export function useNearbyListings(clientId: string, zipCode: string) {
  return useQuery({
    queryKey: squadpitchKeys.nearbyListings(clientId, zipCode),
    queryFn: () =>
      apiFetch<PropertyListingsSearchResult>(
        `workspaces/${clientId}/property-data/listings?zipCode=${encodeURIComponent(zipCode)}&limit=8`
      ),
    enabled: Boolean(clientId && zipCode),
    staleTime: 15 * 60_000,          // 15 min — backend caches 1h, no need to refetch often
    gcTime: 30 * 60_000,             // 30 min — keep in memory across navigations
    refetchOnWindowFocus: false,     // Expensive endpoint — only refetch on explicit action
    select: (data) => data.data,
  });
}

export function useListingOpportunities(
  clientId: string,
  params: { zipCode?: string; city?: string; state?: string },
) {
  const qs = new URLSearchParams();
  if (params.zipCode) qs.set('zipCode', params.zipCode);
  if (params.city) qs.set('city', params.city);
  if (params.state) qs.set('state', params.state);
  qs.set('limit', '20');

  return useQuery({
    queryKey: squadpitchKeys.nearbyListings(clientId, qs.toString()),
    queryFn: () =>
      apiFetch<PropertyListingsSearchResult>(
        `workspaces/${clientId}/property-data/listings?${qs.toString()}`
      ),
    enabled: Boolean(clientId && (params.zipCode || params.city)),
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    select: (data) => data.data,
  });
}

// ── Integration Status (GBP + CRM) ─────────────────────────────────────

export interface GBPConnectionStatus {
  status: string;
  email: string | null;
  locationName: string | null;
  businessName: string | null;
  lastSyncedAt: string | null;
  reviewCount: number;
  averageRating: string | null;
  unrepliedReviewCount: number;
  lastError: string | null;
}

export interface GBPReview {
  id: string;
  reviewer: string;
  rating: number;
  comment: string;
  reviewDate: string | null;
  reply: string | null;
  dataItemId: string;
  extractedThemes: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  useCases: string[];
  locationMentions: string[];
  strongQuotes: string[];
  analyzedAt: string | null;
}

export interface GBPReviewsResponse {
  reviews: GBPReview[];
  total: number;
  unrepliedCount: number;
}

export interface GBPBusinessProfileResponse {
  businessName: string;
  description: string;
  categories: string[];
  address: object | null;
  phone: string | null;
  website: string | null;
  reviewCount: number;
  averageRating: number | null;
  lastSyncedAt: string | null;
}

export interface CRMConnectionStatus {
  status: string;
  provider: string | null;
  userName: string | null;
  lastSyncedAt: string | null;
  dealCount: number;
  contactCount: number;
  lastError: string | null;
}

export interface IntegrationStatusResult {
  gbp: GBPConnectionStatus;
  crm: CRMConnectionStatus;
}

export interface GBPCallbackResult {
  connected: boolean;
  email: string | null;
  accounts: Array<{ name: string; accountName: string; type: string }>;
  locations: Array<{ name: string; title: string; address: unknown }>;
  needsLocationSelection: boolean;
}

export interface GBPSyncResult {
  reviewsImported: number;
  reviewsUpdated: number;
  businessInfo: Record<string, unknown> | null;
}

export interface CRMSyncResult {
  dealsImported: number;
  testimonialsImported: number;
  milestonesImported: number;
  signals: Array<{ type: string; message: string }>;
}

export function useIntegrationStatus(clientId: string) {
  return useQuery({
    queryKey: ['integrationStatus', clientId],
    queryFn: () =>
      apiFetch<IntegrationStatusResult>(
        `workspaces/${clientId}/integrations/status`
      ),
    enabled: Boolean(clientId),
  });
}

export function useGBPConnect(clientId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ authUrl: string }>(
        `workspaces/${clientId}/integrations/gbp/connect`,
        { method: 'POST' }
      ),
  });
}

export function useGBPCallback(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; state: string }) =>
      apiFetch<GBPCallbackResult>(
        `workspaces/${clientId}/integrations/gbp/callback`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrationStatus', clientId] });
    },
  });
}

export function useGBPSetLocation(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { accountId: string; locationId: string; locationName?: string }) =>
      apiFetch<{ ok: boolean }>(
        `workspaces/${clientId}/integrations/gbp/set-location`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrationStatus', clientId] });
    },
  });
}

export function useGBPSync(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<GBPSyncResult>(
        `workspaces/${clientId}/integrations/gbp/sync`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrationStatus', clientId] });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useGBPDisconnect(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>(
        `workspaces/${clientId}/integrations/gbp/disconnect`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrationStatus', clientId] });
    },
  });
}

export function useGBPReviews(clientId: string) {
  return useQuery({
    queryKey: ['gbp-reviews', clientId],
    queryFn: () =>
      apiFetch<GBPReviewsResponse>(
        `workspaces/${clientId}/integrations/gbp/reviews`
      ),
    enabled: !!clientId,
  });
}

export function useGBPBusinessProfile(clientId: string) {
  return useQuery({
    queryKey: ['gbp-profile', clientId],
    queryFn: () =>
      apiFetch<GBPBusinessProfileResponse>(
        `workspaces/${clientId}/integrations/gbp/profile`
      ),
    enabled: !!clientId,
  });
}

export function useGBPReply(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { reviewId: string; replyText: string }) =>
      apiFetch<{ ok: boolean }>(
        `workspaces/${clientId}/integrations/gbp/reply`,
        { method: 'POST', body: JSON.stringify(params) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gbp-reviews', clientId] });
      qc.invalidateQueries({ queryKey: ['integrationStatus', clientId] });
    },
  });
}

export function useGBPPost(clientId: string) {
  return useMutation({
    mutationFn: (params: { summary: string; callToAction?: { actionType?: string; url?: string } }) =>
      apiFetch<{ ok: boolean }>(
        `workspaces/${clientId}/integrations/gbp/post`,
        { method: 'POST', body: JSON.stringify(params) }
      ),
  });
}

export interface GBPReviewInsights {
  topThemes: Array<{ theme: string; count: number }>;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  topUseCases: string[];
  commonLocations: string[];
  analyzedAt: string;
}

export interface GBPAnalyzeResult {
  analyzed: number;
}

export function useGBPInsights(clientId: string) {
  return useQuery({
    queryKey: ['gbp-insights', clientId],
    queryFn: () =>
      apiFetch<GBPReviewInsights>(
        `workspaces/${clientId}/integrations/gbp/insights`
      ),
    enabled: !!clientId,
  });
}

export function useGBPAnalyze(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<GBPAnalyzeResult>(
        `workspaces/${clientId}/integrations/gbp/analyze`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gbp-reviews', clientId] });
      qc.invalidateQueries({ queryKey: ['gbp-insights', clientId] });
    },
  });
}

export function useCRMConnect(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { apiKey: string }) =>
      apiFetch<{ connected: boolean; userName: string | null }>(
        `workspaces/${clientId}/integrations/crm/connect`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrationStatus', clientId] });
    },
  });
}

export function useCRMSync(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<CRMSyncResult>(
        `workspaces/${clientId}/integrations/crm/sync`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrationStatus', clientId] });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useCRMDisconnect(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>(
        `workspaces/${clientId}/integrations/crm/disconnect`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrationStatus', clientId] });
    },
  });
}

// ── Integration Requests ─────────────────────────────────────────────────

export function useRequestIntegration(clientId: string) {
  return useMutation({
    mutationFn: (body: { providerKey: string; providerLabel: string }) =>
      apiFetch<{ requested?: boolean; alreadyRequested?: boolean }>(
        `workspaces/${clientId}/integrations/request`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
  });
}

// ── Listing Campaign ─────────────────────────────────────────────────────

export type CampaignType = 'just_listed' | 'open_house' | 'price_drop' | 'just_sold' | 'listing_spotlight';

export type CampaignAngle = 'promotional' | 'lifestyle' | 'urgency' | 'storytelling' | 'authority' | 'social_proof';

export type CampaignSlotType = 'social_post' | 'email' | 'listing_description';

export interface CampaignPost {
  id?: string;
  slotType?: CampaignSlotType;
  campaignDay: number;
  channel: Channel;
  angle: CampaignAngle;
  label: string;
  body: string;
  bodyAlt?: string;
  hashtags: string[];
  cta: string;
  subject: string;
  imageHint?: string;
  mediaPlan?: MediaPlan;
  hookScore?: number;
  assignedImageIds?: string[];
  personaRecommendation?: PersonaRecommendation;
}

export interface ListingCampaignOutput {
  campaignName: string;
  posts: CampaignPost[];
}

export type SchedulePreset = 7 | 10 | 14;

export interface ListingCampaignResult {
  dataItemId: string | null;
  campaign: ListingCampaignOutput;
}

export interface CampaignImageContext {
  label: string;
  description?: string;
}

export function useGenerateListingCampaign(clientId: string) {
  return useMutation({
    mutationFn: (payload: {
      propertyData: Record<string, unknown>;
      // The frontend's campaign source picker emits this so the
      // backend can branch its prompt (property vs content asset vs
      // freeform idea). Defaults server-side to 'property' for
      // legacy clients that don't send it.
      sourceType?: 'property' | 'data_item' | 'idea';
      campaignType?: CampaignType;
      dataItemId?: string;
      imageContext?: CampaignImageContext[];
      slots?: Array<{ label: string; channel: string; campaignDay: number; slotType?: string; angle?: string }>;
      preferencesContext?: string;
    }) =>
      apiFetch<ListingCampaignResult>(
        `workspaces/${clientId}/listing-campaign/generate`,
        { method: 'POST', body: JSON.stringify(payload) }
      ),
  });
}

export function useRegeneratePost(clientId: string) {
  return useMutation({
    mutationFn: (payload: {
      // For non-property sources the caller still passes a
      // propertyData-shaped object (synthesized from the data
      // item or idea — same contract as the save-drafts hook)
      // so backend validation passes; sourceType tells the
      // prompt builder how to frame the context.
      propertyData: Record<string, unknown>;
      campaignType?: CampaignType;
      slot: { channel: string; day: number; label: string; angle?: string };
      campaignSummary?: string[];
      imageContext?: CampaignImageContext[];
      // Source attribution. Backend defaults to 'property' when
      // omitted so legacy callers keep working.
      sourceType?: 'property' | 'data_item' | 'idea';
      sourceTitle?: string | null;
      sourceDataItemType?: string | null;
      /** Raw idea text when sourceType=idea (propertyData carries it server-side too). */
      campaignIdea?: string | null;
    }) =>
      apiFetch<{ post: CampaignPost }>(
        `workspaces/${clientId}/listing-campaign/regenerate-post`,
        { method: 'POST', body: JSON.stringify(payload) }
      ),
  });
}

export type ImageRegionLabel =
  | 'exterior' | 'kitchen' | 'living_room' | 'bedroom'
  | 'bathroom' | 'backyard' | 'dining_room'
  | 'garage' | 'pool' | 'office' | 'laundry'
  | 'floorplan' | 'aerial' | 'neighborhood' | 'detail'
  | 'other';

export type ImageLayoutRole = 'hero' | 'gallery' | 'thumbnail' | 'other';

export type ImageSourcePass = 'first_pass' | 'second_pass' | 'split_child' | 'manual' | 'replicate_sam2';

/** Where a particular candidate came from. spinstr100/101 */
export type ImageSource = 'hero' | 'gallery_tile' | 'manual_crop' | 'split_child';

/** Which backend extractor produced this result. spinstr101 */
export type ExtractionSource = 'replicate_sam2' | 'unknown';

export interface ExtractedImageRegion {
  id: string;
  label: ImageRegionLabel;
  description: string;
  layoutRole: ImageLayoutRole;
  photoConfidence: number;
  hasText: boolean;
  quality: 'bright' | 'dim' | 'unclear';
  bbox: { x: number; y: number; w: number; h: number };
  /** Which AI pass (or split step) this region came from. spinstr99/100 */
  sourcePass?: ImageSourcePass;
  /** spinstr100 — gallery-first source tag. */
  source?: ImageSource;
  /** When a region came from client-side cluster splitting, this links back to the parent. */
  parentRegionId?: string | null;
}

export interface ExtractedGalleryContainer {
  bbox: { x: number; y: number; w: number; h: number };
  confidence: number;
  reason: string;
  sourcePass?: ImageSourcePass;
}

export interface ImageExtractionResult {
  extracted: Record<string, unknown>;
  confidence: 'full' | 'partial';
  galleryContainer: ExtractedGalleryContainer | null;
  heroImage: ExtractedImageRegion | null;
  galleryImages: ExtractedImageRegion[];
  /** Flat convenience list = hero (if any) followed by gallery tiles. */
  imageRegions: ExtractedImageRegion[];
  /** spinstr101 — backend extractor identifier. 'replicate_sam2' is current. */
  extractionSource?: ExtractionSource;
  detectedCount?: number;
  didSecondPass?: boolean;
  suspicionReason?: string | null;
  debug?: {
    containerFound?: boolean;
    hero?: boolean;
    galleryTileCount?: number;
    extractionSource?: ExtractionSource;
    segmentation?: {
      modelRef?: string;
      totalMasks?: number;
      afterDecode?: number;
      afterFilter?: number;
      afterDedupe?: number;
      rejectedCount?: number;
      scoredCount?: number;
      selectedCount?: number;
      heroFound?: boolean;
      galleryCount?: number;
      tookMs?: number;
      reason?: string;
      srcW?: number;
      srcH?: number;
      // spinstr102 — per-candidate scoring for the debug overlay.
      candidates?: Array<{
        id: string;
        bbox: { x: number; y: number; w: number; h: number };
        score: number;
        reasons?: Record<string, number>;
        stats?: { stdev: number; entropy: number; colorRange: number; domLum: number } | null;
        selected?: boolean;
      }>;
      rejected?: Array<{
        id: string;
        bbox: { x: number; y: number; w: number; h: number };
        rejectReason: string;
        stats?: { stdev: number; entropy: number; colorRange: number; domLum: number } | null;
      }>;
    } | null;
    textExtract?: {
      skipped?: boolean;
      error?: string | null;
      model?: string | null;
      usage?: { prompt_tokens: number; completion_tokens: number } | null;
    };
    rejected?: Array<{ reason: string; role?: string; pass?: string }>;
    suspicionReason?: string | null;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
}

export function useExtractListingImage(clientId: string) {
  return useMutation({
    mutationFn: ({ image, debug }: { image: string; debug?: boolean }) => {
      const params = new URLSearchParams();
      if (debug) params.set('debug', '1');
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<ImageExtractionResult>(
        `workspaces/${clientId}/listing-campaign/extract-image${query}`,
        { method: 'POST', body: JSON.stringify({ image }) }
      );
    },
  });
}

export interface UploadedCampaignAsset {
  id: string;
  url: string;
  label: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  isEnhanced?: boolean;
  qualityScore?: number | null;
  qualityLabel?: 'good' | 'fair' | 'low' | null;
}

export function useUploadCampaignImages(clientId: string) {
  return useMutation({
    mutationFn: (body: {
      images: Array<{
        dataUrl: string;
        label?: string;
        caption?: string;
        // Screenshot enhancement metadata (spinstr97)
        isEnhanced?: boolean;
        qualityScore?: number;
        qualityLabel?: 'good' | 'fair' | 'low';
      }>;
      folderId?: string;
    }) =>
      apiFetch<{ assets: UploadedCampaignAsset[] }>(
        `workspaces/${clientId}/listing-campaign/upload-images`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
  });
}

export interface SaveCampaignDraftsResult {
  drafts: Draft[];
  campaignId: string;
  campaignName: string;
  attachedAssetCount?: number;
}

export function useSaveCampaignDrafts(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      campaign: ListingCampaignOutput;
      propertyData: Record<string, unknown>;
      campaignType?: CampaignType;
      dataItemId?: string | null;
      schedulePreset?: SchedulePreset;
      addToPlanner?: boolean;
      mediaAssetIds?: string[];
      // ISO date (YYYY-MM-DD) the user confirmed in the schedule
      // review step. When omitted, backend defaults to "today" so
      // legacy callers keep working.
      startDate?: string | null;
      // Per-post slot overrides. Used by the backend to spread
      // posts based on the user's actual chosen channel-day pairs
      // rather than evenly across a fixed preset window.
      slots?: Array<{
        channel: string;
        campaignDay: number;
        label?: string;
        slotType?: string;
        angle?: string;
      }>;
      // Source attribution. Lets the backend pick a source-aware
      // campaign name + persist source metadata so Planner /
      // Dashboard can display "Source: Content Asset", etc.
      sourceType?: 'property' | 'data_item' | 'idea';
      sourceTitle?: string | null;
      sourceDataItemType?: string | null;
      /** Raw idea text when sourceType=idea (used for campaign naming) */
      campaignIdea?: string | null;
    }) =>
      apiFetch<SaveCampaignDraftsResult>(
        `workspaces/${clientId}/listing-campaign/save-drafts`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.drafts() });
    },
  });
}

// ── Listing Feeds (multi-source) ────────────────────────────────────────

export interface ListingSource {
  id: string;
  name: string;
  type: 'URL' | 'CSV' | 'MANUAL';
  sourceUrl: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  lastError: string | null;
  isEnabled: boolean;
  listingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListingFeedStats {
  sourceCount: number;
  totalListings: number;
  lastSyncedAt: string | null;
}

export function useListingSources(clientId: string) {
  return useQuery({
    queryKey: ['listingSources', clientId],
    queryFn: () =>
      apiFetch<{ sources: ListingSource[]; stats: ListingFeedStats }>(
        `workspaces/${clientId}/listing-feeds`
      ),
    enabled: !!clientId,
  });
}

export function useCreateListingSource(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; type: 'URL' | 'CSV' | 'MANUAL'; sourceUrl?: string }) =>
      apiFetch<ListingSource>(
        `workspaces/${clientId}/listing-feeds`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listingSources', clientId] });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useUpdateListingSource(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, ...body }: { sourceId: string; name?: string; sourceUrl?: string; isEnabled?: boolean }) =>
      apiFetch<ListingSource>(
        `workspaces/${clientId}/listing-feeds/${sourceId}`,
        { method: 'PATCH', body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listingSources', clientId] });
    },
  });
}

export function useSyncListingSource(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) =>
      apiFetch<{ listingsFound: number; lastSyncedAt: string }>(
        `workspaces/${clientId}/listing-feeds/${sourceId}/sync`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listingSources', clientId] });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useRemoveListingSource(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) =>
      apiFetch<{ deleted: true; itemsRemoved: number }>(
        `workspaces/${clientId}/listing-feeds/${sourceId}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listingSources', clientId] });
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

// ── Performance Feedback ─────────────────────────────────────────────────

export type PerformanceRating = 'HIGH' | 'AVERAGE' | 'LOW';

export interface PerformanceInsight {
  id: string;
  text: string;
  detail: string;
  type: 'positive' | 'suggestion';
}

export interface PerformanceInsightsResponse {
  insights: PerformanceInsight[];
  hasEnoughData: boolean;
  totalRated: number;
  ratingDistribution: { HIGH: number; AVERAGE: number; LOW: number };
}

export function useRatePerformance(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId, rating }: { draftId: string; rating: PerformanceRating }) =>
      apiFetch<Draft>(`workspaces/${clientId}/drafts/${draftId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.drafts() });
      qc.invalidateQueries({ queryKey: ['performanceInsights', clientId] });
    },
  });
}

export function usePerformanceInsights(clientId: string | undefined) {
  return useQuery({
    queryKey: ['performanceInsights', clientId],
    queryFn: () => apiFetch<PerformanceInsightsResponse>(`workspaces/${clientId}/performance/insights`),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Persona Feedback ────────────────────────────────────────────────────

export type PersonaFeedbackReason =
  | 'doesnt_look_like_me'
  | 'wrong_style'
  | 'too_artificial'
  | 'not_relevant'
  | 'other';

export function usePersonaFeedback(assetId: string) {
  return useMutation({
    mutationFn: (body: { reason: PersonaFeedbackReason; detail?: string }) =>
      apiFetch<{ ok: true }>(`assets/${assetId}/persona-feedback`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

// ── Series Builder ──────────────────────────────────────────────────────

export interface SeriesTemplate {
  id: string;
  name: string;
  description: string;
  defaultParts: number;
  maxParts: number;
}

export interface SeriesResult {
  seriesId: string;
  seriesName: string;
  totalParts: number;
  drafts: Draft[];
}

export function useSeriesTemplates() {
  return useQuery({
    queryKey: ['seriesTemplates'],
    queryFn: () => apiFetch<{ templates: SeriesTemplate[] }>('series-templates'),
    staleTime: 60 * 60 * 1000,
  });
}

export function useGenerateSeries(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      topic: string;
      templateId: string;
      parts?: number;
      channel: Channel;
      kind?: string;
    }) =>
      apiFetch<SeriesResult>(`workspaces/${clientId}/series`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.drafts() });
    },
  });
}

// ── Post Timing ─────────────────────────────────────────────────────────

export interface TimingSuggestion {
  bestTime: string;
  bestTimeLabel: string;
  bestDays: string;
  tip: string;
}

export function useTimingSuggestions() {
  return useQuery({
    queryKey: ['timingSuggestions'],
    queryFn: () => apiFetch<Record<string, TimingSuggestion>>('timing-suggestions'),
    staleTime: 60 * 60 * 1000,
  });
}
