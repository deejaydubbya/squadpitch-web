'use client';

// Center pane — thread + notes + composer + AI suggestions for one
// conversation. Sticky header keeps the contact + actions visible
// while the user scrolls, source-context strip surfaces which page/
// campaign drove the lead, and the first FORM_SUBMISSION renders as
// a LeadCard hero rather than a generic chat bubble.
//
// Outbound delivery is intentionally NOT implemented for MVP. The
// composer logs a WORKSPACE-side Message so the thread keeps
// chronology when the user replies externally (or in a later phase
// via an integrated channel).

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  StickyNote,
  ExternalLink,
  Globe,
  Target,
  User,
} from 'lucide-react';
import {
  useInboxConversation,
  useUpdateConversation,
  useCreateNote,
  useLogManualMessage,
  useSendInboxEmail,
  useSendGbpReviewReply,
  useSendYouTubeCommentReply,
  useSendThreadsReply,
  useSendFacebookCommentReply,
  useSendInstagramCommentReply,
  useSendInboxSms,
  type InboxConversationDetail as Conversation,
  type InboxMessage,
  type InboxAiSuggestion,
  type ConversationStatus,
} from '@/hooks/useInbox';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';
import { AiReplyPanel } from './AiReplyPanel';
import { Composer, type ComposerMode } from './Composer';
import { LeadCard } from './LeadCard';
import { contactHeadline, formatDateTime, humanizeKey } from './inbox.helpers';
import { shouldDefaultToPrimary } from './composerActions';

interface ConversationDetailProps {
  clientId: string;
  conversationId: string;
  /** Mobile back arrow handler — desktop ignores. */
  onBack?: () => void;
  /** Open the contact / lead details slide-over. Required since the
   *  contact info has no permanent column anymore. */
  onOpenDetails: () => void;
}

