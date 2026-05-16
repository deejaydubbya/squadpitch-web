// Shared helpers for the Inbox UI. Each was duplicated across two or
// three components before — consolidated here so a tweak to the
// time format or source-label vocabulary only touches one file.

import type {
  ConversationSource,
  InboxContact,
  InboxConversationListRow,
} from '@/hooks/useInbox';

const RELATIVE_NOW = 'now';

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return RELATIVE_NOW;
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Two-letter initials from the best available identity field.
// Falls back to "?" if nothing is usable so the avatar circle still
// renders consistently.
export function initialsFromContact(
  contact: Pick<InboxContact, 'name' | 'email' | 'phone'>,
): string {
  if (contact.name) {
    const parts = contact.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  if (contact.email) return contact.email.slice(0, 2).toUpperCase();
  if (contact.phone) {
    const digits = contact.phone.replace(/\D+/g, '');
    if (digits.length >= 2) return digits.slice(-2);
  }
  return '?';
}

export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

// Source label vocabulary for badges. Prefer the campaign label
// when the conversation is tied to one — "Campaign" is more
// informative than "Form" in that case. Single source of truth so
// list rows and the detail strip never disagree.
export interface SourceBadge {
  label:
    | 'Form'
    | 'Campaign'
    | 'Site'
    | 'Email'
    | 'Facebook'
    | 'Instagram'
    | 'YouTube'
    | 'LinkedIn'
    | 'Social'
    | 'Google review';
  tone: 'form' | 'campaign' | 'site' | 'email' | 'social' | 'review';
}

const PROVIDER_SOCIAL_LABELS: Record<string, SourceBadge['label']> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  X: 'Social',
  TIKTOK: 'Social',
  THREADS: 'Social',
  PINTEREST: 'Social',
  WEB_CHAT: 'Social',
};

export function sourceBadge(
  conv: Pick<InboxConversationListRow, 'sourceType' | 'campaignId' | 'pageId' | 'provider'>,
): SourceBadge {
  // Google Business Profile reviews get their own label so the
  // workspace user can spot them at a glance. Reviews are a
  // distinct triage pattern from a chat/comment.
  if (conv.provider === 'GOOGLE_BUSINESS') {
    return { label: 'Google review', tone: 'review' };
  }

  // Social-network sourced conversations get a per-provider label
  // (Facebook / Instagram / generic Social) BEFORE the campaign/form
  // checks — a FB comment conversation may carry a campaignId for
  // future analytics, but the user reads "Facebook" first.
  const socialLabel = conv.provider && PROVIDER_SOCIAL_LABELS[conv.provider];
  if (socialLabel) return { label: socialLabel, tone: 'social' };

  // EMAIL-provider conversations (the Postmark inbound webhook
  // creates these when there's no prior thread to attach to).
  if (conv.provider === 'EMAIL') {
    return { label: 'Email', tone: 'email' };
  }

  if (conv.campaignId) return { label: 'Campaign', tone: 'campaign' };
  if (conv.sourceType === ('FORM' as ConversationSource) && conv.pageId) {
    return { label: 'Form', tone: 'form' };
  }
  return { label: 'Site', tone: 'site' };
}

// Picks a short display name for a contact across all the places
// the inbox needs one (list rows, header, sidebar).
export function contactHeadline(
  contact: Pick<InboxContact, 'name' | 'email' | 'phone'>,
): string {
  return contact.name || contact.email || contact.phone || 'Unknown lead';
}

// Social identities — surfaces Contact.enrichmentJson.externalIds
// for the Lead Details drawer. Meta commenters (and other social
// sources) have no email/phone, only a provider user id. This
// helper turns the JSON shape into a flat array the UI can map
// over. Whitelisted to string values so a malformed enrichment
// shape can't render junk.
//
// Shape stored by the ingestion services:
//   enrichmentJson: { externalIds: { FACEBOOK: "<user_id>", ... }, ... }
export function readExternalIds(
  enrichmentJson: Record<string, unknown> | null,
): Array<{ provider: string; id: string }> {
  if (!enrichmentJson || typeof enrichmentJson !== 'object') return [];
  const raw = (enrichmentJson as { externalIds?: unknown }).externalIds;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string' && v.length > 0)
    .map(([provider, id]) => ({ provider, id: id as string }));
}
