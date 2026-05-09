'use client';

import { useState } from 'react';
import { X, Pin, Loader2, AlertTriangle, Lock, Globe } from 'lucide-react';
import {
  usePinterestBoards,
  useSelectPinterestBoard,
} from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';

interface Props {
  clientId: string;
  currentBoardId: string | null;
  onClose: () => void;
}

export function PinterestBoardPicker({ clientId, currentBoardId, onClose }: Props) {
  const { data, isLoading, error } = usePinterestBoards(clientId);
  const select = useSelectPinterestBoard(clientId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const boards = data?.boards ?? [];
  const isCurrentSelection =
    currentBoardId && /^\d+$/.test(currentBoardId) ? currentBoardId : null;

  const handlePick = (boardId: string, boardName: string) => {
    setPendingId(boardId);
    select.mutate(
      { boardId, boardName },
      {
        onSuccess: () => onClose(),
        onSettled: () => setPendingId(null),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-sp-surface rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white-10">
          <h3 className="text-sm font-semibold text-white-100 flex items-center gap-2">
            <Pin className="w-4 h-4" /> Pick a Pinterest board
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-white-60 mb-3">
            All Pins published from Squadpitch will land on this board. You can change it later.
          </p>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-white-60 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading boards…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-red/10 text-accent-red text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{(error as Error).message}</span>
            </div>
          )}

          {!isLoading && !error && boards.length === 0 && (
            <div className="text-sm text-white-60 py-6 text-center">
              No Pinterest boards found.
              <br />
              <span className="text-xs text-white-40">
                Create a board on Pinterest, then close this and reopen it.
              </span>
            </div>
          )}

          {!isLoading && boards.length > 0 && (
            <div className="max-h-80 overflow-y-auto -mx-1">
              {boards.map((b) => {
                const isCurrent = b.id === isCurrentSelection;
                const isPending = pendingId === b.id;
                const isSecret = (b.privacy ?? '').toLowerCase() === 'secret';
                return (
                  <button
                    key={b.id}
                    onClick={() => handlePick(b.id, b.name)}
                    disabled={select.isPending}
                    className={cn(
                      'w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors mb-1',
                      'hover:bg-white-5 disabled:opacity-50',
                      isCurrent && 'ring-1 ring-accent-green-110/40 bg-white-5'
                    )}
                  >
                    <div className="w-8 h-8 rounded-md bg-white-10 flex items-center justify-center flex-shrink-0">
                      {isSecret ? (
                        <Lock className="w-4 h-4 text-white-60" />
                      ) : (
                        <Globe className="w-4 h-4 text-white-60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white-100 font-medium truncate">
                        {b.name}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] text-accent-green-110 font-medium">
                            CURRENT
                          </span>
                        )}
                      </div>
                      {b.description && (
                        <div className="text-xs text-white-40 truncate">
                          {b.description}
                        </div>
                      )}
                    </div>
                    {isPending && (
                      <Loader2 className="w-4 h-4 animate-spin text-white-60 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {select.error && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-accent-red/10 text-accent-red text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{(select.error as Error).message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
