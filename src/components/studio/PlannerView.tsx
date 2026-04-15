'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Inbox, Check, Loader2, Calendar, List, Clock, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDrafts,
  useAutoSchedule,
  useDashboardRecommendations,
  usePlannerSuggestions,
  usePlanMyWeek,
  useSwapSuggestion,
  useAutopilotExecute,
  type DraftStatus,
  type Channel,
  type Draft,
  type PlannerSuggestion,
  type WeekSummary,
} from '@/hooks/useSquadpitch';
import { usePlannerOnboarding } from '@/hooks/usePlannerOnboarding';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { CalendarGrid } from './CalendarGrid';
import { DraftQueueCard } from './DraftQueueCard';
import { WeekPlanSummary } from './WeekPlanSummary';
import { SuggestionCard } from './SuggestionCard';
import { PlannerWelcomeCard } from './PlannerWelcomeCard';
import { PlannerTour } from './PlannerTour';
import { FirstWeekProgress } from './FirstWeekProgress';
import { PlannerSetupChecklist } from './PlannerSetupChecklist';

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

function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

export function PlannerView({ clientId }: Props) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'ALL'>('ALL');
  const [channelFilter, setChannelFilter] = useState<Channel | 'ALL'>('ALL');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Planner suggestion state
  const [activeSuggestion, setActiveSuggestion] = useState<PlannerSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<PlannerSuggestion[]>([]);
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [planResult, setPlanResult] = useState<{ generated: number; scheduled: number } | null>(null);

  // Onboarding state
  const onboarding = usePlannerOnboarding(clientId);
  const [tourActive, setTourActive] = useState(false);
  const [firstWeekInProgress, setFirstWeekInProgress] = useState(false);
  const [firstWeekResult, setFirstWeekResult] = useState<{ generated: number; scheduled: number } | null>(null);

  const { data: allDrafts, isLoading, error } = useDrafts({
    clientId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 200,
  });
  const autoSchedule = useAutoSchedule(clientId);
  const { data: recommendations } = useDashboardRecommendations(clientId);

  // Planner hooks
  const plannerSuggestions = usePlannerSuggestions(clientId);
  const planMyWeek = usePlanMyWeek(clientId);
  const swapSuggestion = useSwapSuggestion(clientId);
  const autopilotExecute = useAutopilotExecute(clientId);

  // Fetch suggestions on mount and when drafts change
  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  useEffect(() => {
    plannerSuggestions.mutate(weekRange, {
      onSuccess: (data) => {
        setSuggestions(data.suggestions);
        setWeekSummary(data.weekSummary);
        setDismissedIds(new Set());
        setPlanResult(null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDrafts?.length]);

  // ── Derived state ─────────────────────────────────────────────────────

  // Detect "new user" — no drafts at all
  const isNewUser = !isLoading && (allDrafts?.length ?? 0) === 0;

  // Detect insufficient assets for setup checklist
  const summary = recommendations?.summary;
  const hasListingFeed = summary?.realEstate?.listingFeedConnected ?? false;
  const hasTestimonials = (summary?.realEstate?.reviewCount ?? 0) > 0;
  const hasDataItems = (summary?.totalDataItems ?? 0) > 0;
  const hasDrafts = (allDrafts?.length ?? 0) > 0;
  const hasEnoughAssets = hasDataItems;

  // Show welcome card for first-run users who haven't dismissed
  const showWelcome = onboarding.isFirstRun && isNewUser;

  // Show setup checklist when user is new and doesn't have enough assets
  const showChecklist = isNewUser && !hasEnoughAssets && !firstWeekInProgress && !firstWeekResult;

  // Filter out dismissed suggestions, apply channel filter
  const visibleSuggestions = useMemo(() => {
    let filtered = suggestions.filter((s) => !dismissedIds.has(s.id));
    if (channelFilter !== 'ALL') {
      filtered = filtered.filter((s) => !s.channel || s.channel === channelFilter);
    }
    return filtered;
  }, [suggestions, dismissedIds, channelFilter]);

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

  const approvedUnscheduled = useMemo(
    () => allDrafts?.filter((d) => d.status === 'APPROVED' && !d.scheduledFor) ?? [],
    [allDrafts]
  );

  const handleAutoSchedule = () => {
    if (approvedUnscheduled.length === 0) return;
    autoSchedule.mutate(approvedUnscheduled.map((d) => d.id));
  };

  // ── Suggestion handlers ───────────────────────────────────────────────

  const handleSelectSuggestion = (s: PlannerSuggestion) => {
    setActiveSuggestion(activeSuggestion?.id === s.id ? null : s);
  };

  const handleDismiss = (s: PlannerSuggestion) => {
    setDismissedIds((prev) => new Set(prev).add(s.id));
    if (activeSuggestion?.id === s.id) setActiveSuggestion(null);
  };

  const handleSwap = (s: PlannerSuggestion) => {
    const excludeIds = suggestions.map((sg) => sg.dataItem.id);
    swapSuggestion.mutate(
      {
        excludeDataItemIds: excludeIds,
        targetDate: s.suggestedDate,
        channel: s.channel ?? undefined,
      },
      {
        onSuccess: (data) => {
          if (data.suggestion) {
            setSuggestions((prev) =>
              prev.map((sg) => (sg.id === s.id ? data.suggestion! : sg))
            );
            if (activeSuggestion?.id === s.id) setActiveSuggestion(data.suggestion);
          } else {
            handleDismiss(s);
          }
        },
      }
    );
  };

  const handleCreateDraft = (s: PlannerSuggestion) => {
    autopilotExecute.mutate(
      {
        suggestions: [{ dataItem: { id: s.dataItem.id }, blueprint: { id: s.blueprint.id } }],
        autoSchedule: false,
      },
      {
        onSuccess: () => {
          setSuggestions((prev) => prev.filter((sg) => sg.id !== s.id));
          if (activeSuggestion?.id === s.id) setActiveSuggestion(null);
        },
      }
    );
  };

  const handleSchedule = (s: PlannerSuggestion) => {
    autopilotExecute.mutate(
      {
        suggestions: [{ dataItem: { id: s.dataItem.id }, blueprint: { id: s.blueprint.id } }],
        autoSchedule: true,
      },
      {
        onSuccess: () => {
          setSuggestions((prev) => prev.filter((sg) => sg.id !== s.id));
          if (activeSuggestion?.id === s.id) setActiveSuggestion(null);
        },
      }
    );
  };

  const handlePlanMyWeek = () => {
    planMyWeek.mutate(weekRange, {
      onSuccess: (data) => {
        setPlanResult({ generated: data.generated, scheduled: data.scheduled });
        setSuggestions([]);
        setActiveSuggestion(null);
      },
    });
  };

  // ── First-run handlers ────────────────────────────────────────────────

  const handlePlanFirstWeek = () => {
    onboarding.dismissWelcome();
    setFirstWeekInProgress(true);

    planMyWeek.mutate(weekRange, {
      onSuccess: (data) => {
        setFirstWeekResult({ generated: data.generated, scheduled: data.scheduled });
        onboarding.markFirstWeekGenerated();
        setPlanResult({ generated: data.generated, scheduled: data.scheduled });
        setSuggestions([]);
        setActiveSuggestion(null);
      },
      onError: () => {
        setFirstWeekInProgress(false);
      },
    });
  };

  const handleFirstWeekDone = () => {
    setFirstWeekInProgress(false);
    setFirstWeekResult(null);
  };

  const handleStartTour = () => {
    onboarding.dismissWelcome();
    setTourActive(true);
  };

  const handleTourComplete = () => {
    setTourActive(false);
    onboarding.markTourSeen();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white-100">Planner</h1>
        <div className="flex items-center gap-2">
          {/* Tour replay button */}
          <button
            onClick={handleStartTour}
            className="p-1.5 rounded-lg text-white-30 hover:text-white-60 hover:bg-white-10 transition-colors"
            title="Take a quick tour"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
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
      </div>

      {/* First-run welcome card */}
      {showWelcome && !firstWeekInProgress && !firstWeekResult && (
        <PlannerWelcomeCard
          onPlanFirstWeek={handlePlanFirstWeek}
          onStartTour={handleStartTour}
          onDismiss={onboarding.dismissWelcome}
          isPlanningWeek={planMyWeek.isPending}
        />
      )}

      {/* First-week progress overlay */}
      {(firstWeekInProgress || firstWeekResult) && (
        <FirstWeekProgress
          isPending={planMyWeek.isPending}
          result={firstWeekResult}
          onDone={handleFirstWeekDone}
        />
      )}

      {/* Setup checklist fallback — shown when user lacks assets */}
      {showChecklist && (
        <PlannerSetupChecklist
          clientId={clientId}
          hasListingFeed={hasListingFeed}
          hasTestimonials={hasTestimonials}
          hasDataItems={hasDataItems}
          hasDrafts={hasDrafts}
        />
      )}

      {/* Week plan summary */}
      <div data-tour-step="week-summary">
        <WeekPlanSummary
          weekSummary={weekSummary}
          onPlanMyWeek={handlePlanMyWeek}
          isPlanningWeek={planMyWeek.isPending}
          planResult={planResult}
          hasSuggestions={visibleSuggestions.length > 0}
        />
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

        {/* Auto-schedule */}
        {approvedUnscheduled.length > 0 && (
          <div className="flex items-center gap-3" data-tour-step="plan-week">
            <button
              onClick={handleAutoSchedule}
              disabled={autoSchedule.isPending}
              className="px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-medium hover:bg-accent-green-110/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {autoSchedule.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              Auto-schedule {approvedUnscheduled.length} approved post{approvedUnscheduled.length !== 1 ? 's' : ''}
            </button>
            {autoSchedule.isSuccess && (
              <span className="text-xs text-accent-green-110">
                Scheduled {autoSchedule.data.count} posts
              </span>
            )}
          </div>
        )}
      </div>

      {/* Calendar view */}
      {view === 'calendar' && channelFiltered && (
        <div data-tour-step="calendar">
          <CalendarGrid
            drafts={channelFiltered}
            suggestions={visibleSuggestions}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onSelectSuggestion={handleSelectSuggestion}
          />
        </div>
      )}

      {/* Suggestion detail card */}
      {activeSuggestion && (
        <SuggestionCard
          suggestion={activeSuggestion}
          onCreateDraft={handleCreateDraft}
          onSchedule={handleSchedule}
          onSwap={handleSwap}
          onDismiss={handleDismiss}
          isSwapping={swapSuggestion.isPending}
          isCreating={autopilotExecute.isPending}
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
      <div data-tour-step="draft-list">
        {isLoading && (
          <div className="flex items-center gap-2 py-6">
            <LoadingSpinner size="sm" />
            <span className="text-white-40 text-sm">Loading drafts…</span>
          </div>
        )}

        {error && <StatusBanner error={(error as Error).message} />}

        {drafts && drafts.length === 0 && !showChecklist && (
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

      {/* Tour overlay */}
      <PlannerTour active={tourActive} onComplete={handleTourComplete} />
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
