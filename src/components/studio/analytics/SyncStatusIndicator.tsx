'use client';

import type { SyncStatus } from '@/hooks/useSquadpitch';

interface Props {
  syncStatus: SyncStatus | undefined;
  totalPublished: number;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function syncColor(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'bg-white-20';
  const hoursAgo = (Date.now() - new Date(lastSyncedAt).getTime()) / 3_600_000;
  if (hoursAgo < 1) return 'bg-zone-green';
  if (hoursAgo < 6) return 'bg-white-40';
  return 'bg-zone-yellow';
}

export function SyncStatusIndicator({ syncStatus, totalPublished }: Props) {
  if (!syncStatus || totalPublished === 0) return null;

  const { lastSyncedAt, syncedPostCount, pendingSyncCount } = syncStatus;
  const dotColor = syncColor(lastSyncedAt);

  return (
    <div className="flex items-center gap-3 text-xs text-white-60">
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
        {lastSyncedAt ? `Synced ${relativeTime(lastSyncedAt)}` : 'Not synced yet'}
      </span>
      <span className="text-white-40">
        {syncedPostCount}/{totalPublished} posts synced
      </span>
      {pendingSyncCount > 0 && (
        <span className="text-white-30">{pendingSyncCount} pending</span>
      )}
    </div>
  );
}
