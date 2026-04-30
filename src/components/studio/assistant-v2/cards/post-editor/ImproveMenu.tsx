'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEXT_ACTIONS, MEDIA_ACTIONS, type TextImproveActionId, type MediaImproveActionId } from '@/lib/assistant/improveActions';
import type { ImproveState } from './usePostEditorState';

interface ImproveMenuProps {
  improveState: ImproveState;
  onTextAction: (actionId: TextImproveActionId) => void;
  onMediaAction?: (actionId: MediaImproveActionId) => void;
  onDismissError: () => void;
  hasUserEdits: boolean;
  atImageLimit?: boolean;
  atVideoLimit?: boolean;
}

export function ImproveMenu({
  improveState,
  onTextAction,
  onMediaAction,
  onDismissError,
  hasUserEdits,
  atImageLimit,
  atVideoLimit,
}: ImproveMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<TextImproveActionId | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmAction(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleTextAction = (actionId: TextImproveActionId) => {
    if (hasUserEdits && !confirmAction) {
      setConfirmAction(actionId);
      return;
    }
    setConfirmAction(null);
    setOpen(false);
    onTextAction(actionId);
  };

  const handleMediaAction = (actionId: MediaImproveActionId) => {
    setOpen(false);
    onMediaAction?.(actionId);
  };

  const isLoading = improveState.status === 'loading';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => {
          if (isLoading) return;
          setOpen(!open);
          setConfirmAction(null);
        }}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
          isLoading
            ? 'bg-accent-green-110/10 text-accent-green-110 cursor-wait'
            : 'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-100',
        )}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        {isLoading ? 'Improving...' : 'Improve'}
      </button>

      {/* Error inline */}
      {improveState.status === 'error' && improveState.error && (
        <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-accent-red/10 border border-accent-red/20 text-[10px] text-accent-red whitespace-nowrap z-20">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="truncate max-w-[200px]">{improveState.error}</span>
          <button onClick={onDismissError} className="flex-shrink-0 hover:text-white-100">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && !isLoading && (
        <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg bg-sp-surface border border-white-10 shadow-xl z-20 overflow-hidden">
          {/* Confirm dialog */}
          {confirmAction && (
            <div className="p-2.5 border-b border-white-10 bg-accent-orange/5">
              <p className="text-[10px] text-accent-orange mb-1.5">
                Your edits are preserved as the current version. AI will create a new version.
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleTextAction(confirmAction)}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90"
                >
                  Continue
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="text-[10px] text-white-40 hover:text-white-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Text improvements */}
          <div className="py-1">
            <p className="px-3 py-1 text-[9px] font-semibold text-white-30 uppercase tracking-wider">
              Text improvements
            </p>
            {TEXT_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleTextAction(action.id as TextImproveActionId)}
                className="w-full text-left px-3 py-1.5 hover:bg-white-5 transition-colors"
              >
                <span className="block text-[11px] text-white-80">{action.label}</span>
                <span className="block text-[10px] text-white-30">{action.description}</span>
              </button>
            ))}
          </div>

          {/* Media */}
          {onMediaAction && (
            <div className="py-1 border-t border-white-10">
              <p className="px-3 py-1 text-[9px] font-semibold text-white-30 uppercase tracking-wider">
                Media
              </p>
              {MEDIA_ACTIONS.map((action) => {
                const isImage = action.id === 'generate_matching_image';
                const disabled = isImage ? atImageLimit : atVideoLimit;
                return (
                  <button
                    key={action.id}
                    onClick={() => !disabled && handleMediaAction(action.id as MediaImproveActionId)}
                    disabled={disabled}
                    className={cn(
                      'w-full text-left px-3 py-1.5 transition-colors',
                      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white-5',
                    )}
                  >
                    <span className="block text-[11px] text-white-80">
                      {action.label}
                      {disabled && <span className="text-accent-red text-[9px] ml-1">Limit reached</span>}
                    </span>
                    <span className="block text-[10px] text-white-30">{action.description}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
