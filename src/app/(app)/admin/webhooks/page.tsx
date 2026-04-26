'use client';

import { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Globe,
  Shield,
  ShieldOff,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Power,
  PowerOff,
  Send,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useWebhookSummary,
  useWebhookEndpoints,
  useWebhookEndpoint,
  useWebhookDeliveries,
  useToggleWebhookEndpoint,
  useReplayDelivery,
} from '@/hooks/useAdmin';
import type {
  WebhookEndpointItem,
  WebhookEndpointDetail,
  WebhookDeliveryItem,
} from '@/hooks/useAdmin';

// ── Constants ───────────────────────────────────────────────────────────

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-accent-red',
  pending: 'bg-yellow-500/20 text-yellow-400',
};

const EVENT_TYPES = [
  '', 'POST_PUBLISHED', 'POST_FAILED', 'USAGE_LIMIT_NEARING',
  'CONNECTION_EXPIRED', 'BATCH_COMPLETE', 'TEST',
];

const selectCls = 'px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none';

function statusIcon(status: string) {
  switch (status) {
    case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'failed': return <XCircle className="w-4 h-4 text-accent-red" />;
    case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
    default: return <Clock className="w-4 h-4 text-white-30" />;
  }
}

function formatTime(ts: string | number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function formatUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname;
  } catch {
    return url;
  }
}

// ── Main Page ───────────────────────────────────────────────────────────

type View = 'overview' | 'endpoint-detail';

export default function WebhooksPage() {
  const { isAdmin } = useCurrentUser();
  const [view, setView] = useState<View>('overview');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | undefined>();
  const [tab, setTab] = useState<'endpoints' | 'deliveries'>('endpoints');

  if (view === 'endpoint-detail' && selectedEndpointId) {
    return (
      <EndpointDetailView
        endpointId={selectedEndpointId}
        isAdmin={isAdmin}
        onBack={() => { setView('overview'); setSelectedEndpointId(undefined); }}
      />
    );
  }

  return (
    <OverviewView
      isAdmin={isAdmin}
      tab={tab}
      onTabChange={setTab}
      onSelectEndpoint={(id) => { setSelectedEndpointId(id); setView('endpoint-detail'); }}
    />
  );
}

// ── Overview View ───────────────────────────────────────────────────────

function OverviewView({
  isAdmin,
  tab,
  onTabChange,
  onSelectEndpoint,
}: {
  isAdmin: boolean;
  tab: 'endpoints' | 'deliveries';
  onTabChange: (t: 'endpoints' | 'deliveries') => void;
  onSelectEndpoint: (id: string) => void;
}) {
  const { data: summary, refetch: refetchSummary } = useWebhookSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Webhooks</h1>
          <p className="text-white-40 text-sm">Inspect outbound webhook endpoints, delivery history, and failures.</p>
        </div>
        <button
          onClick={() => refetchSummary()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total Endpoints" value={summary.totalEndpoints} icon={<Globe className="w-4 h-4" />} />
          <SummaryCard label="Active Endpoints" value={summary.activeEndpoints} icon={<Power className="w-4 h-4" />} color="text-green-400" />
          <SummaryCard
            label="Failed (24h)"
            value={summary.recentFailed24h}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={summary.recentFailed24h > 0 ? 'text-accent-red' : 'text-white-40'}
            borderColor={summary.recentFailed24h > 0 ? 'border-accent-red/30' : undefined}
          />
          <SummaryCard label="Total Deliveries" value={summary.totalDeliveries} icon={<Send className="w-4 h-4" />} />
        </div>
      )}

      {/* Delivery stats */}
      {summary && (
        <div className="flex gap-4 text-xs">
          {Object.entries(summary.deliveriesByStatus).map(([status, count]) => (
            <span key={status} className={cn(
              status === 'success' ? 'text-green-400' :
              status === 'failed' ? 'text-accent-red' :
              'text-yellow-400',
            )}>
              {count} {status}
            </span>
          ))}
          {summary.inactiveEndpoints > 0 && (
            <span className="text-white-30">{summary.inactiveEndpoints} inactive endpoints</span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white-10">
        <button
          onClick={() => onTabChange('endpoints')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'endpoints' ? 'border-accent-green-110 text-white' : 'border-transparent text-white-40 hover:text-white-60',
          )}
        >
          Endpoints
        </button>
        <button
          onClick={() => onTabChange('deliveries')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'deliveries' ? 'border-accent-green-110 text-white' : 'border-transparent text-white-40 hover:text-white-60',
          )}
        >
          Deliveries
        </button>
      </div>

      {tab === 'endpoints' ? (
        <EndpointsTab isAdmin={isAdmin} onSelect={onSelectEndpoint} />
      ) : (
        <DeliveriesTab isAdmin={isAdmin} />
      )}
    </div>
  );
}

