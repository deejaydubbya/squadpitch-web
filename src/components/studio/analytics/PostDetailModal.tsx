'use client';

import { useState } from 'react';
import { X, ExternalLink, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { usePostDetail, usePostMetricHistory } from '@/hooks/useSquadpitch';
import type { ScoreComponent, MetricGrowth, BenchmarkComparison } from '@/hooks/useSquadpitch';
import { ScoreBadge } from './ScoreBadge';
import {
  isMetaAppReviewDemo,
  META_APP_REVIEW_DEMO_LABELS as META_LABELS,
} from '@/lib/metaAppReviewDemo';

function metaConnectedAccount(channel: string): string | null {
  if (channel === 'FACEBOOK') return META_LABELS.facebookPageName;
  if (channel === 'INSTAGRAM') return META_LABELS.instagramHandle;
  return null;
}

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

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
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

function BenchmarkLine({ label, cmp }: { label: string; cmp: BenchmarkComparison | null }) {
  if (!cmp) return null;
  const color = cmp.label === 'above' ? 'text-green-400' : cmp.label === 'below' ? 'text-red-400' : 'text-white-60';
  const sign = cmp.delta > 0 ? '+' : '';
  const unitLabel = cmp.unit === 'pp' ? 'pp' : 'pts';
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-white-60">{label}</span>
      <span className={`font-mono ${color}`}>
        {cmp.label === 'at' ? 'At baseline' : `${sign}${cmp.delta} ${unitLabel}`}
        {cmp.confidence === 'low' && <span className="text-white-40 ml-1">(limited data)</span>}
      </span>
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

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`text-[10px] font-mono ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {positive ? '+' : ''}{value.toLocaleString()}
    </span>
  );
}

function MetricCell({
  label,
  value,
  delta,
}: {
  label: string;
  value: number | string | null;
  delta?: number;
}) {
  const display =
    value == null
      ? '—'
      : typeof value === 'number'
        ? value.toLocaleString()
        : value;
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        <p className="text-sm font-semibold text-white-100 tabular-nums">{display}</p>
        {delta != null && <DeltaBadge value={delta} />}
      </div>
      <p className="text-[10px] text-white-40 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-white-40 shrink-0">{label}:</span>
      <span className={`text-white-80 truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function engagementRatePct(metrics: { engagementRate: number | null } | null | undefined): string | null {
  if (!metrics) return null;
  if (metrics.engagementRate == null) return null;
  return `${(metrics.engagementRate * 100).toFixed(2)}%`;
}

function GrowthPeriod({ growth }: { growth: MetricGrowth }) {
  const hours = growth.periodHours;
  const label = hours >= 24 ? `${Math.round(hours / 24)}d` : `${hours}h`;
  return (
    <span className="text-[10px] text-white-40 font-mono">vs {label} ago</span>
  );
}

export function PostDetailModal({ clientId, postId, onClose }: Props) {
  const { data, isLoading, error } = usePostDetail(clientId, postId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: historyData, isLoading: historyLoading } = usePostMetricHistory(
    clientId,
    postId,
    historyOpen,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
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

            {/* ── Meta App Review: dominant platform-metrics section.
                When demo mode is on AND the post is FB or IG, this is
                the primary block — internal Squadpitch scoring drops
                to a clearly-labeled secondary section below. ───── */}
            {(() => {
              const isMeta =
                isMetaAppReviewDemo() && metaConnectedAccount(data.channel) !== null;
              const showInline = data.metrics && !isMeta; // suppress duplicate generic grid in Meta mode
              return (
                <>
                  {isMeta && (
                    <>
                      {/* ── 1. Connected Meta account / source block ── */}
                      <section className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
                        <h3 className="text-sm font-semibold text-blue-200">
                          {data.channel === 'INSTAGRAM'
                            ? 'Instagram professional account'
                            : 'Facebook Page'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                          <KV
                            label="Platform"
                            value={
                              data.channel === 'INSTAGRAM'
                                ? 'Instagram professional account'
                                : 'Facebook Page'
                            }
                          />
                          <KV
                            label="Connected account"
                            value={metaConnectedAccount(data.channel) ?? '—'}
                          />
                          <KV label="Source" value={META_LABELS.source} />
                          {data.metrics?.lastSyncedAt && (
                            <KV
                              label="Last synced"
                              value={formatDate(data.metrics.lastSyncedAt)}
                            />
                          )}
                          {data.externalPostId && (
                            <KV label="Post ID" value={data.externalPostId} mono />
                          )}
                          {data.externalPostUrl && (
                            <div className="col-span-1 sm:col-span-2 flex items-center gap-1 min-w-0">
                              <span className="text-white-40 shrink-0">Permalink:</span>
                              <a
                                href={data.externalPostUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline font-mono truncate"
                              >
                                {data.externalPostUrl}
                              </a>
                              <ExternalLink className="w-3 h-3 text-white-40 shrink-0" />
                            </div>
                          )}
                        </div>
                      </section>

                      {/* ── 2. Meta performance metrics ── */}
                      {data.metrics && (
                        <section className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                          <header className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-blue-200">
                              Meta performance metrics
                            </h3>
                            {data.growth && <GrowthPeriod growth={data.growth} />}
                          </header>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            <MetricCell
                              label="Impressions"
                              value={data.metrics.impressions}
                              delta={data.growth?.impressionsDelta}
                            />
                            <MetricCell
                              label="Reach"
                              value={data.metrics.reach}
                              delta={data.growth?.reachDelta}
                            />
                            <MetricCell
                              label="Engagements"
                              value={data.metrics.engagements}
                              delta={data.growth?.engagementsDelta}
                            />
                            <MetricCell
                              label="Clicks"
                              value={data.metrics.clicks}
                              delta={data.growth?.clicksDelta}
                            />
                            {data.channel === 'INSTAGRAM' && (
                              <MetricCell label="Saves" value={data.metrics.saves} />
                            )}
                            <MetricCell label="Shares" value={data.metrics.shares} />
                            <MetricCell label="Comments" value={data.metrics.comments} />
                            <MetricCell label="Likes" value={data.metrics.likes} />
                            <MetricCell
                              label="Engagement rate"
                              value={engagementRatePct(data.metrics)}
                            />
                          </div>
                          <p className="text-[10px] text-white-40">
                            Demo data shown for Meta App Review. Production workspaces fetch
                            these metrics live from Meta&apos;s Graph API using the
                            permissions Squadpitch is requesting.
                          </p>
                        </section>
                      )}
                    </>
                  )}

                  {/* ── Internal Squadpitch insights ─────────────── */}
                  <section
                    className={
                      isMeta
                        ? 'pt-4 border-t border-white-10 space-y-3'
                        : 'space-y-3'
                    }
                  >
                    {isMeta && (
                      <h3 className="text-[11px] font-semibold text-white-60 uppercase tracking-wider">
                        Internal Squadpitch insights
                      </h3>
                    )}

                    {/* Composite score with explicit label */}
                    <div className="flex items-baseline gap-3">
                      <span className="text-[11px] text-white-60 uppercase tracking-wider">
                        Internal content score
                      </span>
                      <span className="text-2xl font-bold text-white-100">
                        {data.scoreBreakdown.compositeScore}
                      </span>
                      <ScoreBadge
                        score={data.scoreBreakdown.compositeScore}
                        variant="composite"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <ScoreBadge
                        score={data.scoreBreakdown.qualityScore}
                        variant="quality"
                        showLabel
                      />
                      {data.scoreBreakdown.observedScore != null && (
                        <ScoreBadge
                          score={data.scoreBreakdown.observedScore}
                          variant="observed"
                          showLabel
                        />
                      )}
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

                    {/* Benchmarks */}
                    {data.benchmarkComparison && (
                      <div className="border-t border-white-10 pt-3 space-y-1.5">
                        <p className="text-[10px] text-white-40 uppercase tracking-wider mb-2">
                          vs Your Benchmarks
                        </p>
                        <BenchmarkLine
                          label="vs Workspace avg"
                          cmp={data.benchmarkComparison.vsWorkspace.score}
                        />
                        <BenchmarkLine
                          label={`vs ${data.channel} avg`}
                          cmp={data.benchmarkComparison.vsChannel.score}
                        />
                        {data.benchmarkComparison.vsContentType && (
                          <BenchmarkLine
                            label="vs Content type avg"
                            cmp={data.benchmarkComparison.vsContentType.score}
                          />
                        )}
                      </div>
                    )}

                    {/* Classification tags */}
                    {data.insight && (
                      <div className="flex flex-wrap gap-1.5">
                        {data.insight.contentType && <Tag>{data.insight.contentType}</Tag>}
                        {data.insight.hookType && <Tag>{data.insight.hookType}</Tag>}
                        {data.insight.sentiment && <Tag>{data.insight.sentiment}</Tag>}
                        {data.insight.lengthBucket && <Tag>{data.insight.lengthBucket}</Tag>}
                        {data.insight.mediaType && <Tag>{data.insight.mediaType}</Tag>}
                        {data.insight.postingTimeBucket && (
                          <Tag>{data.insight.postingTimeBucket}</Tag>
                        )}
                      </div>
                    )}

                    {/* Generic 8-cell metrics grid — only outside Meta mode
                        (where the dominant Meta block already shows them) */}
                    {showInline && (
                      <div className="py-3 border-t border-white-10">
                        {data.growth && (
                          <div className="flex justify-end mb-2">
                            <GrowthPeriod growth={data.growth} />
                          </div>
                        )}
                        <div className="grid grid-cols-4 gap-3">
                          <MetricCell
                            label="Impressions"
                            value={data.metrics!.impressions}
                            delta={data.growth?.impressionsDelta}
                          />
                          <MetricCell
                            label="Reach"
                            value={data.metrics!.reach}
                            delta={data.growth?.reachDelta}
                          />
                          <MetricCell
                            label="Engagements"
                            value={data.metrics!.engagements}
                            delta={data.growth?.engagementsDelta}
                          />
                          <MetricCell
                            label="Clicks"
                            value={data.metrics!.clicks}
                            delta={data.growth?.clicksDelta}
                          />
                          <MetricCell label="Saves" value={data.metrics!.saves} />
                          <MetricCell label="Shares" value={data.metrics!.shares} />
                          <MetricCell label="Comments" value={data.metrics!.comments} />
                          <MetricCell label="Likes" value={data.metrics!.likes} />
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {data.insight?.recommendationTags &&
                      data.insight.recommendationTags.length > 0 && (
                        <div className="border-t border-white-10 pt-3">
                          <p className="text-[10px] text-white-40 uppercase tracking-wider mb-2">
                            Recommendations
                          </p>
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
                  </section>
                </>
              );
            })()}

            {/* Collapsible metric history */}
            <div className="border-t border-white-10 pt-3">
              <button
                onClick={() => setHistoryOpen((o) => !o)}
                className="flex items-center gap-1 text-[10px] text-white-40 uppercase tracking-wider hover:text-white-60 transition"
              >
                {historyOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Metric History
              </button>

              {historyOpen && (
                <div className="mt-3">
                  {historyLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 size={14} className="animate-spin text-white-40" />
                    </div>
                  )}
                  {historyData && historyData.history.length === 0 && (
                    <p className="text-[11px] text-white-40 font-mono">No snapshots recorded yet.</p>
                  )}
                  {historyData && historyData.history.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] font-mono">
                        <thead>
                          <tr className="text-white-40 uppercase tracking-wider">
                            <th className="text-left py-1 pr-3">Date</th>
                            <th className="text-right py-1 px-2">Impr.</th>
                            <th className="text-right py-1 px-2">Reach</th>
                            <th className="text-right py-1 px-2">Eng.</th>
                            <th className="text-right py-1 pl-2">ER</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.history.map((row) => (
                            <tr key={row.snapshotAt} className="text-white-80 border-t border-white-5">
                              <td className="py-1.5 pr-3 text-white-60">{formatShortDate(row.snapshotAt)}</td>
                              <td className="text-right py-1.5 px-2 tabular-nums">{row.impressions.toLocaleString()}</td>
                              <td className="text-right py-1.5 px-2 tabular-nums">{row.reach.toLocaleString()}</td>
                              <td className="text-right py-1.5 px-2 tabular-nums">{row.engagements.toLocaleString()}</td>
                              <td className="text-right py-1.5 pl-2 tabular-nums">
                                {row.engagementRate != null ? `${(row.engagementRate * 100).toFixed(2)}%` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
