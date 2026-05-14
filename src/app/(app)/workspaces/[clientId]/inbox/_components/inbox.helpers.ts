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
  label: 'Form' | 'Campaign' | 'Site';
  tone: 'form' | 'campaign' | 'site';
}

export function sourceBadge(
  conv: Pick<InboxConversationListRow, 'sourceType' | 'campaignId' | 'pageId'>,
): SourceBadge {
  if (conv.campaignId) return { label: 'Campaign', tone: 'campaign' };
  if (conv.sourceType === 'FORM' as ConversationSource && conv.pageId) {
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
