'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Draft } from '@/hooks/useSquadpitch';

interface Props {
  drafts: Draft[];
  selectedDay?: string | null;
  onSelectDay?: (dayKey: string | null) => void;
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

export function CalendarGrid({ drafts, selectedDay, onSelectDay }: Props) {
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
          const isSelected = selectedDay === cell.key;
          const clickable = !!onSelectDay;

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
                {dayDrafts.slice(0, 3).map((d) => {
                  const time = d.scheduledFor
                    ? new Date(d.scheduledFor).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    : null;
                  return (
                    <div
                      key={d.id}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white-10 text-white-80 truncate font-mono"
                      title={d.body}
                    >
                      {d.channel}{time ? ` · ${time}` : ''}
                    </div>
                  );
                })}
                {dayDrafts.length > 3 && (
                  <p className="text-[10px] text-white-40">
                    +{dayDrafts.length - 3} more
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
