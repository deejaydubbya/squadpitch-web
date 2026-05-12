'use client';

// Content-asset picker for campaign mode. Lists every non-PROPERTY
// WorkspaceDataItem in the workspace bucketed by type so users can
// find a testimonial, FAQ, or offer without scrolling past every
// milestone. Type-specific previews (quote + author for
// testimonials, metric/value for stats, etc.) come from
// dataItemBuckets.ts so the same logic powers QuickPostDataCard.

import { useMemo, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDataItems,
  type WorkspaceDataItem,
} from '@/hooks/useSquadpitch';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import {
  CONTENT_ASSET_BUCKETS,
  filterByBucket,
  getDataItemPreview,
} from '@/lib/assistant/dataItemBuckets';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}

export function CampaignDataItemCard({ session, clientId, onSelection }: Props) {
  void session;
  const [selected, setSelected] = useState<WorkspaceDataItem | null>(null);
  const [search, setSearch] = useState('');
  const [bucket, setBucket] = useState<string>('all');

  // Pull all data items for this workspace. We filter client-side by
  // bucket (server doesn't support exclusion or multi-type queries).
  const { data: allItems, isLoading } = useDataItems(clientId, {
    search: search.trim() || undefined,
    limit: 60,
  });
  const items = useMemo(
    () => filterByBucket(allItems ?? [], bucket),
    [allItems, bucket],
  );

  // Only show bucket chips for buckets that actually have items.
  // 'All' is always shown so the user can reset the filter.
  const visibleBuckets = useMemo(() => {
    if (!allItems) return CONTENT_ASSET_BUCKETS.slice(0, 1);
    return CONTENT_ASSET_BUCKETS.filter((b) => {
      if (b.key === 'all') return true;
      return filterByBucket(allItems, b.key).length > 0;
    });
  }, [allItems]);

  const handleConfirm = () => {
    if (!selected) return;
    onSelection(
      {
        type: 'SET_CAMPAIGN_DATA_ITEM',
        payload: {
          id: selected.id,
          title: selected.title,
          itemType: selected.type,
          data: (selected.dataJson as Record<string, unknown>) ?? {},
        },
      },
      `Asset: ${selected.title}`,
    );
  };

  return (
    <div className="space-y-3">
      {selected ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white-5 border border-accent-green-110/30">
          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white-40 uppercase">{selected.type.replace(/_/g, ' ')}</p>
            <p className="text-xs font-medium text-white-100 truncate">{selected.title}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="p-1 rounded text-white-40 hover:text-white-100"
            aria-label="Clear selection"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          {/* Bucket chips. Only buckets with items render so the row
              doesn't dominate the card in workspaces with limited
              content. */}
          {visibleBuckets.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {visibleBuckets.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBucket(b.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors',
                    bucket === b.key
                      ? 'bg-accent-green-110 border-accent-green-110 text-sp-surface'
                      : 'bg-white-5 border-white-10 text-white-60 hover:bg-white-10 hover:text-white-100',
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content assets..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          {isLoading ? (
            <p className="text-xs text-white-40 py-2 text-center">Loading…</p>
          ) : items.length > 0 ? (
            <div className="space-y-1 max-h-[260px] overflow-y-auto">
              {items.map((item) => {
                const preview = getDataItemPreview(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="w-full text-left p-2 rounded-lg bg-white-5 hover:bg-white-10 transition-colors"
                  >
                    <span className="text-[10px] text-white-40 uppercase">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs font-medium text-white-100 truncate">
                      {preview.primary}
                    </p>
                    {preview.secondary && (
                      <p className="text-[11px] text-white-40 truncate">
                        {preview.secondary}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white-40 py-2 text-center">
              {search.trim()
                ? `No content assets matching "${search.trim()}"`
                : bucket === 'all'
                  ? "No content assets yet. Add some from the Data page first."
                  : "Nothing in this category yet."}
            </p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selected}
        className="w-full py-2.5 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
