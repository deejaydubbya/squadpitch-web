"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

// ── Types ────────────────────────────────────────────────────────────────

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  industryKey: string | null;
  logoUrl: string | null;
  createdBy: string;
  createdAt: string;
  owner: { email: string; name: string | null } | null;
  tier: string | null;
  subscriptionStatus: string | null;
  draftCount: number;
  channels: { channel: string; status: string }[];
}

export interface ProspectWorkspaceItem {
  id: string;
  clientId: string;
  businessName: string;
  industryKey: string | null;
  prospectName: string;
  prospectEmail: string;
  websiteUrl: string | null;
  sourceUrl: string | null;
  acquisitionSource: string | null;
  operatorNote: string | null;
  previewStatus: "ACTIVE" | "REVOKED";
  claimStatus: "CLAIMABLE" | "CLAIMED" | "REVOKED" | "EXPIRED";
  claimIssuedAt: string;
  claimExpiresAt: string;
  claimedAt: string | null;
  claimedByUserId: string | null;
  createdAt: string;
  previewToken?: string;
  claimToken?: string;
  eligiblePreviewItems?: ProspectPreviewCandidate[];
  selectedPreviewItems?: ProspectPreviewSelection[];
  preparationState?: "NOT_STARTED" | "READY_UNSELECTED" | "SELECTED";
  sourcePreparationState?: "NOT_IMPORTED" | "IMPORTED";
  selectedChannels?: Array<"INSTAGRAM" | "FACEBOOK" | "LINKEDIN">;
  campaignReadiness?: { status: "COMPLETE" | "COMPLETE_WITH_WARNINGS" | "PARTIAL" | "NEEDS_ATTENTION"; readyChannels: string[]; expectedChannels: string[]; issues: Array<{ channel: string; code: string; message: string }> };
  preparationRun?: {
    id: string;
    status: "QUEUED" | "RUNNING" | "COMPLETE" | "COMPLETE_WITH_WARNINGS" | "FAILED";
    stage: "QUEUED" | "IMPORTING_LISTING" | "ENRICHING" | "PROCESSING_MEDIA" | "GENERATING" | "SELECTING" | "COMPLETE" | "FAILED";
    readyCount: number;
    expectedCount: number;
    warningCount: number;
    failureMessage: string | null;
    platformStates: Record<string, { status: "NOT_STARTED" | "GENERATING" | "VALIDATING" | "RETRYING" | "AI_ACCEPTED" | "FALLBACK_ACCEPTED" | "FAILED"; attemptCount: number; provenance: "AI" | "FALLBACK" | null; rejectionCategory: string | null; updatedAt: string | null }>;
  } | null;
}

export interface ProspectPreviewCandidate {
  id: string;
  itemType: "DATA_ITEM" | "DRAFT";
  title: string;
  subtitle: string;
}
export interface ProspectPreviewSelection {
  id: string;
  itemType: "DATA_ITEM" | "DRAFT";
  sortOrder: number;
}

export interface CreateProspectInput {
  prospectName: string;
  prospectEmail: string;
  businessName: string;
  industryKey: "real_estate" | "car_sales";
  websiteUrl?: string;
  sourceUrl?: string;
  acquisitionSource?: string;
  operatorNote?: string;
}

export interface PopulateProspectInput {
  listing?: { title: string; summary?: string; sourceUrl?: string };
  posts: Array<{
    channel: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN";
    body: string;
  }>;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  industryKey: string | null;
  timezone: string;
  logoUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    auth0Sub: string;
    email: string;
    name: string | null;
    createdAt: string;
  } | null;
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  brand: {
    description: string | null;
    industry: string | null;
    website: string | null;
    city: string | null;
    state: string | null;
  } | null;
  voice: { tone: string | null; version: number; updatedAt: string } | null;
  media: { mode: string; visualStyle: string | null; updatedAt: string } | null;
  channelSettings: {
    channel: string;
    isEnabled: boolean;
    maxChars: number | null;
  }[];
  connections: ConnectionItem[];
  techStack: TechStackItem[];
  analytics: {
    totalPosts: number;
    totalPublishedPosts: number;
    avgEngagementRate: number | null;
    topPlatform: string | null;
    lastCalculatedAt: string | null;
  } | null;
  recentDrafts: DraftSummary[];
  recentFailures: {
    id: string;
    channel: string;
    publishError: string | null;
    publishAttempts: number;
    lastPublishAttemptAt: string | null;
    updatedAt: string;
  }[];
}

