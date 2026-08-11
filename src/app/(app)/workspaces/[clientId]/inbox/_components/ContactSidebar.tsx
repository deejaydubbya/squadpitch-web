'use client';

// Right pane — lead profile. Stacked cards: contact, lead source,
// form answers, submission history, actions. Read-only for MVP
// except where the underlying API supports the action — actions
// without an endpoint (e.g. "Mark qualified") render disabled.

import { useEffect, useState } from 'react';
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
  Archive,
  ShieldAlert,
  ExternalLink,
  X,
  Tag,
  Plus,
  Pencil,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  AtSign,
  MessageCircle,
} from 'lucide-react';
import {
  useUpdateConversation,
  useUpdateContact,
  type ContactStatus,
  type InboxConversationDetail,
  type InboxContact,
} from '@/hooks/useInbox';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';
import {
  contactHeadline,
  formatDate,
  humanizeKey,
  initialsFromContact,
  readExternalIds,
} from './inbox.helpers';

interface ContactSidebarProps {
  clientId: string;
  conversation: InboxConversationDetail;
  /** When provided, renders a sticky close button at the top of the
   *  pane — used when the sidebar is rendered inside a slide-over. */
  onClose?: () => void;
}

const STATUS_TONE: Record<string, string> = {
  NEW: 'text-accent-green-110 bg-accent-green-110/15',
  ENGAGED: 'text-blue-300 bg-blue-300/15',
  QUALIFIED: 'text-amber-300 bg-amber-300/15',
  CONVERTED: 'text-purple-300 bg-purple-300/15',
  ARCHIVED: 'text-white-40 bg-white-10',
};

const CONTACT_STATUSES: ContactStatus[] = [
  'NEW',
  'ENGAGED',
  'QUALIFIED',
  'CONVERTED',
  'ARCHIVED',
];

