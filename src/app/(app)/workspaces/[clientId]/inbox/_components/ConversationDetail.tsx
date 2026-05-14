'use client';

// Center pane — thread + notes + composer + AI suggestions for one
// conversation. Opening a conversation here flips workspaceReadAt
// so the unread badge clears (see the mark-read effect).
//
// Outbound delivery is intentionally NOT implemented for MVP. The
// composer logs a WORKSPACE-side Message so the thread keeps
// chronology when the user replies externally (or in a later phase
// via an integrated channel).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  StickyNote,
  Send,
  ChevronDown,
} from 'lucide-react';
import {
  useInboxConversation,
  useUpdateConversation,
  useCreateNote,
  useLogManualMessage,
  type InboxConversationDetail as Conversation,
  type InboxMessage,
  type InboxAiSuggestion,
  type ConversationStatus,
} from '@/hooks/useInbox';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';
import { AiReplyPanel } from './AiReplyPanel';

interface ConversationDetailProps {
  clientId: string;
  conversationId: string;
  /** Mobile back arrow handler — desktop ignores. */
  onBack?: () => void;
  /** Rendered to the right of the header for the sidebar trigger on mobile. */
  rightAction?: React.ReactNode;
}

export function ConversationDetail({
  clientId,
  conversationId,
  onBack,
  rightAction,
}: ConversationDetailProps) {
  const { data, isLoading, error } = useInboxConversation(clientId, conversationId);
  const updateConv = useUpdateConversation(clientId);
  const logMessage = useLogManualMessage(clientId, conversationId);
  const createNote = useCreateNote(clientId, conversationId);

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

  const [composerMode, setComposerMode] = useState<'reply' | 'note'>('reply');
  const [composerBody, setComposerBody] = useState('');
  const [fromSuggestionId, setFromSuggestionId] = useState<string | null>(null);

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
    if (composerMode === 'reply') {
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
          },
        },
      );
    } else {
      createNote.mutate(body, {
        onSuccess: () => setComposerBody(''),
      });
    }
  };

  const handleUseSuggestion = (suggestion: InboxAiSuggestion) => {
    setComposerMode('reply');
    setComposerBody(suggestion.body);
    setFromSuggestionId(suggestion.id);
  };

  return (
    <div className="flex flex-col h-full">
      <ConversationHeader
        conv={conv}
        onBack={onBack}
        rightAction={rightAction}
        onPatch={(patch) =>
          updateConv.mutate({ conversationId: conv.id, patch })
        }
        patchPending={updateConv.isPending}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <ThreadTimeline conversation={conv} />
      </div>

      <div className="border-t border-white-10 p-3 space-y-3">
        <AiReplyPanel
          clientId={clientId}
          conversationId={conv.id}
          latestSuggestion={latestSuggestion}
          onUseSuggestion={handleUseSuggestion}
          disabled={!hasInbound}
        />

        <Composer
          mode={composerMode}
          onModeChange={(m) => {
            setComposerMode(m);
            if (m === 'note') setFromSuggestionId(null);
          }}
          body={composerBody}
          onBodyChange={setComposerBody}
          onSubmit={handleSubmit}
          pending={logMessage.isPending || createNote.isPending}
          fromSuggestion={Boolean(fromSuggestionId)}
        />
      </div>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────

interface HeaderProps {
  conv: Conversation;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  onPatch: (patch: { status?: ConversationStatus; spam?: boolean }) => void;
  patchPending: boolean;
}

function ConversationHeader({
  conv,
  onBack,
  rightAction,
  onPatch,
  patchPending,
}: HeaderProps) {
  const title =
    conv.contact.name || conv.contact.email || conv.contact.phone || 'Unknown lead';
  const sub = [conv.contact.email, conv.contact.phone].filter(Boolean).join(' · ');

  return (
    <div className="border-b border-white-10 p-3 flex items-center gap-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg text-white-60 hover:text-white-100 hover:bg-white-10"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-white-100 truncate">{title}</h2>
        {sub && <p className="text-[11px] text-white-50 truncate">{sub}</p>}
      </div>

      <div className="flex items-center gap-1">
        {conv.status !== 'CLOSED' && (
          <HeaderButton
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            label="Resolve"
            onClick={() => onPatch({ status: 'CLOSED' })}
            pending={patchPending}
          />
        )}
        {conv.status === 'CLOSED' && (
          <HeaderButton
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            label="Reopen"
            onClick={() => onPatch({ status: 'OPEN' })}
            pending={patchPending}
          />
        )}
        <HeaderButton
          icon={<ShieldAlert className="w-3.5 h-3.5" />}
          label={conv.spam ? 'Not spam' : 'Spam'}
          onClick={() => onPatch({ spam: !conv.spam })}
          pending={patchPending}
          tone={conv.spam ? 'active' : 'default'}
        />
        {rightAction}
      </div>
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
      className={cn(
        'text-xs font-medium px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1.5',
        tone === 'active'
          ? 'bg-amber-400/15 text-amber-300'
          : 'text-white-60 hover:text-white-100 hover:bg-white-10',
        pending && 'opacity-50 cursor-not-allowed',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Thread + notes timeline ─────────────────────────────────────────────

function ThreadTimeline({ conversation }: { conversation: Conversation }) {
  type Entry =
    | { kind: 'message'; at: string; data: InboxMessage }
    | { kind: 'note'; at: string; data: { id: string; body: string; authorUserId: string } };

  // Interleave messages + notes by timestamp so the thread tells the
  // full story (note about a contact appears near the message it
  // refers to).
  const entries = useMemo<Entry[]>(() => {
    const messages: Entry[] = conversation.messages.map((m) => ({
      kind: 'message',
      at: m.createdAt,
      data: m,
    }));
    const notes: Entry[] = conversation.notes.map((n) => ({
      kind: 'note',
      at: n.createdAt,
      data: { id: n.id, body: n.body, authorUserId: n.authorUserId },
    }));
    return [...messages, ...notes].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [conversation.messages, conversation.notes]);

  if (entries.length === 0) {
    return <CenteredMessage>No messages yet.</CenteredMessage>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry, idx) =>
        entry.kind === 'message' ? (
          <MessageBubble key={`m-${entry.data.id}`} message={entry.data} />
        ) : (
          <NoteBubble key={`n-${entry.data.id}`} note={entry.data} />
        ),
      )}
    </ul>
  );
}

function MessageBubble({ message }: { message: InboxMessage }) {
  const isContact = message.party === 'CONTACT';
  const isSystem = message.party === 'SYSTEM';

  if (isSystem) {
    return (
      <li className="text-center">
        <span className="text-[11px] text-white-40 italic">{message.body}</span>
      </li>
    );
  }

  return (
    <li className={cn('flex', isContact ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 space-y-1',
          isContact
            ? 'bg-white-10 text-white-90 rounded-tl-sm'
            : 'bg-accent-green-110/15 text-white-100 rounded-tr-sm',
        )}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.body}</p>
        {message.channel === 'FORM_SUBMISSION' && message.payloadJson && (
          <FormPayload payload={message.payloadJson} />
        )}
        <div className="flex items-center gap-2 text-[10px] text-white-40 pt-1">
          <span>{formatDateTime(message.createdAt)}</span>
          {message.channel && (
            <>
              <span>·</span>
              <span className="uppercase tracking-wider">
                {humanizeChannel(message.channel)}
              </span>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function FormPayload({ payload }: { payload: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(payload).filter(
    ([, v]) => typeof v === 'string' && v.trim().length > 0,
  );
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 border-t border-white-10/50 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[10px] text-white-40 hover:text-white-70 inline-flex items-center gap-1 uppercase tracking-wider"
      >
        <ChevronDown
          className={cn('w-3 h-3 transition-transform', !open && '-rotate-90')}
        />
        Form fields ({entries.length})
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="text-[11px]">
              <span className="text-white-40">{humanize(k)}:</span>{' '}
              <span className="text-white-80">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteBubble({
  note,
}: {
  note: { id: string; body: string; authorUserId: string };
}) {
  return (
    <li className="flex justify-center">
      <div className="max-w-[80%] bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 uppercase tracking-wider">
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

// ── Composer ────────────────────────────────────────────────────────────

interface ComposerProps {
  mode: 'reply' | 'note';
  onModeChange: (m: 'reply' | 'note') => void;
  body: string;
  onBodyChange: (s: string) => void;
  onSubmit: () => void;
  pending: boolean;
  fromSuggestion: boolean;
}

function Composer({
  mode,
  onModeChange,
  body,
  onBodyChange,
  onSubmit,
  pending,
  fromSuggestion,
}: ComposerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onModeChange('reply')}
          className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-lg transition-colors',
            mode === 'reply'
              ? 'bg-accent-green-110/15 text-accent-green-110'
              : 'text-white-50 hover:text-white-100 hover:bg-white-10',
          )}
        >
          Log a reply
        </button>
        <button
          type="button"
          onClick={() => onModeChange('note')}
          className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-lg transition-colors',
            mode === 'note'
              ? 'bg-amber-400/15 text-amber-300'
              : 'text-white-50 hover:text-white-100 hover:bg-white-10',
          )}
        >
          Internal note
        </button>
        {fromSuggestion && mode === 'reply' && (
          <span className="ml-auto text-[10px] text-accent-green-110 uppercase tracking-wider">
            From AI draft
          </span>
        )}
      </div>

      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder={
          mode === 'reply'
            ? 'Type the reply you sent externally — it gets logged on the thread.'
            : 'Internal note for the team. Not visible to the lead.'
        }
        rows={3}
        className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-30 focus:outline-none focus:border-white-20 resize-none"
      />

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white-40">
          {mode === 'reply'
            ? 'Outbound delivery is logged only — channels ship in a later phase.'
            : 'Notes stay inside the workspace.'}
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || !body.trim()}
          className={cn(
            'text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors',
            mode === 'reply'
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-100'
              : 'bg-amber-400/20 text-amber-200 hover:bg-amber-400/30',
            (pending || !body.trim()) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Send className="w-3 h-3" />
          {pending
            ? mode === 'reply'
              ? 'Logging…'
              : 'Saving…'
            : mode === 'reply'
              ? 'Log reply'
              : 'Save note'}
        </button>
      </div>
    </div>
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

function formatDateTime(iso: string): string {
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

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function humanizeChannel(channel: string): string {
  if (channel === 'FORM_SUBMISSION') return 'form';
  if (channel === 'MANUAL_LOG') return 'logged';
  if (channel === 'SOCIAL_DM') return 'DM';
  return channel.toLowerCase();
}