export interface DraftSummary {
  id: string;
  clientId: string;
  clientName?: string | null;
  kind: string;
  status: string;
  channel: string;
  body: string | null;
  campaignName: string | null;
  campaignType: string | null;
  modelUsed: string | null;
  promptVersion: string | null;
  warnings: string[];
  publishError: string | null;
  publishAttempts: number;
  mediaUrl: string | null;
  hasAssets: boolean;
  assetCount: number;
  createdBy: string | null;
  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
}

export interface DraftDetail {
  id: string;
  clientId: string;
  clientName: string | null;
  industryKey: string | null;
  kind: string;
  status: string;
  channel: string;
  bucketKey: string | null;
  body: string | null;
  hooks: string[];
  hashtags: string[];
  cta: string | null;
  altText: string | null;
  imageGuidance: string | null;
  videoGuidance: string | null;
  variations: unknown;
  warnings: string[];
  generationGuidance: string | null;
  modelUsed: string | null;
  promptVersion: string | null;
  campaignId: string | null;
  campaignName: string | null;
  campaignType: string | null;
  campaignDay: number | null;
  campaignOrder: number | null;
  campaignTotal: number | null;
  mediaUrl: string | null;
  mediaType: string | null;
  publishError: string | null;
  publishAttempts: number;
  lastPublishAttemptAt: string | null;
  publishSource: string | null;
  externalPostId: string | null;
  externalPostUrl: string | null;
  idempotencyKey: string | null;
  performanceRating: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assets: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    mimeType: string;
    assetType: string;
    status: string;
    width: number | null;
    height: number | null;
    filename: string | null;
    source: string;
    errorMessage: string | null;
    role: string | null;
    orderIndex: number;
  }[];
  sources: {
    dataItem: {
      id: string;
      type: string;
      title: string | null;
      summary: string | null;
      status: string;
    } | null;
    blueprint: {
      id: string;
      slug: string;
      name: string;
      category: string;
    } | null;
  }[];
  moderationLog: {
    fromStatus: string;
    toStatus: string;
    actorSub: string;
    reason: string | null;
    createdAt: string;
  }[];
}

