'use client';

import { useMemo } from 'react';
import { CheckCircle2, Calendar, Hash, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Draft } from '@/hooks/useSquadpitch';
import { CAMPAIGN_TYPE_LABELS } from './PlannerView';
import { DraftQueueCard } from './DraftQueueCard';

interface CampaignFocusViewProps {
  clientId: string;
  campaignDrafts: Draft[];
  onExitFocusMode: () => void;
  selectedIds: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
}

/** Channel key → display label */
const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  X: 'X',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
};

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function CampaignFocusView({
  campaignDrafts,
  onExitFocusMode,
  selectedIds,
  onSelect,
}: CampaignFocusViewProps) {
  // ── Computed campaign metadata ──────────────────────────────────────
  const campaignMeta = useMemo(() => {
    const name = campaignDrafts[0]?.campaignName || 'Unnamed Campaign';
    const type = campaignDrafts[0]?.campaignType || 'just_listed';
    const postCount = campaignDrafts.length;

    const channels = new Set<string>();
    let earliest: string | null = null;
    let latest: string | null = null;
    const statusCounts: Record<string, number> = {};
    let maxDay = 0;

    for (const d of campaignDrafts) {
      channels.add(d.channel);

      const date = d.scheduledFor ?? d.publishedAt;
      if (date) {
        if (!earliest || date < earliest) earliest = date;
        if (!latest || date > latest) latest = date;
      }

      statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;

      if (d.campaignDay && d.campaignDay > maxDay) maxDay = d.campaignDay;
    }

    const channelLabels = Array.from(channels)
      .map((c) => CHANNEL_LABELS[c] ?? c)
      .join(', ');

    return {
      name,
      type,
      typeLabel: CAMPAIGN_TYPE_LABELS[type] ?? type,
      postCount,
      dayCount: maxDay || 1,
      channelLabels,
      firstDate: earliest,
      lastDate: latest,
      statusCounts,
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

  return (
    <div className="space-y-5">
      {/* ── Hero Header ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-accent-green-110/20 bg-accent-green-110/5 p-5 space-y-4">
        {/* Success badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-green-110/15 text-accent-green-110 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Campaign launched
          </div>
        </div>

        {/* Campaign name + type */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white-100">{campaignMeta.name}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 font-medium">
            {campaignMeta.typeLabel}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-sm text-white-60 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-white-30" />
            {campaignMeta.postCount} post{campaignMeta.postCount !== 1 ? 's' : ''}
            {' · '}
            {campaignMeta.dayCount} day{campaignMeta.dayCount !== 1 ? 's' : ''}
            {' · '}
            {campaignMeta.channelLabels}
          </span>
          {campaignMeta.firstDate && campaignMeta.lastDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-white-30" />
              {formatDateShort(campaignMeta.firstDate)}
              {campaignMeta.firstDate !== campaignMeta.lastDate &&
                ` — ${formatDateShort(campaignMeta.lastDate)}`}
            </span>
          )}
        </div>

        {/* CTA text + exit button */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-white-40">
            Review, edit, reschedule, or publish your posts below
          </p>
          <button
            onClick={onExitFocusMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 bg-white-10 hover:bg-white-20 transition-colors shrink-0"
          >
            View full Planner
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Day-Grouped Timeline ───────────────────────────────────── */}
      <div className="space-y-6">
        {dayGroups.map(([day, drafts]) => {
          // Try to get the date from the first draft that has one
          const representativeDate = drafts.find((d) => d.scheduledFor)?.scheduledFor;
          const dayLabel =
            day === 0
              ? 'Unscheduled'
              : `Day ${day}${representativeDate ? ` — ${formatDayHeader(representativeDate)}` : ''}`;

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
      </div>

      {/* ── Bottom CTA ─────────────────────────────────────────────── */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          onClick={onExitFocusMode}
          className="text-sm text-white-40 hover:text-white-60 transition-colors"
        >
          View full Planner →
        </button>
      </div>
    </div>
  );
}
