'use client';

import { ArrowUpRight, ArrowDownRight, CreditCard, ExternalLink, Loader2, Zap, Activity } from 'lucide-react';
import {
  useSubscription,
  useUsage,
  useCreatePortal,
  useCreateCheckout,
  useChangePlan,
  useAiUsage,
  useAiCostBreakdown,
  useSystemHealth,
  type PlanTier,
} from '@/hooks/useBilling';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { PlanBadge } from '@/components/billing/PlanBadge';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { cn } from '@/lib/utils';

const PLANS: { tier: PlanTier; label: string; price: string; features: string[] }[] = [
  {
    tier: 'STARTER',
    label: 'Starter',
    price: '$19/mo',
    features: ['3 workspaces', '50 posts/mo', '10 images/mo'],
  },
  {
    tier: 'PRO',
    label: 'Pro',
    price: '$49/mo',
    features: ['5 workspaces', '200 posts/mo', '50 images/mo', '5 videos/mo'],
  },
  {
    tier: 'GROWTH',
    label: 'Growth',
    price: '$99/mo',
    features: ['10 workspaces', '500 posts/mo', '150 images/mo', '20 videos/mo'],
  },
  {
    tier: 'AGENCY',
    label: 'Agency',
    price: '$199/mo',
    features: ['Unlimited workspaces', '1,000 posts/mo', '500 images/mo', '100 videos/mo'],
  },
];

const ACTION_LABELS: Record<string, string> = {
  POST: 'Posts generated',
  IMAGE: 'Images generated',
  VIDEO: 'Videos generated',
  IDEAS: 'Ideas generated',
};

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'healthy' ? 'bg-zone-green' :
    status === 'degraded' ? 'bg-yellow-400' :
    'bg-accent-red';
  return <span className={cn('inline-block w-2 h-2 rounded-full', color)} />;
}

export default function BillingSettingsPage() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const portal = useCreatePortal();
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();
  const { data: aiUsage } = useAiUsage();
  const { data: costBreakdown } = useAiCostBreakdown();
  const { data: health } = useSystemHealth();

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

  const TIER_RANK: Record<PlanTier, number> = { FREE: 0, STARTER: 1, PRO: 2, GROWTH: 3, AGENCY: 4 };

  const handlePlanAction = (planTier: PlanTier) => {
    if (hasSubscription) {
      // Existing subscriber — upgrade/downgrade via proration
      changePlan.mutate({ tier: planTier });
    } else {
      // No subscription — go through Stripe Checkout
      checkout.mutate({
        tier: planTier,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
    }
  };

  const mutationError =
    changePlan.error?.message || checkout.error?.message || portal.error?.message;

  // Total estimated cost from breakdown
  const totalCostCents = costBreakdown?.breakdown?.reduce((sum, e) => sum + e.totalCostCents, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {mutationError && <StatusBanner error={mutationError} />}
      {changePlan.isSuccess && (
        <StatusBanner
          success
          message={`Plan ${changePlan.data?.isUpgrade ? 'upgraded' : 'changed'} to ${changePlan.data?.tier ?? 'new plan'}.`}
        />
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

      {/* AI Usage This Month */}
      {aiUsage && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white-100">
              AI Usage This Month
            </h3>
            {totalCostCents > 0 && (
              <span className="text-xs font-mono text-white-40">
                ~${(totalCostCents / 100).toFixed(2)} est. cost
              </span>
            )}
          </div>

          <div className="space-y-2">
            {aiUsage.usage.length > 0 ? (
              aiUsage.usage.map((entry) => (
                <div key={entry.actionType} className="flex items-center justify-between">
                  <span className="text-xs text-white-60">
                    {ACTION_LABELS[entry.actionType] ?? entry.actionType}
                  </span>
                  <span className="text-xs font-mono text-white-40">
                    {entry.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-white-40 italic">No AI usage this month.</p>
            )}
          </div>
        </div>
      )}

      {/* System Status */}
      {health && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white-100 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Status
          </h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={health.services.openai} />
                <span className="text-xs text-white-60">OpenAI (text generation)</span>
              </div>
              <span className="text-[10px] text-white-40 capitalize">{health.services.openai}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={health.services.fal} />
                <span className="text-xs text-white-60">Fal (image/video)</span>
              </div>
              <span className="text-[10px] text-white-40 capitalize">{health.services.fal}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={health.services.redis} />
                <span className="text-xs text-white-60">Redis (queues)</span>
              </div>
              <span className="text-[10px] text-white-40 capitalize">{health.services.redis}</span>
            </div>
          </div>

          {/* Budget bars */}
          <div className="space-y-2 pt-2 border-t border-white-10">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white-40">OpenAI budget</span>
                <span className="text-[10px] font-mono text-white-40">{health.budget.openai.percentage}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white-10 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    health.budget.openai.status === 'exceeded' ? 'bg-accent-red' :
                    health.budget.openai.status === 'warning' ? 'bg-accent-orange' : 'bg-accent-green-110'
                  )}
                  style={{ width: `${Math.min(health.budget.openai.percentage, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white-40">Fal budget</span>
                <span className="text-[10px] font-mono text-white-40">{health.budget.fal.percentage}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white-10 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    health.budget.fal.status === 'exceeded' ? 'bg-accent-red' :
                    health.budget.fal.status === 'warning' ? 'bg-accent-orange' : 'bg-accent-green-110'
                  )}
                  style={{ width: `${Math.min(health.budget.fal.percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade prompt */}
      {isAtPostLimit && (
        <UpgradePrompt currentTier={tier} limitType="Post" />
      )}
    </div>
  );
}
