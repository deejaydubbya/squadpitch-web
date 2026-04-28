'use client';

import { useEffect, useRef } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useCreateCheckout, useChangePlan, useSubscription, type PlanTier } from '@/hooks/useBilling';
import { trackActivationEvent } from '@/lib/activationTracking';

interface Props {
  currentTier: PlanTier;
  limitType: string;
}

export function UpgradePrompt({ currentTier, limitType }: Props) {
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();
  const { data: subscription } = useSubscription();
  const trackedRef = useRef(false);

  const hasSubscription = !!subscription?.stripeSubscriptionId;

  const nextTier: PlanTier = currentTier === 'FREE' ? 'PRO'
    : currentTier === 'STARTER' ? 'PRO'
    : currentTier === 'PRO' ? 'GROWTH' : 'AGENCY';
  const nextLabel = nextTier === 'PRO' ? 'Pro ($39/mo)'
    : nextTier === 'GROWTH' ? 'Growth ($79/mo)' : 'Agency ($159/mo)';

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackActivationEvent('limit_hit_viewed', {
      meta: { currentPlan: currentTier, limitType },
    });
  }, [currentTier, limitType]);

  if (currentTier === 'AGENCY') return null;

  const isPending = checkout.isPending || changePlan.isPending;

  const handleUpgrade = () => {
    trackActivationEvent('upgrade_trigger_clicked', {
      meta: { currentPlan: currentTier, targetPlan: nextTier, triggerSource: `limit_${limitType}` },
    });
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
            You&apos;ve used your monthly {limitType.toLowerCase()} limit
          </h3>
          <p className="text-xs text-white-60 mt-1">
            Upgrade to {nextLabel} for higher limits and keep creating.
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
