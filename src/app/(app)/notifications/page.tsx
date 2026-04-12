'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useInboxNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';

const FILTERS = ['all', 'unread', 'read'] as const;
type Filter = (typeof FILTERS)[number];
const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(0);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, isLoading } = useInboxNotifications(filter, PAGE_SIZE, page * PAGE_SIZE);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleClick(n: { id: string; linkUrl: string | null; read: boolean }) {
    if (!n.read) markAsRead.mutate(n.id);
    if (n.linkUrl) {
      try {
        const url = new URL(n.linkUrl);
        router.push(url.pathname);
      } catch {
        router.push(n.linkUrl);
      }
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Bell className="w-6 h-6 text-accent-green-110" />
        <h1 className="text-2xl font-bold text-white-100">Notifications</h1>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-green-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
        <div className="flex-1" />
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-white-5 rounded-lg p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(0);
            }}
            className={cn(
              'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize',
              filter === f
                ? 'bg-accent-green-110/15 text-accent-green-110'
                : 'text-white-40 hover:text-white-100',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {isLoading && (
        <div className="text-center py-12 text-white-40 text-sm">Loading...</div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-12 text-white-40 text-sm">
          {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => handleClick(n)}
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer',
              !n.read
                ? 'border-l-2 border-l-green-500 border-white-10 bg-green-500/5 hover:bg-green-500/10'
                : 'border-white-10 hover:bg-white-5',
            )}
          >
            {!n.read && (
              <span className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
            )}
            <div className={cn('flex-1 min-w-0', n.read && 'ml-5')}>
              <div className="flex items-center gap-2">
                <p className={cn('text-sm', !n.read ? 'text-white-100 font-semibold' : 'text-white-60')}>
                  {n.title}
                </p>
                <span className="text-[11px] text-white-30 flex-shrink-0">{formatTime(n.createdAt)}</span>
              </div>
              <p className="text-sm text-white-40 mt-1">{n.message}</p>
            </div>
            {!n.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead.mutate(n.id);
                }}
                className="text-xs text-white-30 hover:text-white-60 transition-colors flex-shrink-0 mt-1"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white-10">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white-60 hover:text-white-100 hover:bg-white-5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-white-40">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white-60 hover:text-white-100 hover:bg-white-5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
