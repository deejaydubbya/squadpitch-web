'use client';

import { useState } from 'react';
import {
  RefreshCw,
  Activity,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Pause,
  Image,
  Video,
  Bell,
  BarChart3,
  Calculator,
  Lightbulb,
  Mail,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useJobsSummary,
  useAdminJobs,
  useRetryJob,
  useRemoveJob,
} from '@/hooks/useAdmin';
import type { QueueSummaryItem, JobSummaryItem } from '@/hooks/useAdmin';

// ── Constants ───────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'failed', label: 'Failed' },
  { value: 'active', label: 'Active' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All statuses' },
];

const LIMIT_OPTIONS = ['25', '50', '100'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-accent-blue/20 text-accent-blue',
  waiting: 'bg-yellow-500/20 text-yellow-400',
  delayed: 'bg-purple-500/20 text-purple-400',
  failed: 'bg-red-500/20 text-accent-red',
  completed: 'bg-green-500/20 text-green-400',
  paused: 'bg-white-10 text-white-40',
};

const CATEGORY_COLORS: Record<string, string> = {
  content: 'bg-purple-500/20 text-purple-400',
  delivery: 'bg-accent-blue/20 text-accent-blue',
  analytics: 'bg-yellow-500/20 text-yellow-400',
};

const QUEUE_ICONS: Record<string, React.ReactNode> = {
  image: <Image className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  bell: <Bell className="w-4 h-4" />,
  'bar-chart': <BarChart3 className="w-4 h-4" />,
  calculator: <Calculator className="w-4 h-4" />,
  lightbulb: <Lightbulb className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  mail: <Mail className="w-4 h-4" />,
  box: <Box className="w-4 h-4" />,
};

function statusIcon(status: string) {
  switch (status) {
    case 'active': return <Activity className="w-4 h-4 text-accent-blue" />;
    case 'waiting': return <Clock className="w-4 h-4 text-yellow-400" />;
    case 'delayed': return <Pause className="w-4 h-4 text-purple-400" />;
    case 'failed': return <XCircle className="w-4 h-4 text-accent-red" />;
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    default: return <Clock className="w-4 h-4 text-white-30" />;
  }
}

function formatTime(ts: number | string | null) {
  if (!ts) return '—';
  return new Date(typeof ts === 'number' ? ts : ts).toLocaleString();
}

