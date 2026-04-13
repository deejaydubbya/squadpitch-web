'use client';

import { Zap, Loader2 } from 'lucide-react';
import { useCreateCheckout, useChangePlan, useSubscription, type PlanTier } from '@/hooks/useBilling';

interface Props {
  currentTier: PlanTier;
  limitType: string;
}

export function UpgradePrompt({ currentTier, limitType }: Props) {
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();
  const { data: subscription } = useSubscription();

  const hasSubscription = !!subscription?.stripeSubscriptionId;

  const nextTier: PlanTier = currentTier === 'FREE' ? 'STARTER'
    : currentTier === 'STARTER' ? 'PRO'
    : currentTier === 'PRO' ? 'GROWTH' : 'AGENCY';
  const nextLabel = nextTier === 'STARTER' ? 'Starter ($19/mo)'
    : nextTier === 'PRO' ? 'Pro ($49/mo)'
    : nextTier === 'GROWTH' ? 'Growth ($99/mo)' : 'Agency ($199/mo)';

  if (currentTier === 'AGENCY') return null;

  const isPending = checkout.isPending || changePlan.isPending;

  const handleUpgrade = () => {
    if (hasSubscription) {
      changePlan.mutate({ tier: nextTier });
    } else {
      checkout.mutate({
        tier: nextTier,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
    }
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
          {hasSubscription && (
            <p className="text-[10px] text-white-30 mt-1">
              You&apos;ll be charged a prorated amount today.
            </p>
          )}
        </div>
      </div>
      <button
        onClick={handleUpgrade}
        disabled={isPending}
        className="btn btn-primary text-xs flex items-center gap-1.5"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Zap className="w-3.5 h-3.5" />
        )}
        Upgrade to {nextTier}
      </button>
    </div>
  );
}
