'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, Plug, Database, Zap } from 'lucide-react';
import {
  useAutopilotCampaignRecommendations,
  useAutopilotCampaignStats,
  useAutopilotStatus,
  useAutopilotActivity,
  useAutopilotRuns,
  useAutopilotReadiness,
  useGenerateAutopilotCampaign,
  useApproveAutopilotCampaign,
  useDismissAutopilotCampaign,
  useChannelSettings,
  type AutopilotCampaignRecommendation,
  type Channel,
} from '@/hooks/useSquadpitch';
import { isAutopilotCampaignInboxEnabled } from '@/lib/autopilotCampaignInbox';
import { AutopilotCampaignDetailModal } from '../AutopilotCampaignDetailModal';
import { CommandSummaryTiles } from './CommandSummaryTiles';
import { OpportunityHero } from './OpportunityHero';
import { OpportunityQueue, type QueueFilter } from './OpportunityQueue';
import { RunActivityPanel } from './RunActivityPanel';
import { pickHero, lastScanLabel } from './commandCenter.helpers';

interface AutopilotCommandCenterProps {
  clientId: string;
}

export function AutopilotCommandCenter({ clientId }: AutopilotCommandCenterProps) {
  if (!isAutopilotCampaignInboxEnabled()) {
    return <ComingSoonState />;
  }
  return <LiveCommandCenter clientId={clientId} />;
}

function ComingSoonState() {
  return (
    <section data-testid="autopilot-coming-soon" className="card p-5 border-white-10">
      <header className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white-5 text-white-50 flex items-center justify-center shrink-0">
          <Megaphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white-90 leading-tight">
            Opportunity Inbox
          </h2>
          <p className="text-xs text-white-50 mt-0.5">
            Coming soon — Autopilot will surface opportunities here as soon as
            the Opportunity Inbox is enabled.
          </p>
        </div>
      </header>
      <div className="rounded-lg border border-white-10 bg-white-3 p-4 text-xs text-white-60 leading-snug">
        For now, Autopilot can prepare drafts for review. Use the controls on
        the Settings tab to set its mode and connect your data sources.
      </div>
    </section>
  );
}