// ── Summary Card ────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  color,
  borderColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  borderColor?: string;
}) {
  return (
    <div className={cn('rounded-xl border bg-sp-surface p-5 flex items-start gap-4', borderColor || 'border-white-10')}>
      <div className="w-10 h-10 rounded-lg bg-white-5 flex items-center justify-center flex-shrink-0 text-white-40">
        {icon}
      </div>
      <div>
        <p className="text-white-40 text-xs font-medium uppercase">{label}</p>
        <p className={cn('text-2xl font-semibold', color || 'text-white')}>{value}</p>
      </div>
    </div>
  );
}

// ── Endpoints Tab ───────────────────────────────────────────────────────

function EndpointsTab({ isAdmin, onSelect }: { isAdmin: boolean; onSelect: (id: string) => void }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: endpoints, isLoading } = useWebhookEndpoints({ status: statusFilter, search });
  const toggleMut = useToggleWebhookEndpoint();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">All endpoints</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by URL or user ID..."
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50 w-64"
        />
      </div>

      {/* Endpoints list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : !endpoints?.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No webhook endpoints found.</div>
      ) : (
        <div className="space-y-2">
          {endpoints.map((ep) => (
            <EndpointRow
              key={ep.id}
              endpoint={ep}
              isAdmin={isAdmin}
              onSelect={() => onSelect(ep.id)}
              onToggle={() => toggleMut.mutate({ endpointId: ep.id, isActive: !ep.isActive })}
              toggling={toggleMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EndpointRow({
  endpoint,
  isAdmin,
  onSelect,
  onToggle,
  toggling,
}: {
  endpoint: WebhookEndpointItem;
  isAdmin: boolean;
  onSelect: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const hasFailed = (endpoint.recentStats.failed || 0) > 0;

  return (
    <div className={cn(
      'rounded-lg border bg-sp-surface p-4 hover:bg-white-5 transition-colors',
      hasFailed ? 'border-accent-red/30' :
      !endpoint.isActive ? 'border-white-10 opacity-70' :
      'border-white-10',
    )}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {endpoint.isActive
            ? <Power className="w-4 h-4 text-green-400" />
            : <PowerOff className="w-4 h-4 text-white-30" />
          }
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
              endpoint.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white-10 text-white-40',
            )}>
              {endpoint.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <span className="text-white font-medium text-sm truncate">{formatUrl(endpoint.targetUrl)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white-40">
            <span>User: {endpoint.userId}</span>
            {endpoint.hasSecret && (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-accent-green-110" />
                Signed
              </span>
            )}
            {!endpoint.hasSecret && (
              <span className="flex items-center gap-1 text-accent-orange">
                <ShieldOff className="w-3 h-3" />
                No secret
              </span>
            )}
            <span>{endpoint.subscribedEvents.length} events</span>
            <span>{endpoint.totalDeliveries} deliveries</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs">
          {hasFailed && (
            <span className="text-accent-red">{endpoint.recentStats.failed} failed (7d)</span>
          )}
          {(endpoint.recentStats.success || 0) > 0 && (
            <span className="text-green-400">{endpoint.recentStats.success} ok (7d)</span>
          )}
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              disabled={toggling}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50',
                endpoint.isActive
                  ? 'bg-red-500/15 text-accent-red hover:bg-red-500/25'
                  : 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
              )}
            >
              {endpoint.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          <span className="text-white-30">{formatTime(endpoint.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Deliveries Tab ──────────────────────────────────────────────────────

function DeliveriesTab({ isAdmin }: { isAdmin: boolean }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: deliveriesData, isLoading, isError } = useWebhookDeliveries({
    status: statusFilter,
    eventType: eventFilter,
    userId: userFilter,
  });

  const replayMut = useReplayDelivery();

  const deliveries = deliveriesData?.items || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className={selectCls}>
          {EVENT_TYPES.map((ev) => (
            <option key={ev} value={ev}>{ev || 'All event types'}</option>
          ))}
        </select>
        <input
          type="text"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="Filter by user ID..."
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50 w-48"
        />
      </div>

      {/* Deliveries */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-accent-red text-sm">Failed to load deliveries.</div>
      ) : !deliveries.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No deliveries found matching filters.</div>
      ) : (
        <div className="space-y-2">
          {deliveries.map((d) => (
            <DeliveryRow
              key={d.id}
              delivery={d}
              expanded={expandedId === d.id}
              onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
              isAdmin={isAdmin}
              onReplay={() => replayMut.mutate(d.id)}
              replaying={replayMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Delivery Row ────────────────────────────────────────────────────────

function DeliveryRow({
  delivery,
  expanded,
  onToggle,
  isAdmin,
  onReplay,
  replaying,
}: {
  delivery: WebhookDeliveryItem;
  expanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onReplay: () => void;
  replaying: boolean;
}) {
  const [showPayload, setShowPayload] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  return (
    <div className={cn(
      'rounded-lg border bg-sp-surface transition-colors',
      delivery.status === 'failed' ? 'border-accent-red/30' : 'border-white-10',
    )}>
      {/* Summary */}
      <div onClick={onToggle} className="p-4 cursor-pointer hover:bg-white-5 transition-colors">
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-white-30 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-white-30 flex-shrink-0" />}
          {statusIcon(delivery.status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', DELIVERY_STATUS_COLORS[delivery.status] || 'bg-white-10 text-white-40')}>
                {delivery.status}
              </span>
              <span className="text-white font-medium text-sm">{delivery.eventType}</span>
              {delivery.endpoint && (
                <span className="text-white-30 text-xs truncate">{formatUrl(delivery.endpoint.targetUrl)}</span>
              )}
              {delivery.replayOfId && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">
                  REPLAY
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 text-xs">
            {delivery.responseStatus && (
              <span className={cn(
                delivery.responseStatus >= 200 && delivery.responseStatus < 300 ? 'text-green-400' : 'text-accent-red',
              )}>
                HTTP {delivery.responseStatus}
              </span>
            )}
            {delivery.attemptCount > 1 && (
              <span className="text-accent-orange">{delivery.attemptCount} attempts</span>
            )}
            <span className="text-white-30 whitespace-nowrap">{formatTime(delivery.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white-10 p-4 space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-white-40">Delivery ID</span>
              <p className="text-white font-mono mt-0.5">{delivery.id}</p>
            </div>
            <div>
              <span className="text-white-40">Event Type</span>
              <p className="text-white mt-0.5">{delivery.eventType}</p>
            </div>
            <div>
              <span className="text-white-40">Status</span>
              <p className="mt-0.5">
                <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', DELIVERY_STATUS_COLORS[delivery.status])}>
                  {delivery.status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-white-40">Attempts</span>
              <p className="text-white mt-0.5">{delivery.attemptCount}</p>
            </div>
            <div>
              <span className="text-white-40">Created</span>
              <p className="text-white mt-0.5">{formatTime(delivery.createdAt)}</p>
            </div>
            <div>
              <span className="text-white-40">Delivered At</span>
              <p className="text-white mt-0.5">{formatTime(delivery.deliveredAt)}</p>
            </div>
            <div>
              <span className="text-white-40">Response Status</span>
              <p className={cn('mt-0.5', delivery.responseStatus && delivery.responseStatus >= 200 && delivery.responseStatus < 300 ? 'text-green-400' : 'text-accent-red')}>
                {delivery.responseStatus ? `HTTP ${delivery.responseStatus}` : '—'}
              </p>
            </div>
            {delivery.replayOfId && (
              <div>
                <span className="text-white-40">Replay Of</span>
                <p className="text-purple-400 font-mono mt-0.5">{delivery.replayOfId}</p>
              </div>
            )}
            {delivery.endpoint && (
              <>
                <div>
                  <span className="text-white-40">Endpoint</span>
                  <p className="text-white text-xs mt-0.5 truncate font-mono">{delivery.endpoint.targetUrl}</p>
                </div>
                <div>
                  <span className="text-white-40">User</span>
                  <p className="text-white font-mono mt-0.5">{delivery.endpoint.userId}</p>
                </div>
              </>
            )}
          </div>

          {/* Request headers */}
          {delivery.requestHeaders && Object.keys(delivery.requestHeaders).length > 0 && (
            <div>
              <button
                onClick={() => setShowHeaders(!showHeaders)}
                className="flex items-center gap-1.5 text-white-40 text-xs hover:text-white transition-colors"
              >
                {showHeaders ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Request Headers
              </button>
              {showHeaders && (
                <div className="mt-2 p-3 rounded-lg bg-sp-bg border border-white-10 text-xs font-mono space-y-1">
                  {Object.entries(delivery.requestHeaders).map(([key, val]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-white-40">{key}:</span>
                      <span className="text-white-60 break-all">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Request payload */}
          {delivery.requestBody && Object.keys(delivery.requestBody).length > 0 && (
            <div>
              <button
                onClick={() => setShowPayload(!showPayload)}
                className="flex items-center gap-1.5 text-white-40 text-xs hover:text-white transition-colors"
              >
                {showPayload ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Request Payload
              </button>
              {showPayload && (
                <pre className="mt-2 p-3 rounded-lg bg-sp-bg border border-white-10 text-white-60 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
                  {JSON.stringify(delivery.requestBody, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Response body */}
          {delivery.responseBody && (
            <div>
              <button
                onClick={() => setShowResponse(!showResponse)}
                className="flex items-center gap-1.5 text-white-40 text-xs hover:text-white transition-colors"
              >
                {showResponse ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Response Body
              </button>
              {showResponse && (
                <pre className="mt-2 p-3 rounded-lg bg-sp-bg border border-white-10 text-white-60 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                  {delivery.responseBody}
                </pre>
              )}
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && delivery.status === 'failed' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onReplay}
                disabled={replaying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue/15 text-accent-blue text-xs font-medium hover:bg-accent-blue/25 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                {replaying ? 'Replaying...' : 'Replay delivery'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Endpoint Detail View ────────────────────────────────────────────────

function EndpointDetailView({
  endpointId,
  isAdmin,
  onBack,
}: {
  endpointId: string;
  isAdmin: boolean;
  onBack: () => void;
}) {
  const { data: endpoint, isLoading } = useWebhookEndpoint(endpointId);
  const toggleMut = useToggleWebhookEndpoint();
  const replayMut = useReplayDelivery();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white-40 text-sm hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center py-12 text-white-30 text-sm">Endpoint not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-white-40 text-sm hover:text-white transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Webhooks
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Endpoint Detail</h1>
            <p className="text-white-40 text-sm font-mono">{endpoint.targetUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
              endpoint.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white-10 text-white-40',
            )}>
              {endpoint.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
            {isAdmin && (
              <button
                onClick={() => toggleMut.mutate({ endpointId: endpoint.id, isActive: !endpoint.isActive })}
                disabled={toggleMut.isPending}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                  endpoint.isActive
                    ? 'bg-red-500/15 text-accent-red hover:bg-red-500/25'
                    : 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
                )}
              >
                {endpoint.isActive ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                {endpoint.isActive ? 'Deactivate' : 'Activate'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white-10 bg-sp-surface p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Configuration</h2>
          <div className="space-y-2">
            <InfoRow label="Endpoint ID" value={endpoint.id} mono />
            <InfoRow label="Target URL" value={endpoint.targetUrl} mono />
            <InfoRow label="User ID" value={endpoint.userId} mono />
            <InfoRow
              label="Secret"
              value={
                endpoint.hasSecret
                  ? <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-accent-green-110" /> Present (HMAC-SHA256)</span>
                  : <span className="flex items-center gap-1 text-accent-orange"><ShieldOff className="w-3 h-3" /> Not configured</span>
              }
            />
            <InfoRow label="Created" value={formatTime(endpoint.createdAt)} />
            <InfoRow label="Updated" value={formatTime(endpoint.updatedAt)} />
          </div>
        </div>

        <div className="rounded-xl border border-white-10 bg-sp-surface p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Subscriptions & Stats</h2>
          <div className="space-y-3">
            <div>
              <span className="text-white-40 text-xs block mb-1.5">Subscribed Events</span>
              <div className="flex flex-wrap gap-1.5">
                {endpoint.subscribedEvents.length > 0 ? endpoint.subscribedEvents.map((ev) => (
                  <span key={ev} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-blue/15 text-accent-blue text-[10px] font-medium">
                    <Zap className="w-2.5 h-2.5" />
                    {ev}
                  </span>
                )) : (
                  <span className="text-white-30 text-xs">No events subscribed</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div>
                <span className="text-white-40 block">Total</span>
                <span className="text-white font-medium">{endpoint.totalDeliveries}</span>
              </div>
              <div>
                <span className="text-white-40 block">Success</span>
                <span className="text-green-400 font-medium">{endpoint.statsByStatus?.success || 0}</span>
              </div>
              <div>
                <span className="text-white-40 block">Failed</span>
                <span className={cn('font-medium', (endpoint.statsByStatus?.failed || 0) > 0 ? 'text-accent-red' : 'text-white-30')}>
                  {endpoint.statsByStatus?.failed || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent deliveries */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Recent Deliveries</h2>
        {endpoint.recentDeliveries.length === 0 ? (
          <div className="text-center py-8 text-white-30 text-sm">No deliveries yet.</div>
        ) : (
          <div className="space-y-2">
            {endpoint.recentDeliveries.map((d) => (
              <DeliveryRow
                key={d.id}
                delivery={d}
                expanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                isAdmin={isAdmin}
                onReplay={() => replayMut.mutate(d.id)}
                replaying={replayMut.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Info Row ────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white-5 last:border-0">
      <span className="text-white-40 text-xs">{label}</span>
      <span className={cn('text-white text-xs text-right max-w-[60%] truncate', mono && 'font-mono text-white-60')}>
        {value}
      </span>
    </div>
  );
}
