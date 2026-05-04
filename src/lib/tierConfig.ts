import type { PlanTier } from '@/hooks/useBilling';

/** Numeric rank for tier comparison. */
export const TIER_RANK: Record<PlanTier, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  GROWTH: 3,
  AGENCY: 4,
};

/** User-facing display names (STARTER→"Solo", GROWTH→"Team"). */
export const TIER_DISPLAY_LABELS: Record<PlanTier, string> = {
  FREE: 'Free',
  STARTER: 'Solo',
  PRO: 'Pro',
  GROWTH: 'Team',
  AGENCY: 'Agency',
};

/** Return the user-facing label for a tier. */
export function tierLabel(tier: PlanTier): string {
  return TIER_DISPLAY_LABELS[tier];
}

/** Check whether `current` tier is at or above `target`. */
export function isAtOrAboveTier(current: PlanTier, target: PlanTier): boolean {
  return TIER_RANK[current] >= TIER_RANK[target];
}
