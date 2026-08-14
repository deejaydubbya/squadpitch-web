'use client';

import { useState } from 'react';
import {
  Search, ArrowLeft, Plus, AlertTriangle, MessageSquare,
  CheckCircle2, Clock, ExternalLink, Image,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useBetaFeedbackList, useCreateFeedback, useUpdateFeedback,
} from '@/hooks/useAdmin';
import type { BetaFeedbackItem } from '@/hooks/useAdmin';

const STATUS_OPTIONS = ['', 'new', 'reviewing', 'planned', 'resolved', 'closed'];
const TYPE_OPTIONS = ['', 'bug', 'feature_request', 'ux_issue', 'general'];
const SEVERITY_OPTIONS = ['', 'urgent', 'high', 'normal', 'low'];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-accent-blue/20 text-accent-blue',
  reviewing: 'bg-yellow-500/20 text-yellow-400',
  planned: 'bg-accent-green-110/20 text-accent-green-110',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-white-10 text-white-40',
};

const SEVERITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/20 text-accent-red',
  high: 'bg-orange-500/20 text-accent-orange',
  normal: 'bg-white-10 text-white-60',
  low: 'bg-white-10 text-white-30',
};

const TYPE_COLORS: Record<string, string> = {
  bug: 'text-accent-red',
  feature_request: 'text-accent-blue',
  ux_issue: 'text-accent-orange',
  praise: 'text-green-400',
  question: 'text-white-60',
  general: 'text-white-40',
};

