/**
 * Pre-save validation for campaigns.
 * Catches issues that would cause data loss or broken posts before saving.
 */

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  message: string;
}

const MEDIA_REQUIRED_CHANNELS = new Set(['INSTAGRAM', 'TIKTOK', 'YOUTUBE']);

interface PostForValidation {
  body: string;
  channel: string;
  assignedImageIds: string[];
  label?: string;
  campaignDay?: number;
}

export function validateCampaignBeforeSave(posts: PostForValidation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Note: synthetic IDs (property_img_*, item_img_*) are converted to real
  // asset IDs during the save flow, so we don't flag them here.

  // Check for media-required channels without media
  const missingMedia = posts.filter(
    (p) => MEDIA_REQUIRED_CHANNELS.has(p.channel) && p.assignedImageIds.length === 0
  );
  if (missingMedia.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${missingMedia.length} post(s) on media-required channels (${Array.from(new Set(missingMedia.map((p) => p.channel))).join(', ')}) have no images`,
    });
  }

  // Check for empty body
  const emptyBody = posts.filter((p) => !p.body.trim());
  if (emptyBody.length > 0) {
    issues.push({
      severity: 'error',
      message: `${emptyBody.length} post(s) have empty body text`,
    });
  }

  return issues;
}