export interface ConnectionItem {
  id: string;
  clientId: string;
  clientName?: string | null;
  channel: string;
  displayName: string | null;
  externalAccountId: string | null;
  status: string;
  tokenExpiresAt: string | null;
  lastValidatedAt: string | null;
  lastRefreshAt: string | null;
  refreshFailedAt: string | null;
  lastError: string | null;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TechStackItem {
  id: string;
  workspaceId?: string;
  workspaceName?: string | null;
  industryKey?: string | null;
  providerKey: string;
  connectionStatus: string;
  lastError: string | null;
  connectedAt: string | null;
}

export interface PublishItem {
  id: string;
  clientId: string;
  clientName: string | null;
  channel: string;
  status: string;
  body: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  hasAssets: boolean;
  assetStatuses: string[];
  publishError: string | null;
  publishAttempts: number;
  lastPublishAttemptAt: string | null;
  publishSource: string | null;
  externalPostId: string | null;
  externalPostUrl: string | null;
  idempotencyKey: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueSummaryItem {
  queue: string;
  label: string;
  category: string;
  icon: string;
  counts: {
    active: number;
    waiting: number;
    delayed: number;
    failed: number;
    completed: number;
    paused: number;
  };
  error?: string;
}

export interface JobSummaryItem {
  id: string;
  queue: string;
  queueLabel: string;
  name: string;
  status: string;
  data: Record<string, unknown>;
  timestamp: number;
  processedOn: number | null;
  finishedOn: number | null;
  attemptsMade: number;
  attemptsMax: number;
  failedReason: string | null;
  workspaceId: string | null;
  workspaceName?: string | null;
  context: string | null;
}

export interface JobDetail extends JobSummaryItem {
  returnvalue: unknown;
  delay: number;
  stacktrace: string[];
}

export interface WebhookSummary {
  totalEndpoints: number;
  activeEndpoints: number;
  inactiveEndpoints: number;
  totalDeliveries: number;
  deliveriesByStatus: Record<string, number>;
  recentFailed24h: number;
}

export interface WebhookEndpointItem {
  id: string;
  userId: string;
  targetUrl: string;
  hasSecret: boolean;
  subscribedEvents: string[];
  isActive: boolean;
  totalDeliveries: number;
  recentStats: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEndpointDetail extends WebhookEndpointItem {
  statsByStatus: Record<string, number>;
  recentDeliveries: WebhookDeliveryItem[];
}

export interface WebhookDeliveryItem {
  id: string;
  webhookId: string;
  eventType: string;
  requestBody: Record<string, unknown>;
  requestHeaders: Record<string, string> | null;
  responseStatus: number | null;
  responseBody: string | null;
  status: string;
  attemptCount: number;
  deliveredAt: string | null;
  replayOfId: string | null;
  createdAt: string;
  endpoint?: {
    id: string;
    targetUrl: string;
    userId: string;
    isActive: boolean;
    subscribedEvents?: string[];
  } | null;
}

export interface SystemHealthService {
  key: string;
  name: string;
  category: string;
  status: string;
  message: string;
  impact: string;
  adminLink: string | null;
  detail?: Record<string, unknown>;
}

export interface SystemHealthIssue {
  key: string;
  name: string;
  status: string;
  message: string;
  impact: string;
  adminLink: string | null;
}

export interface SystemHealthSummary {
  overall: string;
  counts: {
    healthy: number;
    degraded: number;
    down: number;
    unknown: number;
    total: number;
  };
  services: SystemHealthService[];
  issues: SystemHealthIssue[];
  checkedAt: string;
}

export interface FeatureFlagItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  enabled: boolean;
  scope: string;
  targetType: string | null;
  targetIds: string[];
  rolloutPercentage: number | null;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

// ── Query Keys ───────────────────────────────────────────────────────────

export const adminKeys = {
  workspaces: (params: Record<string, string>) =>
    ["admin", "workspaces", params] as const,
  workspace: (id: string) => ["admin", "workspace", id] as const,
  drafts: (params: Record<string, string>) =>
    ["admin", "drafts", params] as const,
  draft: (id: string) => ["admin", "draft", id] as const,
  connections: (params: Record<string, string>) =>
    ["admin", "connections", params] as const,
  techStack: (params: Record<string, string>) =>
    ["admin", "techStack", params] as const,
  publishing: (params: Record<string, string>) =>
    ["admin", "publishing", params] as const,
  services: (params: Record<string, string>) =>
    ["admin", "services", params] as const,
  service: (id: string) => ["admin", "service", id] as const,
  servicesSummary: () => ["admin", "servicesSummary"] as const,
  betaSummary: () => ["admin", "betaSummary"] as const,
  betaTesters: (params: Record<string, string>) =>
    ["admin", "betaTesters", params] as const,
  betaTester: (id: string) => ["admin", "betaTester", id] as const,
  betaFeedback: (params: Record<string, string>) =>
    ["admin", "betaFeedback", params] as const,
  betaFeedbackItem: (id: string) => ["admin", "betaFeedbackItem", id] as const,
  jobsSummary: () => ["admin", "jobsSummary"] as const,
  jobs: (params: Record<string, string>) => ["admin", "jobs", params] as const,
  job: (queue: string, id: string) => ["admin", "job", queue, id] as const,
  webhookSummary: () => ["admin", "webhookSummary"] as const,
  webhookEndpoints: (params: Record<string, string>) =>
    ["admin", "webhookEndpoints", params] as const,
  webhookEndpoint: (id: string) => ["admin", "webhookEndpoint", id] as const,
  webhookDeliveries: (params: Record<string, string>) =>
    ["admin", "webhookDeliveries", params] as const,
  webhookDelivery: (id: string) => ["admin", "webhookDelivery", id] as const,
  systemHealth: () => ["admin", "systemHealth"] as const,
  flags: (params: Record<string, string>) =>
    ["admin", "flags", params] as const,
  flag: (id: string) => ["admin", "flag", id] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────

function buildQuery(params: Record<string, string>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export function useAdminWorkspaces(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.workspaces(params),
    queryFn: () =>
      apiFetch<PaginatedResult<WorkspaceSummary>>(
        `internal/workspaces${buildQuery(params)}`,
      ),
  });
}

export function useAdminProspects() {
  return useQuery({
    queryKey: ["admin", "prospects"],
    queryFn: () =>
      apiFetch<{ items: ProspectWorkspaceItem[] }>("internal/prospects"),
  });
}

export function useAdminProspect(id: string | null) {
  return useQuery({
    queryKey: ["admin", "prospects", id],
    queryFn: () => apiFetch<ProspectWorkspaceItem>(`internal/prospects/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => ["QUEUED", "RUNNING"].includes(query.state.data?.preparationRun?.status ?? "") ? 2_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useUpdateProspectPreview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: Array<{ id: string; itemType: "DATA_ITEM" | "DRAFT" }>;
    }) =>
      apiFetch(`internal/prospects/${id}/preview-items`, {
        method: "PUT",
        body: JSON.stringify({ items }),
      }),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "prospects", variables.id],
      }),
  });
}

export function usePopulateAdminProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PopulateProspectInput }) =>
      apiFetch(`internal/prospects/${id}/populate`, { method: "POST", body: JSON.stringify(body) }),
    onSettled: (_data, _error, variables) => queryClient.invalidateQueries({ queryKey: ["admin", "prospects", variables.id] }),
  });
}

export function usePrepareAdminProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sourceUrl, selectedChannels }: { id: string; sourceUrl?: string; selectedChannels?: Array<"INSTAGRAM" | "FACEBOOK" | "LINKEDIN"> }) =>
      apiFetch(`internal/prospects/${id}/prepare`, { method: "POST", body: JSON.stringify({ ...(sourceUrl ? { sourceUrl } : {}), ...(selectedChannels ? { selectedChannels } : {}) }) }),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ["admin", "prospects", variables.id] }),
  });
}

export function useCreateAdminProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProspectInput) =>
      apiFetch<ProspectWorkspaceItem>("internal/prospects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "prospects"] }),
  });
}

export function useRotateProspectClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ProspectWorkspaceItem>(`internal/prospects/${id}/claim-token`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "prospects"] }),
  });
}

export function useRevokeProspectClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`internal/prospects/${id}/claim-token`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "prospects"] }),
  });
}

export function useAdminWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.workspace(id ?? ""),
    queryFn: () => apiFetch<WorkspaceDetail>(`internal/workspaces/${id}`),
    enabled: Boolean(id),
  });
}

export function useDeleteAllWorkspaces() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; deleted: number }>("internal/workspaces", {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.workspaces({}) });
      qc.invalidateQueries({ queryKey: ["squadpitch"] });
    },
  });
}

export function useAdminDrafts(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.drafts(params),
    queryFn: () =>
      apiFetch<PaginatedResult<DraftSummary>>(
        `internal/drafts${buildQuery(params)}`,
      ),
  });
}

export function useAdminDraft(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.draft(id ?? ""),
    queryFn: () => apiFetch<DraftDetail>(`internal/drafts/${id}`),
    enabled: Boolean(id),
  });
}

export function useAdminConnections(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.connections(params),
    queryFn: () =>
      apiFetch<{ items: ConnectionItem[] }>(
        `internal/connections${buildQuery(params)}`,
      ),
    select: (d) => d.items,
  });
}

export function useAdminTechStack(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.techStack(params),
    queryFn: () =>
      apiFetch<{ items: TechStackItem[] }>(
        `internal/connections/tech-stack${buildQuery(params)}`,
      ),
    select: (d) => d.items,
  });
}

// Internal-only manual metrics sync. Mirrors the debug-safe shape the
// route returns — no tokens, no provider payloads. status is "synced"
// on success, "skipped" for prereq fails (cooldown, no_external_id),
// "failed" for adapter / pipeline errors.
export interface AdminMetricsSyncResult {
  ok: boolean;
  draftId: string;
  clientId: string;
  channel: string;
  externalPostId: string | null;
  status: "synced" | "skipped" | "failed";
  reason: string | null;
  detail: string | null;
  rawMetricId: string | null;
  normalizedMetricId: string | null;
  postMetricsUpdated: boolean;
  lastSyncedAt: string | null;
  forceUsed: boolean;
  durationMs: number;
}

export function useAdminMetricsSync() {
  return useMutation({
    mutationFn: ({
      draftId,
      force = true,
    }: {
      draftId: string;
      force?: boolean;
    }) =>
      apiFetch<AdminMetricsSyncResult>(
        `internal/drafts/${draftId}/metrics/sync`,
        {
          method: "POST",
          body: JSON.stringify({ force }),
        },
      ),
  });
}

export function useAdminPublishing(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.publishing(params),
    queryFn: () =>
      apiFetch<PaginatedResult<PublishItem>>(
        `internal/publishing${buildQuery(params)}`,
      ),
  });
}

// ── External Services ────────────────────────────────────────────────────

export interface ExternalServiceItem {
  id: string;
  key: string;
  name: string;
  category: string;
  purpose: string;
  status: string;
  criticality: string;
  environment: string;
  consoleUrl: string | null;
  docsUrl: string | null;
  notes: string | null;
  usedByFeatures: string | null;
  recoveryNotes: string | null;
  fallbackInfo: string | null;
  planName: string | null;
  billingCycle: string | null;
  renewalDate: string | null;
  monthlyCostCents: number | null;
  hardLimit: number | null;
  softLimit: number | null;
  currentUsage: number | null;
  usageUnit: string | null;
  usageSource: string;
  percentUsed: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usageSnapshots: {
    id: string;
    usage: number;
    limit: number | null;
    percentUsed: number | null;
    note: string | null;
    source: string;
    snapshotAt: string;
  }[];
}

export interface ServicesSummary {
  total: number;
  healthy: number;
  watch: number;
  nearLimit: number;
  critical: number;
  totalMonthlyCostCents: number;
  criticalServices: number;
}

export function useAdminServices(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: adminKeys.services(params),
    queryFn: () =>
      apiFetch<{ items: ExternalServiceItem[] }>(
        `internal/services${buildQuery(params)}`,
      ),
    select: (d) => d.items,
  });
}

export function useAdminServicesSummary() {
  return useQuery({
    queryKey: adminKeys.servicesSummary(),
    queryFn: () => apiFetch<ServicesSummary>("internal/services/summary"),
  });
}

export function useAdminService(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.service(id ?? ""),
    queryFn: () => apiFetch<ExternalServiceItem>(`internal/services/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ExternalServiceItem>("internal/services", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["admin", "servicesSummary"] });
    },
  });
}

export function useUpdateService(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ExternalServiceItem>(`internal/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["admin", "service", id] });
      qc.invalidateQueries({ queryKey: ["admin", "servicesSummary"] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`internal/services/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["admin", "servicesSummary"] });
    },
  });
}

