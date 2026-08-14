'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  ExternalLink,
  Loader2,
  Zap,
  Check,
  Crown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useBillingSummary,
  useUsage,
  usePlans,
  useCreatePortal,
  useCreateCheckout,
  useChangePlan,
  useTrial,
  useStartTrial,
  hasBillableSubscription,
  type PlanTier,
  type PlanPricing,
} from '@/hooks/useBilling';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { PlanBadge } from '@/components/billing/PlanBadge';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { TIER_RANK, tierLabel } from '@/lib/tierConfig';
import { trackActivationEvent } from '@/lib/activationTracking';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ── Plan definitions ─────────────────────────────────────────────��────

function formatPrice(plans: PlanPricing[] | undefined, tier: PlanTier): string {
  if (tier === 'FREE') return '$0/mo';
  const p = plans?.find((pp) => pp.tier === tier);
  if (!p) return '…';
  const dollars = Math.round(p.amount / 100);
  return `$${dollars}/${p.interval === 'year' ? 'yr' : 'mo'}`;
}

interface PlanDef {
  tier: PlanTier;
  label: string;
  positioning: string;
  highlights: string[];
  autopilot: string;
  detailedLimits: string[];
  popular?: boolean;
}

const PLANS: PlanDef[] = [
  {
    tier: 'FREE',
    label: 'Free',
    positioning: 'For trying Squadpitch',
    highlights: [
      '1 workspace',
      '5 posts/mo',
      '1 connected channel',
      'Basic AI generation',
    ],
    autopilot: 'Not included',
    detailedLimits: [
      '10 images/mo',
      '1 video/mo',
      '1 GB storage',
      'Manual scheduling only',
    ],
  },
  {
    tier: 'STARTER',
    label: 'Solo',
    positioning: 'For getting consistent manually',
    highlights: [
      '3 workspaces',
      '30 posts/mo',
      'Up to 3 channels',
      'Basic scheduling',
    ],
    autopilot: 'Not included',
    detailedLimits: [
      '30 images/mo',
      '3 videos/mo',
      '5 GB storage',
      '30 AI image generations',
    ],
  },
  {
    tier: 'PRO',
    label: 'Pro',
    positioning: 'For automating your weekly content',
    popular: true,
    highlights: [
      '150 posts/mo',
      'Up to 5 channels',
      'Full scheduling + Autopilot',
      'Multi-platform posting',
    ],
    autopilot: 'Included',
    detailedLimits: [
      '75 images/mo',
      '10 videos/mo',
      '10 GB storage',
      '150 AI image generations',
    ],
  },
];

// ── Page ──────────────────────────────────────────────────────────────

