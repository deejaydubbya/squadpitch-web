'use client';

import { ArrowUpRight, ArrowDownRight, CreditCard, ExternalLink, Loader2, Zap } from 'lucide-react';
import {
  useSubscription,
  useUsage,
  useCreatePortal,
  useCreateCheckout,
  useChangePlan,
  type PlanTier,
} from '@/hooks/useBilling';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { PlanBadge } from '@/components/billing/PlanBadge';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const PLANS: { tier: PlanTier; label: string; price: string; features: string[] }[] = [
  {
    tier: 'STARTER',
    label: 'Starter',
    price: '$19/mo',
    features: [
      '3 workspaces',
      '75 posts/mo',
      '30 images/mo',
      '3 videos/mo',
      '3 GB storage',
      'AI: 75 image + 5 video generations',
      '50 enhancement runs/mo',
    ],
  },
  {
    tier: 'PRO',
    label: 'Pro',
    price: '$49/mo',
    features: [
      '5 workspaces',
      '250 posts/mo',
      '75 images/mo',
      '10 videos/mo',
      '10 GB storage',
      'AI: 300 image + 15 video generations',
      '200 enhancement runs/mo',
    ],
  },
  {
    tier: 'GROWTH',
    label: 'Growth',
    price: '$99/mo',
    features: [
      '10 workspaces',
      '600 posts/mo',
      '200 images/mo',
      '30 videos/mo',
      '30 GB storage',
      'AI: 800 image + 40 video generations',
      '500 enhancement runs/mo',
    ],
  },
  {
    tier: 'AGENCY',
    label: 'Agency',
    price: '$199/mo',
    features: [
      'Unlimited workspaces',
      '1,200 posts/mo',
      '500 images/mo',
      '100 videos/mo',
      '100 GB storage',
      'AI: 2,000 image + 100 video generations',
      '1,500 enhancement runs/mo',
    ],
  },
];

