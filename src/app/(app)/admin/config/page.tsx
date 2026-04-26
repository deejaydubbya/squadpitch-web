'use client';

import { useState, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  Plus,
  Lock,
  Flag,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Globe,
  Target,
  Users,
  Building2,
  FlaskConical,
  Gauge,
  Wrench,
  Rocket,
  Sprout,
  X,
  Save,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useFeatureFlags,
  useToggleFlag,
  useCreateFlag,
  useUpdateFlag,
  useDeleteFlag,
  useSeedFlags,
} from '@/hooks/useAdmin';
import type { FeatureFlagItem } from '@/hooks/useAdmin';

// ── Constants ───────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'feature', label: 'Feature' },
  { value: 'rollout', label: 'Rollout' },
  { value: 'ops', label: 'Ops' },
  { value: 'experiment', label: 'Experiment' },
];

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  feature: { label: 'Feature', color: 'bg-purple-500/20 text-purple-400', icon: <Flag className="w-3 h-3" /> },
  rollout: { label: 'Rollout', color: 'bg-accent-blue/20 text-accent-blue', icon: <Rocket className="w-3 h-3" /> },
  ops: { label: 'Ops', color: 'bg-accent-orange/20 text-accent-orange', icon: <Wrench className="w-3 h-3" /> },
  experiment: { label: 'Experiment', color: 'bg-yellow-500/20 text-yellow-400', icon: <FlaskConical className="w-3 h-3" /> },
};

const SCOPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  global: { label: 'Global', icon: <Globe className="w-3 h-3" /> },
  targeted: { label: 'Targeted', icon: <Target className="w-3 h-3" /> },
};

const TARGET_TYPE_ICONS: Record<string, React.ReactNode> = {
  workspace: <Building2 className="w-3 h-3" />,
  user: <Users className="w-3 h-3" />,
  cohort: <Users className="w-3 h-3" />,
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
];

// ── Main Page ───────────────────────────────────────────────────────────

