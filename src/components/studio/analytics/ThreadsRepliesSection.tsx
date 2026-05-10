'use client';

// Threads replies panel inside the post-detail modal.
//
// Renders only for published Threads posts. Fetches via
// /api/v1/drafts/:id/threads/replies on mount, lists each reply with
// author, timestamp, permalink, and a Hide/Unhide button. The hide
// action requires explicit confirmation per the spec — never
// automated.

import { useState } from 'react';
import { ExternalLink, EyeOff, Eye, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import {
  useThreadsReplies,
  useSetThreadsReplyHidden,
  type ThreadsReply,
} from '@/hooks/useSquadpitch';

interface Props {
  draftId: string;
  channel: string;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ThreadsRepliesSection({ draftId, channel }: Props) {
  if (channel !== 'THREADS') return null;
  return <ThreadsRepliesContent draftId={draftId} />;
}

function ThreadsRepliesContent({ draftId }: { draftId: string }) {
  const replies = useThreadsReplies(draftId);
  const visibilityMutation = useSetThreadsReplyHidden(draftId);
  const [confirmingHide, setConfirmingHide] = useState<string | null>(null);

  const onToggleHide = async (reply: ThreadsReply) => {
    if (!reply.hidden && confirmingHide !== reply.replyId) {
      setConfirmingHide(reply.replyId);
      return;
    }
    try {
      await visibilityMutation.mutateAsync({
        replyId: reply.replyId,
        hide: !reply.hidden,
      });
      setConfirmingHide(null);
    } catch {
      // Error surfaces via mutation state; nothing else to do here.
    }
  };

  return (
    <section className="rounded-xl border border-white-10 bg-white-5 p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-white-60" />
          <h3 className="text-sm font-semibold text-white-100">Threads replies</h3>
        </div>
        <button
          type="button"
          onClick={() => replies.refetch()}
          disabled={replies.isFetching}
          className="flex items-center gap-1 text-[11px] text-white-40 hover:text-white-80 transition disabled:opacity-50"
        >
          {replies.isFetching ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {replies.isFetching ? 'Syncing…' : 'Sync replies'}
        </button>
      </header>

      {replies.isLoading && (
        <p className="text-xs text-white-40">Loading replies…</p>
      )}

      {replies.error && (
        <p className="text-xs text-red-400">
          {(replies.error as Error)?.message ?? 'Failed to load replies.'}
        </p>
      )}

      {replies.data && replies.data.replies.length === 0 && (
        <p className="text-xs text-white-40">No replies yet.</p>
      )}

      {replies.data && replies.data.replies.length > 0 && (
        <ul className="space-y-2">
          {replies.data.replies.map((reply) => {
            const isPendingThis =
              visibilityMutation.isPending &&
              visibilityMutation.variables?.replyId === reply.replyId;
            const isConfirming = confirmingHide === reply.replyId;
            return (
              <li
                key={reply.replyId}
                className={`rounded-lg p-3 space-y-1 border ${
                  reply.hidden
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-white-10 bg-white-5'
                }`}
              >
                <div className="flex items-center gap-2 text-[11px] text-white-40">
                  <span className="font-mono text-white-100">
                    {reply.author ?? 'Unknown user'}
                  </span>
                  <span>·</span>
                  <span>{formatRelative(reply.timestamp)}</span>
                  {reply.hidden && (
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider">
                      Hidden
                    </span>
                  )}
                  {reply.permalink && (
                    <a
                      href={reply.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-white-40 hover:text-white-80 transition"
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <p className="text-xs text-white-80 whitespace-pre-wrap">
                  {reply.text ?? '(no text)'}
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  {isConfirming && !reply.hidden && (
                    <button
                      type="button"
                      onClick={() => setConfirmingHide(null)}
                      className="text-[11px] text-white-40 hover:text-white-80 transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleHide(reply)}
                    disabled={isPendingThis}
                    className="flex items-center gap-1 text-[11px] text-white-40 hover:text-white-80 transition disabled:opacity-50"
                  >
                    {isPendingThis ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : reply.hidden ? (
                      <Eye size={11} />
                    ) : (
                      <EyeOff size={11} />
                    )}
                    {reply.hidden
                      ? 'Unhide reply'
                      : isConfirming
                        ? 'Confirm hide'
                        : 'Hide reply'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {visibilityMutation.error && (
        <p className="text-[11px] text-red-400">
          {(visibilityMutation.error as Error)?.message ??
            'Failed to update reply visibility.'}
        </p>
      )}
    </section>
  );
}
