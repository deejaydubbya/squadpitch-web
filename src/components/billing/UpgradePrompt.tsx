'use client';

import { Zap, Loader2 } from 'lucide-react';
import { useCreateCheckout, type PlanTier } from '@/hooks/useBilling';

interface Props {
  currentTier: PlanTier;
  limitType: string;
}

export function UpgradePrompt({ currentTier, limitType }: Props) {
  const checkout = useCreateCheckout();

  const nextTier: PlanTier = currentTier === 'STARTER' ? 'GROWTH' : 'PRO';
  const nextLabel = nextTier === 'GROWTH' ? 'Growth ($79/mo)' : 'Pro ($199/mo)';

  if (currentTier === 'PRO') return null;

  const handleUpgrade = () => {
    checkout.mutate({
      tier: nextTier,
      successUrl: window.location.href,
      cancelUrl: window.location.href,
    });
  };

  return (
    <div className="card p-5 border-accent-orange/30 bg-accent-orange/5 space-y-3">
      <div className="flex items-start gap-3">
        <Zap className="w-5 h-5 text-accent-orange flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-white-100">
            {limitType} limit reached
          </h3>
          <p className="text-xs text-white-60 mt-1">
            You&apos;ve used all your monthly {limitType.toLowerCase()}. Upgrade to {nextLabel} for higher limits.
          </p>
        </div>
      </div>
      <button
        onClick={handleUpgrade}
        disabled={checkout.isPending}
        className="btn btn-primary text-xs flex items-center gap-1.5"
      >
        {checkout.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Zap className="w-3.5 h-3.5" />
        )}
        Upgrade to {nextTier}
      </button>
    </div>
  );
}
