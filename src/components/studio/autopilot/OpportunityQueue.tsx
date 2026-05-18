'use client';

import { useState } from 'react';
import {
  Home as HomeIcon,
  TrendingDown,
  Calendar,
  RefreshCw,
  ArrowRight,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  AutopilotCampaignRecommendation,
  AutopilotTriggerType,
  AutopilotCampaignStatus,
} from '@/hooks/useSquadpitch';
import { STATUS_DISPLAY, CHANNEL_LABELS } from '../autopilotInboxConstants';
import { cn } from '@/lib/utils';

export type QueueFilter =
  | 'recommended'
  | 'drafts_ready'
  | 'approved'
  | 'scheduled'
  | 'dismissed'
  | 'all';

const TRIGGER_ICONS: Record<AutopilotTriggerType, typeof HomeIcon> = {
  new_listing: HomeIcon,
  price_drop: TrendingDown,
  open_house_added: Calendar,
  open_house_updated: Calendar,
  status_changed: RefreshCw,
};

const TRIGGER_LABELS: Record<AutopilotTriggerType, string> = {
  new_listing: 'New Listing',
  price_drop: 'Price Drop',
  open_house_added: 'Open House',
  open_house_updated: 'Open House Updated',
  status_changed: 'Status Changed',
};

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-green-400',
  medium: 'bg-yellow-400',
  low: 'bg-white-30',
};

const STATUS_BUCKETS: Record<QueueFilter, Set<AutopilotCampaignStatus>> = {
  recommended: new Set<AutopilotCampaignStatus>(['pending', 'generating']),
  drafts_ready: new Set<AutopilotCampaignStatus>(['ready']),
  approved: new Set<AutopilotCampaignStatus>(['approved', 'launched']),
  // The backend has no SCHEDULED rec status — recommendations become
  // APPROVED after approveRecommendation, and scheduling happens
  // per-draft. Use approved+launched as the proxy until a
  // SCHEDULED rec status lands.
  scheduled: new Set<AutopilotCampaignStatus>(['launched']),
  dismissed: new Set<AutopilotCampaignStatus>(['dismissed', 'expired']),
  all: new Set<AutopilotCampaignStatus>([
    'pending',
    'generating',
    'ready',
    'approved',
    'dismissed',
    'expired',
    'converted',
    'launched',
  ]),
};

interface OpportunityQueueProps {
  recommendations: AutopilotCampaignRecommendation[];
  excludeId?: string | null; // id of the hero — don't double-render
  activeFilter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  onGenerate: (id: string) => void;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onViewDetails: (id: string) => void;
  generatingIds?: Set<string>;
}

