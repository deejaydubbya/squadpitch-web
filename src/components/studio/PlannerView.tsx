'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Inbox, Check, Loader2, Calendar, List, Clock, HelpCircle, ChevronDown, ChevronRight, Megaphone, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDrafts,
  useAutoSchedule,
  useDashboardRecommendations,
  usePlannerSuggestions,
  usePlanMyWeek,
  useSwapSuggestion,
  useAutopilotExecute,
  useTimingSuggestions,
  type DraftStatus,
  type Channel,
  type Draft,
  type PlannerSuggestion,
  type PlannerCampaignSuggestion,
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
  const searchParams = useSearchParams();
  const highlightCampaignId = searchParams.get('campaignId') ?? null;
  // Auto-switch to list view when arriving from campaign launch so the user
  // immediately sees the grouped campaign instead of the calendar.
  const [view, setView] = useState<'calendar' | 'list'>(highlightCampaignId ? 'list' : 'calendar');
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
  const [campaignSuggestions, setCampaignSuggestions] = useState<PlannerCampaignSuggestion[]>([]);

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
  const { data: timingSuggestions } = useTimingSuggestions();

  // Fetch suggestions on mount and when drafts change
  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  useEffect(() => {
    plannerSuggestions.mutate(weekRange, {
      onSuccess: (data) => {
        setSuggestions(data.suggestions);
        setCampaignSuggestions(data.campaignSuggestions ?? []);
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

  // Campaign grouping for list view
  const activeCampaignCount = useMemo(() => {
    if (!allDrafts) return 0;
    const ids = new Set<string>();
    for (const d of allDrafts) {
      if (d.campaignId && d.status !== 'PUBLISHED') ids.add(d.campaignId);
    }
    return ids.size;
  }, [allDrafts]);

  // Group drafts by campaign for list view
  const { campaignGroups, standalonesDrafts } = useMemo(() => {
    if (!drafts) return { campaignGroups: [] as Array<{ campaignId: string; campaignName: string; campaignType: string; drafts: Draft[] }>, standalonesDrafts: [] as Draft[] };

    const groups = new Map<string, { campaignId: string; campaignName: string; campaignType: string; drafts: Draft[] }>();
    const standalones: Draft[] = [];

    for (const d of drafts) {
      if (d.campaignId) {
        let group = groups.get(d.campaignId);
        if (!group) {
          group = {
            campaignId: d.campaignId,
            campaignName: d.campaignName || 'Unnamed Campaign',
            campaignType: d.campaignType || 'just_listed',
            drafts: [],
          };
          groups.set(d.campaignId, group);
        }
        group.drafts.push(d);
      } else {
        standalones.push(d);
      }
    }

    // Sort drafts within each group by campaignOrder
    for (const group of Array.from(groups.values())) {
      group.drafts.sort((a, b) => (a.campaignOrder ?? 0) - (b.campaignOrder ?? 0));
    }

    return { campaignGroups: Array.from(groups.values()), standalonesDrafts: standalones };
  }, [drafts]);

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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white-100">Planner</h1>
          {activeCampaignCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 font-medium">
              {activeCampaignCount} campaign{activeCampaignCount !== 1 ? 's' : ''} active
            </span>
          )}
        </div>
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
          clientId={clientId}
        />
      </div>

      {/* Campaign suggestions from recommendation engine */}
      {campaignSuggestions.length > 0 && (
        <div className="card p-4 border-purple-400/20 bg-purple-400/5">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-semibold text-white-60 uppercase tracking-wider">
              Campaign Opportunities
            </h3>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-400/15 text-purple-400">
              {campaignSuggestions.length}
            </span>
          </div>
          <div className="space-y-2">
            {campaignSuggestions.map((cs) => {
              const payload = cs.actionPayload ?? {};
              const params = new URLSearchParams();
              if (payload.listingDataItemId) params.set('listingId', payload.listingDataItemId);
              else if (payload.sourceId) params.set('listingId', payload.sourceId);
              if (payload.campaignType) params.set('type', payload.campaignType);
              else if (cs.suggestedCampaignType) params.set('type', cs.suggestedCampaignType);
              const qs = params.toString();

              return (
                <Link
                  key={cs.id}
                  href={`/workspaces/${clientId}/listing-campaign${qs ? `?${qs}` : ''}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white-5 hover:bg-white-8 border border-white-10 hover:border-purple-400/20 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white-80 group-hover:text-white-100 truncate">
                        {cs.title}
                      </span>
                      <span className={cn(
                        'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                        cs.confidence === 'high'
                          ? 'bg-accent-green-110/15 text-accent-green-110'
                          : 'bg-yellow-400/15 text-yellow-400'
                      )}>
                        {cs.confidence === 'high' ? 'Recommended' : 'Suggested'}
                      </span>
                    </div>
                    {cs.reasons[0] && (
                      <p className="text-[11px] text-white-30 mt-0.5">{cs.reasons[0]}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {cs.actionLabel}
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Timing suggestions */}
      {timingSuggestions && Object.keys(timingSuggestions).length > 0 && (
        <div className="flex items-center gap-3 text-xs text-white-40 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span className="font-medium text-white-30 uppercase tracking-wider">Best times</span>
          </div>
          {Object.entries(timingSuggestions).map(([channel, t]) => (
            <span key={channel} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white-5 border border-white-10">
              <span className="text-white-60">{channel}</span>
              <span className="text-white-30">{t.bestTimeLabel}</span>
              <span className="text-white-20">·</span>
              <span className="text-white-30">{t.bestDays}</span>
            </span>
          ))}
        </div>
      )}

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

        {drafts && drafts.length > 0 && view === 'list' && (campaignGroups.length > 0 || standalonesDrafts.length > 0) && (
          <div className="space-y-4">
            {/* Campaign groups */}
            {[...campaignGroups]
              .sort((a, b) => {
                if (a.campaignId === highlightCampaignId) return -1;
                if (b.campaignId === highlightCampaignId) return 1;
                return 0;
              })
              .map((group) => (
              <CampaignGroup
                key={group.campaignId}
                campaignName={group.campaignName}
                campaignType={group.campaignType}
                drafts={group.drafts}
                selectedIds={selected}
                onSelect={hasApprovable ? handleSelect : undefined}
                highlighted={group.campaignId === highlightCampaignId}
              />
            ))}

            {/* Standalone (non-campaign) drafts */}
            {standalonesDrafts.length > 0 && (
              <div className="space-y-3">
                {campaignGroups.length > 0 && (
                  <p className="text-xs font-medium text-white-30 uppercase tracking-wider">Individual Posts</p>
                )}
                {standalonesDrafts.map((draft) => (
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
        )}

        {/* Calendar view or non-grouped fallback */}
        {drafts && drafts.length > 0 && view === 'calendar' && (
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

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  just_listed: 'Just Listed',
  open_house: 'Open House',
  price_drop: 'Price Drop',
  just_sold: 'Just Sold',
  listing_spotlight: 'Spotlight',
};

function CampaignGroup({
  campaignName,
  campaignType,
  drafts: groupDrafts,
  selectedIds,
  onSelect,
  highlighted,
}: {
  campaignName: string;
  campaignType: string;
  drafts: Draft[];
  selectedIds: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
  highlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(highlighted ?? true);
  const typeLabel = CAMPAIGN_TYPE_LABELS[campaignType] ?? campaignType;
  const scheduledCount = groupDrafts.filter((d) => d.status === 'SCHEDULED' || d.status === 'PUBLISHED').length;

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden bg-white-5/50 transition-colors',
      highlighted ? 'border-accent-green-110/40 ring-1 ring-accent-green-110/20' : 'border-white-10',
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white-8 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-white-30 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white-30 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white-80 truncate">{campaignName}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 shrink-0">
              {typeLabel}
            </span>
          </div>
          <p className="text-xs text-white-30 mt-0.5">
            {groupDrafts.length} posts &middot; {scheduledCount} scheduled
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {groupDrafts.map((draft) => (
            <DraftQueueCard
              key={draft.id}
              draft={draft}
              selected={selectedIds.has(draft.id)}
              onSelect={onSelect}
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
