'use client';

import { useState } from 'react';
import { X, Pin, Loader2, AlertTriangle, Lock, Globe, Plus } from 'lucide-react';
import {
  usePinterestBoards,
  useSelectPinterestBoard,
  useCreatePinterestBoard,
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
  const create = useCreatePinterestBoard(clientId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

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

  const handleCreate = () => {
    const name = newBoardName.trim();
    if (!name) return;
    create.mutate(
      { name },
      {
        onSuccess: ({ board }) => {
          setNewBoardName('');
          setCreateOpen(false);
          handlePick(board.id, board.name);
        },
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

          {!isLoading && !error && boards.length === 0 && !createOpen && (
            <div className="text-sm text-white-60 py-4 text-center space-y-2">
              <div>No Pinterest boards found on this account.</div>
              <button
                onClick={() => setCreateOpen(true)}
                className="text-xs px-3 py-1.5 rounded-md bg-accent-green-110/20 text-accent-green-110 hover:bg-accent-green-110/30 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Create one now
              </button>
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

          {createOpen && (
            <div className="mt-3 p-3 rounded-lg border border-white-10 bg-white-5 space-y-2">
              <div className="text-xs text-white-60 font-medium">Create a new board</div>
              <input
                autoFocus
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setCreateOpen(false);
                }}
                placeholder="Board name (e.g., Listings)"
                className="w-full px-2 py-1.5 rounded bg-sp-surface border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
                disabled={create.isPending}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setCreateOpen(false);
                    setNewBoardName('');
                  }}
                  disabled={create.isPending}
                  className="text-xs px-3 py-1.5 rounded-md text-white-60 hover:bg-white-10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={create.isPending || !newBoardName.trim()}
                  className="text-xs px-3 py-1.5 rounded-md bg-accent-green-110/20 text-accent-green-110 hover:bg-accent-green-110/30 inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {create.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Create &amp; pick
                </button>
              </div>
            </div>
          )}

          {!createOpen && boards.length > 0 && (
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-2 text-xs text-white-40 hover:text-white-60 inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Create new board
            </button>
          )}

          {(select.error || create.error) && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-accent-red/10 text-accent-red text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {((select.error || create.error) as Error).message}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