export function useSeedServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ created: number; total: number }>("internal/services/seed", {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["admin", "servicesSummary"] });
    },
  });
}

export function useRefreshDerivedUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>("internal/services/refresh", {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["admin", "servicesSummary"] });
    },
  });
}

export function useAddUsageSnapshot(serviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { usage: number; limit?: number; note?: string }) =>
      apiFetch(`internal/services/${serviceId}/usage`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "service", serviceId] });
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
    },
  });
}

// ── Beta Ops ─────────────────────────────────────────────────────────────

export interface BetaTesterItem {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  workspaceId: string | null;
  status: string;
  cohort: string | null;
  tags: string[];
  priority: string;
  joinedAt: string;
  notes: string | null;
  contactNotes: string | null;
  featureFlags: unknown;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { feedback: number };
  feedback?: BetaFeedbackItem[];
  workspaceContext?: {
    id: string;
    name: string;
    status: string;
    industryKey: string | null;
    createdAt: string;
    connections: { channel: string; status: string }[];
    techStackConnections: { providerKey: string; connectionStatus: string }[];
    draftCount: number;
    recentFailures: number;
  } | null;
  recentActivity?: {
    id: string;
    eventType: string;
    title: string;
    description: string | null;
    createdAt: string;
  }[];
}