export function ContactSidebar({
  clientId,
  conversation,
  onClose,
}: ContactSidebarProps) {
  const contact = conversation.contact;
  const update = useUpdateConversation(clientId);
  const updateContact = useUpdateContact(clientId);

  const [contactError, setContactError] = useState<string | null>(null);
  const patchContact = (
    patch: Parameters<typeof updateContact.mutate>[0]['patch'],
  ) => {
    setContactError(null);
    updateContact.mutate(
      { contactId: contact.id, patch },
      {
        onError: (err) =>
          setContactError(err instanceof ApiError ? err.message : 'Update failed'),
      },
    );
  };

  const submissions = readSubmissions(contact.enrichmentJson);
  const latestSubmission = submissions[0] ?? null;
  const olderSubmissions = submissions.slice(1);

  return (
    <div className="flex h-full min-h-0 flex-col bg-sp-bg pt-[env(safe-area-inset-top,0px)]">
      {onClose && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white-10 bg-sp-bg">
          <h2 className="text-sm font-semibold text-white-100">Lead details</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white-50 hover:bg-white-10 hover:text-white-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-4">
        <ContactCard
          contact={contact}
          conversation={conversation}
          onPatch={patchContact}
          pending={updateContact.isPending}
        />
        {contactError && (
          <div className="card p-3 text-[11px] text-amber-200/90 bg-amber-400/5 border-amber-400/20">
            {contactError}
          </div>
        )}
        <StatusPickerCard
          contact={contact}
          onPatch={patchContact}
          pending={updateContact.isPending}
        />
        <TagsCard
          contact={contact}
          onPatch={patchContact}
          pending={updateContact.isPending}
        />
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

function ContactCard({
  contact,
  conversation,
  onPatch,
  pending,
}: {
  contact: InboxConversationDetail['contact'];
  conversation: InboxConversationDetail;
  onPatch: (patch: { name?: string | null; email?: string | null; phone?: string | null }) => void;
  pending: boolean;
}) {
  const initials = initialsFromContact(contact);
  const headline = contactHeadline(contact);
  const [editing, setEditing] = useState(false);

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
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-white-50 hover:bg-white-10 hover:text-white-100"
          title={editing ? 'Done editing' : 'Edit name, email, phone'}
        >
          {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
      </div>

      {editing ? (
        <IdentityEditor
          contact={contact}
          onPatch={onPatch}
          pending={pending}
          onClose={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="space-y-1.5 pt-1 border-t border-white-10">
            <p className="text-[10px] uppercase tracking-wider font-medium text-white-40">
              Contact methods
            </p>
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
              <p className="text-xs text-white-40">
                No email or phone on file yet.
              </p>
            )}
          </div>
          <SocialIdentitiesBlock contact={contact} conversation={conversation} />
        </>
      )}

      {/* Alternate identity values captured from later submissions.
          The intake never overwrites the primary email/phone (so a
          typo or shared phone doesn't break the contact identity),
          but the alternate is preserved here so workspace users can
          see it and reach out via the other address if needed. */}
      {!editing && <AlternatesBlock enrichmentJson={contact.enrichmentJson} />}
    </div>
  );
}

// Inline editor for the three identity fields. Pre-fills with the
// current values; submit fires a partial PATCH containing only the
// fields the user actually changed (so a no-op edit doesn't write
// an audit row).
function IdentityEditor({
  contact,
  onPatch,
  pending,
  onClose,
}: {
  contact: InboxContact;
  onPatch: (patch: { name?: string | null; email?: string | null; phone?: string | null }) => void;
  pending: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(contact.name ?? '');
  const [email, setEmail] = useState(contact.email ?? '');
  const [phone, setPhone] = useState(contact.phone ?? '');

  // If the underlying row changes while the editor is open (e.g.
  // another tab updated the contact), reset the form fields to the
  // new canonical values. Cheap optimistic-correctness guard.
  useEffect(() => {
    setName(contact.name ?? '');
    setEmail(contact.email ?? '');
    setPhone(contact.phone ?? '');
  }, [contact.id, contact.name, contact.email, contact.phone]);

  const handleSave = () => {
    const patch: { name?: string | null; email?: string | null; phone?: string | null } = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName !== (contact.name ?? '')) patch.name = trimmedName || null;
    if (trimmedEmail !== (contact.email ?? '')) patch.email = trimmedEmail || null;
    if (trimmedPhone !== (contact.phone ?? '')) patch.phone = trimmedPhone || null;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    onPatch(patch);
    onClose();
  };

  return (
    <div className="space-y-2 pt-1 border-t border-white-10">
      <IdentityField
        label="Name"
        value={name}
        onChange={setName}
        placeholder="Lead's name"
      />
      <IdentityField
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="name@example.com"
        type="email"
      />
      <IdentityField
        label="Phone"
        value={phone}
        onChange={setPhone}
        placeholder="+1 555 123 4567"
      />
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className={cn(
            'text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-accent-green-110 text-sp-bg hover:bg-accent-green-100',
            pending && 'opacity-50 cursor-not-allowed',
          )}
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-medium px-2.5 py-1.5 rounded-md text-white-60 hover:text-white-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function IdentityField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-white-50 mb-0.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white-5 border border-white-10 rounded-md px-2 py-1 text-xs text-white-100 placeholder:text-white-30 focus:outline-none focus:border-accent-green-110"
      />
    </label>
  );
}

function StatusPickerCard({
  contact,
  onPatch,
  pending,
}: {
  contact: InboxContact;
  onPatch: (patch: { status: ContactStatus }) => void;
  pending: boolean;
}) {
  return (
    <div className="card p-4 space-y-2.5">
      <h4 className="text-[10px] font-semibold text-white-40 uppercase tracking-wider">
        Lead status
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {CONTACT_STATUSES.map((s) => {
          const active = contact.status === s;
          return (
            <button
              key={s}
              type="button"
              disabled={pending || active}
              onClick={() => onPatch({ status: s })}
              className={cn(
                'text-[10px] font-medium px-2 py-1 rounded-md uppercase tracking-wider border transition-colors',
                active
                  ? (STATUS_TONE[s] ?? 'text-white-80 bg-white-10') +
                      ' border-current cursor-default'
                  : 'border-white-10 text-white-60 hover:text-white-100 hover:border-white-20',
                pending && !active && 'opacity-50 cursor-not-allowed',
              )}
            >
              {s.toLowerCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagsCard({
  contact,
  onPatch,
  pending,
}: {
  contact: InboxContact;
  onPatch: (patch: { tags: string[] }) => void;
  pending: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const next = draft.trim();
    if (!next) {
      setAdding(false);
      return;
    }
    // De-dupe case-insensitively but preserve the input casing.
    const lower = contact.tags.map((t) => t.toLowerCase());
    if (lower.includes(next.toLowerCase())) {
      setDraft('');
      setAdding(false);
      return;
    }
    onPatch({ tags: [...contact.tags, next] });
    setDraft('');
    setAdding(false);
  };

  const handleRemove = (tag: string) => {
    onPatch({ tags: contact.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="card p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold text-white-40 uppercase tracking-wider">
          Tags
        </h4>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[10px] font-medium text-white-50 hover:text-white-100 inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>

      {contact.tags.length === 0 && !adding && (
        <p className="text-[11px] text-white-40">No tags yet.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {contact.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-white-10 text-white-80 border border-white-10"
          >
            <Tag className="w-2.5 h-2.5 text-white-50" />
            {tag}
            <button
              type="button"
              onClick={() => handleRemove(tag)}
              disabled={pending}
              className="text-white-40 hover:text-white-100 ml-0.5"
              title={`Remove ${tag}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {adding && (
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              } else if (e.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
            placeholder="New tag…"
            maxLength={64}
            className="text-[10px] bg-white-5 border border-white-10 rounded-md px-2 py-1 text-white-100 placeholder:text-white-30 focus:outline-none focus:border-accent-green-110 w-28"
          />
        )}
      </div>
    </div>
  );
}

function AlternatesBlock({
  enrichmentJson,
}: {
  enrichmentJson: Record<string, unknown> | null;
}) {
  const alts = readAlternates(enrichmentJson);
  if (alts.emails.length === 0 && alts.phones.length === 0) return null;
  return (
    <div className="space-y-1.5 pt-1 border-t border-white-10">
      <p className="text-[10px] uppercase tracking-wider font-medium text-white-40">
        Also submitted with
      </p>
      {alts.emails.map((email) => (
        <ContactLink
          key={`alt-email-${email}`}
          icon={<Mail className="w-3.5 h-3.5" />}
          label={email}
          href={`mailto:${email}`}
          copyValue={email}
          muted
        />
      ))}
      {alts.phones.map((phone) => (
        <ContactLink
          key={`alt-phone-${phone}`}
          icon={<Phone className="w-3.5 h-3.5" />}
          label={phone}
          href={`tel:${phone}`}
          copyValue={phone}
          muted
        />
      ))}
    </div>
  );
}

function readAlternates(
  enrichmentJson: Record<string, unknown> | null,
): { emails: string[]; phones: string[] } {
  const empty = { emails: [], phones: [] };
  if (!enrichmentJson || typeof enrichmentJson !== 'object') return empty;
  const emails = Array.isArray(enrichmentJson.alternateEmails)
    ? enrichmentJson.alternateEmails.filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      )
    : [];
  const phones = Array.isArray(enrichmentJson.alternatePhones)
    ? enrichmentJson.alternatePhones.filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      )
    : [];
  return { emails, phones };
}

// Social identities — surfaces Contact.enrichmentJson.externalIds
// (FACEBOOK / INSTAGRAM / etc.) so a commenter without email/phone
// still has a visible "Source identity" row in the drawer.
// Includes an "Open on <Provider>" link when the current
// conversation carries a sourceUrl on its inbound messages.
//
// Public-comment identity is NOT a permission to DM — DM availability
// stays gated on the resolver (Pending Meta App Review reason).
const SOCIAL_PROVIDER_META: Record<string, {
  label: string;
  noun: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  FACEBOOK: { label: 'Facebook', noun: 'commenter', Icon: Facebook },
  INSTAGRAM: { label: 'Instagram', noun: 'commenter', Icon: Instagram },
  YOUTUBE: { label: 'YouTube', noun: 'commenter', Icon: Youtube },
  LINKEDIN: { label: 'LinkedIn', noun: 'commenter', Icon: Linkedin },
  THREADS: { label: 'Threads', noun: 'commenter', Icon: AtSign },
  X: { label: 'X', noun: 'commenter', Icon: MessageCircle },
  TIKTOK: { label: 'TikTok', noun: 'commenter', Icon: MessageCircle },
  PINTEREST: { label: 'Pinterest', noun: 'commenter', Icon: MessageCircle },
  GOOGLE_BUSINESS: { label: 'Google Business', noun: 'reviewer', Icon: MessageCircle },
};

function SocialIdentitiesBlock({
  contact,
  conversation,
}: {
  contact: InboxContact;
  conversation: InboxConversationDetail;
}) {
  const externalIds = readExternalIds(contact.enrichmentJson);
  if (externalIds.length === 0) return null;

  // The conversation's provider is the one we have a sourceUrl for
  // (the latest CONTACT message in the thread). For other providers
  // on the same contact (cross-channel reach), we render the identity
  // row without an "Open on" link — we don't have its sourceUrl
  // available in this component's data scope.
  const currentProviderSourceUrl =
    conversation.messages
      .filter((m) => m.party === 'CONTACT' && typeof m.sourceUrl === 'string' && m.sourceUrl)
      .pop()?.sourceUrl ?? null;

  return (
    <div className="space-y-1.5 pt-1 border-t border-white-10">
      <p className="text-[10px] uppercase tracking-wider font-medium text-white-40">
        Source identity
      </p>
      {externalIds.map(({ provider, id }) => {
        const meta = SOCIAL_PROVIDER_META[provider] ?? {
          label: provider,
          noun: 'contact',
          Icon: MessageCircle,
        };
        const isCurrentProvider = provider === conversation.provider;
        const openUrl = isCurrentProvider ? currentProviderSourceUrl : null;
        return (
          <div
            key={`${provider}:${id}`}
            className="flex items-center gap-2 text-xs text-white-70"
          >
            <span className="text-white-30 shrink-0">
              <meta.Icon className="w-3.5 h-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate">
              {meta.label} {meta.noun}
              {contact.name ? <> · <span className="text-white-90">{contact.name}</span></> : null}
            </span>
            {openUrl && (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] text-white-50 hover:text-accent-green-110 whitespace-nowrap"
                title={`Open on ${meta.label}`}
              >
                Open
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        );
      })}
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
                href={`/workspaces/${clientId}/sites/pages/${conversation.page.id}`}
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
        {/* Status updates moved to the dedicated "Lead status" card
            above (real Contact PATCH endpoint, all 5 statuses). */}
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
        'inline-flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors',
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
  muted = false,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  copyValue: string;
  /** Dimmer styling for alternate/secondary identity values. */
  muted?: boolean;
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
        className={cn(
          'text-xs truncate min-w-0 flex-1',
          muted
            ? 'text-white-50 hover:text-white-80'
            : 'text-white-80 hover:text-white-100',
        )}
      >
        {label}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy"
        aria-label={`Copy ${label}`}
        className="flex min-h-11 min-w-11 items-center justify-center rounded text-white-40 opacity-100 transition-opacity hover:text-white-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
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
