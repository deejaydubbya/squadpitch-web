'use client';

// Tabbed composer — capability-aware. Three possible modes:
//
//   - "Send email"          real outbound via Postmark (when the lead
//                           has an email + provider is configured)
//   - "Log external reply"  records a WORKSPACE message in the thread
//                           without sending anything (always available)
//   - "Internal note"       private team-side note (always available)
//
// When email is NOT available the "Send email" tab still renders but
// is disabled with the reason — keeps the affordance visible so users
// learn what's needed (e.g. "This lead has no email address").

import Link from 'next/link';
import {
  Send,
  StickyNote,
  Sparkles,
  AlertCircle,
  Settings,
  Mail,
  Lock,
  MessageSquare,
  MessageCircle,
  Star,
} from 'lucide-react';
import type {
  ConversationProvider,
  ReplyActionDescriptor,
  ReplyActionId,
  ReplyCapabilities,
} from '@/hooks/useInbox';
import { cn } from '@/lib/utils';

export type ComposerMode = 'email' | 'reply' | 'note';

interface ComposerProps {
  clientId: string;
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
  body: string;
  onBodyChange: (s: string) => void;
  onSubmit: () => void;
  pending: boolean;
  /** True when the body was populated from an AI suggestion via "Use this". */
  fromSuggestion: boolean;
  /** Server-resolved capabilities — drives which tabs are enabled. */
  capabilities: ReplyCapabilities;
  /** Full channel-aware action list from the server. The three
   *  primary tabs (email / reply / note) still drive the active
   *  composer, but the extras (SMS / comment / DM / review) are
   *  rendered as disabled chips so the UI is honest about what's
   *  possible — never a misleading send button. */
  availableActions?: ReplyActionDescriptor[];
  /** Conversation provider. When GOOGLE_BUSINESS, the primary
   *  "Send email" tab becomes "Public review reply" — the underlying
   *  action submits to the GBP /reply-review endpoint instead. */
  provider?: ConversationProvider;
  /** Inline error from the most recent submit (e.g. provider failed). */
  sendError?: string | null;
}

