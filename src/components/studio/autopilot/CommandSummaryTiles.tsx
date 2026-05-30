'use client';

import {
  Sparkles,
  CheckSquare,
  CheckCircle2,
  CalendarClock,
  Radar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandSummaryTilesProps {
  opportunities: number;
  draftsReady: number;
  approved: number;
  scheduled: number;
  lastScanLabel: string;
  loading?: boolean;
}

interface Tile {
  key: string;
  label: string;
  value: string;
  Icon: typeof Sparkles;
  accent: string;
  ringClass: string;
}

export function CommandSummaryTiles({
  opportunities,
  draftsReady,
  approved,
  scheduled,
  lastScanLabel,
  loading,
}: CommandSummaryTilesProps) {
  const tiles: Tile[] = [
    {
      key: 'opportunities',
      label: 'Opportunities',
      value: String(opportunities),
      Icon: Sparkles,
      accent: 'text-accent-green-110',
      ringClass: 'bg-accent-green-110/10',
    },
    {
      key: 'drafts-ready',
      label: 'Drafts Ready',
      value: String(draftsReady),
      Icon: CheckSquare,
      accent: 'text-cyan-400',
      ringClass: 'bg-cyan-500/10',
    },
    {
      key: 'approved',
      label: 'Approved',
      value: String(approved),
      Icon: CheckCircle2,
      accent: 'text-green-400',
      ringClass: 'bg-green-500/10',
    },
    {
      key: 'scheduled',
      label: 'Scheduled',
      value: String(scheduled),
      Icon: CalendarClock,
      accent: 'text-violet-400',
      ringClass: 'bg-violet-500/10',
    },
    {
      key: 'last-scan',
      label: 'Last Scan',
      value: lastScanLabel,
      Icon: Radar,
      accent: 'text-white-60',
      ringClass: 'bg-white-10',
    },
  ];

  return (
    <div
      data-testid="autopilot-summary-tiles"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      {tiles.map((t) => (
        <div
          key={t.key}
          className="card p-4 border-white-10 flex items-center gap-3"
        >
          <div
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
              t.ringClass,
            )}
          >
            <t.Icon className={cn('w-4 h-4', t.accent)} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white-40 font-medium leading-none">
              {t.label}
            </p>
            <p
              className={cn(
                'text-lg font-semibold text-white-100 mt-1 truncate',
                loading && 'opacity-40',
              )}
            >
              {t.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
