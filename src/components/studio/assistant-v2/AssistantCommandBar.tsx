'use client';

// Bottom command bar for the AI Assistant. Wraps the existing
// ChatInput textarea and adds three lightweight rows above it:
//
//   1. helper label (left) + "What can I type?" link (right)
//   2. chip row — 2–6 contextual shortcuts for this step
//   3. textarea + send button (the existing ChatInput)
//
// Chip clicks and Examples-popover clicks both call sendMessage with
// the same text the user could type. Typed and clicked commands stay
// consistent — no parallel action dispatcher.
//
// Helper data comes from commandBar.ts:
//   - getContextualHelperLabel
//   - getContextualPlaceholder
//   - getContextualChips
//   - getContextualExamples

import { useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { ChatInput } from './ChatInput';
import {
  getContextualChips,
  getContextualExamples,
  getContextualHelperLabel,
  getContextualPlaceholder,
} from '@/lib/assistant/conversation/commandBar';
import type { AssistantSessionState } from '@/lib/assistant/types';

interface Props {
  session: AssistantSessionState;
  ready: boolean;
  hasGenerationResult: boolean;
  onSend: (text: string) => void;
}

export function AssistantCommandBar({
  session,
  ready,
  hasGenerationResult,
  onSend,
}: Props) {
  const helperLabel = useMemo(
    () => getContextualHelperLabel(session, ready, hasGenerationResult),
    [session, ready, hasGenerationResult],
  );
  const placeholder = useMemo(
    () => getContextualPlaceholder(session, ready, hasGenerationResult),
    [session, ready, hasGenerationResult],
  );
  const chips = useMemo(
    () => getContextualChips(session, ready, hasGenerationResult),
    [session, ready, hasGenerationResult],
  );
  const examples = useMemo(
    () => getContextualExamples(session, ready, hasGenerationResult),
    [session, ready, hasGenerationResult],
  );

  const [examplesOpen, setExamplesOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close examples popover on click outside or Escape.
  useEffect(() => {
    if (!examplesOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setExamplesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExamplesOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [examplesOpen]);

  const handleChip = (command: string) => {
    onSend(command);
  };

  const handleExample = (text: string) => {
    setExamplesOpen(false);
    onSend(text);
  };

  return (
    <div className="border-t border-white-10 bg-sp-card">
      {/* Helper label + Examples link */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[10px] text-white-40">
        <span className="truncate pr-2">{helperLabel}</span>
        <div className="relative shrink-0" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setExamplesOpen((o) => !o)}
            className="flex items-center gap-0.5 text-white-40 hover:text-white-100 transition-colors"
            aria-label="Examples of what you can type"
          >
            <HelpCircle className="w-3 h-3" />
            <span>What can I type?</span>
          </button>
          {examplesOpen && examples.length > 0 && (
            <div className="absolute bottom-full right-0 mb-2 w-72 rounded-lg border border-white-10 bg-sp-surface shadow-lg p-2 z-30">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[10px] uppercase tracking-wider text-white-40">
                  Try saying
                </span>
                <button
                  type="button"
                  onClick={() => setExamplesOpen(false)}
                  className="text-white-30 hover:text-white-100"
                  aria-label="Close examples"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <ul className="space-y-0.5">
                {examples.map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      onClick={() => handleExample(example)}
                      className="w-full text-left text-xs text-white-80 hover:text-white-100 hover:bg-white-5 rounded px-2 py-1.5 transition-colors"
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Chip row — hidden when empty so we don't reserve dead space */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 px-3 pb-1.5">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChip(chip.command)}
              className="px-2.5 py-1 rounded-full bg-white-5 hover:bg-white-10 border border-white-10 hover:border-white-20 text-[11px] text-white-80 hover:text-white-100 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Textarea + send (existing ChatInput; placeholder is now
          contextual per step). */}
      <ChatInput onSend={onSend} placeholder={placeholder} />
    </div>
  );
}
