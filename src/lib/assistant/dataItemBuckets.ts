// Shared helpers for the assistant's Content Asset pickers
// (CampaignDataItemCard for campaigns; QuickPostDataCard for single
// posts).
//
// The audit (spinstr381) confirmed Squadpitch already has 11
// WorkspaceDataItem types; the assistant just lumped them into one
// flat list. This module defines the user-facing buckets +
// type-specific preview rendering so users can find a testimonial
// without scrolling past every milestone and FAQ.
//
// Property/Listing items (`type: 'PROPERTY'`) deliberately don't
// appear here — they're picked via PropertySelectCard.

import type { WorkspaceDataItem } from '@/hooks/useSquadpitch';

// WorkspaceDataItem.type values that the buckets here cover. Mirrors
// the enum in prisma/schema.prisma; PROPERTY is excluded since
// listings go through their own picker.
export type ContentAssetType =
  | 'TESTIMONIAL'
  | 'CASE_STUDY'
  | 'PRODUCT_LAUNCH'
  | 'PROMOTION'
  | 'STATISTIC'
  | 'MILESTONE'
  | 'FAQ'
  | 'TEAM_SPOTLIGHT'
  | 'INDUSTRY_NEWS'
  | 'EVENT'
  | 'CUSTOM';

export interface ContentAssetBucket {
  /** Stable bucket key (used in component state) */
  key: string;
  /** User-facing chip label */
  label: string;
  /** WorkspaceDataItem.type values this bucket includes */
  types: ContentAssetType[];
}

// Order matters — left-to-right in the chip row.
export const CONTENT_ASSET_BUCKETS: ContentAssetBucket[] = [
  // 'all' is the default — every non-PROPERTY type. types: [] means
  // "no type filter applied".
  { key: 'all', label: 'All', types: [] },
  { key: 'testimonials', label: 'Testimonials', types: ['TESTIMONIAL'] },
  { key: 'offers', label: 'Offers', types: ['PROMOTION', 'PRODUCT_LAUNCH'] },
  { key: 'case_studies', label: 'Case studies', types: ['CASE_STUDY'] },
  { key: 'events', label: 'Events', types: ['EVENT', 'MILESTONE'] },
  { key: 'faqs', label: 'FAQs', types: ['FAQ'] },
  { key: 'team', label: 'Team', types: ['TEAM_SPOTLIGHT'] },
  { key: 'stats', label: 'Stats', types: ['STATISTIC'] },
  { key: 'news', label: 'News', types: ['INDUSTRY_NEWS'] },
  // CUSTOM + any future type that doesn't have a dedicated bucket
  // falls through to "Other". Bucket membership for Other is
  // determined dynamically (see bucketForType below) so this list
  // doesn't have to enumerate everything.
  { key: 'other', label: 'Other', types: ['CUSTOM'] },
];

const BUCKETED_TYPES = new Set<ContentAssetType>(
  CONTENT_ASSET_BUCKETS.flatMap((b) => b.types),
);

// Map a data item type to its bucket key. Anything not explicitly
// covered above lands in "other".
export function bucketKeyForType(type: string): string {
  for (const b of CONTENT_ASSET_BUCKETS) {
    if (b.key === 'all') continue;
    if ((b.types as readonly string[]).includes(type)) return b.key;
  }
  return 'other';
}

// Returns the items belonging to a given bucket. 'all' returns every
// non-PROPERTY item; named buckets filter by their type list (plus
// "other" sweeps up any type not explicitly bucketed).
export function filterByBucket(
  items: WorkspaceDataItem[],
  bucketKey: string,
): WorkspaceDataItem[] {
  if (bucketKey === 'all') {
    return items.filter((i) => i.type !== 'PROPERTY');
  }
  const bucket = CONTENT_ASSET_BUCKETS.find((b) => b.key === bucketKey);
  if (!bucket) return items;
  if (bucketKey === 'other') {
    // "Other" = anything not explicitly bucketed + CUSTOM. Also
    // excludes PROPERTY for the same reason as 'all'.
    return items.filter(
      (i) =>
        i.type !== 'PROPERTY' &&
        !BUCKETED_TYPES.has(i.type as ContentAssetType),
    );
  }
  return items.filter((i) => (bucket.types as readonly string[]).includes(i.type));
}

