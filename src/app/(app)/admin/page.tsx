'use client';

import {
  Building2,
  Send,
  Cog,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const summaryCards = [
  { label: 'Workspaces', value: '—', icon: Building2, color: 'text-accent-green-110' },
  { label: 'Queued Posts', value: '—', icon: Send, color: 'text-accent-blue' },
  { label: 'Active Jobs', value: '—', icon: Cog, color: 'text-accent-orange' },
  { label: 'System Health', value: 'OK', icon: Activity, color: 'text-green-400' },
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
        <p className="text-white-40 text-sm">SquadPitch internal control center</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white-10 bg-sp-surface p-5 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-white-5 flex items-center justify-center flex-shrink-0">
              <card.icon className={cn('w-5 h-5', card.color)} />
            </div>
            <div>
              <p className="text-white-40 text-xs font-medium uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-semibold text-white mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts placeholder */}
      <div className="rounded-xl border border-white-10 bg-sp-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-accent-orange" />
          <h2 className="text-sm font-semibold text-white">Alerts</h2>
        </div>
        <p className="text-white-30 text-sm">No active alerts. System diagnostics will appear here.</p>
      </div>

      {/* Recent activity placeholder */}
      <div className="rounded-xl border border-white-10 bg-sp-surface p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Recent Activity</h2>
        <p className="text-white-30 text-sm">Activity feed will be connected in a future update.</p>
      </div>
    </div>
  );
}