export default function BillingSettingsPage() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const portal = useCreatePortal();
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();
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

  // Check if any limit is at capacity
  const atLimitFields: string[] = [];
  if (usage) {
    const checks: [string, number, number][] = [
      ['Post', usage.usage.posts, usage.limits.posts],
      ['Image', usage.usage.images, usage.limits.images],
      ['Video', usage.usage.videos, usage.limits.videos],
      ['Image generation', usage.usage.imageGenerations, usage.limits.imageGenerations],
      ['Video generation', usage.usage.videoGenerations, usage.limits.videoGenerations],
      ['Enhancement', usage.usage.enhancementRuns, usage.limits.enhancementRuns],
    ];
    for (const [label, current, limit] of checks) {
      if (isFinite(limit) && current >= limit) atLimitFields.push(label);
    }
    if (isFinite(usage.limits.totalStorageBytes) && usage.storage.totalBytes >= usage.limits.totalStorageBytes) {
      atLimitFields.push('Storage');
    }
  }

  const TIER_RANK: Record<PlanTier, number> = { FREE: 0, STARTER: 1, PRO: 2, GROWTH: 3, AGENCY: 4 };

  const handlePlanAction = (planTier: PlanTier) => {
    if (hasSubscription) {
      changePlan.mutate({ tier: planTier });
    } else {
      checkout.mutate({
        tier: planTier,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
    }
  };

  const mutationError =
    changePlan.error?.message || checkout.error?.message || portal.error?.message;

  return (
    <div className="space-y-6 max-w-3xl">
      {mutationError && <StatusBanner error={mutationError} />}
      {changePlan.isSuccess && (
        <StatusBanner
          success
          message={`Plan ${changePlan.data?.isUpgrade ? 'upgraded' : 'changed'} to ${changePlan.data?.tier ?? 'new plan'}.`}
        />
      )}

      {/* Free tier banner */}
      {tier === 'FREE' && !hasSubscription && (
        <div className="card p-5 border-accent-blue/30 bg-accent-blue/5 space-y-3">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white-100">You&apos;re on the Free plan</h3>
              <p className="text-xs text-white-60 mt-1">
                Free includes 1 workspace, 10 posts/mo, 5 images/mo, and 250 MB storage.
                Upgrade to unlock more workspaces, higher limits, and AI generation.
              </p>
            </div>
          </div>
          <button
            onClick={() => handlePlanAction('STARTER')}
            disabled={checkout.isPending}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            {checkout.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Upgrade to Starter — $19/mo
          </button>
        </div>
      )}

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

      {/* Plan picker */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === tier;
          const isHigher = TIER_RANK[plan.tier] > TIER_RANK[tier];
          const isPending = checkout.isPending || changePlan.isPending;

          return (
            <div
              key={plan.tier}
              className={`card p-5 space-y-3 ${
                isCurrent
                  ? 'border-accent-blue/50 ring-1 ring-accent-blue/20'
                  : plan.tier === 'PRO'
                  ? 'border-accent-green-110/50 ring-1 ring-accent-green-110/20'
                  : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white-100">
                    {plan.label}
                  </h3>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
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
              {isCurrent ? (
                <button
                  disabled
                  className="btn w-full text-xs flex items-center justify-center gap-1.5 opacity-50 cursor-default"
                >
                  Current plan
                </button>
              ) : (
                <button
                  onClick={() => handlePlanAction(plan.tier)}
                  disabled={isPending}
                  className={`btn w-full text-xs flex items-center justify-center gap-1.5 ${
                    isHigher ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isHigher ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {hasSubscription
                    ? isHigher ? 'Upgrade' : 'Downgrade'
                    : 'Subscribe'}
                </button>
              )}
              {hasSubscription && !isCurrent && (
                <p className="text-[10px] text-white-30 text-center">
                  {isHigher
                    ? 'Prorated charge applied today'
                    : 'Credit applied to next bill'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Usage — Grouped Layout */}
      {usage && (
        <div className="card p-5 space-y-5">
          <h3 className="text-sm font-semibold text-white-100">
            Monthly Usage
          </h3>

          {/* Content Creation */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-white-40 uppercase tracking-wider">Content Creation</h4>
            <UsageMeter label="Posts" current={usage.usage.posts} limit={usage.limits.posts} />
            <UsageMeter label="Images" current={usage.usage.images} limit={usage.limits.images} />
            <UsageMeter label="Videos" current={usage.usage.videos} limit={usage.limits.videos} />
          </div>

          {/* AI Generation */}
          <div className="space-y-3 pt-3 border-t border-white-10">
            <h4 className="text-xs font-medium text-white-40 uppercase tracking-wider">AI Generation</h4>
            <UsageMeter label="Image generations" current={usage.usage.imageGenerations} limit={usage.limits.imageGenerations} />
            <UsageMeter label="Video generations" current={usage.usage.videoGenerations} limit={usage.limits.videoGenerations} />
            <UsageMeter label="Enhancement runs" current={usage.usage.enhancementRuns} limit={usage.limits.enhancementRuns} />
          </div>

          {/* Storage */}
          <div className="space-y-3 pt-3 border-t border-white-10">
            <h4 className="text-xs font-medium text-white-40 uppercase tracking-wider">Storage</h4>
            <UsageMeter
              label="Total storage"
              current={usage.storage.totalBytes}
              limit={usage.limits.totalStorageBytes}
              formatValue={formatBytes}
            />
            <UsageMeter
              label="Video storage"
              current={usage.storage.videoBytes}
              limit={usage.limits.videoStorageBytes}
              formatValue={formatBytes}
            />
          </div>

          <p className="text-[10px] text-white-30">
            Usage counters reset on the 1st of each month. Storage is cumulative.
          </p>
        </div>
      )}

      {/* Upgrade prompts — show for any limit at capacity */}
      {atLimitFields.map((limitType) => (
        <UpgradePrompt key={limitType} currentTier={tier} limitType={limitType} />
      ))}
    </div>
  );
}
