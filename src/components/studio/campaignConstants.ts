/** Shared campaign constants and helpers used by CampaignSection, CampaignFocusView, and PlannerView. */

import { getCampaignTypeLabel } from '@/lib/assistant/adapterRegistry';

/**
 * Legacy campaign type labels for backward compatibility.
 * Prefer getCampaignTypeLabel(value, industryKey) for industry-aware resolution.
 */
export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  just_listed: 'Just Listed',
  open_house: 'Open House',
  price_drop: 'Price Drop',
  just_sold: 'Just Sold',
  listing_spotlight: 'Spotlight',
  // Automotive
  just_arrived: 'Just Arrived',
  featured_vehicle: 'Featured Vehicle',
  financing_offer: 'Financing Offer',
};

/**
 * Industry-aware campaign type label resolver.
 * Falls back to CAMPAIGN_TYPE_LABELS for types not in the adapter.
 */
export function resolveCampaignTypeLabel(value: string, industryKey?: string): string {
  if (industryKey) {
    return getCampaignTypeLabel(value, industryKey);
  }
  return CAMPAIGN_TYPE_LABELS[value] ?? value.replace(/_/g, ' ');
}

export const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  X: 'X',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
};

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
