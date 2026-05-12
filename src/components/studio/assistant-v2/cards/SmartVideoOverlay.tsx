'use client';

// Loading / success / error overlay for the Smart Video flow.
//
// Sits absolutely-positioned on top of a post's media strip area
// (the parent wraps both in a `<div className="relative">`). Reads
// the SmartVideoStatus emitted by VideoGeneratorButton via
// PostMediaActions.onSmartVideoStatusChange.
//
// Behavior:
//   - generating / attaching → semi-opaque overlay with spinner +
//     dynamic progress message ("Encoding video…", "Attaching to
//     post…"). Pointer events captured so the user can't poke at
//     the media strip mid-flow.
//   - done → 4-second success banner; offers a Revert link if the
//     parent passed onRevert (used to restore the original image
//     selection when the user doesn't like the swap).
//   - error → inline error banner, dismisses on next status change.
//   - idle / ready / controlModalOpen → nothing rendered.

import { useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Video, Undo2 } from 'lucide-react';
import type { SmartVideoStatus } from './VideoGeneratorButton';

interface Props {
  status: SmartVideoStatus | null;
  /** Restore the media list to what it was before the video was attached */
  onRevert?: () => void;
  /** Clears the success banner — usually wired to setStatus(idle) after timeout */
  onDismissDone?: () => void;
}

export function SmartVideoOverlay({ status, onRevert, onDismissDone }: Props) {
  // Auto-dismiss the success banner after 4 seconds so it doesn't
  // linger over the media. The revert link stays accessible via the
  // parent's mediaIds-history state until the user picks new media.
  useEffect(() => {
    if (!status || status.phase !== 'done' || !onDismissDone) return;
    const t = setTimeout(() => onDismissDone(), 4000);
    return () => clearTimeout(t);
  }, [status, onDismissDone]);

  if (!status) return null;
  if (status.phase === 'idle' || status.phase === 'ready') return null;
  if (status.controlModalOpen) return null;

  if (status.phase === 'generating' || status.phase === 'attaching') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-sp-bg/85 backdrop-blur-sm pointer-events-auto">
        <div className="flex flex-col items-center gap-1.5 px-4 text-center">
          <Loader2 className="w-5 h-5 text-accent-green-110 animate-spin" />
          <p className="text-xs font-medium text-white-100">
            {status.phase === 'attaching' ? 'Attaching Smart Video…' : 'Creating Smart Video…'}
          </p>
          <p className="text-[10px] text-white-40">
            {status.message ?? 'This may take a moment.'}
          </p>
        </div>
      </div>
    );
  }

  if (status.phase === 'done') {
    return (
      <div className="absolute inset-x-0 -top-1 -translate-y-full z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-accent-green-110/30 bg-accent-green-110/10 backdrop-blur-sm pointer-events-auto">
        <CheckCircle2 className="w-3.5 h-3.5 text-accent-green-110 shrink-0" />
        <p className="flex-1 text-[11px] font-medium text-white-100">
          <Video className="inline w-3 h-3 mr-1 -mt-0.5 text-accent-green-110" />
          Smart Video added to this post.
        </p>
        {onRevert && (
          <button
            type="button"
            onClick={onRevert}
            className="flex items-center gap-0.5 text-[10px] text-white-40 hover:text-white-100 transition-colors"
          >
            <Undo2 className="w-2.5 h-2.5" />
            Use original images
          </button>
        )}
      </div>
    );
  }

  if (status.phase === 'error') {
    return (
      <div className="absolute inset-x-0 -top-1 -translate-y-full z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 backdrop-blur-sm pointer-events-auto">
        <AlertCircle className="w-3.5 h-3.5 text-accent-red shrink-0" />
        <p className="flex-1 text-[11px] text-white-100">
          {status.error ?? 'Smart Video failed — your original images are still attached.'}
        </p>
      </div>
    );
  }

  return null;
}
