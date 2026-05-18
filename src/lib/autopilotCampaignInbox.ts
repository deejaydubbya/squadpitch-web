// Autopilot Campaign Inbox feature flag.
//
// The Campaign Inbox surface (AutopilotCampaignsSection, the
// per-campaign card, the detail modal, the inbox banner) is
// designed for an upcoming backend that persists campaign
// recommendations with a needs_review / approved / dismissed
// lifecycle. None of those API routes ship yet — Phase 2 of
// docs/AUTOPILOT_PRODUCT_AUDIT.md will land them. Until then,
// firing the hooks (useAutopilotCampaignRecommendations etc.)
// 404s and crashes the panel.
//
// This flag default-OFF stops every Campaign Inbox hook from
// firing and renders a calm empty-state in their place, so the
// component tree stays mounted for the Phase 2 wire-up without
// a UI rewrite.
//
// To turn it on (Phase 2+):
//   NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED=true
// Next.js inlines NEXT_PUBLIC_* at build time, so toggling
// requires a redeploy.

export function isAutopilotCampaignInboxEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED === 'true';
}
