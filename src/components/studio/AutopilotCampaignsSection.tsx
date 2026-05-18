'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Zap, ArrowRight, TrendingDown, Home, CalendarCheck } from 'lucide-react';
import {
  useAutopilotCampaignRecommendations,
  useGenerateAutopilotCampaign,
  useApproveAutopilotCampaign,
  useDismissAutopilotCampaign,
  useConvertAutopilotCampaign,
  useChannelSettings,
  type AutopilotCampaignRecommendation,
  type Channel,
} from '@/hooks/useSquadpitch';
import { isAutopilotCampaignInboxEnabled } from '@/lib/autopilotCampaignInbox';
import { cn } from '@/lib/utils';
import { AutopilotCampaignCard } from './AutopilotCampaignCard';
import { AutopilotCampaignDetailModal } from './AutopilotCampaignDetailModal';

type FilterTab = 'needs_review' | 'approved' | 'dismissed' | 'all';

interface AutopilotCampaignsSectionProps {
  clientId: string;
}

export function AutopilotCampaignsSection({ clientId }: AutopilotCampaignsSectionProps) {
  // Campaign Inbox MVP backend doesn't ship until Phase 2 of the
  // audit doc. Until the env flag flips, render a calm
  // coming-soon state. Component tree stays mounted so Phase 2
  // can wire the backend without a UI rewrite.
  if (!isAutopilotCampaignInboxEnabled()) {
    return <CampaignInboxComingSoon />;
  }
  return <CampaignInboxLive clientId={clientId} />;
}

function CampaignInboxComingSoon() {
  return (
    <section className="card p-5">
      <header className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white-5 text-white-50 flex items-center justify-center shrink-0">
          <Megaphone className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white-90 leading-tight">
            Campaign Recommendations
          </h2>
          <p className="text-xs text-white-50 mt-0.5">
            Coming soon — Autopilot will surface opportunities here as soon as
            the Campaign Inbox is enabled.
          </p>
        </div>
      </header>
      <div className="rounded-lg border border-white-10 bg-white-3 p-4 text-xs text-white-60 leading-snug">
        For now, Autopilot can prepare drafts for review. Use the controls below
        to set its mode and connect your data sources.
      </div>
    </section>
  );
}

function CampaignInboxLive({ clientId }: AutopilotCampaignsSectionProps) {
  const router = useRouter();
  const { data, isLoading, isError } = useAutopilotCampaignRecommendations(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const generateMutation = useGenerateAutopilotCampaign(clientId);
  const approveMutation = useApproveAutopilotCampaign(clientId);
  const dismissMutation = useDismissAutopilotCampaign(clientId);
  const convertMutation = useConvertAutopilotCampaign(clientId);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('needs_review');
  const [detailRecId, setDetailRecId] = useState<string | null>(null);

  const connectedChannels: Channel[] = channels
    ?.filter((c) => c.isEnabled)
    .map((c) => c.channel) ?? [];

  const recommendations = data?.recommendations ?? [];
  const pendingCount = data?.pendingCount ?? 0;
  const readyCount = data?.readyCount ?? 0;

  // Filter logic
  const needsReviewStatuses = new Set(['pending', 'generating', 'ready']);
  const approvedStatuses = new Set(['approved', 'launched']);
  const dismissedStatuses = new Set(['dismissed', 'expired']);

  const needsReviewCount = recommendations.filter((r) => needsReviewStatuses.has(r.status)).length;

  const filtered = recommendations.filter((r) => {
    switch (activeFilter) {
      case 'needs_review':
        return needsReviewStatuses.has(r.status);
      case 'approved':
        return approvedStatuses.has(r.status);
      case 'dismissed':
        return dismissedStatuses.has(r.status);
      case 'all':
        return true;
    }
  });

  const detailRec = recommendations.find((r) => r.id === detailRecId) ?? null;

  const handleGenerate = (id: string) => {
    generateMutation.mutate(id);
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate({ recommendationId: id, addToPlanner: true });
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
    convertMutation.mutate(id);
    const params = new URLSearchParams();
    params.set('intent', 'campaign');
    params.set('sourceType', 'property');
    params.set('sourceId', rec.listingDataItemId);
    params.set('campaignType', rec.suggestedCampaignType);
    params.set('autopilotRecId', rec.id);
    router.push(`/workspaces/${clientId}/create?${params.toString()}`);
  };

  const emptyMessage = (() => {
    switch (activeFilter) {
      case 'needs_review':
        return 'No campaigns need review. Autopilot will suggest new ones as activity comes in.';
      case 'approved':
        return 'No approved campaigns yet.';
      case 'dismissed':
        return 'No dismissed campaigns.';
      case 'all':
        return 'No campaign recommendations yet.';
    }
  })();

  // Loading state
  if (isLoading) {
    return (
      <div className="card p-5 border-white-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-4 bg-white-10 rounded animate-pulse" />
          <div className="h-4 w-48 bg-white-10 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-24 bg-white-10 rounded-xl animate-pulse" />
          <div className="h-24 bg-white-10 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state — treat as empty inbox (endpoint may not exist yet)
  // Fall through to render the empty state UI below

  const FILTER_TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'needs_review', label: 'Needs Review', count: needsReviewCount > 0 ? needsReviewCount : undefined },
    { key: 'approved', label: 'Approved' },
    { key: 'dismissed', label: 'Dismissed' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="card p-5 border-white-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-accent-green-110" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Campaign Recommendations
          </h2>
          {(pendingCount + readyCount) > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
              {pendingCount + readyCount}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeFilter === tab.key
                ? 'bg-accent-green-110/10 text-accent-green-110'
                : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-accent-green-110/20 text-accent-green-110">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((rec) => (
            <AutopilotCampaignCard
              key={rec.id}
              recommendation={rec}
              connectedChannels={connectedChannels}
              clientId={clientId}
              onGenerate={handleGenerate}
              onApprove={handleApprove}
              onDismiss={handleDismiss}
              onViewDetails={handleViewDetails}
              onConvert={handleConvert}
            />
          ))}
        </div>
      ) : recommendations.length === 0 && activeFilter === 'needs_review' ? (
        /* First-time / fully empty inbox — explain what autopilot does */
        <div className="py-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-green-110/10 mx-auto">
              <Zap className="w-5 h-5 text-accent-green-110" />
            </div>
            <p className="text-sm font-semibold text-white-80">Your autopilot inbox is empty</p>
            <p className="text-xs text-white-40 max-w-sm mx-auto leading-relaxed">
              When autopilot detects changes in your property data, it will create campaign recommendations here for your review. Nothing publishes without your approval.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Home, label: 'New listing', desc: 'Just-listed campaign' },
              { icon: TrendingDown, label: 'Price drop', desc: 'Price reduction push' },
              { icon: CalendarCheck, label: 'Open house', desc: 'Event promotion' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white-5 border border-white-5">
                <item.icon className="w-4 h-4 text-white-30" />
                <p className="text-[11px] font-medium text-white-60">{item.label}</p>
                <p className="text-[10px] text-white-30">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-white-30">
            <ArrowRight className="w-3 h-3" />
            <span>Import properties or connect a listing feed to get started</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white-40 py-6 text-center">
          {emptyMessage}
        </p>
      )}

      {/* Detail modal */}
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
