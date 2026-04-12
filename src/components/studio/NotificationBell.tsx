'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUnreadCount,
  useInboxNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: inbox } = useInboxNotifications('all', 10, 0);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleNotificationClick(n: { id: string; linkUrl: string | null; read: boolean }) {
    if (!n.read) markAsRead.mutate(n.id);
    setOpen(false);
    if (n.linkUrl) {
      // Strip domain for internal navigation
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
    return `${diffDays}d ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-white-60 hover:bg-white-5 hover:text-white-100 w-full"
      >
        <Bell className="w-4.5 h-4.5" />
        <span className="flex-1 text-left">Notifications</span>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full ml-2 top-0 w-80 bg-[#1a1d24] border border-white-10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white-10">
            <span className="text-sm font-semibold text-white-100">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {(!inbox?.notifications || inbox.notifications.length === 0) && (
              <div className="px-4 py-8 text-center text-white-40 text-sm">
                No notifications yet
              </div>
            )}
            {inbox?.notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-white-5 hover:bg-white-5 transition-colors',
                  !n.read && 'bg-green-500/5',
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                  <div className={cn('flex-1 min-w-0', n.read && 'ml-4')}>
                    <p className={cn('text-sm truncate', !n.read ? 'text-white-100 font-medium' : 'text-white-60')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-white-40 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-white-30 mt-1">{formatTime(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <button
            onClick={() => {
              setOpen(false);
              router.push('/notifications');
            }}
            className="block w-full px-4 py-3 text-center text-xs text-green-400 hover:bg-white-5 transition-colors border-t border-white-10"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
