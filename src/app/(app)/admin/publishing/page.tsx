'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Image,
  ExternalLink,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminPublishing } from '@/hooks/useAdmin';
import type { PublishItem } from '@/hooks/useAdmin';

const STATUS_OPTIONS = ['', 'PUBLISHED', 'FAILED', 'SCHEDULED'];
const CHANNEL_OPTIONS = ['', 'INSTAGRAM', 'TIKTOK', 'X', 'LINKEDIN', 'FACEBOOK', 'YOUTUBE'];

function publishStatusIcon(status: string) {
  switch (status) {
    case 'PUBLISHED': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'FAILED': return <XCircle className="w-4 h-4 text-accent-red" />;
    case 'SCHEDULED': return <Clock className="w-4 h-4 text-accent-blue" />;
    default: return <Send className="w-4 h-4 text-white-30" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PUBLISHED: 'bg-green-500/20 text-green-400',
    FAILED: 'bg-red-500/20 text-accent-red',
    SCHEDULED: 'bg-accent-blue/20 text-accent-blue',
  };
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', colors[status] || 'bg-white-10 text-white-40')}>
      {status}
    </span>
  );
}

export default function PublishingPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAdminPublishing({
    status: statusFilter,
    channel: channelFilter,
    limit: '50',
  });

  // Summary
  const items = data?.items || [];
  const summary = {
    total: items.length,
    published: items.filter((i) => i.status === 'PUBLISHED').length,
    failed: items.filter((i) => i.status === 'FAILED').length,
    scheduled: items.filter((i) => i.status === 'SCHEDULED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Publishing Monitor</h1>
        <p className="text-white-40 text-sm">Track publish attempts, diagnose failures, and monitor delivery status.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'Published / Failed / Scheduled'}</option>)}
        </select>
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
          {CHANNEL_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All channels'}</option>)}
        </select>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="flex gap-4 text-xs">
          <span className="text-white-40">{summary.total} shown</span>
          <span className="text-green-400">{summary.published} published</span>
          {summary.failed > 0 && <span className="text-accent-red">{summary.failed} failed</span>}
          {summary.scheduled > 0 && <span className="text-accent-blue">{summary.scheduled} scheduled</span>}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-accent-red text-sm">Failed to load publishing data.</div>
      ) : !items.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No publishing activity found.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <PublishRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PublishRow({ item, expanded, onToggle }: { item: PublishItem; expanded: boolean; onToggle: () => void }) {
  const hasMediaIssue = item.hasAssets && item.assetStatuses.some((s) => s !== 'READY');

  return (
    <div className={cn(
      'rounded-lg border bg-sp-surface transition-colors',
      item.status === 'FAILED' ? 'border-accent-red/30' :
      item.status === 'PUBLISHED' ? 'border-white-10' :
      'border-accent-blue/20',
    )}>
      {/* Summary row */}
      <div onClick={onToggle} className="p-4 cursor-pointer hover:bg-white-5 transition-colors">
        <div className="flex items-center gap-3">
          {publishStatusIcon(item.status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <StatusBadge status={item.status} />
              <span className="text-white font-medium text-sm">{item.channel}</span>
              <span className="text-white-30 text-xs">{item.clientName || item.clientId}</span>
            </div>
            <p className="text-white-40 text-xs truncate">{item.body || <span className="italic">No content preview</span>}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 text-xs">
            {hasMediaIssue && (
              <span className="flex items-center gap-1 text-accent-orange">
                <AlertTriangle className="w-3 h-3" />
                Media issue
              </span>
            )}
            {item.hasAssets && (
              <span className="flex items-center gap-1 text-white-30">
                <Image className="w-3 h-3" />
                {item.assetStatuses.length}
              </span>
            )}
            {item.publishAttempts > 1 && (
              <span className="text-accent-orange">
                {item.publishAttempts} attempts
              </span>
            )}
            <span className="text-white-30">
              {item.publishedAt
                ? new Date(item.publishedAt).toLocaleString()
                : item.lastPublishAttemptAt
                  ? new Date(item.lastPublishAttemptAt).toLocaleString()
                  : item.scheduledFor
                    ? `Sched: ${new Date(item.scheduledFor).toLocaleString()}`
                    : new Date(item.updatedAt).toLocaleString()
              }
            </span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white-10 p-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-white-40">Draft ID</span>
              <p className="text-white font-mono mt-0.5">{item.id}</p>
            </div>
            <div>
              <span className="text-white-40">Client ID</span>
              <p className="text-white font-mono mt-0.5">{item.clientId}</p>
            </div>
            <div>
              <span className="text-white-40">Publish Source</span>
              <p className="text-white mt-0.5">{item.publishSource || '—'}</p>
            </div>
            <div>
              <span className="text-white-40">Attempts</span>
              <p className="text-white mt-0.5">{item.publishAttempts}</p>
            </div>
            <div>
              <span className="text-white-40">Scheduled For</span>
              <p className="text-white mt-0.5">{item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : '—'}</p>
            </div>
            <div>
              <span className="text-white-40">Published At</span>
              <p className="text-white mt-0.5">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '—'}</p>
            </div>
            <div>
              <span className="text-white-40">Last Attempt</span>
              <p className="text-white mt-0.5">{item.lastPublishAttemptAt ? new Date(item.lastPublishAttemptAt).toLocaleString() : '—'}</p>
            </div>
            <div>
              <span className="text-white-40">Idempotency Key</span>
              <p className="text-white font-mono mt-0.5 truncate">{item.idempotencyKey || '—'}</p>
            </div>
          </div>

          {/* Media */}
          <div>
            <span className="text-white-40 text-xs">Media</span>
            {item.mediaUrl ? (
              <p className="text-white-60 text-xs font-mono mt-0.5 truncate">{item.mediaUrl} ({item.mediaType || 'unknown'})</p>
            ) : item.hasAssets ? (
              <div className="flex items-center gap-2 mt-0.5">
                {item.assetStatuses.map((s, i) => (
                  <span key={i} className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    s === 'READY' ? 'bg-green-500/20 text-green-400' :
                    s === 'FAILED' ? 'bg-red-500/20 text-accent-red' :
                    'bg-white-10 text-white-40',
                  )}>
                    Asset: {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white-30 text-xs mt-0.5">No media</p>
            )}
          </div>

          {/* External link */}
          {item.externalPostUrl && (
            <div className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3 text-accent-blue" />
              <a href={item.externalPostUrl} target="_blank" rel="noopener noreferrer" className="text-accent-blue text-xs hover:underline truncate">
                {item.externalPostUrl}
              </a>
            </div>
          )}
          {item.externalPostId && (
            <div className="text-xs">
              <span className="text-white-40">External Post ID: </span>
              <span className="text-white font-mono">{item.externalPostId}</span>
            </div>
          )}

          {/* Error */}
          {item.publishError && (
            <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-3.5 h-3.5 text-accent-red" />
                <span className="text-accent-red text-xs font-medium">Publish Error</span>
              </div>
              <pre className="text-accent-red text-xs font-mono whitespace-pre-wrap">{item.publishError}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
