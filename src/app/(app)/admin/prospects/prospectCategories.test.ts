import { describe, expect, it } from "vitest";
import type { AgentOutreachProspect } from "@/hooks/useAdmin";
import {
  discoveryCategory,
  groupDiscoveryProspects,
} from "./prospectCategories";

function prospect(
  status: string,
  overrides: Partial<AgentOutreachProspect> = {},
): AgentOutreachProspect {
  return {
    id: status,
    discoveryRunId: "run-1",
    prospectWorkspaceId: null,
    fullName: "Test Agent",
    firstName: "Test",
    email: "agent@example.com",
    brokerage: null,
    sourceUrl: "https://broker.example/agents",
    sourceDomain: "broker.example",
    profileUrl: "https://broker.example/agent",
    status,
    rejectionReason: null,
    activeListingCount: 3,
    listings: [{ listingUrl: "https://broker.example/listing" }],
    discoveredAt: "2026-08-18T00:00:00Z",
    lastVerifiedAt: "2026-08-18T00:00:00Z",
    previewUrl: null,
    claimUrl: null,
    emailSubject: null,
    emailBody: null,
    emailSentAt: null,
    claimedAt: null,
    lastError: null,
    sendingAccountId: null,
    events: [],
    ...overrides,
  };
}

describe("discovery prospect categories", () => {
  it("shows only an actionable agent in Qualified", () => {
    expect(discoveryCategory(prospect("QUALIFIED"))).toBe("qualified");
  });

  it.each([
    [
      "NO_ACTIVE_LISTINGS",
      {
        activeListingCount: 0,
        listings: [],
        rejectionReason: "NO_ACTIVE_LISTINGS",
      },
    ],
    ["NO_EMAIL", { email: null, rejectionReason: "NO_EMAIL" }],
    ["SUPPRESSED", { rejectionReason: "SUPPRESSED" }],
  ])("puts %s in Rejected only", (status, overrides) => {
    expect(discoveryCategory(prospect(status, overrides))).toBe("rejected");
  });

  it("puts already-targeted agents outside Qualified", () => {
    expect(discoveryCategory(prospect("ALREADY_TARGETED"))).toBe(
      "alreadyTargeted",
    );
    expect(discoveryCategory(prospect("EMAIL_SENT"))).toBe("alreadyTargeted");
  });

  it("does not classify a malformed QUALIFIED row as actionable", () => {
    expect(
      discoveryCategory(
        prospect("QUALIFIED", { activeListingCount: 0, listings: [] }),
      ),
    ).toBe("rejected");
  });

  it("reports category counts from the returned records", () => {
    const groups = groupDiscoveryProspects([
      prospect("QUALIFIED"),
      prospect("NO_ACTIVE_LISTINGS", {
        id: "zero",
        activeListingCount: 0,
        listings: [],
        rejectionReason: "NO_ACTIVE_LISTINGS",
      }),
      prospect("NO_EMAIL", {
        id: "email",
        email: null,
        rejectionReason: "NO_EMAIL",
      }),
      prospect("DUPLICATE", { id: "targeted" }),
      prospect("QUALIFIED", { id: "manual", discoveryRunId: null }),
    ]);
    expect({
      qualified: groups.qualified.length,
      rejected: groups.rejected.length,
      alreadyTargeted: groups.alreadyTargeted.length,
    }).toEqual({ qualified: 1, rejected: 2, alreadyTargeted: 1 });
  });
});
