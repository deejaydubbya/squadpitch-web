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
export type ContactStatus =
  | 'NEW'
  | 'ENGAGED'
  | 'QUALIFIED'
  | 'CONVERTED'
  | 'ARCHIVED';
export type ContactSourceType = 'FORM' | 'IMPORT' | 'MANUAL';
export type MessageChannel =
  | 'FORM_SUBMISSION'
  | 'EMAIL'
  | 'SMS'
  | 'SOCIAL_DM'
  | 'MANUAL_LOG';
export type MessageDeliveryStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED';
export type ReplyTone = 'professional' | 'friendly' | 'concise';
// AI reply channel framing — drives the system prompt:
//   email — outbound email draft (greeting + sign-off-ready)
//   reply — logged-external paste (brief, no greeting)
//   note  — internal team note (third-person, no greeting)
export type AiReplyChannel = 'email' | 'reply' | 'note';

export interface ReplyCapability {
  available: boolean;
  reason: string | null;
}

export interface ReplyCapabilities {
  email: ReplyCapability;
  logExternal: ReplyCapability;
  note: ReplyCapability;
}

// Channel-aware action types mirrored from
// squadpitch-api/domains/inbox/inbox.replyActions.js. Provider
// columns may extend this set later (REPLY_PUBLIC_COMMENT for
// social, REPLY_REVIEW for GBP/FB, etc.).
export type ReplyActionId =
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'REPLY_PUBLIC_COMMENT'
  | 'REPLY_DM'
  | 'REPLY_REVIEW'
  | 'LOG_EXTERNAL_REPLY'
  | 'INTERNAL_NOTE';

export interface ReplyActionDescriptor {
  action: ReplyActionId;
  label: string;
  available: boolean;
  reason: string | null;
  /** True when the action needs workspace-level provider config
   *  (e.g. Postmark or Twilio creds) before it can ever go live —
   *  drives "Connect <provider>" copy in the UI. False when the
   *  blocker is per-conversation (e.g. lead has no phone). */
  requiresConfig: boolean;
}

export type ConversationProvider =
  | 'SQUADSITES'
  | 'EMAIL'
  | 'SMS'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'GOOGLE_BUSINESS'
  | 'YOUTUBE'
  | 'LINKEDIN'
  | 'X'
  | 'TIKTOK'
  | 'THREADS'
  | 'PINTEREST'
  | 'WEB_CHAT'
  | 'MANUAL';

export type MessageVisibility = 'PUBLIC' | 'PRIVATE' | 'INTERNAL';

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
  // Privacy framing — drives composer rendering + AI prompt filtering.
  visibility: MessageVisibility;
  // Public-surface link (social comment URL, etc.). Null for direct
  // channels (email/SMS/form submissions).
  sourceUrl: string | null;
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
  /** Per-network origin — drives the list-row badge and the
   *  reply-action resolver. SQUADSITES for form-intake; FACEBOOK /
   *  INSTAGRAM / etc. for social ingestion. */
  provider: ConversationProvider;
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
  /** Legacy 3-tab capability shape — kept for back-compat. New
   *  surface lives on availableReplyActions. */
  replyCapabilities: ReplyCapabilities;
  /** Channel-aware action list, server-derived per spinstr07. */
  availableReplyActions: ReplyActionDescriptor[];
  /** Per-network provider for the conversation. SQUADSITES for
   *  every form-intake conversation; EMAIL when the inbound email
   *  webhook created the thread without a prior form. */
  provider: ConversationProvider;
  externalThreadId: string | null;
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
  // Fresh UUID minted by the composer on each Send click. Lets a
  // retried POST (double-click, network retry, server-restart-mid-call)
  // return the existing Message instead of firing a duplicate send.
  // Optional for type-safety, but the composer always supplies one.
  idempotencyKey?: string;
}

// ── Send Google Business Profile public review reply ────────────────────
//
// Mirrors useSendInboxEmail (same idempotency-key-as-header pattern,
// same {body, fromSuggestionId, idempotencyKey} input shape) so the
// composer can dispatch to whichever send endpoint matches the
// conversation provider without restructuring its handler.

export interface SendGbpReviewReplyInput {
  body: string;
  fromSuggestionId?: string;
  idempotencyKey?: string;
}

export function useSendGbpReviewReply(clientId: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idempotencyKey, ...body }: SendGbpReviewReplyInput) =>
      apiFetch<{ message: InboxMessage }>(
        `${base(clientId)}/conversations/${conversationId}/reply-review`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
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

// ── Send YouTube public comment reply ──────────────────────────────────
//
// Same {body, fromSuggestionId, idempotencyKey} contract as the
// other outbound hooks so the composer can dispatch by provider
// without restructuring. POSTs to the provider-aware
// reply-comment route which routes to inbox.outbound.youtube on
// YOUTUBE conversations.
export interface SendYouTubeCommentReplyInput {
  body: string;
  fromSuggestionId?: string;
  idempotencyKey?: string;
}

export function useSendYouTubeCommentReply(clientId: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idempotencyKey, ...body }: SendYouTubeCommentReplyInput) =>
      apiFetch<{ message: InboxMessage }>(
        `${base(clientId)}/conversations/${conversationId}/reply-comment`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
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

export function useSendInboxEmail(clientId: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idempotencyKey, ...body }: SendEmailInput) =>
      apiFetch<{ message: InboxMessage }>(
        `${base(clientId)}/conversations/${conversationId}/send-email`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
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

// ── Contact mutation (CRM-lite) ──────────────────────────────────────────

export interface ContactPatch {
  status?: ContactStatus;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Replace the full tag set. Pass [] to clear. */
  tags?: string[];
}

export function useUpdateContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      patch,
    }: {
      contactId: string;
      patch: ContactPatch;
    }) =>
      apiFetch<{ contact: InboxContact }>(
        `workspaces/${clientId}/contacts/${contactId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      ),
    onSuccess: () => {
      // The contact rides along with multiple Inbox queries — list
      // rows surface its email/name/status, the detail view embeds
      // the full row. Blanket-invalidate to keep both in sync.
      qc.invalidateQueries({ queryKey: [...inboxKeys.all, 'conversations', clientId] });
      qc.invalidateQueries({ queryKey: [...inboxKeys.all, 'conversation', clientId] });
    },
  });
}

// ── AI reply suggestion ──────────────────────────────────────────────────

export function useGenerateAiReply(clientId: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tone?: ReplyTone; channel?: AiReplyChannel } = {}) =>
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
