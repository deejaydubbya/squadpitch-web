'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Inbox, Check, Loader2, Calendar, List, Clock, HelpCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDrafts,
  useAutoSchedule,
  useDashboardRecommendations,
  usePlannerSuggestions,
  usePlanMyWeek,
  useSwapSuggestion,
  useAutopilotExecute,
  useChannelSettings,
  useChannelConnectionStatus,
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
import { SuggestionCard } from './SuggestionCard';
import { PlannerWelcomeCard } from './PlannerWelcomeCard';
import { PlannerTour } from './PlannerTour';
import { FirstWeekProgress } from './FirstWeekProgress';
import { PlannerSetupChecklist } from './PlannerSetupChecklist';
import { CampaignFocusView } from './CampaignFocusView';
import { CampaignSection } from './CampaignSection';
import { groupDraftsByCampaign } from './campaignGrouping';
import { MobilePlannerAgenda } from './MobilePlannerAgenda';

interface Props {
  clientId: string;
}

const STATUS_FILTERS: Array<{
  label: string;
  value: DraftStatus | 'ALL';
}> = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Needs Review', value: 'PENDING_REVIEW' },
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
  const router = useRouter();
  const highlightCampaignId = searchParams.get('campaignId') ?? null;

  // Campaign focus mode — shown when arriving from campaign launch
  const [focusDismissed, setFocusDismissed] = useState(false);
  const focusMode = Boolean(highlightCampaignId) && !focusDismissed;

  // Auto-switch to list view when arriving from campaign launch so the user
  // immediately sees the grouped campaign instead of the calendar.
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'ALL'>('ALL');
  const [channelFilter, setChannelFilter] = useState<Channel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Campaign expand/collapse state
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

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

  const { data: channelSettings } = useChannelSettings(clientId);
  const connectionStatus = useChannelConnectionStatus(clientId);
  const enabledChannels = channelSettings?.filter((c) => c.isEnabled) ?? [];
  const hasEnabledButNoneConnected = enabledChannels.length > 0 && connectionStatus.size === 0;

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

  // Search filter
  const searchFiltered = useMemo(() => {
    if (!channelFiltered) return undefined;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return channelFiltered;
    return channelFiltered.filter((d) => {
      const body = d.body?.toLowerCase() ?? '';
      const hashtags = d.hashtags?.join(' ').toLowerCase() ?? '';
      const cta = d.cta?.toLowerCase() ?? '';
      const hooks = d.hooks?.join(' ').toLowerCase() ?? '';
      const campaign = d.campaignName?.toLowerCase() ?? '';
      const listing = d.sourceMeta?.listingTitle?.toLowerCase() ?? '';
      return (
        body.includes(q) ||
        hashtags.includes(q) ||
        cta.includes(q) ||
        hooks.includes(q) ||
        campaign.includes(q) ||
        listing.includes(q)
      );
    });
  }, [channelFiltered, searchQuery]);

  // Day filter (only in calendar view)
  const drafts = useMemo(() => {
    if (!searchFiltered) return undefined;
    if (!selectedDay || view !== 'calendar') return searchFiltered;

    return searchFiltered.filter((d) => {
      const date = d.scheduledFor ?? d.publishedAt;
      if (!date) return false;
      const dt = new Date(date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      return key === selectedDay;
    });
  }, [searchFiltered, selectedDay, view]);

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
  const { campaignGroups, standaloneDrafts: standalonesDrafts } = useMemo(() => {
    if (!drafts) return { campaignGroups: [], standaloneDrafts: [] as Draft[] };
    return groupDraftsByCampaign(drafts);
  }, [drafts]);

  // Auto-expand most recent campaign (and highlighted campaign if present)
  useEffect(() => {
    const initial = new Set<string>();
    if (highlightCampaignId) initial.add(highlightCampaignId);
    if (campaignGroups.length > 0 && !initial.has(campaignGroups[0].campaignId)) {
      initial.add(campaignGroups[0].campaignId);
    }
    if (initial.size > 0) setExpandedCampaigns(initial);
  }, [campaignGroups.length > 0 ? campaignGroups[0]?.campaignId : '', highlightCampaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCampaignExpand = useCallback((campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
  }, []);

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

  const approvableIds = useMemo(
    () => (drafts ?? []).filter((d) => d.status === 'DRAFT' || d.status === 'PENDING_REVIEW').map((d) => d.id),
    [drafts]
  );
  const hasApprovable = approvableIds.length > 0;

  const approvedUnscheduled = useMemo(
    () => allDrafts?.filter((d) => d.status === 'APPROVED' && !d.scheduledFor) ?? [],
    [allDrafts]
  );

  // Campaign focus mode — filtered drafts for the highlighted campaign
  const focusCampaignDrafts = useMemo(() => {
    if (!highlightCampaignId || !allDrafts) return [];
    return allDrafts
      .filter((d) => d.campaignId === highlightCampaignId)
      .sort((a, b) => (a.campaignOrder ?? 0) - (b.campaignOrder ?? 0));
  }, [allDrafts, highlightCampaignId]);

  const handleExitFocusMode = useCallback(() => {
    setFocusDismissed(true);
    router.replace(`/workspaces/${clientId}/planner`, { scroll: false });
  }, [router, clientId]);

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

  // ── Campaign focus mode early return ──────────────────────────────────
  if (focusMode && isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (focusMode && focusCampaignDrafts.length > 0) {
    return (
      <CampaignFocusView
        clientId={clientId}
        campaignDrafts={focusCampaignDrafts}
        onExitFocusMode={handleExitFocusMode}
        selectedIds={selected}
        onSelect={hasApprovable ? handleSelect : undefined}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white-100">Planner</h1>
            {activeCampaignCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 font-medium">
                {activeCampaignCount} campaign{activeCampaignCount !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
          <p className="text-sm text-white-40 mt-1">Manage, review, and schedule your posts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Approve All — prominent when approvable drafts exist */}
          {hasApprovable && (
            <button
              onClick={selected.size > 0 ? clearSelection : selectAll}
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-zone-green/20 px-3 py-2 text-xs font-semibold text-zone-green transition-colors hover:bg-zone-green/30"
            >
              <Check className="w-3.5 h-3.5" />
              {selected.size > 0
                ? `Deselect (${selected.size})`
                : `Approve All (${approvableIds.length})`}
            </button>
          )}
          {selected.size > 0 && (
            <BulkApproveButton ids={Array.from(selected)} onDone={clearSelection} />
          )}
          <Link
            href={`/workspaces/${clientId}/create?intent=single_post`}
            className="flex min-h-11 items-center rounded-lg bg-accent-green-110 px-3 py-2 text-xs font-semibold text-sp-dark transition-colors hover:bg-accent-green-110/90"
          >
            New Post
          </Link>
          <Link
            href={`/workspaces/${clientId}/create?intent=campaign`}
            className="hidden min-h-11 items-center rounded-lg bg-white-10 px-3 py-2 text-xs font-semibold text-white-80 transition-colors hover:bg-white-20 sm:flex"
          >
            New Campaign
          </Link>
          {/* Tour replay button */}
          <button
            onClick={handleStartTour}
            className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-white-30 transition-colors hover:bg-white-10 hover:text-white-60 sm:flex"
            title="Take a quick tour"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 bg-white-5 rounded-lg p-0.5">
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                view === 'calendar'
                  ? 'bg-white-10 text-white-100'
                  : 'text-white-40 hover:text-white-60'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="lg:hidden">Agenda</span><span className="hidden lg:inline">Calendar</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
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

      {/* Channel connection warning */}
      {hasEnabledButNoneConnected && (
        <StatusBanner
          warning={`You have ${enabledChannels.length} channel${enabledChannels.length !== 1 ? 's' : ''} enabled but none are connected. Connect your accounts to schedule and publish.`}
        />
      )}

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

      {/* Search + Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search content..."
            aria-label="Search posts"
            className="min-h-11 w-full rounded-lg border border-white-10 bg-white-5 pl-9 pr-14 text-base text-white-100 transition-colors placeholder:text-white-30 focus:border-accent-green-110 focus:outline-none sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white-30 hover:text-white-60 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status filters */}
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === 'ALL' ? totalCount : (statusCounts[f.value] ?? 0);
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'min-h-11 shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-colors',
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

        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          {CHANNEL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setChannelFilter(f.value)}
              className={cn(
                'min-h-10 shrink-0 rounded px-3 py-2 text-xs font-medium transition-colors',
                channelFilter === f.value
                  ? 'bg-white-20 text-white-100'
                  : 'text-white-40 hover:text-white-60'
              )}
            >
              {f.label}
            </button>
          ))}

          {/* Results count — shown when filtering */}
          {drafts && (statusFilter !== 'ALL' || channelFilter !== 'ALL' || searchQuery.trim()) && (
            <span className="text-[11px] text-white-30 ml-2">
              Showing {drafts.length} of {totalCount}
            </span>
          )}
        </div>

        {/* Auto-schedule */}
        {approvedUnscheduled.length > 0 && (
          <div className="flex items-center gap-3" data-tour-step="plan-week">
            <button
              onClick={handleAutoSchedule}
              disabled={autoSchedule.isPending}
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-accent-green-110/10 px-3 py-2 text-xs font-medium text-accent-green-110 transition-colors hover:bg-accent-green-110/20 disabled:opacity-50"
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
          <div className="hidden lg:block">
            <CalendarGrid
              drafts={channelFiltered}
              suggestions={visibleSuggestions}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onSelectSuggestion={handleSelectSuggestion}
            />
          </div>
          <div className="lg:hidden">
            <MobilePlannerAgenda
              drafts={searchFiltered ?? []}
              selectedIds={selected}
              onSelect={hasApprovable ? handleSelect : undefined}
            />
          </div>
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

      {/* Day detail label */}
      {selectedDay && view === 'calendar' && (
        <div className="hidden items-center gap-2 lg:flex">
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
          <div className="card p-8 text-center space-y-3">
            <Inbox className="w-8 h-8 text-white-40 mx-auto" />
            <p className="text-sm text-white-60">No drafts match this filter.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Link
                href={`/workspaces/${clientId}/create?intent=campaign`}
                className="px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-dark text-xs font-semibold hover:bg-accent-green-110/90 transition-colors"
              >
                Create your first campaign with guided setup
              </Link>
              <Link
                href={`/workspaces/${clientId}/create?intent=single_post`}
                className="px-3 py-1.5 rounded-lg bg-white-10 text-white-80 text-xs font-semibold hover:bg-white-20 transition-colors"
              >
                New post
              </Link>
            </div>
          </div>
        )}

        {drafts && drafts.length > 0 && view === 'list' && (campaignGroups.length > 0 || standalonesDrafts.length > 0) && (
          <div className="space-y-4">
            {/* Campaign sections */}
            {campaignGroups.map((group) => (
              <CampaignSection
                key={group.campaignId}
                clientId={clientId}
                campaignId={group.campaignId}
                campaignDrafts={group.drafts}
                expanded={expandedCampaigns.has(group.campaignId)}
                onToggleExpand={() => toggleCampaignExpand(group.campaignId)}
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
          <div className="hidden space-y-3 lg:block">
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
