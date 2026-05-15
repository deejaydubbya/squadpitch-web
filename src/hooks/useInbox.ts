'use client';

// SquadInbox React Query hooks.
//
// Mirrors the surface of squadpitch-api/domains/inbox/inbox.routes.js.
// One file because the module is small and every screen pulls from
// the same handful of endpoints — keeps the wiring legible.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Types ────────────────────────────────────────────────────────────────
//
// Names match the Prisma enums in schema.prisma. Keeping the strings
// in sync is a manual contract — the schemas in inbox.schemas.js are
// the source of truth on the API side.

export type ConversationStatus = 'OPEN' | 'PENDING' | 'CLOSED' | 'SNOOZED';
export type ConversationParty = 'CONTACT' | 'WORKSPACE' | 'SYSTEM';
export type ConversationSource = 'FORM' | 'EMAIL' | 'SOCIAL' | 'MANUAL';
export type ContactStatus = 'NEW' | 'ENGAGED' | 'CUSTOMER' | 'LOST' | 'ARCHIVED';
export type ContactSourceType = 'FORM' | 'IMPORT' | 'MANUAL';
export type MessageChannel =
  | 'FORM_SUBMISSION'
  | 'EMAIL'
  | 'SMS'
  | 'SOCIAL_DM'
  | 'MANUAL_LOG';
export type MessageDeliveryStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED';
export type ReplyTone = 'professional' | 'friendly' | 'concise';

export interface ReplyCapability {
  available: boolean;
  reason: string | null;
}

export interface ReplyCapabilities {
  email: ReplyCapability;
  logExternal: ReplyCapability;
  note: ReplyCapability;
}

export interface InboxContact {
  id: string;
  clientId: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  firstSeenVia: ContactSourceType;
  firstSeenFormId: string | null;
  firstSeenPageId: string | null;
  firstSeenCampaignId: string | null;
  enrichmentJson: Record<string, unknown> | null;
  tags: string[];
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InboxMessage {
  id: string;
  conversationId: string;
  party: ConversationParty;
  channel: MessageChannel | null;
  body: string;
  payloadJson: Record<string, unknown> | null;
  externalMessageId: string | null;
  authorUserId: string | null;
  fromSuggestionId: string | null;
  // Outbound delivery lifecycle. Null for legacy thread events
  // (FORM_SUBMISSION, MANUAL_LOG) that didn't go through a provider.
  deliveryStatus: MessageDeliveryStatus | null;
  providerMessageId: string | null;
  errorReason: string | null;
  lastAttemptedAt: string | null;
  createdAt: string;
}

export interface InboxNote {
  id: string;
  conversationId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

export interface InboxAiSuggestion {
  id: string;
  conversationId: string;
  forMessageId: string;
  body: string;
  tone: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  acceptedAt: string | null;
  createdAt: string;
}

export interface InboxConversationListRow {
  id: string;
  clientId: string;
  contactId: string;
  sourceType: ConversationSource;
  sourceFormSubmissionId: string | null;
  pageId: string | null;
  campaignId: string | null;
  status: ConversationStatus;
  spam: boolean;
  lastMessageAt: string;
  lastMessageFrom: ConversationParty;
  workspaceReadAt: string | null;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
  unread: boolean;
  contact: Pick<InboxContact, 'id' | 'email' | 'phone' | 'name' | 'status'>;
  messages: Pick<InboxMessage, 'id' | 'body' | 'party' | 'createdAt'>[];
}

// Lean shapes returned by getConversation — whitelisted on the
// server side; never expose blocksJson/themeJson here.
export interface InboxPageSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export interface InboxCampaignSummary {
  id: string;
  name: string;
  campaignType: string;
  status: string;
}

export interface InboxConversationDetail extends InboxConversationListRow {
  contact: InboxContact;
  messages: InboxMessage[];
  notes: InboxNote[];
  aiReplies: InboxAiSuggestion[];
  page: InboxPageSummary | null;
  campaign: InboxCampaignSummary | null;
  replyCapabilities: ReplyCapabilities;
}

export interface InboxStats {
  unreadCount: number;
  openCount: number;
  spamCount: number;
  totalCount: number;
}

// ── Query keys ───────────────────────────────────────────────────────────

export const inboxKeys = {
  all: ['inbox'] as const,
  conversations: (clientId: string, filters?: Record<string, unknown>) =>
    [...inboxKeys.all, 'conversations', clientId, filters ?? {}] as const,
  conversation: (clientId: string, conversationId: string) =>
    [...inboxKeys.all, 'conversation', clientId, conversationId] as const,
  stats: (clientId: string) => [...inboxKeys.all, 'stats', clientId] as const,
};

const base = (clientId: string) => `workspaces/${clientId}/inbox`;

// ── List ─────────────────────────────────────────────────────────────────

export interface ConversationFilters {
  status?: ConversationStatus;
  spam?: boolean;
  search?: string;
  limit?: number;
  cursor?: string;
}

export function useInboxConversations(
  clientId: string | undefined,
  filters: ConversationFilters = {},
) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.spam !== undefined) params.set('spam', filters.spam ? 'true' : 'false');
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);
  const qs = params.toString();
  const path = `${base(clientId ?? '')}/conversations${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: inboxKeys.conversations(clientId ?? '', filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ conversations: InboxConversationListRow[]; nextCursor: string | null }>(path),
    enabled: Boolean(clientId),
  });
}

// ── Detail ───────────────────────────────────────────────────────────────

export function useInboxConversation(
  clientId: string | undefined,
  conversationId: string | undefined,
) {
  return useQuery({
    queryKey: inboxKeys.conversation(clientId ?? '', conversationId ?? ''),
    queryFn: () =>
      apiFetch<{ conversation: InboxConversationDetail }>(
        `${base(clientId!)}/conversations/${conversationId}`,
      ),
    enabled: Boolean(clientId && conversationId),
    select: (data) => data.conversation,
  });
}

// ── Patch ────────────────────────────────────────────────────────────────

export interface ConversationPatch {
  status?: ConversationStatus;
  spam?: boolean;
  assignedUserId?: string | null;
  markRead?: boolean;
}

export function useUpdateConversation(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      patch,
    }: {
      conversationId: string;
      patch: ConversationPatch;
    }) =>
      apiFetch<{ conversation: InboxConversationListRow }>(
        `${base(clientId)}/conversations/${conversationId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [...inboxKeys.all, 'conversations', clientId] });
      qc.invalidateQueries({
        queryKey: inboxKeys.conversation(clientId, vars.conversationId),
      });
      qc.invalidateQueries({ queryKey: inboxKeys.stats(clientId) });
    },
  });
}

