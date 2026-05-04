'use client';

import { useEffect, useRef } from 'react';
import { Zap, Loader2, ArrowRight } from 'lucide-react';
import { useSubscription, useCreateCheckout, useChangePlan, type PlanTier } from '@/hooks/useBilling';
import { TIER_RANK } from '@/lib/tierConfig';
import { trackActivationEvent } from '@/lib/activationTracking';

interface Props {
  /** Identifies the trigger source (e.g. 'post_onboarding', 'weekly_plan', 'autopilot', 'limit_approach', 'limit_hit') */
  triggerSource: string;
  headline: string;
  subtext: string;
  cta?: string;
  targetTier?: PlanTier;
  clientId?: string;
}

export function UpgradeTriggerBanner({
  triggerSource,
  headline,
  subtext,
  cta = 'Upgrade to Pro',
  targetTier = 'PRO',
  clientId,
}: Props) {
  const { data: subscription } = useSubscription();
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();
  const trackedRef = useRef(false);

  const currentTier: PlanTier = subscription?.tier ?? 'FREE';
  const hasSubscription = !!subscription?.stripeSubscriptionId;
  const isPending = checkout.isPending || changePlan.isPending;

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackActivationEvent('upgrade_trigger_viewed', {
      clientId,
      meta: { currentPlan: currentTier, targetPlan: targetTier, triggerSource },
    });
  }, [clientId, currentTier, targetTier, triggerSource]);

  // Don't show upgrade banner if user is already on the target tier or higher
  if (TIER_RANK[currentTier] >= TIER_RANK[targetTier]) return null;

  const handleUpgrade = () => {
    trackActivationEvent('upgrade_trigger_clicked', {
      clientId,
      meta: { currentPlan: currentTier, targetPlan: targetTier, triggerSource },
    });

    if (hasSubscription) {
      changePlan.mutate({ tier: targetTier });
    } else {
      checkout.mutate({
        tier: targetTier,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
    }
  };

  return (
    <div className="rounded-xl border border-accent-green-110/20 bg-accent-green-110/5 p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white-80">{headline}</p>
        <p className="text-xs text-white-40 mt-0.5">{subtext}</p>
      </div>
      <button
        onClick={handleUpgrade}
        disabled={isPending}
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-green-110 text-sp-bg text-xs font-semibold hover:bg-accent-green-120 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Zap className="w-3 h-3" />
        )}
        {cta}
      </button>
    </div>
  );
}
