'use client';

// SquadAds React Query hooks. Mirrors the API surface defined in
// squadpitch-api/domains/ads/ads.routes.js. Same conventions as
// useInbox.ts — own query-key namespace, apiFetch under the hood,
// invalidate on mutations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Types ────────────────────────────────────────────────────────────────

export type AdObjective = 'AWARENESS' | 'TRAFFIC' | 'LEADS' | 'ENGAGEMENT' | 'EVENT';
export type AdPackageStatus = 'DRAFT' | 'READY' | 'EXPORTED' | 'ARCHIVED';
export type AdSpecialCategory =
  | 'NONE'
  | 'HOUSING'
  | 'EMPLOYMENT'
  | 'CREDIT'
  | 'SOCIAL_ISSUES';
export type AdDestinationKind = 'SITE_PAGE' | 'EXTERNAL_URL' | 'SOCIAL_PROFILE';
export type AdSourceType =
  | 'CAMPAIGN'
  | 'SITE_PAGE'
  | 'DRAFT'
  | 'PROPERTY'
  | 'CONTENT_ASSET'
  | 'IDEA';

export type AdChannel =
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'X'
  | 'LINKEDIN'
  | 'LINKEDIN_ORGANIZATION_PAGE'
  | 'FACEBOOK'
  | 'YOUTUBE'
  | 'PINTEREST'
  | 'THREADS';

export type ReplyTone = 'professional' | 'friendly' | 'concise';

export interface AdCreative {
  id: string;
  adPackageId: string;
  variantIndex: number;
  channel: AdChannel | null;
  headline: string;
  primaryText: string;
  description: string | null;
  cta: string | null;
  primaryAssetId: string | null;
  additionalAssetIdsJson: string[];
  rationale: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdAudienceLocation {
  kind: 'country' | 'region' | 'city' | 'postal';
  value: string;
}

export interface AdCustomAudienceHint {
  kind: 'lookalike' | 'retargeting' | 'engaged_recent' | 'custom';
  description: string;
}

export interface AdAudience {
  id: string;
  adPackageId: string;
  locationsJson: AdAudienceLocation[];
  ageMin: number | null;
  ageMax: number | null;
  gendersJson: ('male' | 'female' | 'all')[];
  interestsJson: string[];
  customAudienceHintsJson: AdCustomAudienceHint[];
  languagesJson: string[];
  housingRestricted: boolean;
}

export interface AdBudget {
  id: string;
  adPackageId: string;
  dailyBudgetCents: number | null;
  totalBudgetCents: number | null;
  currency: string;
  durationDays: number | null;
  startsAt: string | null;
  endsAt: string | null;
  suggestedDailyBudgetCents: number | null;
  suggestedTotalBudgetCents: number | null;
}

export interface AdDestination {
  id: string;
  adPackageId: string;
  kind: AdDestinationKind;
  sitePageId: string | null;
  externalUrl: string | null;
  socialProfile: string | null;
  utmJson: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
    term?: string | null;
  } | null;
  pixelIdsJson: string[];
}

export interface AdSourceSummary {
  kind: string;
  id?: string;
  name?: string;
  title?: string;
  slug?: string;
  campaignType?: string;
  status?: string;
  type?: string;
  summary?: string | null;
  channel?: string;
  bodyPreview?: string | null;
  text?: string | null;
}

export interface AdExportEntry {
  format: string;
  filename: string;
  generatedAt: string;
  generatedBy: string;
}

export interface AdPackageListRow {
  id: string;
  clientId: string;
  name: string;
  objective: AdObjective;
  status: AdPackageStatus;
  specialCategory: AdSpecialCategory;
  sourceType: AdSourceType;
  sourceId: string | null;
  sourceIdea: string | null;
  generatedByModel: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  exportsJson: AdExportEntry[];
  creatives: Pick<AdCreative, 'id' | 'variantIndex' | 'headline' | 'primaryAssetId'>[];
  destination?: Pick<AdDestination, 'kind' | 'sitePageId' | 'externalUrl'> | null;
}

export interface AdDestinationPreview {
  resolvedUrl: string | null;
  warning: string | null;
}

export interface AdPackageDetail extends AdPackageListRow {
  creatives: AdCreative[];
  audience: AdAudience | null;
  budget: AdBudget | null;
  destination: AdDestination | null;
  sourceSummary: AdSourceSummary | null;
  destinationPreview: AdDestinationPreview | null;
}

export interface AdsStats {
  draftCount: number;
  readyCount: number;
  exportedCount: number;
  totalCount: number;
}