export function OpportunityQueue({
  recommendations,
  excludeId,
  activeFilter,
  onFilterChange,
  onGenerate,
  onApprove,
  onDismiss,
  onViewDetails,
  generatingIds,
}: OpportunityQueueProps) {
  const bucket = STATUS_BUCKETS[activeFilter];
  const rows = recommendations.filter(
    (r) => r.id !== excludeId && bucket.has(r.status),
  );

  const countFor = (filter: QueueFilter) =>
    recommendations.filter((r) => STATUS_BUCKETS[filter].has(r.status)).length;

  const tabs: { key: QueueFilter; label: string; count?: number }[] = [
    { key: 'recommended', label: 'Recommended', count: countFor('recommended') },
    { key: 'drafts_ready', label: 'Drafts Ready', count: countFor('drafts_ready') },
    { key: 'approved', label: 'Approved', count: countFor('approved') },
    { key: 'scheduled', label: 'Scheduled', count: countFor('scheduled') },
    { key: 'dismissed', label: 'Dismissed', count: countFor('dismissed') },
    { key: 'all', label: 'All' },
  ];

  return (
    <section data-testid="autopilot-queue" className="card p-5 border-white-10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          Opportunity Inbox
        </h2>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => {
          const active = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5',
                active
                  ? 'bg-accent-green-110/10 text-accent-green-110'
                  : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60',
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px]',
                    active
                      ? 'bg-accent-green-110/20 text-accent-green-110'
                      : 'bg-white-10 text-white-50',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white-40 py-6 text-center" data-testid="queue-empty">
          {emptyLabel(activeFilter, excludeId)}
        </p>
      ) : (
        <ul className="divide-y divide-white-10">
          {rows.map((rec) => (
            <QueueRow
              key={rec.id}
              recommendation={rec}
              onGenerate={onGenerate}
              onApprove={onApprove}
              onDismiss={onDismiss}
              onViewDetails={onViewDetails}
              generating={generatingIds?.has(rec.id) ?? false}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function emptyLabel(filter: QueueFilter, excludeId: string | null | undefined): string {
  if (filter === 'recommended') {
    return excludeId
      ? 'No other opportunities in the queue. Autopilot will add more as activity comes in.'
      : 'No opportunities yet. Autopilot will surface them as it detects activity.';
  }
  if (filter === 'drafts_ready') return 'No drafts ready for approval.';
  if (filter === 'approved') return 'No approved recommendations yet.';
  if (filter === 'scheduled') return 'No scheduled campaigns yet.';
  if (filter === 'dismissed') return 'No dismissed recommendations.';
  return 'Nothing to show.';
}

interface QueueRowProps {
  recommendation: AutopilotCampaignRecommendation;
  onGenerate: (id: string) => void;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onViewDetails: (id: string) => void;
  generating: boolean;
}

function QueueRow({
  recommendation,
  onGenerate,
  onApprove,
  onDismiss,
  onViewDetails,
  generating,
}: QueueRowProps) {
  const [showWhy, setShowWhy] = useState(false);
  const TriggerIcon = TRIGGER_ICONS[recommendation.triggerType] ?? HomeIcon;
  const triggerLabel = TRIGGER_LABELS[recommendation.triggerType] ?? recommendation.triggerType;
  const statusDisplay = STATUS_DISPLAY[recommendation.status];
  const dot = CONFIDENCE_DOT[recommendation.confidence] ?? 'bg-white-30';

  const inactive =
    recommendation.status === 'dismissed' || recommendation.status === 'expired';

  let primary: { label: string; onClick: () => void; loading?: boolean } | null = null;
  if (recommendation.status === 'pending') {
    primary = {
      label: 'Prepare',
      onClick: () => onGenerate(recommendation.id),
      loading: generating,
    };
  } else if (recommendation.status === 'ready') {
    primary = { label: 'Approve', onClick: () => onApprove(recommendation.id) };
  } else if (recommendation.status === 'approved' || recommendation.status === 'launched') {
    primary = { label: 'View', onClick: () => onViewDetails(recommendation.id) };
  } else if (recommendation.status === 'generating') {
    primary = { label: 'Working…', onClick: () => {}, loading: true };
  }

  return (
    <li
      data-testid="queue-row"
      className={cn(
        'py-3',
        inactive && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white-5 flex items-center justify-center shrink-0">
          <TriggerIcon className="w-3.5 h-3.5 text-white-60" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-medium text-white-40">
              {triggerLabel}
            </span>
            <span className={cn('w-1.5 h-1.5 rounded-full', dot)} title={`${recommendation.confidence} confidence`} />
            {statusDisplay && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium',
                  statusDisplay.className,
                )}
              >
                {statusDisplay.label}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-white-100 truncate">
            {recommendation.propertyTitle}
          </p>
          {recommendation.propertyAddress &&
            recommendation.propertyAddress !== recommendation.propertyTitle && (
              <p className="text-xs text-white-40 truncate">
                {recommendation.propertyAddress}
              </p>
            )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!inactive && (
            <button
              data-testid="queue-row-why-toggle"
              onClick={() => setShowWhy((v) => !v)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-white-40 hover:bg-white-10 hover:text-white-60 transition-colors"
              aria-expanded={showWhy}
            >
              Why?
              {showWhy ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
          {!inactive && primary && (
            <button
              onClick={primary.onClick}
              disabled={primary.loading}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                'bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {primary.loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ArrowRight className="w-3 h-3" />
              )}
              {primary.label}
            </button>
          )}
          {!inactive && (
            <button
              onClick={() => onViewDetails(recommendation.id)}
              className="p-1.5 rounded-lg text-white-40 hover:bg-white-10 hover:text-white-60 transition-colors"
              title="View details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {showWhy && !inactive && (
        <WhyThisDetails recommendation={recommendation} />
      )}
    </li>
  );
}

function WhyThisDetails({
  recommendation,
}: {
  recommendation: AutopilotCampaignRecommendation;
}) {
  const extras = recommendation as AutopilotCampaignRecommendation & {
    whatWeNoticed?: string;
    whyItMatters?: string;
    recommendedAngles?: string[];
  };
  const channels = recommendation.suggestedChannels.slice(0, 5);
  const angles = (extras.recommendedAngles ?? []).slice(0, 3);
  const whatWeNoticed = extras.whatWeNoticed || recommendation.triggerReason;
  const whyItMatters = extras.whyItMatters || '';

  const nextStep = (() => {
    if (recommendation.status === 'pending') {
      return 'Clicking Prepare will create one draft per recommended channel. Drafts stay unpublished until you approve them.';
    }
    if (recommendation.status === 'ready') {
      return 'Clicking Approve marks the drafts as approved. They will not publish until you schedule them yourself (or auto-schedule mode is on).';
    }
    if (recommendation.status === 'approved' || recommendation.status === 'launched') {
      return 'Drafts are already approved. View opens them in your Drafts view for scheduling.';
    }
    return '';
  })();

  return (
    <div
      data-testid="queue-row-why"
      className="mt-3 ml-11 rounded-lg border border-white-10 bg-white-3 p-3 text-xs text-white-60 space-y-2 leading-relaxed"
    >
      {whatWeNoticed && (
        <p>
          <span className="text-white-40">What we noticed: </span>
          {whatWeNoticed}
        </p>
      )}
      {whyItMatters && (
        <p>
          <span className="text-white-40">Why it matters: </span>
          {whyItMatters}
        </p>
      )}
      <p>
        <span className="text-white-40">Confidence: </span>
        <span className="capitalize">{recommendation.confidence}</span>
        {recommendation.confidence === 'high' &&
          ' — concrete source object with non-generic copy potential.'}
        {recommendation.confidence === 'medium' &&
          ' — useful signal but limited supporting data.'}
        {recommendation.confidence === 'low' &&
          ' — workspace-scoped fallback rather than a specific opportunity.'}
      </p>
      {channels.length > 0 && (
        <p>
          <span className="text-white-40">Channels: </span>
          {channels.map((ch) => CHANNEL_LABELS[ch] ?? ch).join(', ')}
        </p>
      )}
      {angles.length > 0 && (
        <p>
          <span className="text-white-40">Angles: </span>
          {angles.join(' · ')}
        </p>
      )}
      {nextStep && (
        <p className="text-white-70 pt-1 border-t border-white-10">{nextStep}</p>
      )}
    </div>
  );
}