export function ConversationDetail({
  clientId,
  conversationId,
  onBack,
  onOpenDetails,
}: ConversationDetailProps) {
  const { data, isLoading, error } = useInboxConversation(clientId, conversationId);
  const updateConv = useUpdateConversation(clientId);
  const logMessage = useLogManualMessage(clientId, conversationId);
  const createNote = useCreateNote(clientId, conversationId);
  const sendEmail = useSendInboxEmail(clientId, conversationId);
  const sendGbpReply = useSendGbpReviewReply(clientId, conversationId);
  const sendYouTubeReply = useSendYouTubeCommentReply(clientId, conversationId);
  const sendThreadsReply = useSendThreadsReply(clientId, conversationId);
  const sendFacebookReply = useSendFacebookCommentReply(clientId, conversationId);
  const sendInstagramReply = useSendInstagramCommentReply(clientId, conversationId);
  const sendSms = useSendInboxSms(clientId, conversationId);

  // Mark read whenever a new unread conversation is opened. Stamp the
  // last-message id so we don't re-fire on every re-render while the
  // user keeps the same conversation open.
  const markedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!data) return;
    if (!data.unread) return;
    if (markedRef.current === data.id) return;
    markedRef.current = data.id;
    updateConv.mutate({ conversationId: data.id, patch: { markRead: true } });
    // updateConv intentionally omitted from deps — useMutation refs are
    // stable for the lifetime of the hook and including it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id, data?.unread]);

  // Default composer mode is "email" when the conversation supports
  // it (real outbound). Otherwise fall back to "reply" (log-only).
  // The user can always switch tabs explicitly.
  const [composerMode, setComposerMode] = useState<ComposerMode>('reply');
  const [composerBody, setComposerBody] = useState('');
  const [fromSuggestionId, setFromSuggestionId] = useState<string | null>(null);
  // AI panel collapses to a compact strip after "Use this" so the
  // suggestion text isn't duplicated alongside the now-filled
  // composer. Resets when the external reply is logged.
  const [aiCollapsed, setAiCollapsed] = useState(false);
  // Inline send error so users see what failed instead of an opaque
  // "request failed" — Postmark rejections, rate-limit, etc.
  const [sendError, setSendError] = useState<string | null>(null);

  // Promote the email tab to default the first time the data
  // arrives if email is available. Stamp the conversation id so a
  // subsequent capability change for the same conversation doesn't
  // override an explicit user tab switch.
  const defaultedForId = useRef<string | null>(null);
  useEffect(() => {
    if (!data) return;
    if (defaultedForId.current === data.id) return;
    defaultedForId.current = data.id;
    if (shouldDefaultToPrimary(data.availableReplyActions ?? [])) {
      setComposerMode('email');
    }
  }, [data?.id, data?.availableReplyActions]);

  // The first inbound FORM_SUBMISSION gets hero rendering; subsequent
  // CONTACT messages fall back to the standard bubble layout. Computed
  // before the early returns so the hook order stays stable.
  const heroMessageId = useMemo(() => {
    if (!data) return null;
    return (
      data.messages.find(
        (m) => m.party === 'CONTACT' && m.channel === 'FORM_SUBMISSION',
      )?.id ?? null
    );
  }, [data]);

  if (isLoading) {
    return <CenteredMessage>Loading conversation…</CenteredMessage>;
  }
  if (error) {
    const msg = error instanceof ApiError ? error.message : 'Failed to load conversation';
    return <CenteredMessage>{msg}</CenteredMessage>;
  }
  if (!data) {
    return <CenteredMessage>Select a conversation</CenteredMessage>;
  }

  const conv = data;
  const latestSuggestion = conv.aiReplies[0] ?? null;
  const hasInbound = conv.messages.some((m) => m.party === 'CONTACT');

  const handleSubmit = () => {
    const body = composerBody.trim();
    if (!body) return;
    setSendError(null);
    if (composerMode === 'email') {
      // Mint a fresh idempotency key per Send click. Pure browser
      // randomUUID — no PII, no server roundtrip. A double-click or
      // network retry on this exact mutate call will reuse the key
      // (React Query keeps the same input on retry) and the API
      // returns the existing Message instead of a duplicate send.
      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Conversation provider drives WHICH send endpoint the
      // "email" composer tab dispatches to. For Google Business
      // Profile review conversations the primary action is a
      // public review reply (PUT updateReply via /reply-review),
      // not an outbound email — the contact has no email address
      // and the reply is on the public Google listing.
      const sendMutation =
        conv.provider === 'GOOGLE_BUSINESS'
          ? sendGbpReply
          : conv.provider === 'YOUTUBE'
            ? sendYouTubeReply
            : conv.provider === 'THREADS'
              ? sendThreadsReply
              : conv.provider === 'FACEBOOK'
                ? sendFacebookReply
                : conv.provider === 'INSTAGRAM'
                  ? sendInstagramReply
                  : sendEmail;
      sendMutation.mutate(
        {
          body,
          fromSuggestionId: fromSuggestionId ?? undefined,
          idempotencyKey,
        },
        {
          onSuccess: () => {
            setComposerBody('');
            setFromSuggestionId(null);
            setAiCollapsed(false);
          },
          onError: (err) => {
            setSendError(err instanceof ApiError ? err.message : 'Send failed');
          },
        },
      );
    } else if (composerMode === 'sms') {
      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sendSms.mutate(
        {
          body,
          fromSuggestionId: fromSuggestionId ?? undefined,
          idempotencyKey,
        },
        {
          onSuccess: () => {
            setComposerBody('');
            setFromSuggestionId(null);
            setAiCollapsed(false);
          },
          onError: (err) => {
            setSendError(err instanceof ApiError ? err.message : 'Send failed');
          },
        },
      );
    } else if (composerMode === 'reply') {
      logMessage.mutate(
        {
          body,
          channel: 'MANUAL_LOG',
          fromSuggestionId: fromSuggestionId ?? undefined,
        },
        {
          onSuccess: () => {
            setComposerBody('');
            setFromSuggestionId(null);
            // After a successful log, reset the AI panel so the next
            // suggestion starts from the full default view.
            setAiCollapsed(false);
          },
        },
      );
    } else {
      createNote.mutate(body, {
        onSuccess: () => setComposerBody(''),
      });
    }
  };

  // Retry a FAILED outbound email. Re-sends the prior body with a
  // FRESH idempotency key (the failed attempt already burned its
  // key — reusing it would short-circuit back to the same FAILED
  // Message). Whether the user sees the new row or the old one
  // depends on how the API handles repeated failed sends; for now
  // we just kick off a brand-new attempt.
  const handleRetryFailedEmail = (failed: InboxMessage) => {
    setSendError(null);
    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sendEmail.mutate(
      {
        body: failed.body,
        fromSuggestionId: failed.fromSuggestionId ?? undefined,
        idempotencyKey,
      },
      {
        onError: (err) => {
          setSendError(err instanceof ApiError ? err.message : 'Retry failed');
        },
      },
    );
  };

  const handleUseSuggestion = (suggestion: InboxAiSuggestion) => {
    // Prefer the real send channel if it's available — the user
    // almost certainly meant to send, not log.
    const nextMode: ComposerMode = shouldDefaultToPrimary(
      conv.availableReplyActions ?? [],
    )
      ? 'email'
      : 'reply';
    setComposerMode(nextMode);
    setComposerBody(suggestion.body);
    setFromSuggestionId(suggestion.id);
  };

  return (
    <div className="flex flex-col h-full bg-sp-bg">
      <DetailHeader
        conv={conv}
        clientId={clientId}
        onBack={onBack}
        onOpenDetails={onOpenDetails}
        onPatch={(patch) =>
          updateConv.mutate({ conversationId: conv.id, patch })
        }
        patchPending={updateConv.isPending}
        onAddNote={() => setComposerMode('note')}
      />

      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-4">
        {heroMessageId && (
          <LeadCard
            message={conv.messages.find((m) => m.id === heroMessageId)!}
            page={conv.page}
            campaign={conv.campaign}
          />
        )}

        <ThreadTimeline
          conversation={conv}
          skipMessageId={heroMessageId}
          onRetryFailedEmail={handleRetryFailedEmail}
          retryPending={sendEmail.isPending}
        />

        <AiReplyPanel
          clientId={clientId}
          conversationId={conv.id}
          latestSuggestion={latestSuggestion}
          onUseSuggestion={handleUseSuggestion}
          disabled={!hasInbound}
          contextLabel={buildContextLabel(conv)}
          channel={composerMode === 'note' ? 'note' : composerMode === 'reply' ? 'reply' : 'email'}
          collapsed={aiCollapsed}
          onCollapse={() => setAiCollapsed(true)}
          onExpand={() => setAiCollapsed(false)}
        />
      </div>

      <div className="shrink-0 border-t border-white-10 bg-sp-bg px-2 py-2 sm:px-6 sm:py-3">
        <Composer
          clientId={clientId}
          mode={composerMode}
          onModeChange={(m) => {
            setComposerMode(m);
            setSendError(null);
            if (m === 'note') setFromSuggestionId(null);
          }}
          body={composerBody}
          onBodyChange={setComposerBody}
          onSubmit={handleSubmit}
          pending={
            sendEmail.isPending ||
            sendGbpReply.isPending ||
            sendYouTubeReply.isPending ||
            sendThreadsReply.isPending ||
            sendSms.isPending ||
            logMessage.isPending ||
            createNote.isPending
          }
          fromSuggestion={Boolean(fromSuggestionId)}
          availableActions={conv.availableReplyActions ?? []}
          provider={conv.provider}
          sendError={sendError}
        />
      </div>
    </div>
  );
}

