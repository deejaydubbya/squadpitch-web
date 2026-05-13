'use client';

// SubmissionsPanel — read-only(ish) inbox for FormSubmission rows.
// Workspace owners can browse incoming leads, view the raw answers
// in a detail drawer, and flip status between NEW / RESOLVED / SPAM
// so a "real inbox" feel exists before the dedicated Inbox module
// ships in a later phase.

import { useState } from 'react';
import {
  Inbox as InboxIcon,
  Mail,
  Phone,
  X,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import {
  useSubmissions,
  useUpdateSubmissionStatus,
  type FormSubmission,
  type SubmissionStatus,
} from '@/hooks/useSites';
import { cn } from '@/lib/utils';

interface SubmissionsPanelProps {
  clientId: string;
}

const STATUS_FILTERS: { value: SubmissionStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'SPAM', label: 'Spam' },
];

export function SubmissionsPanel({ clientId }: SubmissionsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'ALL'>('NEW');
  const { data, isLoading } = useSubmissions(clientId, {
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 100,
  });
  const [selected, setSelected] = useState<FormSubmission | null>(null);

  const submissions = data?.submissions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
              statusFilter === f.value
                ? 'bg-accent-green-110/15 text-accent-green-110'
                : 'text-white-50 hover:text-white-100 hover:bg-white-10',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="card p-6 text-sm text-white-50">Loading submissions…</div>}

      {!isLoading && submissions.length === 0 && (
        <div className="card p-8 text-center space-y-2">
          <InboxIcon className="w-8 h-8 text-white-30 mx-auto" />
          <p className="text-sm font-medium text-white-80">
            {statusFilter === 'NEW' ? 'No new submissions' : 'No submissions yet'}
          </p>
          <p className="text-xs text-white-50">
            Leads captured from your pages will land here.
          </p>
        </div>
      )}

      {!isLoading && submissions.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white-5 border-b border-white-10">
              <tr>
                <th className="text-left text-xs font-medium text-white-50 uppercase tracking-wider px-4 py-3">
                  Contact
                </th>
                <th className="text-left text-xs font-medium text-white-50 uppercase tracking-wider px-4 py-3">
                  Form
                </th>
                <th className="text-left text-xs font-medium text-white-50 uppercase tracking-wider px-4 py-3">
                  Received
                </th>
                <th className="text-left text-xs font-medium text-white-50 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="border-b border-white-10 last:border-b-0 hover:bg-white-5 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.contactEmail ? (
                        <Mail className="w-3.5 h-3.5 text-white-30 shrink-0" />
                      ) : s.contactPhone ? (
                        <Phone className="w-3.5 h-3.5 text-white-30 shrink-0" />
                      ) : (
                        <InboxIcon className="w-3.5 h-3.5 text-white-30 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-white-90 truncate">
                          {s.contactEmail || s.contactPhone || 'No contact info'}
                        </div>
                        <PreviewLine data={s.dataJson} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white-70">{s.form?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-white-50">
                    {formatDateTime(s.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <SubmissionDetail
          clientId={clientId}
          submission={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PreviewLine({ data }: { data: Record<string, unknown> }) {
  const message = typeof data?.message === 'string' ? data.message : null;
  if (!message) return null;
  return (
    <div className="text-xs text-white-40 truncate mt-0.5 max-w-md">{message}</div>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === 'RESOLVED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-accent-green-110">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Resolved
      </span>
    );
  }
  if (status === 'SPAM') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-white-40">
        <ShieldAlert className="w-3.5 h-3.5" />
        Spam
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-accent-green-110 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-accent-green-110" />
      New
    </span>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Detail drawer ──────────────────────────────────────────────────────

interface DetailProps {
  clientId: string;
  submission: FormSubmission;
  onClose: () => void;
}

function SubmissionDetail({ clientId, submission, onClose }: DetailProps) {
  const updateStatus = useUpdateSubmissionStatus(clientId);
  const data = submission.dataJson as Record<string, unknown>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-md bg-sp-bg border-l border-white-15 overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white-10">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white-90 truncate">
              {submission.contactEmail || submission.contactPhone || 'Submission'}
            </h3>
            <p className="text-xs text-white-50 mt-0.5">
              {submission.form?.name} · {formatDateTime(submission.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white-50 hover:text-white-100 hover:bg-white-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-white-50 uppercase tracking-wider">
              Answers
            </h4>
            <div className="card p-3 space-y-2">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <div className="text-xs font-mono text-white-40">{key}</div>
                  <div className="text-white-80 break-words">{String(value)}</div>
                </div>
              ))}
              {Object.keys(data).length === 0 && (
                <p className="text-xs text-white-40">No field data</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-white-50 uppercase tracking-wider">
              Status
            </h4>
            <div className="flex flex-wrap gap-2">
              {(['NEW', 'RESOLVED', 'SPAM'] as SubmissionStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    updateStatus.mutate({ id: submission.id, status: s })
                  }
                  disabled={updateStatus.isPending || submission.status === s}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                    submission.status === s
                      ? 'bg-accent-green-110/15 text-accent-green-110 cursor-default'
                      : 'border border-white-15 text-white-70 hover:text-white-100 hover:bg-white-10',
                  )}
                >
                  {s === 'NEW' ? 'Mark new' : s === 'RESOLVED' ? 'Resolved' : 'Spam'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
