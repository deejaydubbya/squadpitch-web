'use client';

import { useState } from 'react';
import { Search, ChevronRight, ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Clock, Plug, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminWorkspaces, useAdminWorkspace } from '@/hooks/useAdmin';
import type { WorkspaceSummary, WorkspaceDetail } from '@/hooks/useAdmin';

const STATUS_OPTIONS = ['', 'ACTIVE', 'PAUSED', 'ARCHIVED'];

function connectionStatusIcon(status: string) {
  switch (status) {
    case 'CONNECTED': return <CheckCircle2 className="w-3 h-3 text-green-400" />;
    case 'EXPIRED': case 'REVOKED': return <XCircle className="w-3 h-3 text-accent-red" />;
    case 'NEEDS_RECONNECT': case 'ERROR': return <AlertTriangle className="w-3 h-3 text-accent-orange" />;
    default: return <Clock className="w-3 h-3 text-white-30" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-500/20 text-green-400',
    PAUSED: 'bg-yellow-500/20 text-yellow-400',
    ARCHIVED: 'bg-white-10 text-white-40',
    CONNECTED: 'bg-green-500/20 text-green-400',
    EXPIRED: 'bg-red-500/20 text-accent-red',
    NEEDS_RECONNECT: 'bg-orange-500/20 text-accent-orange',
    ERROR: 'bg-red-500/20 text-accent-red',
    REVOKED: 'bg-red-500/20 text-accent-red',
  };
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', colors[status] || 'bg-white-10 text-white-40')}>
      {status}
    </span>
  );
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-white-30 text-xs">No plan</span>;
  const colors: Record<string, string> = {
    STARTER: 'bg-white-10 text-white-60',
    GROWTH: 'bg-accent-blue/20 text-accent-blue',
    PRO: 'bg-accent-green-110/20 text-accent-green-110',
    AGENCY: 'bg-purple-500/20 text-purple-400',
  };
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', colors[tier] || 'bg-white-10 text-white-40')}>
      {tier}
    </span>
  );
}

