'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDataItems,
  useBlueprints,
  useBusinessDataLabels,
  type WorkspaceDataItem,
  type ContentBlueprint,
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

// Top-level bucket picker so users can filter the data-item list
// by source type. Defaults to "all" — switching to "properties" or
// "content_assets" filters the list client-side without changing the
// data we fetch from the server. Cheap and clear.
type SourceBucket = 'all' | 'properties' | 'content_assets';

export function QuickPostDataCard({ session, clientId, onSelection }: Props) {
  void session;
  const bdLabels = useBusinessDataLabels(clientId);

  const [bucket, setBucket] = useState<SourceBucket>('all');
  // Sub-bucket inside Content Assets (testimonials, offers, …).
  // Only relevant when `bucket === 'content_assets'`; ignored
  // otherwise.
  const [assetSubBucket, setAssetSubBucket] = useState<string>('all');
  const [selectedDataItem, setSelectedDataItem] = useState<WorkspaceDataItem | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<ContentBlueprint | null>(null);
  const [dataSearch, setDataSearch] = useState('');

  const { data: rawDataItems } = useDataItems(clientId, {
    search: dataSearch.trim() || undefined,
    limit: 60,
  });
  const dataItems = useMemo(() => {
    if (!rawDataItems) return rawDataItems;
    if (bucket === 'properties') return rawDataItems.filter((i) => i.type === 'PROPERTY');
    if (bucket === 'content_assets') {
      // Apply sub-bucket filter on top of the non-PROPERTY filter
      // via the shared filterByBucket helper.
      return filterByBucket(rawDataItems, assetSubBucket);
    }
    return rawDataItems;
  }, [rawDataItems, bucket, assetSubBucket]);

  // Sub-bucket chips: hide buckets with no items so we don't show a
  // long row of empty filters for sparse workspaces.
  const visibleAssetBuckets = useMemo(() => {
    if (!rawDataItems) return CONTENT_ASSET_BUCKETS.slice(0, 1);
    return CONTENT_ASSET_BUCKETS.filter((b) => {
      if (b.key === 'all') return true;
      return filterByBucket(rawDataItems, b.key).length > 0;
    });
  }, [rawDataItems]);
  const { data: blueprints } = useBlueprints(
    selectedDataItem ? { applicableType: selectedDataItem.type } : {}
  );

  const handleConfirm = () => {
    if (!selectedDataItem) return;

    // Batch all actions into a single onSelection call to avoid
    // stale-state issues from multiple sequential dispatches
    const actions: AssistantAction[] = [
      { type: 'SET_QUICK_POST_DATA_ITEM', payload: { id: selectedDataItem.id, title: selectedDataItem.title } },
    ];

    if (selectedBlueprint) {
      actions.push({ type: 'SET_QUICK_POST_BLUEPRINT', payload: selectedBlueprint.id });
    }

    // Auto-fill guidance so the guidance step is skipped
    const guidanceText = selectedBlueprint
      ? `Create a ${selectedBlueprint.name.toLowerCase()} post about ${selectedDataItem.title}`
      : `Create a post about ${selectedDataItem.title}`;
    actions.push({ type: 'SET_QUICK_POST_GUIDANCE', payload: guidanceText });

    const confirmText = `Data: ${selectedDataItem.title}${selectedBlueprint ? ` (${selectedBlueprint.name})` : ''}`;
    onSelection(actions, confirmText);
  };

  return (
    <div className="space-y-3">
      {selectedDataItem ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white-5 border border-accent-green-110/30">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white-40 uppercase">
              {selectedDataItem.type.replace(/_/g, ' ')}
            </p>
            <p className="text-xs font-medium text-white-100 truncate">
              {selectedDataItem.title}
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedDataItem(null);
              setSelectedBlueprint(null);
            }}
            className="p-1 rounded text-white-40 hover:text-white-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1 p-0.5 rounded-lg bg-white-5 border border-white-10">
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'properties', label: 'Properties' },
                { value: 'content_assets', label: 'Content Assets' },
              ] as Array<{ value: SourceBucket; label: string }>
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setBucket(opt.value);
                  // Reset sub-bucket whenever the top-level changes
                  // so the user isn't surprised by a stale filter.
                  if (opt.value !== 'content_assets') setAssetSubBucket('all');
                }}
                className={cn(
                  'flex-1 py-1 rounded-md text-[11px] font-medium transition-colors',
                  bucket === opt.value
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'text-white-60 hover:text-white-100',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sub-bucket chips appear only when the user has narrowed
              the top-level to Content Assets. Buckets with no items
              are filtered out so the row stays scannable. */}
          {bucket === 'content_assets' && visibleAssetBuckets.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {visibleAssetBuckets.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setAssetSubBucket(b.key)}
                  className={cn(
                    'px-2 py-0.5 rounded-full border text-[10px] font-medium transition-colors',
                    assetSubBucket === b.key
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
            value={dataSearch}
            onChange={(e) => setDataSearch(e.target.value)}
            placeholder={`Search ${bdLabels.itemPlural.toLowerCase()}...`}
            className="w-full px-2.5 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          {dataItems && dataItems.length > 0 ? (
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {dataItems.map((item) => {
                const preview = getDataItemPreview(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedDataItem(item);
                      setDataSearch('');
                    }}
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
          ) : dataSearch.trim() ? (
            <p className="text-xs text-white-40 py-2 text-center">No results for &ldquo;{dataSearch.trim()}&rdquo;</p>
          ) : null}
        </>
      )}

      {/* Blueprint picker */}
      {selectedDataItem && blueprints && blueprints.length > 0 && (
        <div>
          <label className="block text-[10px] font-medium text-white-40 uppercase tracking-wider mb-1.5">
            Content Angle
          </label>
          <div className="flex flex-wrap gap-1">
            {blueprints.map((bp) => (
              <button
                key={bp.id}
                type="button"
                onClick={() =>
                  setSelectedBlueprint(selectedBlueprint?.id === bp.id ? null : bp)
                }
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                  selectedBlueprint?.id === bp.id
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-10 text-white-60 hover:bg-white-20'
                )}
              >
                {bp.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedDataItem}
        className="w-full py-2.5 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>

      {!selectedDataItem && (
        <p className="text-center text-[10px] text-white-25">
          Search and select a data item to continue
        </p>
      )}
    </div>
  );
}