// ── Sticky header + source strip ────────────────────────────────────────

interface HeaderProps {
  conv: Conversation;
  clientId: string;
  onBack?: () => void;
  onOpenDetails: () => void;
  onPatch: (patch: { status?: ConversationStatus; spam?: boolean }) => void;
  patchPending: boolean;
  onAddNote: () => void;
}

function DetailHeader({
  conv,
  clientId,
  onBack,
  onOpenDetails,
  onPatch,
  patchPending,
  onAddNote,
}: HeaderProps) {
  const title = contactHeadline(conv.contact);
  const sub = [conv.contact.email, conv.contact.phone].filter(Boolean).join(' · ');

  return (
    <div className="sticky top-0 z-10 border-b border-white-10 bg-sp-bg/95 backdrop-blur supports-[backdrop-filter]:bg-sp-bg/80">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white-60 hover:bg-white-10 hover:text-white-100 lg:hidden"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-white-100 truncate">
              {title}
            </h2>
            <StatusPill status={conv.status} spam={conv.spam} />
          </div>
          {sub && (
            <p className="text-[11px] text-white-50 truncate mt-0.5">{sub}</p>
          )}
        </div>

        <div className="order-last -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1 overflow-x-auto px-1 sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
          <HeaderButton
            icon={<StickyNote className="w-3.5 h-3.5" />}
            label="Add note"
            onClick={onAddNote}
            pending={false}
          />
          {conv.status !== 'CLOSED' ? (
            <HeaderButton
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="Resolve"
              onClick={() => onPatch({ status: 'CLOSED' })}
              pending={patchPending}
            />
          ) : (
            <HeaderButton
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              label="Reopen"
              onClick={() => onPatch({ status: 'OPEN' })}
              pending={patchPending}
            />
          )}
          <HeaderButton
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            label={conv.spam ? 'Not spam' : 'Mark spam'}
            onClick={() => onPatch({ spam: !conv.spam })}
            pending={patchPending}
            tone={conv.spam ? 'active' : 'default'}
          />
          {/* Divider keeps the lead-details affordance visually
              distinct from the conversation-state actions. */}
          <span className="hidden sm:inline-block w-px h-5 bg-white-10 mx-0.5" />
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-white-15 px-3 py-2 text-xs font-medium text-white-80 transition-colors hover:border-white-20 hover:bg-white-10 hover:text-white-100"
            title="Open lead details"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lead details</span>
          </button>
        </div>
      </div>

      <SourceStrip conv={conv} clientId={clientId} />
    </div>
  );
}

