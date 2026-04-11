'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Types ────────────────────────────────────────────────────────────────

export type PlanTier = 'STARTER' | 'GROWTH' | 'PRO';
export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  tier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageData {
  period: { start: string; end: string };
  usage: {
    posts: number;
    images: number;
    videos: number;
  };
  limits: {
    clients: number;
    posts: number;
    images: number;
    videos: number;
  };
  tier: PlanTier;
}

// ── Query Keys ──────────────────────────────────────────────────────────

const billingKeys = {
  subscription: ['billing', 'subscription'] as const,
  usage: ['billing', 'usage'] as const,
};

// ── Hooks ───────────────────────────────────────────────────────────────

export function useSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription,
    queryFn: () =>
      apiFetch<{ subscription: Subscription | null }>('billing/subscription').then(
        (r) => r.subscription
      ),
  });
}

export function useUsage() {
  return useQuery({
    queryKey: billingKeys.usage,
    queryFn: () => apiFetch<UsageData>('billing/usage'),
    refetchInterval: 60_000,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: {
      tier: PlanTier;
      successUrl: string;
      cancelUrl: string;
    }) =>
      apiFetch<{ url: string }>('billing/checkout-session', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      if (result.url) window.location.href = result.url;
    },
  });
}

export function useCreatePortal() {
  return useMutation({
    mutationFn: (data: { returnUrl: string }) =>
      apiFetch<{ url: string }>('billing/portal-session', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      if (result.url) window.location.href = result.url;
    },
  });
}
