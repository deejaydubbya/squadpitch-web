// Autopilot Campaign Inbox feature flag — default-off contract.
//
// Phase 1 of the audit doc pulled the Campaign Inbox surface
// behind a build-time env so the broken hooks stop firing in
// production until the Phase 2 backend lands. The flag is the
// single point of truth for both the hook gates and the empty
// state, so a regression here would re-enable the 404s.

import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAutopilotCampaignInboxEnabled", () => {
  it("returns false when the env is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED", "");
    const { isAutopilotCampaignInboxEnabled } = await import("./autopilotCampaignInbox");
    expect(isAutopilotCampaignInboxEnabled()).toBe(false);
  });

  it("returns false for any value other than the literal 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED", "yes");
    const { isAutopilotCampaignInboxEnabled } = await import("./autopilotCampaignInbox");
    expect(isAutopilotCampaignInboxEnabled()).toBe(false);
  });

  it("returns true when the env is exactly 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTOPILOT_CAMPAIGN_INBOX_ENABLED", "true");
    // Force a fresh import — the implementation reads at call time
    // but the module-level cache could carry an earlier evaluation
    // on consecutive runs.
    vi.resetModules();
    const { isAutopilotCampaignInboxEnabled } = await import("./autopilotCampaignInbox");
    expect(isAutopilotCampaignInboxEnabled()).toBe(true);
  });
});
