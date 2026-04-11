'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Types ────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber: string | null;
  preferencesJson: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  eventType: string;
  channel: string; // "email" | "sms"
  status: string; // "queued" | "sent" | "failed" | "skipped"
  provider: string | null; // "postmark" | "twilio"
  providerMessageId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      apiFetch<{ preferences: NotificationPreferences }>('/notifications/preferences').then(
        (r) => r.preferences,
      ),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      phoneNumber?: string | null;
      preferencesJson?: Record<string, boolean>;
    }) =>
      apiFetch<{ preferences: NotificationPreferences }>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then((r) => r.preferences),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });
}

export function useNotificationLogs(limit = 50) {
  return useQuery({
    queryKey: ['notification-logs', limit],
    queryFn: () =>
      apiFetch<{ logs: NotificationLog[] }>(`/notifications/logs?limit=${limit}`).then(
        (r) => r.logs,
      ),
  });
}
