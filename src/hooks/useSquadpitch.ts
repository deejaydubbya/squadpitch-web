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
  | 'YOUTUBE'
  | 'BLOG';

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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  draftCount?: number;
  brandProfile?: BrandProfile | null;
  voiceProfile?: VoiceProfile | null;
  mediaProfile?: MediaProfile | null;
  channelSettings?: ChannelSettings[];
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
  variations: string[] | null;
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

export type MediaAssetSource = 'UPLOAD' | 'AI_GENERATED';
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateContentInput {
  clientId: string;
  kind: DraftKind;
  channel: Channel;
  bucketKey?: string;
  guidance: string;
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
  drafts: (filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'drafts', filters ?? {}] as const,
  draft: (id: string) => [...squadpitchKeys.all, 'draft', id] as const,
  assets: (clientId: string, filters?: Record<string, unknown>) =>
    [...squadpitchKeys.all, 'client', clientId, 'assets', filters ?? {}] as const,
  asset: (id: string) => [...squadpitchKeys.all, 'asset', id] as const,
};

// ── Clients ──────────────────────────────────────────────────────────────

export function useClients() {
  return useQuery({
    queryKey: squadpitchKeys.clients(),
    queryFn: () => apiFetch<{ clients: Client[] }>('clients'),
    select: (data) => data.clients,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: squadpitchKeys.client(id ?? ''),
    queryFn: () => apiFetch<Client>(`clients/${id}`),
    enabled: Boolean(id),
  });
}

export interface CreateClientInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClientInput) =>
      apiFetch<Client>('clients', {
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
      apiFetch<Client>(`clients/${id}`, {
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
      apiFetch<Client>(`clients/${id}`, { method: 'DELETE' }),
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
      apiFetch<{ brand: BrandProfile | null }>(`clients/${clientId}/brand`),
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
      apiFetch<{ brand: BrandProfile }>(`clients/${clientId}/brand`, {
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
      apiFetch<{ voice: VoiceProfile | null }>(`clients/${clientId}/voice`),
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
      apiFetch<{ voice: VoiceProfile }>(`clients/${clientId}/voice`, {
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
      apiFetch<{ media: MediaProfile | null }>(`clients/${clientId}/media`),
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
      apiFetch<{ media: MediaProfile }>(`clients/${clientId}/media`, {
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
      apiFetch<{ channels: ChannelSettings[] }>(`clients/${clientId}/channels`),
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
      apiFetch<{ channels: ChannelSettings[] }>(`clients/${clientId}/channels`, {
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
    queryFn: () => apiFetch<ClientAnalytics>(`clients/${clientId}/analytics`),
    enabled: Boolean(clientId),
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
        `clients/${clientId}/connections`
      ),
    select: (data) => data.connections,
    enabled: Boolean(clientId),
  });
}

export function useStartOAuth(clientId: string) {
  return useMutation({
    mutationFn: (channel: Channel) =>
      apiFetch<OAuthStartResponse>(
        `clients/${clientId}/connections/${channel}/oauth/start`,
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
      apiFetch<{ ok: true }>(`clients/${clientId}/connections/${channel}`, {
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
  const path = `clients/${clientId}/assets${qs ? `?${qs}` : ''}`;

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
        `/api/proxy/clients/${clientId}/assets/upload${qs ? `?${qs}` : ''}`,
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
