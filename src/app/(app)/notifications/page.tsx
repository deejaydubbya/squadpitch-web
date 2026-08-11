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
    <main className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white-40 transition-colors hover:bg-white-5 hover:text-white-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Bell className="w-6 h-6 text-accent-green-110" />
        <h1 className="text-xl font-bold text-white-100 sm:text-2xl">Notifications</h1>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-green-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
        <div className="flex-1" />
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead.mutate()}
            className="order-last flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-white-10 px-3 text-sm text-green-400 transition-colors hover:border-white-20 hover:text-green-300 sm:order-none sm:w-auto sm:border-0 sm:px-0"
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
            type="button"
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(0);
            }}
            className={cn(
              'min-h-11 flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors sm:px-4',
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
          <article
            key={n.id}
            className={cn(
              'flex flex-col items-stretch gap-2 rounded-xl border p-3 transition-colors sm:flex-row sm:items-start sm:gap-3 sm:p-4',
              !n.read
                ? 'border-l-2 border-l-green-500 border-white-10 bg-green-500/5'
                : 'border-white-10',
            )}
          >
            <button
              type="button"
              onClick={() => handleClick(n)}
              className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green-110"
            >
              <span
                className={cn(
                  'mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full',
                  !n.read ? 'bg-green-500' : 'bg-transparent',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <p className={cn('text-sm', !n.read ? 'font-semibold text-white-100' : 'text-white-60')}>
                    {n.title}
                  </p>
                  <time className="flex-shrink-0 text-[11px] text-white-30" dateTime={n.createdAt}>
                    {formatTime(n.createdAt)}
                  </time>
                </div>
                <p className="mt-1 break-words text-sm text-white-40">{n.message}</p>
              </div>
            </button>
            {!n.read && (
              <button
                type="button"
                onClick={() => markAsRead.mutate(n.id)}
                aria-label={`Mark ${n.title} as read`}
                className="min-h-11 flex-shrink-0 self-end rounded-lg px-3 text-xs text-white-40 transition-colors hover:bg-white-5 hover:text-white-80 sm:self-start"
              >
                Mark read
              </button>
            )}
          </article>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white-10">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-white-60 transition-colors hover:bg-white-5 hover:text-white-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-sm text-white-40">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-white-60 transition-colors hover:bg-white-5 hover:text-white-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