// ── Type-specific preview rendering ─────────────────────────────────
//
// Each picker row shows a small per-type preview rather than just
// "title". Keeps the picker scannable — users can recognize the
// right testimonial without opening it. All accessors are defensive
// since dataJson is free-form per spec.

interface PreviewLine {
  /** Bold first line (e.g. the quote, the FAQ question) */
  primary: string;
  /** Smaller secondary line (e.g. attribution, answer preview) */
  secondary: string | null;
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function getDataItemPreview(item: WorkspaceDataItem): PreviewLine {
  const j = (item.dataJson ?? {}) as Record<string, unknown>;
  switch (item.type) {
    case 'TESTIMONIAL': {
      // strongQuotes is sometimes a curated array — prefer the
      // first; otherwise fall back to the freeform `quote` field.
      const quotes = Array.isArray(j.strongQuotes) ? j.strongQuotes : [];
      const firstQuote = asString(quotes[0]) ?? asString(j.quote) ?? item.summary ?? item.title;
      const author = asString(j.author) ?? asString(j.client) ?? asString(j.source) ?? null;
      const role = asString(j.role) ?? asString(j.title) ?? null;
      const attribution = author && role ? `${author}, ${role}` : author ?? null;
      return {
        primary: firstQuote ? `“${truncate(firstQuote, 90)}”` : item.title,
        secondary: attribution,
      };
    }
    case 'CASE_STUDY': {
      const result = asString(j.result) ?? null;
      const client = asString(j.client) ?? asString(j.customer) ?? null;
      const secondary = [client, result].filter(Boolean).join(' — ') || item.summary;
      return { primary: item.title, secondary };
    }
    case 'PRODUCT_LAUNCH': {
      const product = asString(j.productName) ?? item.title;
      const launch = asString(j.launchDate) ?? null;
      const features = Array.isArray(j.features) ? (j.features as unknown[]).map(asString).filter(Boolean).join(', ') : null;
      const secondary = [launch, features].filter(Boolean).join(' · ') || item.summary;
      return { primary: product, secondary };
    }
    case 'PROMOTION': {
      const offer = asString(j.offer) ?? asString(j.discount) ?? null;
      const code = asString(j.code) ?? null;
      const deadline = asString(j.deadline) ?? null;
      const parts = [offer, code ? `code ${code}` : null, deadline ? `ends ${deadline}` : null].filter(Boolean);
      return { primary: item.title, secondary: parts.length > 0 ? parts.join(' · ') : item.summary };
    }
    case 'STATISTIC': {
      const metric = asString(j.metric) ?? item.title;
      const value = asString(j.value) ?? null;
      const ctx = asString(j.context) ?? null;
      return {
        primary: value ? `${metric}: ${value}` : metric,
        secondary: ctx ?? item.summary,
      };
    }
    case 'MILESTONE': {
      const date = asString(j.date) ?? asString(j.achievedAt) ?? null;
      return { primary: item.title, secondary: date ?? item.summary };
    }
    case 'EVENT': {
      const date = asString(j.date) ?? asString(j.startsAt) ?? null;
      const location = asString(j.location) ?? null;
      const secondary = [date, location].filter(Boolean).join(' · ') || item.summary;
      return { primary: item.title, secondary };
    }
    case 'FAQ': {
      const q = asString(j.question) ?? item.title;
      const a = asString(j.answer) ?? item.summary;
      return { primary: q, secondary: a ? truncate(a, 110) : null };
    }
    case 'TEAM_SPOTLIGHT': {
      const name = asString(j.name) ?? item.title;
      const role = asString(j.role) ?? null;
      const funFact = asString(j.funFact) ?? null;
      const secondary = [role, funFact].filter(Boolean).join(' · ') || item.summary;
      return { primary: name, secondary };
    }
    case 'INDUSTRY_NEWS': {
      return { primary: item.title, secondary: item.summary };
    }
    case 'CUSTOM':
    default:
      return { primary: item.title, secondary: item.summary };
  }
}