export interface BetaFeedbackItem {
  id: string;
  testerId: string | null;
  userId: string;
  workspaceId: string | null;
  workspaceName?: string | null;
  submitterEmail?: string | null;
  submitterName?: string | null;
  releaseVersion?: string | null;
  deviceClass?: string | null;
  resolvedBy?: string | null;
  type: string;
  severity: string;
  title: string;
  body: string;
  route: string | null;
  screenshotUrl: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  featureFlags: unknown;
  metadata: unknown;
  status: string;
  assignee: string | null;
  internalNotes: string | null;
  needsFollowUp: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tester?: {
    id: string;
    email: string;
    name: string | null;
    cohort: string | null;
    tags?: string[];
    priority: string;
  } | null;
}

export interface BetaSummary {
  testers: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    highPriority: number;
  };
  feedback: { byStatus: Record<string, number>; needsFollowUp: number };
}

export function useBetaSummary() {
  return useQuery({
    queryKey: adminKeys.betaSummary(),
    queryFn: () => apiFetch<BetaSummary>("internal/beta/summary"),
  });
}

export function useBetaTesters(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: adminKeys.betaTesters(params),
    queryFn: () =>
      apiFetch<{ items: BetaTesterItem[] }>(
        `internal/beta/testers${buildQuery(params)}`,
      ),
    select: (d) => d.items,
  });
}

