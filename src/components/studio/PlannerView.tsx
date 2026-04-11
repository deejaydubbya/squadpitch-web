'use client';

import { useMemo, useState, useCallback } from 'react';
import { Inbox, Check, Loader2, Calendar, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDrafts,
  type DraftStatus,
  type Channel,
  type Draft,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { CalendarGrid } from './CalendarGrid';
import { DraftQueueCard } from './DraftQueueCard';

interface Props {
  clientId: string;
}

const STATUS_FILTERS: Array<{
  label: string;
  value: DraftStatus | 'ALL';
}> = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending', value: 'PENDING_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Failed', value: 'FAILED' },
];

const CHANNEL_FILTERS: Array<{
  label: string;
  value: Channel | 'ALL';
}> = [
  { label: 'All channels', value: 'ALL' },
  { label: 'Instagram', value: 'INSTAGRAM' },
  { label: 'TikTok', value: 'TIKTOK' },
  { label: 'X', value: 'X' },
  { label: 'LinkedIn', value: 'LINKEDIN' },
  { label: 'Facebook', value: 'FACEBOOK' },
  { label: 'YouTube', value: 'YOUTUBE' },
];

export function PlannerView({ clientId }: Props) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'ALL'>('ALL');
  const [channelFilter, setChannelFilter] = useState<Channel | 'ALL'>('ALL');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: allDrafts, isLoading, error } = useDrafts({
    clientId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 200,
  });

  // Client-side channel filter
  const channelFiltered = useMemo(() => {
    if (!allDrafts) return undefined;
    if (channelFilter === 'ALL') return allDrafts;
    return allDrafts.filter((d) => d.channel === channelFilter);
  }, [allDrafts, channelFilter]);

  // Day filter (only in calendar view)
  const drafts = useMemo(() => {
    if (!channelFiltered) return undefined;
    if (!selectedDay || view !== 'calendar') return channelFiltered;

    return channelFiltered.filter((d) => {
      const date = d.scheduledFor ?? d.publishedAt;
      if (!date) return false;
      const dt = new Date(date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      return key === selectedDay;
    });
  }, [channelFiltered, selectedDay, view]);

  const statusCounts = useMemo(() => {
    if (!allDrafts) return {};
    const counts: Record<string, number> = {};
    for (const d of allDrafts) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return counts;
  }, [allDrafts]);

  const totalCount = allDrafts?.length ?? 0;

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAll = () => {
    if (!drafts) return;
    const approvable = drafts.filter(
      (d) => d.status === 'DRAFT' || d.status === 'PENDING_REVIEW'
    );
    setSelected(new Set(approvable.map((d) => d.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const hasApprovable = drafts?.some(
    (d) => d.status === 'DRAFT' || d.status === 'PENDING_REVIEW'
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white-100">Planner</h1>
        <div className="flex items-center gap-1 bg-white-5 rounded-lg p-0.5">
          <button
            onClick={() => setView('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'calendar'
                ? 'bg-white-10 text-white-100'
                : 'text-white-40 hover:text-white-60'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'list'
                ? 'bg-white-10 text-white-100'
                : 'text-white-40 hover:text-white-60'
            )}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === 'ALL' ? totalCount : (statusCounts[f.value] ?? 0);
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  statusFilter === f.value
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-10 text-white-60 hover:bg-white-20'
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {CHANNEL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setChannelFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                channelFilter === f.value
                  ? 'bg-white-20 text-white-100'
                  : 'text-white-40 hover:text-white-60'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar view */}
      {view === 'calendar' && channelFiltered && (
        <CalendarGrid
          drafts={channelFiltered}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      )}

      {/* Bulk actions */}
      {hasApprovable && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={selected.size > 0 ? clearSelection : selectAll}
            className="text-white-60 hover:text-white-100"
          >
            {selected.size > 0
              ? `Deselect (${selected.size})`
              : 'Select all approvable'}
          </button>
          {selected.size > 0 && (
            <BulkApproveButton ids={Array.from(selected)} onDone={clearSelection} />
          )}
        </div>
      )}

      {/* Day detail label */}
      {selectedDay && view === 'calendar' && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-white-60">
            Showing drafts for selected day
          </p>
          <button
            onClick={() => setSelectedDay(null)}
            className="text-xs text-accent-green-110 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Draft list */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading drafts…</span>
        </div>
      )}

      {error && <StatusBanner error={(error as Error).message} />}

      {drafts && drafts.length === 0 && (
        <div className="card p-8 text-center">
          <Inbox className="w-8 h-8 text-white-40 mx-auto mb-2" />
          <p className="text-sm text-white-60">No drafts match this filter.</p>
        </div>
      )}

      {drafts && drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <DraftQueueCard
              key={draft.id}
              draft={draft}
              selected={selected.has(draft.id)}
              onSelect={hasApprovable ? handleSelect : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BulkApproveButton({
  ids,
  onDone,
}: {
  ids: string[];
  onDone: () => void;
}) {
  const [approving, setApproving] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBulkApprove = async () => {
    setApproving(true);
    setProgress(0);
    for (let i = 0; i < ids.length; i++) {
      try {
        await fetch(`/api/proxy/drafts/${ids[i]}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // continue on error
      }
      setProgress(i + 1);
    }
    setApproving(false);
    onDone();
    window.location.reload();
  };

  return (
    <button
      onClick={handleBulkApprove}
      disabled={approving}
      className="px-2.5 py-1 rounded-md bg-zone-green/20 text-zone-green hover:bg-zone-green/30 flex items-center gap-1 disabled:opacity-50"
    >
      {approving ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          {progress}/{ids.length}
        </>
      ) : (
        <>
          <Check className="w-3 h-3" />
          Approve {ids.length}
        </>
      )}
    </button>
  );
}
