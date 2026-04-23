'use client';

import { useState } from 'react';
import {
  Search,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Image,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminDrafts, useAdminDraft } from '@/hooks/useAdmin';
import type { DraftSummary, DraftDetail } from '@/hooks/useAdmin';

const STATUS_OPTIONS = ['', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED', 'FAILED'];
const CHANNEL_OPTIONS = ['', 'INSTAGRAM', 'TIKTOK', 'X', 'LINKEDIN', 'FACEBOOK', 'YOUTUBE'];
const KIND_OPTIONS = ['', 'POST', 'CAPTION', 'VIDEO_SCRIPT', 'CAROUSEL', 'HOOKS', 'CTA_VARIANTS', 'REPLY'];

function draftStatusColor(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-white-10 text-white-60',
    PENDING_REVIEW: 'bg-yellow-500/20 text-yellow-400',
    APPROVED: 'bg-accent-blue/20 text-accent-blue',
    SCHEDULED: 'bg-accent-blue/20 text-accent-blue',
    PUBLISHED: 'bg-green-500/20 text-green-400',
    REJECTED: 'bg-accent-orange/20 text-accent-orange',
    FAILED: 'bg-red-500/20 text-accent-red',
  };
  return map[status] || 'bg-white-10 text-white-40';
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', draftStatusColor(status))}>
      {status}
    </span>
  );
}

