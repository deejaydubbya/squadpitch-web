'use client';

import { CreditCard, ExternalLink, Loader2, Zap } from 'lucide-react';
import {
  useSubscription,
  useUsage,
  useCreatePortal,
  useCreateCheckout,
  type PlanTier,
} from '@/hooks/useBilling';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PlanBadge } from '@/components/billing/PlanBadge';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';

const PLANS: { tier: PlanTier; label: string; price: string; features: string[] }[] = [
  {
    tier: 'STARTER',
    label: 'Starter',
    price: '$29/mo',
    features: ['1 client', '50 posts/mo', '20 images/mo'],
  },
  {
    tier: 'GROWTH',
    label: 'Growth',
    price: '$79/mo',
    features: ['3 clients', '200 posts/mo', '100 images/mo', '20 videos/mo'],
  },
  {
    tier: 'PRO',
    label: 'Pro',
    price: '$199/mo',
    features: ['Unlimited clients', '1,000 posts/mo', '500 images/mo', '100 videos/mo'],
  },
];

export default function BillingSettingsPage() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const portal = useCreatePortal();
  const checkout = useCreateCheckout();

  const isLoading = subLoading || usageLoading;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading billing…</span>
      </div>
    );
  }

  const tier = usage?.tier ?? 'STARTER';
  const hasSubscription = subscription?.stripeSubscriptionId;
  const isAtPostLimit =
    usage && isFinite(usage.limits.posts) && usage.usage.posts >= usage.limits.posts;

  const handleCheckout = (planTier: PlanTier) => {
    checkout.mutate({
      tier: planTier,
      successUrl: window.location.href,
      cancelUrl: window.location.href,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Current Plan */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white-100">Subscription</h2>
            <p className="text-sm text-white-40 mt-0.5">
              {hasSubscription
                ? 'Manage your billing and plan.'
                : 'Choose a plan to get started.'}
            </p>
          </div>
          <PlanBadge tier={tier} />
        </div>

        {hasSubscription && subscription?.currentPeriodEnd && (
          <p className="text-xs text-white-40">
            Current period ends:{' '}
            <span className="text-white-60">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
            {subscription.cancelAtPeriodEnd && (
              <span className="text-accent-orange ml-2">
                (Cancels at period end)
              </span>
            )}
          </p>
        )}

        {hasSubscription && (
          <button
            onClick={() =>
              portal.mutate({ returnUrl: window.location.href })
            }
            disabled={portal.isPending}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            {portal.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CreditCard className="w-3.5 h-3.5" />
            )}
            Manage subscription
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        )}
      </div>

      {/* Plan picker — shown when no subscription */}
      {!hasSubscription && (
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`card p-5 space-y-3 ${
                plan.tier === 'GROWTH'
                  ? 'border-accent-green-110/50 ring-1 ring-accent-green-110/20'
                  : ''
              }`}
            >
              <div>
                <h3 className="text-sm font-bold text-white-100">
                  {plan.label}
                </h3>
                <p className="text-lg font-bold text-accent-green-110 mt-1">
                  {plan.price}
                </p>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="text-xs text-white-60 flex items-center gap-1.5"
                  >
                    <span className="text-accent-green-110">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan.tier)}
                disabled={checkout.isPending}
                className="btn btn-primary w-full text-xs flex items-center justify-center gap-1.5"
              >
                {checkout.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                Subscribe
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Usage */}
      {usage && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white-100">
            Monthly usage
          </h3>

          <div className="space-y-3">
            <UsageMeter
              label="Posts"
              current={usage.usage.posts}
              limit={usage.limits.posts}
            />
            <UsageMeter
              label="Images"
              current={usage.usage.images}
              limit={usage.limits.images}
            />
            <UsageMeter
              label="Videos"
              current={usage.usage.videos}
              limit={usage.limits.videos}
            />
          </div>

          <p className="text-[10px] text-white-30">
            Usage resets on the 1st of each month.
          </p>
        </div>
      )}

      {/* Upgrade prompt */}
      {isAtPostLimit && (
        <UpgradePrompt currentTier={tier} limitType="Post" />
      )}
    </div>
  );
}
