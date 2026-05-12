'use client';

// Content Sources settings page.
//
// Overview of the data the Squadpitch assistant can pull from when
// building posts and campaigns. This page is a settings-friendly
// surface — comprehensive editing still lives at /data, which this
// page links into with `?type=<TYPE>` deep-links so "Manage
// Testimonials" lands the user already filtered.
//
// Each category card shows a count, a readiness summary, the most
// recent few items, and per-item Create CTAs that use the new
// `?intent=` route contract.

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Home,
  MessageSquareQuote,
  Tag,
  HelpCircle,
  CalendarDays,
  BarChart3,
  Users,
  Plus,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useClient,
  useDataItems,
  type DataItemType,
  type WorkspaceDataItem,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// ── Category model ──────────────────────────────────────────────────
//
// A "category" is one or more DataItemTypes grouped under a single
// label the user understands. The first type in `types` is the
// canonical one used for deep-links into /data (which filters on a
// single type today).
interface Category {
  key: string;
  label: string;
  description: string;
  Icon: typeof Home;
  /** Types this category includes. Counts and lists aggregate across all of these. */
  types: DataItemType[];
  /**
   * `property` opens /data?tab=properties; everything else opens
   * /data?tab=knowledge&type=<first type>.
   */
  variant: 'property' | 'knowledge';
}

const CATEGORIES: Category[] = [
  {
    key: 'properties',
    label: 'Properties / Listings',
    description: 'Homes, units, or listings you sell or showcase. Powers listing-driven campaigns.',
    Icon: Home,
    types: ['PROPERTY'],
    variant: 'property',
  },
  {
    key: 'testimonials',
    label: 'Testimonials / Reviews',
    description: 'Client quotes and success stories the assistant can repurpose into social proof posts.',
    Icon: MessageSquareQuote,
    types: ['TESTIMONIAL', 'CASE_STUDY'],
    variant: 'knowledge',
  },
  {
    key: 'offers',
    label: 'Offers / Promotions',
    description: 'Current sales, launches, and limited-time promotions to spotlight.',
    Icon: Tag,
    types: ['PROMOTION', 'PRODUCT_LAUNCH'],
    variant: 'knowledge',
  },
  {
    key: 'faqs',
    label: 'FAQs',
    description: 'Common questions you can turn into educational posts and threads.',
    Icon: HelpCircle,
    types: ['FAQ'],
    variant: 'knowledge',
  },
  {
    key: 'events',
    label: 'Events',
    description: 'Upcoming events the assistant can promote and recap.',
    Icon: CalendarDays,
    types: ['EVENT'],
    variant: 'knowledge',
  },
  {
    key: 'stats',
    label: 'Stats / Milestones',
    description: 'Market statistics, numbers, and milestones that anchor authority content.',
    Icon: BarChart3,
    types: ['STATISTIC', 'MILESTONE', 'INDUSTRY_NEWS'],
    variant: 'knowledge',
  },
  {
    key: 'team',
    label: 'Team Spotlight',
    description: 'Profile your team — bios, expertise, behind-the-scenes moments.',
    Icon: Users,
    types: ['TEAM_SPOTLIGHT'],
    variant: 'knowledge',
  },
  {
    key: 'custom',
    label: 'Custom',
    description: 'Anything else you want the assistant to know about — services, brand notes, programs.',
    Icon: Plus,
    types: ['CUSTOM'],
    variant: 'knowledge',
  },
];

// ── Readiness ───────────────────────────────────────────────────────
//
// A data item is "ready for campaigns" when it has enough body to
// generate from — concretely a non-empty title plus either a
// summary or some structured data. Items that don't meet that bar
// surface as "Needs more details" so the user knows where to focus.
function isReadyForCampaigns(item: WorkspaceDataItem): boolean {
  if (!item.title || item.title.trim().length < 3) return false;
  if (item.summary && item.summary.trim().length > 10) return true;
  if (item.dataJson && Object.keys(item.dataJson).length > 0) return true;
  return false;
}

function isUsedRecently(item: WorkspaceDataItem): boolean {
  if (!item.lastUsedAt) return false;
  const ageMs = Date.now() - new Date(item.lastUsedAt).getTime();
  return ageMs < 30 * 24 * 60 * 60 * 1000;
}

function isTopPerforming(item: WorkspaceDataItem): boolean {
  const eng = item.performance?.avgEngagement;
  return eng != null && eng > 5;
}

// ── Page ────────────────────────────────────────────────────────────