export default function BillingSettingsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: billingSummary, isLoading: subLoading } = useBillingSummary(clientId);
  const { data: usage, isLoading: usageLoading } = useUsage(clientId);
  const { data: stripePlans } = usePlans();
  const portal = useCreatePortal();
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();
  const { data: trial } = useTrial();
  const startTrial = useStartTrial();
  const isLoading = subLoading || usageLoading;
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackActivationEvent('pricing_page_viewed', {}, { once: true });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading billing…</span>
      </div>
    );
  }

  const subscription = billingSummary?.subscription;
  const tier = usage?.tier ?? billingSummary?.effectiveTier ?? 'FREE';
  const hasSubscription = hasBillableSubscription(subscription);
  const isComped = billingSummary?.billingSource === 'INTERNAL';

  // Check if any limit is at capacity
  const atLimitFields: string[] = [];
  if (usage) {
    const checks: [string, number, number][] = [
      ['Post', usage.usage.posts, usage.limits.posts],
      ['Image', usage.usage.images, usage.limits.images],
      ['Video', usage.usage.videos, usage.limits.videos],
    ];
    for (const [label, current, limit] of checks) {
      if (isFinite(limit) && current >= limit) atLimitFields.push(label);
    }
    if (isFinite(usage.limits.totalStorageBytes) && usage.storage.totalBytes >= usage.limits.totalStorageBytes) {
      atLimitFields.push('Storage');
    }
  }

  const handlePlanAction = (planTier: PlanTier) => {
    trackActivationEvent('pricing_plan_cta_clicked', {
      meta: { currentPlan: tier, targetPlan: planTier },
    });
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
    changePlan.error?.message || checkout.error?.message || portal.error?.message || startTrial.error?.message;

  return (
    <div className="space-y-6 max-w-4xl">
      {mutationError && <StatusBanner error={mutationError} />}
      {changePlan.isSuccess && (
        <StatusBanner
          success
          message={`Plan ${changePlan.data?.isUpgrade ? 'upgraded' : 'changed'} to ${changePlan.data?.tier ?? 'new plan'}.`}
        />
      )}

      {trial?.active && trial.endsAt ? (
        <section className="rounded-2xl border border-accent-green-110/30 bg-accent-green-110/10 p-4 sm:p-6" aria-label="Free trial status">
          <h2 className="text-lg font-bold">Pro trial active</h2>
          <p className="mt-1 text-sm text-white-60">Your 14-day Pro trial ends {new Date(trial.endsAt).toLocaleDateString()}. There is no charge today.</p>
          <p className="mt-1 text-sm text-white-60">Add a payment method before then to keep Pro access. Otherwise Stripe will cancel the subscription automatically and your data will remain available on the Free plan.</p>
          <button className="mt-4 min-h-11 rounded-lg bg-accent-green-110 px-4 font-semibold text-sp-bg" onClick={() => portal.mutate({ returnUrl: window.location.href })}>Add payment method</button>
        </section>
      ) : trial?.eligible ? (
        <section className="rounded-2xl border border-accent-blue/30 bg-accent-blue/10 p-4 sm:p-6" aria-label="Free trial offer">
          <h2 className="text-lg font-bold">Try Pro free for 14 days</h2>
          <p className="mt-1 text-sm text-white-60">No card required and no charge today. Add payment details before the displayed end date to continue with Pro.</p>
          <button className="mt-4 min-h-11 rounded-lg bg-accent-blue px-4 font-semibold text-white" disabled={startTrial.isPending} onClick={() => startTrial.mutate()}>{startTrial.isPending ? 'Starting trial…' : 'Start 14-day Pro trial'}</button>
        </section>
      ) : trial?.consumed && !trial.active ? (
        <section className="rounded-2xl border border-white-10 bg-white-5 p-4 sm:p-6" aria-label="Free trial ended">
          <h2 className="text-lg font-bold">Your free trial has ended</h2>
          <p className="mt-1 text-sm text-white-60">Your data is still here. Choose a paid plan to restore Pro features.</p>
        </section>
      ) : null}

      {/* Plan Usage Summary */}
      {usage && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col gap-3 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white-100">Plan Usage</h2>
              <p className="text-sm text-white-40 mt-0.5">
                {isComped
                  ? `Your workspace has comped ${tierLabel(tier)} access. No payment is required.`
                  : tier === 'FREE'
                  ? 'You\'re on the Free plan. Upgrade to unlock more.'
                  : `You're on the ${tierLabel(tier)} plan.`}
              </p>
            </div>
            <PlanBadge tier={tier} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <UsageStat label="Posts" used={usage.usage.posts} limit={usage.limits.posts} />
            <UsageStat label="Images" used={usage.usage.images} limit={usage.limits.images} />
            <UsageStat label="Videos" used={usage.usage.videos} limit={usage.limits.videos} />
            <UsageStat
              label="Storage"
              used={usage.storage.totalBytes}
              limit={usage.limits.totalStorageBytes}
              formatValue={formatBytes}
            />
          </div>

          {usage.period?.end && (
            <p className="text-[10px] text-white-30">
              Resets {new Date(usage.period.end).toLocaleDateString()}
            </p>
          )}

          {Object.entries(usage.usage).some(([key, used]) => {
            const limit = usage.limits[key as keyof typeof usage.limits];
            return typeof limit === 'number' && isFinite(limit) && used > limit;
          }) && (
            <p className="rounded-lg bg-zone-yellow/10 px-3 py-2 text-xs text-zone-yellow">
              Historical usage can exceed the current plan limit after a plan change. Existing history is retained; further usage follows the current limit.
            </p>
          )}

          {(tier === 'FREE' || tier === 'STARTER') && (
            <button
              onClick={() => handlePlanAction('PRO')}
              disabled={checkout.isPending || changePlan.isPending}
              className="btn btn-primary flex min-h-11 items-center gap-1.5 text-xs"
            >
              {(checkout.isPending || changePlan.isPending) ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Upgrade to Pro — {formatPrice(stripePlans, 'PRO')}
            </button>
          )}
        </div>
      )}

      {/* Subscription Management */}
      {hasSubscription && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white-100">Subscription</h3>
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
            className="btn btn-secondary flex min-h-11 items-center gap-1.5 text-xs"
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
      )}

      {/* Plan Picker */}
      {!isComped && <div>
        <h2 className="text-lg font-bold text-white-100 mb-4">Choose your plan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              price={formatPrice(stripePlans, plan.tier)}
              currentTier={tier}
              hasSubscription={!!hasSubscription}
              isPending={checkout.isPending || changePlan.isPending}
              onAction={handlePlanAction}
            />
          ))}
        </div>
      </div>}

      {/* Detailed Usage */}
      {usage && (
        <div className="card p-5 space-y-5">
          <h3 className="text-sm font-semibold text-white-100">
            Detailed Usage
          </h3>

          {/* Content */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-white-40 uppercase tracking-wider">Content</h4>
            <UsageMeter label="Posts" current={usage.usage.posts} limit={usage.limits.posts} />
            <UsageMeter label="Images" current={usage.usage.images} limit={usage.limits.images} />
            <UsageMeter label="Videos" current={usage.usage.videos} limit={usage.limits.videos} />
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

// ── Plan Card ────────────────────────────────────────────────────────

function PlanCard({
  plan,
  price,
  currentTier,
  hasSubscription,
  isPending,
  onAction,
}: {
  plan: PlanDef;
  price: string;
  currentTier: PlanTier;
  hasSubscription: boolean;
  isPending: boolean;
  onAction: (tier: PlanTier) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isCurrent = plan.tier === currentTier;
  const isHigher = TIER_RANK[plan.tier] > TIER_RANK[currentTier];
  const isLower = TIER_RANK[plan.tier] < TIER_RANK[currentTier];

  return (
    <div
      className={`card p-5 space-y-3 relative flex flex-col ${
        plan.popular && !isCurrent
          ? 'border-accent-green-110/50 ring-1 ring-accent-green-110/20'
          : isCurrent
            ? 'border-accent-blue/50 ring-1 ring-accent-blue/20'
            : ''
      }`}
    >
      {/* Badges */}
      <div className="flex items-center gap-1.5">
        {plan.popular && (
          <span className="text-[10px] font-semibold text-accent-green-110 bg-accent-green-110/10 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Crown className="w-2.5 h-2.5" />
            Recommended
          </span>
        )}
        {isCurrent && (
          <span className="text-[10px] font-semibold text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded">
            Current
          </span>
        )}
      </div>

      {/* Name + Price */}
      <div>
        <h3 className="text-sm font-bold text-white-100">{plan.label}</h3>
        <p className="text-lg font-bold text-accent-green-110 mt-0.5">{price}</p>
        <p className="text-[11px] text-white-40 mt-0.5">{plan.positioning}</p>
      </div>

      {/* Highlights */}
      <ul className="space-y-1.5 flex-1">
        {plan.highlights.map((f) => (
          <li key={f} className="text-xs text-white-60 flex items-start gap-1.5">
            <Check className="w-3 h-3 text-accent-green-110 flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* Autopilot status */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-white-10">
        <Zap className={`w-3 h-3 ${plan.autopilot === 'Not included' ? 'text-white-20' : 'text-yellow-400'}`} />
        <span className={`text-[11px] font-medium ${plan.autopilot === 'Not included' ? 'text-white-30' : 'text-white-70'}`}>
          Autopilot: {plan.autopilot}
        </span>
      </div>

      {/* Detailed limits toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-[10px] text-white-30 hover:text-white-60 transition-colors flex items-center gap-1"
      >
        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showDetails ? 'Hide details' : 'View details'}
      </button>

      {showDetails && (
        <ul className="space-y-1">
          {plan.detailedLimits.map((l) => (
            <li key={l} className="text-[10px] text-white-40">{l}</li>
          ))}
        </ul>
      )}

      {/* CTA */}
      {isCurrent ? (
        <button
          disabled
          className="btn w-full text-xs flex items-center justify-center gap-1.5 opacity-50 cursor-default"
        >
          Current plan
        </button>
      ) : plan.tier === 'FREE' ? (
        // Don't show downgrade to Free as a prominent button
        isLower ? (
          <p className="text-[10px] text-white-30 text-center py-2">
            Contact support to downgrade
          </p>
        ) : null
      ) : (
        <button
          onClick={() => onAction(plan.tier)}
          disabled={isPending}
          className={`btn w-full text-xs flex items-center justify-center gap-1.5 ${
            isHigher
              ? plan.popular
                ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-120 font-semibold'
                : 'btn-primary'
              : 'btn-secondary'
          }`}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isHigher ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          {plan.popular && isHigher
            ? 'Upgrade to Pro'
            : hasSubscription
              ? isHigher ? 'Upgrade' : 'Downgrade'
              : 'Subscribe'}
        </button>
      )}

      {hasSubscription && !isCurrent && plan.tier !== 'FREE' && (
        <p className="text-[10px] text-white-30 text-center">
          {isHigher
            ? 'Prorated charge applied today'
            : 'Credit applied to next bill'}
        </p>
      )}
    </div>
  );
}

// ── Agency Card (full-width) ────────────────────────────────────────

function AgencyCard({
  plan,
  price,
  currentTier,
  hasSubscription,
  isPending,
  onAction,
}: {
  plan: PlanDef;
  price: string;
  currentTier: PlanTier;
  hasSubscription: boolean;
  isPending: boolean;
  onAction: (tier: PlanTier) => void;
}) {
  const isCurrent = plan.tier === currentTier;
  const isHigher = TIER_RANK[plan.tier] > TIER_RANK[currentTier];

  return (
    <div
      className={`card p-5 mt-4 ${
        isCurrent ? 'border-accent-blue/50 ring-1 ring-accent-blue/20' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white-100">{plan.label}</h3>
            <span className="text-lg font-bold text-accent-green-110">{price}</span>
            {isCurrent && (
              <span className="text-[10px] font-semibold text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded">
                Current
              </span>
            )}
          </div>
          <p className="text-[11px] text-white-40">{plan.positioning}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {plan.highlights.map((f) => (
              <span key={f} className="text-xs text-white-60 flex items-center gap-1">
                <Check className="w-3 h-3 text-accent-green-110 flex-shrink-0" />
                {f}
              </span>
            ))}
            <span className="text-xs text-white-60 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0" />
              Autopilot: {plan.autopilot}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          {isCurrent ? (
            <button disabled className="btn text-xs px-6 opacity-50 cursor-default">
              Current plan
            </button>
          ) : (
            <button
              onClick={() => onAction(plan.tier)}
              disabled={isPending}
              className={`btn text-xs px-6 flex items-center gap-1.5 ${isHigher ? 'btn-primary' : 'btn-secondary'}`}
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isHigher ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {hasSubscription ? (isHigher ? 'Upgrade' : 'Downgrade') : 'Subscribe'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Usage Stat (compact) ─────────────────────────────────────────────

function UsageStat({
  label,
  used,
  limit,
  formatValue,
}: {
  label: string;
  used: number;
  limit: number;
  formatValue?: (v: number) => string;
}) {
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());
  const pct = isFinite(limit) && limit > 0 ? Math.round((used / limit) * 100) : 0;
  const color = pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-orange-400' : 'text-white-100';

  return (
    <div>
      <p className="text-xs text-white-40 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>
        {fmt(used)}
        {isFinite(limit) && (
          <span className="text-xs text-white-30 font-normal"> / {fmt(limit)}</span>
        )}
      </p>
    </div>
  );
}
