'use client';

import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useSubscription, useUsage, useCreatePortal } from '@/hooks/useBilling';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PlanBadge } from '@/components/billing/PlanBadge';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';

export default function BillingSettingsPage() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const portal = useCreatePortal();

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
  const isAtPostLimit =
    usage && isFinite(usage.limits.posts) && usage.usage.posts >= usage.limits.posts;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Current Plan */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white-100">Subscription</h2>
            <p className="text-sm text-white-40 mt-0.5">
              Manage your billing and plan.
            </p>
          </div>
          <PlanBadge tier={tier} />
        </div>

        {subscription?.currentPeriodEnd && (
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

      {/* Upgrade prompt */}
      {isAtPostLimit && (
        <UpgradePrompt currentTier={tier} limitType="Post" />
      )}
    </div>
  );
}
