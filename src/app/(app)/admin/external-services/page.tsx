'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Shield,
  DollarSign,
  Activity,
  Database,
  Pencil,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useAdminServices,
  useAdminServicesSummary,
  useAdminService,
  useCreateService,
  useUpdateService,
  useSeedServices,
  useRefreshDerivedUsage,
} from '@/hooks/useAdmin';
import type { ExternalServiceItem } from '@/hooks/useAdmin';

// ── Status helpers ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-green-500/20 text-green-400',
  watch: 'bg-yellow-500/20 text-yellow-400',
  near_limit: 'bg-orange-500/20 text-accent-orange',
  critical: 'bg-red-500/20 text-accent-red',
  down: 'bg-red-500/20 text-accent-red',
};

const CRITICALITY_COLORS: Record<string, string> = {
  critical: 'text-accent-red',
  high: 'text-accent-orange',
  standard: 'text-white-40',
  low: 'text-white-30',
};

const CATEGORY_ICONS: Record<string, string> = {
  ai: '🤖', infrastructure: '🏗️', auth: '🔐', billing: '💳',
  messaging: '📧', data: '📊',
};

function statusIcon(status: string) {
  switch (status) {
    case 'healthy': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'watch': return <Eye className="w-4 h-4 text-yellow-400" />;
    case 'near_limit': return <AlertTriangle className="w-4 h-4 text-accent-orange" />;
    case 'critical': case 'down': return <XCircle className="w-4 h-4 text-accent-red" />;
    default: return <Activity className="w-4 h-4 text-white-30" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[status] || 'bg-white-10 text-white-40')}>
      {status.replace('_', ' ')}
    </span>
  );
}

function UsageBar({ percent }: { percent: number | null }) {
  if (percent == null) return <span className="text-white-30 text-xs">No limit set</span>;
  const color = percent >= 95 ? 'bg-accent-red' : percent >= 80 ? 'bg-accent-orange' : percent >= 60 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white-10 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span className={cn('text-xs font-medium', percent >= 80 ? 'text-accent-orange' : 'text-white-40')}>{percent.toFixed(0)}%</span>
    </div>
  );
}

