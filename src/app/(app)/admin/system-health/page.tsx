'use client';

import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Activity,
  Database,
  Server,
  Shield,
  Cpu,
  Video,
  Send,
  Bell,
  Globe,
  Gauge,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSystemHealth } from '@/hooks/useAdmin';
import type { SystemHealthService, SystemHealthIssue } from '@/hooks/useAdmin';

// ── Constants ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  healthy: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    icon: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    label: 'Healthy',
  },
  degraded: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
    label: 'Degraded',
  },
  down: {
    color: 'text-accent-red',
    bg: 'bg-red-500/20',
    border: 'border-accent-red/30',
    icon: <XCircle className="w-4 h-4 text-accent-red" />,
    label: 'Down',
  },
  unknown: {
    color: 'text-white-40',
    bg: 'bg-white-10',
    border: 'border-white-10',
    icon: <HelpCircle className="w-4 h-4 text-white-40" />,
    label: 'Unknown',
  },
};

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  core: { label: 'Core Infrastructure', icon: <Server className="w-4 h-4" /> },
  ai: { label: 'AI & Generation', icon: <Cpu className="w-4 h-4" /> },
  delivery: { label: 'Delivery & Publishing', icon: <Send className="w-4 h-4" /> },
  vendor: { label: 'Vendor Services', icon: <Globe className="w-4 h-4" /> },
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  api: <Activity className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  redis: <Database className="w-4 h-4" />,
  auth: <Shield className="w-4 h-4" />,
  openai: <Cpu className="w-4 h-4" />,
  fal: <Video className="w-4 h-4" />,
  throttle: <Gauge className="w-4 h-4" />,
  queues: <Activity className="w-4 h-4" />,
  publishing: <Send className="w-4 h-4" />,
  webhooks: <Globe className="w-4 h-4" />,
  notifications: <Bell className="w-4 h-4" />,
  'external-services': <Globe className="w-4 h-4" />,
  'ai-providers': <Cpu className="w-4 h-4" />,
};

function getConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function SystemHealthPage() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useSystemHealth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">System Health</h1>
          <p className="text-white-40 text-sm">Real-time health overview of Squadpitch infrastructure, providers, and delivery systems.</p>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-white-30 text-xs">
              Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-accent-red text-sm">Failed to load system health.</div>
      ) : data ? (
        <>
          {/* Overall status banner */}
          <OverallBanner overall={data.overall} counts={data.counts} />

          {/* Active issues */}
          {data.issues.length > 0 && (
            <IssuesPanel issues={data.issues} />
          )}

          {/* Services grid by category */}
          <ServicesGrid services={data.services} />
        </>
      ) : null}
    </div>
  );
}

// ── Overall Banner ──────────────────────────────────────────────────────

