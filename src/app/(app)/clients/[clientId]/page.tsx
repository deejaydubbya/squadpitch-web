'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Building2,
  Megaphone,
  Image as ImageIcon,
  Wand2,
  ListTodo,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { useClient, useDrafts, useClientAnalytics } from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function OverviewPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const { data: client } = useClient(clientId);
  const { data: drafts, isLoading: draftsLoading } = useDrafts({
    clientId,
    limit: 5,
  });
  const { data: analytics } = useClientAnalytics(clientId);

  if (!client) return null;
  const base = `/clients/${clientId}`;

  const quickLinks = [
    { href: `${base}/brand`, icon: Building2, label: 'Brand profile', ready: Boolean(client.brandProfile) },
    { href: `${base}/voice`, icon: Megaphone, label: 'Voice & rules', ready: Boolean(client.voiceProfile) },
    { href: `${base}/media`, icon: ImageIcon, label: 'Media strategy', ready: Boolean(client.mediaProfile) },
    { href: `${base}/generate`, icon: Wand2, label: 'Generate content', ready: true },
    { href: `${base}/queue`, icon: ListTodo, label: 'Review queue', ready: true },
    { href: `${base}/analytics`, icon: BarChart3, label: 'Analytics', ready: true },
  ];

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
                <p className="text-xs text-white-40">
                  {ql.ready ? 'Ready' : 'Not configured'}
                </p>
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
            href={`${base}/queue`}
            className="text-xs text-accent-green-110 hover:underline"
          >
            View all
          </Link>
        </div>

        {draftsLoading && (
          <div className="flex items-center gap-2 py-4">
            <LoadingSpinner size="sm" />
            <span className="text-white-40 text-sm">Loading…</span>
          </div>
        )}

        {drafts && drafts.length === 0 && (
          <div className="card p-6 text-center text-sm text-white-40">
            No drafts yet. Head to{' '}
            <Link
              href={`${base}/generate`}
              className="text-accent-green-110 hover:underline"
            >
              Generate
            </Link>{' '}
            to create one.
          </div>
        )}

        {drafts && drafts.length > 0 && (
          <div className="space-y-2">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`${base}/queue`}
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
