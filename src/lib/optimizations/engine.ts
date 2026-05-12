import type { Draft, Channel } from '@/hooks/useSquadpitch';
import type {
  OptimizationSuggestion,
  OptimizationInput,
  SuggestionPriority,
} from './types';

// ══════════════════════════════════════════════════════════════════════════
// Optimization Engine — deterministic rules-based suggestions
//
// Each rule function returns 0 or 1 suggestion. The engine runs all rules
// against the input and returns suggestions sorted by priority.
//
// Data-driven rules use performance signals already on Draft objects.
// Heuristic rules use channel best-practices and content analysis.
// ══════════════════════════════════════════════════════════════════════════

type RuleFn = (input: OptimizationInput) => OptimizationSuggestion | null;

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generates optimization suggestions for a set of drafts (campaign or standalone).
 * Pure function — no side effects, no API calls.
 * Returns up to 5 suggestions sorted by priority.
 */
export function generateOptimizations(input: OptimizationInput): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  for (const rule of RULES) {
    const suggestion = rule(input);
    if (suggestion) suggestions.push(suggestion);
  }

  return suggestions
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 5);
}

/**
 * Generates optimization suggestions for a single draft.
 * Convenience wrapper over generateOptimizations.
 */
export function generateDraftOptimizations(
  draft: Draft,
  connectedChannels: Channel[],
): OptimizationSuggestion[] {
  return generateOptimizations({
    drafts: [draft],
    campaignId: draft.campaignId,
    campaignType: draft.campaignType,
    connectedChannels,
    clientId: draft.clientId,
  });
}

// ══════════════════════════════════════════════════════════════════════════
// Rules
// ══════════════════════════════════════════════════════════════════════════

// ── Caption Length Rules ─────────────────────────────────────────────────

const CHANNEL_MAX_LENGTHS: Partial<Record<Channel, number>> = {
  INSTAGRAM: 300,
  X: 280,
  TIKTOK: 150,
  LINKEDIN: 600,
  FACEBOOK: 500,
};

function captionTooLong(input: OptimizationInput): OptimizationSuggestion | null {
  for (const draft of input.drafts) {
    if (draft.status === 'PUBLISHED' || draft.status === 'REJECTED') continue;
    const maxLen = CHANNEL_MAX_LENGTHS[draft.channel];
    if (!maxLen) continue;
    if (draft.body.length > maxLen) {
      return {
        id: `caption-length-${draft.id}`,
        category: 'caption',
        priority: 'medium',
        basis: 'heuristic',
        title: `Shorten caption for ${channelLabel(draft.channel)}`,
        description: `This caption is ${draft.body.length} characters. ${channelLabel(draft.channel)} posts perform better under ${maxLen} characters.`,
        reasoning: `Best practice: ${channelLabel(draft.channel)} engagement drops for posts over ${maxLen} chars (heuristic)`,
        applyAction: 'inline_action',
        applyPayload: { type: 'inline_action', actionType: 'rewrite_post', params: { focus: 'brevity' } },
        targetDraftIds: [draft.id],
        targetCampaignId: draft.campaignId,
      };
    }
  }
  return null;
}

// ── Media Ordering (Real Estate) ─────────────────────────────────────────

function mediaOrderingExteriorFirst(input: OptimizationInput): OptimizationSuggestion | null {
  // Only applies to listing campaigns
  if (!input.campaignType || !['just_listed', 'listing_spotlight', 'open_house'].includes(input.campaignType)) {
    return null;
  }

  // Find first draft with media that doesn't lead with an exterior/hero image
  for (const draft of input.drafts) {
    if (draft.status === 'PUBLISHED' || draft.status === 'REJECTED') continue;
    if (draft.campaignDay !== 1) continue; // Only care about day-1 post

    // Check if draft has source meta indicating a listing
    if (!draft.sourceMeta?.source || draft.sourceMeta.source !== 'listing') continue;

    // Check image hint — if it doesn't suggest exterior, recommend reordering
    if (draft.imageGuidance && !draft.imageGuidance.toLowerCase().includes('exterior')) {
      return {
        id: `media-order-${draft.id}`,
        category: 'media',
        priority: 'medium',
        basis: 'heuristic',
        title: 'Lead with strongest exterior image',
        description: 'Property campaigns perform better when Day 1 features a compelling exterior shot as the cover photo.',
        reasoning: 'Real estate best practice: exterior-first image ordering increases click-through by 15-25% (heuristic)',
        applyAction: 'reorder_media',
        applyPayload: { type: 'reorder_media', suggestedOrder: [], reason: 'Exterior/cover photo should be the lead image' },
        targetDraftIds: [draft.id],
        targetCampaignId: draft.campaignId,
      };
    }
  }
  return null;
}