function OverallBanner({
  overall,
  counts,
}: {
  overall: string;
  counts: { healthy: number; degraded: number; down: number; unknown: number; total: number };
}) {
  const cfg = getConfig(overall);

  return (
    <div className={cn('rounded-xl border p-6', cfg.border, overall === 'healthy' ? 'bg-green-500/5' : overall === 'down' ? 'bg-red-500/5' : 'bg-yellow-500/5')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', cfg.bg)}>
            {overall === 'healthy'
              ? <CheckCircle2 className="w-6 h-6 text-green-400" />
              : overall === 'down'
                ? <XCircle className="w-6 h-6 text-accent-red" />
                : <AlertTriangle className="w-6 h-6 text-yellow-400" />
            }
          </div>
          <div>
            <h2 className={cn('text-lg font-semibold', cfg.color)}>
              {overall === 'healthy' ? 'All Systems Operational' :
               overall === 'degraded' ? 'Some Systems Degraded' :
               overall === 'down' ? 'System Issues Detected' :
               'Status Unknown'}
            </h2>
            <p className="text-white-40 text-sm mt-0.5">
              {counts.total} services monitored
            </p>
          </div>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <p className="text-green-400 font-semibold text-lg">{counts.healthy}</p>
            <p className="text-white-40 text-xs">Healthy</p>
          </div>
          {counts.degraded > 0 && (
            <div className="text-center">
              <p className="text-yellow-400 font-semibold text-lg">{counts.degraded}</p>
              <p className="text-white-40 text-xs">Degraded</p>
            </div>
          )}
          {counts.down > 0 && (
            <div className="text-center">
              <p className="text-accent-red font-semibold text-lg">{counts.down}</p>
              <p className="text-white-40 text-xs">Down</p>
            </div>
          )}
          {counts.unknown > 0 && (
            <div className="text-center">
              <p className="text-white-40 font-semibold text-lg">{counts.unknown}</p>
              <p className="text-white-40 text-xs">Unknown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Issues Panel ────────────────────────────────────────────────────────

function IssuesPanel({ issues }: { issues: SystemHealthIssue[] }) {
  // Sort: down first, then degraded, then unknown
  const sorted = [...issues].sort((a, b) => {
    const order: Record<string, number> = { down: 0, degraded: 1, unknown: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="rounded-xl border border-accent-red/20 bg-accent-red/5 p-5">
      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-accent-red" />
        Active Issues ({issues.length})
      </h2>
      <div className="space-y-2">
        {sorted.map((issue) => {
          const cfg = getConfig(issue.status);
          return (
            <div key={issue.key} className="flex items-start gap-3 py-2 border-b border-white-5 last:border-0">
              {cfg.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-medium text-sm">{issue.name}</span>
                  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', cfg.bg, cfg.color)}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-white-40 text-xs">{issue.message}</p>
                <p className="text-white-30 text-xs mt-0.5">Impact: {issue.impact}</p>
              </div>
              {issue.adminLink && (
                <Link
                  href={issue.adminLink}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-accent-blue hover:bg-accent-blue/10 transition-colors flex-shrink-0"
                >
                  Investigate <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Services Grid ───────────────────────────────────────────────────────

function ServicesGrid({ services }: { services: SystemHealthService[] }) {
  // Group by category
  const categories = ['core', 'ai', 'delivery', 'vendor'];
  const grouped: Record<string, SystemHealthService[]> = {};
  for (const svc of services) {
    const cat = svc.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(svc);
  }

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        const meta = CATEGORY_META[cat] || { label: cat, icon: <Globe className="w-4 h-4" /> };

        return (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-white-40">{meta.icon}</span>
              {meta.label}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map((svc) => (
                <ServiceCard key={svc.key} service={svc} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Service Card ────────────────────────────────────────────────────────

function ServiceCard({ service }: { service: SystemHealthService }) {
  const cfg = getConfig(service.status);
  const icon = SERVICE_ICONS[service.key] || <Globe className="w-4 h-4" />;

  return (
    <div className={cn(
      'rounded-xl border bg-sp-surface p-4 transition-colors',
      service.status === 'healthy' ? 'border-white-10' : cfg.border,
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
          <span className={cfg.color}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium text-sm">{service.name}</span>
            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
          </div>
          <p className="text-white-40 text-xs leading-relaxed">{service.message}</p>
          <p className="text-white-30 text-xs mt-1">Impact: {service.impact}</p>

          {/* Detail section for services with extra data */}
          {service.detail && service.key === 'queues' && (
            <QueueDetail detail={service.detail} />
          )}
          {service.detail && service.key === 'publishing' && (
            <PublishingDetail detail={service.detail} />
          )}
          {service.detail && service.key === 'external-services' && (
            <ExtServicesDetail detail={service.detail} />
          )}
        </div>
        {service.adminLink && (
          <Link
            href={service.adminLink}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-accent-blue hover:bg-accent-blue/10 transition-colors flex-shrink-0 mt-0.5"
          >
            View <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Detail sub-components ───────────────────────────────────────────────

function QueueDetail({ detail }: { detail: Record<string, unknown> }) {
  const failedByQueue = detail.failedByQueue as { queue: string; failed: number }[] | undefined;

  return (
    <div className="mt-2 pt-2 border-t border-white-5">
      <div className="flex gap-4 text-xs">
        <span className="text-accent-blue">{String(detail.totalActive)} active</span>
        <span className="text-yellow-400">{String(detail.totalWaiting)} waiting</span>
        <span className={cn((detail.totalFailed as number) > 0 ? 'text-accent-red' : 'text-white-30')}>
          {String(detail.totalFailed)} failed
        </span>
      </div>
      {failedByQueue && failedByQueue.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {failedByQueue.map((q) => (
            <div key={q.queue} className="text-[10px] text-accent-red">
              {q.queue}: {q.failed} failed
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublishingDetail({ detail }: { detail: Record<string, unknown> }) {
  return (
    <div className="mt-2 pt-2 border-t border-white-5 flex gap-4 text-xs">
      <span className="text-green-400">{String(detail.recentPublished)} published</span>
      <span className={cn((detail.recentFailed as number) > 0 ? 'text-accent-red' : 'text-white-30')}>
        {String(detail.recentFailed)} failed
      </span>
      {(detail.expiredConnections as number) > 0 && (
        <span className="text-accent-orange">{String(detail.expiredConnections)} expired connections</span>
      )}
    </div>
  );
}

function ExtServicesDetail({ detail }: { detail: Record<string, unknown> }) {
  return (
    <div className="mt-2 pt-2 border-t border-white-5 flex gap-4 text-xs">
      <span className="text-green-400">{String(detail.healthy)} healthy</span>
      {(detail.watch as number) > 0 && <span className="text-yellow-400">{String(detail.watch)} watch</span>}
      {(detail.nearLimit as number) > 0 && <span className="text-accent-orange">{String(detail.nearLimit)} near limit</span>}
      {(detail.critical as number) > 0 && <span className="text-accent-red">{String(detail.critical)} critical</span>}
      <span className="text-white-30">Cost: {String(detail.monthlyCost)}/mo</span>
    </div>
  );
}
