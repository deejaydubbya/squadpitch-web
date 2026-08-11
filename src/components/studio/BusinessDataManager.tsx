'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  Wand2,
  Loader2,
  TrendingUp,
  Zap,
  Download,
  AlertCircle,
  Lightbulb,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useClient,
  useDataItems,
  useArchiveDataItem,
  useDataSuggestions,
  useBusinessDataLabels,
  type WorkspaceDataItem,
  type DataItemType,
  type DataItemStatus,
} from '@/hooks/useSquadpitch';
import { DataItemCard, TYPE_LABELS, TYPE_COLORS } from './DataItemCard';
import { AddDataItemModal } from './AddDataItemModal';
import { GenerateFromDataModal } from './GenerateFromDataModal';
import { BulkGenerateModal } from './BulkGenerateModal';
import { AutopilotPanel } from './AutopilotPanel';
import { ImportDataModal } from './ImportDataModal';
import Link from 'next/link';

const TYPE_FILTERS: { value: DataItemType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'TESTIMONIAL', label: 'Testimonials' },
  { value: 'CASE_STUDY', label: 'Case Studies' },
  { value: 'STATISTIC', label: 'Statistics' },
  { value: 'PRODUCT_LAUNCH', label: 'Launches' },
  { value: 'PROMOTION', label: 'Promotions' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'TEAM_SPOTLIGHT', label: 'Team' },
  { value: 'MILESTONE', label: 'Milestones' },
  { value: 'INDUSTRY_NEWS', label: 'News' },
  { value: 'EVENT', label: 'Events' },
  { value: 'CUSTOM', label: 'Custom' },
];

// Spinstr425 — PROPERTY is intentionally absent. Properties live
// on the dedicated Properties tab and the API call below passes
// excludeTypes=['PROPERTY'] so they never reach this view.
const RE_TYPE_FILTERS: { value: DataItemType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'TESTIMONIAL', label: 'Testimonials' },
  { value: 'STATISTIC', label: 'Statistics' },
  { value: 'TEAM_SPOTLIGHT', label: 'Team' },
  { value: 'CASE_STUDY', label: 'Case Studies' },
  { value: 'PRODUCT_LAUNCH', label: 'Launches' },
  { value: 'PROMOTION', label: 'Promotions' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'MILESTONE', label: 'Milestones' },
  { value: 'INDUSTRY_NEWS', label: 'News' },
  { value: 'EVENT', label: 'Events' },
];

const RE_SECTION_LABELS: Record<string, string> = {
  TESTIMONIAL: 'Testimonials',
  STATISTIC: 'Market Stats',
  TEAM_SPOTLIGHT: 'Team',
  CASE_STUDY: 'Success Stories',
  EVENT: 'Events',
};

const RE_SECTION_ORDER: DataItemType[] = [
  'TESTIMONIAL', 'STATISTIC', 'TEAM_SPOTLIGHT', 'CASE_STUDY',
  'EVENT', 'MILESTONE', 'PRODUCT_LAUNCH', 'PROMOTION', 'FAQ', 'INDUSTRY_NEWS',
];

interface Props {
  clientId: string;
}

// All DataItemTypes — used to validate the `?type=` deep-link param
// from Settings → Content Sources.
const ALL_DATA_ITEM_TYPES: ReadonlySet<DataItemType> = new Set<DataItemType>([
  'TESTIMONIAL',
  'CASE_STUDY',
  'PRODUCT_LAUNCH',
  'PROMOTION',
  'STATISTIC',
  'MILESTONE',
  'FAQ',
  'TEAM_SPOTLIGHT',
  'INDUSTRY_NEWS',
  'EVENT',
  'PROPERTY',
  'CUSTOM',
]);

