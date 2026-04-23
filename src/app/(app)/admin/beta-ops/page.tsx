'use client';

import Link from 'next/link';
import { Users, MessageSquare, AlertTriangle, Star, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBetaSummary, useBetaFeedbackList, useBetaTesters } from '@/hooks/useAdmin';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-accent-red',
  high: 'text-accent-orange',
  medium: 'text-white-60',
  low: 'text-white-30',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-accent-blue/20 text-accent-blue',
  triaged: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-accent-green-110/20 text-accent-green-110',
  resolved: 'bg-green-500/20 text-green-400',
  wont_fix: 'bg-white-10 text-white-40',
  duplicate: 'bg-white-10 text-white-40',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[status] || 'bg-white-10 text-white-40')}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function BetaOpsPage() {
  const { data: summary } = useBetaSummary();
  const { data: feedbackData } = useBetaFeedbackList({ limit: '5' });
  const { data: testers } = useBetaTesters({ priority: 'high', status: 'active' });

  const recentFeedback = feedbackData?.items || [];
  const highPriorityTesters = testers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Beta Ops</h1>
        <p className="text-white-40 text-sm">Manage test users, collect feedback, and track beta program health.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="w-5 h-5 text-accent-green-110" />}
          label="Active Testers"
          value={summary?.testers.active ?? '—'}
          sub={`${summary?.testers.total ?? 0} total`}
        />
        <SummaryCard
          icon={<MessageSquare className="w-5 h-5 text-accent-blue" />}
          label="Open Feedback"
          value={(summary?.feedback.byStatus.new ?? 0) + (summary?.feedback.byStatus.triaged ?? 0) + (summary?.feedback.byStatus.in_progress ?? 0)}
          sub={`${summary?.feedback.byStatus.resolved ?? 0} resolved`}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-accent-orange" />}
          label="Needs Follow-Up"
          value={summary?.feedback.needsFollowUp ?? '—'}
        />
        <SummaryCard
          icon={<Star className="w-5 h-5 text-yellow-400" />}
          label="High Priority"
          value={summary?.testers.highPriority ?? '—'}
          sub="testers"
        />
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link href="/admin/beta-ops/testers" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sp-surface border border-white-10 text-white text-sm font-medium hover:bg-white-5 transition-colors">
          <Users className="w-4 h-4 text-accent-green-110" />
          Tester Registry
          <ArrowRight className="w-3.5 h-3.5 text-white-30" />
        </Link>
        <Link href="/admin/beta-ops/feedback" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sp-surface border border-white-10 text-white text-sm font-medium hover:bg-white-5 transition-colors">
          <MessageSquare className="w-4 h-4 text-accent-blue" />
          Feedback Inbox
          <ArrowRight className="w-3.5 h-3.5 text-white-30" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent feedback */}
        <div className="rounded-xl border border-white-10 bg-sp-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Feedback</h2>
            <Link href="/admin/beta-ops/feedback" className="text-accent-green-110 text-xs hover:underline">View all</Link>
          </div>
          {recentFeedback.length === 0 ? (
            <p className="text-white-30 text-sm">No feedback yet.</p>
          ) : (
            <div className="space-y-3">
              {recentFeedback.map((fb) => (
                <div key={fb.id} className="flex items-start gap-3 py-2 border-b border-white-5 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusBadge status={fb.status} />
                      <span className={cn('text-[10px] font-medium', SEVERITY_COLORS[fb.severity])}>{fb.severity}</span>
                      <span className="text-white-30 text-[10px]">{fb.type}</span>
                      {fb.needsFollowUp && <AlertTriangle className="w-3 h-3 text-accent-orange" />}
                    </div>
                    <p className="text-white text-xs font-medium truncate">{fb.title}</p>
                    <p className="text-white-30 text-[10px] mt-0.5">
                      {fb.tester?.email || fb.userId} &middot; {new Date(fb.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High priority testers */}
        <div className="rounded-xl border border-white-10 bg-sp-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">High Priority Testers</h2>
            <Link href="/admin/beta-ops/testers" className="text-accent-green-110 text-xs hover:underline">View all</Link>
          </div>
          {highPriorityTesters.length === 0 ? (
            <p className="text-white-30 text-sm">No high priority testers.</p>
          ) : (
            <div className="space-y-3">
              {highPriorityTesters.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-white-5 last:border-0">
                  <div>
                    <p className="text-white text-xs font-medium">{t.name || t.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.cohort && <span className="text-accent-blue text-[10px]">{t.cohort}</span>}
                      <span className="text-white-30 text-[10px]">{t._count?.feedback || 0} feedback</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {t.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-white-5 text-white-40 text-[10px]">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white-10 bg-sp-surface p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white-5 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <p className="text-white-40 text-[10px] font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-semibold text-white">{value}</p>
        {sub && <p className="text-white-30 text-[10px]">{sub}</p>}
      </div>
    </div>
  );
}
