'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, X, Zap, Loader2 } from 'lucide-react';
import {
  useSubscription,
  useCreateCheckout,
  useChangePlan,
  type PlanTier,
} from '@/hooks/useBilling';
import { trackActivationEvent } from '@/lib/activationTracking';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  features: string[];
  targetTier?: PlanTier;
  triggerSource: string;
  clientId?: string;
}

const TIER_RANK: Record<PlanTier, number> = { FREE: 0, STARTER: 1, PRO: 2, GROWTH: 3, AGENCY: 4 };

export function UpgradeModal({
  open,
  onClose,
  title,
  description,
  features,
  targetTier = 'PRO',
  triggerSource,
  clientId,
}: Props) {
  const { data: subscription } = useSubscription();
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();
  const trackedRef = useRef(false);

  const currentTier: PlanTier = subscription?.tier ?? 'FREE';
  const hasSubscription = !!subscription?.stripeSubscriptionId;
  const isPending = checkout.isPending || changePlan.isPending;

  // Auto-hide if already on target tier
  const alreadyQualified = TIER_RANK[currentTier] >= TIER_RANK[targetTier];

  useEffect(() => {
    if (!open || trackedRef.current || alreadyQualified) return;
    trackedRef.current = true;
    trackActivationEvent('upgrade_prompt_shown', {
      clientId,
      feature: triggerSource,
      meta: { currentPlan: currentTier, targetPlan: targetTier, triggerSource },
    });
  }, [open, alreadyQualified, clientId, currentTier, targetTier, triggerSource]);

  if (!open || alreadyQualified) return null;

  const handleUpgrade = () => {
    trackActivationEvent('upgrade_trigger_clicked', {
      clientId,
      feature: triggerSource,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-sp-card border border-white-10 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent-green-110/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent-green-110" />
            </div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white-40 hover:text-white hover:bg-white-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-white-50 leading-relaxed">{description}</p>

          {/* Feature checklist */}
          <ul className="space-y-2.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent-green-110 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-white-80">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Upgrade to {targetTier === 'PRO' ? 'Pro' : targetTier}
          </button>

          {/* Secondary link */}
          <Link
            href={clientId ? `/workspaces/${clientId}/settings/billing` : '/pricing'}
            className="block text-center text-xs text-white-40 hover:text-white-60 transition-colors"
          >
            View pricing plans
          </Link>
        </div>
      </div>
    </div>
  );
}
