'use client';

// Create-a-page wizard. Thin route wrapper; the wizard itself
// lives in _components so the logic is reusable in future
// surfaces (e.g. a "create from campaign" link in the campaigns
// list could open the same wizard pre-seeded).
//
// Accepts deep-link query params so any "Create landing page"
// CTA in the dashboard (campaign sections, property cards,
// content asset cards) can route here pre-seeded:
//   /sites/new?sourceType=PROPERTY&sourceId=<id>&pageGoal=LISTING

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { SiteCreateWizard } from '../_components/SiteCreateWizard';
import type { SiteSourceType, SitePageGoal } from '@/hooks/useSites';

const SOURCE_VALUES: SiteSourceType[] = ['CAMPAIGN', 'PROPERTY', 'DATA_ITEM', 'IDEA'];
const GOAL_VALUES: SitePageGoal[] = [
  'LEAD_CAPTURE',
  'LISTING',
  'OFFER',
  'EVENT',
  'CONSULTATION',
];

function pickEnum<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  if (!raw) return null;
  // Accept both UPPER and lower-case so dashboard URLs can be friendly.
  const upper = raw.toUpperCase() as T;
  return (allowed as readonly string[]).includes(upper) ? upper : null;
}

export default function NewSitePage() {
  const params = useParams<{ clientId: string }>();
  const { clientId } = params;
  const search = useSearchParams();

  const initialSourceType = pickEnum(search.get('sourceType'), SOURCE_VALUES);
  const initialSourceId = search.get('sourceId') || null;
  const initialPageGoal = pickEnum(search.get('pageGoal'), GOAL_VALUES);

  return (
    <div className="space-y-6">
      <Link
        href={`/workspaces/${clientId}/sites`}
        className="inline-flex items-center gap-1.5 text-sm text-white-50 hover:text-white-100"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Sites
      </Link>
      <SiteCreateWizard
        clientId={clientId}
        initialSourceType={initialSourceType}
        initialSourceId={initialSourceId}
        initialPageGoal={initialPageGoal}
      />
    </div>
  );
}
