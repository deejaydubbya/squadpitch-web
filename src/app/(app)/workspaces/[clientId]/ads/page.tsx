'use client';

// SquadAds index — list of ad packages with stats header and a New
// Ad Package CTA. Feature-flagged behind useSuiteFlags().ads; when
// disabled, falls back to the ModuleShell "Coming Soon" surface
// exactly like Inbox and Sites.
//
// Strict naming: every user-facing label says "ad package" (or
// "Ad packages") — never "ad campaign" — because the existing
// Campaign model is for the content pipeline. Mention "campaign"
// only when referring to the external paid campaign the user will
// eventually launch from the exported bundle.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Megaphone,
  Plus,
  ArrowRight,
  FileText,
  Sparkles,
  Globe,
} from 'lucide-react';
import { useSuiteFlags } from '@/hooks/useSquadpitch';
import {
  useAdPackages,
  useAdsStats,
  type AdPackageStatus,
  type AdPackageListRow,
} from '@/hooks/useAds';
import { ModuleShell, type ModuleShellLink } from '@/components/suite/ModuleShell';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const STATUS_FILTERS: { value: AdPackageStatus | 'ALL'; label: string }[] = [
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'READY', label: 'Ready' },
  { value: 'EXPORTED', label: 'Exported' },
  { value: 'ALL', label: 'All' },
];

