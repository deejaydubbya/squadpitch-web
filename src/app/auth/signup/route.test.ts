import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth0", () => ({
  auth0: { getSession },
}));

import { GET } from "./route";

describe("GET /auth/signup", () => {
  beforeEach(() => {
    getSession.mockReset();
    vi.stubEnv("APP_BASE_URL", "https://app.squadpitch.com");
  });

  it("intentionally starts Auth0 Universal Login on signup", async () => {
    getSession.mockResolvedValue(null);
    const response = await GET(
      new NextRequest(
        "https://app.squadpitch.com/auth/signup?returnTo=%2Fonboarding%3FselectedPlan%3DPRO",
      ),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("screen_hint")).toBe("signup");
    expect(location.searchParams.get("returnTo")).toBe(
      "/onboarding?selectedPlan=PRO",
    );
  });

  it("sends an authenticated user directly to the continuation", async () => {
    getSession.mockResolvedValue({ user: { sub: "auth0|user" } });
    const response = await GET(
      new NextRequest(
        "https://app.squadpitch.com/auth/signup?returnTo=%2Fworkspaces",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "https://app.squadpitch.com/workspaces",
    );
  });

  it("replaces an external continuation with onboarding", async () => {
    getSession.mockResolvedValue(null);
    const response = await GET(
      new NextRequest(
        "https://app.squadpitch.com/auth/signup?returnTo=https%3A%2F%2Fevil.example",
      ),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("returnTo")).toBe("/onboarding");
  });
});