export function BusinessDataManager({ clientId }: Props) {
  const { data: client } = useClient(clientId);
  const isRE = client?.industryKey === 'real_estate';
  const bdLabels = useBusinessDataLabels(clientId);
  const searchParams = useSearchParams();
  // Pre-fill the type filter from `?type=…` on first land so the
  // Settings → Content Sources "Manage Testimonials" deep-links
  // open this page already filtered. Only applies on mount; user
  // toggling the chip after that owns the state.
  const initialType = (() => {
    const raw = searchParams.get('type');
    if (!raw) return '' as const;
    return ALL_DATA_ITEM_TYPES.has(raw as DataItemType)
      ? (raw as DataItemType)
      : ('' as const);
  })();
  const [typeFilter, setTypeFilter] = useState<DataItemType | ''>(initialType);
  // Keep `?type=` in sync with browser back/forward so a return to
  // /data?type=PROPERTY still lands on the right filter even if the
  // component is already mounted (Next router keeps state by default).
  useEffect(() => {
    const raw = searchParams.get('type');
    if (!raw) return;
    if (ALL_DATA_ITEM_TYPES.has(raw as DataItemType)) {
      setTypeFilter(raw as DataItemType);
    }
  }, [searchParams]);
  const [statusFilter, setStatusFilter] = useState<DataItemStatus>('ACTIVE');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTopPerforming, setShowTopPerforming] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<WorkspaceDataItem | null>(null);
  const [generateItem, setGenerateItem] = useState<WorkspaceDataItem | null>(
    null
  );
  const [showBulkGenerate, setShowBulkGenerate] = useState(false);
  const [showAutopilot, setShowAutopilot] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: items, isLoading } = useDataItems(clientId, {
    type: typeFilter || undefined,
    // Spinstr425 — Content Assets is the generic asset view;
    // PROPERTY rows live on the dedicated Properties tab.
    excludeTypes: typeFilter ? undefined : ['PROPERTY'],
    status: statusFilter,
    search: search.trim() || undefined,
  });

  const archive = useArchiveDataItem(clientId);
  const { data: suggestionsData } = useDataSuggestions(clientId);

  const displayItems = useMemo(() => {
    if (!items) return [];
    if (!showTopPerforming) return items;
    return items.filter(
      (item) => item.performance?.avgEngagement != null && item.performance.avgEngagement > 0
    );
  }, [items, showTopPerforming]);

  const perfSummary = useMemo(() => {
    if (!items) return null;
    const highPerf = items.filter((i) => (i.performance?.avgEngagement ?? 0) > 5).length;
    const untested = items.filter((i) => !i.performance || i.performance.totalPublished === 0).length;
    if (highPerf === 0 && untested === 0) return null;
    return { highPerf, untested };
  }, [items]);

  // Group items by type for RE sectioned view
  const groupedItems = useMemo(() => {
    if (!isRE || typeFilter || search.trim() || showTopPerforming) return null;
    const groups: Record<string, WorkspaceDataItem[]> = {};
    for (const item of displayItems) {
      const key = item.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    // Sort sections by RE priority order
    return RE_SECTION_ORDER
      .filter((type) => groups[type]?.length > 0)
      .map((type) => ({
        type,
        label: RE_SECTION_LABELS[type] ?? TYPE_LABELS[type] ?? type,
        items: groups[type],
        readyCount: groups[type].filter((i) => i.usageCount === 0).length,
      }));
  }, [isRE, typeFilter, search, showTopPerforming, displayItems]);

  const selectedItems = useMemo(
    () => (items ?? []).filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const suggestions = suggestionsData?.suggestions?.slice(0, 3) ?? [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!items) return;
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 bg-sp-bg border-b border-white-10 -mx-1 px-1 pb-3 pt-1">
        {/* Row 1: Search + perf badge + status + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full flex-1 sm:min-w-[200px] sm:max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${bdLabels.itemPlural.toLowerCase()}...`}
              className="min-h-11 w-full rounded-lg border border-white-10 bg-white-5 py-2 pl-10 pr-4 text-sm text-white-100 placeholder:text-white-30 focus:border-accent-green-110 focus:outline-none"
            />
          </div>

          {/* Performance badge or bulk actions */}
          {selectedItems.length > 0 ? (
            <>
              <button
                onClick={toggleSelectAll}
                className="min-h-11 rounded-lg bg-white-10 px-3 py-2 text-xs font-medium text-white-60 transition-colors hover:bg-white-20"
              >
                {selectedIds.size === items?.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={() => setShowBulkGenerate(true)}
                className="flex min-h-11 items-center gap-1.5 rounded-lg bg-accent-green-110/10 px-3 py-2 text-xs font-semibold text-accent-green-110 transition-colors hover:bg-accent-green-110/20"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Create Posts ({selectedItems.length})
              </button>
            </>
          ) : (
            <>
              {perfSummary && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-xs text-white-60">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400 font-semibold">{perfSummary.highPerf}</span>
                  <span>high-perf</span>
                  {perfSummary.untested > 0 && (
                    <>
                      <span className="text-white-20">·</span>
                      <span className="text-white-40 font-semibold">{perfSummary.untested}</span>
                      <span>untested</span>
                    </>
                  )}
                </div>
              )}

              {items && items.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="min-h-11 rounded-lg bg-white-10 px-3 py-2 text-xs font-medium text-white-60 transition-colors hover:bg-white-20"
                >
                  Select All
                </button>
              )}
            </>
          )}

          {/* Status toggle */}
          <div className="ml-0 flex rounded-lg border border-white-10 bg-white-5 p-0.5 sm:ml-auto">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={cn(
                'min-h-10 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                statusFilter === 'ACTIVE'
                  ? 'bg-white-10 text-white-100'
                  : 'text-white-40 hover:text-white-60'
              )}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={cn(
                'min-h-10 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                statusFilter === 'ARCHIVED'
                  ? 'bg-white-10 text-white-100'
                  : 'text-white-40 hover:text-white-60'
              )}
            >
              Archived
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowAutopilot(true)}
            className="flex min-h-11 items-center gap-1.5 rounded-lg bg-white-10 px-3 py-2 text-xs font-semibold text-white-60 transition-colors hover:bg-white-20"
            title="Autopilot"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Autopilot</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex min-h-11 items-center gap-1.5 rounded-lg bg-white-10 px-3 py-2 text-xs font-semibold text-white-60 transition-colors hover:bg-white-20"
            title={isRE ? 'Import' : 'Import Data'}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{isRE ? 'Import' : 'Import'}</span>
          </button>
          {isRE && (
            <Link
              href={`/workspaces/${clientId}/create?intent=campaign`}
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-white-10 px-3 py-2 text-xs font-semibold text-white-60 transition-colors hover:bg-white-20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Campaign</span>
            </Link>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex min-h-11 items-center gap-1.5 rounded-lg bg-accent-green-110 px-3 py-2 text-xs font-semibold text-sp-surface transition-colors hover:bg-accent-green-120"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

        {/* Row 2: Type filter pills + Top Performing */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(isRE ? RE_TYPE_FILTERS : TYPE_FILTERS).map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={cn(
                'min-h-11 shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                typeFilter === t.value
                  ? 'bg-accent-green-110 text-sp-surface'
                  : 'bg-white-10 text-white-60 hover:bg-white-20'
              )}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowTopPerforming(!showTopPerforming)}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              showTopPerforming
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white-10 text-white-60 hover:bg-white-20'
            )}
          >
            <TrendingUp className="w-3 h-3" />
            Top Performing
          </button>
        </div>
      </div>

      {/* Collapsible suggestions strip */}
      {suggestions.length > 0 && (
        <div>
          <button
            onClick={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-white-5 border border-white-10 text-xs text-white-60 hover:bg-white-10 transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
            <span className="font-semibold text-white-100">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
            <span className="text-white-40 truncate">&mdash; {suggestions[0].title}</span>
            <span className="ml-auto flex-shrink-0">
              {suggestionsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </span>
          </button>

          {!suggestionsCollapsed && (
            <div className="space-y-2 mt-2">
              {suggestions.map((s) => {
                const icon =
                  s.type === 'unused_data' ? AlertCircle :
                  s.type === 'new_data' ? Lightbulb :
                  s.type === 'stale_data' ? Clock :
                  s.type === 'missing_types' ? Plus :
                  Lightbulb;
                const Icon = icon;
                const color =
                  s.type === 'unused_data' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                  s.type === 'new_data' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                  s.type === 'stale_data' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                  s.type === 'missing_types' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                  'text-white-60 bg-white-5 border-white-10';
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg border text-xs',
                      color,
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold">{s.title}</span>
                      <span className="text-white-40 ml-1.5">{s.description}</span>
                    </div>
                    {s.action === 'generate_from_unused' || s.action === 'generate_from_new' || s.action === 'generate_from_stale' ? (
                      <button
                        onClick={() => setShowAutopilot(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold hover:bg-accent-green-110/20 transition-colors flex-shrink-0"
                      >
                        <Wand2 className="w-3 h-3" />
                        Generate
                      </button>
                    ) : s.action === 'add_data' ? (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-semibold hover:bg-white-20 transition-colors flex-shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Item grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white-30" />
        </div>
      ) : !displayItems || displayItems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white-40 text-sm">
            {search
              ? 'No items match your search.'
              : statusFilter === 'ARCHIVED'
                ? 'No archived items.'
                : isRE
                  ? 'Add properties, testimonials, or market data to power your campaigns.'
                  : `No source material yet. Add your first ${bdLabels.itemSingular.toLowerCase()} so Squadpitch can create smarter content.`}
          </p>
          {!search && statusFilter === 'ACTIVE' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-white-10 text-white-60 text-sm font-medium hover:bg-white-20 transition-colors"
            >
              Add your first {bdLabels.itemSingular.toLowerCase()}
            </button>
          )}
        </div>
      ) : groupedItems && groupedItems.length > 0 ? (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <div key={group.type}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                  TYPE_COLORS[group.type as DataItemType] ?? 'bg-white-10 text-white-60'
                )}>
                  {group.label}
                </span>
                <span className="text-xs text-white-30">
                  {group.items.length}
                </span>
                {group.readyCount > 0 && (
                  <span className="text-[10px] text-accent-green-110 ml-1">
                    {group.readyCount} ready for content
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((item) => (
                  <DataItemCard
                    key={item.id}
                    item={item}
                    clientId={clientId}
                    selected={selectedIds.has(item.id)}
                    onSelect={() => toggleSelect(item.id)}
                    onEdit={() => setEditItem(item)}
                    onArchive={() => archive.mutate(item.id)}
                    onGenerate={() => setGenerateItem(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayItems.map((item) => (
            <DataItemCard
              key={item.id}
              item={item}
              clientId={clientId}
              selected={selectedIds.has(item.id)}
              onSelect={() => toggleSelect(item.id)}
              onEdit={() => setEditItem(item)}
              onArchive={() => archive.mutate(item.id)}
              onGenerate={() => setGenerateItem(item)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showAddModal || editItem) && (
        <AddDataItemModal
          clientId={clientId}
          editItem={editItem}
          onClose={() => {
            setShowAddModal(false);
            setEditItem(null);
          }}
        />
      )}

      {generateItem && (
        <GenerateFromDataModal
          clientId={clientId}
          item={generateItem}
          onClose={() => setGenerateItem(null)}
          onGenerated={() => {}}
        />
      )}

      {showBulkGenerate && selectedItems.length > 0 && (
        <BulkGenerateModal
          clientId={clientId}
          items={selectedItems}
          onClose={() => {
            setShowBulkGenerate(false);
            setSelectedIds(new Set());
          }}
        />
      )}

      {showAutopilot && (
        <AutopilotPanel
          clientId={clientId}
          onClose={() => setShowAutopilot(false)}
        />
      )}

      {showImportModal && (
        <ImportDataModal
          clientId={clientId}
          onClose={() => setShowImportModal(false)}
        />
      )}

    </div>
  );
}
