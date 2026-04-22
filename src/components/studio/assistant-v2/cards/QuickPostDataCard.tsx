'use client';

import { useState } from 'react';
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

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}

export function QuickPostDataCard({ session, clientId, onSelection }: Props) {
  const bdLabels = useBusinessDataLabels(clientId);

  const [selectedDataItem, setSelectedDataItem] = useState<WorkspaceDataItem | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<ContentBlueprint | null>(null);
  const [dataSearch, setDataSearch] = useState('');

  const { data: dataItems } = useDataItems(clientId, {
    search: dataSearch.trim() || undefined,
    limit: 20,
  });
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
          <input
            value={dataSearch}
            onChange={(e) => setDataSearch(e.target.value)}
            placeholder={`Search ${bdLabels.itemPlural.toLowerCase()}...`}
            className="w-full px-2.5 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          {dataItems && dataItems.length > 0 && (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {dataItems.map((item) => (
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
                    {item.title}
                  </p>
                </button>
              ))}
            </div>
          )}
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
