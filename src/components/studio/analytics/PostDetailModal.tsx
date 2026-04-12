'use client';

import { X, ExternalLink, Loader2 } from 'lucide-react';
import { usePostDetail } from '@/hooks/useSquadpitch';
import type { ScoreComponent } from '@/hooks/useSquadpitch';
import { ScoreBadge } from './ScoreBadge';

interface Props {
  clientId: string;
  postId: string;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProgressBar({ label, component, maxWeight }: { label: string; component: ScoreComponent; maxWeight: number }) {
  const pct = maxWeight > 0 ? (component.weighted / (maxWeight * 100)) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-white-60">{label}</span>
        <span className="text-white-80 font-mono">
          {component.weighted}/{Math.round(component.weight * 100)}
        </span>
      </div>
      <div className="h-1.5 bg-white-10 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-white-10 text-[10px] text-white-60 font-mono">
      {children}
    </span>
  );
}

function MetricCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-white-100 tabular-nums">
        {value != null ? value.toLocaleString() : '—'}
      </p>
      <p className="text-[10px] text-white-40 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export function PostDetailModal({ clientId, postId, onClose }: Props) {
  const { data, isLoading, error } = usePostDetail(clientId, postId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-surface border border-white-10 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-white-10 text-white-40 hover:text-white-80 transition z-10"
        >
          <X size={16} />
        </button>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-white-40" />
          </div>
        )}

        {error && (
          <div className="p-6 text-sm text-red-400">
            Failed to load post detail.
          </div>
        )}

        {data && (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-2 pr-6">
              <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-60 font-mono">
                {data.channel}
              </span>
              {data.publishedAt && (
                <span className="text-xs text-white-40">{formatDate(data.publishedAt)}</span>
              )}
              {data.externalPostUrl && (
                <a
                  href={data.externalPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-white-40 hover:text-white-80 transition"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            {/* Post body */}
            <p className="text-sm text-white-80 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {data.body || '(no body)'}
            </p>

            {/* Score breakdown */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-white-100">
                  {data.scoreBreakdown.score}
                </span>
                <ScoreBadge score={data.scoreBreakdown.score} />
              </div>

              <div className="space-y-2">
                {data.scoreBreakdown.components.engagement && (
                  <ProgressBar
                    label="Engagement"
                    component={data.scoreBreakdown.components.engagement}
                    maxWeight={data.scoreBreakdown.components.engagement.weight}
                  />
                )}
                <ProgressBar
                  label="Quality"
                  component={data.scoreBreakdown.components.quality}
                  maxWeight={data.scoreBreakdown.components.quality.weight}
                />
                <ProgressBar
                  label="Consistency"
                  component={data.scoreBreakdown.components.consistency}
                  maxWeight={data.scoreBreakdown.components.consistency.weight}
                />
              </div>

              <p className="text-[11px] text-white-40 font-mono">
                {data.scoreBreakdown.explanation}
              </p>
            </div>

            {/* Classification tags */}
            {data.insight && (
              <div className="flex flex-wrap gap-1.5">
                {data.insight.contentType && <Tag>{data.insight.contentType}</Tag>}
                {data.insight.hookType && <Tag>{data.insight.hookType}</Tag>}
                {data.insight.sentiment && <Tag>{data.insight.sentiment}</Tag>}
                {data.insight.lengthBucket && <Tag>{data.insight.lengthBucket}</Tag>}
                {data.insight.mediaType && <Tag>{data.insight.mediaType}</Tag>}
                {data.insight.postingTimeBucket && <Tag>{data.insight.postingTimeBucket}</Tag>}
              </div>
            )}

            {/* Metrics grid */}
            {data.metrics && (
              <div className="grid grid-cols-4 gap-3 py-3 border-t border-white-10">
                <MetricCell label="Impressions" value={data.metrics.impressions} />
                <MetricCell label="Reach" value={data.metrics.reach} />
                <MetricCell label="Engagements" value={data.metrics.engagements} />
                <MetricCell label="Clicks" value={data.metrics.clicks} />
                <MetricCell label="Saves" value={data.metrics.saves} />
                <MetricCell label="Shares" value={data.metrics.shares} />
                <MetricCell label="Comments" value={data.metrics.comments} />
                <MetricCell label="Likes" value={data.metrics.likes} />
              </div>
            )}

            {/* Recommendation tags */}
            {data.insight?.recommendationTags && data.insight.recommendationTags.length > 0 && (
              <div className="border-t border-white-10 pt-3">
                <p className="text-[10px] text-white-40 uppercase tracking-wider mb-2">Recommendations</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.insight.recommendationTags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-blue-900/30 text-[10px] text-blue-400 font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
