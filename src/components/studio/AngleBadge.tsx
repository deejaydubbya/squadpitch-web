'use client';

import { cn } from '@/lib/utils';

/**
 * Angle category → color mapping.
 * Subtle, premium styling for dark theme.
 *
 * listing  = green family
 * buyer    = blue family
 * lifestyle = amber family
 * authority = purple family
 */
const ANGLE_CATEGORY_STYLES: Record<string, string> = {
  listing: 'bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20',
  buyer: 'bg-blue-500/10 text-blue-400/80 border-blue-500/20',
  lifestyle: 'bg-amber-500/10 text-amber-400/80 border-amber-500/20',
  authority: 'bg-purple-500/10 text-purple-400/80 border-purple-500/20',
};

const DEFAULT_STYLE = 'bg-white-10 text-white-50 border-white-10';

/**
 * Well-known angle key → { label, category } mapping.
 * Must stay in sync with backend CONTENT_ANGLES.
 */
const ANGLE_MAP: Record<string, { label: string; category: string }> = {
  listing_spotlight: { label: 'Listing Spotlight', category: 'listing' },
  just_listed: { label: 'Just Listed', category: 'listing' },
  price_opportunity: { label: 'Price Opportunity', category: 'listing' },
  open_house: { label: 'Open House', category: 'listing' },
  first_time_buyer: { label: 'First-Time Buyer', category: 'buyer' },
  investment_potential: { label: 'Investment Potential', category: 'buyer' },
  neighborhood_lifestyle: { label: 'Neighborhood', category: 'lifestyle' },
  family_living: { label: 'Family Living', category: 'lifestyle' },
  market_insight: { label: 'Market Insight', category: 'authority' },
  local_expertise: { label: 'Local Expertise', category: 'authority' },
  trend_commentary: { label: 'Trend Commentary', category: 'authority' },
};

/**
 * Resolve angle info from a key or label.
 * Returns { label, category } or null if unresolvable.
 */
export function resolveAngle(
  angleKey?: string | null,
  angleLabel?: string | null
): { label: string; category: string } | null {
  // Try key first
  if (angleKey && ANGLE_MAP[angleKey]) return ANGLE_MAP[angleKey];

  // Try to find by label match
  if (angleLabel) {
    const byLabel = Object.values(ANGLE_MAP).find(
      (a) => a.label.toLowerCase() === angleLabel.toLowerCase()
    );
    if (byLabel) return byLabel;
    // Return with unknown category
    return { label: angleLabel, category: '' };
  }

  return null;
}

/** Short label for calendar compact mode */
export function shortAngleLabel(
  angleKey?: string | null,
  angleLabel?: string | null
): string | null {
  const resolved = resolveAngle(angleKey, angleLabel);
  if (!resolved) return null;
  // Already short enough — ANGLE_MAP labels are ≤ 20 chars
  return resolved.label;
}

/** Get category color class string for a given category */
export function angleCategoryStyle(category?: string | null): string {
  if (!category) return DEFAULT_STYLE;
  return ANGLE_CATEGORY_STYLES[category] ?? DEFAULT_STYLE;
}

interface AngleBadgeProps {
  angleKey?: string | null;
  angleLabel?: string | null;
  angleCategory?: string | null;
  className?: string;
}

export function AngleBadge({
  angleKey,
  angleLabel,
  angleCategory,
  className,
}: AngleBadgeProps) {
  const resolved = resolveAngle(angleKey, angleLabel);
  if (!resolved) return null;

  const category = angleCategory ?? resolved.category;
  const style = angleCategoryStyle(category);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
        style,
        className
      )}
    >
      {resolved.label}
    </span>
  );
}
