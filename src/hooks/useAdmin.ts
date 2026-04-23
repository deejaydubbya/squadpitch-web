'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

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
  owner: { id: string; auth0Sub: string; email: string; name: string | null; createdAt: string } | null;
  subscription: { tier: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  brand: { description: string | null; industry: string | null; website: string | null; city: string | null; state: string | null } | null;
  voice: { tone: string | null; version: number; updatedAt: string } | null;
  media: { mode: string; visualStyle: string | null; updatedAt: string } | null;
  channelSettings: { channel: string; isEnabled: boolean; maxChars: number | null }[];
  connections: ConnectionItem[];
  techStack: TechStackItem[];
  analytics: { totalPosts: number; totalPublishedPosts: number; avgEngagementRate: number | null; topPlatform: string | null; lastCalculatedAt: string | null } | null;
  recentDrafts: DraftSummary[];
  recentFailures: { id: string; channel: string; publishError: string | null; publishAttempts: number; lastPublishAttemptAt: string | null; updatedAt: string }[];
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
  assets: { id: string; url: string; thumbnailUrl: string | null; mimeType: string; assetType: string; status: string; width: number | null; height: number | null; filename: string | null; source: string; errorMessage: string | null; role: string | null; orderIndex: number }[];
  sources: { dataItem: { id: string; type: string; title: string | null; summary: string | null; status: string } | null; blueprint: { id: string; slug: string; name: string; category: string } | null }[];
  moderationLog: { fromStatus: string; toStatus: string; actorSub: string; reason: string | null; createdAt: string }[];
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

interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

// ── Query Keys ───────────────────────────────────────────────────────────

export const adminKeys = {
  workspaces: (params: Record<string, string>) => ['admin', 'workspaces', params] as const,
  workspace: (id: string) => ['admin', 'workspace', id] as const,
  drafts: (params: Record<string, string>) => ['admin', 'drafts', params] as const,
  draft: (id: string) => ['admin', 'draft', id] as const,
  connections: (params: Record<string, string>) => ['admin', 'connections', params] as const,
  techStack: (params: Record<string, string>) => ['admin', 'techStack', params] as const,
  publishing: (params: Record<string, string>) => ['admin', 'publishing', params] as const,
  services: (params: Record<string, string>) => ['admin', 'services', params] as const,
  service: (id: string) => ['admin', 'service', id] as const,
  servicesSummary: () => ['admin', 'servicesSummary'] as const,
  betaSummary: () => ['admin', 'betaSummary'] as const,
  betaTesters: (params: Record<string, string>) => ['admin', 'betaTesters', params] as const,
  betaTester: (id: string) => ['admin', 'betaTester', id] as const,
  betaFeedback: (params: Record<string, string>) => ['admin', 'betaFeedback', params] as const,
  betaFeedbackItem: (id: string) => ['admin', 'betaFeedbackItem', id] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────

function buildQuery(params: Record<string, string>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function useAdminWorkspaces(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.workspaces(params),
    queryFn: () => apiFetch<PaginatedResult<WorkspaceSummary>>(`internal/workspaces${buildQuery(params)}`),
  });
}

export function useAdminWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.workspace(id ?? ''),
    queryFn: () => apiFetch<WorkspaceDetail>(`internal/workspaces/${id}`),
    enabled: Boolean(id),
  });
}

export function useAdminDrafts(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.drafts(params),
    queryFn: () => apiFetch<PaginatedResult<DraftSummary>>(`internal/drafts${buildQuery(params)}`),
  });
}

export function useAdminDraft(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.draft(id ?? ''),
    queryFn: () => apiFetch<DraftDetail>(`internal/drafts/${id}`),
    enabled: Boolean(id),
  });
}

export function useAdminConnections(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.connections(params),
    queryFn: () => apiFetch<{ items: ConnectionItem[] }>(`internal/connections${buildQuery(params)}`),
    select: (d) => d.items,
  });
}