export default function ContentSourcesSettingsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const { data: client } = useClient(clientId);
  // One bulk fetch (active items only) — categories slice this
  // client-side rather than firing per-type queries.
  const { data: items, isLoading } = useDataItems(clientId, {
    status: 'ACTIVE',
  });

  const base = `/workspaces/${clientId}`;

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, WorkspaceDataItem[]>();
    if (!items) return map;
    for (const cat of CATEGORIES) {
      const list = items
        .filter((i) => cat.types.includes(i.type))
        .sort((a, b) => {
          // Most recently updated first — that's typically what
          // users want to see when scanning "what's there."
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
      map.set(cat.key, list);
    }
    return map;
  }, [items]);

  if (isLoading || !client) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading content sources…</span>
      </div>
    );
  }

  const totalActive = items?.length ?? 0;
  const totalReady = (items ?? []).filter(isReadyForCampaigns).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-white-100">Content Sources</h2>
        <p className="text-sm text-white-40 mt-0.5">
          Squadpitch uses these sources to create better posts and
          campaigns. Add more of any category to give the assistant
          richer material to work with.
        </p>
      </div>

      {/* Summary + global CTAs */}
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white-100">{totalActive}</span>
          <span className="text-xs text-white-40">active sources</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-accent-green-110">{totalReady}</span>
          <span className="text-xs text-white-40">ready for campaigns</span>
        </div>
        <div className="flex-1" />
        <Link
          href={`${base}/data`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-bg text-xs font-semibold hover:bg-accent-green-110/90 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add or edit sources
        </Link>
        <Link
          href={`${base}/data?import=true`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white-10 text-white-80 text-xs font-semibold hover:bg-white-20 transition-colors"
        >
          <Upload className="w-3 h-3" />
          Import
        </Link>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.key}
            category={cat}
            base={base}
            items={itemsByCategory.get(cat.key) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function CategoryCard({
  category,
  base,
  items,
}: {
  category: Category;
  base: string;
  items: WorkspaceDataItem[];
}) {
  const count = items.length;
  const readyCount = items.filter(isReadyForCampaigns).length;
  const recentlyUsedCount = items.filter(isUsedRecently).length;
  const topPerformingCount = items.filter(isTopPerforming).length;

  const manageHref =
    category.variant === 'property'
      ? `${base}/data?tab=properties`
      : `${base}/data?tab=knowledge&type=${category.types[0]}`;

  return (
    <div className="card p-5 space-y-3 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white-5 flex items-center justify-center shrink-0">
          <category.Icon className="w-4 h-4 text-accent-green-110" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-white-100">{category.label}</h3>
            <span className="text-xs text-white-40">{count}</span>
          </div>
          <p className="text-xs text-white-40 mt-0.5">{category.description}</p>
        </div>
      </div>

      {/* Readiness chips */}
      {count > 0 && (
        <div className="flex flex-wrap gap-1">
          <Chip
            label={`${readyCount} ready for campaigns`}
            tone={readyCount === count ? 'green' : readyCount > 0 ? 'neutral' : 'amber'}
          />
          {readyCount < count && (
            <Chip
              label={`${count - readyCount} need details`}
              tone="amber"
            />
          )}
          {recentlyUsedCount > 0 && (
            <Chip label={`${recentlyUsedCount} used recently`} tone="neutral" />
          )}
          {topPerformingCount > 0 && (
            <Chip label={`${topPerformingCount} top performing`} tone="green" />
          )}
        </div>
      )}

      {/* Recent items preview */}
      {items.length > 0 ? (
        <ul className="space-y-1 pt-1">
          {items.slice(0, 3).map((item) => (
            <li key={item.id}>
              <ItemRow item={item} category={category} base={base} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-white-40 italic">
          No {category.label.toLowerCase()} yet.
        </p>
      )}

      {/* Footer CTAs */}
      <div className="flex items-center gap-2 pt-2 mt-auto">
        <Link
          href={manageHref}
          className="flex items-center gap-1 text-xs font-medium text-accent-green-110 hover:text-accent-green-110/80 transition-colors"
        >
          Manage
          <ChevronRight className="w-3 h-3" />
        </Link>
        <span className="text-white-20 text-xs">·</span>
        <Link
          href={`${base}/data?tab=${category.variant === 'property' ? 'properties' : 'knowledge'}`}
          className="text-xs text-white-40 hover:text-white-80 transition-colors"
        >
          + Add new
        </Link>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  category,
  base,
}: {
  item: WorkspaceDataItem;
  category: Category;
  base: string;
}) {
  // Source type for the /create deep-link: property assets land
  // on the property path, everything else on the content-asset
  // path. Keeps the /create route contract consistent.
  const sourceType: 'property' | 'content_asset' =
    category.variant === 'property' ? 'property' : 'content_asset';

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-xs text-white-80 truncate flex-1">{item.title}</span>
      <Link
        href={`${base}/create?intent=campaign&sourceType=${sourceType}&sourceId=${item.id}`}
        className="opacity-0 group-hover:opacity-100 text-[10px] text-white-40 hover:text-accent-green-110 transition-all whitespace-nowrap"
        title="Create campaign from this source"
      >
        Campaign
      </Link>
      <Link
        href={`${base}/create?intent=single_post&sourceType=${sourceType}&sourceId=${item.id}`}
        className="opacity-0 group-hover:opacity-100 text-[10px] text-white-40 hover:text-accent-green-110 transition-all whitespace-nowrap"
        title="Create single post from this source"
      >
        Post
      </Link>
      <ArrowRight className="w-3 h-3 text-white-20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: 'green' | 'amber' | 'neutral';
}) {
  return (
    <span
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
        tone === 'green' && 'bg-accent-green-110/15 text-accent-green-110',
        tone === 'amber' && 'bg-amber-500/15 text-amber-300',
        tone === 'neutral' && 'bg-white-10 text-white-60',
      )}
    >
      {label}
    </span>
  );
}