export function useBetaTester(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.betaTester(id ?? ""),
    queryFn: () => apiFetch<BetaTesterItem>(`internal/beta/testers/${id}`),
    enabled: Boolean(id),
  });
}

export function useBetaFeedbackList(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: adminKeys.betaFeedback(params),
    queryFn: () =>
      apiFetch<{ items: BetaFeedbackItem[]; nextCursor: string | null }>(
        `internal/feedback${buildQuery(params)}`,
      ),
  });
}

export function useCreateTester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<BetaTesterItem>("internal/beta/testers", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "betaTesters"] });
      qc.invalidateQueries({ queryKey: ["admin", "betaSummary"] });
    },
  });
}

export function useUpdateTester(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<BetaTesterItem>(`internal/beta/testers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "betaTesters"] });
      qc.invalidateQueries({ queryKey: ["admin", "betaTester", id] });
      qc.invalidateQueries({ queryKey: ["admin", "betaSummary"] });
    },
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<BetaFeedbackItem>("internal/beta/feedback", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "betaFeedback"] });
      qc.invalidateQueries({ queryKey: ["admin", "betaSummary"] });
    },
  });
}

export function useUpdateFeedback(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<BetaFeedbackItem>(`internal/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "betaFeedback"] });
      qc.invalidateQueries({ queryKey: ["admin", "betaFeedbackItem", id] });
      qc.invalidateQueries({ queryKey: ["admin", "betaSummary"] });
    },
  });
}

// ── Jobs Monitor ────────────────────────────────────────────────────────

export function useJobsSummary() {
  return useQuery({
    queryKey: adminKeys.jobsSummary(),
    queryFn: () =>
      apiFetch<{ items: QueueSummaryItem[] }>("internal/jobs/summary"),
    select: (d) => d.items,
    refetchInterval: 15_000,
  });
}

export function useAdminJobs(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.jobs(params),
    queryFn: () =>
      apiFetch<{ items: JobSummaryItem[]; total: number }>(
        `internal/jobs${buildQuery(params)}`,
      ),
    refetchInterval: 30_000,
  });
}

