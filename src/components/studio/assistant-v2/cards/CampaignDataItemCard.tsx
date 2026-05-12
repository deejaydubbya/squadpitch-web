'use client';

// Content-asset picker for campaign mode. Surfaces every
// WorkspaceDataItem in the workspace that isn't a PROPERTY (those go
// through PropertySelectCard). Re-uses the same `useDataItems` hook
// that powers Single Post → Use my data.

import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDataItems,
  type WorkspaceDataItem,
} from '@/hooks/useSquadpitch';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction | AssistantAction[], confirmationText: string) => void;
}

export function CampaignDataItemCard({ session, clientId, onSelection }: Props) {
  void session;
  const [selected, setSelected] = useState<WorkspaceDataItem | null>(null);
  const [search, setSearch] = useState('');

  // No `type` filter — we want all non-PROPERTY items. Server-side
  // filtering by exclusion isn't a supported param, so filter
  // client-side after fetch.
  const { data: allItems, isLoading } = useDataItems(clientId, {
    search: search.trim() || undefined,
    limit: 40,
  });
  const items = (allItems ?? []).filter((i) => i.type !== 'PROPERTY');

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
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content assets..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          {isLoading ? (
            <p className="text-xs text-white-40 py-2 text-center">Loading…</p>
          ) : items.length > 0 ? (
            <div className="space-y-1 max-h-[240px] overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={cn(
                    'w-full text-left p-2 rounded-lg bg-white-5 hover:bg-white-10 transition-colors',
                  )}
                >
                  <span className="text-[10px] text-white-40 uppercase">{item.type.replace(/_/g, ' ')}</span>
                  <p className="text-xs font-medium text-white-100 truncate">{item.title}</p>
                  {item.summary && (
                    <p className="text-[11px] text-white-40 truncate">{item.summary}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white-40 py-2 text-center">
              {search.trim()
                ? `No content assets matching "${search.trim()}"`
                : "No content assets yet. Add some from the Data page first."}
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
