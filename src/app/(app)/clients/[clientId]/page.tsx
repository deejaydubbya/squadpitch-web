'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Wand2,
  Calendar,
  Library,
  BarChart3,
  ArrowRight,
  Loader2,
  Sparkles,
  Settings,
} from 'lucide-react';
import {
  useClient,
  useDrafts,
  useClientAnalytics,
  useChannelSettings,
  useGenerateContent,
  type Channel,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';

export default function OverviewPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const router = useRouter();

  const { data: client } = useClient(clientId);
  const { data: drafts, isLoading: draftsLoading } = useDrafts({
    clientId,
    limit: 5,
  });
  const { data: analytics } = useClientAnalytics(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const generate = useGenerateContent();

  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccess, setBatchSuccess] = useState(false);

  if (!client) return null;
  const base = `/clients/${clientId}`;

  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];

  const quickLinks = [
    { href: `${base}/create`, icon: Wand2, label: 'Create Content', desc: 'Generate on-brand posts' },
    { href: `${base}/planner`, icon: Calendar, label: 'Planner', desc: 'Calendar & queue' },
    { href: `${base}/library`, icon: Library, label: 'Content Library', desc: 'All your drafts' },
    { href: `${base}/analytics`, icon: BarChart3, label: 'Analytics', desc: 'Performance metrics' },
    { href: `${base}/settings/brand`, icon: Settings, label: 'Settings', desc: 'Brand, voice & channels' },
  ];

  const TOPICS = [
    'Share an educational tip relevant to our audience',
    'Tell a behind-the-scenes story about our brand',
    'Highlight a key benefit of our product or service',
    'Post something engaging that encourages comments',
    'Share a motivational or inspirational message aligned with our brand',
  ];

  const handleGenerateBatch = async () => {
    if (enabledChannels.length === 0) return;
    setIsBatchGenerating(true);
    setBatchError(null);
    setBatchSuccess(false);

    try {
      const channel = enabledChannels[0].channel as Channel;
      for (const topic of TOPICS) {
        await generate.mutateAsync({
          clientId,
          kind: 'POST',
          channel,
          guidance: `[Goal: Growth] ${topic}`,
        });
      }
      setBatchSuccess(true);
      // Notify backend for BATCH_COMPLETE notification
      fetch('/api/proxy/clients/' + clientId + '/batch-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: TOPICS.length }),
      }).catch(() => {});
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total drafts" value={analytics?.total ?? 0} />
        <StatCard
          label="Approved"
          value={
            (analytics?.byStatus?.APPROVED ?? 0) +
            (analytics?.byStatus?.PUBLISHED ?? 0) +
            (analytics?.byStatus?.SCHEDULED ?? 0)
          }
        />
        <StatCard label="Pending" value={analytics?.byStatus?.PENDING_REVIEW ?? 0} />
        <StatCard
          label="Approval rate"
          value={`${Math.round((analytics?.approvalRate ?? 0) * 100)}%`}
        />
      </div>

      {/* Instant content CTA */}
      <div className="card p-6 bg-gradient-to-r from-accent-green-110/10 to-transparent border-accent-green-110/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-white-100">Quick start</h2>
            <p className="text-sm text-white-40 mt-1">
              Generate 5 posts for this week with one click.
            </p>
          </div>
          <button
            onClick={handleGenerateBatch}
            disabled={isBatchGenerating || enabledChannels.length === 0}
            className="px-5 py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBatchGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate 5 posts for this week
              </>
            )}
          </button>
        </div>
        {enabledChannels.length === 0 && (
          <p className="text-xs text-white-30 mt-2">
            Enable at least one channel in{' '}
            <Link href={`${base}/settings/media`} className="text-accent-green-110 hover:underline">
              Settings
            </Link>{' '}
            first.
          </p>
        )}
        {batchSuccess && (
          <p className="text-xs text-accent-green-110 mt-2">
            5 posts generated! View them in your{' '}
            <Link href={`${base}/library`} className="underline">Content Library</Link>.
          </p>
        )}
        {batchError && <StatusBanner error={batchError} />}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Workspace
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="card-hover p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                <ql.icon className="w-5 h-5 text-accent-green-110" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white-100">{ql.label}</p>
                <p className="text-xs text-white-40">{ql.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white-40" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent drafts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Recent drafts
          </h2>
          <Link
            href={`${base}/library`}
            className="text-xs text-accent-green-110 hover:underline"
          >
            View all
          </Link>
        </div>

        {draftsLoading && (
          <div className="flex items-center gap-2 py-4">
            <LoadingSpinner size="sm" />
            <span className="text-white-40 text-sm">Loading...</span>
          </div>
        )}

        {drafts && drafts.length === 0 && (
          <div className="card p-6 text-center text-sm text-white-40">
            No drafts yet. Head to{' '}
            <Link
              href={`${base}/create`}
              className="text-accent-green-110 hover:underline"
            >
              Create Content
            </Link>{' '}
            to make one.
          </div>
        )}

        {drafts && drafts.length > 0 && (
          <div className="space-y-2">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`${base}/library`}
                className="card-hover p-4 block"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white-10 text-white-60">
                    {d.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white-10 text-white-60">
                    {d.channel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white-10 text-white-60">
                    {d.kind}
                  </span>
                  <span className="text-xs text-white-40 ml-auto">
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-white-80 line-clamp-2">
                  {d.body || <span className="italic text-white-40">(empty)</span>}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-white-40 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white-100 mt-1">{value}</p>
    </div>
  );
}
