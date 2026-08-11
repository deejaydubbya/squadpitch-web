'use client';

import { CalendarDays } from 'lucide-react';
import type { Draft } from '@/hooks/useSquadpitch';
import { DraftQueueCard } from './DraftQueueCard';

interface Props {
  drafts: Draft[];
  selectedIds: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
}

function dateKey(draft: Draft): string {
  const value = draft.scheduledFor ?? draft.publishedAt;
  return value ? localDateKey(new Date(value)) : 'unscheduled';
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function agendaLabel(key: string): string {
  if (key === 'unscheduled') return 'Unscheduled';
  const date = new Date(`${key}T00:00:00`);
  const today = new Date();
  const todayKey = localDateKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (key === todayKey) return 'Today';
  if (key === localDateKey(tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function MobilePlannerAgenda({ drafts, selectedIds, onSelect }: Props) {
  const sorted = [...drafts].sort((a, b) => {
    const aTime = a.scheduledFor ?? a.publishedAt;
    const bTime = b.scheduledFor ?? b.publishedAt;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });
  const groups = new Map<string, Draft[]>();
  for (const draft of sorted) {
    const key = dateKey(draft);
    groups.set(key, [...(groups.get(key) ?? []), draft]);
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-xl border border-white-10 bg-white-5 p-6 text-center">
        <CalendarDays className="mx-auto h-6 w-6 text-white-30" aria-hidden="true" />
        <p className="mt-2 text-sm text-white-50">No posts in this agenda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" aria-label="Post agenda">
      {[...groups.entries()].map(([key, dayDrafts]) => (
        <section key={key} className="space-y-2" aria-labelledby={`agenda-${key}`}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white-10 bg-sp-bg/95 py-2 backdrop-blur">
            <h2 id={`agenda-${key}`} className="text-sm font-semibold text-white-90">
              {agendaLabel(key)}
            </h2>
            <span className="text-xs text-white-40">{dayDrafts.length}</span>
          </div>
          {dayDrafts.map((draft) => (
            <DraftQueueCard
              key={draft.id}
              draft={draft}
              selected={selectedIds.has(draft.id)}
              onSelect={onSelect}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
