'use client';

import { useState } from 'react';
import {
  Search, ArrowLeft, Plus, Star, Users, Plug, AlertTriangle,
  CheckCircle2, XCircle, Clock, Activity,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useBetaTesters, useBetaTester, useCreateTester, useUpdateTester,
} from '@/hooks/useAdmin';
import type { BetaTesterItem } from '@/hooks/useAdmin';

const STATUS_OPTIONS = ['', 'active', 'invited', 'paused', 'churned'];
const PRIORITY_OPTIONS = ['', 'high', 'normal', 'low'];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    invited: 'bg-accent-blue/20 text-accent-blue',
    paused: 'bg-yellow-500/20 text-yellow-400',
    churned: 'bg-white-10 text-white-40',
  };
  return <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', colors[status] || 'bg-white-10 text-white-40')}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'high') return <Star className="w-3 h-3 text-yellow-400" />;
  return null;
}

export default function TestersPage() {
  const { isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);

  const { data: testers, isLoading } = useBetaTesters({ search, status: statusFilter, cohort: cohortFilter });

  if (selectedId) return <TesterDetailView id={selectedId} isAdmin={isAdmin} onBack={() => setSelectedId(undefined)} />;
  if (showCreate && isAdmin) return <TesterForm onBack={() => setShowCreate(false)} />;

  const cohorts = testers ? Array.from(new Set(testers.map((t) => t.cohort).filter(Boolean))) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/beta-ops" className="p-2 rounded-lg hover:bg-white-5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white-40" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Tester Registry</h1>
            <p className="text-white-40 text-sm">Manage beta test users, cohorts, and notes.</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-sm font-medium hover:bg-accent-green-110/25 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add tester
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
          <input type="text" placeholder="Search by email, name, user ID, or workspace ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        {cohorts.length > 0 && (
          <select value={cohortFilter} onChange={(e) => setCohortFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
            <option value="">All cohorts</option>
            {cohorts.map((c) => <option key={c} value={c!}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" /></div>
      ) : !testers?.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No testers found.</div>
      ) : (
        <div className="rounded-xl border border-white-10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white-10 bg-sp-surface">
                <th className="text-left px-4 py-3 text-white-40 font-medium">Tester</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Cohort</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Tags</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Feedback</th>
                <th className="text-left px-4 py-3 text-white-40 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {testers.map((t) => (
                <tr key={t.id} onClick={() => setSelectedId(t.id)} className="border-b border-white-5 hover:bg-white-5 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <div>
                        <p className="text-white font-medium">{t.name || t.email}</p>
                        {t.name && <p className="text-white-30 text-xs">{t.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-accent-blue text-xs">{t.cohort || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-white-5 text-white-40 text-[10px]">{tag}</span>
                      ))}
                      {t.tags.length > 3 && <span className="text-white-30 text-[10px]">+{t.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white-60 text-xs">{t._count?.feedback || 0}</td>
                  <td className="px-4 py-3 text-white-30 text-xs">{new Date(t.joinedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tester Detail ────────────────────────────────────────────────────────

function TesterDetailView({ id, isAdmin, onBack }: { id: string; isAdmin: boolean; onBack: () => void }) {
  const { data: tester, isLoading } = useBetaTester(id);
  const [editing, setEditing] = useState(false);

  if (isLoading || !tester) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" /></div>;
  }

  if (editing && isAdmin) return <TesterForm tester={tester} onBack={() => setEditing(false)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white-5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white-40" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={tester.priority} />
              <h1 className="text-xl font-bold text-white">{tester.name || tester.email}</h1>
              <StatusBadge status={tester.status} />
            </div>
            <p className="text-white-30 text-xs">{tester.email}</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors">Edit</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info */}
        <Section title="Tester Info">
          <InfoRow label="User ID" value={tester.userId} mono />
          <InfoRow label="Workspace ID" value={tester.workspaceId || '—'} mono />
          <InfoRow label="Cohort" value={tester.cohort || '—'} />
          <InfoRow label="Priority" value={tester.priority} />
          <InfoRow label="Joined" value={new Date(tester.joinedAt).toLocaleDateString()} />
          {tester.lastActiveAt && <InfoRow label="Last Active" value={new Date(tester.lastActiveAt).toLocaleDateString()} />}
          {tester.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {tester.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded bg-white-5 text-white-60 text-xs">{tag}</span>
              ))}
            </div>
          )}
        </Section>

        {/* Workspace Context */}
        {tester.workspaceContext ? (
          <Section title="Workspace Context" icon={<Plug className="w-4 h-4 text-accent-blue" />}>
            <InfoRow label="Name" value={tester.workspaceContext.name} />
            <InfoRow label="Status" value={tester.workspaceContext.status} />
            <InfoRow label="Industry" value={tester.workspaceContext.industryKey || '—'} />
            <InfoRow label="Total Drafts" value={String(tester.workspaceContext.draftCount)} />
            {tester.workspaceContext.recentFailures > 0 && (
              <div className="flex items-center gap-1 mt-2 text-accent-red text-xs">
                <XCircle className="w-3 h-3" />
                {tester.workspaceContext.recentFailures} failures in last 7 days
              </div>
            )}
            <div className="mt-2 space-y-1">
              {tester.workspaceContext.connections.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {c.status === 'CONNECTED' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <AlertTriangle className="w-3 h-3 text-accent-orange" />}
                  <span className="text-white-60">{c.channel}</span>
                  <span className="text-white-30">{c.status}</span>
                </div>
              ))}
            </div>
          </Section>
        ) : (
          <Section title="Workspace Context">
            <p className="text-white-30 text-sm">No workspace linked</p>
          </Section>
        )}

        {/* Notes */}
        <Section title="Internal Notes">
          {tester.notes ? <p className="text-white-60 text-xs whitespace-pre-wrap">{tester.notes}</p> : <p className="text-white-30 text-sm">No notes</p>}
          {tester.contactNotes && (
            <div className="mt-3 pt-3 border-t border-white-5">
              <p className="text-white-40 text-xs font-medium mb-1">Contact / Follow-up:</p>
              <p className="text-white-60 text-xs whitespace-pre-wrap">{tester.contactNotes}</p>
            </div>
          )}
        </Section>

        {/* Recent Activity */}
        {tester.recentActivity && tester.recentActivity.length > 0 && (
          <Section title="Recent Activity" icon={<Activity className="w-4 h-4 text-accent-green-110" />}>
            <div className="space-y-2">
              {tester.recentActivity.map((a) => (
                <div key={a.id} className="py-1.5 border-b border-white-5 last:border-0">
                  <p className="text-white text-xs">{a.title}</p>
                  <p className="text-white-30 text-[10px]">{a.eventType} &middot; {new Date(a.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Feedback History */}
        {tester.feedback && tester.feedback.length > 0 && (
          <Section title="Feedback History" fullWidth>
            <div className="space-y-2">
              {tester.feedback.map((fb) => (
                <div key={fb.id} className="rounded-lg border border-white-5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', fb.status === 'new' ? 'bg-accent-blue/20 text-accent-blue' : fb.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-white-10 text-white-40')}>{fb.status}</span>
                    <span className="text-white-30 text-[10px]">{fb.type} &middot; {fb.severity}</span>
                    {fb.needsFollowUp && <AlertTriangle className="w-3 h-3 text-accent-orange" />}
                    <span className="text-white-30 text-[10px] ml-auto">{new Date(fb.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-white text-xs font-medium">{fb.title}</p>
                  <p className="text-white-40 text-xs mt-0.5 line-clamp-2">{fb.body}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Tester Form ──────────────────────────────────────────────────────────

function TesterForm({ tester, onBack }: { tester?: BetaTesterItem; onBack: () => void }) {
  const isEdit = Boolean(tester);
  const createMutation = useCreateTester();
  const updateMutation = useUpdateTester(tester?.id ?? '');

  const [form, setForm] = useState({
    userId: tester?.userId ?? '',
    email: tester?.email ?? '',
    name: tester?.name ?? '',
    workspaceId: tester?.workspaceId ?? '',
    status: tester?.status ?? 'active',
    cohort: tester?.cohort ?? '',
    tags: tester?.tags.join(', ') ?? '',
    priority: tester?.priority ?? 'normal',
    notes: tester?.notes ?? '',
    contactNotes: tester?.contactNotes ?? '',
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      workspaceId: form.workspaceId || null,
      cohort: form.cohort || null,
      notes: form.notes || null,
      contactNotes: form.contactNotes || null,
      name: form.name || null,
    };
    if (isEdit) {
      updateMutation.mutate(body, { onSuccess: onBack });
    } else {
      createMutation.mutate(body, { onSuccess: onBack });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white-5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white-40" />
        </button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Tester' : 'Add Tester'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white-10 bg-sp-surface p-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="User ID (auth0Sub)" value={form.userId} onChange={(v) => update('userId', v)} required disabled={isEdit} />
          <Field label="Email" value={form.email} onChange={(v) => update('email', v)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={form.name} onChange={(v) => update('name', v)} />
          <Field label="Workspace ID" value={form.workspaceId} onChange={(v) => update('workspaceId', v)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="Status" value={form.status} onChange={(v) => update('status', v)} options={['active', 'invited', 'paused', 'churned']} />
          <SelectField label="Priority" value={form.priority} onChange={(v) => update('priority', v)} options={['high', 'normal', 'low']} />
          <Field label="Cohort" value={form.cohort} onChange={(v) => update('cohort', v)} placeholder="e.g. alpha, beta-1" />
        </div>
        <Field label="Tags (comma-separated)" value={form.tags} onChange={(v) => update('tags', v)} placeholder="high-touch, paid, real-estate" />
        <Field label="Internal Notes" value={form.notes} onChange={(v) => update('notes', v)} textarea />
        <Field label="Contact / Follow-up Notes" value={form.contactNotes} onChange={(v) => update('contactNotes', v)} textarea />

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-lg text-white-40 text-sm hover:bg-white-5 transition-colors">Cancel</button>
          <button type="submit" disabled={isPending} className="px-4 py-2 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-sm font-medium hover:bg-accent-green-110/25 transition-colors disabled:opacity-50">
            {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Add tester'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────────────

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
      <span className={cn('text-white text-xs text-right max-w-[60%] truncate', mono && 'font-mono text-white-60')}>{value}</span>
    </div>
  );
}

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
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-sp-bg border border-white-10 text-white text-sm focus:outline-none">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
