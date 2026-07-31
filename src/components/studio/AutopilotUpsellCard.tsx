'use client';

import { useEffect, useState } from 'react';
import {
  Zap,
  Calendar,
  Sparkles,
  Radio,
  ArrowRight,
  CheckCircle2,
  X,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  hasBillableSubscription,
  useSubscription,
  useCreateCheckout,
  useChangePlan,
  type PlanTier,
} from '@/hooks/useBilling';
import { trackActivationEvent } from '@/lib/activationTracking';

// ── Types ────────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  base: string;
  postsCreatedCount: number;
  connectedChannelCount: number;
}

// ── Upsell card (dashboard placement) ────────────────────────────────────

export function AutopilotUpsellCard({
  clientId,
  base,
  postsCreatedCount,
  connectedChannelCount,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const { data: subscription } = useSubscription();
  const currentTier: PlanTier = subscription?.tier ?? 'FREE';
  const canEnableAutopilot = currentTier === 'PRO' || currentTier === 'GROWTH' || currentTier === 'AGENCY';

  useEffect(() => {
    trackActivationEvent('autopilot_upsell_viewed', {
      clientId,
      postsReadyCount: postsCreatedCount,
      connectedChannelCount,
    }, { once: true });
  }, [clientId, postsCreatedCount, connectedChannelCount]);

  return (
    <>
      <div className="rounded-2xl border border-yellow-400/20 bg-sp-card overflow-hidden">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-yellow-400/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Want Squadpitch to handle this every week?
            </h2>
          </div>
          <p className="text-sm text-white-40 ml-[42px] mb-5">
            Autopilot turns your content plan into a weekly system.
          </p>

          {/* Value bullets */}
          <div className="ml-[42px] space-y-2.5 mb-5">
            <ValueBullet icon={<Calendar className="w-3.5 h-3.5" />} text="Weekly content generation based on your brand" />
            <ValueBullet icon={<Sparkles className="w-3.5 h-3.5" />} text="Smart scheduling for optimal reach" />
            {connectedChannelCount > 1 && (
              <ValueBullet icon={<Radio className="w-3.5 h-3.5" />} text={`Post across ${connectedChannelCount} connected channels`} />
            )}
          </div>

          {/* CTAs — vary based on plan */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ml-[42px]">
            {canEnableAutopilot ? (
              <a
                href={`${base}/autopilot`}
                onClick={() => {
                  trackActivationEvent('autopilot_cta_clicked', {
                    clientId,
                    actionSource: 'upsell_card_enable',
                    connectedChannelCount,
                  });
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-sp-bg font-semibold text-sm hover:bg-yellow-300 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Turn on Autopilot
              </a>
            ) : (
              <button
                onClick={() => {
                  trackActivationEvent('autopilot_cta_clicked', {
                    clientId,
                    actionSource: 'upsell_card_upgrade',
                    connectedChannelCount,
                  });
                  setShowModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-sp-bg font-semibold text-sm hover:bg-yellow-300 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Upgrade to unlock Autopilot
              </button>
            )}
            <button
              onClick={() => {
                trackActivationEvent('autopilot_cta_clicked', {
                  clientId,
                  actionSource: 'upsell_card_secondary',
                });
                setShowModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm font-medium hover:bg-white-5 hover:text-white transition-colors"
            >
              See how it works
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <AutopilotDetailModal
          clientId={clientId}
          base={base}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ── Value bullet ─────────────────────────────────────────────────────────

function ValueBullet({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-yellow-400">{icon}</span>
      <span className="text-sm text-white-60">{text}</span>
    </div>
  );
}

// ── Detail modal ─────────────────────────────────────────────────────────

function AutopilotDetailModal({
  clientId,
  base,
  onClose,
}: {
  clientId: string;
  base: string;
  onClose: () => void;
}) {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const checkout = useCreateCheckout();
  const changePlan = useChangePlan();

  const currentTier: PlanTier = subscription?.tier ?? 'FREE';
  const hasSubscription = hasBillableSubscription(subscription);
  const canEnableAutopilot = currentTier === 'PRO' || currentTier === 'GROWTH' || currentTier === 'AGENCY';
  const isPending = checkout.isPending || changePlan.isPending;

  useEffect(() => {
    trackActivationEvent('autopilot_modal_viewed', { clientId }, { once: true });
    trackActivationEvent('autopilot_upgrade_prompt_viewed', {
      clientId,
      meta: { currentPlan: currentTier },
    }, { once: true });
  }, [clientId, currentTier]);

  const handleUpgrade = () => {
    trackActivationEvent('autopilot_upgrade_clicked', {
      clientId,
      actionSource: canEnableAutopilot ? 'enable' : 'upgrade',
      meta: { currentPlan: currentTier },
    });

    if (canEnableAutopilot) {
      // User has Pro+ plan — send to autopilot settings to enable
      window.location.href = `${base}/autopilot`;
      return;
    }

    // Free/Starter user — upgrade to Pro (autopilot is included with Pro)
    if (hasSubscription) {
      changePlan.mutate({ tier: 'PRO' });
    } else {
      checkout.mutate({
        tier: 'PRO',
        successUrl: `${window.location.origin}${base}/autopilot?upgraded=true`,
        cancelUrl: window.location.href,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-sp-card border border-white-10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-sp-card px-6 pt-6 pb-4 border-b border-white-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-yellow-400/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Autopilot</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white-40 hover:text-white hover:bg-white-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Section 1: Value */}
          <div>
            <h3 className="text-base font-semibold text-white mb-1.5">
              Never worry about posting again
            </h3>
            <p className="text-sm text-white-40 leading-relaxed">
              Autopilot creates a weekly content plan tailored to your brand, schedules posts across
              your connected channels, and keeps your audience engaged — all without manual effort.
            </p>
          </div>

          {/* Section 2: What happens */}
          <div className="rounded-xl border border-white-15 p-4 space-y-3">
            <p className="text-xs font-semibold text-white-50 uppercase tracking-wider">
              Each week, Squadpitch will
            </p>
            <StepRow icon={<Sparkles className="w-4 h-4" />} text="Generate fresh posts from your business data" />
            <StepRow icon={<CheckCircle2 className="w-4 h-4" />} text="Match your brand voice and content style" />
            <StepRow icon={<Calendar className="w-4 h-4" />} text="Schedule posts at optimal times" />
            <StepRow icon={<Radio className="w-4 h-4" />} text="Publish across all connected channels" />
          </div>

          {/* Section 3: Control */}
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-accent-green-110 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white-80">You stay in control</p>
              <p className="text-xs text-white-40 mt-0.5 leading-relaxed">
                Review every post before it goes live. Edit, reschedule, or pause anytime.
                Start in draft-only mode and upgrade when you&apos;re ready.
              </p>
            </div>
          </div>

          {/* Section 4: CTA */}
          <div className="border-t border-white-10 pt-5">
            {subLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-5 h-5 text-white-30 animate-spin" />
              </div>
            ) : canEnableAutopilot ? (
              <div className="space-y-3">
                <button
                  onClick={handleUpgrade}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 text-sp-bg font-semibold text-sm hover:bg-yellow-300 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Turn on Autopilot
                </button>
                <p className="text-[11px] text-white-30 text-center">
                  You&apos;re on the {currentTier.charAt(0) + currentTier.slice(1).toLowerCase()} plan. Autopilot is included.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-yellow-400/5 border border-yellow-400/15 p-4">
                  <p className="text-sm font-medium text-white-80 mb-1">
                    Autopilot is included with Pro
                  </p>
                  <p className="text-xs text-white-40">
                    Upgrade to Pro to unlock automatic content generation, smart scheduling, and
                    multi-platform publishing — $59/mo.
                  </p>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 text-sp-bg font-semibold text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Upgrade to Pro
                </button>
                <p className="text-[11px] text-white-30 text-center">
                  $59/mo. Cancel anytime.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-accent-green-110">{icon}</span>
      <span className="text-sm text-white-70">{text}</span>
    </div>
  );
}
