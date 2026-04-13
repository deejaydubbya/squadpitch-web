'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Types ────────────────────────────────────────────────────────────────

export type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'GROWTH' | 'AGENCY';
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

// ── New Types ───────────────────────────────────────────────────────────

export interface SystemHealth {
  services: { openai: string; fal: string; redis: string };
  budget: {
    openai: { spent: number; limit: number; percentage: number; status: string };
    fal: { spent: number; limit: number; percentage: number; status: string };
  };
}

export interface RemainingUsage {
  period: { start: string; end: string };
  tier: PlanTier;
  remaining: { posts: number; images: number; videos: number };
  usage: { posts: number; images: number; videos: number };
  limits: { posts: number; images: number; videos: number };
}

export interface AiUsageEntry {
  actionType: string;
  count: number;
  totalCostCents: number;
}

export interface AiCostEntry {
  model: string;
  count: number;
  totalCostCents: number;
}

// ── Query Keys ──────────────────────────────────────────────────────────

const billingKeys = {
  subscription: ['billing', 'subscription'] as const,
  usage: ['billing', 'usage'] as const,
  systemHealth: ['billing', 'system-health'] as const,
  remaining: ['billing', 'remaining'] as const,
  aiUsage: ['billing', 'ai-usage'] as const,
  aiCostBreakdown: ['billing', 'ai-cost-breakdown'] as const,
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

export interface ChangePlanResult {
  tier: PlanTier;
  previousTier: PlanTier;
  isUpgrade: boolean;
  currentPeriodEnd: string | null;
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tier: PlanTier }) =>
      apiFetch<ChangePlanResult>('billing/change-plan', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.subscription });
      qc.invalidateQueries({ queryKey: billingKeys.usage });
    },
  });
}

// ── System Health ────────────────────────────────────────────────────────

export function useSystemHealth() {
  return useQuery({
    queryKey: billingKeys.systemHealth,
    queryFn: () => apiFetch<SystemHealth>('billing/system-health'),
    refetchInterval: 30_000,
  });
}

// ── Remaining Usage ──────────────────────────────────────────────────────

export function useRemaining() {
  return useQuery({
    queryKey: billingKeys.remaining,
    queryFn: () => apiFetch<RemainingUsage>('billing/remaining'),
    refetchInterval: 60_000,
  });
}

// ── AI Usage ─────────────────────────────────────────────────────────────

export function useAiUsage() {
  return useQuery({
    queryKey: billingKeys.aiUsage,
    queryFn: () =>
      apiFetch<{ period: { start: string; end: string }; usage: AiUsageEntry[] }>(
        'billing/ai-usage'
      ),
  });
}

// ── AI Cost Breakdown ────────────────────────────────────────────────────

export function useAiCostBreakdown() {
  return useQuery({
    queryKey: billingKeys.aiCostBreakdown,
    queryFn: () =>
      apiFetch<{ period: { start: string; end: string }; breakdown: AiCostEntry[] }>(
        'billing/ai-cost-breakdown'
      ),
  });
}
