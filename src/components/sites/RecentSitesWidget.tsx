'use client';

// Dashboard "Recent sites" widget. Surfaces the most-recent
// SitePages for the workspace + a CTA to open the wizard.
// Auto-hides when:
//   - The suite.sites feature flag is off (workspace doesn't
//     have access)
//   - There are no pages yet, since the dashboard already has
//     plenty of "create your first X" empty states
//
// Kept compact — three rows + footer link. The full inventory
// lives at /workspaces/[id]/sites.

import Link from 'next/link';
import { Globe, ArrowRight, Wand2, ExternalLink } from 'lucide-react';
import { useSuiteFlags, useClient } from '@/hooks/useSquadpitch';
import { usePages, type PageListItem } from '@/hooks/useSites';
import { cn } from '@/lib/utils';

interface Props {
  clientId: string;
  base: string;
}

export function RecentSitesWidget({ clientId, base }: Props) {
  const { data: flags } = useSuiteFlags(clientId);
  const { data: client } = useClient(clientId);
  const { data: pages, isLoading } = usePages(flags?.sites ? clientId : undefined);

  // Flag off → render nothing. Auth/flag changes are picked up
  // by the underlying hooks so the widget can mount/unmount
  // without a re-render of the parent dashboard.
  if (!flags?.sites) return null;
  if (isLoading) return null;
  if (!pages || pages.length === 0) return null;

  // Sort most recently updated first, take the top 4.
  const sorted = [...pages].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const top = sorted.slice(0, 4);
  const remaining = pages.length - top.length;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-green-110/15 text-accent-green-110 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white-90">Landing pages</h2>
            <p className="text-xs text-white-40">
              {pages.length} page{pages.length === 1 ? '' : 's'} in this workspace
            </p>
          </div>
        </div>
        <Link
          href={`${base}/sites/new`}
          className="text-xs font-medium text-accent-green-110 hover:underline inline-flex items-center gap-1"
        >
          <Wand2 className="w-3.5 h-3.5" />
          New
        </Link>
      </div>

      <div className="space-y-1">
        {top.map((page) => (
          <PageRow
            key={page.id}
            page={page}
            base={base}
            clientSlug={client?.slug ?? null}
          />
        ))}
      </div>

      <Link
        href={`${base}/sites`}
        className="flex items-center justify-between text-xs text-white-50 hover:text-white-100 pt-1"
      >
        <span>
          {remaining > 0
            ? `View all (${pages.length})`
            : 'Open sites dashboard'}
        </span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function PageRow({
  page,
  base,
  clientSlug,
}: {
  page: PageListItem;
  base: string;
  clientSlug: string | null;
}) {
  const liveUrl =
    clientSlug && page.status === 'PUBLISHED'
      ? `https://${clientSlug}.squadpitchsites.com/${page.slug}`
      : null;

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white-5">
      <Link
        href={`${base}/sites/pages/${page.id}`}
        className="flex-1 min-w-0 flex items-center gap-2"
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            page.status === 'PUBLISHED'
              ? 'bg-accent-green-110'
              : page.status === 'DRAFT'
                ? 'bg-amber-300'
                : 'bg-white-30',
          )}
        />
        <div className="min-w-0">
          <p className="text-sm text-white-90 truncate">{page.title}</p>
          <p className="text-[11px] text-white-40 font-mono truncate">/{page.slug}</p>
        </div>
      </Link>
      {liveUrl && (
        <a
          href={liveUrl}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-lg text-white-40 hover:text-white-100 hover:bg-white-10 shrink-0"
          title="View live page"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
