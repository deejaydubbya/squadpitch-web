// Autopilot Campaign Inbox feature flag.
//
// The Opportunity Inbox surface (AutopilotCommandCenter, the
// per-rec hero, the queue, the detail modal, the inbox banner)
// runs against the campaign-recommendation endpoints landed in
// Phase 2 of docs/AUTOPILOT_PRODUCT_AUDIT.md. The flag stays
// here as a kill switch in case a workspace needs the surface
// disabled — when off, AutopilotCommandCenter renders a calm
// "Coming soon" shell and none of the recommendation hooks fire.
//
// To turn it on:
//   NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED=true
// Next.js inlines NEXT_PUBLIC_* at build time, so toggling
// requires a redeploy.

export function isAutopilotCampaignInboxEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED === 'true';
}