function formatCost(cents: number | null) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function ExternalServicesPage() {
  const { isAdmin } = useCurrentUser();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);

  const { data: services, isLoading } = useAdminServices({ category: categoryFilter });
  const { data: summary } = useAdminServicesSummary();
  const seedMutation = useSeedServices();
  const refreshMutation = useRefreshDerivedUsage();

  if (selectedId) {
    return <ServiceDetailView id={selectedId} isAdmin={isAdmin} onBack={() => setSelectedId(undefined)} />;
  }

  if (showCreate && isAdmin) {
    return <ServiceForm onBack={() => setShowCreate(false)} />;
  }

  const categories = services ? Array.from(new Set(services.map((s) => s.category))).sort() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">External Services</h1>
          <p className="text-white-40 text-sm">Monitor third-party service dependencies, costs, and usage limits.</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', refreshMutation.isPending && 'animate-spin')} />
              Refresh usage
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-sm font-medium hover:bg-accent-green-110/25 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add service
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard icon={<Activity className="w-5 h-5 text-green-400" />} label="Healthy" value={summary.healthy} />
          <SummaryCard icon={<AlertTriangle className="w-5 h-5 text-accent-orange" />} label="Watch / Near Limit" value={summary.watch + summary.nearLimit} />
          <SummaryCard icon={<XCircle className="w-5 h-5 text-accent-red" />} label="Critical / Down" value={summary.critical} />
          <SummaryCard icon={<DollarSign className="w-5 h-5 text-accent-blue" />} label="Monthly Cost" value={formatCost(summary.totalMonthlyCostCents)} />
        </div>
      )}

      {/* Seed prompt */}
      {!isLoading && services?.length === 0 && isAdmin && (
        <div className="rounded-xl border border-white-10 bg-sp-surface p-6 text-center">
          <Database className="w-8 h-8 text-white-20 mx-auto mb-3" />
          <p className="text-white-40 text-sm mb-3">No services registered yet. Seed the registry with known Squadpitch vendors?</p>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="px-4 py-2 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-sm font-medium hover:bg-accent-green-110/25 transition-colors disabled:opacity-50"
          >
            {seedMutation.isPending ? 'Seeding...' : 'Seed services'}
          </button>
          {seedMutation.isSuccess && (
            <p className="text-green-400 text-xs mt-2">Created {seedMutation.data.created} services</p>
          )}
        </div>
      )}

      {/* Filters */}
      {services && services.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryFilter('')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', !categoryFilter ? 'bg-accent-green-110/15 text-accent-green-110' : 'text-white-40 hover:bg-white-5')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', categoryFilter === cat ? 'bg-accent-green-110/15 text-accent-green-110' : 'text-white-40 hover:bg-white-5')}
            >
              {CATEGORY_ICONS[cat] || ''} {cat}
            </button>
          ))}
        </div>
      )}

      {/* Service grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services?.map((svc) => (
            <ServiceCard key={svc.id} service={svc} onSelect={() => setSelectedId(svc.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white-10 bg-sp-surface p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white-5 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <p className="text-white-40 text-[10px] font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function ServiceCard({ service: s, onSelect }: { service: ExternalServiceItem; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-xl border bg-sp-surface p-5 cursor-pointer hover:bg-white-5 transition-colors',
        s.status === 'critical' || s.status === 'down' ? 'border-accent-red/30' :
        s.status === 'near_limit' ? 'border-accent-orange/30' :
        'border-white-10',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {statusIcon(s.status)}
          <h3 className="text-white font-semibold text-sm">{s.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={s.status} />
          {s.criticality === 'critical' && <Shield className="w-3 h-3 text-accent-red" />}
        </div>
      </div>

      <p className="text-white-40 text-xs mb-3 line-clamp-2">{s.purpose}</p>

      {/* Usage bar */}
      {(s.hardLimit || s.currentUsage != null) && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-white-30 mb-1">
            <span>{s.currentUsage ?? 0} {s.usageUnit || ''}</span>
            {s.hardLimit && <span>/ {s.hardLimit} {s.usageUnit || ''}</span>}
          </div>
          <UsageBar percent={s.percentUsed} />
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-white-30 pt-2 border-t border-white-5">
        <span>{s.category}</span>
        {s.monthlyCostCents != null && <span>{formatCost(s.monthlyCostCents)}/mo</span>}
        {s.planName && <span>{s.planName}</span>}
      </div>
    </div>
  );
}

// ── Detail View ──────────────────────────────────────────────────────────

