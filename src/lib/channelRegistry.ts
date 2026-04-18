import type { Channel } from '@/hooks/useSquadpitch';

export interface ChannelCapability {
  channel: Channel;
  label: string;
  comingSoon?: boolean;
  requiresConnection: boolean;
  requiresMedia: boolean;
  requiresVideo: boolean;
  supportsTextOnly: boolean;
  maxCaptionLength: number | null;
}

export const CHANNEL_REGISTRY: Record<Channel, ChannelCapability> = {
  INSTAGRAM: {
    channel: 'INSTAGRAM',
    label: 'Instagram',
    requiresConnection: true,
    requiresMedia: true,
    requiresVideo: false,
    supportsTextOnly: false,
    maxCaptionLength: 2200,
  },
  TIKTOK: {
    channel: 'TIKTOK',
    label: 'TikTok',
    requiresConnection: true,
    requiresMedia: true,
    requiresVideo: false,
    supportsTextOnly: false,
    maxCaptionLength: 2200,
  },
  YOUTUBE: {
    channel: 'YOUTUBE',
    label: 'YouTube',
    requiresConnection: true,
    requiresMedia: true,
    requiresVideo: true,
    supportsTextOnly: false,
    maxCaptionLength: 5000,
  },
  X: {
    channel: 'X',
    label: 'X',
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    supportsTextOnly: true,
    maxCaptionLength: 280,
  },
  LINKEDIN: {
    channel: 'LINKEDIN',
    label: 'LinkedIn',
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    supportsTextOnly: true,
    maxCaptionLength: 3000,
  },
  FACEBOOK: {
    channel: 'FACEBOOK',
    label: 'Facebook',
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    supportsTextOnly: true,
    maxCaptionLength: 63206,
  },
  PINTEREST: {
    channel: 'PINTEREST',
    label: 'Pinterest',
    comingSoon: true,
    requiresConnection: true,
    requiresMedia: true,
    requiresVideo: false,
    supportsTextOnly: false,
    maxCaptionLength: 500,
  },
  THREADS: {
    channel: 'THREADS',
    label: 'Threads',
    comingSoon: true,
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    supportsTextOnly: true,
    maxCaptionLength: 500,
  },
  REDDIT: {
    channel: 'REDDIT',
    label: 'Reddit',
    comingSoon: true,
    requiresConnection: true,
    requiresMedia: false,
    requiresVideo: false,
    supportsTextOnly: true,
    maxCaptionLength: 40000,
  },
};

export function getChannelLabel(channel: Channel): string {
  return CHANNEL_REGISTRY[channel]?.label ?? channel;
}

export function getChannelRequirementHint(channel: Channel): string | null {
  const cap = CHANNEL_REGISTRY[channel];
  if (!cap) return null;
  if (cap.requiresVideo) return 'Requires video';
  if (cap.requiresMedia) return 'Requires image or video';
  return null;
}