export function useAdminJob(queue: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.job(queue ?? "", id ?? ""),
    queryFn: () => apiFetch<JobDetail>(`internal/jobs/${queue}/${id}`),
    enabled: Boolean(queue && id),
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) =>
      apiFetch<{ ok: boolean }>(`internal/jobs/${queue}/${jobId}/retry`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
      qc.invalidateQueries({ queryKey: ["admin", "jobsSummary"] });
    },
  });
}

export function useRemoveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) =>
      apiFetch<{ ok: boolean }>(`internal/jobs/${queue}/${jobId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
      qc.invalidateQueries({ queryKey: ["admin", "jobsSummary"] });
    },
  });
}

// ── Webhooks Monitor ────────────────────────────────────────────────────

export function useWebhookSummary() {
  return useQuery({
    queryKey: adminKeys.webhookSummary(),
    queryFn: () => apiFetch<WebhookSummary>("internal/webhooks/summary"),
    refetchInterval: 30_000,
  });
}

export function useWebhookEndpoints(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: adminKeys.webhookEndpoints(params),
    queryFn: () =>
      apiFetch<{ items: WebhookEndpointItem[] }>(
        `internal/webhooks/endpoints${buildQuery(params)}`,
      ),
    select: (d) => d.items,
  });
}

export function useWebhookEndpoint(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.webhookEndpoint(id ?? ""),
    queryFn: () =>
      apiFetch<WebhookEndpointDetail>(`internal/webhooks/endpoints/${id}`),
    enabled: Boolean(id),
  });
}

export function useWebhookDeliveries(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: adminKeys.webhookDeliveries(params),
    queryFn: () =>
      apiFetch<PaginatedResult<WebhookDeliveryItem>>(
        `internal/webhooks/deliveries${buildQuery(params)}`,
      ),
    refetchInterval: 30_000,
  });
}

export function useWebhookDeliveryDetail(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.webhookDelivery(id ?? ""),
    queryFn: () =>
      apiFetch<WebhookDeliveryItem>(`internal/webhooks/deliveries/${id}`),
    enabled: Boolean(id),
  });
}

export function useToggleWebhookEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      endpointId,
      isActive,
    }: {
      endpointId: string;
      isActive: boolean;
    }) =>
      apiFetch<{ ok: boolean }>(
        `internal/webhooks/endpoints/${endpointId}/toggle`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "webhookEndpoints"] });
      qc.invalidateQueries({ queryKey: ["admin", "webhookEndpoint"] });
      qc.invalidateQueries({ queryKey: ["admin", "webhookSummary"] });
    },
  });
}

export function useReplayDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) =>
      apiFetch<{ ok: boolean }>(
        `internal/webhooks/deliveries/${deliveryId}/replay`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "webhookDeliveries"] });
      qc.invalidateQueries({ queryKey: ["admin", "webhookSummary"] });
    },
  });
}

// ── System Health ───────────────────────────────────────────────────────

export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.systemHealth(),
    queryFn: () =>
      apiFetch<SystemHealthSummary>("internal/system-health/summary"),
    refetchInterval: 30_000,
  });
}

// ── Config / Feature Flags ──────────────────────────────────────────────

export function useFeatureFlags(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: adminKeys.flags(params),
    queryFn: () =>
      apiFetch<{ items: FeatureFlagItem[] }>(
        `internal/config/flags${buildQuery(params)}`,
      ),
    select: (d) => d.items,
  });
}

export function useFeatureFlag(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.flag(id ?? ""),
    queryFn: () => apiFetch<FeatureFlagItem>(`internal/config/flags/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<FeatureFlagItem>("internal/config/flags", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "flags"] });
    },
  });
}

export function useUpdateFlag(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<FeatureFlagItem>(`internal/config/flags/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "flags"] });
      qc.invalidateQueries({ queryKey: ["admin", "flag", id] });
    },
  });
}

export function useToggleFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiFetch<FeatureFlagItem>(`internal/config/flags/${id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "flags"] });
    },
  });
}

export function useDeleteFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`internal/config/flags/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "flags"] });
    },
  });
}

export function useSeedFlags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ created: number; total: number }>(
        "internal/config/flags/seed",
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "flags"] });
    },
  });
}
