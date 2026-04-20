'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Megaphone, Plus, Zap } from 'lucide-react';
import { useDrafts, useClient, useAutopilotCampaignStats } from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CampaignSection } from '@/components/studio/CampaignSection';
import { groupDraftsByCampaign } from '@/components/studio/campaignGrouping';

export default function CampaignsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { data: client } = useClient(clientId);
  const { data: allDrafts, isLoading } = useDrafts({ clientId, limit: 200 });

  const { data: campaignStats } = useAutopilotCampaignStats(clientId);
  const isRE = client?.industryKey === 'real_estate';
  const base = `/workspaces/${clientId}`;
  const autopilotActionableCount = (campaignStats?.pendingCount ?? 0) + (campaignStats?.readyCount ?? 0);

  const { campaignGroups } = useMemo(() => {
    if (!allDrafts) return { campaignGroups: [], standaloneDrafts: [] };
    return groupDraftsByCampaign(allDrafts);
  }, [allDrafts]);

  // Expand/collapse state — first campaign expanded by default
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(() => {
    return new Set();
  });

  // Auto-expand first campaign once data loads
  useMemo(() => {
    if (campaignGroups.length > 0 && expandedCampaigns.size === 0) {
      setExpandedCampaigns(new Set([campaignGroups[0].campaignId]));
    }
  }, [campaignGroups.length > 0 ? campaignGroups[0]?.campaignId : '']); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCampaignExpand = useCallback((campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
  }, []);

  const newCampaignHref = isRE ? `${base}/listing-campaign` : `${base}/create`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white-100">Campaigns</h1>
          <p className="text-sm text-white-40 mt-1">
            Plan and manage coordinated multi-post campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${base}/create`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-10 text-white-80 text-sm font-medium hover:bg-white-20 transition-colors"
          >
            Quick Post
          </Link>
          <Link
            href={newCampaignHref}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-dark text-sm font-semibold hover:bg-accent-green-110/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isRE ? 'Create Listing Campaign' : 'Create Campaign'}
          </Link>
        </div>
      </div>

      {/* Autopilot campaign recommendations banner */}
      {autopilotActionableCount > 0 && (
        <Link
          href={`${base}/autopilot`}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/30 transition-colors"
        >
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-yellow-400 font-medium">
            Autopilot has {autopilotActionableCount} campaign recommendation{autopilotActionableCount > 1 ? 's' : ''} ready for review
          </span>
          <span className="ml-auto text-xs text-yellow-400/70 font-medium">Review →</span>
        </Link>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Campaign list */}
      {!isLoading && campaignGroups.length > 0 && (
        <div className="space-y-4">
          {campaignGroups.map((group) => (
            <CampaignSection
              key={group.campaignId}
              clientId={clientId}
              campaignId={group.campaignId}
              campaignDrafts={group.drafts}
              expanded={expandedCampaigns.has(group.campaignId)}
              onToggleExpand={() => toggleCampaignExpand(group.campaignId)}
              selectedIds={new Set()}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && campaignGroups.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white-5 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-white-20" />
          </div>
          <h2 className="text-lg font-semibold text-white-100 mb-2">No campaigns yet</h2>
          <p className="text-sm text-white-40 max-w-md mx-auto mb-6">
            {isRE
              ? 'Create a listing campaign to coordinate marketing across multiple posts and channels for any property.'
              : 'You don\'t have any campaigns yet. Create one to coordinate posts across multiple channels.'}
          </p>
          <Link
            href={newCampaignHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-dark text-sm font-semibold hover:bg-accent-green-110/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isRE ? 'Create Listing Campaign' : 'Create Campaign'}
          </Link>
        </div>
      )}
    </div>
  );
}