// ── Schedule Spread Rule ─────────────────────────────────────────────────

function campaignTooCompressed(input: OptimizationInput): OptimizationSuggestion | null {
  if (!input.campaignId) return null;
  const campaignDrafts = input.drafts.filter((d) => d.campaignId === input.campaignId);
  if (campaignDrafts.length < 3) return null;

  // Check spread: if all posts are within 2 days
  const days = campaignDrafts
    .map((d) => d.campaignDay ?? 0)
    .filter((d) => d > 0);

  if (days.length < 3) return null;

  const maxDay = Math.max(...days);
  const minDay = Math.min(...days);
  const spread = maxDay - minDay;

  if (spread <= 1 && campaignDrafts.length >= 4) {
    return {
      id: `schedule-spread-${input.campaignId}`,
      category: 'schedule',
      priority: 'high',
      basis: 'heuristic',
      title: `Spread campaign over ${Math.max(5, campaignDrafts.length)} days instead of ${spread + 1}`,
      description: 'Posting all campaign content within 1-2 days can cause audience fatigue. Spreading posts over more days gives each post room to breathe.',
      reasoning: 'Campaigns with 3+ day spread have higher per-post engagement than compressed campaigns (heuristic)',
      applyAction: 'reschedule',
      applyPayload: { type: 'reschedule', suggestedSpreadDays: Math.max(5, campaignDrafts.length), reason: 'Avoid audience fatigue' },
      targetDraftIds: campaignDrafts.map((d) => d.id),
      targetCampaignId: input.campaignId,
    };
  }
  return null;
}

// ── Channel Diversity Rule ───────────────────────────────────────────────

function singleChannelCampaign(input: OptimizationInput): OptimizationSuggestion | null {
  if (!input.campaignId) return null;
  const campaignDrafts = input.drafts.filter((d) => d.campaignId === input.campaignId);
  if (campaignDrafts.length < 3) return null;

  const channels = new Set(campaignDrafts.map((d) => d.channel));
  if (channels.size >= 2) return null;

  // Only suggest if user has more connected channels available
  const usedChannel = Array.from(channels)[0];
  const available = input.connectedChannels.filter((c) => c !== usedChannel);
  if (available.length === 0) return null;

  const suggested = available[0];
  return {
    id: `channel-diversity-${input.campaignId}`,
    category: 'channel',
    priority: 'low',
    basis: 'heuristic',
    title: `Add ${channelLabel(suggested)} to this campaign`,
    description: `This campaign only targets ${channelLabel(usedChannel)}. Adding ${channelLabel(suggested)} can extend your reach to a different audience segment.`,
    reasoning: 'Multi-channel campaigns reach 40-60% more unique audience (heuristic)',
    applyAction: 'generate',
    applyPayload: { type: 'generate', actionType: 'follow_ups', channel: suggested, count: 2 },
    targetDraftIds: campaignDrafts.map((d) => d.id),
    targetCampaignId: input.campaignId,
  };
}

// ── Performance-based: Low-rated posts ───────────────────────────────────

function lowPerformancePosts(input: OptimizationInput): OptimizationSuggestion | null {
  // Uses the performanceRating field already on Draft (set by user feedback)
  const lowRated = input.drafts.filter(
    (d) => d.performanceRating === 'LOW' && d.status === 'PUBLISHED',
  );

  if (lowRated.length === 0) return null;

  // Find channel with most low-rated posts
  const channelCounts = new Map<Channel, number>();
  for (const d of lowRated) {
    channelCounts.set(d.channel, (channelCounts.get(d.channel) ?? 0) + 1);
  }

  let worstChannel: Channel = lowRated[0].channel;
  let maxCount = 0;
  channelCounts.forEach((count, ch) => {
    if (count > maxCount) { worstChannel = ch; maxCount = count; }
  });

  return {
    id: `low-perf-channel-${worstChannel}`,
    category: 'channel',
    priority: 'high',
    basis: 'performance_data',
    title: `Improve ${channelLabel(worstChannel)} content approach`,
    description: `${maxCount} recent ${channelLabel(worstChannel)} post${maxCount > 1 ? 's' : ''} received low performance ratings. Consider adjusting tone, length, or content angle for this channel.`,
    reasoning: `Based on ${maxCount} low-rated post${maxCount > 1 ? 's' : ''} on ${channelLabel(worstChannel)} (performance data)`,
    applyAction: 'inline_action',
    applyPayload: { type: 'inline_action', actionType: 'adjust_tone', params: { tone: 'engagement' } },
    targetDraftIds: lowRated.filter((d) => d.channel === worstChannel).map((d) => d.id),
    targetCampaignId: input.campaignId ?? null,
  };
}

