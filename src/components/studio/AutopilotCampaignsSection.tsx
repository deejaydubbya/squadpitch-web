'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { AutopilotCampaignCard } from './AutopilotCampaignCard';
import { AutopilotCampaignDetailModal } from './AutopilotCampaignDetailModal';

type FilterTab = 'needs_review' | 'approved' | 'dismissed' | 'all';

interface AutopilotCampaignsSectionProps {
  clientId: string;
}

export function AutopilotCampaignsSection({ clientId }: AutopilotCampaignsSectionProps) {
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
    params.set('listingId', rec.listingDataItemId);
    params.set('type', rec.suggestedCampaignType);
    params.set('autopilotRecId', rec.id);
    router.push(`/workspaces/${clientId}/listing-campaign?${params.toString()}`);
  };

  const emptyMessage = (() => {
    switch (activeFilter) {
      case 'needs_review':
        return 'No campaigns need review. Autopilot will suggest new ones when listing events occur.';
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

  // Error state
  if (isError) {
    return null;
  }

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
      ) : (
        <p className="text-sm text-white-40 py-4 text-center">
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
