import { afterEach, describe, expect, it, vi } from "vitest";
import { serverUrl } from "./serverRuntimeConfig";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("server runtime configuration", () => {
  it("allows a development fallback outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(serverUrl("SERVICE_URL", undefined, "http://localhost:4000")).toBe(
      "http://localhost:4000",
    );
  });

  it("requires an explicit value in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() =>
      serverUrl("SERVICE_URL", undefined, "http://localhost:4000"),
    ).toThrow("SERVICE_URL is required in production");
  });

  it("rejects non-HTTPS production service URLs", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() =>
      serverUrl("SERVICE_URL", "http://api.internal:8080", ""),
    ).toThrow("SERVICE_URL must use HTTPS in production");
  });
});
