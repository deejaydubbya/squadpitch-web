'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Draft, PlannerSuggestion } from '@/hooks/useSquadpitch';
import { shortAngleLabel, angleCategoryStyle } from './AngleBadge';

interface Props {
  drafts: Draft[];
  suggestions?: PlannerSuggestion[];
  selectedDay?: string | null;
  onSelectDay?: (dayKey: string | null) => void;
  onSelectSuggestion?: (suggestion: PlannerSuggestion) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Convert ISO date "2026-04-16" to calendar key "2026-3-16" (JS 0-indexed month) */
function isoToCalendarKey(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function CalendarGrid({
  drafts,
  suggestions = [],
  selectedDay,
  onSelectDay,
  onSelectSuggestion,
}: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const draftsByDay = useMemo(() => {
    const map = new Map<string, Draft[]>();
    drafts.forEach((d) => {
      const date = d.scheduledFor ?? d.publishedAt;
      if (!date) return;
      const dt = new Date(date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    });
    return map;
  }, [drafts]);

  const suggestionsByDay = useMemo(() => {
    const map = new Map<string, PlannerSuggestion[]>();
    suggestions.forEach((s) => {
      const key = isoToCalendarKey(s.suggestedDate);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    });
    return map;
  }, [suggestions]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const lastDay = new Date(cursor.year, cursor.month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ day: null, key: `pad-${i}` });
  }
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ day, key: `${cursor.year}-${cursor.month}-${day}` });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: `end-${cells.length}` });
  }

  const prev = () => {
    setCursor((c) =>
      c.month === 0
        ? { year: c.year - 1, month: 11 }
        : { year: c.year, month: c.month - 1 }
    );
  };
  const next = () => {
    setCursor((c) =>
      c.month === 11
        ? { year: c.year + 1, month: 0 }
        : { year: c.year, month: c.month + 1 }
    );
  };

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === cursor.year &&
    today.getMonth() === cursor.month &&
    today.getDate() === day;

  const handleDayClick = (dayKey: string) => {
    if (!onSelectDay) return;
    onSelectDay(selectedDay === dayKey ? null : dayKey);
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          className="p-1.5 rounded-lg hover:bg-white-10 text-white-60"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-white-100">
          {MONTH_NAMES[cursor.month]} {cursor.year}
        </h3>
        <button
          onClick={next}
          className="p-1.5 rounded-lg hover:bg-white-10 text-white-60"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-xs text-white-40 uppercase tracking-wider text-center py-1"
          >
            {wd}
          </div>
        ))}
        {cells.map((cell) => {
          if (cell.day === null) {
            return <div key={cell.key} />;
          }
          const dayDrafts =
            draftsByDay.get(`${cursor.year}-${cursor.month}-${cell.day}`) ?? [];
          const daySuggestions =
            suggestionsByDay.get(`${cursor.year}-${cursor.month}-${cell.day}`) ?? [];
          const isSelected = selectedDay === cell.key;
          const clickable = !!onSelectDay;

          // Max 3 total items per cell (drafts take priority)
          const draftSlots = Math.min(dayDrafts.length, 3);
          const suggestionSlots = Math.min(daySuggestions.length, 3 - draftSlots);
          const hiddenDrafts = dayDrafts.length - draftSlots;
          const hiddenSuggestions = daySuggestions.length - suggestionSlots;

          return (
            <div
              key={cell.key}
              onClick={() => handleDayClick(cell.key)}
              className={cn(
                'rounded-lg border p-1.5 min-h-20 text-left transition-colors',
                clickable && 'cursor-pointer hover:border-accent-green-110/40',
                isSelected
                  ? 'border-accent-green-110 bg-accent-green-110/10 ring-1 ring-accent-green-110/30'
                  : isToday(cell.day)
                    ? 'border-accent-green-110/60 bg-accent-green-110/5'
                    : 'border-white-10 bg-white-5'
              )}
            >
              <p
                className={cn(
                  'text-xs font-medium',
                  isSelected
                    ? 'text-accent-green-110'
                    : isToday(cell.day)
                      ? 'text-accent-green-110'
                      : 'text-white-60'
                )}
              >
                {cell.day}
              </p>
              <div className="mt-1 space-y-1">
                {dayDrafts.slice(0, draftSlots).map((d) => {
                  const angle = shortAngleLabel(
                    d.sourceMeta?.contentAngleKey,
                    d.sourceMeta?.contentAngle
                  );
                  return (
                    <div
                      key={d.id}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white-10 text-white-80 truncate font-mono"
                      title={d.body}
                    >
                      {d.channel}{angle ? ` · ${angle}` : ''}
                    </div>
                  );
                })}
                {daySuggestions.slice(0, suggestionSlots).map((s) => {
                  const angle = shortAngleLabel(null, s.angleLabel);
                  return (
                    <div
                      key={s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSuggestion?.(s);
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-accent-green-110/30 bg-accent-green-110/5 text-accent-green-110/60 truncate font-mono cursor-pointer hover:bg-accent-green-110/10 transition-colors"
                      title={s.dataItem.title}
                    >
                      {s.channel ?? s.blueprint.name}{angle ? ` · ${angle}` : ' · Suggested'}
                    </div>
                  );
                })}
                {(hiddenDrafts > 0 || hiddenSuggestions > 0) && (
                  <p className="text-[10px] text-white-40">
                    {hiddenDrafts > 0 && `+${hiddenDrafts} more`}
                    {hiddenDrafts > 0 && hiddenSuggestions > 0 && ', '}
                    {hiddenSuggestions > 0 && `+${hiddenSuggestions} suggested`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
