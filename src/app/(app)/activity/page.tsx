'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Unplug,
  Layers,
  FilePlus,
  ThumbsUp,
  ThumbsDown,
  CalendarClock,
  Image as ImageIcon,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityFeed } from '@/hooks/useNotifications';
import type { ActivityEvent } from '@/hooks/useNotifications';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  unplug: Unplug,
  layers: Layers,
  'file-plus': FilePlus,
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  'calendar-clock': CalendarClock,
  image: ImageIcon,
  plug: Plug,
};

const PAGE_SIZE = 20;

function groupByDate(events: ActivityEvent[]): [string, ActivityEvent[]][] {
  const groups: Record<string, ActivityEvent[]> = {};
  for (const event of events) {
    const dateKey = new Date(event.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
  }
  return Object.entries(groups);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ActivityPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useActivityFeed(undefined, PAGE_SIZE, page * PAGE_SIZE);

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const grouped = groupByDate(events);


  function handleClick(linkUrl: string | null) {
    if (!linkUrl) return;
    try {
      const url = new URL(linkUrl);
      router.push(url.pathname);
    } catch {
      router.push(linkUrl);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Activity className="w-6 h-6 text-accent-green-110" />
        <h1 className="text-2xl font-bold text-white-100">Activity</h1>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-white-40 text-sm">Loading...</div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="text-center py-12 text-white-40 text-sm">No activity yet</div>
      )}

      {/* Timeline */}
      <div className="space-y-8">
        {grouped.map(([dateLabel, dateEvents]) => (
          <div key={dateLabel}>
            <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider mb-4">
              {dateLabel}
            </h2>
            <div className="relative pl-6 border-l border-white-10">
              {dateEvents.map((event) => {
                const IconComponent = (event.icon && ICON_MAP[event.icon]) || Activity;
                return (
                  <div
                    key={event.id}
                    onClick={() => handleClick(event.linkUrl)}
                    className={cn(
                      'relative mb-4 last:mb-0 -ml-6 pl-6',
                      event.linkUrl && 'cursor-pointer group',
                    )}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 -translate-x-1/2 w-5 h-5 rounded-full bg-[#1a1d24] border-2 border-white-10 flex items-center justify-center">
                      <IconComponent className="w-2.5 h-2.5 text-white-40" />
                    </div>

                    <div className="ml-4 p-3 rounded-lg group-hover:bg-white-5 transition-colors">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white-100">{event.title}</p>
                        <span className="text-[11px] text-white-30">{formatTime(event.createdAt)}</span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-white-40 mt-0.5">{event.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-white-10">
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
