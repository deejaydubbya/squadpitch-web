'use client';

import { cn } from '@/lib/utils';
import type { PlanTier } from '@/hooks/useBilling';
import { tierLabel } from '@/lib/tierConfig';

interface Props {
  tier: PlanTier;
  className?: string;
}

const TIER_STYLES: Record<PlanTier, string> = {
  FREE: 'bg-white-10 text-white-40',
  STARTER: 'bg-white-10 text-white-60',
  PRO: 'bg-accent-blue/20 text-accent-blue',
  GROWTH: 'bg-accent-green-110/20 text-accent-green-110',
  AGENCY: 'bg-accent-orange/20 text-accent-orange',
};

export function PlanBadge({ tier, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
        TIER_STYLES[tier],
        className
      )}
    >
      {tierLabel(tier)}
    </span>
  );
}
