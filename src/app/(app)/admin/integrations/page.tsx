'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plug,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminConnections, useAdminTechStack } from '@/hooks/useAdmin';
import type { ConnectionItem, TechStackItem } from '@/hooks/useAdmin';

const STATUS_OPTIONS = ['', 'CONNECTED', 'NEEDS_RECONNECT', 'EXPIRED', 'REVOKED', 'ERROR'];
const CHANNEL_OPTIONS = ['', 'INSTAGRAM', 'TIKTOK', 'X', 'LINKEDIN', 'FACEBOOK', 'YOUTUBE'];

function connectionStatusIcon(status: string) {
  switch (status) {
    case 'CONNECTED': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'EXPIRED': case 'REVOKED': return <XCircle className="w-4 h-4 text-accent-red" />;
    case 'NEEDS_RECONNECT': case 'ERROR': return <AlertTriangle className="w-4 h-4 text-accent-orange" />;
    default: return <Clock className="w-4 h-4 text-white-30" />;
  }
}

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const colors: Record<string, string> = {
    CONNECTED: 'bg-green-500/20 text-green-400',
    connected: 'bg-green-500/20 text-green-400',
    EXPIRED: 'bg-red-500/20 text-accent-red',
    REVOKED: 'bg-red-500/20 text-accent-red',
    NEEDS_RECONNECT: 'bg-orange-500/20 text-accent-orange',
    ERROR: 'bg-red-500/20 text-accent-red',
    error: 'bg-red-500/20 text-accent-red',
    not_connected: 'bg-white-10 text-white-40',
    pending: 'bg-yellow-500/20 text-yellow-400',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded font-medium',
      size === 'sm' ? 'text-[10px]' : 'text-xs',
      colors[status] || 'bg-white-10 text-white-40',
    )}>
      {status}
    </span>
  );
}

export default function IntegrationsPage() {
  const [tab, setTab] = useState<'channels' | 'techstack'>('channels');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Integration Monitor</h1>
        <p className="text-white-40 text-sm">Inspect channel connections, OAuth tokens, and tech stack integrations.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-sp-surface rounded-lg border border-white-10 w-fit">
        <button
          onClick={() => setTab('channels')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'channels' ? 'bg-accent-green-110/15 text-accent-green-110' : 'text-white-40 hover:text-white-100',
          )}
        >
          <Plug className="w-4 h-4" />
          Channel Connections
        </button>
        <button
          onClick={() => setTab('techstack')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'techstack' ? 'bg-accent-green-110/15 text-accent-green-110' : 'text-white-40 hover:text-white-100',
          )}
        >
          <Database className="w-4 h-4" />
          Tech Stack
        </button>
      </div>

      {tab === 'channels' ? (
        <ChannelConnectionsTab statusFilter={statusFilter} channelFilter={channelFilter} onStatusChange={setStatusFilter} onChannelChange={setChannelFilter} />
      ) : (
        <TechStackTab />
      )}
    </div>
  );
}

// ── Channel Connections Tab ──────────────────────────────────────────────

