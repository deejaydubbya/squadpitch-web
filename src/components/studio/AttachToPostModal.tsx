'use client';

import { useMemo, useState } from 'react';
import { X, Search, Paperclip, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDrafts,
  useLinkAsset,
  type Channel,
} from '@/hooks/useSquadpitch';

interface Props {
  assetId: string;
  clientId: string;
  onClose: () => void;
  onCreated?: () => void;
}

const CHANNEL_COLORS: Record<Channel, string> = {
  INSTAGRAM: 'bg-pink-500/20 text-pink-400',
  TIKTOK: 'bg-cyan-500/20 text-cyan-400',
  X: 'bg-white-20 text-white-60',
  LINKEDIN: 'bg-blue-500/20 text-blue-400',
  LINKEDIN_ORGANIZATION_PAGE: 'bg-blue-500/20 text-blue-400',
  FACEBOOK: 'bg-blue-600/20 text-blue-300',
  YOUTUBE: 'bg-red-500/20 text-red-400',
  PINTEREST: 'bg-red-600/20 text-red-300',
  THREADS: 'bg-white-20 text-white-60',
  REDDIT: 'bg-orange-500/20 text-orange-400',
  GOOGLE_BUSINESS_PROFILE: 'bg-amber-500/20 text-amber-400',
};

export function AttachToPostModal({ assetId, clientId, onClose, onCreated }: Props) {
  const [search, setSearch] = useState('');
  const { data: drafts, isLoading } = useDrafts({ clientId, limit: 200 });
  const linkAsset = useLinkAsset(clientId);

  const eligible = useMemo(() => {
    const filtered = drafts?.filter(
      (d) => d.status === 'DRAFT' || d.status === 'APPROVED'
    ) ?? [];

    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(
      (d) =>
        d.body.toLowerCase().includes(q) ||
        d.channel.toLowerCase().includes(q)
    );
  }, [drafts, search]);

  const handleAttach = (draftId: string) => {
    linkAsset.mutate(
      { assetId, draftId },
      { onSuccess: onClose }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-sp-surface rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white-10">
          <h3 className="text-sm font-semibold text-white-100 flex items-center gap-2">
            <Paperclip className="w-4 h-4" /> Attach to post
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white-40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
              autoFocus
            />
          </div>
        </div>

        {/* Draft list */}
        <div className="max-h-80 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-white-40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading drafts…
            </div>
          ) : eligible.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-white-40">
                {search.trim() ? 'No matching drafts' : 'No eligible drafts'}
              </p>
            </div>
          ) : (
            eligible.map((d) => (
              <button
                key={d.id}
                onClick={() => handleAttach(d.id)}
                disabled={linkAsset.isPending}
                className={cn(
                  'w-full text-left p-3 rounded-lg hover:bg-white-5 transition-colors flex items-start gap-3',
                  linkAsset.isPending && 'opacity-50 pointer-events-none'
                )}
              >
                <span className={cn(
                  'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5',
                  CHANNEL_COLORS[d.channel] || 'bg-white-10 text-white-60'
                )}>
                  {d.channel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white-100 line-clamp-2">{d.body}</p>
                  <p className="text-[10px] text-white-40 mt-0.5">{d.status}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {onCreated && (
          <div className="p-3 border-t border-white-10">
            <button
              onClick={onCreated}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white-5 text-white-60 text-xs font-medium hover:bg-white-10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create new draft
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
