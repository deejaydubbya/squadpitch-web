'use client';

import { useState, useMemo } from 'react';
import { X, Loader2, Wand2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useBulkGenerate,
  useBlueprints,
  useChannelSettings,
  useBestBlueprints,
  type WorkspaceDataItem,
  type Channel,
  type BulkGenerateItem,
} from '@/hooks/useSquadpitch';

interface Props {
  clientId: string;
  items: WorkspaceDataItem[];
  onClose: () => void;
}

export function BulkGenerateModal({ clientId, items, onClose }: Props) {
  const { data: blueprints } = useBlueprints();
  const { data: bestBlueprintsList } = useBestBlueprints(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const bulkGenerate = useBulkGenerate(clientId);

  const [channel, setChannel] = useState<Channel | ''>('');
  const [blueprintMap, setBlueprintMap] = useState<Record<string, string>>({});
  const [autoOptimized, setAutoOptimized] = useState(false);

  const enabledChannels = useMemo(
    () => channels?.filter((c) => c.isEnabled) ?? [],
    [channels]
  );

  // Build performance lookup for blueprints
  const perfLookup = useMemo(() => {
    const map: Record<string, number> = {};
    for (const bp of bestBlueprintsList ?? []) {
      if (bp.performance?.avgEngagement != null) {
        map[bp.id] = bp.performance.avgEngagement;
      }
    }
    return map;
  }, [bestBlueprintsList]);

  const setBlueprintForItem = (itemId: string, bpId: string) => {
    setBlueprintMap((prev) => ({ ...prev, [itemId]: bpId }));
    setAutoOptimized(false);
  };

  const getApplicableBlueprints = (type: string) =>
    blueprints?.filter((bp) => bp.applicableTypes.includes(type as never)) ?? [];

  // Auto-assign best-performing blueprint per item type
  useMemo(() => {
    if (!blueprints || !bestBlueprintsList || Object.keys(blueprintMap).length > 0) return;
    const auto: Record<string, string> = {};
    for (const item of items) {
      const applicable = getApplicableBlueprints(item.type);
      if (applicable.length === 0) continue;
      // Pick the one with highest performance, or first if no data
      const sorted = [...applicable].sort(
        (a, b) => (perfLookup[b.id] ?? -1) - (perfLookup[a.id] ?? -1)
      );
      auto[item.id] = sorted[0].id;
    }
    if (Object.keys(auto).length > 0) {
      setBlueprintMap(auto);
      setAutoOptimized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprints, bestBlueprintsList]);

  const allAssigned = items.every((item) => blueprintMap[item.id]);
  const canGenerate = channel && allAssigned && !bulkGenerate.isPending;

  const handleGenerate = () => {
    if (!canGenerate) return;
    const bulkItems: BulkGenerateItem[] = items.map((item) => ({
      dataItemId: item.id,
      blueprintId: blueprintMap[item.id],
      channel: channel as Channel,
    }));
    bulkGenerate.mutate(bulkItems);
  };

  return (
    <div className="mobile-dialog-backdrop fixed inset-0 z-50 flex justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Create posts from selected items">
      <div className="mobile-dialog-surface w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white-10 bg-sp-bg p-4 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white-100">
            Create Posts ({items.length} items)
          </h2>
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white-40 transition-colors hover:bg-white-10 hover:text-white-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel selector */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
            Platform
          </label>
          <div className="flex flex-wrap gap-2">
            {enabledChannels.map((c) => (
              <button
                key={c.channel}
                type="button"
                onClick={() => setChannel(c.channel)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  channel === c.channel
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-10 text-white-60 hover:bg-white-20'
                )}
              >
                {c.channel}
              </button>
            ))}
          </div>
        </div>

        {/* Item-to-blueprint assignment */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2">
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider">
              Content Angle
            </label>
            {autoOptimized && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-semibold">
                Auto-optimized
              </span>
            )}
          </div>
          {items.map((item) => {
            const applicable = getApplicableBlueprints(item.type);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white-5 border border-white-10"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white-100 truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-white-40 uppercase">
                    {item.type.replace(/_/g, ' ')}
                  </p>
                </div>
                <select
                  value={blueprintMap[item.id] ?? ''}
                  onChange={(e) =>
                    setBlueprintForItem(item.id, e.target.value)
                  }
                  className="px-2 py-1.5 rounded-lg bg-white-10 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 min-w-[160px]"
                >
                  <option value="">Select angle...</option>
                  {applicable.map((bp) => (
                    <option key={bp.id} value={bp.id}>
                      {bp.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Results */}
        {bulkGenerate.data && (
          <div className="mb-5 p-3 rounded-lg bg-white-5 border border-white-10">
            <p className="text-sm font-semibold text-white-100 mb-2">
              Created {bulkGenerate.data.generated} / {bulkGenerate.data.total}
            </p>
            <div className="space-y-1">
              {bulkGenerate.data.results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs"
                >
                  {r.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="text-white-60">
                    {items.find((it) => it.id === r.dataItemId)?.title ?? r.dataItemId}
                  </span>
                  <span
                    className={cn(
                      'ml-auto',
                      r.status === 'success'
                        ? 'text-green-400'
                        : 'text-red-400'
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={bulkGenerate.data ? onClose : handleGenerate}
          disabled={!bulkGenerate.data && !canGenerate}
          className="w-full py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bulkGenerate.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : bulkGenerate.data ? (
            'Done'
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Create All
            </>
          )}
        </button>
      </div>
    </div>
  );
}