export default function ConfigPage() {
  const { isAdmin } = useCurrentUser();

  // Filters
  const [category, setCategory] = useState('');
  const [enabled, setEnabled] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlagItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (enabled) params.enabled = enabled;
  if (search) params.search = search;

  const { data: flags, isLoading, isError, refetch, dataUpdatedAt } = useFeatureFlags(params);
  const toggleFlag = useToggleFlag();
  const deleteFlag = useDeleteFlag();
  const seedFlags = useSeedFlags();

  const handleToggle = useCallback((flag: FeatureFlagItem) => {
    toggleFlag.mutate({ id: flag.id, enabled: !flag.enabled });
  }, [toggleFlag]);

  const handleDelete = useCallback((id: string) => {
    deleteFlag.mutate(id, { onSuccess: () => setDeleteConfirm(null) });
  }, [deleteFlag]);

  const handleSeed = useCallback(() => {
    seedFlags.mutate();
  }, [seedFlags]);

  const openCreate = useCallback(() => {
    setEditingFlag(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((flag: FeatureFlagItem) => {
    setEditingFlag(flag);
    setFormOpen(true);
  }, []);

  // Stats
  const total = flags?.length ?? 0;
  const enabledCount = flags?.filter((f) => f.enabled).length ?? 0;
  const disabledCount = total - enabledCount;
  const categoryCounts: Record<string, number> = {};
  for (const f of flags ?? []) {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Config</h1>
            {!isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-orange/20 text-accent-orange">
                <Lock className="w-3 h-3" />
                Read-only
              </span>
            )}
          </div>
          <p className="text-white-40 text-sm">Feature flags, rollout controls, and operational toggles.</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Flags" value={total} />
        <StatCard label="Enabled" value={enabledCount} valueColor="text-green-400" />
        <StatCard label="Disabled" value={disabledCount} valueColor="text-white-40" />
        <StatCard label="Targeted" value={flags?.filter((f) => f.scope === 'targeted').length ?? 0} valueColor="text-accent-blue" />
        <StatCard label="Global" value={flags?.filter((f) => f.scope === 'global').length ?? 0} valueColor="text-purple-400" />
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
          <input
            type="text"
            placeholder="Search flags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110"
          />
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none focus:border-accent-green-110"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={enabled}
          onChange={(e) => setEnabled(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none focus:border-accent-green-110"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={seedFlags.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors disabled:opacity-50"
            >
              <Sprout className="w-3.5 h-3.5" />
              {seedFlags.isPending ? 'Seeding...' : 'Seed Defaults'}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-green-110 text-sp-bg text-sm font-medium hover:bg-accent-green-110/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Flag
            </button>
          </div>
        )}
      </div>

      {/* Seed result toast */}
      {seedFlags.isSuccess && seedFlags.data && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-green-400 text-sm">
          Seeded {seedFlags.data.created} new flag{seedFlags.data.created !== 1 ? 's' : ''} ({seedFlags.data.total} total).
        </div>
      )}

      {/* Flags list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-accent-red text-sm">Failed to load feature flags.</div>
      ) : !flags || flags.length === 0 ? (
        <div className="text-center py-16 text-white-40 text-sm">
          No feature flags found.
          {isAdmin && (
            <button onClick={handleSeed} className="ml-2 text-accent-blue hover:underline">
              Seed defaults?
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white-10 overflow-hidden">
          {flags.map((flag, i) => (
            <FlagRow
              key={flag.id}
              flag={flag}
              expanded={expandedId === flag.id}
              onToggleExpand={() => setExpandedId(expandedId === flag.id ? null : flag.id)}
              onToggleFlag={() => handleToggle(flag)}
              onEdit={() => openEdit(flag)}
              onDelete={() => setDeleteConfirm(flag.id)}
              isAdmin={isAdmin}
              isLast={i === flags.length - 1}
              deleteConfirm={deleteConfirm === flag.id}
              onDeleteConfirm={() => handleDelete(flag.id)}
              onDeleteCancel={() => setDeleteConfirm(null)}
              isDeleting={deleteFlag.isPending}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {formOpen && (
        <FlagFormModal
          flag={editingFlag}
          onClose={() => { setFormOpen(false); setEditingFlag(null); }}
        />
      )}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────

function StatCard({ label, value, valueColor = 'text-white' }: { label: string; value: number; valueColor?: string }) {
  return (
    <div className="rounded-xl border border-white-10 bg-sp-surface p-4">
      <p className="text-white-40 text-xs mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', valueColor)}>{value}</p>
    </div>
  );
}

// ── Flag Row ─────────────────────────────────────────────────────────────

function FlagRow({
  flag,
  expanded,
  onToggleExpand,
  onToggleFlag,
  onEdit,
  onDelete,
  isAdmin,
  isLast,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleting,
}: {
  flag: FeatureFlagItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleFlag: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  isLast: boolean;
  deleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isDeleting: boolean;
}) {
  const catCfg = CATEGORY_CONFIG[flag.category] || { label: flag.category, color: 'bg-white-10 text-white-40', icon: <Flag className="w-3 h-3" /> };
  const scopeCfg = SCOPE_CONFIG[flag.scope] || SCOPE_CONFIG.global;

  return (
    <div className={cn(!isLast && 'border-b border-white-10')}>
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-white-5 transition-colors cursor-pointer"
        onClick={onToggleExpand}
      >
        <span className="text-white-30 flex-shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        {/* Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); if (isAdmin) onToggleFlag(); }}
          disabled={!isAdmin}
          className={cn('flex-shrink-0 transition-colors', isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}
          title={isAdmin ? (flag.enabled ? 'Disable flag' : 'Enable flag') : 'Admin required'}
        >
          {flag.enabled ? (
            <ToggleRight className="w-6 h-6 text-green-400" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-white-30" />
          )}
        </button>

        {/* Name + key */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm truncate">{flag.name}</span>
            <code className="text-white-30 text-xs font-mono bg-white-5 px-1.5 py-0.5 rounded">{flag.key}</code>
          </div>
        </div>

        {/* Category badge */}
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0', catCfg.color)}>
          {catCfg.icon}
          {catCfg.label}
        </span>

        {/* Scope badge */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white-10 text-white-60 flex-shrink-0">
          {scopeCfg.icon}
          {scopeCfg.label}
        </span>

        {/* Status dot */}
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', flag.enabled ? 'bg-green-400' : 'bg-white-20')} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <FlagDetail
          flag={flag}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          deleteConfirm={deleteConfirm}
          onDeleteConfirm={onDeleteConfirm}
          onDeleteCancel={onDeleteCancel}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

// ── Flag Detail ──────────────────────────────────────────────────────────

function FlagDetail({
  flag,
  isAdmin,
  onEdit,
  onDelete,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleting,
}: {
  flag: FeatureFlagItem;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isDeleting: boolean;
}) {
  const [keyCopied, setKeyCopied] = useState(false);

  const copyKey = useCallback(() => {
    navigator.clipboard.writeText(flag.key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }, [flag.key]);

  return (
    <div className="px-4 pb-4 pt-1 ml-7 space-y-4">
      {/* Description */}
      {flag.description && (
        <p className="text-white-40 text-sm">{flag.description}</p>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoCell label="Key">
          <div className="flex items-center gap-1.5">
            <code className="text-white text-xs font-mono">{flag.key}</code>
            <button onClick={copyKey} className="text-white-30 hover:text-white transition-colors">
              {keyCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </InfoCell>
        <InfoCell label="Category">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', CATEGORY_CONFIG[flag.category]?.color || 'bg-white-10 text-white-40')}>
            {CATEGORY_CONFIG[flag.category]?.icon}
            {CATEGORY_CONFIG[flag.category]?.label || flag.category}
          </span>
        </InfoCell>
        <InfoCell label="Status">
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', flag.enabled ? 'text-green-400' : 'text-white-40')}>
            {flag.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {flag.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </InfoCell>
        <InfoCell label="Scope">
          <span className="inline-flex items-center gap-1.5 text-xs text-white-60">
            {SCOPE_CONFIG[flag.scope]?.icon}
            {SCOPE_CONFIG[flag.scope]?.label || flag.scope}
          </span>
        </InfoCell>
      </div>

      {/* Targeting info */}
      {flag.scope === 'targeted' && (
        <div className="rounded-lg border border-white-10 bg-white-5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-white text-xs font-medium">Targeting</span>
          </div>
          {flag.targetType ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white-40">Target type:</span>
                <span className="inline-flex items-center gap-1 text-white-60">
                  {TARGET_TYPE_ICONS[flag.targetType] || <Target className="w-3 h-3" />}
                  <span className="capitalize">{flag.targetType}</span>
                </span>
              </div>
              {flag.targetIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {flag.targetIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue text-[11px] font-mono"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-white-30 text-xs italic">No targets assigned yet.</p>
              )}
            </div>
          ) : (
            <p className="text-white-30 text-xs italic">No target type configured.</p>
          )}
        </div>
      )}

      {/* Rollout percentage */}
      {flag.rolloutPercentage != null && (
        <div className="rounded-lg border border-white-10 bg-white-5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-white text-xs font-medium">Rollout</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white-10 overflow-hidden">
              <div
                className="h-full bg-accent-green-110 rounded-full transition-all"
                style={{ width: `${flag.rolloutPercentage}%` }}
              />
            </div>
            <span className="text-white text-sm font-medium">{flag.rolloutPercentage}%</span>
          </div>
        </div>
      )}

      {/* Notes */}
      {flag.notes && (
        <div className="rounded-lg border border-white-10 bg-white-5 p-3">
          <span className="text-white-40 text-[10px] uppercase tracking-wider font-medium">Notes</span>
          <p className="text-white-60 text-xs mt-1 whitespace-pre-wrap">{flag.notes}</p>
        </div>
      )}

      {/* Timestamps + metadata */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-white-30">
        <span>Created {new Date(flag.createdAt).toLocaleString()}</span>
        <span>Updated {new Date(flag.updatedAt).toLocaleString()}</span>
        {flag.createdBy && <span>Created by {flag.createdBy}</span>}
        {flag.updatedBy && <span>Updated by {flag.updatedBy}</span>}
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white-10 text-white-60 text-xs hover:bg-white-5 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
          {deleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-accent-red text-xs">Delete this flag?</span>
              <button
                onClick={onDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-red text-white text-xs font-medium hover:bg-accent-red/80 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                onClick={onDeleteCancel}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white-10 text-white-60 text-xs hover:bg-white-5 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-red/30 text-accent-red text-xs hover:bg-accent-red/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Info Cell ────────────────────────────────────────────────────────────

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white-30 text-[10px] uppercase tracking-wider font-medium mb-1">{label}</p>
      {children}
    </div>
  );
}

// ── Flag Form Modal ──────────────────────────────────────────────────────

function FlagFormModal({
  flag,
  onClose,
}: {
  flag: FeatureFlagItem | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(flag);
  const createFlag = useCreateFlag();
  const updateFlag = useUpdateFlag(flag?.id ?? '');

  const [form, setForm] = useState({
    key: flag?.key ?? '',
    name: flag?.name ?? '',
    description: flag?.description ?? '',
    category: flag?.category ?? 'feature',
    enabled: flag?.enabled ?? false,
    scope: flag?.scope ?? 'global',
    targetType: flag?.targetType ?? '',
    targetIds: flag?.targetIds?.join(', ') ?? '',
    rolloutPercentage: flag?.rolloutPercentage?.toString() ?? '',
    notes: flag?.notes ?? '',
  });

  const [error, setError] = useState('');

  const setField = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.key.trim() || !form.name.trim()) {
      setError('Key and name are required.');
      return;
    }

    const body: Record<string, unknown> = {
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      enabled: form.enabled,
      scope: form.scope,
      targetType: form.scope === 'targeted' ? (form.targetType || null) : null,
      targetIds: form.scope === 'targeted' && form.targetIds.trim()
        ? form.targetIds.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      rolloutPercentage: form.rolloutPercentage ? parseInt(form.rolloutPercentage, 10) : null,
      notes: form.notes.trim() || null,
    };

    const mutation = isEdit ? updateFlag : createFlag;
    mutation.mutate(body, {
      onSuccess: () => onClose(),
      onError: (err: Error) => setError(err.message || 'Failed to save flag.'),
    });
  };

  const isPending = createFlag.isPending || updateFlag.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-sp-bg border border-white-10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white-10">
          <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Flag' : 'Create Flag'}</h2>
          <button onClick={onClose} className="text-white-40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2 text-accent-red text-sm">
              {error}
            </div>
          )}

          {/* Key */}
          <FormField label="Key" hint="Unique snake_case identifier (e.g. video_gen_beta)">
            <input
              type="text"
              value={form.key}
              onChange={(e) => setField('key', e.target.value)}
              disabled={isEdit}
              placeholder="my_feature_flag"
              className={cn(
                'w-full px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110 font-mono',
                isEdit && 'opacity-60 cursor-not-allowed',
              )}
            />
          </FormField>

          {/* Name */}
          <FormField label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="My Feature Flag"
              className="w-full px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110"
            />
          </FormField>

          {/* Description */}
          <FormField label="Description" optional>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="What does this flag control?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110 resize-none"
            />
          </FormField>

          {/* Category + Enabled */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <select
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none focus:border-accent-green-110"
              >
                <option value="feature">Feature</option>
                <option value="rollout">Rollout</option>
                <option value="ops">Ops</option>
                <option value="experiment">Experiment</option>
              </select>
            </FormField>
            <FormField label="Initial Status">
              <button
                type="button"
                onClick={() => setField('enabled', !form.enabled)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm transition-colors',
                  form.enabled
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : 'border-white-10 bg-sp-surface text-white-40',
                )}
              >
                {form.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                {form.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </FormField>
          </div>

          {/* Scope */}
          <FormField label="Scope">
            <div className="flex gap-2">
              {(['global', 'targeted'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setField('scope', s)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm transition-colors flex-1',
                    form.scope === s
                      ? 'border-accent-green-110 bg-accent-green-110/10 text-accent-green-110'
                      : 'border-white-10 bg-sp-surface text-white-40 hover:bg-white-5',
                  )}
                >
                  {SCOPE_CONFIG[s].icon}
                  {SCOPE_CONFIG[s].label}
                </button>
              ))}
            </div>
          </FormField>

          {/* Targeted fields */}
          {form.scope === 'targeted' && (
            <>
              <FormField label="Target Type">
                <select
                  value={form.targetType}
                  onChange={(e) => setField('targetType', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none focus:border-accent-green-110"
                >
                  <option value="">Select type...</option>
                  <option value="workspace">Workspace</option>
                  <option value="user">User</option>
                  <option value="cohort">Cohort</option>
                </select>
              </FormField>
              <FormField label="Target IDs" hint="Comma-separated list of IDs or cohort names">
                <input
                  type="text"
                  value={form.targetIds}
                  onChange={(e) => setField('targetIds', e.target.value)}
                  placeholder="alpha, beta-1, workspace-id-123"
                  className="w-full px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110 font-mono"
                />
              </FormField>
            </>
          )}

          {/* Rollout percentage */}
          <FormField label="Rollout Percentage" optional hint="Deterministic hash-based progressive rollout">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={form.rolloutPercentage}
                onChange={(e) => setField('rolloutPercentage', e.target.value)}
                placeholder="—"
                className="w-24 px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110"
              />
              {form.rolloutPercentage && (
                <div className="flex-1 h-2 rounded-full bg-white-10 overflow-hidden">
                  <div
                    className="h-full bg-accent-green-110 rounded-full transition-all"
                    style={{ width: `${Math.min(100, parseInt(form.rolloutPercentage) || 0)}%` }}
                  />
                </div>
              )}
            </div>
          </FormField>

          {/* Notes */}
          <FormField label="Notes" optional>
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Internal notes, context, links..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110 resize-none"
            />
          </FormField>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-green-110 text-sp-bg text-sm font-medium hover:bg-accent-green-110/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? 'Saving...' : isEdit ? 'Update Flag' : 'Create Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Form Field ───────────────────────────────────────────────────────────

function FormField({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-white text-sm font-medium">{label}</label>
        {optional && <span className="text-white-30 text-[10px]">Optional</span>}
      </div>
      {children}
      {hint && <p className="text-white-30 text-[10px] mt-1">{hint}</p>}
    </div>
  );
}
