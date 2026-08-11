'use client';

import { useState, useMemo } from 'react';
import { X, Loader2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGenerateContent,
  useBlueprints,
  useChannelSettings,
  useBestBlueprints,
  type WorkspaceDataItem,
  type Channel,
  type ContentBlueprint,
} from '@/hooks/useSquadpitch';
import { StatusBanner } from '@/components/common/StatusBanner';

interface Props {
  clientId: string;
  item: WorkspaceDataItem;
  onClose: () => void;
  onGenerated: (draftId: string) => void;
}

export function GenerateFromDataModal({
  clientId,
  item,
  onClose,
  onGenerated,
}: Props) {
  const { data: blueprints } = useBlueprints({ applicableType: item.type });
  const { data: bestBlueprints } = useBestBlueprints(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const generate = useGenerateContent();

  const [selectedBlueprintId, setSelectedBlueprintId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | ''>('');
  const [guidance, setGuidance] = useState('');

  const enabledChannels = useMemo(
    () => channels?.filter((c) => c.isEnabled) ?? [],
    [channels]
  );

  // Build performance map and sort blueprints by performance (best first)
  const perfMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const bp of bestBlueprints ?? []) {
      if (bp.performance?.avgEngagement != null) {
        map[bp.id] = bp.performance.avgEngagement;
      }
    }
    return map;
  }, [bestBlueprints]);

  const sortedBlueprints = useMemo(() => {
    if (!blueprints) return [];
    return [...blueprints].sort((a: ContentBlueprint, b: ContentBlueprint) => {
      const aPerf = perfMap[a.id] ?? -1;
      const bPerf = perfMap[b.id] ?? -1;
      return bPerf - aPerf;
    });
  }, [blueprints, perfMap]);

  const bestBlueprintId = sortedBlueprints.length > 0 && perfMap[sortedBlueprints[0].id] != null
    ? sortedBlueprints[0].id
    : null;

  const canGenerate =
    selectedBlueprintId && selectedChannel && !generate.isPending;

  const handleGenerate = () => {
    if (!canGenerate) return;
    generate.mutate(
      {
        clientId,
        kind: 'POST',
        channel: selectedChannel as Channel,
        guidance: guidance.trim() || `Generate content from: ${item.title}`,
        dataItemId: item.id,
        blueprintId: selectedBlueprintId,
      },
      {
        onSuccess: (draft) => {
          onGenerated(draft.id);
          onClose();
        },
      }
    );
  };

  return (
    <div className="mobile-dialog-backdrop fixed inset-0 z-50 flex justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Create post from source">
      <div className="mobile-dialog-surface w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white-10 bg-sp-bg p-4 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white-100">
            Create Post from Source
          </h2>
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white-40 transition-colors hover:bg-white-10 hover:text-white-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Data item summary */}
        <div className="rounded-lg bg-white-5 border border-white-10 p-3 mb-5">
          <p className="text-xs text-white-40 uppercase tracking-wider mb-1">
            {item.type.replace(/_/g, ' ')}
          </p>
          <p className="text-sm font-semibold text-white-100">{item.title}</p>
          {item.summary && (
            <p className="text-xs text-white-40 mt-1 line-clamp-2">
              {item.summary}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {/* Blueprint picker */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
              Content Angle
            </label>
            {!blueprints || blueprints.length === 0 ? (
              <p className="text-sm text-white-40 italic">
                No content angles available for this source type.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {sortedBlueprints.map((bp) => {
                  const eng = perfMap[bp.id];
                  const isRecommended = bp.id === bestBlueprintId;
                  return (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => setSelectedBlueprintId(bp.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-colors',
                        selectedBlueprintId === bp.id
                          ? 'border-accent-green-110 bg-accent-green-110/5'
                          : 'border-white-10 bg-white-5 hover:border-white-20'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white-100">
                          {bp.name}
                        </p>
                        {isRecommended && (
                          <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-semibold">
                            Recommended
                          </span>
                        )}
                        {eng != null && (
                          <span className="ml-auto text-[10px] text-white-40 font-medium flex-shrink-0">
                            {eng.toFixed(1)}% avg eng
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white-40 mt-0.5">
                        {bp.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Channel selector */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2">
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {enabledChannels.map((c) => (
                <button
                  key={c.channel}
                  type="button"
                  onClick={() => setSelectedChannel(c.channel)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    selectedChannel === c.channel
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  {c.channel}
                </button>
              ))}
            </div>
          </div>

          {/* Optional guidance */}
          <div>
            <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
              Additional Guidance (optional)
            </label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="Any extra instructions for this post..."
              rows={2}
              maxLength={4000}
              className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none placeholder:text-white-30"
            />
          </div>

          {generate.error && (
            <StatusBanner error={(generate.error as Error).message} />
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Create Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
