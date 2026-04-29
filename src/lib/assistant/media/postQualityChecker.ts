/**
 * Lightweight content quality checker for posts.
 * Returns warnings that help users improve post quality before saving.
 */

export type WarningSeverity = 'error' | 'warning' | 'info';

export interface QualityWarning {
  severity: WarningSeverity;
  message: string;
}

// Channel character limits (approximate platform recommendations)
const CHANNEL_CHAR_LIMITS: Record<string, number> = {
  X: 280,
  INSTAGRAM: 2200,
  TIKTOK: 2200,
  FACEBOOK: 63206,
  LINKEDIN: 3000,
  YOUTUBE: 5000,
};

const MEDIA_REQUIRED_CHANNELS = new Set(['INSTAGRAM', 'TIKTOK', 'YOUTUBE']);

const GENERIC_PHRASES = [
  'check it out',
  'click the link',
  'link in bio',
  'stay tuned',
  'don\'t miss out',
  'exciting news',
  'big announcement',
];

interface PostCheckInput {
  body: string;
  cta?: string | null;
  hashtags?: string[];
  channel?: string;
  hasMedia?: boolean;
}

export function checkPostQuality(input: PostCheckInput): QualityWarning[] {
  const warnings: QualityWarning[] = [];
  const { body, cta, hashtags = [], channel, hasMedia } = input;
  const bodyLen = body.trim().length;

  // Missing CTA
  if (!cta?.trim()) {
    warnings.push({
      severity: 'warning',
      message: 'Missing call to action — add a CTA to drive engagement',
    });
  }

  // Body too short
  if (bodyLen > 0 && bodyLen < 50) {
    warnings.push({
      severity: 'warning',
      message: 'Post body is very short — consider adding more detail',
    });
  }

  // Exceeds channel character limit
  if (channel && CHANNEL_CHAR_LIMITS[channel]) {
    const limit = CHANNEL_CHAR_LIMITS[channel];
    if (bodyLen > limit) {
      warnings.push({
        severity: 'error',
        message: `Body exceeds ${channel} character limit (${bodyLen}/${limit})`,
      });
    }
  }

  // Generic phrases
  const bodyLower = body.toLowerCase();
  const found = GENERIC_PHRASES.filter((phrase) => bodyLower.includes(phrase));
  if (found.length > 0) {
    warnings.push({
      severity: 'info',
      message: `Contains generic phrase(s): "${found[0]}" — consider making it more specific`,
    });
  }

  // Missing hashtags on social channels
  const SOCIAL_CHANNELS = new Set(['INSTAGRAM', 'TIKTOK', 'X', 'FACEBOOK', 'LINKEDIN']);
  if (channel && SOCIAL_CHANNELS.has(channel) && hashtags.length === 0) {
    warnings.push({
      severity: 'info',
      message: 'No hashtags — adding relevant hashtags improves discoverability',
    });
  }

  // Missing media on media-required channels
  if (channel && MEDIA_REQUIRED_CHANNELS.has(channel) && !hasMedia) {
    warnings.push({
      severity: 'error',
      message: `${channel} posts require media — add an image or video`,
    });
  }

  return warnings;
}
