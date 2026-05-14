'use client';

// Drop-in "Create landing page" / "View landing page" action.
//
// Pass a source (campaign / property / data_item) and the
// component figures out whether a SitePage already exists for
// that source. If so it links to the editor; if not it links
// to the wizard pre-seeded with the source.
//
// Used in:
//   - CampaignSection (Planner)
//   - PropertyDetailDrawer
//   - DataItemCard
//   - CampaignReviewCard (post-generate)
//
// Stays out of dashboard chrome by accepting `variant` so each
// caller picks the visual treatment that matches its context.

import Link from 'next/link';
import { Globe, Plus } from 'lucide-react';
import {
  useSitePagesForSource,
  type SiteSourceType,
  type SitePageGoal,
} from '@/hooks/useSites';
import { cn } from '@/lib/utils';

type Variant = 'button-primary' | 'button-ghost' | 'link' | 'icon';

interface CreateLandingPageActionProps {
  clientId: string;
  sourceType: SiteSourceType;
  sourceId: string | null | undefined;
  /** Suggested goal — pre-seeds the wizard. Optional. */
  pageGoal?: SitePageGoal;
  /** Visual treatment. */
  variant?: Variant;
  /** Override the labels if the default phrasing doesn't fit the surface. */
  createLabel?: string;
  viewLabel?: string;
  className?: string;
}

export function CreateLandingPageAction({
  clientId,
  sourceType,
  sourceId,
  pageGoal,
  variant = 'button-ghost',
  createLabel = 'Create landing page',
  viewLabel = 'View landing page',
  className,
}: CreateLandingPageActionProps) {
  const { matches, isLoading } = useSitePagesForSource(
    clientId,
    sourceType,
    sourceId ?? null,
  );

  // No sourceId yet (e.g. campaign hasn't been saved) — render
  // nothing rather than a broken link.
  if (!sourceId) return null;

  const existing = matches[0] ?? null;

  const href = existing
    ? `/workspaces/${clientId}/sites/pages/${existing.id}`
    : buildCreateHref(clientId, sourceType, sourceId, pageGoal);

  const label = existing ? viewLabel : createLabel;

  const baseClass = cn(
    variant === 'button-primary' && 'btn btn-primary text-sm inline-flex items-center gap-1.5',
    variant === 'button-ghost' &&
      'btn btn-ghost border border-white-15 text-sm inline-flex items-center gap-1.5',
    variant === 'link' &&
      'inline-flex items-center gap-1.5 text-sm text-accent-green-110 hover:underline',
    variant === 'icon' &&
      'p-1.5 rounded-lg text-white-40 hover:text-accent-green-110 hover:bg-accent-green-110/10 transition-colors',
    className,
  );

  // While the pages list is loading, show the create state by
  // default — flipping to "View" after the data arrives is less
  // jarring than the reverse. Keeps the link clickable too.
  return (
    <Link
      href={href}
      className={baseClass}
      aria-busy={isLoading || undefined}
      title={variant === 'icon' ? label : undefined}
      aria-label={variant === 'icon' ? label : undefined}
    >
      {existing ? (
        <Globe className="w-4 h-4" />
      ) : variant === 'icon' ? (
        // Use Globe in icon variant so the icon doesn't switch
        // shape between create + view states — only the title
        // changes. Less visually jarring in a tight icon row.
        <Globe className="w-3.5 h-3.5" />
      ) : (
        <Plus className="w-4 h-4" />
      )}
      {variant !== 'icon' && label}
    </Link>
  );
}

function buildCreateHref(
  clientId: string,
  sourceType: SiteSourceType,
  sourceId: string,
  pageGoal: SitePageGoal | undefined,
): string {
  const params = new URLSearchParams({
    sourceType,
    sourceId,
  });
  if (pageGoal) params.set('pageGoal', pageGoal);
  return `/workspaces/${clientId}/sites/new?${params.toString()}`;
}
