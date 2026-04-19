'use client';

import type { ConversionTopDraft } from '@/hooks/useSquadpitch';

interface Props {
  drafts: ConversionTopDraft[];
  onPostClick?: (draftId: string) => void;
}

export function TopConvertingPosts({ drafts, onPostClick }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        Top Converting Posts
      </h3>
      {drafts.length === 0 ? (
        <p className="text-xs text-white-40 italic">
          No post conversions tracked yet.
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft, i) => (
            <div
              key={draft.draftId}
              className={`flex items-start gap-2 pb-2 border-b border-white-10 last:border-0 last:pb-0${
                onPostClick
                  ? ' cursor-pointer hover:bg-white-5 -mx-2 px-2 py-1 rounded transition'
                  : ''
              }`}
              onClick={() => onPostClick?.(draft.draftId)}
            >
              <span className="text-[10px] text-white-40 font-mono w-4 pt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white-80 line-clamp-2 leading-relaxed">
                  {draft.body || '(no body)'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-60 font-mono">
                    {draft.channel}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[10px] text-blue-400 font-mono">
                    {draft.count} conversion{draft.count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