export interface AdExportResult {
  filename: string;
  mimeType: string;
  content: string;
  bundle: unknown;
  // Ads-03 — server echoes the resolved mode so the UI knows
  // whether the call mutated (status flip + history append) or
  // was a pure preview. The frontend asks for one or the other
  // explicitly; we don't infer from the button label.
  mode?: 'preview' | 'download';
  // Ads-04 — server returns the resolved exporter descriptor so
  // the UI can render an honest "what is this file" hint
  // (Google Editor CSV vs Meta launch sheet etc.).
  format?: string;
  label?: string;
  extension?: string;
  platform?: string;
  isDirectImport?: boolean;
  // Ads-05 — null when the exporter isn't tied to a specific
  // platform import path (e.g. squadads_json, agency_markdown).
  importStyle?: string | null;
  platformNotes?: string;
  // Ads-06 — true for renderers that need the user to download a
  // platform-specific template first (TikTok bulk edit).
  requiresPlatformTemplateReview?: boolean;
  // Ads-05 — machine-readable per-field warnings (e.g. Google CSV
  // truncates a headline > 30 chars).
  warnings?: AdExportWarning[];
}

export interface AdExportWarning {
  code: string;
  field: string;
  limit?: number;
  variantIndex?: number | null;
  message: string;
}

// Ads-09 — descriptor metadata for the export-formats catalog.
// Matches the shape returned by GET /workspaces/:id/ads/export-formats
// (exporters/index.js listExporters() on the API).
export interface ExportFormatDescriptor {
  format: string;
  aliases: string[];
  label: string;
  mimeType: string;
  extension: string;
  platform: string;
  isDirectImport: boolean;
  importStyle: string | null;
  requiresPlatformTemplateReview: boolean;
  notes: string;
}

// ── Query keys ───────────────────────────────────────────────────────────

export const adsKeys = {
  all: ['ads'] as const,
  list: (clientId: string, filters?: Record<string, unknown>) =>
    [...adsKeys.all, 'list', clientId, filters ?? {}] as const,
  detail: (clientId: string, packageId: string) =>
    [...adsKeys.all, 'detail', clientId, packageId] as const,
  stats: (clientId: string) => [...adsKeys.all, 'stats', clientId] as const,
  // Ads-09 — format catalog is workspace-independent on the server
  // but we still key by clientId so the React Query devtools group
  // it next to the rest of the ads surface.
  exportFormats: (clientId: string) =>
    [...adsKeys.all, 'export-formats', clientId] as const,
};

const base = (clientId: string) => `workspaces/${clientId}/ads`;

// ── List + detail ────────────────────────────────────────────────────────

export interface ListAdsFilters {
  status?: AdPackageStatus;
  limit?: number;
  cursor?: string;
}

export function useAdPackages(clientId: string | undefined, filters: ListAdsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);
  const qs = params.toString();
  const path = `${base(clientId ?? '')}${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: adsKeys.list(clientId ?? '', filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ packages: AdPackageListRow[]; nextCursor: string | null }>(path),
    enabled: Boolean(clientId),
  });
}

export function useAdPackage(
  clientId: string | undefined,
  packageId: string | undefined,
) {
  return useQuery({
    queryKey: adsKeys.detail(clientId ?? '', packageId ?? ''),
    queryFn: () =>
      apiFetch<{ package: AdPackageDetail }>(`${base(clientId!)}/${packageId}`),
    enabled: Boolean(clientId && packageId),
    select: (data) => data.package,
  });
}

export function useAdsStats(clientId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: adsKeys.stats(clientId ?? ''),
    queryFn: () => apiFetch<AdsStats>(`${base(clientId!)}/stats`),
    enabled: Boolean(clientId) && enabled,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────

export interface CreateAdPackageInput {
  name: string;
  objective: AdObjective;
  sourceType: AdSourceType;
  sourceId?: string | null;
  sourceIdea?: string | null;
  destination?: {
    kind: AdDestinationKind;
    sitePageId?: string | null;
    externalUrl?: string | null;
    socialProfile?: string | null;
  };
}

export function useCreateAdPackage(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdPackageInput) =>
      apiFetch<{ package: AdPackageDetail }>(base(clientId), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...adsKeys.all, 'list', clientId] });
      qc.invalidateQueries({ queryKey: adsKeys.stats(clientId) });
    },
  });
}

export interface UpdateAdPackageInput {
  name?: string;
  status?: 'DRAFT' | 'READY' | 'ARCHIVED';
  specialCategory?: AdSpecialCategory;
  reviewNotes?: string | null;
  acknowledgeReview?: boolean;
}

export function useUpdateAdPackage(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packageId,
      patch,
    }: {
      packageId: string;
      patch: UpdateAdPackageInput;
    }) =>
      apiFetch<{ package: AdPackageDetail }>(`${base(clientId)}/${packageId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(clientId, vars.packageId) });
      qc.invalidateQueries({ queryKey: [...adsKeys.all, 'list', clientId] });
      qc.invalidateQueries({ queryKey: adsKeys.stats(clientId) });
    },
  });
}

