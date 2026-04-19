'use client';

import type { AnalyticsPost } from '@/hooks/useSquadpitch';
import { ScoreBadge } from './ScoreBadge';

interface Props {
  title: string;
  posts: AnalyticsPost[];
  onPostClick?: (postId: string) => void;
}

function channelBadge(channel: string) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-60 font-mono">
      {channel}
    </span>
  );
}

function contentTypeBadge(contentType: string) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-green-900/30 text-[10px] text-green-400 font-mono">
      {contentType}
    </span>
  );
}

export function TopPostsList({ title, posts, onPostClick }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {posts.length === 0 ? (
        <p className="text-xs text-white-40 italic">Publish posts to see your top performers.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <div
              key={post.id}
              className={`flex items-start gap-2 pb-2 border-b border-white-10 last:border-0 last:pb-0${
                onPostClick ? ' cursor-pointer hover:bg-white-5 -mx-2 px-2 py-1 rounded transition' : ''
              }`}
              onClick={() => onPostClick?.(post.id)}
            >
              <span className="text-[10px] text-white-40 font-mono w-4 pt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white-80 line-clamp-2 leading-relaxed">
                  {post.body || '(no body)'}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {channelBadge(post.channel)}
                  {post.contentType && contentTypeBadge(post.contentType)}
                  <ScoreBadge
                    score={post.observedScore ?? post.compositeScore}
                    variant={post.observedScore != null ? 'observed' : 'composite'}
                  />
                  {post.engagementRate != null && (
                    <span className="text-[10px] text-white-40">
                      {(post.engagementRate * 100).toFixed(2)}% ER
                    </span>
                  )}
                </div>
                {post.worstReason && (
                  <p className="text-[10px] text-amber-400/80 mt-1 font-medium">
                    {post.worstReason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
