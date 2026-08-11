'use client';

import { useState, useMemo } from 'react';
import { Search, Home, Plus, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useProperties,
  useArchiveDataItem,
  type WorkspaceDataItem,
} from '@/hooks/useSquadpitch';
import { PropertyCard } from '@/components/studio/PropertyCard';
import { PropertyDetailDrawer } from '@/components/studio/PropertyDetailDrawer';
import { AddPropertyModal } from '@/components/studio/AddPropertyModal';
import { ImportPropertyUrlModal } from '@/components/studio/ImportPropertyUrlModal';

const STATUS_FILTERS = ['All', 'Active', 'Pending', 'Sold'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

interface Props {
  clientId: string;
}

export function PropertyLibrary({ clientId }: Props) {
  const { data: properties, isLoading } = useProperties(clientId);
  const archive = useArchiveDataItem(clientId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [editItem, setEditItem] = useState<WorkspaceDataItem | null>(null);
  const selectedItem = properties?.find((p) => p.id === selectedItemId) ?? null;

  const filtered = useMemo(() => {
    if (!properties) return [];
    return properties.filter((item) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const d = item.dataJson as Record<string, unknown>;
        const haystack = [
          item.title,
          d.street,
          d.city,
          d.state,
          d.zip,
          d.address,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Status filter
      if (statusFilter !== 'All') {
        const d = item.dataJson as Record<string, unknown>;
        const itemStatus = ((d.status as string) ?? '').toLowerCase();
        if (itemStatus !== statusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [properties, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Home className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Property Library
          </h2>
          {properties && properties.length > 0 && (
            <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
              {properties.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            data-testid="property-import-url-button"
            onClick={() => setShowImportUrl(true)}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white-10 bg-white-5 px-3 py-2 text-xs font-semibold text-white-100 transition-colors hover:bg-white-10 sm:flex-none"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Import from URL
          </button>
          <button
            data-testid="property-add-button"
            onClick={() => setShowAdd(true)}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-green-110 px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-accent-green-110/90 sm:flex-none"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Property
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white-30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address..."
            className="min-h-11 w-full rounded-lg border border-white-10 bg-white-5 py-2 pl-9 pr-3 text-sm text-white-100 placeholder:text-white-30 focus:border-accent-green-110 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'min-h-11 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-teal-500/20 text-teal-300'
                  : 'bg-white-5 text-white-40 hover:text-white-100'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white-10 bg-white-5 p-4 space-y-3 animate-pulse"
            >
              <div className="h-32 rounded-lg bg-white/10" />
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-5 w-1/2 rounded bg-white/10" />
              <div className="h-3 w-2/3 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white-30">
          <Home className="w-10 h-10 mb-3" />
          <p className="text-sm">
            {properties && properties.length > 0
              ? 'No properties match your filters.'
              : 'No saved properties yet. Import from search, URL, or CSV.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <PropertyCard
              key={item.id}
              item={item}
              clientId={clientId}
              onArchive={(id) => archive.mutate(id)}
              onEdit={() => setEditItem(item)}
              onClick={() => setSelectedItemId(item.id)}
            />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selectedItem && (
        <PropertyDetailDrawer
          item={selectedItem}
          clientId={clientId}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItemId(null)}
        />
      )}

      {(showAdd || editItem) && (
        <AddPropertyModal
          clientId={clientId}
          editItem={editItem}
          onClose={() => {
            setShowAdd(false);
            setEditItem(null);
          }}
        />
      )}

      {showImportUrl && (
        <ImportPropertyUrlModal
          clientId={clientId}
          onClose={() => setShowImportUrl(false)}
        />
      )}
    </div>
  );
}
