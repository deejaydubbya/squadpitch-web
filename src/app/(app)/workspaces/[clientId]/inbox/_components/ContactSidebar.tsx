'use client';

// Right pane — lead profile. Stacked cards: contact, lead source,
// form answers, submission history, actions. Read-only for MVP
// except where the underlying API supports the action — actions
// without an endpoint (e.g. "Mark qualified") render disabled.

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  User,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Globe,
  Target,
  Calendar,
  Award,
  Archive,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import {
  useUpdateConversation,
  type InboxConversationDetail,
} from '@/hooks/useInbox';
import { cn } from '@/lib/utils';
import {
  contactHeadline,
  formatDate,
  humanizeKey,
  initialsFromContact,
} from './inbox.helpers';

interface ContactSidebarProps {
  clientId: string;
  conversation: InboxConversationDetail;
}

const STATUS_TONE: Record<string, string> = {
  NEW: 'text-accent-green-110 bg-accent-green-110/15',
  ENGAGED: 'text-blue-300 bg-blue-300/15',
  CUSTOMER: 'text-purple-300 bg-purple-300/15',
  LOST: 'text-white-40 bg-white-10',
  ARCHIVED: 'text-white-40 bg-white-10',
};

export function ContactSidebar({ clientId, conversation }: ContactSidebarProps) {
  const contact = conversation.contact;
  const update = useUpdateConversation(clientId);

  const submissions = readSubmissions(contact.enrichmentJson);
  const latestSubmission = submissions[0] ?? null;
  const olderSubmissions = submissions.slice(1);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-sp-bg">
      <div className="p-4 space-y-3">
        <ContactCard contact={contact} />
        <SourceCard conversation={conversation} clientId={clientId} />
        {latestSubmission && <FormAnswersCard submission={latestSubmission} />}
        {olderSubmissions.length > 0 && (
          <SubmissionHistoryCard submissions={olderSubmissions} />
        )}
        <ActionsCard
          conversation={conversation}
          pending={update.isPending}
          onArchive={() =>
            update.mutate({
              conversationId: conversation.id,
              patch: { status: 'CLOSED' },
            })
          }
          onSpam={() =>
            update.mutate({
              conversationId: conversation.id,
              patch: { spam: !conversation.spam },
            })
          }
        />
      </div>
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────

function ContactCard({ contact }: { contact: InboxConversationDetail['contact'] }) {
  const initials = initialsFromContact(contact);
  const headline = contactHeadline(contact);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-accent-green-110/15 text-accent-green-110 flex items-center justify-center text-sm font-bold uppercase tracking-wider shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white-100 truncate">
            {headline}
          </h3>
          <span
            className={cn(
              'inline-block text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider mt-1',
              STATUS_TONE[contact.status] ?? 'text-white-40 bg-white-10',
            )}
          >
            {contact.status.toLowerCase()}
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-1 border-t border-white-10">
        {contact.email && (
          <ContactLink
            icon={<Mail className="w-3.5 h-3.5" />}
            label={contact.email}
            href={`mailto:${contact.email}`}
            copyValue={contact.email}
          />
        )}
        {contact.phone && (
          <ContactLink
            icon={<Phone className="w-3.5 h-3.5" />}
            label={contact.phone}
            href={`tel:${contact.phone}`}
            copyValue={contact.phone}
          />
        )}
        {!contact.email && !contact.phone && (
          <p className="text-xs text-white-40">No contact channels on file.</p>
        )}
      </div>
    </div>
  );
}

function SourceCard({
  conversation,
  clientId,
}: {
  conversation: InboxConversationDetail;
  clientId: string;
}) {
  return (
    <div className="card p-4 space-y-2.5">
      <h4 className="text-[10px] font-semibold text-white-40 uppercase tracking-wider">
        Lead source
      </h4>
      <dl className="space-y-2 text-xs">
        <SourceRow
          icon={<User className="w-3 h-3" />}
          label="Source"
          value={
            <span className="text-white-90 font-medium capitalize">
              {conversation.sourceType.toLowerCase()}
            </span>
          }
        />
        {conversation.page && (
          <SourceRow
            icon={<Globe className="w-3 h-3" />}
            label="Page"
            value={
              <Link
                href={`/workspaces/${clientId}/sites?page=${conversation.page.id}`}
                className="text-white-90 hover:text-accent-green-110 font-medium inline-flex items-center gap-1 group"
              >
                {conversation.page.title}
                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
              </Link>
            }
          />
        )}
        {conversation.campaign && (
          <SourceRow
            icon={<Target className="w-3 h-3" />}
            label="Campaign"
            value={
              <span className="text-white-90 font-medium">
                {conversation.campaign.name}
              </span>
            }
          />
        )}
        <SourceRow
          icon={<Calendar className="w-3 h-3" />}
          label="First seen"
          value={
            <span className="text-white-80">
              {formatDate(conversation.contact.createdAt)}
            </span>
          }
        />
      </dl>
    </div>
  );
}

function SourceRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white-30 shrink-0">{icon}</span>
      <dt className="text-white-50 w-16 shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 truncate">{value}</dd>
    </div>
  );
}

function FormAnswersCard({ submission }: { submission: SubmissionEntry }) {
  if (!submission.data) return null;
  const entries = Object.entries(submission.data).filter(
    ([, v]) => typeof v === 'string' && v.trim().length > 0,
  );
  if (entries.length === 0) return null;

  return (
    <div className="card p-4 space-y-2.5">
      <h4 className="text-[10px] font-semibold text-white-40 uppercase tracking-wider">
        Form answers
      </h4>
      <dl className="space-y-2 text-xs">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-white-50 text-[10px] uppercase tracking-wider">
              {humanizeKey(k)}
            </dt>
            <dd className="text-white-90 break-words mt-0.5">{String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SubmissionHistoryCard({
  submissions,
}: {
  submissions: SubmissionEntry[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <h4 className="text-[10px] font-semibold text-white-40 uppercase tracking-wider">
          Previous submissions ({submissions.length})
        </h4>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-white-40" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-white-40" />
        )}
      </button>
      {open && (
        <ul className="space-y-2 pt-1">
          {submissions.map((s, idx) => (
            <li
              key={idx}
              className="text-xs border border-white-10 rounded-lg p-2 space-y-1"
            >
              <div className="text-[10px] text-white-40 uppercase tracking-wider">
                {formatDate(s.at)}
              </div>
              {s.data &&
                Object.entries(s.data)
                  .filter(([, v]) => typeof v === 'string' && v.trim())
                  .slice(0, 3)
                  .map(([k, v]) => (
                    <div key={k} className="text-white-70">
                      <span className="text-white-40">{humanizeKey(k)}:</span>{' '}
                      {String(v)}
                    </div>
                  ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionsCard({
  conversation,
  pending,
  onArchive,
  onSpam,
}: {
  conversation: InboxConversationDetail;
  pending: boolean;
  onArchive: () => void;
  onSpam: () => void;
}) {
  return (
    <div className="card p-4 space-y-2">
      <h4 className="text-[10px] font-semibold text-white-40 uppercase tracking-wider">
        Actions
      </h4>
      <div className="space-y-1.5">
        {/* "Mark qualified" has no Contact PATCH endpoint yet —
            rendered disabled so the slot is visible but doesn't
            mislead. Wire when the route lands. */}
        <ActionButton
          icon={<Award className="w-3.5 h-3.5" />}
          label="Mark qualified"
          onClick={() => {}}
          disabled
          title="Contact status updates aren't wired yet."
        />
        <ActionButton
          icon={<Archive className="w-3.5 h-3.5" />}
          label={conversation.status === 'CLOSED' ? 'Reopen' : 'Archive'}
          onClick={onArchive}
          disabled={pending}
        />
        <ActionButton
          icon={<ShieldAlert className="w-3.5 h-3.5" />}
          label={conversation.spam ? 'Unmark spam' : 'Mark spam'}
          onClick={onSpam}
          disabled={pending}
          tone={conversation.spam ? 'warn' : 'default'}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  tone = 'default',
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'warn';
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-full text-xs font-medium px-2.5 py-2 rounded-lg border transition-colors inline-flex items-center gap-2 text-left',
        tone === 'warn'
          ? 'bg-amber-400/10 border-amber-400/20 text-amber-200 hover:bg-amber-400/20'
          : 'border-white-10 text-white-80 hover:border-white-20 hover:bg-white-5',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
      )}
    >
      <span className="text-white-50">{icon}</span>
      {label}
    </button>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────

function ContactLink({
  icon,
  label,
  href,
  copyValue,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  copyValue: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked — silently noop.
    }
  };
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-white-30 shrink-0">{icon}</span>
      <a
        href={href}
        className="text-xs text-white-80 hover:text-white-100 truncate min-w-0 flex-1"
      >
        {label}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy"
        className="p-1 rounded text-white-40 hover:text-white-100 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

interface SubmissionEntry {
  at: string;
  data: Record<string, unknown> | null;
}

function readSubmissions(
  enrichment: Record<string, unknown> | null,
): SubmissionEntry[] {
  if (!enrichment || typeof enrichment !== 'object') return [];
  const raw = (enrichment as { submissions?: unknown }).submissions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is { at?: string; data?: Record<string, unknown> } =>
        !!s && typeof s === 'object',
    )
    .map((s) => ({
      at: typeof s.at === 'string' ? s.at : '',
      data:
        s.data && typeof s.data === 'object'
          ? (s.data as Record<string, unknown>)
          : null,
    }))
    .reverse();
}
