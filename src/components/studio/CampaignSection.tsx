'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Hash,
  ArrowRight,
  Pencil,
  Home,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Draft } from '@/hooks/useSquadpitch';
import {
  parseDraftSourceMeta,
  sourceTypeLabel,
  sourceTitleForDisplay,
  createLinkFromSourceMeta,
} from '@/lib/assistant/draftSourceMeta';
import {
  CAMPAIGN_LIFECYCLE_LABELS,
  CAMPAIGN_LIFECYCLE_STYLES,
  computeCampaignLifecycle,
} from '@/lib/assistant/campaignLifecycle';
import { CampaignOptimizations } from './OptimizationSuggestions';
import {
  CAMPAIGN_TYPE_LABELS,
  CHANNEL_LABELS,
  formatDateShort,
  formatDayHeader,
} from './campaignConstants';
import { DraftQueueCard } from './DraftQueueCard';

interface CampaignSectionProps {
  clientId: string;
  campaignId: string;
  campaignDrafts: Draft[];
  expanded: boolean;
  onToggleExpand: () => void;
  selectedIds: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
  focusMode?: boolean;
  onExitFocusMode?: () => void;
  highlighted?: boolean;
}

export function CampaignSection({
  clientId,
  campaignId,
  campaignDrafts,
  expanded,
  onToggleExpand,
  selectedIds,
  onSelect,
  focusMode = false,
  onExitFocusMode,
  highlighted = false,
}: CampaignSectionProps) {
  // ── Computed campaign metadata ──────────────────────────────────────
  const campaignMeta = useMemo(() => {
    const name = campaignDrafts[0]?.campaignName || 'Unnamed Campaign';
    const type = campaignDrafts[0]?.campaignType || 'just_listed';
    const postCount = campaignDrafts.length;

    const channels = new Set<string>();
    let earliest: string | null = null;
    let latest: string | null = null;
    let maxDay = 0;
    let failedCount = 0;

    for (const d of campaignDrafts) {
      channels.add(d.channel);

      const date = d.scheduledFor ?? d.publishedAt;
      if (date) {
        if (!earliest || date < earliest) earliest = date;
        if (!latest || date > latest) latest = date;
      }

      if (d.campaignDay && d.campaignDay > maxDay) maxDay = d.campaignDay;
      if (d.status === 'FAILED') failedCount += 1;
    }

    const channelLabels = Array.from(channels)
      .map((c) => CHANNEL_LABELS[c] ?? c)
      .join(', ');

    // Source attribution lives on each Draft's `warnings` array
    // (key:value tags written by save-drafts). The first draft is
    // representative — every draft in a campaign shares the same
    // attribution tags.
    const sourceMeta = parseDraftSourceMeta(campaignDrafts[0]?.warnings ?? null);
    const lifecycle = computeCampaignLifecycle(campaignDrafts);

    return {
      name,
      type,
      typeLabel: CAMPAIGN_TYPE_LABELS[type] ?? type,
      postCount,
      dayCount: maxDay || 1,
      channelLabels,
      firstDate: earliest,
      lastDate: latest,
      sourceMeta,
      sourceLabel: sourceTypeLabel(sourceMeta.sourceType),
      sourceTitle: sourceTitleForDisplay(sourceMeta),
      lifecycle,
      lifecycleLabel: CAMPAIGN_LIFECYCLE_LABELS[lifecycle],
      lifecycleStyle: CAMPAIGN_LIFECYCLE_STYLES[lifecycle],
      failedCount,
    };
  }, [campaignDrafts]);

  // ── Group drafts by campaignDay ─────────────────────────────────────
  const dayGroups = useMemo(() => {
    const groups = new Map<number, Draft[]>();

    for (const d of campaignDrafts) {
      const day = d.campaignDay ?? 0;
      let group = groups.get(day);
      if (!group) {
        group = [];
        groups.set(day, group);
      }
      group.push(d);
    }

    // Sort within each group by campaignOrder
    Array.from(groups.values()).forEach((group) => {
      group.sort((a: Draft, b: Draft) => (a.campaignOrder ?? 0) - (b.campaignOrder ?? 0));
    });

    // Sort groups by day number (0 = unscheduled goes last)
    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === 0) return 1;
      if (b[0] === 0) return -1;
      return a[0] - b[0];
    });
  }, [campaignDrafts]);

  // Build the Edit Campaign URL with the new ?intent= contract.
  // We thread campaignId along so the assistant can opt into a
  // "regenerate this exact campaign" flow in the future; today the
  // server-side route just needs sourceType + sourceId.
  const editCampaignUrl = (() => {
    const qs = createLinkFromSourceMeta(campaignMeta.sourceMeta);
    return `/workspaces/${clientId}/create?${qs}&campaignId=${campaignId}`;
  })();

  const SourceIcon =
    campaignMeta.sourceMeta.sourceType === 'property'
      ? Home
      : campaignMeta.sourceMeta.sourceType === 'data_item'
        ? FileText
        : campaignMeta.sourceMeta.sourceType === 'idea'
          ? Lightbulb
          : null;

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-colors',
        focusMode
          ? 'border-accent-green-110/20 bg-accent-green-110/5'
          : highlighted
            ? 'border-accent-green-110/30 ring-1 ring-accent-green-110/10'
            : 'border-white-10',
      )}
    >
      {/* ── Campaign Header (always visible) ─────────────────────────── */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white-8 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-white-30 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white-30 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {/* Row 1: Name + type badge + lifecycle chip + focus mode badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white-80 truncate">
              {campaignMeta.name}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 shrink-0">
              {campaignMeta.typeLabel}
            </span>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full shrink-0 font-medium',
                campaignMeta.lifecycleStyle,
              )}
            >
              {campaignMeta.lifecycleLabel}
              {campaignMeta.failedCount > 0 && campaignMeta.lifecycle !== 'failed' && (
                <span className="ml-1 text-red-300">
                  ({campaignMeta.failedCount} failed)
                </span>
              )}
            </span>
            {focusMode && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 text-xs font-semibold shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Campaign launched
              </span>
            )}
          </div>

          {/* Row 2: Source attribution */}
          {campaignMeta.sourceLabel && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-white-50 min-w-0">
              {SourceIcon && <SourceIcon className="w-3 h-3 text-white-30 shrink-0" />}
              <span className="shrink-0">{campaignMeta.sourceLabel}</span>
              {campaignMeta.sourceTitle && (
                <>
                  <span className="text-white-30 shrink-0">\u00B7</span>
                  <span className="truncate">{campaignMeta.sourceTitle}</span>
                </>
              )}
            </div>
          )}

          {/* Row 3: Stats */}
          <div className="flex items-center gap-3 mt-1 text-xs text-white-40 flex-wrap">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-white-20" />
              {campaignMeta.postCount} post{campaignMeta.postCount !== 1 ? 's' : ''}
              {' \u00B7 '}
              {campaignMeta.dayCount} day{campaignMeta.dayCount !== 1 ? 's' : ''}
              {' \u00B7 '}
              {campaignMeta.channelLabels}
            </span>
            {campaignMeta.firstDate && campaignMeta.lastDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-white-20" />
                {formatDateShort(campaignMeta.firstDate)}
                {campaignMeta.firstDate !== campaignMeta.lastDate &&
                  ` \u2014 ${formatDateShort(campaignMeta.lastDate)}`}
              </span>
            )}
          </div>
        </div>

        {/* Right side buttons (stop propagation so they don't toggle expand) */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Link
            href={editCampaignUrl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white-60 bg-white-10 hover:bg-white-20 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit Campaign
          </Link>
          {focusMode && onExitFocusMode && (
            <button
              onClick={onExitFocusMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 bg-white-10 hover:bg-white-20 transition-colors"
            >
              View full Planner
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </button>

      {/* ── Day-Grouped Timeline (when expanded) ─────────────────────── */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          {focusMode && (
            <p className="text-xs text-white-40">
              Review, edit, reschedule, or publish your posts below
            </p>
          )}

          {/* Optimization suggestions for this campaign */}
          <CampaignOptimizations
            drafts={campaignDrafts}
            campaignId={campaignId}
            campaignType={campaignMeta.type}
            clientId={clientId}
          />

          {dayGroups.map(([day, drafts]) => {
            const representativeDate = drafts.find((d) => d.scheduledFor)?.scheduledFor;
            const dayLabel =
              day === 0
                ? 'Unscheduled'
                : `Day ${day}${representativeDate ? ` \u2014 ${formatDayHeader(representativeDate)}` : ''}`;

            return (
              <div key={day}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xs font-semibold text-white-40 uppercase tracking-wider whitespace-nowrap">
                    {dayLabel}
                  </h3>
                  <div className="flex-1 h-px bg-white-10" />
                  <span className="text-[11px] text-white-30">
                    {drafts.length} post{drafts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Timeline connector + cards */}
                <div className="border-l-2 border-white-10 pl-4 space-y-2 ml-1">
                  {drafts.map((draft) => (
                    <DraftQueueCard
                      key={draft.id}
                      draft={draft}
                      selected={selectedIds.has(draft.id)}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Bottom CTA for focus mode */}
          {focusMode && onExitFocusMode && (
            <div className="flex justify-center pt-2">
              <button
                onClick={onExitFocusMode}
                className="text-sm text-white-40 hover:text-white-60 transition-colors"
              >
                View full Planner &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
