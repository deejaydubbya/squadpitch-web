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
  trialConsumedAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  trialTier: PlanTier | null;
  trialState: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSubscriptionData {
  subscription: Subscription | null;
  effectiveTier?: PlanTier;
  billingSource: 'FREE' | 'STRIPE' | 'INTERNAL';
  internalEntitlement?: { tier: PlanTier; status: 'COMPED'; grantedAt: string } | null;
}

export function hasBillableSubscription(
  subscription: Subscription | null | undefined
): boolean {
  return Boolean(
    subscription?.stripeSubscriptionId &&
      ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(subscription.status)
  );
}

export interface UsageData {
  period: { start: string; end: string };
  usage: {
    posts: number;
    images: number;
    videos: number;
    imageGenerations: number;
    videoGenerations: number;
    enhancementRuns: number;
  };
  storage: {
    totalBytes: number;
    videoBytes: number;
  };
  limits: {
    workspaces: number;
    posts: number;
    images: number;
    videos: number;
    totalStorageBytes: number;
    videoStorageBytes: number;
    imageGenerations: number;
    videoGenerations: number;
    enhancementRuns: number;
  };
  tier: PlanTier;
  billingSource?: 'FREE' | 'STRIPE' | 'INTERNAL';
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
  remaining: {
    posts: number;
    images: number;
    videos: number;
    imageGenerations: number;
    videoGenerations: number;
    enhancementRuns: number;
  };
  usage: {
    posts: number;
    images: number;
    videos: number;
    imageGenerations: number;
    videoGenerations: number;
    enhancementRuns: number;
  };
  storage: {
    totalBytes: number;
    videoBytes: number;
  };
  limits: {
    workspaces: number;
    posts: number;
    images: number;
    videos: number;
    totalStorageBytes: number;
    videoStorageBytes: number;
    imageGenerations: number;
    videoGenerations: number;
    enhancementRuns: number;
  };
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

export interface PlanPricing {
  tier: PlanTier;
  priceId: string | null;
  amount: number; // cents
  currency: string;
  interval: string;
}

const billingKeys = {
  subscription: (clientId?: string) => ['billing', 'subscription', clientId ?? 'account'] as const,
  usage: (clientId?: string) => ['billing', 'usage', clientId ?? 'account'] as const,
  plans: ['billing', 'plans'] as const,
  trial: ['billing', 'trial'] as const,
  systemHealth: ['billing', 'system-health'] as const,
  remaining: ['billing', 'remaining'] as const,
  aiUsage: ['billing', 'ai-usage'] as const,
  aiCostBreakdown: ['billing', 'ai-cost-breakdown'] as const,
};

export interface TrialSummary {
  eligible: boolean; consumed: boolean; active: boolean; state: string | null;
  tier: PlanTier | null; startsAt: string | null; endsAt: string | null;
}

export function useTrial() {
  return useQuery({ queryKey: billingKeys.trial, queryFn: () => apiFetch<TrialSummary>('billing/trial') });
}

export function useStartTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Subscription>('billing/trial/start', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.trial });
      qc.invalidateQueries({ queryKey: ['billing', 'subscription'] });
      qc.invalidateQueries({ queryKey: ['billing', 'usage'] });
    },
  });
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription(),
    queryFn: () =>
      apiFetch<BillingSubscriptionData>('billing/subscription').then((result) => result.subscription),
  });
}

export function useBillingSummary(clientId: string) {
  return useQuery({
    queryKey: billingKeys.subscription(clientId),
    queryFn: () =>
      apiFetch<BillingSubscriptionData>(`billing/subscription?clientId=${encodeURIComponent(clientId)}`),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans,
    queryFn: () =>
      apiFetch<{ plans: PlanPricing[] }>('billing/plans').then((r) => r.plans),
    staleTime: 300_000, // 5 min — matches server cache
  });
}

export function useUsage(clientId?: string) {
  return useQuery({
    queryKey: billingKeys.usage(clientId),
    queryFn: () => apiFetch<UsageData>(`billing/usage${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`),
    refetchInterval: 60_000,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: {
      tier: PlanTier;
      successUrl: string;
      cancelUrl: string;
      idempotencyKey?: string;
    }) =>
      apiFetch<{ url: string }>('billing/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          idempotencyKey: data.idempotencyKey ?? crypto.randomUUID(),
        }),
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
      qc.invalidateQueries({ queryKey: ['billing', 'subscription'] });
      qc.invalidateQueries({ queryKey: ['billing', 'usage'] });
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
