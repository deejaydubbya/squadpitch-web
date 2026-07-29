import { describe, expect, it } from "vitest";
import { authErrorMessage, authHref, authPath, safeReturnTo } from "./authFlow";

describe("Auth0 login and signup flow", () => {
  it("builds a distinct login action", () => {
    expect(authPath("login", "/workspaces")).toBe(
      "/auth/login?returnTo=%2Fworkspaces",
    );
  });

  it("builds a distinct signup action with onboarding continuation", () => {
    expect(authPath("signup")).toBe("/auth/signup?returnTo=%2Fonboarding");
    expect(
      authHref(
        "https://app.squadpitch.com",
        "signup",
        "/onboarding?selectedPlan=PRO",
      ),
    ).toContain("/auth/signup?returnTo=%2Fonboarding%3FselectedPlan%3DPRO");
  });

  it("preserves safe callback paths and query strings", () => {
    expect(safeReturnTo("/onboarding?selectedPlan=SOLO")).toBe(
      "/onboarding?selectedPlan=SOLO",
    );
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example/phish",
    "/\\evil.example",
    "javascript:alert(1)",
  ])("rejects invalid return URL %s", (value) => {
    expect(safeReturnTo(value)).toBe("/onboarding");
  });

  it("turns cancellation and callback failures into safe copy", () => {
    expect(authErrorMessage("access_denied")).toMatch(/cancelled/i);
    expect(authErrorMessage("invalid_state")).toMatch(/couldn’t complete/i);
    expect(authErrorMessage(undefined)).toBeNull();
  });
});
