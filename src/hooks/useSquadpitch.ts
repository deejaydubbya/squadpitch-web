'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Types ────────────────────────────────────────────────────────────────

export type ClientStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type Channel =
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'X'
  | 'LINKEDIN'
  | 'FACEBOOK'
  | 'YOUTUBE';

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
  altText: string | null;
  imageGuidance: string | null;
  warnings: string[];
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  externalPostId: string | null;
  externalPostUrl: string | null;
  publishError: string | null;
  publishAttempts: number;
  lastPublishAttemptAt: string | null;
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
  performanceScore: number | null;
  engagementRate: number | null;
  impressions: number | null;
  contentType?: string | null;
  hookType?: string | null;
  sentiment?: string | null;
}

export interface PlatformStat {
  channel: Channel;
  postCount: number;
  avgEngagementRate: number | null;
  avgScore: number | null;
  totalReach: number | null;
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
  score: number;
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
}

export interface PostDetailInsight {
  performanceScore: number | null;
  contentType: string | null;
  hookType: string | null;
  sentiment: string | null;
  lengthBucket: string | null;
  mediaType: string | null;
  postingTimeBucket: string | null;
  recommendationTags: string[] | null;
}

export interface PostDetail {
  id: string;
  body: string;
  channel: Channel;
  publishedAt: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  externalPostUrl: string | null;
  metrics: PostDetailMetrics | null;
  insight: PostDetailInsight | null;
  scoreBreakdown: ScoreBreakdown;
}

export interface AnalyticsOverview {
  summary: {
    performanceScore: number | null;
    engagementRate: number | null;
    totalReach: number | null;
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
  draftId: string | null;
  displayOrder: number;
  falModelId: string | null;
  renderedPrompt: string | null;
  seed: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  usageCount: number;
  createdBy: string;
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
  avgPerformanceScore: number | null;
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
  channel?: Channel;
  overrides?: Record<string, unknown>;
}

export interface AssetFilters {
  source?: MediaAssetSource;
  status?: MediaAssetStatus;
  assetType?: MediaAssetType;
  draftId?: string;
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
  drafts: (filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'drafts', filters ?? {}] as const,
  draft: (id: string) => [...squadpitchKeys.all, 'draft', id] as const,
  assets: (clientId: string, filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'client', clientId, 'assets', filters ?? {}] as const,
  asset: (id: string) => [...squadpitchKeys.all, 'asset', id] as const,
  postDetail: (clientId: string, postId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'post-detail', postId] as const,
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
  dashboardRecommendations: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'dashboard-recommendations'] as const,
  dashboardActions: (clientId: string) =>
    [...squadpitchKeys.all, 'client', clientId, 'dashboard-actions'] as const,
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

export function usePostDetail(clientId: string | undefined, postId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.postDetail(clientId ?? '', postId ?? ''),
    queryFn: () =>
      apiFetch<PostDetail>(`workspaces/${clientId}/analytics/posts/${postId}`),
    enabled: Boolean(clientId) && Boolean(postId),
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
      body: Partial<Pick<Draft, 'body' | 'hooks' | 'hashtags' | 'cta' | 'altText'>>
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

export function useStartOAuth(clientId: string) {
  return useMutation({
    mutationFn: (channel: Channel) =>
      apiFetch<OAuthStartResponse>(
        `workspaces/${clientId}/connections/${channel}/oauth/start`,
        { method: 'POST', body: JSON.stringify({}) }
      ),
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

export function useAssets(clientId: string, filters: AssetFilters = {}, poll = false) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  const path = `workspaces/${clientId}/assets${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: squadpitchKeys.assets(clientId, filters as Record<string, unknown>),
    queryFn: () => apiFetch<{ assets: MediaAsset[] }>(path),
    select: (data) => data.assets,
    refetchInterval: poll ? 3000 : false,
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
    mutationFn: async ({ formData, assetType }: { formData: FormData; assetType?: MediaAssetType }) => {
      const file = formData.get('file') as File | null;
      if (!file) throw new Error('No file provided');

      const params = new URLSearchParams();
      if (assetType === 'video') params.set('assetType', 'video');
      if (file.name) params.set('filename', file.name);
      const altText = formData.get('altText');
      if (altText) params.set('altText', altText as string);
      const caption = formData.get('caption');
      if (caption) params.set('caption', caption as string);
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
    },
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

export function useDataItem(id: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.dataItem(id ?? ''),
    queryFn: () => apiFetch<WorkspaceDataItem>(`business-data/${id}`),
    enabled: Boolean(id),
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
      apiFetch<WorkspaceDataItem>(`business-data/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useArchiveDataItem(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<WorkspaceDataItem>(`business-data/${id}/archive`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadpitchKeys.dataItems(clientId) });
    },
  });
}

export function useDeleteDataItem(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`business-data/${id}`, { method: 'DELETE' }),
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

export function useItemOpportunities(itemId: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.itemOpportunities(itemId ?? ''),
    queryFn: () =>
      apiFetch<{ opportunities: ItemOpportunity[] }>(
        `business-data/${itemId}/opportunities`
      ),
    select: (data) => data.opportunities,
    enabled: Boolean(itemId),
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

// ── Dashboard ───────────────────────────────────────────────────────────

export interface DashboardRecommendation {
  id: string;
  title: string;
  description: string;
  reason?: string;
  action: string;
  actionLabel: string;
  priority: number;
  category: string;
  metadata?: { guidance?: string; templateType?: string };
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
    staleTime: 60_000,
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
    staleTime: 60_000,
  });
}

// ── Onboarding ──────────────────────────────────────────────────────────

export type OnboardingAnalyzeInput = {
  input: string;
  inputType: 'url' | 'text';
  documentTexts?: string[];
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
}

export interface OnboardingAnalyzeResult {
  brandData: OnboardingBrandData;
  voiceData: OnboardingVoiceData;
  suggestedGoal: string;
  suggestedChannels: Channel[];
  images: string[];
  dataItems: OnboardingDataItem[];
  starterAngles?: string[];
  coreTemplates?: { type: string; title: string; guidance: string }[];
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

export type ConnectionMode = 'oauth' | 'manual' | 'planned';

export interface ManualSetupField {
  key: string;
  label: string;
  type: 'url' | 'text';
  required: boolean;
  placeholder?: string;
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

export interface IndustryProfile {
  key: string;
  label: string;
  description: string;
  onboarding: IndustryOnboarding;
  content: {
    starterBlueprintSlugs: string[];
    starterChannels: string[];
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
  channelRef?: string;
  connectionStatus: ConnectionStatus;
  metadataJson: Record<string, unknown> | null;
  isPublishing: boolean;
  isImportSource: boolean;
  isWorkflowTool: boolean;
}

export interface TechStackViewItem extends WorkspaceTechStackItem {
  group: TechStackGroup;
  statusBadge: 'Coming Soon' | 'Connected' | 'Connect' | 'Add Data';
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
