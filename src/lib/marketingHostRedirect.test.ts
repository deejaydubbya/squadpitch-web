import { describe, expect, it } from "vitest";
import { mainMarketingRedirect } from "./marketingHostRedirect";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("main marketing host redirect", () => {
  it("permanently targets the Real Estate canonical while preserving query parameters", () => {
    expect(mainMarketingRedirect("squadpitch.com", "/", "?utm_source=beta")?.toString())
      .toBe("https://real-estate.squadpitch.com/?utm_source=beta");
  });

  it("does not redirect the app host, Real Estate host, or operational paths", () => {
    expect(mainMarketingRedirect("app.squadpitch.com", "/", "")).toBeNull();
    expect(mainMarketingRedirect("real-estate.squadpitch.com", "/", "")).toBeNull();
    expect(mainMarketingRedirect("squadpitch.com", "/api/health", "")).toBeNull();
    expect(mainMarketingRedirect("squadpitch.com", "/auth/login", "")).toBeNull();
  });

  it("uses an explicit permanent redirect in the request proxy", () => {
    const proxy = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
    expect(proxy).toContain("NextResponse.redirect(marketingDestination, 308)");
  });
});
