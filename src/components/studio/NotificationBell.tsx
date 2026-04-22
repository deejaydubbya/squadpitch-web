'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: inbox } = useInboxNotifications('all', 10, 0);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Calculate position from button rect
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.right + 8 });
  }, []);

  // Reposition on open & scroll/resize
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleNotificationClick(n: { id: string; linkUrl: string | null; read: boolean }) {
    if (!n.read) markAsRead.mutate(n.id);
    setOpen(false);
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

  const notifications = inbox?.notifications ?? [];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
          open
            ? 'bg-accent-green-110/15 text-accent-green-110'
            : 'text-white-60 hover:bg-white-5 hover:text-white-100',
        )}
      >
        <Bell className="w-4.5 h-4.5" />
        <span className="flex-1 text-left">Notifications</span>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent-green-110 text-[10px] font-bold text-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed w-80 bg-sp-surface border border-white-10 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white-10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-accent-green-110/20 text-[10px] font-semibold text-accent-green-110">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="flex items-center gap-1 text-xs text-accent-green-110 hover:text-accent-green-110/80 transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-white-15 mx-auto mb-2" />
                <p className="text-sm text-white-40">No notifications yet</p>
                <p className="text-xs text-white-20 mt-1">We&apos;ll notify you about important updates</p>
              </div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-white-5/50 hover:bg-white-5 transition-colors',
                  !n.read && 'bg-accent-green-110/5',
                )}
              >
                <div className="flex items-start gap-2.5">
                  {!n.read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-accent-green-110 flex-shrink-0" />
                  )}
                  <div className={cn('flex-1 min-w-0', n.read && 'ml-[18px]')}>
                    <p className={cn('text-sm truncate', !n.read ? 'text-white-100 font-medium' : 'text-white-60')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-white-40 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-white-25 mt-1">{formatTime(n.createdAt)}</p>
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
            className="flex items-center justify-center gap-1.5 w-full px-4 py-3 text-xs font-medium text-accent-green-110 hover:bg-white-5 transition-colors border-t border-white-10"
          >
            View all notifications
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