function ServiceDetailView({ id, isAdmin, onBack }: { id: string; isAdmin: boolean; onBack: () => void }) {
  const { data: svc, isLoading } = useAdminService(id);
  const [editing, setEditing] = useState(false);

  if (isLoading || !svc) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (editing && isAdmin) {
    return <ServiceForm service={svc} onBack={() => setEditing(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white-5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white-40" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              {statusIcon(svc.status)}
              <h1 className="text-2xl font-bold text-white">{svc.name}</h1>
              <StatusBadge status={svc.status} />
            </div>
            <p className="text-white-30 text-xs font-mono mt-0.5">{svc.key}</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overview */}
        <Section title="Overview">
          <InfoRow label="Purpose" value={svc.purpose} />
          <InfoRow label="Category" value={svc.category} />
          <InfoRow label="Criticality" value={svc.criticality} />
          <InfoRow label="Environment" value={svc.environment} />
          <InfoRow label="Status" value={svc.status} />
          {svc.usedByFeatures && <InfoRow label="Used By" value={svc.usedByFeatures} />}
          {svc.consoleUrl && (
            <div className="flex items-center gap-1 mt-2">
              <ExternalLink className="w-3 h-3 text-accent-blue" />
              <a href={svc.consoleUrl} target="_blank" rel="noopener noreferrer" className="text-accent-blue text-xs hover:underline truncate">
                Open console
              </a>
            </div>
          )}
          {svc.docsUrl && (
            <div className="flex items-center gap-1 mt-1">
              <ExternalLink className="w-3 h-3 text-accent-blue" />
              <a href={svc.docsUrl} target="_blank" rel="noopener noreferrer" className="text-accent-blue text-xs hover:underline truncate">
                Docs
              </a>
            </div>
          )}
        </Section>

        {/* Plan & Billing */}
        <Section title="Plan & Billing">
          <InfoRow label="Plan" value={svc.planName || '—'} />
          <InfoRow label="Billing Cycle" value={svc.billingCycle || '—'} />
          <InfoRow label="Monthly Cost" value={formatCost(svc.monthlyCostCents)} />
          <InfoRow label="Renewal Date" value={svc.renewalDate ? new Date(svc.renewalDate).toLocaleDateString() : '—'} />
        </Section>

        {/* Usage */}
        <Section title="Usage & Limits">
          <InfoRow label="Current Usage" value={svc.currentUsage != null ? `${svc.currentUsage} ${svc.usageUnit || ''}` : '—'} />
          <InfoRow label="Hard Limit" value={svc.hardLimit != null ? `${svc.hardLimit} ${svc.usageUnit || ''}` : '—'} />
          <InfoRow label="Soft Limit" value={svc.softLimit != null ? `${svc.softLimit} ${svc.usageUnit || ''}` : '—'} />
          <InfoRow label="Usage Source" value={svc.usageSource} />
          <div className="mt-3">
            <UsageBar percent={svc.percentUsed} />
          </div>
        </Section>

        {/* Recovery */}
        <Section title="Operations">
          {svc.recoveryNotes ? (
            <div className="mb-2">
              <p className="text-white-40 text-xs font-medium mb-1">Recovery Notes:</p>
              <p className="text-white-60 text-xs">{svc.recoveryNotes}</p>
            </div>
          ) : (
            <InfoRow label="Recovery Notes" value="—" />
          )}
          {svc.fallbackInfo ? (
            <div className="mb-2">
              <p className="text-white-40 text-xs font-medium mb-1">Fallback:</p>
              <p className="text-white-60 text-xs">{svc.fallbackInfo}</p>
            </div>
          ) : (
            <InfoRow label="Fallback" value="—" />
          )}
          {svc.notes && (
            <div>
              <p className="text-white-40 text-xs font-medium mb-1">Notes:</p>
              <p className="text-white-60 text-xs whitespace-pre-wrap">{svc.notes}</p>
            </div>
          )}
        </Section>

        {/* Usage History */}
        {svc.usageSnapshots.length > 0 && (
          <Section title="Usage History" fullWidth>
            <div className="rounded-lg border border-white-10 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white-10 bg-sp-bg">
                    <th className="text-left px-3 py-2 text-white-40 font-medium">Date</th>
                    <th className="text-left px-3 py-2 text-white-40 font-medium">Usage</th>
                    <th className="text-left px-3 py-2 text-white-40 font-medium">Limit</th>
                    <th className="text-left px-3 py-2 text-white-40 font-medium">%</th>
                    <th className="text-left px-3 py-2 text-white-40 font-medium">Source</th>
                    <th className="text-left px-3 py-2 text-white-40 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {svc.usageSnapshots.map((snap) => (
                    <tr key={snap.id} className="border-b border-white-5">
                      <td className="px-3 py-2 text-white-60">{new Date(snap.snapshotAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-white">{snap.usage}</td>
                      <td className="px-3 py-2 text-white-40">{snap.limit ?? '—'}</td>
                      <td className="px-3 py-2">{snap.percentUsed != null ? <span className={cn(snap.percentUsed >= 80 ? 'text-accent-orange' : 'text-white-40')}>{snap.percentUsed.toFixed(0)}%</span> : '—'}</td>
                      <td className="px-3 py-2 text-white-30">{snap.source}</td>
                      <td className="px-3 py-2 text-white-30">{snap.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Create/Edit Form ─────────────────────────────────────────────────────

function ServiceForm({ service, onBack }: { service?: ExternalServiceItem; onBack: () => void }) {
  const isEdit = Boolean(service);
  const createMutation = useCreateService();
  const updateMutation = useUpdateService(service?.id ?? '');

  const [form, setForm] = useState({
    key: service?.key ?? '',
    name: service?.name ?? '',
    category: service?.category ?? 'infrastructure',
    purpose: service?.purpose ?? '',
    criticality: service?.criticality ?? 'standard',
    environment: service?.environment ?? 'production',
    consoleUrl: service?.consoleUrl ?? '',
    docsUrl: service?.docsUrl ?? '',
    notes: service?.notes ?? '',
    usedByFeatures: service?.usedByFeatures ?? '',
    recoveryNotes: service?.recoveryNotes ?? '',
    fallbackInfo: service?.fallbackInfo ?? '',
    planName: service?.planName ?? '',
    billingCycle: service?.billingCycle ?? '',
    renewalDate: service?.renewalDate ? service.renewalDate.slice(0, 10) : '',
    monthlyCostCents: service?.monthlyCostCents ?? '',
    hardLimit: service?.hardLimit ?? '',
    softLimit: service?.softLimit ?? '',
    currentUsage: service?.currentUsage ?? '',
    usageUnit: service?.usageUnit ?? '',
    status: service?.status ?? '',
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      ...form,
      monthlyCostCents: form.monthlyCostCents ? Number(form.monthlyCostCents) : null,
      hardLimit: form.hardLimit ? Number(form.hardLimit) : null,
      softLimit: form.softLimit ? Number(form.softLimit) : null,
      currentUsage: form.currentUsage ? Number(form.currentUsage) : null,
      renewalDate: form.renewalDate ? new Date(form.renewalDate).toISOString() : null,
      consoleUrl: form.consoleUrl || null,
      docsUrl: form.docsUrl || null,
      notes: form.notes || null,
      usedByFeatures: form.usedByFeatures || null,
      recoveryNotes: form.recoveryNotes || null,
      fallbackInfo: form.fallbackInfo || null,
      status: form.status || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(body, { onSuccess: onBack });
    } else {
      createMutation.mutate(body, { onSuccess: onBack });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white-5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white-40" />
        </button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Service' : 'Add Service'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <fieldset className="rounded-xl border border-white-10 bg-sp-surface p-5 space-y-4">
          <legend className="text-sm font-semibold text-white px-2">Identity</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Key" value={form.key} onChange={(v) => update('key', v)} placeholder="e.g. openai" disabled={isEdit} required />
            <Field label="Name" value={form.name} onChange={(v) => update('name', v)} placeholder="e.g. OpenAI" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Category" value={form.category} onChange={(v) => update('category', v)} options={['ai', 'infrastructure', 'auth', 'billing', 'messaging', 'data']} />
            <SelectField label="Criticality" value={form.criticality} onChange={(v) => update('criticality', v)} options={['critical', 'high', 'standard', 'low']} />
          </div>
          <Field label="Purpose" value={form.purpose} onChange={(v) => update('purpose', v)} placeholder="What does this service do for Squadpitch?" required textarea />
          <Field label="Used By Features" value={form.usedByFeatures} onChange={(v) => update('usedByFeatures', v)} placeholder="Comma-separated features" />
        </fieldset>

        {/* Plan & Billing */}
        <fieldset className="rounded-xl border border-white-10 bg-sp-surface p-5 space-y-4">
          <legend className="text-sm font-semibold text-white px-2">Plan & Billing</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plan Name" value={form.planName} onChange={(v) => update('planName', v)} placeholder="e.g. Pro, Pay-as-you-go" />
            <SelectField label="Billing Cycle" value={form.billingCycle} onChange={(v) => update('billingCycle', v)} options={['', 'monthly', 'annual', 'usage']} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly Cost (cents)" value={String(form.monthlyCostCents)} onChange={(v) => update('monthlyCostCents', v)} placeholder="e.g. 2000 = $20" type="number" />
            <Field label="Renewal Date" value={form.renewalDate} onChange={(v) => update('renewalDate', v)} type="date" />
          </div>
        </fieldset>

        {/* Usage */}
        <fieldset className="rounded-xl border border-white-10 bg-sp-surface p-5 space-y-4">
          <legend className="text-sm font-semibold text-white px-2">Usage & Limits</legend>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Current Usage" value={String(form.currentUsage)} onChange={(v) => update('currentUsage', v)} type="number" />
            <Field label="Hard Limit" value={String(form.hardLimit)} onChange={(v) => update('hardLimit', v)} type="number" />
            <Field label="Soft Limit" value={String(form.softLimit)} onChange={(v) => update('softLimit', v)} type="number" />
          </div>
          <Field label="Usage Unit" value={form.usageUnit} onChange={(v) => update('usageUnit', v)} placeholder="e.g. requests, tokens, gb, emails, dollars" />
        </fieldset>

        {/* Links & Notes */}
        <fieldset className="rounded-xl border border-white-10 bg-sp-surface p-5 space-y-4">
          <legend className="text-sm font-semibold text-white px-2">Links & Notes</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Console URL" value={form.consoleUrl} onChange={(v) => update('consoleUrl', v)} placeholder="https://..." />
            <Field label="Docs URL" value={form.docsUrl} onChange={(v) => update('docsUrl', v)} placeholder="https://..." />
          </div>
          <Field label="Notes" value={form.notes} onChange={(v) => update('notes', v)} textarea />
          <Field label="Recovery Notes" value={form.recoveryNotes} onChange={(v) => update('recoveryNotes', v)} textarea placeholder="What to do if this service goes down" />
          <Field label="Fallback Info" value={form.fallbackInfo} onChange={(v) => update('fallbackInfo', v)} placeholder="Fallback service or workaround" />
        </fieldset>

        {/* Status override */}
        <fieldset className="rounded-xl border border-white-10 bg-sp-surface p-5 space-y-4">
          <legend className="text-sm font-semibold text-white px-2">Status</legend>
          <SelectField label="Override Status" value={form.status} onChange={(v) => update('status', v)} options={['', 'healthy', 'watch', 'near_limit', 'critical', 'down']} />
          <p className="text-white-30 text-xs">Leave blank to auto-derive from usage percentage.</p>
        </fieldset>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-lg text-white-40 text-sm hover:bg-white-5 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-sm font-medium hover:bg-accent-green-110/25 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create service'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Form Fields ──────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', required, disabled, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; disabled?: boolean; textarea?: boolean;
}) {
  const cls = "w-full px-3 py-2 rounded-lg bg-sp-bg border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50 disabled:opacity-50";
  return (
    <div>
      <label className="block text-white-40 text-xs font-medium mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} disabled={disabled} className={cn(cls, 'resize-none h-20')} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} disabled={disabled} className={cls} />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-white-40 text-xs font-medium mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-sp-bg border border-white-10 text-white text-sm focus:outline-none focus:border-accent-green-110/50">
        {options.map((o) => <option key={o} value={o}>{o || '(auto)'}</option>)}
      </select>
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────────────

function Section({ title, fullWidth, children }: { title: string; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-white-10 bg-sp-surface p-5', fullWidth && 'lg:col-span-2')}>
      <h2 className="text-sm font-semibold text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1 border-b border-white-5 last:border-0">
      <span className="text-white-40 text-xs">{label}</span>
      <span className="text-white text-xs text-right max-w-[60%]">{value}</span>
    </div>
  );
}
