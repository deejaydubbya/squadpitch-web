import type { AutopilotCampaignStatus } from '@/hooks/useSquadpitch';

// ── Status Display ────────────────────────────────────────────────────────

// Status badge shown on each recommendation card. `pending` is
// the default state — no badge needed because the recommendation
// itself communicates "needs review." `ready` (DRAFT_GENERATED)
// gets "Drafts Ready" so the user knows the next click target.
export const STATUS_DISPLAY: Record<AutopilotCampaignStatus, { label: string; className: string } | null> = {
  pending: null,
  generating: null,
  ready: { label: 'Drafts Ready', className: 'bg-accent-green-110/15 text-accent-green-110' },
  approved: { label: 'Approved', className: 'bg-green-500/15 text-green-400' },
  // Spinstr06 — backend SCHEDULED rows now flow through as
  // 'scheduled' so the command-center tab surfaces them.
  scheduled: { label: 'Scheduled', className: 'bg-violet-500/15 text-violet-400' },
  dismissed: { label: 'Dismissed', className: 'bg-white-10 text-white-40' },
  expired: { label: 'Expired', className: 'bg-white-10 text-white-40' },
  converted: { label: 'Converted', className: 'bg-blue-500/15 text-blue-400' },
  launched: { label: 'Launched', className: 'bg-purple-500/15 text-purple-400' },
};

// ── Channel Labels ────────────────────────────────────────────────────────

export const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  X: 'X',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
  PINTEREST: 'Pinterest',
  THREADS: 'Threads',
  REDDIT: 'Reddit',
};

// ── Campaign Type Labels ──────────────────────────────────────────────────

import { getCampaignTypeLabel } from '@/lib/assistant/adapterRegistry';

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  just_listed: 'Just Listed',
  open_house: 'Open House',
  price_drop: 'Price Drop',
  general_promotion: 'General Promotion',
  // Automotive
  just_arrived: 'Just Arrived',
  featured_vehicle: 'Featured Vehicle',
  financing_offer: 'Financing Offer',
};

/**
 * Industry-aware campaign type label resolver.
 */
export function resolveCampaignTypeLabel(value: string, industryKey?: string): string {
  if (industryKey) {
    return getCampaignTypeLabel(value, industryKey);
  }
  return CAMPAIGN_TYPE_LABELS[value] ?? value.replace(/_/g, ' ');
}

// ── Expiry Helpers ────────────────────────────────────────────────────────

export function formatRelativeExpiry(iso: string | null): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Expires in ${days}d`;
  }
  return `Expires in ${hours}h`;
}

export function isExpiringSoon(iso: string | null): boolean {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

// ── Status Helpers ────────────────────────────────────────────────────────

export function isInactiveStatus(status: AutopilotCampaignStatus): boolean {
  return (
    status === 'approved' ||
    status === 'scheduled' ||
    status === 'dismissed' ||
    status === 'expired' ||
    status === 'converted' ||
    status === 'launched'
  );
}
