'use client';

import { useState, useMemo } from 'react';
import { X, Search, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties, type WorkspaceDataItem } from '@/hooks/useSquadpitch';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

interface Props {
  clientId: string;
  onSelect: (item: WorkspaceDataItem) => void;
  onClose: () => void;
}

export function PropertyPicker({ clientId, onSelect, onClose }: Props) {
  const { data: properties, isLoading } = useProperties(clientId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!properties) return [];
    if (!search) return properties;
    const q = search.toLowerCase();
    return properties.filter((item) => {
      const d = item.dataJson as Record<string, unknown>;
      const haystack = [item.title, d.street, d.city, d.state, d.zip, d.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [properties, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 max-h-[70vh] flex flex-col bg-sp-bg border border-white-10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white-10">
          <div>
            <h2 className="text-base font-semibold text-white-100">Select Property</h2>
            <p className="text-xs text-white-40 mt-0.5">
              Choose a saved property from your library
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white-40 hover:text-white-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-white-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white-30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white-30">
              <Home className="w-8 h-8 mb-2" />
              <p className="text-sm">
                {properties && properties.length > 0
                  ? 'No properties match your search.'
                  : 'No saved properties yet.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const d = item.dataJson as Record<string, unknown>;
              const address =
                item.title && item.title !== 'Untitled Listing'
                  ? item.title
                  : [d.street, d.city, d.state, d.zip].filter(Boolean).join(', ') || 'Unknown address';
              const price = typeof d.price === 'number' ? d.price : null;
              const specs = [
                d.beds != null ? `${d.beds} bd` : null,
                d.baths != null ? `${d.baths} ba` : null,
                d.sqft != null ? `${Number(d.sqft).toLocaleString()} sqft` : null,
              ]
                .filter(Boolean)
                .join(' \u00b7 ');

              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white-10 transition-colors flex items-center gap-3"
                >
                  <Home className="w-4 h-4 text-teal-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white-100 truncate">{address}</p>
                    <p className="text-xs text-white-40 truncate">
                      {[price != null ? fmtCurrency(price) : null, specs]
                        .filter(Boolean)
                        .join(' \u00b7 ')}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