export default function ContentDebuggerPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const { data, isLoading, isError } = useAdminDrafts({
    search,
    status: statusFilter,
    channel: channelFilter,
    kind: kindFilter,
    limit: '50',
  });

  const { data: detail, isLoading: detailLoading } = useAdminDraft(selectedId);

  if (selectedId && detail) {
    return <DraftDetailView detail={detail} onBack={() => setSelectedId(undefined)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Content Debugger</h1>
        <p className="text-white-40 text-sm">Inspect AI-generated content, generation metadata, and publishing state.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
          <input
            type="text"
            placeholder="Search by ID, content, or campaign name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none"
        >
          {CHANNEL_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All channels'}</option>)}
        </select>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sp-surface border border-white-10 text-white text-sm focus:outline-none"
        >
          {KIND_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All kinds'}</option>)}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-accent-red text-sm">Failed to load drafts.</div>
      ) : !data?.items.length ? (
        <div className="text-center py-12 text-white-30 text-sm">No drafts found.</div>
      ) : (
        <div className="space-y-2">
          {data.items.map((d) => (
            <DraftRow key={d.id} draft={d} onSelect={() => setSelectedId(d.id)} />
          ))}
        </div>
      )}

      {selectedId && detailLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin w-6 h-6 border-2 border-accent-green-110 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}

function DraftRow({ draft, onSelect }: { draft: DraftSummary; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className="rounded-lg border border-white-10 bg-sp-surface p-4 hover:bg-white-5 cursor-pointer transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={draft.status} />
            <span className="text-white-60 text-xs">{draft.channel}</span>
            <span className="text-white-30 text-xs">{draft.kind}</span>
            {draft.campaignName && (
              <span className="text-accent-blue text-xs truncate max-w-[200px]">{draft.campaignName}</span>
            )}
          </div>
          <p className="text-white text-sm truncate">{draft.body || <span className="text-white-30 italic">No content</span>}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white-30">
            <span>{draft.clientName || draft.clientId}</span>
            <span className="font-mono">{draft.id.slice(0, 12)}...</span>
            {draft.modelUsed && <span className="font-mono">{draft.modelUsed}</span>}
            <span>{new Date(draft.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {draft.warnings.length > 0 && (
            <span className="flex items-center gap-1 text-accent-orange text-[10px]">
              <AlertTriangle className="w-3 h-3" />
              {draft.warnings.length}
            </span>
          )}
          {draft.hasAssets && (
            <span className="flex items-center gap-1 text-white-30 text-[10px]">
              <Image className="w-3 h-3" />
              {draft.assetCount}
            </span>
          )}
          {draft.publishError && <XCircle className="w-3.5 h-3.5 text-accent-red" />}
        </div>
      </div>
    </div>
  );
}

// ── Detail View ──────────────────────────────────────────────────────────

function DraftDetailView({ detail, onBack }: { detail: DraftDetail; onBack: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white-5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white-40" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Draft Detail</h1>
            <StatusBadge status={detail.status} />
          </div>
          <p className="text-white-30 text-xs font-mono">{detail.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identity */}
        <Section title="Identity & Context">
          <InfoRow label="Workspace" value={detail.clientName || detail.clientId} />
          <InfoRow label="Client ID" value={detail.clientId} mono />
          <InfoRow label="Industry" value={detail.industryKey || '—'} />
          <InfoRow label="Kind" value={detail.kind} />
          <InfoRow label="Channel" value={detail.channel} />
          <InfoRow label="Bucket Key" value={detail.bucketKey || '—'} />
          <InfoRow label="Created By" value={detail.createdBy || '—'} mono />
          <InfoRow label="Created" value={new Date(detail.createdAt).toLocaleString()} />
        </Section>

        {/* Generation Metadata */}
        <Section title="Generation Metadata">
          <InfoRow label="Model" value={detail.modelUsed || 'Unknown'} mono />
          <InfoRow label="Prompt Version" value={detail.promptVersion || '—'} />
          {detail.campaignName && (
            <>
              <InfoRow label="Campaign" value={detail.campaignName} />
              <InfoRow label="Campaign Type" value={detail.campaignType || '—'} />
              <InfoRow label="Day / Order" value={`${detail.campaignDay ?? '—'} / ${detail.campaignOrder ?? '—'} of ${detail.campaignTotal ?? '—'}`} />
            </>
          )}
          {detail.performanceRating && <InfoRow label="Perf Rating" value={detail.performanceRating} />}
        </Section>

        {/* Content */}
        <Section title="Content Output" fullWidth>
          {detail.body ? (
            <pre className="text-white text-xs whitespace-pre-wrap bg-sp-bg rounded-lg p-3 max-h-64 overflow-y-auto">{detail.body}</pre>
          ) : (
            <p className="text-white-30 text-sm">No body content</p>
          )}
          {detail.hooks.length > 0 && (
            <div className="mt-3">
              <p className="text-white-40 text-xs font-medium mb-1">Hooks:</p>
              <div className="flex flex-wrap gap-1">
                {detail.hooks.map((h, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-white-5 text-white-60 text-xs">{h}</span>
                ))}
              </div>
            </div>
          )}
          {detail.hashtags.length > 0 && (
            <div className="mt-2">
              <p className="text-white-40 text-xs font-medium mb-1">Hashtags:</p>
              <p className="text-accent-blue text-xs">{detail.hashtags.join(' ')}</p>
            </div>
          )}
          {detail.cta && (
            <div className="mt-2">
              <p className="text-white-40 text-xs font-medium mb-1">CTA:</p>
              <p className="text-white-60 text-xs">{detail.cta}</p>
            </div>
          )}
        </Section>

        {/* Warnings */}
        {detail.warnings.length > 0 && (
          <Section title="Validation Warnings" fullWidth>
            <div className="space-y-1">
              {detail.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-3 h-3 text-accent-orange flex-shrink-0 mt-0.5" />
                  <span className="text-accent-orange">{w}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Generation Guidance */}
        {detail.generationGuidance && (
          <Section title="Generation Guidance" fullWidth>
            <pre className="text-white-40 text-xs whitespace-pre-wrap bg-sp-bg rounded-lg p-3 max-h-48 overflow-y-auto">{detail.generationGuidance}</pre>
          </Section>
        )}

        {/* Source Data */}
        {detail.sources.length > 0 && (
          <Section title="Source Data">
            <div className="space-y-2">
              {detail.sources.map((s, i) => (
                <div key={i} className="rounded-lg border border-white-5 p-2">
                  {s.dataItem && (
                    <div>
                      <p className="text-white text-xs font-medium">{s.dataItem.title || s.dataItem.type}</p>
                      <p className="text-white-30 text-[10px] font-mono">{s.dataItem.id}</p>
                      {s.dataItem.summary && <p className="text-white-40 text-xs mt-1 line-clamp-2">{s.dataItem.summary}</p>}
                    </div>
                  )}
                  {s.blueprint && (
                    <div className={s.dataItem ? 'mt-2 pt-2 border-t border-white-5' : ''}>
                      <p className="text-accent-blue text-xs">{s.blueprint.name} ({s.blueprint.category})</p>
                      <p className="text-white-30 text-[10px] font-mono">{s.blueprint.slug}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Assets */}
        <Section title="Attached Media">
          {detail.assets.length === 0 && !detail.mediaUrl ? (
            <p className="text-white-30 text-sm">No media attached</p>
          ) : (
            <div className="space-y-2">
              {detail.mediaUrl && (
                <div className="flex items-center gap-2 text-xs">
                  <Image className="w-3.5 h-3.5 text-white-30" />
                  <span className="text-white-60 truncate">{detail.mediaUrl}</span>
                  {detail.mediaType && <span className="text-white-30">({detail.mediaType})</span>}
                </div>
              )}
              {detail.assets.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-white-5 last:border-0">
                  <div className="flex items-center gap-2">
                    <Image className="w-3.5 h-3.5 text-white-30" />
                    <span className="text-white text-xs">{a.filename || a.assetType}</span>
                    <span className="text-white-30 text-[10px]">{a.source}</span>
                    {a.width && a.height && <span className="text-white-30 text-[10px]">{a.width}x{a.height}</span>}
                  </div>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    a.status === 'READY' ? 'bg-green-500/20 text-green-400' :
                    a.status === 'FAILED' ? 'bg-red-500/20 text-accent-red' :
                    'bg-white-10 text-white-40'
                  )}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Publishing */}
        <Section title="Publishing Info">
          <InfoRow label="Status" value={detail.status} />
          <InfoRow label="Publish Source" value={detail.publishSource || '—'} />
          <InfoRow label="Attempts" value={String(detail.publishAttempts)} />
          {detail.scheduledFor && <InfoRow label="Scheduled For" value={new Date(detail.scheduledFor).toLocaleString()} />}
          {detail.publishedAt && <InfoRow label="Published At" value={new Date(detail.publishedAt).toLocaleString()} />}
          {detail.lastPublishAttemptAt && <InfoRow label="Last Attempt" value={new Date(detail.lastPublishAttemptAt).toLocaleString()} />}
          {detail.externalPostUrl && (
            <div className="flex items-center gap-1 mt-2">
              <ExternalLink className="w-3 h-3 text-accent-blue" />
              <a href={detail.externalPostUrl} target="_blank" rel="noopener noreferrer" className="text-accent-blue text-xs hover:underline truncate">
                {detail.externalPostUrl}
              </a>
            </div>
          )}
          {detail.publishError && (
            <div className="mt-3 rounded-lg border border-accent-red/20 bg-accent-red/5 p-3">
              <p className="text-accent-red text-xs font-medium mb-1">Publish Error:</p>
              <pre className="text-accent-red text-xs font-mono whitespace-pre-wrap">{detail.publishError}</pre>
            </div>
          )}
          <InfoRow label="Idempotency Key" value={detail.idempotencyKey || '—'} mono />
          <InfoRow label="External Post ID" value={detail.externalPostId || '—'} mono />
        </Section>

        {/* Moderation Log */}
        {detail.moderationLog.length > 0 && (
          <Section title="Status History" fullWidth>
            <div className="space-y-1">
              {detail.moderationLog.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-white-5 last:border-0">
                  <StatusBadge status={log.fromStatus} />
                  <span className="text-white-30">&rarr;</span>
                  <StatusBadge status={log.toStatus} />
                  <span className="text-white-30 font-mono text-[10px]">{log.actorSub}</span>
                  {log.reason && <span className="text-white-40 text-[10px]">({log.reason})</span>}
                  <span className="text-white-30 text-[10px] ml-auto">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Image/Video Guidance */}
        {(detail.imageGuidance || detail.videoGuidance) && (
          <Section title="Media Guidance" fullWidth>
            {detail.imageGuidance && (
              <div className="mb-3">
                <p className="text-white-40 text-xs font-medium mb-1">Image Guidance:</p>
                <pre className="text-white-40 text-xs whitespace-pre-wrap bg-sp-bg rounded-lg p-3">{detail.imageGuidance}</pre>
              </div>
            )}
            {detail.videoGuidance && (
              <div>
                <p className="text-white-40 text-xs font-medium mb-1">Video Guidance:</p>
                <pre className="text-white-40 text-xs whitespace-pre-wrap bg-sp-bg rounded-lg p-3">{detail.videoGuidance}</pre>
              </div>
            )}
          </Section>
        )}

        {/* Debug IDs */}
        <Section title="Debug IDs" fullWidth>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <InfoRow label="Draft ID" value={detail.id} mono />
            <InfoRow label="Client ID" value={detail.clientId} mono />
            {detail.campaignId && <InfoRow label="Campaign ID" value={detail.campaignId} mono />}
            {detail.approvedBy && <InfoRow label="Approved By" value={detail.approvedBy} mono />}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────────────

function Section({ title, fullWidth, children }: { title: string; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-white-10 bg-sp-surface p-5', fullWidth && 'lg:col-span-2')}>
      <h2 className="text-sm font-semibold text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white-5 last:border-0">
      <span className="text-white-40 text-xs">{label}</span>
      <span className={cn('text-white text-xs text-right max-w-[60%] truncate', mono && 'font-mono text-white-60')}>{value}</span>
    </div>
  );
}