export function Composer({
  clientId,
  mode,
  onModeChange,
  body,
  onBodyChange,
  onSubmit,
  pending,
  fromSuggestion,
  capabilities,
  availableActions = [],
  provider,
  sendError = null,
}: ComposerProps) {
  const isEmail = mode === 'email';
  const isReply = mode === 'reply';
  const isNote = mode === 'note';

  // GBP review + YouTube comment conversations repurpose the
  // primary tab: same mode='email' shape, but the label, helper
  // copy, and the server endpoint behind handleSubmit all swap to
  // public-reply semantics. The contact has no email; the public
  // reply is the only outbound action available.
  const isGbpReview = provider === 'GOOGLE_BUSINESS';
  const isYouTubeComment = provider === 'YOUTUBE';
  const isThreadsReply = provider === 'THREADS';
  // For GBP/YouTube/Threads we look at the matching action's
  // reason instead of the email capability — they're different
  // gates. YouTube + Threads share REPLY_PUBLIC_COMMENT as the
  // primary action.
  const reviewAction = availableActions.find((a) => a.action === 'REPLY_REVIEW');
  const commentAction = availableActions.find(
    (a) => a.action === 'REPLY_PUBLIC_COMMENT',
  );
  const reviewAvailable = reviewAction?.available ?? false;
  const commentAvailable = commentAction?.available ?? false;
  const primaryAvailable = isGbpReview
    ? reviewAvailable
    : isYouTubeComment || isThreadsReply
      ? commentAvailable
      : capabilities.email.available;
  const primaryReason = isGbpReview
    ? reviewAction?.reason ?? 'Reviews can\'t be replied to yet.'
    : isYouTubeComment
      ? commentAction?.reason ?? 'YouTube comment replies aren\'t connected yet.'
      : isThreadsReply
        ? commentAction?.reason ?? 'Threads reply publishing is not enabled.'
        : capabilities.email.reason ?? 'Email is not available for this conversation.';

  const emailDisabledReason = primaryAvailable ? null : primaryReason;

  // Other-channel actions the server says are theoretically possible
  // for this conversation (based on provider) but aren't a primary
  // tab. None send today; they render as disabled chips with the
  // server's reason — turns "missing button" into a deliberate
  // "Connect <provider>" affordance.
  const EXTRA_ACTION_IDS: ReplyActionId[] = [
    'SEND_SMS',
    'REPLY_PUBLIC_COMMENT',
    'REPLY_DM',
    'REPLY_REVIEW',
  ];
  const extraActions = availableActions.filter((a) => {
    if (!EXTRA_ACTION_IDS.includes(a.action)) return false;
    // Don't surface the action that's already wired into the
    // primary tab as a duplicate chip — it'd read as confusing
    // ("Reply to comment" disabled chip below an enabled
    // "Public comment reply" button).
    if (isGbpReview && a.action === 'REPLY_REVIEW') return false;
    if ((isYouTubeComment || isThreadsReply) && a.action === 'REPLY_PUBLIC_COMMENT')
      return false;
    return true;
  });

  return (
    <div className="card p-0 overflow-hidden">
      {/* Tab row */}
      <div className="flex items-center gap-1 px-2 pt-2 border-b border-white-10">
        <SegButton
          active={isEmail}
          onClick={() => onModeChange('email')}
          icon={<Mail className="w-3 h-3" />}
          tone="primary"
          disabled={!primaryAvailable}
          disabledTitle={emailDisabledReason}
        >
          {isGbpReview
            ? 'Public review reply'
            : isYouTubeComment
              ? 'Public comment reply'
              : isThreadsReply
                ? 'Public reply'
                : 'Send email'}
        </SegButton>
        <SegButton
          active={isReply}
          onClick={() => onModeChange('reply')}
          icon={<Send className="w-3 h-3" />}
        >
          Log external reply
        </SegButton>
        <SegButton
          active={isNote}
          onClick={() => onModeChange('note')}
          icon={<StickyNote className="w-3 h-3" />}
          tone="warn"
        >
          Internal note
        </SegButton>
        {fromSuggestion && (isEmail || isReply) && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-accent-green-110">
            <Sparkles className="w-2.5 h-2.5" />
            From AI draft
          </span>
        )}
      </div>

      {/* Textarea */}
      <div className="px-3 pt-3">
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder={
            isEmail
              ? isGbpReview
                ? 'Write a public response to this Google review…'
                : isYouTubeComment
                  ? 'Write a public reply to this YouTube comment…'
                  : isThreadsReply
                    ? 'Write a public reply on Threads…'
                    : 'Write the reply you want to send to the lead…'
              : isReply
                ? 'Paste the reply you sent outside Squadpitch…'
                : 'Add a private note for your team…'
          }
          rows={4}
          className="w-full bg-transparent border-0 px-0 py-1 text-sm text-white-90 placeholder:text-white-30 focus:outline-none resize-none"
        />
      </div>

      {/* Helper + action row */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-white-10 bg-white-3">
        <p className="text-[11px] text-white-50 leading-snug min-w-0">
          {isEmail
            ? isGbpReview
              ? 'Posts a public response under the review on your Google listing. Visible to everyone browsing the listing.'
              : isYouTubeComment
                ? 'Posts a public reply under the comment on YouTube. Visible to every viewer of the video.'
                : isThreadsReply
                  ? 'Posts a public reply under the comment on Threads. Visible in the public conversation.'
                  : 'Sends a real email to the lead from your workspace. You can review the draft before sending.'
            : isReply
              ? 'Sending is not connected for this channel. This only records the reply on the thread.'
              : 'Notes stay inside your workspace and are never sent to the lead.'}
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || !body.trim()}
          className={cn(
            'text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors shrink-0',
            isEmail
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-100'
              : isReply
                ? 'bg-white-10 text-white-90 hover:bg-white-15 border border-white-15'
                : 'bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 border border-amber-400/30',
            (pending || !body.trim()) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isEmail ? (
            <Mail className="w-3 h-3" />
          ) : isReply ? (
            <Send className="w-3 h-3" />
          ) : (
            <StickyNote className="w-3 h-3" />
          )}
          {pending
            ? isEmail
              ? isGbpReview || isYouTubeComment || isThreadsReply
                ? 'Posting…'
                : 'Sending…'
              : isReply
                ? 'Logging…'
                : 'Saving…'
            : isEmail
              ? isGbpReview || isYouTubeComment || isThreadsReply
                ? 'Post public reply'
                : 'Send email'
              : isReply
                ? 'Log external reply'
                : 'Add note'}
        </button>
      </div>

      {/* Send error — inline; never pretend a failed send worked. */}
      {sendError && isEmail && (
        <div className="flex items-start gap-2 px-3 py-2 border-t border-white-10 bg-amber-400/5 text-[11px] text-amber-200/90 leading-snug">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{sendError}</span>
        </div>
      )}

      {/* Capability strip — only shown on the email/primary tab.
          When the primary action is not available, explains why
          and offers a path to fix (add a contact email, connect
          provider, reconnect with scope, etc.). */}
      {isEmail && !primaryAvailable && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-white-10 bg-amber-400/5">
          <div className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-snug min-w-0">
            <Lock className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{emailDisabledReason}</span>
          </div>
          <Link
            href={`/workspaces/${clientId}/settings/integrations`}
            className="text-[11px] font-medium text-amber-200 hover:text-amber-100 inline-flex items-center gap-1 shrink-0"
          >
            <Settings className="w-3 h-3" />
            Settings
          </Link>
        </div>
      )}

      {/* Legacy log-only strip — only when on the Log external reply
          tab AND email is also unavailable, so users know neither
          mode actually delivers a message. Hidden once email goes
          live for this conversation. */}
      {isReply && !capabilities.email.available && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-white-10 bg-amber-400/5">
          <div className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-snug min-w-0">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>Outbound sending is not available for this conversation yet.</span>
          </div>
          <Link
            href={`/workspaces/${clientId}/settings/integrations`}
            className="text-[11px] font-medium text-amber-200 hover:text-amber-100 inline-flex items-center gap-1 shrink-0"
          >
            <Settings className="w-3 h-3" />
            Connect email
          </Link>
        </div>
      )}

      {/* Other-channel chips — render the server's view of what's
          *theoretically* possible for this conversation's provider
          (SMS, public-comment reply, DM, review reply). All disabled
          today; the chip's tooltip carries the server's "Connect X"
          reason. The point is to be honest about what isn't wired
          rather than silently hide the affordance. */}
      {extraActions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-t border-white-10 bg-white-3 text-[11px] text-white-50">
          <span className="uppercase tracking-wider text-white-40 mr-1">
            Other channels
          </span>
          {extraActions.map((a) => (
            <ExtraActionChip key={a.action} action={a} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SegButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'warn' | 'primary';
  disabled?: boolean;
  disabledTitle?: string | null;
}

function SegButton({
  active,
  onClick,
  icon,
  children,
  tone = 'default',
  disabled = false,
  disabledTitle,
}: SegButtonProps) {
  const activeClass =
    tone === 'warn'
      ? 'text-amber-200 border-b-amber-300'
      : 'text-accent-green-110 border-b-accent-green-110';
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledTitle ?? undefined : undefined}
      className={cn(
        'text-xs font-medium px-3 py-2 border-b-2 -mb-px inline-flex items-center gap-1.5 transition-colors',
        active
          ? activeClass
          : 'text-white-50 hover:text-white-90 border-b-transparent',
        disabled && 'opacity-40 cursor-not-allowed hover:text-white-50',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// Disabled-only chip rendering one of the secondary channel
// actions (SMS, comment, DM, review). Tooltip text is the server's
// own reason string — no client-side guessing about what's
// missing. When requiresConfig is true we link to Settings so the
// user can actually fix it.
const EXTRA_ACTION_ICONS: Record<string, React.ReactNode> = {
  SEND_SMS: <MessageSquare className="w-3 h-3" />,
  REPLY_PUBLIC_COMMENT: <MessageCircle className="w-3 h-3" />,
  REPLY_DM: <MessageSquare className="w-3 h-3" />,
  REPLY_REVIEW: <Star className="w-3 h-3" />,
};

function ExtraActionChip({
  action,
  clientId,
}: {
  action: ReplyActionDescriptor;
  clientId: string;
}) {
  const icon = EXTRA_ACTION_ICONS[action.action] ?? <Lock className="w-3 h-3" />;
  // Reason from the server — always populated when available=false,
  // which is the only case extras land in this UI.
  const tooltip = action.reason ?? 'Not connected yet.';
  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium',
        'border-white-10 text-white-50 bg-white-5 cursor-not-allowed',
      )}
    >
      {icon}
      <span>{action.label}</span>
      {action.requiresConfig && (
        <Link
          href={`/workspaces/${clientId}/settings/integrations`}
          onClick={(e) => e.stopPropagation()}
          className="text-white-40 hover:text-white-90 underline decoration-dotted underline-offset-2 ml-0.5"
        >
          Connect
        </Link>
      )}
    </span>
  );
}
