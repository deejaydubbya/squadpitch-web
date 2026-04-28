/**
 * Derive activation state from real server data.
 *
 * These helpers determine where a user is in the activation funnel
 * without relying on localStorage for business-critical decisions.
 * Local flags are only used as fallback hints for UI niceties.
 */

import { getActivationFlag } from './activationTracking';

export interface ActivationInput {
  clientId: string;
  /** From URL search param */
  onboardedParam: boolean;
  /** From useClientAnalytics */
  analytics?: {
    total?: number;
    byStatus?: Partial<Record<string, number>>;
  } | null;
  /** Number of connected (enabled + authed) channels */
  connectedChannelCount: number;
  /** Number of scheduled posts upcoming (from recommendations summary) */
  scheduledUpcoming?: number;
  /** Number of posts published this week (from recommendations summary) */
  publishedThisWeek?: number;
}

export interface ActivationState {
  // ── Funnel stages ─────────────────────────────────────────
  hasCompletedOnboarding: boolean;
  hasViewedHandoff: boolean;
  hasTakenFirstContentAction: boolean;
  shouldShowFirstWinMode: boolean;

  // ── Momentum / retention ──────────────────────────────────
  /** User has approved, scheduled, or published at least 1 post */
  isActivatedUser: boolean;
  hasConnectedChannels: boolean;
  postsCreatedCount: number;
  postsApprovedCount: number;
  postsScheduledCount: number;
  postsPublishedCount: number;
  publishedThisWeek: number;
  scheduledUpcoming: number;
}

export function deriveActivationState(input: ActivationInput): ActivationState {
  const { clientId, onboardedParam, analytics, connectedChannelCount } = input;

  const published = analytics?.byStatus?.PUBLISHED ?? 0;
  const scheduled = analytics?.byStatus?.SCHEDULED ?? 0;
  const approved = analytics?.byStatus?.APPROVED ?? 0;
  const drafts = analytics?.byStatus?.DRAFT ?? 0;
  const pendingReview = analytics?.byStatus?.PENDING_REVIEW ?? 0;

  const totalPending = drafts + approved + pendingReview;
  const postsCreatedCount = analytics?.total ?? 0;

  // Server-authoritative: workspace exists → onboarding was completed
  const hasCompletedOnboarding = true;

  // Handoff viewed: URL param is the trigger; local flag as fallback
  const hasViewedHandoff = onboardedParam || getActivationFlag('handoff_viewed', clientId);

  // First content action: any post approved/scheduled/published
  const hasTakenFirstContentAction = approved > 0 || scheduled > 0 || published > 0;

  // Activated = has taken at least one meaningful action on a post
  const isActivatedUser = hasTakenFirstContentAction;

  // Show First Win Mode when NOT yet activated and has drafts
  const shouldShowFirstWinMode =
    !isActivatedUser && (onboardedParam || totalPending > 0);

  return {
    hasCompletedOnboarding,
    hasViewedHandoff,
    hasTakenFirstContentAction,
    shouldShowFirstWinMode,

    isActivatedUser,
    hasConnectedChannels: connectedChannelCount > 0,
    postsCreatedCount,
    postsApprovedCount: approved,
    postsScheduledCount: scheduled,
    postsPublishedCount: published,
    publishedThisWeek: input.publishedThisWeek ?? 0,
    scheduledUpcoming: input.scheduledUpcoming ?? 0,
  };
}