function LiveCommandCenter({ clientId }: AutopilotCommandCenterProps) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } =
    useAutopilotCampaignRecommendations(clientId);
  const { data: stats } = useAutopilotCampaignStats(clientId);
  const { data: status } = useAutopilotStatus(clientId);
  const { data: activity } = useAutopilotActivity(clientId);
  const { data: runsData } = useAutopilotRuns(clientId);
  const { data: readiness } = useAutopilotReadiness(clientId);
  const { data: channels } = useChannelSettings(clientId);

  const generateMutation = useGenerateAutopilotCampaign(clientId);
  const approveMutation = useApproveAutopilotCampaign(clientId);
  const dismissMutation = useDismissAutopilotCampaign(clientId);

  const [activeFilter, setActiveFilter] = useState<QueueFilter>('recommended');
  const [detailRecId, setDetailRecId] = useState<string | null>(null);

  const connectedChannels: Channel[] =
    channels?.filter((c) => c.isEnabled).map((c) => c.channel) ?? [];

  const recommendations = data?.recommendations ?? [];
  const hero = useMemo(() => pickHero(recommendations), [recommendations]);

  // Aggregate stats. Prefer the dedicated stats endpoint when
  // present; fall back to deriving from recommendations if not.
  const opportunities =
    stats?.pendingCount ??
    recommendations.filter((r) => r.status === 'pending').length;
  const draftsReady =
    stats?.readyCount ??
    recommendations.filter((r) => r.status === 'ready').length;
  const approvedCount = recommendations.filter(
    (r) => r.status === 'approved' || r.status === 'launched',
  ).length;
  const scheduledCount = recommendations.filter(
    (r) => r.status === 'launched',
  ).length;
  const lastScan = lastScanLabel(status?.lastActionAt ?? null);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleGenerate = (id: string) => {
    generateMutation.mutate(id, {
      onSuccess: (result) => {
        if (typeof window === 'undefined') return;
        if (result.alreadyGenerated) {
          window.alert(
            `Drafts already exist (${result.drafts.length}). Find them in your Drafts.`,
          );
          return;
        }
        if (result.status === 'failed') {
          window.alert(`Couldn't generate drafts: ${result.reason ?? 'unknown error'}`);
          return;
        }
        const skipped =
          result.skipped.length > 0
            ? `\n\nSkipped:\n${result.skipped.map((s) => `• ${s.channel}: ${s.reason}`).join('\n')}`
            : '';
        const headline =
          result.status === 'partial_success'
            ? `Generated ${result.drafts.length} draft${result.drafts.length === 1 ? '' : 's'} — some channels were skipped.`
            : `Generated ${result.drafts.length} draft${result.drafts.length === 1 ? '' : 's'}. Review them in your Drafts.`;
        window.alert(headline + skipped);
      },
      onError: (err: unknown) => {
        if (typeof window !== 'undefined') {
          window.alert(
            err instanceof Error ? err.message : 'Generate failed; please try again.',
          );
        }
      },
    });
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate(
      { recommendationId: id },
      {
        onSuccess: (result) => {
          if (typeof window === 'undefined') return;
          const approvedCount = result.drafts.filter((d) =>
            ['APPROVED', 'SCHEDULED', 'PUBLISHED'].includes(d.status),
          ).length;
          const errorRows = result.drafts.filter((d) => d.error);
          if (errorRows.length > 0) {
            const detail = errorRows
              .map((d) => `• ${d.channel}: ${d.error}`)
              .join('\n');
            window.alert(
              `${approvedCount} of ${result.drafts.length} drafts approved — some couldn't transition:\n${detail}`,
            );
            return;
          }
          window.alert(
            `${approvedCount} draft${approvedCount === 1 ? '' : 's'} approved. Review or schedule them from your Drafts.`,
          );
        },
        onError: (err: unknown) => {
          if (typeof window !== 'undefined') {
            window.alert(
              err instanceof Error
                ? err.message
                : 'Approve failed; please try again.',
            );
          }
        },
      },
    );
  };

  const handleDismiss = (id: string) => {
    dismissMutation.mutate({ recommendationId: id });
  };

  const handleViewDetails = (id: string) => {
    setDetailRecId(id);
  };

  const handleConvert = (id: string) => {
    const rec = recommendations.find((r) => r.id === id);
    if (!rec) return;
    const params = new URLSearchParams();
    params.set('intent', 'campaign');
    params.set('sourceType', 'property');
    params.set('sourceId', rec.listingDataItemId);
    params.set('campaignType', rec.suggestedCampaignType);
    params.set('autopilotRecId', rec.id);
    router.push(`/workspaces/${clientId}/create?${params.toString()}`);
  };

  const detailRec = recommendations.find((r) => r.id === detailRecId) ?? null;
  const generatingIds = new Set<string>(
    generateMutation.isPending && generateMutation.variables
      ? [String(generateMutation.variables)]
      : [],
  );

  // ── Render ────────────────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Determine which empty/setup variant to show (only when no recs).
  const hasNoRecs = recommendations.length === 0;
  const hasChannels = (readiness?.connectedChannels.length ?? 0) > 0;
  const hasData = (readiness?.totalDataItems ?? 0) > 0;

  return (
    <div className="space-y-5">
      <CommandSummaryTiles
        opportunities={opportunities}
        draftsReady={draftsReady}
        approved={approvedCount}
        scheduled={scheduledCount}
        lastScanLabel={lastScan}
        loading={isLoading}
      />

      <SafetyCallout />

      {hasNoRecs ? (
        <FirstRunEmptyState
          clientId={clientId}
          hasChannels={hasChannels}
          hasData={hasData}
        />
      ) : hero ? (
        <OpportunityHero
          recommendation={hero}
          onGenerate={handleGenerate}
          onApprove={handleApprove}
          onDismiss={handleDismiss}
          onViewDetails={handleViewDetails}
          isGenerating={generatingIds.has(hero.id)}
        />
      ) : null}

      {!hasNoRecs && (
        <OpportunityQueue
          recommendations={recommendations}
          excludeId={hero?.id ?? null}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onGenerate={handleGenerate}
          onApprove={handleApprove}
          onDismiss={handleDismiss}
          onViewDetails={handleViewDetails}
          generatingIds={generatingIds}
        />
      )}

      <RunActivityPanel
        runs={runsData?.runs}
        drafts={activity}
        loading={isLoading}
      />

      {detailRec && (
        <AutopilotCampaignDetailModal
          recommendation={detailRec}
          connectedChannels={connectedChannels}
          clientId={clientId}
          onApprove={() => {
            handleApprove(detailRec.id);
            setDetailRecId(null);
          }}
          onDismiss={() => {
            handleDismiss(detailRec.id);
            setDetailRecId(null);
          }}
          onConvert={() => {
            handleConvert(detailRec.id);
            setDetailRecId(null);
          }}
          onClose={() => setDetailRecId(null)}
        />
      )}
    </div>
  );
}

