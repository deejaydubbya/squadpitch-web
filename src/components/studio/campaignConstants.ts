/** Shared campaign constants and helpers used by CampaignSection, CampaignFocusView, and PlannerView. */

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  just_listed: 'Just Listed',
  open_house: 'Open House',
  price_drop: 'Price Drop',
  just_sold: 'Just Sold',
  listing_spotlight: 'Spotlight',
};

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