// ── Notes ────────────────────────────────────────────────────────────────

export function useCreateNote(clientId: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<{ note: InboxNote }>(
        `${base(clientId)}/conversations/${conversationId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ body }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: inboxKeys.conversation(clientId, conversationId),
      });
    },
  });
}

// ── Manual outbound log ──────────────────────────────────────────────────
//
// Outbound delivery is deferred — this just records that a workspace
// user replied (e.g. emailed the lead externally) so the thread keeps
// chronology. Pass fromSuggestionId to credit an AI suggestion.

export interface ManualMessageInput {
  body: string;
  channel?: 'MANUAL_LOG' | 'EMAIL' | 'SMS';
  fromSuggestionId?: string;
}

export function useLogManualMessage(clientId: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualMessageInput) =>
      apiFetch<{ message: InboxMessage }>(
        `${base(clientId)}/conversations/${conversationId}/messages/manual`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: inboxKeys.conversation(clientId, conversationId),
      });
      qc.invalidateQueries({ queryKey: [...inboxKeys.all, 'conversations', clientId] });
      qc.invalidateQueries({ queryKey: inboxKeys.stats(clientId) });
    },
  });
}

// ── Send email (real outbound) ───────────────────────────────────────────
//
// First real send channel. Backed by Postmark on the API side and
// capability-gated — the route returns 412 if the lead has no email
// or the provider isn't configured. Never call this without first
// checking conversation.replyCapabilities.email.available.

export interface SendEmailInput {
  body: string;
  subject?: string;
  fromSuggestionId?: string;
}

export function useSendInboxEmail(clientId: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendEmailInput) =>
      apiFetch<{ message: InboxMessage }>(
        `${base(clientId)}/conversations/${conversationId}/send-email`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: inboxKeys.conversation(clientId, conversationId),
      });
      qc.invalidateQueries({ queryKey: [...inboxKeys.all, 'conversations', clientId] });
      qc.invalidateQueries({ queryKey: inboxKeys.stats(clientId) });
    },
  });
}

// ── AI reply suggestion ──────────────────────────────────────────────────

export function useGenerateAiReply(clientId: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tone?: ReplyTone } = {}) =>
      apiFetch<{ suggestion: InboxAiSuggestion }>(
        `${base(clientId)}/conversations/${conversationId}/ai-reply`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: inboxKeys.conversation(clientId, conversationId),
      });
    },
  });
}

// ── Stats (dashboard widget) ─────────────────────────────────────────────

export function useInboxStats(clientId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: inboxKeys.stats(clientId ?? ''),
    queryFn: () => apiFetch<InboxStats>(`${base(clientId!)}/stats`),
    enabled: Boolean(clientId) && enabled,
  });
}
