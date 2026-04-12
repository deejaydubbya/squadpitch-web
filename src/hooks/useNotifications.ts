'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Types ────────────────────────────────────────────────────────────────

export interface InAppNotification {
  id: string;
  userId: string;
  eventType: string;
  title: string;
  message: string;
  linkUrl: string | null;
  resourceType: string | null;
  resourceId: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  clientId: string | null;
  eventType: string;
  title: string;
  description: string | null;
  icon: string | null;
  linkUrl: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  digestEnabled: boolean;
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
      pushEnabled?: boolean;
      digestEnabled?: boolean;
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

// ── In-app inbox hooks ──────────────────────────────────────────────────

export function useInboxNotifications(filter = 'all', limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['notifications-inbox', filter, limit, offset],
    queryFn: () =>
      apiFetch<{ notifications: InAppNotification[]; total: number }>(
        `/notifications/inbox?filter=${filter}&limit=${limit}&offset=${offset}`,
      ),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () =>
      apiFetch<{ count: number }>('/notifications/inbox/unread-count').then((r) => r.count),
    refetchInterval: 30_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiFetch(`/notifications/inbox/${notificationId}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-inbox'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/notifications/inbox/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-inbox'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useActivityFeed(clientId?: string, limit = 20, offset = 0) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (clientId) params.set('clientId', clientId);
  return useQuery({
    queryKey: ['activity-feed', clientId, limit, offset],
    queryFn: () =>
      apiFetch<{ events: ActivityEvent[]; total: number }>(`/activity?${params}`),
  });
}

// ── Push notification hooks ───────────────────────────────────────────

export function useVapidKey() {
  return useQuery({
    queryKey: ['vapid-key'],
    queryFn: () =>
      apiFetch<{ publicKey: string | null }>('/notifications/push/vapid-key').then(
        (r) => r.publicKey,
      ),
    staleTime: Infinity,
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vapidPublicKey: string) => {
      // 1. Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 2. Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      } as PushSubscriptionOptionsInit);

      const json = subscription.toJSON();

      // 3. Send to backend
      await apiFetch('/notifications/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

export function usePushUnsubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await apiFetch('/notifications/push/subscribe', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint }),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

export function usePushPermissionState() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
    try {
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager?.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { permission, isSubscribed, refresh };
}