export function useAdminTechStack(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.techStack(params),
    queryFn: () => apiFetch<{ items: TechStackItem[] }>(`internal/connections/tech-stack${buildQuery(params)}`),
    select: (d) => d.items,
  });
}

export function useAdminPublishing(params: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.publishing(params),
    queryFn: () => apiFetch<PaginatedResult<PublishItem>>(`internal/publishing${buildQuery(params)}`),
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
  usageSnapshots: { id: string; usage: number; limit: number | null; percentUsed: number | null; note: string | null; source: string; snapshotAt: string }[];
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
    queryFn: () => apiFetch<{ items: ExternalServiceItem[] }>(`internal/services${buildQuery(params)}`),
    select: (d) => d.items,
  });
}

export function useAdminServicesSummary() {
  return useQuery({
    queryKey: adminKeys.servicesSummary(),
    queryFn: () => apiFetch<ServicesSummary>('internal/services/summary'),
  });
}

export function useAdminService(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.service(id ?? ''),
    queryFn: () => apiFetch<ExternalServiceItem>(`internal/services/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ExternalServiceItem>('internal/services', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['admin', 'servicesSummary'] });
    },
  });
}

export function useUpdateService(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ExternalServiceItem>(`internal/services/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['admin', 'service', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'servicesSummary'] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`internal/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['admin', 'servicesSummary'] });
    },
  });
}

export function useSeedServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ created: number; total: number }>('internal/services/seed', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['admin', 'servicesSummary'] });
    },
  });
}

export function useRefreshDerivedUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>('internal/services/refresh', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['admin', 'servicesSummary'] });
    },
  });
}

export function useAddUsageSnapshot(serviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { usage: number; limit?: number; note?: string }) =>
      apiFetch(`internal/services/${serviceId}/usage`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'service', serviceId] });
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
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
  recentActivity?: { id: string; eventType: string; title: string; description: string | null; createdAt: string }[];
}

export interface BetaFeedbackItem {
  id: string;
  testerId: string | null;
  userId: string;
  workspaceId: string | null;
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
  tester?: { id: string; email: string; name: string | null; cohort: string | null; tags?: string[]; priority: string } | null;
}

export interface BetaSummary {
  testers: { total: number; active: number; byStatus: Record<string, number>; highPriority: number };
  feedback: { byStatus: Record<string, number>; needsFollowUp: number };
}

export function useBetaSummary() {
  return useQuery({
    queryKey: adminKeys.betaSummary(),
    queryFn: () => apiFetch<BetaSummary>('internal/beta/summary'),
  });
}

export function useBetaTesters(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: adminKeys.betaTesters(params),
    queryFn: () => apiFetch<{ items: BetaTesterItem[] }>(`internal/beta/testers${buildQuery(params)}`),
    select: (d) => d.items,
  });
}

export function useBetaTester(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.betaTester(id ?? ''),
    queryFn: () => apiFetch<BetaTesterItem>(`internal/beta/testers/${id}`),
    enabled: Boolean(id),
  });
}

export function useBetaFeedbackList(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: adminKeys.betaFeedback(params),
    queryFn: () => apiFetch<{ items: BetaFeedbackItem[]; nextCursor: string | null }>(`internal/beta/feedback${buildQuery(params)}`),
  });
}

export function useCreateTester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<BetaTesterItem>('internal/beta/testers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'betaTesters'] });
      qc.invalidateQueries({ queryKey: ['admin', 'betaSummary'] });
    },
  });
}

export function useUpdateTester(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<BetaTesterItem>(`internal/beta/testers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'betaTesters'] });
      qc.invalidateQueries({ queryKey: ['admin', 'betaTester', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'betaSummary'] });
    },
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<BetaFeedbackItem>('internal/beta/feedback', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'betaFeedback'] });
      qc.invalidateQueries({ queryKey: ['admin', 'betaSummary'] });
    },
  });
}

export function useUpdateFeedback(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<BetaFeedbackItem>(`internal/beta/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'betaFeedback'] });
      qc.invalidateQueries({ queryKey: ['admin', 'betaFeedbackItem', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'betaSummary'] });
    },
  });
}