export interface GenerateAdInput {
  tone?: ReplyTone;
  regenerate?: 'creatives' | 'audience' | 'budget' | 'all';
}

export function useGenerateAdPackage(clientId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateAdInput = {}) =>
      apiFetch<{ package: AdPackageDetail }>(
        `${base(clientId)}/${packageId}/generate`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(clientId, packageId) });
    },
  });
}

export interface UpsertCreativeInput {
  variantIndex: number;
  channel?: AdChannel | null;
  headline: string;
  primaryText: string;
  description?: string | null;
  cta?: string | null;
  primaryAssetId?: string | null;
  additionalAssetIds?: string[];
  rationale?: string | null;
}

export function useUpsertCreative(clientId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertCreativeInput) =>
      apiFetch<{ creative: AdCreative }>(
        `${base(clientId)}/${packageId}/creatives/${input.variantIndex}`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(clientId, packageId) });
    },
  });
}

export function useDeleteCreative(clientId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creativeId: string) =>
      apiFetch<void>(`${base(clientId)}/${packageId}/creatives/${creativeId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(clientId, packageId) });
    },
  });
}

export interface AudiencePatch {
  locations?: AdAudienceLocation[];
  ageMin?: number | null;
  ageMax?: number | null;
  genders?: ('male' | 'female' | 'all')[];
  interests?: string[];
  customAudienceHints?: AdCustomAudienceHint[];
  languages?: string[];
}

export function useUpdateAudience(clientId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: AudiencePatch) =>
      apiFetch<{ audience: AdAudience }>(
        `${base(clientId)}/${packageId}/audience`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(clientId, packageId) });
    },
  });
}

export interface BudgetPatch {
  dailyBudgetCents?: number | null;
  totalBudgetCents?: number | null;
  currency?: string;
  durationDays?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export function useUpdateBudget(clientId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: BudgetPatch) =>
      apiFetch<{ budget: AdBudget }>(
        `${base(clientId)}/${packageId}/budget`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(clientId, packageId) });
    },
  });
}

export interface DestinationPatch {
  kind: AdDestinationKind;
  sitePageId?: string | null;
  externalUrl?: string | null;
  socialProfile?: string | null;
  utm?: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
    term?: string | null;
  } | null;
  pixelIds?: string[];
}

export function useUpdateDestination(clientId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: DestinationPatch) =>
      apiFetch<{ destination: AdDestination }>(
        `${base(clientId)}/${packageId}/destination`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adsKeys.detail(clientId, packageId) });
    },
  });
}

export interface ExportInput {
  // Ads-04+ — any format slug from useExportFormats() (e.g.
  // 'squadads_json', 'meta_launch_sheet', 'google_ads_editor_csv').
  // Server validates against the registry's enum; unknown values
  // are rejected with invalid_enum_value before the renderer runs.
  format?: string;
  // Ads-03 — explicit. Defaults to 'preview' on the server too,
  // so callers that previously sent only { format } are now safe:
  // a button labelled "Preview" no longer marks a package as
  // EXPORTED. Pass mode: 'download' for the real export.
  mode?: 'preview' | 'download';
}

export function useExportAdPackage(clientId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExportInput = {}) =>
      apiFetch<AdExportResult>(`${base(clientId)}/${packageId}/export`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      // Only invalidate when a download actually changed state on
      // the server (status flip + history append). Preview is a
      // pure read — re-fetching wastes a round-trip and would
      // flash the detail view's status pill for no reason.
      if (vars?.mode === 'download') {
        qc.invalidateQueries({ queryKey: adsKeys.detail(clientId, packageId) });
        qc.invalidateQueries({ queryKey: [...adsKeys.all, 'list', clientId] });
        qc.invalidateQueries({ queryKey: adsKeys.stats(clientId) });
      }
    },
  });
}

// Ads-09 — exporter catalog. The list is static for the lifetime of
// the deployed API, so we cache it indefinitely once fetched.
export function useExportFormats(clientId: string | undefined) {
  return useQuery({
    queryKey: adsKeys.exportFormats(clientId ?? ''),
    queryFn: () =>
      apiFetch<{ formats: ExportFormatDescriptor[] }>(
        `${base(clientId!)}/export-formats`,
      ),
    enabled: Boolean(clientId),
    select: (data) => data.formats,
    staleTime: 60 * 60 * 1000, // 1 hour — descriptor catalog rarely changes
  });
}
