import type { Channel, Draft } from '@/hooks/useSquadpitch';
import { CHANNEL_REGISTRY, getChannelLabel } from './channelRegistry';

export type ReadinessLevel = 'ready' | 'warning' | 'blocked';

export type PublishIssueCode =
  | 'NOT_CONNECTED'
  | 'NEEDS_MEDIA'
  | 'NEEDS_VIDEO'
  | 'CAPTION_TOO_LONG'
  | 'VIDEO_DURATION_TOO_SHORT'
  | 'VIDEO_DURATION_TOO_LONG'
  | 'VIDEO_ASPECT_MISMATCH'
  | 'MISSING_THUMBNAIL';

export interface PublishIssue {
  level: ReadinessLevel;
  code: PublishIssueCode;
  message: string;
  action?: { label: string; href: string };
}

export interface VideoMeta {
  durationSec?: number | null;
  aspectRatio?: string | null;
  thumbnailUrl?: string | null;
}

export interface PublishEligibility {
  level: ReadinessLevel;
  issues: PublishIssue[];
  canPublish: boolean;
  canSchedule: boolean;
}

function worstLevel(a: ReadinessLevel, b: ReadinessLevel): ReadinessLevel {
  if (a === 'blocked' || b === 'blocked') return 'blocked';
  if (a === 'warning' || b === 'warning') return 'warning';
  return 'ready';
}

export function validatePublishEligibility(
  draft: Draft,
  connectionStatusMap: Map<Channel, boolean>,
  clientId: string,
  videoMeta?: VideoMeta,
): PublishEligibility {
  const issues: PublishIssue[] = [];
  const cap = CHANNEL_REGISTRY[draft.channel];
  const label = getChannelLabel(draft.channel);
  const isConnected = connectionStatusMap.get(draft.channel) === true;

  if (!isConnected) {
    issues.push({
      level: 'blocked',
      code: 'NOT_CONNECTED',
      message: `${label} is not connected. Connect your account to schedule or publish.`,
      action: {
        label: 'Connect',
        href: `/workspaces/${clientId}/settings/channels`,
      },
    });
  }

  if (cap) {
    if (cap.requiresVideo && draft.mediaType !== 'video') {
      issues.push({
        level: 'blocked',
        code: 'NEEDS_VIDEO',
        message: `${label} requires a video.`,
      });
    } else if (cap.requiresMedia && !draft.mediaUrl) {
      issues.push({
        level: 'warning',
        code: 'NEEDS_MEDIA',
        message: `${label} requires an image or video.`,
      });
    }

    if (cap.maxCaptionLength && draft.body && draft.body.length > cap.maxCaptionLength) {
      issues.push({
        level: 'warning',
        code: 'CAPTION_TOO_LONG',
        message: `Caption exceeds ${label}'s ${cap.maxCaptionLength} character limit.`,
      });
    }

    // Video-specific duration checks
    if (draft.mediaType === 'video' && videoMeta && cap.videoDurationLimits) {
      const dur = videoMeta.durationSec;
      if (dur != null) {
        if (dur < cap.videoDurationLimits.minSec) {
          issues.push({
            level: 'warning',
            code: 'VIDEO_DURATION_TOO_SHORT',
            message: `Video is ${dur}s — ${label} recommends at least ${cap.videoDurationLimits.minSec}s.`,
          });
        }
        if (dur > cap.videoDurationLimits.maxSec) {
          issues.push({
            level: 'blocked',
            code: 'VIDEO_DURATION_TOO_LONG',
            message: `Video is ${dur}s — ${label} allows up to ${cap.videoDurationLimits.maxSec}s.`,
          });
        }
      }
    }
  }

  let level: ReadinessLevel = 'ready';
  for (const issue of issues) {
    level = worstLevel(level, issue.level);
  }

  const hasBlockingIssue = issues.some(
    (i) => i.level === 'blocked' && i.code !== 'NOT_CONNECTED'
  );

  return {
    level,
    issues,
    canPublish: !hasBlockingIssue && isConnected,
    canSchedule: isConnected,
  };
}

export function getChannelCreationWarnings(
  channel: Channel,
  connectionStatusMap: Map<Channel, boolean>,
  clientId: string,
): PublishIssue[] {
  const issues: PublishIssue[] = [];
  const cap = CHANNEL_REGISTRY[channel];
  const label = getChannelLabel(channel);
  const isConnected = connectionStatusMap.get(channel) === true;

  if (!isConnected) {
    issues.push({
      level: 'warning',
      code: 'NOT_CONNECTED',
      message: `${label} is not connected. You can still create content, but you'll need to connect before publishing.`,
      action: {
        label: 'Connect',
        href: `/workspaces/${clientId}/settings/channels`,
      },
    });
  }

  if (cap?.requiresVideo) {
    issues.push({
      level: 'warning',
      code: 'NEEDS_VIDEO',
      message: `${label} requires a video — make sure to attach one before publishing.`,
    });
  } else if (cap?.requiresMedia) {
    issues.push({
      level: 'warning',
      code: 'NEEDS_MEDIA',
      message: `${label} requires an image or video — make sure to attach one before publishing.`,
    });
  }

  return issues;
}
