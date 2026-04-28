'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  ArrowRight,
  CheckCircle2,
  LinkIcon,
  Database,
  Sparkles,
  FileText,
  Radio,
  Palette,
} from 'lucide-react';
import {
  useClientAnalytics,
  useChannelSettings,
  useClient,
  useDashboardRecommendations,
} from '@/hooks/useSquadpitch';
import type { SourceEntry } from '@/lib/onboarding/types';
import { trackActivationEvent, setActivationFlag } from '@/lib/activationTracking';

const SOURCE_TYPE_LABELS: Record<string, string> = {
  website: 'Website',
  description: 'Description',
  documents: 'Documents',
  photos: 'Photos',
  listing_link: 'Listing link',
  feed_link: 'Feed link',
  zillow: 'Zillow profile',
  license: 'License lookup',
  crm: 'CRM import',
};

interface OnboardingWelcomeProps {
  clientId: string;
  onDismiss: () => void;
}

export function OnboardingWelcome({ clientId, onDismiss }: OnboardingWelcomeProps) {
  const { data: client } = useClient(clientId);
  const { data: analytics } = useClientAnalytics(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const { data: recommendations } = useDashboardRecommendations(clientId);

  const sourceEntries = useMemo<SourceEntry[]>(() => {
    try {
      const raw = localStorage.getItem(`sp_onboarding_sources_${clientId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [clientId]);

  const base = `/workspaces/${clientId}`;
  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];
  const hasChannels = enabledChannels.length > 0;

  const postsReady =
    (analytics?.byStatus?.DRAFT ?? 0) + (analytics?.byStatus?.APPROVED ?? 0);
  const sourcesUsed = sourceEntries.length;
  const totalDataItems = recommendations?.summary?.totalDataItems ?? 0;
  const hasBrand = Boolean(client?.brandProfile?.description || client?.voiceProfile?.tone);
  const clientName = client?.name ?? 'your business';

  // Primary CTA routing
  const primaryHref = postsReady > 0 ? `${base}/first-post` : `${base}/create`;
  const primaryLabel = postsReady > 0 ? 'Review your first post' : 'Create your first post';

  // Secondary CTA
  const secondaryHref = !hasChannels ? `${base}/settings/channels` : `${base}/planner`;
  const secondaryLabel = !hasChannels ? 'Connect channels' : 'View content planner';

  // ── Activation tracking ─────────────────────────────────────────────
  useEffect(() => {
    trackActivationEvent('onboarding_handoff_viewed', {
      clientId,
      industry: client?.industryKey,
      connectedChannelCount: enabledChannels.length,
      postsReadyCount: postsReady,
    }, { once: true });
    setActivationFlag('handoff_viewed', clientId);
  }, [clientId, client?.industryKey, enabledChannels.length, postsReady]);

  const handleCtaClick = (label: string) => {
    trackActivationEvent('onboarding_handoff_cta_clicked', {
      clientId,
      postsReadyCount: postsReady,
      connectedChannelCount: enabledChannels.length,
      actionSource: label,
    });
  };

  return (
    <div className="rounded-2xl border border-accent-green-110/30 bg-sp-card overflow-hidden">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="relative px-5 sm:px-6 pt-6 pb-5">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white-40 hover:text-white hover:bg-white-10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-full bg-accent-green-110/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-accent-green-110" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Your content system is ready
          </h2>
        </div>

        <p className="text-sm text-white-60 ml-[42px] leading-relaxed">
          {postsReady > 0
            ? `Squadpitch analyzed your sources and created ${postsReady} post${postsReady !== 1 ? 's' : ''} for ${clientName}. Review, approve, and publish when you're ready.`
            : `Everything is set up for ${clientName}. Start creating content and Squadpitch will handle the rest.`}
        </p>

        {/* ── Summary row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 ml-[42px]">
          <SummaryStat
            icon={<FileText className="w-3.5 h-3.5" />}
            value={postsReady}
            label="Posts ready"
            accent={postsReady > 0 ? 'text-accent-green-110' : 'text-white-30'}
          />
          <SummaryStat
            icon={<Database className="w-3.5 h-3.5" />}
            value={sourcesUsed || totalDataItems}
            label="Sources used"
            accent={sourcesUsed > 0 || totalDataItems > 0 ? 'text-purple-400' : 'text-white-30'}
          />
          <SummaryStat
            icon={<Radio className="w-3.5 h-3.5" />}
            value={enabledChannels.length}
            label={enabledChannels.length === 1 ? 'Channel connected' : 'Channels connected'}
            accent={hasChannels ? 'text-blue-400' : 'text-white-30'}
          />
          <SummaryStat
            icon={<Palette className="w-3.5 h-3.5" />}
            value={hasBrand ? 1 : 0}
            label="Brand captured"
            isBoolean
            accent={hasBrand ? 'text-orange-400' : 'text-white-30'}
          />
        </div>

        {/* ── CTAs ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mt-6 ml-[42px]">
          <Link
            href={primaryHref}
            onClick={() => handleCtaClick(primaryLabel)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
          >
            {primaryLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={secondaryHref}
            onClick={() => handleCtaClick(secondaryLabel)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white-5 border border-white-10 text-white-70 font-medium text-sm hover:bg-white-10 hover:text-white transition-colors"
          >
            {!hasChannels && <LinkIcon className="w-3.5 h-3.5" />}
            {secondaryLabel}
          </Link>
        </div>
      </div>

      {/* ── What happens next ─────────────────────────────────── */}
      <div className="px-5 sm:px-6 py-4 border-t border-white-10 bg-white-5/30">
        <p className="text-[11px] font-semibold text-white-40 uppercase tracking-wider mb-3">
          What happens next
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <StepItem step={1} label="Review your generated posts" done={postsReady > 0} />
          <StepItem step={2} label="Connect a publishing channel" done={hasChannels} />
          <StepItem step={3} label="Schedule or publish" done={false} />
          <StepItem step={4} label="Squadpitch keeps recommending" done={false} icon={<Sparkles className="w-3 h-3" />} />
        </div>

        {/* Sources used — compact */}
        {sourceEntries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-white-5">
            <span className="text-[10px] text-white-30 uppercase tracking-wider mr-1 leading-[22px]">Sources:</span>
            {sourceEntries.map((entry) => (
              <span
                key={entry.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white-5 text-[10px] text-white-50"
              >
                {SOURCE_TYPE_LABELS[entry.sourceType] ?? entry.sourceType}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function SummaryStat({
  icon,
  value,
  label,
  accent,
  isBoolean,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent: string;
  isBoolean?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={accent}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white-100 leading-none">
          {isBoolean ? (value > 0 ? 'Yes' : 'No') : value}
        </p>
        <p className="text-[10px] text-white-40 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function StepItem({
  step,
  label,
  done,
  icon,
}: {
  step: number;
  label: string;
  done: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-px ${
        done ? 'bg-accent-green-110/20' : 'bg-white-5'
      }`}>
        {done ? (
          <CheckCircle2 className="w-3 h-3 text-accent-green-110" />
        ) : icon ? (
          <span className="text-white-30">{icon}</span>
        ) : (
          <span className="text-[10px] font-semibold text-white-30">{step}</span>
        )}
      </div>
      <span className={`text-xs leading-tight ${done ? 'text-white-60' : 'text-white-40'}`}>
        {label}
      </span>
    </div>
  );
}