function HeaderButton({
  icon,
  label,
  onClick,
  pending,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  pending: boolean;
  tone?: 'default' | 'active';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={label}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
        tone === 'active'
          ? 'bg-amber-400/15 text-amber-200'
          : 'text-white-60 hover:text-white-100 hover:bg-white-10',
        pending && 'opacity-50 cursor-not-allowed',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const STATUS_TONE: Record<ConversationStatus | 'SPAM', string> = {
  OPEN: 'bg-accent-green-110/15 text-accent-green-110',
  PENDING: 'bg-blue-400/15 text-blue-300',
  CLOSED: 'bg-white-10 text-white-50',
  SNOOZED: 'bg-purple-400/15 text-purple-300',
  SPAM: 'bg-amber-400/15 text-amber-200',
};

function StatusPill({ status, spam }: { status: ConversationStatus; spam: boolean }) {
  const key = spam ? 'SPAM' : status;
  const label = spam ? 'spam' : status.toLowerCase();
  return (
    <span
      className={cn(
        'inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
        STATUS_TONE[key as keyof typeof STATUS_TONE] ?? 'bg-white-10 text-white-50',
      )}
    >
      {label}
    </span>
  );
}

// Below-header strip showing the page + campaign the lead came from.
// Renders nothing when no source context is available so we don't
// add visual noise for non-form conversations.
function SourceStrip({ conv, clientId }: { conv: Conversation; clientId: string }) {
  if (!conv.page && !conv.campaign) return null;
  return (
    <div className="px-4 sm:px-6 py-2 flex items-center gap-3 text-[11px] text-white-50 border-t border-white-10/50 bg-white-3 flex-wrap">
      {conv.page && (
        <Link
          href={`/workspaces/${clientId}/sites/pages/${conv.page.id}`}
          className="inline-flex items-center gap-1.5 hover:text-white-100 transition-colors group"
        >
          <Globe className="w-3 h-3" />
          <span>From</span>
          <span className="text-white-90 font-medium group-hover:text-accent-green-110">
            {conv.page.title}
          </span>
          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      )}
      {conv.campaign && (
        <div className="inline-flex items-center gap-1.5">
          <Target className="w-3 h-3" />
          <span>Campaign</span>
          <span className="text-white-90 font-medium">{conv.campaign.name}</span>
          <span className="text-white-30 lowercase">
            ({conv.campaign.campaignType.toLowerCase()})
          </span>
        </div>
      )}
    </div>
  );
}

// ── Thread + notes timeline ─────────────────────────────────────────────

function ThreadTimeline({
  conversation,
  skipMessageId,
  onRetryFailedEmail,
  retryPending,
}: {
  conversation: Conversation;
  /** Message id rendered as a LeadCard above — exclude from the timeline so it doesn't double-render. */
  skipMessageId: string | null;
  onRetryFailedEmail: (message: InboxMessage) => void;
  retryPending: boolean;
}) {
  type Entry =
    | { kind: 'message'; at: string; data: InboxMessage }
    | { kind: 'note'; at: string; data: { id: string; body: string; authorUserId: string } };

  const entries = useMemo<Entry[]>(() => {
    const messages: Entry[] = conversation.messages
      .filter((m) => m.id !== skipMessageId)
      .map((m) => ({ kind: 'message', at: m.createdAt, data: m }));
    const notes: Entry[] = conversation.notes.map((n) => ({
      kind: 'note',
      at: n.createdAt,
      data: { id: n.id, body: n.body, authorUserId: n.authorUserId },
    }));
    return [...messages, ...notes].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [conversation.messages, conversation.notes, skipMessageId]);

  if (entries.length === 0) return null;

  return (
    <ul className="space-y-3">
      {entries.map((entry) =>
        entry.kind === 'message' ? (
          <MessageBubble
            key={`m-${entry.data.id}`}
            message={entry.data}
            onRetry={onRetryFailedEmail}
            retryPending={retryPending}
          />
        ) : (
          <NoteBubble key={`n-${entry.data.id}`} note={entry.data} />
        ),
      )}
    </ul>
  );
}

function MessageBubble({
  message,
  onRetry,
  retryPending,
}: {
  message: InboxMessage;
  onRetry: (message: InboxMessage) => void;
  retryPending: boolean;
}) {
  const isContact = message.party === 'CONTACT';
  const isSystem = message.party === 'SYSTEM';

  if (isSystem) {
    return (
      <li className="text-center py-1">
        <span className="text-[10px] text-white-40 italic">{message.body}</span>
      </li>
    );
  }

  // Delivery state for outbound real-channel sends. Only EMAIL (and
  // future SMS/social) carry a meaningful lifecycle; FORM_SUBMISSION
  // and MANUAL_LOG come back with null deliveryStatus.
  const isFailed = !isContact && message.deliveryStatus === 'FAILED';
  const isSending = !isContact && message.deliveryStatus === 'SENDING';

  return (
    <li className={cn('flex', isContact ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[88%] space-y-1 overflow-hidden rounded-2xl px-3.5 py-2.5 sm:max-w-[80%]',
          isContact
            ? 'bg-white-10 text-white-90 rounded-tl-sm'
            : isFailed
              ? 'bg-amber-400/10 text-white-100 rounded-tr-sm border border-amber-400/40'
              : 'bg-accent-green-110/15 text-white-100 rounded-tr-sm border border-accent-green-110/20',
        )}
      >
        <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
        <div className="flex items-center gap-2 text-[10px] text-white-40 pt-1 flex-wrap">
          <span>{formatDateTime(message.createdAt)}</span>
          {message.channel && (
            <>
              <span>·</span>
              <span className="uppercase tracking-wider">
                {humanizeChannel(message.channel)}
              </span>
            </>
          )}
          {isSending && (
            <>
              <span>·</span>
              <span className="uppercase tracking-wider text-white-50">Sending…</span>
            </>
          )}
          {isFailed && (
            <>
              <span>·</span>
              <span className="uppercase tracking-wider text-amber-300 font-medium">
                Failed
              </span>
            </>
          )}
        </div>
        {isFailed && (
          <div className="flex items-start justify-between gap-2 pt-1 border-t border-amber-400/20 mt-1">
            <p className="text-[11px] text-amber-200/80 leading-snug flex-1 min-w-0">
              {message.errorReason
                ? `Send failed: ${truncateReason(message.errorReason)}`
                : 'Send failed. Try again or check provider settings.'}
            </p>
            <button
              type="button"
              onClick={() => onRetry(message)}
              disabled={retryPending}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-3 py-2 text-[11px] font-semibold transition-colors',
                'bg-amber-400/20 text-amber-100 hover:bg-amber-400/30 border border-amber-400/30',
                retryPending && 'opacity-50 cursor-not-allowed',
              )}
            >
              {retryPending ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function truncateReason(reason: string): string {
  const stripped = reason.replace(/^\d+:\s*/, '');
  return stripped.length > 160 ? `${stripped.slice(0, 157)}…` : stripped;
}

function NoteBubble({
  note,
}: {
  note: { id: string; body: string; authorUserId: string };
}) {
  return (
    <li className="flex justify-center">
      <div className="max-w-[80%] bg-amber-400/8 border border-amber-400/20 rounded-xl px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 uppercase tracking-wider font-semibold">
          <StickyNote className="w-3 h-3" />
          Internal note
        </div>
        <p className="text-sm text-white-90 whitespace-pre-wrap leading-relaxed mt-1">
          {note.body}
        </p>
      </div>
    </li>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <p className="text-sm text-white-50">{children}</p>
    </div>
  );
}

function humanizeChannel(channel: string): string {
  if (channel === 'FORM_SUBMISSION') return 'form';
  if (channel === 'MANUAL_LOG') return 'logged';
  if (channel === 'SOCIAL_DM') return 'DM';
  return channel.toLowerCase();
}

// Short summary of what the AI will see, shown in the AI reply panel
// so the user can trust the suggestion is grounded. Page wins as
// the primary anchor because that's what the lead actually saw;
// campaign adds when present.
function buildContextLabel(conv: Conversation): string | null {
  const parts: string[] = [];
  if (conv.page?.title) parts.push(conv.page.title);
  if (conv.campaign?.name) parts.push(conv.campaign.name);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}