function ChannelConnectionsTab({
  statusFilter, channelFilter, onStatusChange, onChannelChange,
}: {
  statusFilter: string; channelFilter: string; onStatusChange: (v: string) => void; onChannelChange: (v: string) => void;
}) {
  const { data: connections, isLoading, isError } = useAdminConnections({
    status: statusFilter,
    channel: channelFilter,
  });

  // Summary counts
  const summary = connections ? {
    total: connections.length,
    connected: connections.filter((c) => c.status === 'CONNECTED').length,
    expired: connections.filter((c) => c.status === 'EXPIRED').length,
    needsReconnect: connections.filter((c) => c.status === 'NEEDS_RECONNECT').length,
    error: connections.filter((c) => c.status === 'ERROR' || c.status === 'REVOKED').length,
  } : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <select value={channelFilter} onChange={(e) => onChannelChange(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
          {CHANNEL_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All channels'}</option>)}
        </select>
      </div>

      {/* Summary */}
      {summary && (
        <div className="flex gap-4 text-xs">
          <span className="text-white-40">{summary.total} total</span>
          <span className="text-green-400">{summary.connected} connected</span>
          {summary.expired > 0 && <span className="text-accent-red">{summary.expired} expired</span>}
          {summary.needsReconnect > 0 && <span className="text-accent-orange">{summary.needsReconnect} needs reconnect</span>}
          {summary.error > 0 && <span className="text-accent-red">{summary.error} error/revoked</span>}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-accent-red text-sm">Failed to load connections.</div>
      ) : !connections?.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No connections found.</div>
      ) : (
        <div className="rounded-xl border border-white-10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white-10 bg-sp-surface">
                <th className="text-left px-4 py-3 text-white-40 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Channel</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Workspace</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Account</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Token Expiry</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Last Validated</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((cc) => (
                <ConnectionRow key={cc.id} connection={cc} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConnectionRow({ connection: cc }: { connection: ConnectionItem }) {
  const isExpiringSoon = cc.tokenExpiresAt && new Date(cc.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <tr className="border-b border-white-5 hover:bg-white-5 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {connectionStatusIcon(cc.status)}
          <StatusBadge status={cc.status} />
        </div>
      </td>
      <td className="px-4 py-3 text-white font-medium">{cc.channel}</td>
      <td className="px-4 py-3">
        <div className="text-white-60">{cc.clientName || '—'}</div>
        <div className="text-white-30 text-[10px] font-mono">{cc.clientId}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-white-60">{cc.displayName || '—'}</div>
        {cc.externalAccountId && <div className="text-white-30 text-[10px] font-mono">{cc.externalAccountId}</div>}
      </td>
      <td className="px-4 py-3">
        {cc.tokenExpiresAt ? (
          <span className={cn('text-xs', isExpiringSoon ? 'text-accent-orange' : 'text-white-40')}>
            {new Date(cc.tokenExpiresAt).toLocaleDateString()}
            {isExpiringSoon && <AlertTriangle className="w-3 h-3 inline ml-1" />}
          </span>
        ) : (
          <span className="text-white-30 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-white-40 text-xs">
        {cc.lastValidatedAt ? new Date(cc.lastValidatedAt).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3">
        {cc.lastError ? (
          <span className="text-accent-red text-xs max-w-[200px] truncate block" title={cc.lastError}>{cc.lastError}</span>
        ) : (
          <span className="text-white-30 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

// ── Tech Stack Tab ───────────────────────────────────────────────────────

function TechStackTab() {
  const { data: techStack, isLoading, isError } = useAdminTechStack({});

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-accent-red text-sm">Failed to load tech stack connections.</div>
      ) : !techStack?.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No tech stack connections found.</div>
      ) : (
        <div className="rounded-xl border border-white-10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white-10 bg-sp-surface">
                <th className="text-left px-4 py-3 text-white-40 font-medium">Provider</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Workspace</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Industry</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Connected</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {techStack.map((ts) => (
                <tr key={ts.id} className="border-b border-white-5 hover:bg-white-5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{ts.providerKey}</td>
                  <td className="px-4 py-3">
                    <div className="text-white-60">{ts.workspaceName || '—'}</div>
                    <div className="text-white-30 text-[10px] font-mono">{ts.workspaceId}</div>
                  </td>
                  <td className="px-4 py-3 text-white-40">{ts.industryKey || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={ts.connectionStatus} size="md" /></td>
                  <td className="px-4 py-3 text-white-40 text-xs">
                    {ts.connectedAt ? new Date(ts.connectedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {ts.lastError ? (
                      <span className="text-accent-red text-xs max-w-[200px] truncate block" title={ts.lastError}>{ts.lastError}</span>
                    ) : (
                      <span className="text-white-30 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