export default function WorkspacesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const { data, isLoading, isError } = useAdminWorkspaces({
    search,
    status: statusFilter,
    limit: '50',
  });

  const { data: detail, isLoading: detailLoading } = useAdminWorkspace(selectedId);

  if (selectedId && detail) {
    return <WorkspaceDetailView detail={detail} onBack={() => setSelectedId(undefined)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Workspace Inspector</h1>
        <p className="text-white-40 text-sm">Search and inspect workspace data, connections, and health.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
          <input
            type="text"
            placeholder="Search by name, email, client ID, or auth0 ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none focus:border-accent-green-110/50"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-accent-red text-sm">Failed to load workspaces.</div>
      ) : !data?.items.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No workspaces found.</div>
      ) : (
        <div className="rounded-xl border border-white-10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white-10 bg-sp-surface">
                <th className="text-left px-4 py-3 text-white-40 font-medium">Workspace</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Owner</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Channels</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Drafts</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((ws) => (
                <WorkspaceRow key={ws.id} ws={ws} onSelect={() => setSelectedId(ws.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && detailLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}

function WorkspaceRow({ ws, onSelect }: { ws: WorkspaceSummary; onSelect: () => void }) {
  const connectedCount = ws.channels.filter((c) => c.status === 'CONNECTED').length;
  const unhealthyCount = ws.channels.filter((c) => c.status !== 'CONNECTED').length;

  return (
    <tr
      onClick={onSelect}
      className="border-b border-white-5 hover:bg-white-5 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="font-medium text-white">{ws.name}</div>
        <div className="text-white-30 text-xs font-mono mt-0.5">{ws.id}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-white-60">{ws.owner?.email || ws.createdBy}</div>
        {ws.owner?.name && <div className="text-white-30 text-xs">{ws.owner.name}</div>}
      </td>
      <td className="px-4 py-3"><StatusBadge status={ws.status} /></td>
      <td className="px-4 py-3"><TierBadge tier={ws.tier} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {connectedCount > 0 && (
            <span className="text-green-400 text-xs">{connectedCount} connected</span>
          )}
          {unhealthyCount > 0 && (
            <span className="text-accent-orange text-xs">{unhealthyCount} issue{unhealthyCount > 1 ? 's' : ''}</span>
          )}
          {ws.channels.length === 0 && <span className="text-white-30 text-xs">None</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-white-60">{ws.draftCount}</td>
      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-white-20" /></td>
    </tr>
  );
}

// ── Detail View ──────────────────────────────────────────────────────────

function WorkspaceDetailView({ detail, onBack }: { detail: WorkspaceDetail; onBack: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white-5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white-40" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
          <p className="text-white-30 text-xs font-mono">{detail.id}</p>
        </div>
        <StatusBadge status={detail.status} />
        {detail.subscription && <TierBadge tier={detail.subscription.tier} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basics */}
        <Section title="Workspace Info">
          <InfoRow label="Slug" value={detail.slug} />
          <InfoRow label="Industry" value={detail.industryKey || '—'} />
          <InfoRow label="Timezone" value={detail.timezone} />
          <InfoRow label="Created" value={new Date(detail.createdAt).toLocaleDateString()} />
          <InfoRow label="Owner Auth0 Sub" value={detail.createdBy} mono />
        </Section>

        {/* Owner & Subscription */}
        <Section title="Owner & Subscription">
          {detail.owner ? (
            <>
              <InfoRow label="Email" value={detail.owner.email} />
              <InfoRow label="Name" value={detail.owner.name || '—'} />
              <InfoRow label="User ID" value={detail.owner.id} mono />
            </>
          ) : (
            <p className="text-white-30 text-sm">Owner not found</p>
          )}
          {detail.subscription ? (
            <>
              <InfoRow label="Plan" value={detail.subscription.tier} />
              <InfoRow label="Status" value={detail.subscription.status} />
              {detail.subscription.trialConsumedAt && <InfoRow label="Trial State" value={detail.subscription.trialState || 'Consumed'} />}
              {detail.subscription.trialStart && <InfoRow label="Trial Start" value={new Date(detail.subscription.trialStart).toLocaleString()} />}
              {detail.subscription.trialEnd && <InfoRow label="Trial End" value={new Date(detail.subscription.trialEnd).toLocaleString()} />}
              <InfoRow label="Stripe Customer" value={detail.subscription.stripeCustomerId} mono />
              {detail.subscription.stripeSubscriptionId && <InfoRow label="Stripe Subscription" value={detail.subscription.stripeSubscriptionId} mono />}
              {detail.subscription.currentPeriodEnd && (
                <InfoRow label="Period End" value={new Date(detail.subscription.currentPeriodEnd).toLocaleDateString()} />
              )}
            </>
          ) : (
            <InfoRow label="Plan" value="No subscription" />
          )}
        </Section>

        {/* Brand */}
        {detail.brand && (
          <Section title="Brand Profile">
            <InfoRow label="Industry" value={detail.brand.industry || '—'} />
            <InfoRow label="Website" value={detail.brand.website || '—'} />
            <InfoRow label="Location" value={[detail.brand.city, detail.brand.state].filter(Boolean).join(', ') || '—'} />
            {detail.brand.description && (
              <p className="text-white-40 text-xs mt-2 line-clamp-3">{detail.brand.description}</p>
            )}
          </Section>
        )}

        {/* Voice & Media */}
        <Section title="Content Profiles">
          {detail.voice ? (
            <InfoRow label="Voice Tone" value={detail.voice.tone || '—'} />
          ) : (
            <InfoRow label="Voice" value="Not configured" />
          )}
          {detail.media ? (
            <InfoRow label="Media Mode" value={detail.media.mode} />
          ) : (
            <InfoRow label="Media" value="Not configured" />
          )}
        </Section>

        {/* Channel Connections */}
        <Section title="Channel Connections" icon={<Plug className="w-4 h-4 text-accent-blue" />}>
          {detail.connections.length === 0 ? (
            <p className="text-white-30 text-sm">No channels connected</p>
          ) : (
            <div className="space-y-2">
              {detail.connections.map((cc) => (
                <div key={cc.id} className="flex items-center justify-between py-1.5 border-b border-white-5 last:border-0">
                  <div className="flex items-center gap-2">
                    {connectionStatusIcon(cc.status)}
                    <span className="text-white text-sm font-medium">{cc.channel}</span>
                    {cc.displayName && <span className="text-white-30 text-xs">({cc.displayName})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={cc.status} />
                    {cc.tokenExpiresAt && (
                      <span className="text-white-30 text-[10px]">
                        exp: {new Date(cc.tokenExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {detail.connections.some((c) => c.lastError) && (
            <div className="mt-3 space-y-1">
              <p className="text-accent-orange text-xs font-medium">Connection Errors:</p>
              {detail.connections.filter((c) => c.lastError).map((c) => (
                <p key={c.id} className="text-accent-red text-xs font-mono">{c.channel}: {c.lastError}</p>
              ))}
            </div>
          )}
        </Section>

        {/* Tech Stack */}
        <Section title="Tech Stack Connections" icon={<Database className="w-4 h-4 text-accent-orange" />}>
          {detail.techStack.length === 0 ? (
            <p className="text-white-30 text-sm">No tech stack connections</p>
          ) : (
            <div className="space-y-2">
              {detail.techStack.map((ts) => (
                <div key={ts.id} className="flex items-center justify-between py-1.5 border-b border-white-5 last:border-0">
                  <span className="text-white text-sm">{ts.providerKey}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ts.connectionStatus.toUpperCase()} />
                    {ts.lastError && <AlertTriangle className="w-3 h-3 text-accent-orange" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Analytics */}
        {detail.analytics && (
          <Section title="Analytics Summary">
            <InfoRow label="Total Posts" value={String(detail.analytics.totalPosts)} />
            <InfoRow label="Published" value={String(detail.analytics.totalPublishedPosts)} />
            <InfoRow label="Avg Engagement" value={detail.analytics.avgEngagementRate ? `${(detail.analytics.avgEngagementRate * 100).toFixed(2)}%` : '—'} />
            <InfoRow label="Top Platform" value={detail.analytics.topPlatform || '—'} />
          </Section>
        )}
      </div>

      {/* Recent Drafts */}
      <Section title="Recent Drafts" fullWidth>
        {detail.recentDrafts.length === 0 ? (
          <p className="text-white-30 text-sm">No drafts</p>
        ) : (
          <div className="rounded-lg border border-white-10 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white-10 bg-sp-surface">
                  <th className="text-left px-3 py-2 text-white-40 font-medium">Status</th>
                  <th className="text-left px-3 py-2 text-white-40 font-medium">Channel</th>
                  <th className="text-left px-3 py-2 text-white-40 font-medium">Kind</th>
                  <th className="text-left px-3 py-2 text-white-40 font-medium">Content</th>
                  <th className="text-left px-3 py-2 text-white-40 font-medium">Model</th>
                  <th className="text-left px-3 py-2 text-white-40 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {detail.recentDrafts.map((d) => (
                  <tr key={d.id} className="border-b border-white-5">
                    <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                    <td className="px-3 py-2 text-white-60">{d.channel}</td>
                    <td className="px-3 py-2 text-white-60">{d.kind}</td>
                    <td className="px-3 py-2 text-white-40 max-w-xs truncate">{d.body || '—'}</td>
                    <td className="px-3 py-2 text-white-30 font-mono">{d.modelUsed || '—'}</td>
                    <td className="px-3 py-2 text-white-30">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Recent Failures */}
      {detail.recentFailures.length > 0 && (
        <Section title="Recent Failures" fullWidth>
          <div className="space-y-2">
            {detail.recentFailures.map((f) => (
              <div key={f.id} className="rounded-lg border border-accent-red/20 bg-accent-red/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-3.5 h-3.5 text-accent-red" />
                  <span className="text-white text-xs font-medium">{f.channel}</span>
                  <span className="text-white-30 text-[10px] font-mono">{f.id}</span>
                  <span className="text-white-30 text-[10px] ml-auto">Attempts: {f.publishAttempts}</span>
                </div>
                {f.publishError && <p className="text-accent-red text-xs font-mono">{f.publishError}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────────────

function Section({ title, icon, fullWidth, children }: { title: string; icon?: React.ReactNode; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-white-10 bg-sp-surface p-5', fullWidth && 'lg:col-span-2')}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white-5 last:border-0">
      <span className="text-white-40 text-xs">{label}</span>
      <span className={cn('text-white text-xs text-right', mono && 'font-mono text-white-60')}>{value}</span>
    </div>
  );
}
