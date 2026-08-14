'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

export interface ReferralDashboard {
  code: string;
  referralLink: string;
  rewardAmountCents: number;
  currency: string;
  pendingAmountCents: number;
  earnedAmountCents: number;
  referrals: Array<{ id: string; status: string; attributedAt: string; qualifiesAt: string | null; rewardedAt: string | null }>;
}

export function useReferralDashboard() {
  return useQuery({ queryKey: ['referrals', 'me'], queryFn: () => apiFetch<ReferralDashboard>('referrals/me') });
}