export default function FeedbackPage() {
  const { isAdmin } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [selectedFb, setSelectedFb] = useState<BetaFeedbackItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useBetaFeedbackList({
    search,
    status: statusFilter,
    type: typeFilter,
    severity: severityFilter,
    needsFollowUp: followUpOnly ? 'true' : '',
    limit: '50',
  });

  const items = data?.items || [];

  if (showCreate) return <FeedbackForm onBack={() => setShowCreate(false)} />;
  if (selectedFb) return <FeedbackDetailView fb={selectedFb} isAdmin={isAdmin} onBack={() => setSelectedFb(null)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/beta-ops" className="p-2 rounded-lg hover:bg-white-5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white-40" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Feedback Inbox</h1>
            <p className="text-white-40 text-sm">Review, triage, and follow up on tester feedback.</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-sm font-medium hover:bg-accent-green-110/25 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Submit feedback
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
          <input type="text" placeholder="Search by title or content..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All statuses'}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
          {TYPE_OPTIONS.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All types'}</option>)}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none">
          {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All priorities'}</option>)}
        </select>
        <button
          onClick={() => setFollowUpOnly(!followUpOnly)}
          className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors border', followUpOnly ? 'bg-accent-orange/15 border-accent-orange/30 text-accent-orange' : 'bg-sp-surface border-white-10 text-white-40 hover:bg-white-5')}
        >
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
          Follow-up
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" /></div>
      ) : !items.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No feedback found.</div>
      ) : (
        <div className="space-y-2">
          {items.map((fb) => (
            <div key={fb.id} onClick={() => setSelectedFb(fb)}
              className={cn(
                'rounded-lg border bg-sp-surface p-4 cursor-pointer hover:bg-white-5 transition-colors',
                fb.needsFollowUp ? 'border-accent-orange/30' : fb.severity === 'critical' ? 'border-accent-red/30' : 'border-white-10',
              )}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[fb.status])}>{fb.status.replace('_', ' ')}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', SEVERITY_COLORS[fb.severity])}>{fb.severity}</span>
                    <span className={cn('text-[10px] font-medium', TYPE_COLORS[fb.type])}>{fb.type.replace('_', ' ')}</span>
                    {fb.needsFollowUp && <AlertTriangle className="w-3 h-3 text-accent-orange" />}
                  </div>
                  <p className="text-white text-sm font-medium">{fb.title}</p>
                  <p className="text-white-40 text-xs mt-0.5 line-clamp-1">{fb.body}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white-30">
                    <span>{fb.submitterEmail || fb.tester?.email || fb.userId}</span>
                    {fb.workspaceName && <span>{fb.workspaceName}</span>}
                    {fb.tester?.cohort && <span className="text-accent-blue">{fb.tester.cohort}</span>}
                    {fb.route && <span>{fb.route}</span>}
                    <span>{new Date(fb.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {fb.screenshotUrl && <Image className="w-4 h-4 text-white-20 flex-shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Feedback Detail ──────────────────────────────────────────────────────

function FeedbackDetailView({ fb, isAdmin, onBack }: { fb: BetaFeedbackItem; isAdmin: boolean; onBack: () => void }) {
  const updateMutation = useUpdateFeedback(fb.id);

  const handleStatusChange = (status: string) => {
    updateMutation.mutate({ status });
  };

  const handleToggleFollowUp = () => {
    updateMutation.mutate({ needsFollowUp: !fb.needsFollowUp });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white-5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white-40" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{fb.title}</h1>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[fb.status])}>{fb.status.replace('_', ' ')}</span>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', SEVERITY_COLORS[fb.severity])}>{fb.severity}</span>
          </div>
          <p className="text-white-30 text-xs font-mono mt-0.5">{fb.id}</p>
        </div>
      </div>

      {/* Quick actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <button key={s} onClick={() => handleStatusChange(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                fb.status === s ? 'border-accent-green-110/30 bg-accent-green-110/15 text-accent-green-110' : 'border-white-10 text-white-40 hover:bg-white-5')}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
          {SEVERITY_OPTIONS.filter(Boolean).map((priority) => (
            <button key={priority} onClick={() => updateMutation.mutate({ priority })}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border', fb.severity === priority ? 'border-accent-blue/30 bg-accent-blue/15 text-accent-blue' : 'border-white-10 text-white-40 hover:bg-white-5')}>
              {priority} priority
            </button>
          ))}
          <button onClick={handleToggleFollowUp}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              fb.needsFollowUp ? 'border-accent-orange/30 bg-accent-orange/15 text-accent-orange' : 'border-white-10 text-white-40 hover:bg-white-5')}
          >
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {fb.needsFollowUp ? 'Needs follow-up' : 'Mark follow-up'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content */}
        <div className="rounded-xl border border-white-10 bg-sp-surface p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-3">Feedback</h2>
          <p className="text-white text-sm whitespace-pre-wrap">{fb.body}</p>
          {fb.screenshotUrl && (
            <div className="mt-3">
              <a href={fb.screenshotUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent-blue text-xs hover:underline">
                <ExternalLink className="w-3 h-3" /> View screenshot
              </a>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="rounded-xl border border-white-10 bg-sp-surface p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Details</h2>
          <InfoRow label="Type" value={fb.type.replace('_', ' ')} />
          <InfoRow label="Priority" value={fb.severity} />
          <InfoRow label="Route / Page" value={fb.route || '—'} />
          <InfoRow label="User ID" value={fb.userId} mono />
          <InfoRow label="Workspace ID" value={fb.workspaceId || '—'} mono />
          <InfoRow label="Workspace" value={fb.workspaceName || '—'} />
          <InfoRow label="Submitter" value={fb.submitterName || fb.submitterEmail || '—'} />
          <InfoRow label="Device" value={fb.deviceClass || '—'} />
          <InfoRow label="Release" value={fb.releaseVersion || '—'} />
          {fb.relatedEntityType && (
            <>
              <InfoRow label="Related Entity" value={fb.relatedEntityType} />
              <InfoRow label="Related ID" value={fb.relatedEntityId || '—'} mono />
            </>
          )}
          <InfoRow label="Created" value={new Date(fb.createdAt).toLocaleString()} />
          {fb.resolvedAt && <InfoRow label="Resolved" value={new Date(fb.resolvedAt).toLocaleString()} />}
          {fb.assignee && <InfoRow label="Assignee" value={fb.assignee} />}
        </div>

        {/* Tester */}
        <div className="rounded-xl border border-white-10 bg-sp-surface p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Tester</h2>
          {fb.tester ? (
            <>
              <InfoRow label="Email" value={fb.tester.email} />
              <InfoRow label="Name" value={fb.tester.name || '—'} />
              <InfoRow label="Cohort" value={fb.tester.cohort || '—'} />
              <InfoRow label="Priority" value={fb.tester.priority} />
              {fb.tester.tags && fb.tester.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {fb.tester.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-white-5 text-white-40 text-[10px]">{t}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-white-30 text-sm">Not linked to a registered tester</p>
          )}
        </div>

        {/* Internal notes */}
        {isAdmin && (
          <div className="rounded-xl border border-white-10 bg-sp-surface p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-white mb-3">Internal Notes</h2>
            <InternalNotesEditor feedbackId={fb.id} initialNotes={fb.internalNotes || ''} />
          </div>
        )}
      </div>
    </div>
  );
}

function InternalNotesEditor({ feedbackId, initialNotes }: { feedbackId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const updateMutation = useUpdateFeedback(feedbackId);

  const handleSave = () => {
    updateMutation.mutate({ adminNote: notes || null });
  };

  return (
    <div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes about this feedback..."
        className="w-full px-3 py-2 rounded-lg bg-sp-bg border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50 resize-none h-24" />
      <button onClick={handleSave} disabled={updateMutation.isPending}
        className="mt-2 px-3 py-1.5 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-xs font-medium hover:bg-accent-green-110/25 transition-colors disabled:opacity-50">
        {updateMutation.isPending ? 'Saving...' : 'Save notes'}
      </button>
    </div>
  );
}

// ── Create Feedback Form ─────────────────────────────────────────────────

function FeedbackForm({ onBack }: { onBack: () => void }) {
  const createMutation = useCreateFeedback();
  const [form, setForm] = useState({
    title: '', body: '', type: 'general', severity: 'medium', userId: '', workspaceId: '', route: '',
  });
  const update = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      workspaceId: form.workspaceId || null,
      route: form.route || null,
    }, { onSuccess: onBack });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white-5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white-40" />
        </button>
        <h1 className="text-2xl font-bold text-white">Submit Feedback</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white-10 bg-sp-surface p-5">
        <Field label="Title" value={form.title} onChange={(v) => update('title', v)} required />
        <Field label="Description" value={form.body} onChange={(v) => update('body', v)} required textarea />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Type" value={form.type} onChange={(v) => update('type', v)} options={['bug', 'feature_request', 'ux_issue', 'general', 'praise', 'question']} />
          <SelectField label="Severity" value={form.severity} onChange={(v) => update('severity', v)} options={['critical', 'high', 'medium', 'low']} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="User ID" value={form.userId} onChange={(v) => update('userId', v)} placeholder="auth0Sub of reporter" required />
          <Field label="Workspace ID" value={form.workspaceId} onChange={(v) => update('workspaceId', v)} placeholder="Optional" />
        </div>
        <Field label="Route / Page" value={form.route} onChange={(v) => update('route', v)} placeholder="e.g. /workspaces/abc/compose" />

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-lg text-white-40 text-sm hover:bg-white-5 transition-colors">Cancel</button>
          <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 rounded-lg bg-accent-green-110/15 text-accent-green-110 text-sm font-medium hover:bg-accent-green-110/25 transition-colors disabled:opacity-50">
            {createMutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white-5 last:border-0">
      <span className="text-white-40 text-xs">{label}</span>
      <span className={cn('text-white text-xs text-right max-w-[60%] truncate', mono && 'font-mono text-white-60')}>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', required, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; textarea?: boolean;
}) {
  const cls = "w-full px-3 py-2 rounded-lg bg-sp-bg border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50";
  return (
    <div>
      <label className="block text-white-40 text-xs font-medium mb-1">{label}</label>
      {textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={cn(cls, 'resize-none h-24')} />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={cls} />}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-white-40 text-xs font-medium mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-sp-bg border border-white-10 text-white text-sm focus:outline-none">
        {options.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
      </select>
    </div>
  );
}
