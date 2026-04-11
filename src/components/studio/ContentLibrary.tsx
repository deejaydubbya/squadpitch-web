'use client';

import { useMemo, useState } from 'react';
import { Search, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDrafts,
  useAssets,
  type DraftStatus,
  type Channel,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { DraftQueueCard } from './DraftQueueCard';
import { AssetLibrary } from './AssetLibrary';

interface Props {
  clientId: string;
}

type Tab = 'ALL' | DraftStatus | 'MEDIA';

const TABS: Array<{ label: string; value: Tab }> = [
  { label: 'All Content', value: 'ALL' },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Media', value: 'MEDIA' },
];

const CHANNEL_FILTERS: Array<{
  label: string;
  value: Channel | 'ALL';
}> = [
  { label: 'All channels', value: 'ALL' },
  { label: 'Instagram', value: 'INSTAGRAM' },
  { label: 'TikTok', value: 'TIKTOK' },
  { label: 'X', value: 'X' },
  { label: 'LinkedIn', value: 'LINKEDIN' },
  { label: 'Facebook', value: 'FACEBOOK' },
  { label: 'YouTube', value: 'YOUTUBE' },
];

export function ContentLibrary({ clientId }: Props) {
  const [tab, setTab] = useState<Tab>('ALL');
  const [channelFilter, setChannelFilter] = useState<Channel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allDrafts, isLoading, error } = useDrafts({
    clientId,
    limit: 200,
  });

  // Filter by tab (status)
  const tabFiltered = useMemo(() => {
    if (!allDrafts) return undefined;
    if (tab === 'ALL' || tab === 'MEDIA') return allDrafts;
    return allDrafts.filter((d) => d.status === tab);
  }, [allDrafts, tab]);

  // Filter by channel
  const channelFiltered = useMemo(() => {
    if (!tabFiltered) return undefined;
    if (channelFilter === 'ALL') return tabFiltered;
    return tabFiltered.filter((d) => d.channel === channelFilter);
  }, [tabFiltered, channelFilter]);

  // Filter by search
  const drafts = useMemo(() => {
    if (!channelFiltered) return undefined;
    if (!searchQuery.trim()) return channelFiltered;
    const q = searchQuery.toLowerCase();
    return channelFiltered.filter(
      (d) =>
        d.body?.toLowerCase().includes(q) ||
        d.hooks?.some((h) => h.toLowerCase().includes(q)) ||
        d.cta?.toLowerCase().includes(q) ||
        d.hashtags?.some((h) => h.toLowerCase().includes(q))
    );
  }, [channelFiltered, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    if (!allDrafts) return {};
    const counts: Record<string, number> = { ALL: allDrafts.length };
    for (const d of allDrafts) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return counts;
  }, [allDrafts]);

  if (tab === 'MEDIA') {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-white-100">Content Library</h1>

        <div className="flex gap-1 border-b border-white-10">
          {TABS.map((t) => {
            const count = tabCounts[t.value] ?? 0;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                  tab === t.value
                    ? 'text-accent-green-110 border-accent-green-110'
                    : 'text-white-40 border-transparent hover:text-white-100'
                )}
              >
                {t.label}
                {t.value !== 'MEDIA' && count > 0 && (
                  <span className="ml-1.5 text-white-30">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        <AssetLibrary clientId={clientId} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white-100">Content Library</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white-10">
        {TABS.map((t) => {
          const count = tabCounts[t.value] ?? 0;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.value
                  ? 'text-accent-green-110 border-accent-green-110'
                  : 'text-white-40 border-transparent hover:text-white-100'
              )}
            >
              {t.label}
              {t.value !== 'MEDIA' && count > 0 && (
                <span className="ml-1.5 text-white-30">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + channel filters */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search content..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {CHANNEL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setChannelFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                channelFilter === f.value
                  ? 'bg-white-20 text-white-100'
                  : 'text-white-40 hover:text-white-60'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Draft list */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading content…</span>
        </div>
      )}

      {error && <StatusBanner error={(error as Error).message} />}

      {drafts && drafts.length === 0 && (
        <div className="card p-8 text-center">
          <Inbox className="w-8 h-8 text-white-40 mx-auto mb-2" />
          <p className="text-sm text-white-60">
            {searchQuery ? 'No content matches your search.' : 'No content in this category.'}
          </p>
        </div>
      )}

      {drafts && drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <DraftQueueCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
    </div>
  );
}