function SafetyCallout() {
  return (
    <p
      data-testid="autopilot-safety-callout"
      className="text-xs text-white-50 leading-relaxed bg-white-3 border border-white-10 rounded-xl px-4 py-3"
    >
      Autopilot watches your business for timely marketing opportunities,
      prepares campaign drafts, and waits for your approval before anything
      reaches your planner.
    </p>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5" data-testid="autopilot-loading">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4 border-white-10 h-20 animate-pulse" />
        ))}
      </div>
      <div className="card p-5 border-white-10 h-48 animate-pulse" />
      <div className="card p-5 border-white-10 h-40 animate-pulse" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-testid="autopilot-error"
      className="card p-5 border-red-500/20 text-center"
    >
      <p className="text-sm text-white-80 mb-3">
        We couldn&apos;t load Autopilot right now.
      </p>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

function FirstRunEmptyState({
  clientId,
  hasChannels,
  hasData,
}: {
  clientId: string;
  hasChannels: boolean;
  hasData: boolean;
}) {
  // Surface the most actionable missing piece first.
  const setupPrompt =
    !hasChannels
      ? {
          Icon: Plug,
          title: 'Connect a channel to get started',
          body: 'Autopilot needs at least one publishing channel to recommend campaigns.',
          ctaLabel: 'Connect a channel',
          href: `/workspaces/${clientId}/settings/channels`,
        }
      : !hasData
        ? {
            Icon: Database,
            title: 'Add listings or connect a data source',
            body: 'Autopilot looks at your listings, reviews, and open houses to find opportunities.',
            ctaLabel: 'Add data',
            href: `/workspaces/${clientId}/data`,
          }
        : null;

  return (
    <section
      data-testid="autopilot-empty"
      className="card p-8 border-white-10 text-center space-y-4"
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-green-110/10 mx-auto">
        <Zap className="w-6 h-6 text-accent-green-110" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white-100">
          No opportunities found yet
        </h3>
        <p className="text-sm text-white-50 mt-1 max-w-md mx-auto leading-relaxed">
          Autopilot will surface recommendations as soon as it detects new
          listings, reviews, open houses, or posting gaps.
        </p>
      </div>
      {setupPrompt && (
        <div className="max-w-md mx-auto rounded-xl border border-white-10 bg-white-3 p-4 text-left flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white-5 flex items-center justify-center shrink-0">
            <setupPrompt.Icon className="w-4 h-4 text-accent-green-110" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white-100">
              {setupPrompt.title}
            </p>
            <p className="text-xs text-white-50 mt-0.5">{setupPrompt.body}</p>
            <Link
              href={setupPrompt.href}
              className="inline-flex mt-2 px-3 py-1 rounded-md text-xs font-semibold bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20 transition-colors"
            >
              {setupPrompt.ctaLabel}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
