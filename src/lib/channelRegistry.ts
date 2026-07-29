import type { Channel } from "@/hooks/useSquadpitch";

export interface VideoDurationLimits {
  minSec: number;
  maxSec: number;
  recommendedSec: number;
}

export interface ChannelCapability {
  channel: Channel;
  label: string;
  availability: "AVAILABLE" | "BETA" | "COMING_SOON" | "UNAVAILABLE";
  comingSoon?: boolean;
  requiresConnection: boolean;
  requiresMedia: boolean;
  requiresVideo: boolean;
  prefersVideo: boolean;
  preferredVideoAspectRatio?: string;
  videoDurationLimits?: VideoDurationLimits;
  supportsTextOnly: boolean;
  maxCaptionLength: number | null;
}

export const CHANNEL_REGISTRY: Record<Channel, ChannelCapability> = {
  INSTAGRAM: {
    channel: "INSTAGRAM",
    label: "Instagram",
    availability: "BETA",
    requiresConnection: true,
    requiresMedia: true,
    requiresVideo: false,
    prefersVideo: false,
    preferredVideoAspectRatio: "9:16",
    videoDurationLimits: { minSec: 3, maxSec: 90, recommendedSec: 10 },
    supportsTextOnly: false,
    maxCaptionLength: 2200,
  },
  TIKTOK: {
    channel: "TIKTOK",
    label: "TikTok",
    availability: "BETA",
    requiresConnection: true,
    requiresMedia: true,
    requiresVideo: false,
    prefersVideo: true,
    preferredVideoAspectRatio: "9:16",
    videoDurationLimits: { minSec: 3, maxSec: 180, recommendedSec: 10 },
    supportsTextOnly: false,
    maxCaptionLength: 2200,
  },
  YOUTUBE: {
    channel: "YOUTUBE",
    label: "YouTube",
    availability: "BETA",
    requiresConnection: true,
    requiresMedia: true,
    requiresVideo: true,
    prefersVideo: true,
    preferredVideoAspectRatio: "16:9",
    videoDurationLimits: { minSec: 5, maxSec: 600, recommendedSec: 10 },
    supportsTextOnly: false,
    maxCaptionLength: 5000,
  },
  X: {
    channel: "X",
    label: "X",
    availability: "BETA",
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    prefersVideo: false,
    preferredVideoAspectRatio: "16:9",
    videoDurationLimits: { minSec: 1, maxSec: 140, recommendedSec: 10 },
    supportsTextOnly: true,
    maxCaptionLength: 280,
  },
  LINKEDIN: {
    channel: "LINKEDIN",
    // Relabeled from "LinkedIn" to disambiguate from the new
    // Organization Page channel below. Existing LINKEDIN connections
    // are unchanged on the backend — only the user-facing label moves.
    label: "LinkedIn Personal Profile",
    availability: "AVAILABLE",
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    prefersVideo: false,
    preferredVideoAspectRatio: "16:9",
    videoDurationLimits: { minSec: 3, maxSec: 600, recommendedSec: 10 },
    supportsTextOnly: true,
    maxCaptionLength: 3000,
  },
  LINKEDIN_ORGANIZATION_PAGE: {
    channel: "LINKEDIN_ORGANIZATION_PAGE",
    label: "LinkedIn Organization Page",
    availability: "BETA",
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    prefersVideo: false,
    preferredVideoAspectRatio: "16:9",
    videoDurationLimits: { minSec: 3, maxSec: 600, recommendedSec: 10 },
    supportsTextOnly: true,
    maxCaptionLength: 3000,
  },
  FACEBOOK: {
    channel: "FACEBOOK",
    label: "Facebook",
    availability: "BETA",
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    prefersVideo: false,
    preferredVideoAspectRatio: "16:9",
    videoDurationLimits: { minSec: 1, maxSec: 240, recommendedSec: 10 },
    supportsTextOnly: true,
    maxCaptionLength: 63206,
  },
  PINTEREST: {
    channel: "PINTEREST",
    label: "Pinterest",
    availability: "AVAILABLE",
    // Promoted from "coming soon" — image Pin publishing is now
    // supported. Video Pins are not implemented yet (see
    // squadpitch-api/.../publishing/channelAdapters/pinterest.adapter.js).
    requiresConnection: true,
    requiresMedia: true,
    requiresVideo: false,
    prefersVideo: false,
    supportsTextOnly: false,
    maxCaptionLength: 500, // /v5/pins description cap
  },
  THREADS: {
    channel: "THREADS",
    label: "Threads",
    availability: "AVAILABLE",
    // Promoted from "coming soon" — text + image + video publishing
    // is wired via the threads.adapter.js / threads.metrics.js stack.
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    prefersVideo: false,
    preferredVideoAspectRatio: "9:16",
    videoDurationLimits: { minSec: 1, maxSec: 300, recommendedSec: 10 },
    supportsTextOnly: true,
    maxCaptionLength: 500,
  },
  REDDIT: {
    channel: "REDDIT",
    label: "Reddit",
    availability: "COMING_SOON",
    comingSoon: true,
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    prefersVideo: false,
    supportsTextOnly: true,
    maxCaptionLength: 40000,
  },
  // Inbox-only channel. Reviews surface — no publishing capability.
  // Listed here for type completeness (every Channel must be in the
  // registry); requiresMedia/supportsTextOnly are both false because
  // publishing isn't applicable.
  GOOGLE_BUSINESS_PROFILE: {
    channel: "GOOGLE_BUSINESS_PROFILE",
    label: "Google Business Profile",
    availability: "BETA",
    comingSoon: true,
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    prefersVideo: false,
    supportsTextOnly: false,
    maxCaptionLength: null,
  },
};

export function getChannelLabel(channel: Channel): string {
  return CHANNEL_REGISTRY[channel]?.label ?? channel;
}

export function getChannelRequirementHint(channel: Channel): string | null {
  const cap = CHANNEL_REGISTRY[channel];
  if (!cap) return null;
  if (cap.requiresVideo) return "Requires video";
  if (cap.requiresMedia) return "Requires image or video";
  return null;
}

export function getVideoRequirementHint(channel: Channel): string | null {
  const cap = CHANNEL_REGISTRY[channel];
  if (!cap) return null;
  if (cap.requiresVideo) return `${cap.label} requires video`;
  if (cap.prefersVideo) return `${cap.label} works best with video`;
  return null;
}

export function getPreferredAspectRatio(channel: Channel): string {
  return CHANNEL_REGISTRY[channel]?.preferredVideoAspectRatio ?? "16:9";
}