export default function AdsIndexPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { data: flags, isLoading: flagsLoading } = useSuiteFlags(clientId);

  const [status, setStatus] = useState<AdPackageStatus | 'ALL'>('DRAFT');
  const flagEnabled = flags?.ads ?? false;
  const { data: stats } = useAdsStats(clientId, flagEnabled);
  const { data: list, isLoading: listLoading } = useAdPackages(
    flagEnabled ? clientId : undefined,
    { status: status === 'ALL' ? undefined : status, limit: 100 },
  );

  if (flags && !flagEnabled) {
    const links: ModuleShellLink[] = [
      {
        label: 'Sites',
        href: `/workspaces/${clientId}/sites`,
        description: 'Landing pages become the destination URL for ad packages.',
      },
      {
        label: 'Campaigns',
        href: `/workspaces/${clientId}/campaigns`,
        description: 'Promote any existing content campaign as an ad package.',
      },
      {
        label: 'Analytics',
        href: `/workspaces/${clientId}/analytics`,
        description: 'Measure ad impact alongside organic content performance.',
      },
    ];
    return (
      <ModuleShell
        Icon={Megaphone}
        title="Generate export-ready ad packages"
        description="Squadpitch doesn't launch ads — you generate the creative, audience, and budget here, then export and upload to Meta / Google / TikTok yourself."
        enabled={false}
        isLoading={flagsLoading}
        links={links}
        accentClass="bg-purple-500/15 text-purple-300"
      />
    );
  }

  const rows = list?.packages ?? [];

  return (
    <div className="space-y-5 max-w-6xl">
      <header className="card p-5 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white-100 leading-tight">Ad packages</h1>
              <p className="text-xs text-white-50 mt-0.5 leading-snug max-w-prose">
                Generate ready-to-use ad creative, audience, and budget
                suggestions for your paid campaigns. Squadpitch doesn&apos;t
                launch ads — you export the package and upload it to your ad
                platform yourself.
              </p>
            </div>
          </div>

          <Link
            href={`/workspaces/${clientId}/ads/new`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-accent-green-110 text-sp-bg hover:bg-accent-green-100 transition-colors shrink-0 w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            New ad package
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t border-white-10">
          <StatPill label="Drafts" value={stats?.draftCount} />
          <StatPill label="Ready" value={stats?.readyCount} tone="accent" />
          <StatPill label="Exported" value={stats?.exportedCount} tone="muted" />
          <StatPill label="Total" value={stats?.totalCount} tone="muted" />
        </div>
      </header>

      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
              status === f.value
                ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
                : 'border-transparent text-white-50 hover:text-white-100 hover:bg-white-10',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {listLoading && (
        <div className="card p-6 text-sm text-white-50">Loading ad packages…</div>
      )}

      {!listLoading && rows.length === 0 && (
        <EmptyState clientId={clientId} status={status} />
      )}

      {!listLoading && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <PackageRow key={row.id} row={row} clientId={clientId} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number | undefined;
  tone?: 'default' | 'accent' | 'muted';
}) {
  const toneClass =
    tone === 'accent'
      ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
      : tone === 'muted'
        ? 'bg-white-5 text-white-50 border-white-10'
        : 'bg-white-5 text-white-90 border-white-15';
  return (
    <div
      className={cn(
        'inline-flex items-baseline gap-2 px-2.5 py-1 rounded-lg border',
        toneClass,
      )}
    >
      <span className="text-sm font-bold tabular-nums">{value ?? '—'}</span>
      <span className="text-[10px] uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  );
}

const STATUS_TONE: Record<AdPackageStatus, string> = {
  DRAFT: 'bg-white-10 text-white-70',
  READY: 'bg-accent-green-110/15 text-accent-green-110',
  EXPORTED: 'bg-blue-400/15 text-blue-300',
  ARCHIVED: 'bg-white-5 text-white-40',
};

function PackageRow({ row, clientId }: { row: AdPackageListRow; clientId: string }) {
  const lead = row.creatives[0];
  return (
    <li>
      <Link
        href={`/workspaces/${clientId}/ads/${row.id}`}
        className="card p-4 flex items-start gap-3 hover:border-white-20 transition-colors group"
      >
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-300 flex items-center justify-center shrink-0">
          <Megaphone className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white-100 truncate group-hover:text-white-100">
              {row.name}
            </h3>
            <span
              className={cn(
                'inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                STATUS_TONE[row.status],
              )}
            >
              {row.status.toLowerCase()}
            </span>
            {row.specialCategory !== 'NONE' && (
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-200 border border-amber-400/20">
                {row.specialCategory.toLowerCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white-50">
            <span className="uppercase tracking-wider">{row.objective.toLowerCase()}</span>
            <span>·</span>
            <span>{sourceLabel(row.sourceType)}</span>
            <span>·</span>
            <span>{row.creatives.length} variant{row.creatives.length === 1 ? '' : 's'}</span>
          </div>
          {lead?.headline && (
            <p className="text-xs text-white-60 truncate max-w-prose">
              {lead.headline}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-white-30 group-hover:text-accent-green-110 transition-colors shrink-0 mt-1" />
      </Link>
    </li>
  );
}

function sourceLabel(t: AdPackageListRow['sourceType']): string {
  switch (t) {
    case 'CAMPAIGN':
      return 'From campaign';
    case 'SITE_PAGE':
      return 'From SquadSite page';
    case 'DRAFT':
      return 'From post';
    case 'PROPERTY':
      return 'From property';
    case 'CONTENT_ASSET':
      return 'From content asset';
    case 'IDEA':
      return 'From idea';
    default:
      return t;
  }
}

function EmptyState({
  clientId,
  status,
}: {
  clientId: string;
  status: AdPackageStatus | 'ALL';
}) {
  if (status === 'DRAFT' || status === 'ALL') {
    return (
      <div className="card p-10 text-center space-y-3 max-w-md mx-auto">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 text-purple-300 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-semibold text-white-90">
          No ad packages yet
        </h2>
        <p className="text-xs text-white-50 leading-relaxed">
          Start from a campaign, a SquadSite page, a top-performing post, a
          property, or a free-form idea. Squadpitch generates the copy,
          audience, and budget — you export and upload to your ad platform.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Link
            href={`/workspaces/${clientId}/ads/new`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-bg hover:bg-accent-green-100"
          >
            <Plus className="w-3 h-3" />
            New ad package
          </Link>
          <Link
            href={`/workspaces/${clientId}/sites`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white-60 hover:text-white-100 px-2 py-1.5"
          >
            <Globe className="w-3 h-3" />
            Browse Sites
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="card p-8 text-center space-y-2">
      <FileText className="w-7 h-7 text-white-30 mx-auto" />
      <p className="text-sm font-medium text-white-80">
        {status === 'READY'
          ? 'No packages marked ready'
          : status === 'EXPORTED'
            ? 'No packages exported yet'
            : 'Nothing here'}
      </p>
      <p className="text-xs text-white-50">
        {status === 'READY'
          ? 'Finish a draft and mark it ready for export.'
          : 'Export a ready package to see it listed here.'}
      </p>
    </div>
  );
}
