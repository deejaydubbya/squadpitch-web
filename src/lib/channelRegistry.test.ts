import { describe, expect, it } from "vitest";
import { CHANNEL_REGISTRY } from "./channelRegistry";

describe("channel production availability", () => {
  it("labels review-gated providers as beta", () => {
    expect(CHANNEL_REGISTRY.FACEBOOK.availability).toBe("BETA");
    expect(CHANNEL_REGISTRY.INSTAGRAM.availability).toBe("BETA");
    expect(CHANNEL_REGISTRY.YOUTUBE.availability).toBe("BETA");
  });

  it("keeps Reddit coming soon and does not overstate GBP", () => {
    expect(CHANNEL_REGISTRY.REDDIT).toMatchObject({
      availability: "COMING_SOON",
      comingSoon: true,
    });
    expect(CHANNEL_REGISTRY.GOOGLE_BUSINESS_PROFILE).toMatchObject({
      availability: "BETA",
      comingSoon: true,
    });
  });
});