function formatDuration(start: number | null, end: number | null) {
  if (!start || !end) return '—';
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

// ── Select Dropdown ─────────────────────────────────────────────────────

const selectCls = 'px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none';

// ── Main Page ───────────────────────────────────────────────────────────

export default function JobsPage() {
  const { isAdmin } = useCurrentUser();
  const [queueFilter, setQueueFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('failed');
  const [typeFilter, setTypeFilter] = useState('');
  const [limit, setLimit] = useState('25');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useJobsSummary();
  const { data: jobsData, isLoading: jobsLoading, isError: jobsError, refetch: refetchJobs } = useAdminJobs({
    queue: queueFilter,
    status: statusFilter,
    type: typeFilter,
    limit,
  });

  const retryMut = useRetryJob();
  const removeMut = useRemoveJob();

  const jobs = jobsData?.items || [];

  // Aggregate stats
  const totals = (summary || []).reduce(
    (acc, q) => ({
      active: acc.active + q.counts.active,
      waiting: acc.waiting + q.counts.waiting,
      failed: acc.failed + q.counts.failed,
      delayed: acc.delayed + q.counts.delayed,
    }),
    { active: 0, waiting: 0, failed: 0, delayed: 0 },
  );

  const handleRefresh = () => {
    refetchSummary();
    refetchJobs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Jobs & Queues</h1>
          <p className="text-white-40 text-sm">Monitor background workers, inspect job payloads, and manage failures.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Queue Summary Cards */}
      {summaryLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : summary && summary.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summary.map((q) => (
            <QueueCard
              key={q.queue}
              item={q}
              active={queueFilter === q.queue}
              onClick={() => setQueueFilter(queueFilter === q.queue ? '' : q.queue)}
            />
          ))}
        </div>
      ) : null}

      {/* Aggregate Stats */}
      {summary && summary.length > 0 && (
        <div className="flex gap-4 text-xs">
          <span className="text-accent-blue">{totals.active} active</span>
          <span className="text-yellow-400">{totals.waiting} waiting</span>
          {totals.failed > 0 && <span className="text-accent-red">{totals.failed} failed</span>}
          {totals.delayed > 0 && <span className="text-purple-400">{totals.delayed} delayed</span>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={queueFilter}
          onChange={(e) => setQueueFilter(e.target.value)}
          className={selectCls}
        >
          <option value="">All queues</option>
          {(summary || []).map((q) => (
            <option key={q.queue} value={q.queue}>{q.label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectCls}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <input
          type="text"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          placeholder="Filter by job type..."
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50 w-48"
        />

        <select
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className={selectCls}
        >
          {LIMIT_OPTIONS.map((l) => (
            <option key={l} value={l}>{l} per page</option>
          ))}
        </select>
      </div>

      {/* Jobs List */}
      {jobsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : jobsError ? (
        <div className="text-center py-12 text-accent-red text-sm">Failed to load jobs.</div>
      ) : !jobs.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No jobs found matching filters.</div>
      ) : (
        <>
          <div className="text-xs text-white-40">{jobsData?.total ?? 0} total matching jobs</div>
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobRow
                key={`${job.queue}-${job.id}`}
                job={job}
                expanded={expandedId === `${job.queue}-${job.id}`}
                onToggle={() =>
                  setExpandedId(expandedId === `${job.queue}-${job.id}` ? null : `${job.queue}-${job.id}`)
                }
                isAdmin={isAdmin}
                onRetry={() => retryMut.mutate({ queue: job.queue, jobId: job.id })}
                onRemove={() => removeMut.mutate({ queue: job.queue, jobId: job.id })}
                retrying={retryMut.isPending}
                removing={removeMut.isPending}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Queue Summary Card ──────────────────────────────────────────────────

function QueueCard({ item, active, onClick }: { item: QueueSummaryItem; active: boolean; onClick: () => void }) {
  const hasFailed = item.counts.failed > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-sp-surface p-4 cursor-pointer hover:bg-white-5 transition-colors',
        active ? 'border-accent-green-110/50' :
        hasFailed ? 'border-accent-red/30' :
        'border-white-10',
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white-5 flex items-center justify-center flex-shrink-0 text-white-40">
          {QUEUE_ICONS[item.icon] || QUEUE_ICONS.box}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{item.label}</p>
          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', CATEGORY_COLORS[item.category] || 'bg-white-10 text-white-40')}>
            {item.category}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-white-40 block">Active</span>
          <span className="text-accent-blue font-medium">{item.counts.active}</span>
        </div>
        <div>
          <span className="text-white-40 block">Waiting</span>
          <span className="text-yellow-400 font-medium">{item.counts.waiting}</span>
        </div>
        <div>
          <span className="text-white-40 block">Failed</span>
          <span className={cn('font-medium', hasFailed ? 'text-accent-red' : 'text-white-30')}>
            {item.counts.failed}
          </span>
        </div>
      </div>
      {item.counts.delayed > 0 && (
        <div className="mt-1 text-xs">
          <span className="text-purple-400">{item.counts.delayed} delayed</span>
        </div>
      )}
      {item.error && (
        <p className="text-accent-red text-[10px] mt-2 truncate">Error: {item.error}</p>
      )}
    </div>
  );
}

// ── Job Row ─────────────────────────────────────────────────────────────

function JobRow({
  job,
  expanded,
  onToggle,
  isAdmin,
  onRetry,
  onRemove,
  retrying,
  removing,
}: {
  job: JobSummaryItem;
  expanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onRetry: () => void;
  onRemove: () => void;
  retrying: boolean;
  removing: boolean;
}) {
  const [showPayload, setShowPayload] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border bg-sp-surface transition-colors',
        job.status === 'failed' ? 'border-accent-red/30' :
        job.status === 'active' ? 'border-accent-blue/20' :
        'border-white-10',
      )}
    >
      {/* Summary row */}
      <div onClick={onToggle} className="p-4 cursor-pointer hover:bg-white-5 transition-colors">
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-white-30 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-white-30 flex-shrink-0" />}
          {statusIcon(job.status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[job.status] || 'bg-white-10 text-white-40')}>
                {job.status}
              </span>
              <span className="text-white font-medium text-sm">{job.name}</span>
              <span className="text-white-30 text-xs">{job.queueLabel}</span>
            </div>
            {job.context && <p className="text-white-40 text-xs truncate">{job.context}</p>}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 text-xs">
            {job.attemptsMade > 1 && (
              <span className="text-accent-orange">
                {job.attemptsMade}/{job.attemptsMax} attempts
              </span>
            )}
            {job.failedReason && (
              <span className="flex items-center gap-1 text-accent-red max-w-[200px] truncate">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                {job.failedReason}
              </span>
            )}
            <span className="text-white-30 whitespace-nowrap">{formatTime(job.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white-10 p-4 space-y-4">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-white-40">Job ID</span>
              <p className="text-white font-mono mt-0.5">{job.id}</p>
            </div>
            <div>
              <span className="text-white-40">Queue</span>
              <p className="text-white mt-0.5">{job.queueLabel} <span className="text-white-30 font-mono">({job.queue})</span></p>
            </div>
            <div>
              <span className="text-white-40">Job Type</span>
              <p className="text-white mt-0.5">{job.name}</p>
            </div>
            <div>
              <span className="text-white-40">Status</span>
              <p className="mt-0.5">
                <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[job.status])}>
                  {job.status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-white-40">Attempts</span>
              <p className="text-white mt-0.5">{job.attemptsMade} / {job.attemptsMax}</p>
            </div>
            <div>
              <span className="text-white-40">Created</span>
              <p className="text-white mt-0.5">{formatTime(job.timestamp)}</p>
            </div>
            <div>
              <span className="text-white-40">Processed</span>
              <p className="text-white mt-0.5">{formatTime(job.processedOn)}</p>
            </div>
            <div>
              <span className="text-white-40">Duration</span>
              <p className="text-white mt-0.5">{formatDuration(job.processedOn, job.finishedOn)}</p>
            </div>
          </div>

          {/* Workspace context */}
          {job.workspaceId && (
            <div className="text-xs">
              <span className="text-white-40">Workspace: </span>
              <span className="text-white font-mono">{job.workspaceId}</span>
            </div>
          )}

          {/* Payload */}
          {job.data && Object.keys(job.data).length > 0 && (
            <div>
              <button
                onClick={() => setShowPayload(!showPayload)}
                className="flex items-center gap-1.5 text-white-40 text-xs hover:text-white transition-colors"
              >
                {showPayload ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Payload
              </button>
              {showPayload && (
                <pre className="mt-2 p-3 rounded-lg bg-sp-bg border border-white-10 text-white-60 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                  {JSON.stringify(job.data, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Error */}
          {job.failedReason && (
            <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-3.5 h-3.5 text-accent-red" />
                <span className="text-accent-red text-xs font-medium">Error</span>
              </div>
              <pre className="text-accent-red text-xs font-mono whitespace-pre-wrap">{job.failedReason}</pre>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && (job.status === 'failed' || job.status === 'completed') && (
            <div className="flex gap-2 pt-1">
              {job.status === 'failed' && (
                <button
                  onClick={onRetry}
                  disabled={retrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue/15 text-accent-blue text-xs font-medium hover:bg-accent-blue/25 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  {retrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
              <button
                onClick={onRemove}
                disabled={removing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-accent-red text-xs font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
