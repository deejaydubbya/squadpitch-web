/**
 * Activation funnel tracking for onboarding → first-post flow.
 *
 * Currently: console.debug in development only.
 * Future: POST to backend analytics endpoint or third-party (PostHog, Mixpanel, etc.)
 *
 * Integration point: replace `sendEvent()` with your analytics provider call.
 */

// ── Event names ─────────────────────────────────────────────────────────

export type ActivationEvent =
  | "onboarding_completed"
  | "onboarding_handoff_viewed"
  | "onboarding_handoff_cta_clicked"
  | "first_post_review_viewed"
  | "first_post_caption_edited"
  | "first_post_channel_connect_clicked"
  | "first_post_channel_connected"
  | "first_post_channel_connect_skipped"
  | "first_post_approved"
  | "first_post_scheduled"
  | "first_post_published"
  | "first_post_flow_completed"
  | "first_post_dashboard_returned"
  | "getting_started_step_viewed"
  | "getting_started_skip_clicked"
  | "getting_started_completed"
  | "guided_review_step_viewed"
  | "guided_review_completed"
  | "guided_channel_step_viewed"
  | "guided_publish_step_viewed"
  | "guided_success_viewed"
  | "dashboard_checklist_viewed"
  | "dashboard_checklist_cta_clicked"
  | "content_system_ready_viewed"
  | "content_system_started"
  | "content_system_completed"
  | "content_set_started"
  | "content_post_reviewed"
  | "content_set_progress"
  | "content_set_completed"
  | "checklist_item_clicked"
  | "weekly_plan_viewed"
  | "weekly_cta_clicked"
  | "weekly_target_met"
  | "weekly_empty_state_seen"
  | "weekly_return_after_inactivity"
  | "autopilot_upsell_viewed"
  | "autopilot_cta_clicked"
  | "autopilot_modal_viewed"
  | "autopilot_upgrade_clicked"
  | "pricing_page_viewed"
  | "pricing_plan_cta_clicked"
  | "signup_plan_handoff_viewed"
  | "signup_plan_selected"
  | "signup_checkout_started"
  | "signup_checkout_canceled"
  | "signup_checkout_activated"
  | "signup_checkout_continue_free"
  | "upgrade_trigger_viewed"
  | "upgrade_trigger_clicked"
  | "autopilot_upgrade_prompt_viewed"
  | "limit_warning_viewed"
  | "limit_hit_viewed"
  | "upgrade_prompt_shown"
  | "autopilot_blocked"
  | "feature_blocked"
  | "limit_upgrade_prompt"
  | "dashboard_usage_viewed";

// ── Payload ─────────────────────────────────────────────────────────────

export interface ActivationPayload {
  clientId?: string;
  userId?: string;
  industry?: string | null;
  connectedChannelCount?: number;
  postsReadyCount?: number;
  selectedDraftId?: string;
  selectedPlatform?: string;
  actionSource?: string;
  step?: string;
  postsThisWeekCount?: number;
  weeklyTarget?: number;
  daysSinceLastVisit?: number;
  postIndex?: number;
  totalPosts?: number;
  feature?: string;
  /** Extra context — keep small */
  meta?: Record<string, unknown>;
}

// ── Local dedup flags ───────────────────────────────────────────────────

const LS_PREFIX = "sp_activation_";

/** Mark a flag in localStorage (for UI niceties — not business logic). */
export function setActivationFlag(key: string, clientId: string) {
  try {
    localStorage.setItem(`${LS_PREFIX}${key}_${clientId}`, "1");
  } catch {
    // Storage full or unavailable — ignore
  }
}

/** Check a local activation flag. */
export function getActivationFlag(key: string, clientId: string): boolean {
  try {
    return localStorage.getItem(`${LS_PREFIX}${key}_${clientId}`) === "1";
  } catch {
    return false;
  }
}

// ── Core tracking function ──────────────────────────────────────────────

const fired = new Set<string>();

/**
 * Track an activation funnel event.
 *
 * @param event   One of the typed ActivationEvent names.
 * @param payload Contextual data attached to the event.
 * @param opts.once  If true, dedup by event+clientId within this session (default: false).
 */
export function trackActivationEvent(
  event: ActivationEvent,
  payload: ActivationPayload = {},
  opts?: { once?: boolean },
) {
  const key = `${event}:${payload.clientId ?? "_"}`;

  if (opts?.once && fired.has(key)) return;
  if (opts?.once) fired.add(key);

  const envelope = {
    event,
    ...payload,
    timestamp: new Date().toISOString(),
  };

  // ── Development: console output ────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    console.debug("[activation]", event, envelope);
  }

  // ── Future integration point ───────────────────────────────────────
  // Replace or extend sendEvent() when connecting a real analytics backend.
  //
  // Examples:
  //   posthog.capture(event, envelope);
  //   mixpanel.track(event, envelope);
  //   apiFetch('events', { method: 'POST', body: JSON.stringify(envelope) });
  //
  sendEvent(envelope);
}

// ── Backend sender stub ─────────────────────────────────────────────────

function sendEvent(envelope: Record<string, unknown>) {
  const event = typeof envelope.event === "string" ? envelope.event : null;
  if (!event) return;
  const meta = envelope.meta && typeof envelope.meta === "object"
    ? envelope.meta as Record<string, unknown>
    : {};
  if (meta.synthetic === true || meta.internalTest === true) return;
  const safe = (value: unknown): string | number | boolean | null =>
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? value
      : null;
  const props = {
    schemaVersion: "activation.v1",
    clientId: safe(envelope.clientId),
    industry: safe(envelope.industry),
    connectedChannelCount: safe(envelope.connectedChannelCount),
    postsReadyCount: safe(envelope.postsReadyCount),
    selectedPlatform: safe(envelope.selectedPlatform),
    actionSource: safe(envelope.actionSource),
    step: safe(envelope.step),
    feature: safe(envelope.feature),
  };
  void import("./analytics").then(({ initAnalytics, trackActivation }) =>
    initAnalytics().then(() => trackActivation(event, props)).catch(() => {}),
  ).catch(() => {});
}