// ── Missing Hashtags ─────────────────────────────────────────────────────

function missingHashtags(input: OptimizationInput): OptimizationSuggestion | null {
  const CHANNELS_NEEDING_HASHTAGS: Channel[] = ['INSTAGRAM', 'TIKTOK', 'LINKEDIN'];

  for (const draft of input.drafts) {
    if (draft.status === 'PUBLISHED' || draft.status === 'REJECTED') continue;
    if (!CHANNELS_NEEDING_HASHTAGS.includes(draft.channel)) continue;
    if (draft.hashtags && draft.hashtags.length > 0) continue;

    return {
      id: `missing-hashtags-${draft.id}`,
      category: 'caption',
      priority: 'low',
      basis: 'heuristic',
      title: `Add hashtags for ${channelLabel(draft.channel)}`,
      description: `This ${channelLabel(draft.channel)} post has no hashtags. Adding relevant hashtags improves discoverability.`,
      reasoning: `${channelLabel(draft.channel)} posts with hashtags get 12-30% more reach (heuristic)`,
      applyAction: 'inline_action',
      applyPayload: { type: 'inline_action', actionType: 'improve_caption' },
      targetDraftIds: [draft.id],
      targetCampaignId: draft.campaignId,
    };
  }
  return null;
}

// ── Campaign too short (only 1-2 posts) ──────────────────────────────────

function campaignTooShort(input: OptimizationInput): OptimizationSuggestion | null {
  if (!input.campaignId) return null;
  const campaignDrafts = input.drafts.filter((d) => d.campaignId === input.campaignId);
  if (campaignDrafts.length >= 3 || campaignDrafts.length === 0) return null;

  return {
    id: `campaign-short-${input.campaignId}`,
    category: 'campaign_structure',
    priority: 'low',
    basis: 'heuristic',
    title: `Expand campaign with follow-up posts`,
    description: `This campaign has only ${campaignDrafts.length} post${campaignDrafts.length > 1 ? 's' : ''}. Adding 2-3 follow-up posts increases audience touchpoints and conversion.`,
    reasoning: 'Campaigns with 4-5 posts have 2x engagement compared to 1-2 post campaigns (heuristic)',
    applyAction: 'navigate',
    applyPayload: {
      type: 'navigate',
      href: `/workspaces/${input.clientId}/create?intent=campaign&campaignId=${input.campaignId}`,
    },
    targetDraftIds: campaignDrafts.map((d) => d.id),
    targetCampaignId: input.campaignId,
  };
}

// ── No CTA ───────────────────────────────────────────────────────────────

function missingCta(input: OptimizationInput): OptimizationSuggestion | null {
  for (const draft of input.drafts) {
    if (draft.status === 'PUBLISHED' || draft.status === 'REJECTED') continue;
    if (draft.cta) continue;
    // Only flag if it's a promotional/listing post
    if (!draft.sourceMeta?.source || draft.sourceMeta.source !== 'listing') continue;

    return {
      id: `missing-cta-${draft.id}`,
      category: 'caption',
      priority: 'medium',
      basis: 'heuristic',
      title: 'Add a call-to-action',
      description: 'This listing post has no CTA. Adding a clear next step (e.g., "DM for details" or "Link in bio") drives engagement.',
      reasoning: 'Posts with CTAs receive 20-30% more engagement actions (heuristic)',
      applyAction: 'inline_action',
      applyPayload: { type: 'inline_action', actionType: 'improve_caption' },
      targetDraftIds: [draft.id],
      targetCampaignId: draft.campaignId,
    };
  }
  return null;
}

// ── All Rules ────────────────────────────────────────────────────────────

const RULES: RuleFn[] = [
  lowPerformancePosts,
  captionTooLong,
  campaignTooCompressed,
  mediaOrderingExteriorFirst,
  missingCta,
  missingHashtags,
  singleChannelCampaign,
  campaignTooShort,
];

// ── Helpers ──────────────────────────────────────────────────────────────

const CHANNEL_LABEL_MAP: Record<string, string> = {
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

function channelLabel(channel: string): string {
  return CHANNEL_LABEL_MAP[channel] ?? channel;
}
