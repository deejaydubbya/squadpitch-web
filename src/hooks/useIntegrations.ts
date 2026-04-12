'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Slack Types ───────────────────────────────────────────────────────

export interface SlackConnection {
  id: string;
  userId: string;
  webhookUrl: string;
  channelName: string | null;
  isActive: boolean;
  subscribedEvents: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Webhook Types ─────────────────────────────────────────────────────

export interface OutboundWebhook {
  id: string;
  userId: string;
  targetUrl: string;
  secret?: string; // only returned on creation
  subscribedEvents: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  eventType: string;
  requestBody: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  status: string; // "pending" | "success" | "failed"
  attemptCount: number;
  createdAt: string;
}

// ── Slack Hooks ───────────────────────────────────────────────────────

export function useSlackConnection() {
  return useQuery({
    queryKey: ['slack-connection'],
    queryFn: () =>
      apiFetch<{ connection: SlackConnection | null }>('/integrations/slack').then(
        (r) => r.connection,
      ),
  });
}

export function useSaveSlackConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      webhookUrl: string;
      channelName?: string;
      subscribedEvents?: string[];
    }) =>
      apiFetch<{ connection: SlackConnection }>('/integrations/slack', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.connection),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slack-connection'] }),
  });
}

export function useUpdateSlackEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscribedEvents: string[]) =>
      apiFetch<{ connection: SlackConnection }>('/integrations/slack/events', {
        method: 'PUT',
        body: JSON.stringify({ subscribedEvents }),
      }).then((r) => r.connection),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slack-connection'] }),
  });
}

export function useToggleSlackActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) =>
      apiFetch('/integrations/slack/active', {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slack-connection'] }),
  });
}

export function useDeleteSlackConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/integrations/slack', { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slack-connection'] }),
  });
}

export function useTestSlack() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>('/integrations/slack/test', { method: 'POST' }),
  });
}

// ── Webhook Hooks ─────────────────────────────────────────────────────

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: () =>
      apiFetch<{ webhooks: OutboundWebhook[] }>('/integrations/webhooks').then(
        (r) => r.webhooks,
      ),
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { targetUrl: string; subscribedEvents?: string[] }) =>
      apiFetch<{ webhook: OutboundWebhook }>('/integrations/webhooks', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.webhook),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      targetUrl?: string;
      subscribedEvents?: string[];
      isActive?: boolean;
    }) =>
      apiFetch(`/integrations/webhooks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/integrations/webhooks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });
}

export function useWebhookLogs(webhookId: string) {
  return useQuery({
    queryKey: ['webhook-logs', webhookId],
    queryFn: () =>
      apiFetch<{ logs: WebhookDeliveryLog[] }>(
        `/integrations/webhooks/${webhookId}/logs`,
      ).then((r) => r.logs),
    enabled: !!webhookId,
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean; responseStatus: number }>(
        `/integrations/webhooks/${id}/test`,
        { method: 'POST' },
      ),
  });
}

// ── Generic Integration Types ────────────────────────────────────────

export interface Integration {
  id: string;
  userId: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  eventType: string;
  status: string; // "pending" | "success" | "failed"
  responseData: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
}

// ── Generic Integration Hooks ────────────────────────────────────────

export function useGenericIntegrations(type?: string) {
  const params = type ? `?type=${type}` : '';
  return useQuery({
    queryKey: ['integrations', type ?? 'all'],
    queryFn: () =>
      apiFetch<{ integrations: Integration[] }>(`/integrations${params}`).then(
        (r) => r.integrations,
      ),
  });
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; name: string; config?: Record<string, unknown> }) =>
      apiFetch<{ integration: Integration }>('/integrations', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.integration),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      config?: Record<string, unknown>;
      isActive?: boolean;
    }) =>
      apiFetch<{ integration: Integration }>(`/integrations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then((r) => r.integration),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/integrations/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useIntegrationLogs(integrationId: string) {
  return useQuery({
    queryKey: ['integration-logs', integrationId],
    queryFn: () =>
      apiFetch<{ logs: IntegrationLog[] }>(
        `/integrations/${integrationId}/logs`,
      ).then((r) => r.logs),
    enabled: !!integrationId,
  });
}

export function useTestIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/integrations/${id}/test`, { method: 'POST' }),
    onSuccess: (_d, id) =>
      qc.invalidateQueries({ queryKey: ['integration-logs', id] }),
  });
}

export function useRetryIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ integrationId, logId }: { integrationId: string; logId: string }) =>
      apiFetch<{ ok: boolean }>(`/integrations/${integrationId}/retry/${logId}`, {
        method: 'POST',
      }),
    onSuccess: (_d, { integrationId }) =>
      qc.invalidateQueries({ queryKey: ['integration-logs', integrationId] }),
  });
}

export function useAvailableIntegrationTypes() {
  return useQuery({
    queryKey: ['integration-types'],
    queryFn: () =>
      apiFetch<{ types: string[] }>('/integrations/types/available').then(
        (r) => r.types,
      ),
  });
}

// ── Media Import Types ──────────────────────────────────────────────

export interface MediaImportFile {
  id: string;
  name: string;
  path?: string;
  mimeType: string;
  size: number | null;
  thumbnailUrl: string | null;
  modifiedAt: string;
  isFolder: boolean;
}

// ── Media Import Hooks ──────────────────────────────────────────────

export function useMediaImportConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: 'google_drive' | 'dropbox' | 'google_sheets') =>
      apiFetch<{ authUrl: string }>(`/integrations/media-import/connect/${provider}`, {
        method: 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useMediaImportCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; state: string }) =>
      apiFetch<{ integration: Integration }>('/integrations/media-import/callback', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.integration),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useMediaImportFiles(integrationId: string, options?: Record<string, string>) {
  const params = new URLSearchParams(options ?? {}).toString();
  const qs = params ? `?${params}` : '';
  return useQuery({
    queryKey: ['media-import-files', integrationId, options],
    queryFn: () =>
      apiFetch<{ files: MediaImportFile[]; nextPageToken?: string; cursor?: string; hasMore?: boolean }>(
        `/integrations/media-import/${integrationId}/files${qs}`,
      ),
    enabled: !!integrationId,
  });
}

export function useMediaImportFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      integrationId,
      fileRef,
      clientId,
    }: {
      integrationId: string;
      fileRef: string;
      clientId: string;
    }) =>
      apiFetch<{ asset: Record<string, unknown> }>(
        `/integrations/media-import/${integrationId}/import`,
        {
          method: 'POST',
          body: JSON.stringify({ fileRef, clientId }),
        },
      ).then((r) => r.asset),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media-import-files'] }),
  });
}

export function useSheetsSpreadsheets(integrationId: string) {
  return useQuery({
    queryKey: ['sheets-spreadsheets', integrationId],
    queryFn: () =>
      apiFetch<{ spreadsheets: { id: string; name: string; modifiedAt: string }[] }>(
        `/integrations/media-import/${integrationId}/spreadsheets`,
      ).then((r) => r.spreadsheets),
    enabled: !!integrationId,
  });
}

export function useMediaExportFile() {
  return useMutation({
    mutationFn: ({
      integrationId,
      assetId,
      folderRef,
    }: {
      integrationId: string;
      assetId: string;
      folderRef?: string;
    }) =>
      apiFetch<{ ok: boolean; result: Record<string, unknown> }>(
        `/integrations/media-import/${integrationId}/export`,
        {
          method: 'POST',
          body: JSON.stringify({ assetId, folderRef }),
        },
      ),
  });
}

export function useMediaImportDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiFetch(`/integrations/media-import/${integrationId}/disconnect`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}
