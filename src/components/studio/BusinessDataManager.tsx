'use client';

import { useState, useMemo } from 'react';
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
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDataItems,
  useArchiveDataItem,
  useDataSuggestions,
  type WorkspaceDataItem,
  type DataItemType,
  type DataItemStatus,
} from '@/hooks/useSquadpitch';
import { DataItemCard, TYPE_LABELS } from './DataItemCard';
import { AddDataItemModal } from './AddDataItemModal';
import { GenerateFromDataModal } from './GenerateFromDataModal';
import { BulkGenerateModal } from './BulkGenerateModal';
import { AutopilotPanel } from './AutopilotPanel';
import { ImportDataModal } from './ImportDataModal';

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

interface Props {
  clientId: string;
}

export function BusinessDataManager({ clientId }: Props) {
  const [typeFilter, setTypeFilter] = useState<DataItemType | ''>('');
  const [statusFilter, setStatusFilter] = useState<DataItemStatus>('ACTIVE');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTopPerforming, setShowTopPerforming] = useState(false);

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

  const selectedItems = useMemo(
    () => (items ?? []).filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white-100">Business Data</h1>
          <p className="text-white-40 mt-1 text-sm">
            Add your testimonials, stats, and business data to generate
            data-driven content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutopilot(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Autopilot
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors"
          >
            <Download className="w-4 h-4" />
            Import Data
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
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
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              showTopPerforming
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white-10 text-white-60 hover:bg-white-20'
            )}
          >
            <TrendingUp className="w-3 h-3" />
            Top Performing
          </button>
        </div>

        {/* Status toggle */}
        <div className="flex rounded-lg bg-white-5 border border-white-10 p-0.5 ml-auto">
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
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
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              statusFilter === 'ARCHIVED'
                ? 'bg-white-10 text-white-100'
                : 'text-white-40 hover:text-white-60'
            )}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Performance summary */}
      {perfSummary && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-xs text-white-60">
          <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span>
            <span className="text-green-400 font-semibold">{perfSummary.highPerf}</span> high-performing
            {perfSummary.highPerf === 1 ? ' item' : ' items'}
            {perfSummary.untested > 0 && (
              <>, <span className="text-white-40 font-semibold">{perfSummary.untested}</span> untested</>
            )}
          </span>
        </div>
      )}

      {/* Smart suggestions */}
      {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestionsData.suggestions.slice(0, 3).map((s) => {
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
            const [bgColor, textColor, borderColor] = color.split(' ');
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

      {/* Search + bulk actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search data items..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>

        {items && items.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="px-3 py-2.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
          >
            {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
          </button>
        )}

        {selectedItems.length > 0 && (
          <button
            onClick={() => setShowBulkGenerate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold hover:bg-accent-green-110/20 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Bulk Generate ({selectedItems.length})
          </button>
        )}
      </div>

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
                : 'No business data yet. Add your first item to start generating data-driven content.'}
          </p>
          {!search && statusFilter === 'ACTIVE' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-white-10 text-white-60 text-sm font-medium hover:bg-white-20 transition-colors"
            >
              Add your first data item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayItems.map((item) => (
            <DataItemCard
              key={item.id}
              item={item}
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
